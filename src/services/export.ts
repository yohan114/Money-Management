import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Transaction, Category, Account } from '../types';

export const ExportService = {
  async exportTransactionsToCSV(
    transactions: Transaction[],
    categories: Category[],
    accounts: Account[],
    currencyCode: string
  ): Promise<boolean> {
    try {
      const getCatName = (id: string) => categories.find((c) => c.id === id)?.name || 'General';
      const getAccName = (id: string) => accounts.find((a) => a.id === id)?.name || 'Account';

      // CSV Header
      const header = ['ID', 'Date', 'Type', 'Category', 'Account', 'Amount', 'Currency', 'Note'];

      // CSV Rows
      const rows = transactions.map((t) => {
        const dateStr = t.date.split('T')[0];
        const safeNote = t.note ? `"${t.note.replace(/"/g, '""')}"` : '""';
        const sign = t.type === 'expense' ? '-' : '+';
        return [
          t.id,
          dateStr,
          t.type.toUpperCase(),
          `"${getCatName(t.categoryId)}"`,
          `"${getAccName(t.accountId)}"`,
          `${sign}${t.amount.toFixed(2)}`,
          currencyCode,
          safeNote,
        ].join(',');
      });

      const csvContent = [header.join(','), ...rows].join('\n');

      const fileName = `Money_Management_Export_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Financial Records',
          UTI: 'public.comma-separated-values-text',
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to export CSV:', e);
      throw e;
    }
  },

  async exportJSONBackup(data: any): Promise<boolean> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const fileName = `Money_Management_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Backup Data',
          UTI: 'public.json',
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to export JSON:', e);
      throw e;
    }
  },
};
