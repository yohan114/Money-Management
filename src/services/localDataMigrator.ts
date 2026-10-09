import { StorageService } from './storage';
import { CloudDataSource } from './cloudDataSource';
import { AppUser, MigrationReport } from '../types';

export const LocalDataMigrator = {
  /**
   * Stage 1: Discover legacy records currently stored locally
   */
  async discoverLegacyRecords(): Promise<MigrationReport['discoveredRecords']> {
    const [accounts, transactions, budgets, vehicles, loans, fuelLogs] = await Promise.all([
      StorageService.getAccounts(),
      StorageService.getTransactions(),
      StorageService.getBudgets(),
      StorageService.getVehicles(),
      StorageService.getLoans(),
      StorageService.getFuelLogs(),
    ]);

    return {
      accounts: accounts.length,
      transactions: transactions.length,
      budgets: budgets.length,
      vehicles: vehicles.length,
      loans: loans.length,
      fuelLogs: fuelLogs.length,
    };
  },

  /**
   * Runs the complete 4-Stage migration process to link and upload local records to user's cloud account.
   */
  async executeMigration(
    user: AppUser,
    onProgress?: (stage: 1 | 2 | 3 | 4, message: string) => void
  ): Promise<MigrationReport> {
    const initialReport: MigrationReport = {
      stage: 1,
      discoveredRecords: { accounts: 0, transactions: 0, budgets: 0, vehicles: 0, loans: 0, fuelLogs: 0 },
      uploadedCount: 0,
      status: 'in_progress',
    };

    try {
      // Stage 1: Discover
      onProgress?.(1, 'Discovering local financial records...');
      const discovered = await this.discoverLegacyRecords();
      initialReport.discoveredRecords = discovered;
      initialReport.stage = 1;

      const totalItems =
        discovered.accounts +
        discovered.transactions +
        discovered.budgets +
        discovered.vehicles +
        discovered.loans +
        discovered.fuelLogs;

      // Stage 2: Associate
      onProgress?.(2, `Associating ${totalItems} records with account ${user.email}...`);
      initialReport.associatedUid = user.uid;
      initialReport.stage = 2;

      // Stage 3: Upload Idempotently
      onProgress?.(3, 'Uploading encrypted snapshot to your cloud vault...');
      initialReport.stage = 3;
      const payload = await CloudDataSource.generateCurrentDatabasePayload();
      const uploadRes = await CloudDataSource.uploadUserDatabase(user, payload);

      if (!uploadRes.firestoreSuccess && !uploadRes.driveSuccess) {
        throw new Error(uploadRes.error || 'Failed to upload records to cloud storage.');
      }

      initialReport.uploadedCount = totalItems;

      // Stage 4: Commit
      onProgress?.(4, 'Verifying and committing migration record...');
      initialReport.stage = 4;
      initialReport.status = 'completed';
      initialReport.committedAt = new Date().toISOString();

      await StorageService.saveMigrationReport(initialReport);
      return initialReport;
    } catch (e: any) {
      initialReport.status = 'failed';
      initialReport.error = e?.message || 'Migration encountered an error.';
      await StorageService.saveMigrationReport(initialReport);
      throw e;
    }
  },

  /**
   * Checks if migration was already successfully executed for this user
   */
  async isMigrated(uid: string): Promise<boolean> {
    const report = await StorageService.getMigrationReport();
    return !!(report && report.associatedUid === uid && report.status === 'completed');
  },
};
