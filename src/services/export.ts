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

  async exportMonthlyCostReportHTML(params: {
    month: string;
    accountName: string;
    currencySymbol: string;
    totalBudget: number;
    totalSpent: number;
    netVariance: number;
    itemsCount: number;
    closedCount: number;
    slipsCount: number;
    weeklyData: {
      week: number;
      label: string;
      planned: number;
      actual: number;
      variance: number;
    }[];
    itemsData: {
      categoryName: string;
      itemName: string;
      week: number;
      planned: number;
      actual: number;
      status: string;
      notes?: string;
    }[];
  }): Promise<boolean> {
    try {
      const {
        month,
        accountName,
        currencySymbol,
        totalBudget,
        totalSpent,
        netVariance,
        itemsCount,
        closedCount,
        slipsCount,
        weeklyData,
        itemsData,
      } = params;

      const varianceColor = netVariance >= 0 ? '#10B981' : '#EF4444';
      const varianceLabel = netVariance >= 0 ? `Saved ${currencySymbol} ${netVariance.toLocaleString()}` : `Over Budget by ${currencySymbol} ${Math.abs(netVariance).toLocaleString()}`;

      const weeklyRows = weeklyData
        .map(
          (w) => `
        <tr>
          <td>Week ${w.week} (${w.label})</td>
          <td style="text-align: right;">${currencySymbol} ${w.planned.toLocaleString()}</td>
          <td style="text-align: right; color: ${w.actual > w.planned ? '#EF4444' : '#10B981'}; font-weight: 700;">
            ${currencySymbol} ${w.actual.toLocaleString()}
          </td>
          <td style="text-align: right; color: ${w.variance >= 0 ? '#10B981' : '#EF4444'};">
            ${w.variance >= 0 ? '+' : ''}${currencySymbol} ${w.variance.toLocaleString()}
          </td>
        </tr>`
        )
        .join('');

      const itemRows = itemsData
        .map(
          (it) => `
        <tr>
          <td><span class="badge">W${it.week}</span> <strong>${it.itemName}</strong><br><small style="color: #64748B;">${it.categoryName}${it.notes ? ' • ' + it.notes : ''}</small></td>
          <td style="text-align: right;">${currencySymbol} ${it.planned.toLocaleString()}</td>
          <td style="text-align: right; font-weight: 700;">${it.status === 'closed' ? `${currencySymbol} ${it.actual.toLocaleString()}` : '<span style="color: #F59E0B;">Pending</span>'}</td>
          <td style="text-align: center;">
            <span class="status-pill ${it.status === 'closed' ? 'status-closed' : 'status-planned'}">
              ${it.status === 'closed' ? 'BOUGHT' : 'PLANNED'}
            </span>
          </td>
        </tr>`
        )
        .join('');

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Monthly Cost Report - ${month}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 30px 20px;
      color: #0F172A;
      background-color: #F8FAFC;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #FFFFFF;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      color: #1E293B;
    }
    .subtitle {
      color: #64748B;
      font-size: 14px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: #F1F5F9;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
    }
    .kpi-label {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748B;
      font-weight: 600;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 800;
      margin-top: 4px;
      color: #0F172A;
    }
    h2 {
      font-size: 16px;
      color: #1E293B;
      margin: 24px 0 12px 0;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 13px;
    }
    th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 600;
      padding: 10px;
      text-align: left;
      border-bottom: 2px solid #E2E8F0;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #F1F5F9;
    }
    .badge {
      display: inline-block;
      background: #E2E8F0;
      color: #334155;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      margin-right: 4px;
    }
    .status-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
    }
    .status-closed {
      background: #DCFCE7;
      color: #166534;
    }
    .status-planned {
      background: #FEF3C7;
      color: #92400E;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #94A3B8;
      font-size: 11px;
      border-top: 1px solid #E2E8F0;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Monthly Cost & Master Budget Report</h1>
      <div class="subtitle">Month: <strong>${month}</strong> • Account Domain: <strong>${accountName}</strong> • Generated: ${new Date().toLocaleDateString()}</div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Allocated</div>
        <div class="kpi-value">${currencySymbol} ${totalBudget.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Actual Spent</div>
        <div class="kpi-value" style="color: #EF4444;">${currencySymbol} ${totalSpent.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Net Variance</div>
        <div class="kpi-value" style="color: ${varianceColor};">${varianceLabel}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Items Fulfilled</div>
        <div class="kpi-value">${closedCount}/${itemsCount} (${slipsCount} slips)</div>
      </div>
    </div>

    <h2>Weekly Spending Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Timeline</th>
          <th style="text-align: right;">Planned Limit</th>
          <th style="text-align: right;">Actual Paid</th>
          <th style="text-align: right;">Variance (+/-)</th>
        </tr>
      </thead>
      <tbody>
        ${weeklyRows}
      </tbody>
    </table>

    <h2>Itemized Budget Audit Table</h2>
    <table>
      <thead>
        <tr>
          <th>Item & Category</th>
          <th style="text-align: right;">Planned Est</th>
          <th style="text-align: right;">Actual Cost</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows.length > 0 ? itemRows : '<tr><td colspan="4" style="text-align: center; color: #94A3B8;">No itemized budget entries recorded for this period.</td></tr>'}
      </tbody>
    </table>

    <div class="footer">
      Generated by Money Management Mobile App • Verified with Buying Slips & Invoices
    </div>
  </div>
</body>
</html>`;

      const fileName = `Monthly_Cost_Report_${month}_${accountName.replace(/\s+/g, '_')}.html`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/html',
          dialogTitle: `Monthly Cost Report - ${month}`,
          UTI: 'public.html',
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to export HTML cost report:', e);
      throw e;
    }
  },
};
