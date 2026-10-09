import { StorageService } from './storage';
import { CloudDataSource } from './cloudDataSource';
import { AuthRepository } from './authRepository';
import { AppUser, CloudBackupPayload } from '../types';

let syncTimer: any = null;
let isCurrentlySyncing = false;

export const SyncCoordinator = {
  /**
   * Notifies the coordinator that a local change occurred (transaction, account, budget, vehicle, etc.)
   * Schedules a debounced background sync to the user's cloud account.
   */
  notifyChange(entityName: string = 'database'): void {
    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    // Debounce by 2.5 seconds so rapid taps (e.g. adding 3 items) batch into 1 upload
    syncTimer = setTimeout(async () => {
      await this.runPendingSync('change_triggered');
    }, 2500);
  },

  /**
   * Runs the sync process immediately
   */
  async runPendingSync(trigger: string = 'manual'): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (isCurrentlySyncing) {
      return { success: false, error: 'Sync already in progress.' };
    }

    const user = await AuthRepository.getCurrentUser();
    if (!user) {
      await StorageService.saveSyncStatus({
        state: 'idle',
        pendingCount: 0,
        targetProvider: 'local_only',
      });
      return { success: true };
    }

    isCurrentlySyncing = true;
    try {
      await StorageService.saveSyncStatus({
        state: 'syncing',
        pendingCount: 1,
        targetProvider: user.provider === 'firebase' ? 'firestore' : 'google_drive',
      });

      const payload = await CloudDataSource.generateCurrentDatabasePayload();
      const uploadRes = await CloudDataSource.uploadUserDatabase(user, payload);

      if (uploadRes.firestoreSuccess || uploadRes.driveSuccess) {
        const now = new Date().toISOString();
        await StorageService.saveSyncStatus({
          state: 'synced',
          lastSyncedAt: now,
          pendingCount: 0,
          targetProvider: uploadRes.firestoreSuccess ? 'firestore' : 'google_drive',
        });

        await StorageService.saveCloudSyncSettings({
          lastAutoBackupDate: now,
        });

        await StorageService.addCloudSyncLog({
          status: 'success',
          trigger: trigger === 'manual' ? 'manual' : 'auto_change',
          recordsCount: payload.stats.transactionsCount + payload.stats.accountsCount,
        });

        return { success: true };
      } else {
        const errMsg = uploadRes.error || 'Failed to sync with cloud storage.';
        await StorageService.saveSyncStatus({
          state: 'error',
          lastError: errMsg,
          pendingCount: 1,
          targetProvider: user.provider === 'firebase' ? 'firestore' : 'google_drive',
        });
        return { success: false, error: errMsg };
      }
    } catch (e: any) {
      const errMsg = e?.message || 'Sync encountered network failure.';
      await StorageService.saveSyncStatus({
        state: 'offline',
        lastError: errMsg,
        pendingCount: 1,
        targetProvider: user.provider === 'firebase' ? 'firestore' : 'google_drive',
      });
      return { success: false, error: errMsg };
    } finally {
      isCurrentlySyncing = false;
    }
  },

  /**
   * Section 3 & 11: Checks if remote user data exists when logging in (e.g. device B or fresh reinstall)
   */
  async checkForRemoteDataOnLogin(user: AppUser): Promise<{
    hasRemoteData: boolean;
    payload?: CloudBackupPayload;
    source?: 'firestore' | 'google_drive';
    updatedAt?: string;
  }> {
    try {
      const res = await CloudDataSource.fetchRemoteUserDatabase(user);
      return res;
    } catch (e) {
      console.warn('Error checking remote user data on login:', e);
      return { hasRemoteData: false };
    }
  },
};
