import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { StorageService } from './storage';
import { GoogleDriveService } from './googleDrive';
import { CloudBackupMetadata, CloudBackupPayload } from '../types';

export interface RestorePreview {
  fileName: string;
  fileSize?: number;
  exportedAt: string;
  accountsCount: number;
  transactionsCount: number;
  budgetsCount: number;
  budgetItemsCount: number;
  recurringCount: number;
  goalsCount: number;
  holdingsCount: number;
  loansCount?: number;
  vehiclesCount?: number;
  fuelLogsCount?: number;
  serviceRecordsCount?: number;
}

export interface PickBackupResult {
  canceled: boolean;
  error?: string;
  payload?: CloudBackupPayload;
  preview?: RestorePreview;
}

export const CloudBackupService = {
  /**
   * Normalizes any raw parsed JSON backup object into standard CloudBackupPayload and RestorePreview
   */
  normalizeBackupData(
    parsed: any,
    fileName: string = 'MoneyManagement_Backup.json',
    fileSize?: number
  ): { payload: CloudBackupPayload; preview: RestorePreview } {
    const isWrapped = parsed && parsed.data && typeof parsed.data === 'object';
    const data = isWrapped ? parsed.data : parsed;

    const hasCoreData =
      Array.isArray(data.accounts) ||
      Array.isArray(data.transactions) ||
      Array.isArray(data.budgets) ||
      Array.isArray(data.loans) ||
      data.settings !== undefined;

    if (!hasCoreData) {
      throw new Error('This file is not a valid Money Management backup document.');
    }

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const budgets = Array.isArray(data.budgets) ? data.budgets : [];
    const recurringItems = Array.isArray(data.recurringItems)
      ? data.recurringItems
      : Array.isArray(data.recurring)
      ? data.recurring
      : [];
    const goals = Array.isArray(data.goals) ? data.goals : [];
    const holdings = Array.isArray(data.holdings) ? data.holdings : [];
    const rules = Array.isArray(data.rules) ? data.rules : [];
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const loans = Array.isArray(data.loans) ? data.loans : [];
    const incomeStreams = Array.isArray(data.incomeStreams) ? data.incomeStreams : undefined;
    const settings = data.settings || {};
    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    const fuelLogs = Array.isArray(data.fuelLogs) ? data.fuelLogs : [];
    const serviceRecords = Array.isArray(data.serviceRecords) ? data.serviceRecords : [];

    const budgetItemsCount = budgets.reduce(
      (sum: number, b: any) => sum + (Array.isArray(b?.items) ? b.items.length : 0),
      0
    );

    const payload: CloudBackupPayload = {
      schemaVersion: parsed.schemaVersion || 1,
      appName: 'MoneyManagementApp',
      appVersion: parsed.appVersion || '1.7.0',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      stats: {
        accountsCount: accounts.length,
        transactionsCount: transactions.length,
        budgetsCount: budgets.length,
        budgetItemsCount,
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

    const preview: RestorePreview = {
      fileName,
      fileSize,
      exportedAt: payload.exportedAt,
      accountsCount: accounts.length,
      transactionsCount: transactions.length,
      budgetsCount: budgets.length,
      budgetItemsCount,
      recurringCount: recurringItems.length,
      goalsCount: goals.length,
      holdingsCount: holdings.length,
      loansCount: loans.length,
      vehiclesCount: vehicles.length,
      fuelLogsCount: fuelLogs.length,
      serviceRecordsCount: serviceRecords.length,
    };

    return { payload, preview };
  },

  /**
   * Backs up database directly to Google Drive via REST API if connected,
   * otherwise opens system share sheet allowing the user to select 'Save to Drive'.
   */
  async backupToDrive(trigger: 'manual' | 'scheduled' | 'auto_change' = 'manual'): Promise<{
    success: boolean;
    metadata: CloudBackupMetadata;
    isDirectSync: boolean;
    filePath?: string;
  }> {
    const user = await StorageService.getGoogleUser();
    if (user && user.accessToken) {
      try {
        const snapshot = await StorageService.getFullDatabaseSnapshot();
        const res = await GoogleDriveService.uploadBackup(user.accessToken, snapshot, trigger);
        return { success: true, metadata: res.metadata, isDirectSync: true };
      } catch (err: any) {
        console.warn('Direct Google Drive upload failed, falling back to share sheet:', err);
      }
    }

    const shareRes = await this.exportDatabaseToDrive();
    return {
      success: shareRes.success,
      metadata: shareRes.metadata,
      isDirectSync: false,
      filePath: shareRes.filePath,
    };
  },

  /**
   * Compiles the full database snapshot and opens the Android native share sheet
   * allowing the user to select 'Google Drive' ('Save to Drive') to upload.
   */
  async exportDatabaseToDrive(): Promise<{
    success: boolean;
    metadata: CloudBackupMetadata;
    filePath?: string;
  }> {
    try {
      const snapshot = await StorageService.getFullDatabaseSnapshot();
      const jsonContent = JSON.stringify(snapshot, null, 2);

      const now = new Date();
      const dateSlug = now.toISOString().split('T')[0];
      const timeSlug = `${String(now.getHours()).padStart(2, '0')}-${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const fileName = `MoneyManagement_Backup_${dateSlug}_${timeSlug}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

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
        isDirectSync: false,
      };

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Save Backup to Google Drive',
          UTI: 'public.json',
        });
        await StorageService.saveLastBackupMetadata(metadata);
        return { success: true, metadata, filePath };
      } else {
        await StorageService.saveLastBackupMetadata(metadata);
        return { success: true, metadata, filePath };
      }
    } catch (e: any) {
      console.error('Failed to export database to Google Drive:', e);
      throw new Error(e?.message || 'Could not export database to Google Drive');
    }
  },

  /**
   * Opens the system Document Picker directly to let the user select
   * their MoneyManagement backup JSON from Google Drive or device storage.
   */
  async pickBackupFromDrive(): Promise<PickBackupResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { canceled: true };
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        return { canceled: false, error: 'Could not access file URI from Google Drive picker.' };
      }

      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        return {
          canceled: false,
          error: 'The selected file is not a valid JSON document.',
        };
      }

      try {
        const { payload, preview } = this.normalizeBackupData(parsed, asset.name, asset.size);
        return {
          canceled: false,
          payload,
          preview,
        };
      } catch (normErr: any) {
        return {
          canceled: false,
          error: normErr?.message || 'Invalid backup structure',
        };
      }
    } catch (e: any) {
      console.error('Error during Google Drive document pick:', e);
      return {
        canceled: false,
        error: e?.message || 'Failed to read file from Google Drive',
      };
    }
  },

  /**
   * Applies the normalized backup payload into local storage atomically.
   */
  async restoreDatabase(payload: CloudBackupPayload): Promise<CloudBackupMetadata> {
    try {
      await StorageService.restoreFullDatabaseSnapshot(payload);

      const metadata: CloudBackupMetadata = {
        lastBackupDate: payload.exportedAt,
        fileName: `Restored_${new Date().toISOString().split('T')[0]}.json`,
        accountsCount: payload.stats.accountsCount,
        transactionsCount: payload.stats.transactionsCount,
        budgetsCount: payload.stats.budgetsCount,
        budgetItemsCount: payload.stats.budgetItemsCount,
        loansCount: payload.stats.loansCount,
        vehiclesCount: payload.stats.vehiclesCount,
        fuelLogsCount: payload.stats.fuelLogsCount,
        serviceRecordsCount: payload.stats.serviceRecordsCount,
      };

      await StorageService.saveLastBackupMetadata(metadata);
      return metadata;
    } catch (e: any) {
      console.error('Database restore failed:', e);
      throw new Error(e?.message || 'Failed to restore database from backup');
    }
  },

  /**
   * Gets metadata about the last cloud backup operation.
   */
  async getLastBackupMetadata(): Promise<CloudBackupMetadata | null> {
    return StorageService.getLastBackupMetadata();
  },
};
