import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { StorageService } from './storage';
import { FirebaseProjectConfig } from '../types';

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

export const FirebaseManager = {
  /**
   * Initializes or returns the active Firebase App instance using stored or provided config.
   */
  async getFirebaseApp(customConfig?: FirebaseProjectConfig): Promise<FirebaseApp | null> {
    if (cachedApp) return cachedApp;

    const existingApps = getApps();
    if (existingApps.length > 0) {
      cachedApp = existingApps[0];
      return cachedApp;
    }

    const config = customConfig || (await StorageService.getFirebaseConfig());
    if (!config || !config.apiKey || !config.projectId) {
      return null;
    }

    try {
      cachedApp = initializeApp(config);
      return cachedApp;
    } catch (e) {
      console.warn('Firebase initialization error:', e);
      return null;
    }
  },

  /**
   * Returns Cloud Firestore instance if Firebase is configured.
   */
  async getFirestoreInstance(): Promise<Firestore | null> {
    if (cachedDb) return cachedDb;
    const app = await this.getFirebaseApp();
    if (!app) return null;

    try {
      cachedDb = getFirestore(app);
      return cachedDb;
    } catch (e) {
      console.warn('Cloud Firestore initialization error:', e);
      return null;
    }
  },

  /**
   * Returns Firebase Auth instance if Firebase is configured.
   */
  async getAuthInstance(): Promise<Auth | null> {
    if (cachedAuth) return cachedAuth;
    const app = await this.getFirebaseApp();
    if (!app) return null;

    try {
      cachedAuth = getAuth(app);
      return cachedAuth;
    } catch (e) {
      console.warn('Firebase Auth initialization error:', e);
      return null;
    }
  },

  /**
   * Checks whether Firebase is currently configured with valid credentials.
   */
  async isConfigured(): Promise<boolean> {
    const config = await StorageService.getFirebaseConfig();
    return !!(config && config.apiKey && config.projectId);
  },

  /**
   * Resets instances if credentials are updated or cleared.
   */
  reset(): void {
    cachedApp = null;
    cachedDb = null;
    cachedAuth = null;
  },
};
