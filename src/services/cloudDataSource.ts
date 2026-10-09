import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseManager } from './firebaseConfig';
import { GoogleDriveService } from './googleDrive';
import { StorageService } from './storage';
import { CloudBackupPayload, AppUser } from '../types';

export const CloudDataSource = {
  /**
   * Section 9 & 11: Uploads user database to Cloud Firestore and/or Google Drive scoped to user.uid
   */
  async uploadUserDatabase(
    user: AppUser,
    payload: CloudBackupPayload
  ): Promise<{
    firestoreSuccess: boolean;
    driveSuccess: boolean;
    error?: string;
  }> {
    let firestoreSuccess = false;
    let driveSuccess = false;
    let lastError: string | undefined;

    // 1. Try Cloud Firestore (Section 9: users/{uid}/...)
    try {
      const db = await FirebaseManager.getFirestoreInstance();
      if (db) {
        const syncDocRef = doc(db, 'users', user.uid, 'sync', 'database');
        await setDoc(
          syncDocRef,
          {
            payload,
            updatedAt: serverTimestamp(),
            uid: user.uid,
            email: user.email,
          },
          { merge: true }
        );
        firestoreSuccess = true;
      }
    } catch (e: any) {
      console.warn('Firestore upload error:', e);
      lastError = e?.message;
    }

    // 2. Try Google Drive if user has an active access token
    if (user.accessToken) {
      try {
        const driveRes = await GoogleDriveService.uploadBackup(
          user.accessToken,
          payload,
          'auto_change'
        );
        if (driveRes && driveRes.file) {
          driveSuccess = true;
        }
      } catch (e: any) {
        console.warn('Drive upload error:', e);
        if (!lastError) lastError = e?.message;
      }
    }

    return {
      firestoreSuccess,
      driveSuccess,
      error: !firestoreSuccess && !driveSuccess ? lastError : undefined,
    };
  },

  /**
   * Section 3 & 11: Checks if remote cloud data exists for this user (for device B or app reinstall recovery)
   */
  async fetchRemoteUserDatabase(
    user: AppUser
  ): Promise<{
    hasRemoteData: boolean;
    payload?: CloudBackupPayload;
    source?: 'firestore' | 'google_drive';
    updatedAt?: string;
    error?: string;
  }> {
    // 1. Check Cloud Firestore
    try {
      const db = await FirebaseManager.getFirestoreInstance();
      if (db) {
        const syncDocRef = doc(db, 'users', user.uid, 'sync', 'database');
        const snap = await getDoc(syncDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.payload) {
            return {
              hasRemoteData: true,
              payload: data.payload as CloudBackupPayload,
              source: 'firestore',
              updatedAt: data.updatedAt ? new Date(data.updatedAt.toDate()).toISOString() : undefined,
            };
          }
        }
      }
    } catch (e: any) {
      console.warn('Could not read Firestore remote data:', e);
    }

    // 2. Check Google Drive backups
    if (user.accessToken) {
      try {
        const driveFiles = await GoogleDriveService.listBackups(user.accessToken);
        if (driveFiles.length > 0) {
          // Download newest file
          const newest = driveFiles[0];
          const dlPayload = await GoogleDriveService.downloadBackup(user.accessToken, newest.id);
          if (dlPayload && dlPayload.data) {
            return {
              hasRemoteData: true,
              payload: dlPayload,
              source: 'google_drive',
              updatedAt: newest.createdTime,
            };
          }
        }
      } catch (e: any) {
        console.warn('Could not read Google Drive remote data:', e);
      }
    }

    return { hasRemoteData: false };
  },

  /**
   * Generates a full cloud payload from current local database
   */
  async generateCurrentDatabasePayload(): Promise<CloudBackupPayload> {
    const transactions = await StorageService.getTransactions();
    const categories = await StorageService.getCategories();
    const accounts = await StorageService.getAccounts();
    const budgets = await StorageService.getBudgets();
    const recurringItems = await StorageService.getRecurring();
    const goals = await StorageService.getGoals();
    const holdings = await StorageService.getHoldings();
    const rules = await StorageService.getRules();
    const settings = await StorageService.getSettings();
    const loans = await StorageService.getLoans();
    const incomeStreams = await StorageService.getIncomeStreams();
    const vehicles = await StorageService.getVehicles();
    const fuelLogs = await StorageService.getFuelLogs();
    const serviceRecords = await StorageService.getServiceRecords();

    return {
      schemaVersion: 4,
      appName: 'MoneyManagement',
      appVersion: '1.8.0',
      exportedAt: new Date().toISOString(),
      stats: {
        accountsCount: accounts.length,
        transactionsCount: transactions.length,
        budgetsCount: budgets.length,
        budgetItemsCount: budgets.reduce((acc, b) => acc + (b.items?.length || 0), 0),
        recurringCount: recurringItems.length,
        goalsCount: goals.length,
        holdingsCount: holdings.length,
        rulesCount: rules.length,
        categoriesCount: categories.length,
        loansCount: loans.length,
        vehiclesCount: vehicles.length,
        fuelLogsCount: fuelLogs.length,
        serviceRecordsCount: serviceRecords.length,
      },
      data: {
        transactions,
        categories,
        accounts,
        budgets,
        recurringItems,
        goals,
        holdings,
        rules,
        settings,
        loans,
        incomeStreams,
        vehicles,
        fuelLogs,
        serviceRecords,
      },
    };
  },
};
