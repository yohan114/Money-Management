import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseManager } from './firebaseConfig';
import { StorageService } from './storage';
import { AppUser, GoogleDriveUser } from '../types';
import { DEFAULT_GOOGLE_CLIENT_ID, GOOGLE_DRIVE_SCOPE } from './googleDrive';

WebBrowser.maybeCompleteAuthSession();

export const AuthRepository = {
  /**
   * Generates deep link redirect URI
   */
  getRedirectUri(): string {
    return AuthSession.makeRedirectUri({
      scheme: 'moneymanagement',
    });
  },

  /**
   * Signs in with Google using OAuth2 / Credential Manager flow.
   * If Firebase is configured, creates/links a Firebase user session.
   * Scopes user profile to user.uid.
   */
  async signInWithGoogle(customClientId?: string): Promise<{
    success: boolean;
    user?: AppUser;
    error?: string;
  }> {
    try {
      const clientId = customClientId || DEFAULT_GOOGLE_CLIENT_ID;
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
        const urlParams = this.parseTokenFromUrl(result.url);
        const accessToken = urlParams.access_token;

        if (!accessToken) {
          return { success: false, error: 'Authorization did not return an access token.' };
        }

        // Fetch Google User Profile
        const profile = await this.fetchGoogleUserProfile(accessToken);
        let uid = profile.id;
        let provider: 'google' | 'firebase' = 'google';

        // Check if Firebase Auth is configured
        const auth = await FirebaseManager.getAuthInstance();
        if (auth && urlParams.id_token) {
          try {
            const credential = GoogleAuthProvider.credential(urlParams.id_token);
            const userCred = await signInWithCredential(auth, credential);
            if (userCred.user) {
              uid = userCred.user.uid;
              provider = 'firebase';
            }
          } catch (fbErr) {
            console.warn('Firebase credential sign-in warning:', fbErr);
            // Fallback to Google profile UID gracefully
          }
        }

        const appUser: AppUser = {
          uid,
          email: profile.email,
          displayName: profile.name || profile.email.split('@')[0],
          photoUrl: profile.picture,
          provider,
          accessToken,
          lastLoginAt: new Date().toISOString(),
        };

        // Save local session
        await StorageService.saveAppUser(appUser);

        // Also update GoogleDriveUser for drive backups compatibility
        const driveUser: GoogleDriveUser = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          accessToken,
          expiresAt: Date.now() + 3600 * 1000,
          connectedAt: new Date().toISOString(),
        };
        await StorageService.saveGoogleUser(driveUser);

        // Save profile to Cloud Firestore if ready (Section 8 of Plan)
        await this.syncCloudProfile(appUser);

        return { success: true, user: appUser };
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, error: 'Sign in was cancelled.' };
      } else {
        return { success: false, error: 'Google authentication did not complete.' };
      }
    } catch (e: any) {
      console.error('Google Sign-in failed:', e);
      return { success: false, error: e?.message || 'Authentication error' };
    }
  },

  /**
   * Direct login / connection with Google Access Token
   */
  async signInWithAccessToken(accessToken: string): Promise<{
    success: boolean;
    user?: AppUser;
    error?: string;
  }> {
    try {
      const cleanToken = accessToken.trim();
      if (!cleanToken) {
        return { success: false, error: 'Access token cannot be empty.' };
      }

      const profile = await this.fetchGoogleUserProfile(cleanToken);
      const appUser: AppUser = {
        uid: profile.id,
        email: profile.email,
        displayName: profile.name || profile.email.split('@')[0],
        photoUrl: profile.picture,
        provider: 'google',
        accessToken: cleanToken,
        lastLoginAt: new Date().toISOString(),
      };

      await StorageService.saveAppUser(appUser);

      const driveUser: GoogleDriveUser = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        accessToken: cleanToken,
        expiresAt: Date.now() + 3600 * 1000,
        connectedAt: new Date().toISOString(),
      };
      await StorageService.saveGoogleUser(driveUser);

      await this.syncCloudProfile(appUser);

      return { success: true, user: appUser };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Invalid access token.' };
    }
  },

  /**
   * Test/Demo account sign-in for testing on emulator without web browser
   */
  async signInWithDemoAccount(email?: string, name?: string): Promise<AppUser> {
    const userEmail = email || 'user@example.com';
    const userName = name || 'Monarch User';
    const appUser: AppUser = {
      uid: `demo-${Date.now()}`,
      email: userEmail,
      displayName: userName,
      photoUrl: undefined,
      provider: 'google',
      lastLoginAt: new Date().toISOString(),
    };
    await StorageService.saveAppUser(appUser);
    return appUser;
  },

  /**
   * Section 8: Save or update the cloud profile beneath users/{uid}
   */
  async syncCloudProfile(user: AppUser): Promise<void> {
    try {
      const db = await FirebaseManager.getFirestoreInstance();
      if (!db) return;

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoUrl || null,
          provider: user.provider,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not sync cloud profile to Firestore:', e);
    }
  },

  /**
   * Section 13: Sign out and cleanly clear active session & in-memory caches
   */
  async signOut(): Promise<void> {
    try {
      const auth = await FirebaseManager.getAuthInstance();
      if (auth) {
        await auth.signOut();
      }
    } catch {
      // Ignore
    }
    await StorageService.saveAppUser(null);
    await StorageService.saveGoogleUser(null);
  },

  /**
   * Returns currently authenticated user from local storage
   */
  async getCurrentUser(): Promise<AppUser | null> {
    return StorageService.getAppUser();
  },

  /**
   * Fetches profile from Google UserInfo endpoint
   */
  async fetchGoogleUserProfile(accessToken: string): Promise<{
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
      throw new Error(`Google UserInfo API returned status ${res.status}`);
    }

    const data = await res.json();
    return {
      id: data.sub || data.id,
      email: data.email,
      name: data.name || data.email?.split('@')[0] || 'Google User',
      picture: data.picture,
    };
  },

  /**
   * Parses OAuth fragment parameters
   */
  parseTokenFromUrl(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    const fragmentIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');

    let queryString = '';
    if (fragmentIndex !== -1) {
      queryString = url.substring(fragmentIndex + 1);
    } else if (queryIndex !== -1) {
      queryString = url.substring(queryIndex + 1);
    }

    if (!queryString) return params;

    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }

    return params;
  },
};
