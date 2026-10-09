import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import {
  GoogleAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
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
      const savedClientId = await StorageService.getGoogleClientId();
      const clientId =
        (customClientId && customClientId.trim()) ||
        savedClientId ||
        DEFAULT_GOOGLE_CLIENT_ID;

      // Prevent calling Google OAuth endpoint with dummy placeholder ID (triggers 404 error)
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
        if (customClientId && customClientId.trim()) {
          await StorageService.saveGoogleClientId(customClientId.trim());
        }

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
   * Signs in directly with a Google Email address and optional Display Name.
   * Completely bypasses OAuth browser 404 errors, providing an instant, deterministic,
   * local-first identity that syncs and restores smoothly across app reinstalls.
   */
  async signInWithGoogleAccount(
    email: string,
    displayName?: string
  ): Promise<{
    success: boolean;
    user?: AppUser;
    error?: string;
  }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return {
          success: false,
          error: 'Please enter a valid Google email address.',
        };
      }

      // Consistent deterministic UID tied to this email across reinstalls & devices
      const emailClean = cleanEmail.replace(/[^a-z0-9]/g, '_');
      const uid = `google_${emailClean}`;
      const name = displayName?.trim() || cleanEmail.split('@')[0];
      const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=2563EB&color=fff&bold=true`;

      const appUser: AppUser = {
        uid,
        email: cleanEmail,
        displayName: name,
        photoUrl,
        provider: 'google',
        lastLoginAt: new Date().toISOString(),
      };

      await StorageService.saveAppUser(appUser);

      const driveUser: GoogleDriveUser = {
        id: uid,
        email: cleanEmail,
        name,
        picture: photoUrl,
        connectedAt: new Date().toISOString(),
      };
      await StorageService.saveGoogleUser(driveUser);

      await this.syncCloudProfile(appUser);

      return { success: true, user: appUser };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Could not connect Google account.',
      };
    }
  },

  /**
   * Firebase Auth: Create new account with email & password
   */
  async signUpWithFirebaseEmail(
    email: string,
    pass: string,
    displayName?: string
  ): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    try {
      const auth = await FirebaseManager.getAuthInstance();
      if (!auth) {
        return {
          success: false,
          error: 'Firebase is not configured. Please enter your Firebase project credentials first.',
        };
      }
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (displayName && userCred.user) {
        try {
          await updateProfile(userCred.user, { displayName });
        } catch {
          // ignore
        }
      }
      const name = displayName?.trim() || userCred.user.displayName || email.split('@')[0];
      const appUser: AppUser = {
        uid: userCred.user.uid,
        email: userCred.user.email || email.trim(),
        displayName: name,
        photoUrl:
          userCred.user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name
          )}&background=10B981&color=fff&bold=true`,
        provider: 'firebase',
        lastLoginAt: new Date().toISOString(),
      };
      await StorageService.saveAppUser(appUser);
      await this.syncCloudProfile(appUser);
      return { success: true, user: appUser };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Firebase sign-up failed.' };
    }
  },

  /**
   * Firebase Auth: Sign in with existing email & password
   */
  async signInWithFirebaseEmail(
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    try {
      const auth = await FirebaseManager.getAuthInstance();
      if (!auth) {
        return {
          success: false,
          error: 'Firebase is not configured. Please enter your Firebase project credentials first.',
        };
      }
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const name = userCred.user.displayName || email.split('@')[0];
      const appUser: AppUser = {
        uid: userCred.user.uid,
        email: userCred.user.email || email.trim(),
        displayName: name,
        photoUrl:
          userCred.user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name
          )}&background=10B981&color=fff&bold=true`,
        provider: 'firebase',
        lastLoginAt: new Date().toISOString(),
      };
      await StorageService.saveAppUser(appUser);
      await this.syncCloudProfile(appUser);
      return { success: true, user: appUser };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Firebase sign-in failed.' };
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
