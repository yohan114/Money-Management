import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { StorageService } from './storage';
import {
  GoogleDriveUser,
  GoogleDriveFile,
  CloudBackupPayload,
  CloudBackupMetadata,
} from '../types';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_DRIVE_FOLDER_NAME = 'MoneyManagement_Backups';
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Default OAuth Web Client ID for Money Management (can be overridden in settings)
export const DEFAULT_GOOGLE_CLIENT_ID =
  '1072979707255-moneymanagement.apps.googleusercontent.com';

export const GoogleDriveService = {
  /**
   * Generates the OAuth redirect URI for this mobile app scheme
   */
  getRedirectUri(): string {
    return AuthSession.makeRedirectUri({
      scheme: 'moneymanagement',
    });
  },

  /**
   * Initiates Google Sign-In with Google Drive scope via in-app browser
   */
  async signInWithGoogle(customClientId?: string): Promise<{
    success: boolean;
    user?: GoogleDriveUser;
    error?: string;
  }> {
    try {
      const savedClientId = await StorageService.getGoogleClientId();
      const clientId =
        (customClientId && customClientId.trim()) ||
        savedClientId ||
        DEFAULT_GOOGLE_CLIENT_ID;

      if (
        !clientId ||
        clientId.includes('moneymanagement.apps.googleusercontent.com')
      ) {
        return {
          success: false,
          error: 'OAUTH_CLIENT_ID_REQUIRED',
        };
      }

      const redirectUri = this.getRedirectUri();

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(
          `openid email profile ${GOOGLE_DRIVE_SCOPE}`
        )}&` +
        `prompt=consent&` +
        `include_granted_scopes=true`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        // Parse token from redirect URL fragment or query
        const urlParams = this.parseTokenFromUrl(result.url);
        const accessToken = urlParams.access_token;
        const expiresIn = parseInt(urlParams.expires_in || '3600', 10);

        if (!accessToken) {
          return { success: false, error: 'Authorization did not return an access token.' };
        }

        // Fetch user profile from Google API
        const profile = await this.fetchUserProfile(accessToken);
        const googleUser: GoogleDriveUser = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          accessToken,
          expiresAt: Date.now() + expiresIn * 1000,
          connectedAt: new Date().toISOString(),
        };

        await StorageService.saveGoogleUser(googleUser);
        if (customClientId && customClientId.trim()) {
          await StorageService.saveGoogleClientId(customClientId.trim());
        }

        // Ensure backup folder exists in user's Drive
        await this.getOrCreateBackupFolder(accessToken);

        await StorageService.addCloudSyncLog({
          status: 'success',
          trigger: 'manual',
          error: undefined,
        });

        return { success: true, user: googleUser };
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, error: 'Sign in was cancelled.' };
      } else {
        return { success: false, error: 'Google authentication did not complete.' };
      }
    } catch (e: any) {
      console.error('Google Sign-In failed:', e);
      return { success: false, error: e?.message || 'Failed to authenticate with Google.' };
    }
  },

  /**
   * Connect using a direct access token (useful for test/manual token setup)
   */
  async connectWithAccessToken(accessToken: string): Promise<{
    success: boolean;
    user?: GoogleDriveUser;
    error?: string;
  }> {
    try {
      const cleanToken = accessToken.trim();
      if (!cleanToken) {
        return { success: false, error: 'Access token cannot be empty.' };
      }

      const profile = await this.fetchUserProfile(cleanToken);
      const googleUser: GoogleDriveUser = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        accessToken: cleanToken,
        expiresAt: Date.now() + 3600 * 1000,
        connectedAt: new Date().toISOString(),
      };

      await StorageService.saveGoogleUser(googleUser);
      await this.getOrCreateBackupFolder(cleanToken);

      await StorageService.addCloudSyncLog({
        status: 'success',
        trigger: 'manual',
      });

      return { success: true, user: googleUser };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Invalid Google access token.' };
    }
  },

  /**
   * Disconnects current Google account
   */
  async disconnect(): Promise<void> {
    await StorageService.saveGoogleUser(null);
  },

  /**
   * Fetches Google User Profile (email, name, picture)
   */
  async fetchUserProfile(accessToken: string): Promise<{
    id: string;
    email: string;
    name: string;
    picture?: string;
  }> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch Google profile: ${res.status} ${errText}`);
    }

    const json = await res.json();
    return {
      id: json.sub,
      email: json.email,
      name: json.name || json.email.split('@')[0],
      picture: json.picture,
    };
  },

  /**
   * Searches for the dedicated app backup folder or creates it if not present
   */
  async getOrCreateBackupFolder(accessToken: string): Promise<string> {
    try {
      // Search for existing folder
      const query = `name = '${GOOGLE_DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name)&spaces=drive`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        if (searchJson.files && searchJson.files.length > 0) {
          const folderId = searchJson.files[0].id;
          await StorageService.saveCloudSyncSettings({ folderId });
          return folderId;
        }
      }

      // Create folder if not found
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: GOOGLE_DRIVE_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Money Management App Automated Cloud Backups',
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Could not create folder in Google Drive: ${createRes.status}`);
      }

      const folderData = await createRes.json();
      await StorageService.saveCloudSyncSettings({ folderId: folderData.id });
      return folderData.id;
    } catch (e: any) {
      console.warn('Folder resolution fallback:', e);
      return '';
    }
  },

  /**
   * Uploads database snapshot directly to Google Drive via multipart REST API
   */
  async uploadBackup(
    accessToken: string,
    snapshot: CloudBackupPayload,
    trigger: 'manual' | 'scheduled' | 'auto_change' = 'manual'
  ): Promise<{
    file: GoogleDriveFile;
    metadata: CloudBackupMetadata;
  }> {
    const settings = await StorageService.getCloudSyncSettings();
    let folderId = settings.folderId;
    if (!folderId) {
      folderId = await this.getOrCreateBackupFolder(accessToken);
    }

    const now = new Date();
    const dateSlug = now.toISOString().split('T')[0];
    const timeSlug = `${String(now.getHours()).padStart(2, '0')}-${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const fileName = `MoneyManagement_Backup_${dateSlug}_${timeSlug}.json`;
    const jsonContent = JSON.stringify(snapshot, null, 2);
    const fileSize = new Blob([jsonContent]).size || jsonContent.length;

    const boundary = 'MONEY_MANAGEMENT_DRIVE_BOUNDARY';
    const metadataBody: any = {
      name: fileName,
      mimeType: 'application/json',
      description: `Money Management App Snapshot • ${snapshot.stats.transactionsCount} txs • ${snapshot.stats.accountsCount} accounts`,
    };

    if (folderId) {
      metadataBody.parents = [folderId];
    }

    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadataBody)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${jsonContent}\r\n` +
      `--${boundary}--`;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      await StorageService.addCloudSyncLog({
        status: 'failed',
        trigger,
        error: `HTTP ${res.status}: ${errText}`,
        fileName,
      });
      throw new Error(`Drive upload failed: ${res.status} ${errText}`);
    }

    const fileResult: GoogleDriveFile = await res.json();

    const metadata: CloudBackupMetadata = {
      lastBackupDate: now.toISOString(),
      fileName,
      accountsCount: snapshot.stats.accountsCount,
      transactionsCount: snapshot.stats.transactionsCount,
      budgetsCount: snapshot.stats.budgetsCount,
      budgetItemsCount: snapshot.stats.budgetItemsCount,
      loansCount: snapshot.stats.loansCount,
      vehiclesCount: snapshot.stats.vehiclesCount,
      fuelLogsCount: snapshot.stats.fuelLogsCount,
      serviceRecordsCount: snapshot.stats.serviceRecordsCount,
      driveFileId: fileResult.id,
      folderId,
      isDirectSync: true,
    };

    await StorageService.saveLastBackupMetadata(metadata);
    await StorageService.saveCloudSyncSettings({
      lastAutoBackupDate: now.toISOString(),
    });

    await StorageService.addCloudSyncLog({
      status: 'success',
      trigger,
      fileName,
      driveFileId: fileResult.id,
      recordsCount: snapshot.stats.transactionsCount,
      fileSize,
    });

    return { file: fileResult, metadata };
  },

  /**
   * Retrieves list of all backup files from the Google Drive backup folder
   */
  async listBackups(accessToken: string): Promise<GoogleDriveFile[]> {
    try {
      const settings = await StorageService.getCloudSyncSettings();
      let folderId = settings.folderId;
      if (!folderId) {
        folderId = await this.getOrCreateBackupFolder(accessToken);
      }

      let query = `trashed = false and mimeType = 'application/json' and name contains 'MoneyManagement_Backup'`;
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name,size,createdTime,modifiedTime,webViewLink)&orderBy=createdTime desc&pageSize=30`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to list backups: ${res.status} ${errText}`);
      }

      const data = await res.json();
      return (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size ? parseInt(f.size, 10) : undefined,
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
      }));
    } catch (e: any) {
      console.error('List backups failed:', e);
      throw e;
    }
  },

  /**
   * Downloads and parses a specific backup JSON from Google Drive
   */
  async downloadBackup(
    accessToken: string,
    fileId: string
  ): Promise<CloudBackupPayload> {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Could not download backup file: ${res.status} ${err}`);
    }

    const payload: CloudBackupPayload = await res.json();
    return payload;
  },

  /**
   * Deletes a specific backup file from Google Drive
   */
  async deleteBackup(accessToken: string, fileId: string): Promise<boolean> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return res.ok || res.status === 204;
  },

  /**
   * Evaluates if a scheduled auto-backup is due, and runs it if conditions are met
   */
  async checkAndRunScheduledBackup(
    trigger: 'scheduled' | 'auto_change' = 'scheduled'
  ): Promise<{
    ran: boolean;
    success?: boolean;
    message?: string;
  }> {
    try {
      const user = await StorageService.getGoogleUser();
      if (!user || !user.accessToken) {
        return { ran: false, message: 'Google Drive is not connected' };
      }

      // Check token expiration (if expired, cannot silently auto-backup without re-auth)
      if (user.expiresAt && user.expiresAt < Date.now()) {
        return { ran: false, message: 'Google Drive authorization expired' };
      }

      const settings = await StorageService.getCloudSyncSettings();
      if (settings.autoBackupFrequency === 'off') {
        return { ran: false, message: 'Automatic backup is turned off' };
      }

      const now = new Date();
      const lastDateStr = settings.lastAutoBackupDate;

      if (lastDateStr && trigger === 'scheduled') {
        const lastDate = new Date(lastDateStr);
        const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

        if (settings.autoBackupFrequency === 'daily' && diffHours < 20) {
          // Already backed up recently
          return { ran: false, message: 'Daily backup is already up-to-date' };
        }

        if (settings.autoBackupFrequency === 'weekly' && diffHours < 24 * 6) {
          return { ran: false, message: 'Weekly backup is already up-to-date' };
        }
      }

      // Run backup
      const snapshot = await StorageService.getFullDatabaseSnapshot();
      await this.uploadBackup(user.accessToken, snapshot, trigger);

      return { ran: true, success: true, message: 'Scheduled backup completed successfully' };
    } catch (e: any) {
      console.warn('Scheduled backup error:', e);
      return { ran: true, success: false, message: e?.message || 'Scheduled backup failed' };
    }
  },

  /**
   * Helper to parse OAuth redirect query parameters and hash fragments
   */
  parseTokenFromUrl(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');

    const queryString =
      hashIndex !== -1
        ? url.substring(hashIndex + 1)
        : queryIndex !== -1
        ? url.substring(queryIndex + 1)
        : '';

    if (queryString) {
      const pairs = queryString.split('&');
      for (const pair of pairs) {
        const [k, v] = pair.split('=');
        if (k) {
          params[decodeURIComponent(k)] = decodeURIComponent(v || '');
        }
      }
    }

    return params;
  },
};
