import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  Category,
  Account,
  Budget,
  BudgetItem,
  RecurringItem,
  UserSettings,
  FinancialGoal,
  InvestmentHolding,
  TransactionRule,
  CloudBackupMetadata,
  CloudBackupPayload,
  Loan,
  LoanRepayment,
  LoanSpendingItem,
  IncomeStream,
  Vehicle,
  FuelLog,
  ServiceRecord,
  GoogleDriveUser,
  GoogleDriveFile,
  CloudSyncSettings,
  CloudSyncLog,
  AppUser,
  SyncStatusInfo,
  MigrationReport,
  FirebaseProjectConfig,
} from '../types';
import { StorageService, DEFAULT_SETTINGS, DEFAULT_CLOUD_SYNC_SETTINGS } from '../services/storage';
import { CloudBackupService, PickBackupResult } from '../services/cloudBackup';
import { GoogleDriveService } from '../services/googleDrive';
import { AuthRepository } from '../services/authRepository';
import { SyncCoordinator } from '../services/syncCoordinator';
import { LocalDataMigrator } from '../services/localDataMigrator';
import { FirebaseManager } from '../services/firebaseConfig';

interface CategorySpend {
  category: Category;
  total: number;
  percentage: number;
}

interface MonthlyCashFlow {
  monthKey: string; // YYYY-MM
  label: string; // e.g. "Sep"
  income: number;
  expense: number;
}

export interface DayForecast {
  date: string; // YYYY-MM-DD
  dayNum: number;
  projectedBalance: number;
  incoming: number;
  outgoing: number;
  events: string[];
}

interface FinancialContextValue {
  loading: boolean;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  recurringItems: RecurringItem[];
  goals: FinancialGoal[];
  holdings: InvestmentHolding[];
  rules: TransactionRule[];
  settings: UserSettings;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  selectedAccountId: string | 'all';
  setSelectedAccountId: (id: string | 'all') => void;
  selectedAccount?: Account;

  // Actions
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (data: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addBudget: (data: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (data: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addBudgetItem: (budgetId: string, item: Omit<BudgetItem, 'id' | 'budgetId'>) => Promise<void>;
  updateBudgetItem: (budgetId: string, item: BudgetItem) => Promise<void>;
  deleteBudgetItem: (budgetId: string, itemId: string) => Promise<void>;
  closeBudgetItem: (
    budgetId: string,
    itemId: string,
    data: {
      actualCost: number;
      accountId: string;
      slipImageUri?: string;
      notes?: string;
    }
  ) => Promise<void>;

  addRecurringItem: (data: Omit<RecurringItem, 'id'>) => Promise<void>;
  updateRecurringItem: (data: RecurringItem) => Promise<void>;
  deleteRecurringItem: (id: string) => Promise<void>;
  payRecurringItem: (id: string) => Promise<void>;

  addAccount: (data: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (data: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addGoal: (data: Omit<FinancialGoal, 'id'>) => Promise<void>;
  updateGoal: (data: FinancialGoal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  contributeToGoal: (goalId: string, amount: number, accountId?: string) => Promise<void>;

  addHolding: (data: Omit<InvestmentHolding, 'id'>) => Promise<void>;
  updateHolding: (data: InvestmentHolding) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;

  addRule: (data: Omit<TransactionRule, 'id'>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;

  addCategory: (data: Omit<Category, 'id'>) => Promise<void>;

  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  formatAmount: (amount: number, options?: { showSign?: boolean; absolute?: boolean }) => string;

  // Monarch Wealth Metrics
  totalAssets: number;
  totalLiabilities: number;
  totalNetWorth: number;
  debtToAssetRatio: number;
  totalInvestments: number;

  // Cash flow & Analytics
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  savingsRate: number;
  categorySpending: CategorySpend[];
  cashFlowHistory: MonthlyCashFlow[];
  cashFlowForecast: DayForecast[];
  upcomingBills: RecurringItem[];
  getCategoryById: (id: string) => Category | undefined;
  getAccountById: (id: string) => Account | undefined;
  getCategorySpentForMonth: (categoryId: string, month: string) => number;

  // Google Drive Cloud Backup, Sync & Schedules
  lastBackupInfo: CloudBackupMetadata | null;
  googleUser: GoogleDriveUser | null;
  cloudSyncSettings: CloudSyncSettings;
  cloudSyncLogs: CloudSyncLog[];
  driveBackups: GoogleDriveFile[];
  isSyncingDrive: boolean;
  connectGoogleDrive: (customClientId?: string) => Promise<{ success: boolean; error?: string }>;
  connectWithAccessToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  disconnectGoogleDrive: () => Promise<void>;
  updateCloudSyncSettings: (settings: Partial<CloudSyncSettings>) => Promise<void>;
  backupToGoogleDrive: (trigger?: 'manual' | 'scheduled' | 'auto_change') => Promise<CloudBackupMetadata>;
  refreshDriveBackups: () => Promise<GoogleDriveFile[]>;
  restoreBackupFromDriveFile: (fileId: string) => Promise<boolean>;
  deleteDriveBackupFile: (fileId: string) => Promise<boolean>;
  pickBackupFromDrive: () => Promise<PickBackupResult>;
  restoreFromBackupPayload: (payload: CloudBackupPayload) => Promise<boolean>;
  refreshAllData: () => Promise<void>;

  // Google Sign-Up, Login & Automatic Cloud Sync (Plan Architecture)
  appUser: AppUser | null;
  syncStatus: SyncStatusInfo;
  migrationReport: MigrationReport | null;
  signInWithGoogle: (customClientId?: string) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  signInWithAccessToken: (token: string) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  signInWithDemoAccount: (email?: string, name?: string) => Promise<AppUser>;
  signOutUser: () => Promise<void>;
  migrateLocalData: (onProgress?: (stage: 1 | 2 | 3 | 4, msg: string) => void) => Promise<MigrationReport>;
  syncNow: () => Promise<boolean>;
  checkForRemoteUserCloudData: () => Promise<{ hasRemoteData: boolean; payload?: CloudBackupPayload; updatedAt?: string; source?: string }>;
  saveFirebaseProjectConfig: (config: FirebaseProjectConfig | null) => Promise<void>;
  getFirebaseProjectConfig: () => Promise<FirebaseProjectConfig | null>;

  // Phase 2: Income Ledgers & Loan Tracker
  loans: Loan[];
  incomeStreams: IncomeStream[];
  totalBorrowedDebt: number;
  totalRepaidDebt: number;
  upcomingLoanReminders: Loan[];
  addLoan: (
    data: Omit<Loan, 'id' | 'status'>,
    options?: { autoCreditAccount?: boolean }
  ) => Promise<void>;
  updateLoan: (data: Loan) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addLoanSpendingItem: (
    loanId: string,
    item: Omit<LoanSpendingItem, 'id' | 'loanId'>
  ) => Promise<void>;
  deleteLoanSpendingItem: (loanId: string, itemId: string) => Promise<void>;
  recordLoanRepayment: (
    loanId: string,
    repayment: Omit<LoanRepayment, 'id' | 'loanId'>
  ) => Promise<void>;
  deleteLoanRepayment: (loanId: string, repaymentId: string) => Promise<void>;
  addIncomeStream: (data: Omit<IncomeStream, 'id'>) => Promise<void>;
  deleteIncomeStream: (id: string) => Promise<void>;

  // Phase 3: Vehicles, Fuel & Maintenance
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  serviceRecords: ServiceRecord[];
  totalFuelCostThisMonth: number;
  totalFuelLitersThisMonth: number;
  upcomingServiceReminders: {
    vehicle: Vehicle;
    reason: 'odometer' | 'date';
    remainingKm?: number;
    remainingDays?: number;
    isOverdue: boolean;
  }[];
  addVehicle: (data: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (data: Vehicle) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addFuelLog: (
    data: Omit<FuelLog, 'id'>,
    options?: { autoDebitAccount?: boolean }
  ) => Promise<void>;
  deleteFuelLog: (id: string) => Promise<void>;
  addServiceRecord: (
    data: Omit<ServiceRecord, 'id'>,
    options?: { autoDebitAccount?: boolean }
  ) => Promise<void>;
  deleteServiceRecord: (id: string) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextValue | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [lastBackupInfo, setLastBackupInfo] = useState<CloudBackupMetadata | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleDriveUser | null>(null);
  const [cloudSyncSettings, setCloudSyncSettings] = useState<CloudSyncSettings>(DEFAULT_CLOUD_SYNC_SETTINGS);
  const [cloudSyncLogs, setCloudSyncLogs] = useState<CloudSyncLog[]>([]);
  const [driveBackups, setDriveBackups] = useState<GoogleDriveFile[]>([]);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [incomeStreams, setIncomeStreams] = useState<IncomeStream[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    state: 'idle',
    pendingCount: 0,
    targetProvider: 'local_only',
  });
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);

  const currentYearMonth = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');

  const selectedAccount = useMemo(() => {
    if (selectedAccountId === 'all') return undefined;
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Load data on startup
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await StorageService.initFreshDataIfFirstTime();
    const [
      txs,
      cats,
      accs,
      bdgs,
      recs,
      gls,
      hlds,
      rls,
      sets,
      backupMeta,
      lns,
      strms,
      vehs,
      fuels,
      srvs,
      gUser,
      cSettings,
      cLogs,
      aUser,
      sStatus,
      mReport,
    ] = await Promise.all([
      StorageService.getTransactions(),
      StorageService.getCategories(),
      StorageService.getAccounts(),
      StorageService.getBudgets(),
      StorageService.getRecurring(),
      StorageService.getGoals(),
      StorageService.getHoldings(),
      StorageService.getRules(),
      StorageService.getSettings(),
      StorageService.getLastBackupMetadata(),
      StorageService.getLoans(),
      StorageService.getIncomeStreams(),
      StorageService.getVehicles(),
      StorageService.getFuelLogs(),
      StorageService.getServiceRecords(),
      StorageService.getGoogleUser(),
      StorageService.getCloudSyncSettings(),
      StorageService.getCloudSyncLogs(),
      StorageService.getAppUser(),
      StorageService.getSyncStatus(),
      StorageService.getMigrationReport(),
    ]);

    setTransactions(txs);
    setCategories(cats);
    setAccounts(accs);
    setBudgets(bdgs);
    setRecurringItems(recs);
    setGoals(gls);
    setHoldings(hlds);
    setRules(rls);
    setSettings(sets);
    setLastBackupInfo(backupMeta);
    setLoans(lns);
    setIncomeStreams(strms);
    setVehicles(vehs);
    setFuelLogs(fuels);
    setServiceRecords(srvs);
    setGoogleUser(gUser);
    setCloudSyncSettings(cSettings);
    setCloudSyncLogs(cLogs);
    setAppUser(aUser);
    setSyncStatus(sStatus);
    setMigrationReport(mReport);
    setLoading(false);

    // Auto-check scheduled backup or pending sync in background if user is active
    if (aUser) {
      SyncCoordinator.runPendingSync('startup').then(async () => {
        const updatedStatus = await StorageService.getSyncStatus();
        setSyncStatus(updatedStatus);
      });
    } else if (gUser && gUser.accessToken) {
      GoogleDriveService.checkAndRunScheduledBackup('scheduled').then(async (res) => {
        if (res.ran && res.success) {
          const updatedMeta = await StorageService.getLastBackupMetadata();
          const updatedLogs = await StorageService.getCloudSyncLogs();
          setLastBackupInfo(updatedMeta);
          setCloudSyncLogs(updatedLogs);
        }
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      if (isMounted) {
        await loadAllData();
      }
    };
    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [loadAllData]);

  // Format money string helper
  const formatAmount = useCallback(
    (amount: number, options?: { showSign?: boolean; absolute?: boolean }) => {
      const val = options?.absolute ? Math.abs(amount) : amount;
      const formattedNumber = val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const sym = settings.currencySymbol || 'Rs.';
      if (options?.showSign && amount > 0) {
        return `+${sym} ${formattedNumber}`;
      } else if (options?.showSign && amount < 0) {
        return `-${sym} ${Math.abs(val).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }
      return `${sym} ${formattedNumber}`;
    },
    [settings.currencySymbol]
  );

  // Lookup helpers
  const getCategoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  );

  const getAccountById = useCallback(
    (id: string) => accounts.find((a) => a.id === id),
    [accounts]
  );

  // Add Transaction with Monarch Automation Rules
  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id'>) => {
      let finalCategoryId = data.categoryId;
      let finalTags = data.tags ? [...data.tags] : [];

      // Monarch Rules engine: auto-categorize and tag by keyword
      if (data.note) {
        const lowerNote = data.note.toLowerCase();
        for (const rule of rules) {
          if (lowerNote.includes(rule.keyword.toLowerCase())) {
            finalCategoryId = rule.categoryId;
            if (rule.tag && !finalTags.includes(rule.tag)) {
              finalTags.push(rule.tag);
            }
            break;
          }
        }
      }

      const newTx: Transaction = {
        ...data,
        categoryId: finalCategoryId,
        tags: finalTags.length > 0 ? finalTags : undefined,
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };

      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      await StorageService.saveTransactions(updatedTxs);

      // Adjust account balance
      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === data.accountId) {
          const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
          let delta = 0;
          if (isLiability) {
            // Charging expense increases card balance/debt, payment reduces it
            delta = data.type === 'expense' ? data.amount : -data.amount;
          } else {
            delta = data.type === 'income' ? data.amount : -data.amount;
          }
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      await StorageService.saveAccounts(updatedAccounts);
      SyncCoordinator.notifyChange('transaction');
    },
    [transactions, accounts, rules]
  );

  // Update Transaction
  const updateTransaction = useCallback(
    async (tx: Transaction) => {
      const oldTx = transactions.find((t) => t.id === tx.id);
      const updatedTxs = transactions.map((t) => (t.id === tx.id ? tx : t));
      setTransactions(updatedTxs);
      await StorageService.saveTransactions(updatedTxs);

      if (oldTx) {
        const updatedAccounts = accounts.map((acc) => {
          let balance = acc.balance;
          const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
          // Revert old
          if (acc.id === oldTx.accountId) {
            const oldDelta = isLiability
              ? oldTx.type === 'expense'
                ? oldTx.amount
                : -oldTx.amount
              : oldTx.type === 'income'
              ? oldTx.amount
              : -oldTx.amount;
            balance -= oldDelta;
          }
          // Apply new
          if (acc.id === tx.accountId) {
            const newDelta = isLiability
              ? tx.type === 'expense'
                ? tx.amount
                : -tx.amount
              : tx.type === 'income'
              ? tx.amount
              : -tx.amount;
            balance += newDelta;
          }
          return { ...acc, balance };
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }
      SyncCoordinator.notifyChange('transaction');
    },
    [transactions, accounts]
  );

  // Delete Transaction
  const deleteTransaction = useCallback(
    async (id: string) => {
      const txToDelete = transactions.find((t) => t.id === id);
      const updatedTxs = transactions.filter((t) => t.id !== id);
      setTransactions(updatedTxs);
      await StorageService.saveTransactions(updatedTxs);

      if (txToDelete) {
        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === txToDelete.accountId) {
            const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
            const delta = isLiability
              ? txToDelete.type === 'expense'
                ? txToDelete.amount
                : -txToDelete.amount
              : txToDelete.type === 'income'
              ? txToDelete.amount
              : -txToDelete.amount;
            return { ...acc, balance: acc.balance - delta };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }
      SyncCoordinator.notifyChange('transaction');
    },
    [transactions, accounts]
  );

  // Budgets
  const addBudget = useCallback(
    async (data: Omit<Budget, 'id'>) => {
      const newBudget: Budget = {
        ...data,
        id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...budgets, newBudget];
      setBudgets(updated);
      await StorageService.saveBudgets(updated);
    },
    [budgets]
  );

  const updateBudget = useCallback(
    async (data: Budget) => {
      const updated = budgets.map((b) => (b.id === data.id ? data : b));
      setBudgets(updated);
      await StorageService.saveBudgets(updated);
    },
    [budgets]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      const updated = budgets.filter((b) => b.id !== id);
      setBudgets(updated);
      await StorageService.saveBudgets(updated);
    },
    [budgets]
  );

  const addBudgetItem = useCallback(
    async (budgetId: string, itemData: Omit<BudgetItem, 'id' | 'budgetId'>) => {
      const budget = budgets.find((b) => b.id === budgetId);
      if (!budget) return;

      const newItem: BudgetItem = {
        ...itemData,
        id: `bi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        budgetId,
      };

      const currentItems = budget.items || [];
      const updatedBudget: Budget = {
        ...budget,
        items: [...currentItems, newItem],
      };

      const updatedBudgets = budgets.map((b) => (b.id === budgetId ? updatedBudget : b));
      setBudgets(updatedBudgets);
      await StorageService.saveBudgets(updatedBudgets);
    },
    [budgets]
  );

  const updateBudgetItem = useCallback(
    async (budgetId: string, updatedItem: BudgetItem) => {
      const budget = budgets.find((b) => b.id === budgetId);
      if (!budget) return;

      const currentItems = budget.items || [];
      const updatedBudget: Budget = {
        ...budget,
        items: currentItems.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
      };

      const updatedBudgets = budgets.map((b) => (b.id === budgetId ? updatedBudget : b));
      setBudgets(updatedBudgets);
      await StorageService.saveBudgets(updatedBudgets);
    },
    [budgets]
  );

  const deleteBudgetItem = useCallback(
    async (budgetId: string, itemId: string) => {
      const budget = budgets.find((b) => b.id === budgetId);
      if (!budget) return;

      const currentItems = budget.items || [];
      const updatedBudget: Budget = {
        ...budget,
        items: currentItems.filter((i) => i.id !== itemId),
      };

      const updatedBudgets = budgets.map((b) => (b.id === budgetId ? updatedBudget : b));
      setBudgets(updatedBudgets);
      await StorageService.saveBudgets(updatedBudgets);
    },
    [budgets]
  );

  const closeBudgetItem = useCallback(
    async (
      budgetId: string,
      itemId: string,
      data: {
        actualCost: number;
        accountId: string;
        slipImageUri?: string;
        notes?: string;
      }
    ) => {
      const budget = budgets.find((b) => b.id === budgetId);
      if (!budget) return;
      const item = (budget.items || []).find((i) => i.id === itemId);
      if (!item) return;

      // 1. Create transaction with slip
      const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newTx: Transaction = {
        id: txId,
        type: 'expense',
        amount: data.actualCost,
        categoryId: budget.categoryId,
        accountId: data.accountId,
        date: new Date().toISOString(),
        note: `${item.name}${data.notes ? ' - ' + data.notes : ''} (Budget slip closed)`,
        imageUri: data.slipImageUri,
        tags: ['#budget-slip', `#week-${item.targetWeek}`],
      };

      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      await StorageService.saveTransactions(updatedTxs);

      // Adjust account balance
      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === data.accountId) {
          const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
          const delta = isLiability ? data.actualCost : -data.actualCost;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      await StorageService.saveAccounts(updatedAccounts);

      // 2. Mark item as closed
      const closedItem: BudgetItem = {
        ...item,
        status: 'closed',
        actualCost: data.actualCost,
        closedAt: new Date().toISOString(),
        slipImageUri: data.slipImageUri,
        linkedTransactionId: txId,
        notes: data.notes || item.notes,
      };

      const updatedBudget: Budget = {
        ...budget,
        items: (budget.items || []).map((i) => (i.id === itemId ? closedItem : i)),
      };

      const updatedBudgets = budgets.map((b) => (b.id === budgetId ? updatedBudget : b));
      setBudgets(updatedBudgets);
      await StorageService.saveBudgets(updatedBudgets);
    },
    [budgets, transactions, accounts]
  );

  // Recurring Items
  const addRecurringItem = useCallback(
    async (data: Omit<RecurringItem, 'id'>) => {
      const newItem: RecurringItem = {
        ...data,
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...recurringItems, newItem];
      setRecurringItems(updated);
      await StorageService.saveRecurring(updated);
    },
    [recurringItems]
  );

  const updateRecurringItem = useCallback(
    async (data: RecurringItem) => {
      const updated = recurringItems.map((r) => (r.id === data.id ? data : r));
      setRecurringItems(updated);
      await StorageService.saveRecurring(updated);
    },
    [recurringItems]
  );

  const deleteRecurringItem = useCallback(
    async (id: string) => {
      const updated = recurringItems.filter((r) => r.id !== id);
      setRecurringItems(updated);
      await StorageService.saveRecurring(updated);
    },
    [recurringItems]
  );

  // Pay recurring bill
  const payRecurringItem = useCallback(
    async (id: string) => {
      const item = recurringItems.find((r) => r.id === id);
      if (!item) return;

      const today = new Date().toISOString();
      await addTransaction({
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId,
        accountId: item.accountId,
        date: today,
        note: `Payment for ${item.title}`,
        recurringId: item.id,
      });

      const updated = recurringItems.map((r) =>
        r.id === id ? { ...r, lastPaidDate: today } : r
      );
      setRecurringItems(updated);
      await StorageService.saveRecurring(updated);
    },
    [recurringItems, addTransaction]
  );

  // Accounts
  const addAccount = useCallback(
    async (data: Omit<Account, 'id'>) => {
      const newAcc: Account = {
        ...data,
        isLiability:
          data.isLiability !== undefined
            ? data.isLiability
            : data.type === 'card' || data.type === 'loan',
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...accounts, newAcc];
      setAccounts(updated);
      await StorageService.saveAccounts(updated);
    },
    [accounts]
  );

  const updateAccount = useCallback(
    async (data: Account) => {
      const updated = accounts.map((a) => (a.id === data.id ? data : a));
      setAccounts(updated);
      await StorageService.saveAccounts(updated);
    },
    [accounts]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      const updated = accounts.filter((a) => a.id !== id);
      setAccounts(updated);
      await StorageService.saveAccounts(updated);
    },
    [accounts]
  );

  // Goals
  const addGoal = useCallback(
    async (data: Omit<FinancialGoal, 'id'>) => {
      const newGoal: FinancialGoal = {
        ...data,
        id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...goals, newGoal];
      setGoals(updated);
      await StorageService.saveGoals(updated);
    },
    [goals]
  );

  const updateGoal = useCallback(
    async (data: FinancialGoal) => {
      const updated = goals.map((g) => (g.id === data.id ? data : g));
      setGoals(updated);
      await StorageService.saveGoals(updated);
    },
    [goals]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      const updated = goals.filter((g) => g.id !== id);
      setGoals(updated);
      await StorageService.saveGoals(updated);
    },
    [goals]
  );

  const contributeToGoal = useCallback(
    async (goalId: string, amount: number, accountId?: string) => {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      const updatedGoal = { ...goal, currentAmount: goal.currentAmount + amount };
      await updateGoal(updatedGoal);

      // If an account was debited, record the transfer/expense
      if (accountId) {
        await addTransaction({
          type: 'expense',
          amount,
          categoryId: 'cat-investments',
          accountId,
          date: new Date().toISOString(),
          note: `Goal Contribution: ${goal.title}`,
          tags: ['#goal', '#savings'],
        });
      }
    },
    [goals, updateGoal, addTransaction]
  );

  // Investment Holdings
  const addHolding = useCallback(
    async (data: Omit<InvestmentHolding, 'id'>) => {
      const newHolding: InvestmentHolding = {
        ...data,
        id: `hold-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...holdings, newHolding];
      setHoldings(updated);
      await StorageService.saveHoldings(updated);
    },
    [holdings]
  );

  const updateHolding = useCallback(
    async (data: InvestmentHolding) => {
      const updated = holdings.map((h) => (h.id === data.id ? data : h));
      setHoldings(updated);
      await StorageService.saveHoldings(updated);
    },
    [holdings]
  );

  const deleteHolding = useCallback(
    async (id: string) => {
      const updated = holdings.filter((h) => h.id !== id);
      setHoldings(updated);
      await StorageService.saveHoldings(updated);
    },
    [holdings]
  );

  // Rules
  const addRule = useCallback(
    async (data: Omit<TransactionRule, 'id'>) => {
      const newRule: TransactionRule = {
        ...data,
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...rules, newRule];
      setRules(updated);
      await StorageService.saveRules(updated);
    },
    [rules]
  );

  const deleteRule = useCallback(
    async (id: string) => {
      const updated = rules.filter((r) => r.id !== id);
      setRules(updated);
      await StorageService.saveRules(updated);
    },
    [rules]
  );

  // Custom Categories
  const addCategory = useCallback(
    async (data: Omit<Category, 'id'>) => {
      const newCat: Category = {
        ...data,
        isCustom: true,
        id: `cat-custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      await StorageService.saveCategories(updated);
    },
    [categories]
  );

  // Settings
  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await StorageService.saveSettings(updated);
    },
    [settings]
  );

  const resetDemoData = useCallback(async () => {
    setLoading(true);
    await StorageService.resetToDemo();
    await loadAllData();
  }, [loadAllData]);

  const clearAllData = useCallback(async () => {
    setLoading(true);
    await StorageService.clearAll();
    await loadAllData();
  }, [loadAllData]);

  // Google Drive Cloud Backup & Sync Methods
  const connectGoogleDrive = useCallback(
    async (customClientId?: string) => {
      setIsSyncingDrive(true);
      try {
        const res = await GoogleDriveService.signInWithGoogle(customClientId);
        if (res.success && res.user) {
          setGoogleUser(res.user);
          const logs = await StorageService.getCloudSyncLogs();
          setCloudSyncLogs(logs);
          try {
            const files = await GoogleDriveService.listBackups(res.user.accessToken);
            setDriveBackups(files);
          } catch {
            // ignore
          }
          return { success: true };
        }
        return { success: false, error: res.error || 'Sign in failed' };
      } finally {
        setIsSyncingDrive(false);
      }
    },
    []
  );

  const connectWithAccessToken = useCallback(
    async (token: string) => {
      setIsSyncingDrive(true);
      try {
        const res = await GoogleDriveService.connectWithAccessToken(token);
        if (res.success && res.user) {
          setGoogleUser(res.user);
          const logs = await StorageService.getCloudSyncLogs();
          setCloudSyncLogs(logs);
          try {
            const files = await GoogleDriveService.listBackups(res.user.accessToken);
            setDriveBackups(files);
          } catch {
            // ignore
          }
          return { success: true };
        }
        return { success: false, error: res.error || 'Failed to connect with token' };
      } finally {
        setIsSyncingDrive(false);
      }
    },
    []
  );

  const disconnectGoogleDrive = useCallback(async () => {
    await GoogleDriveService.disconnect();
    setGoogleUser(null);
    setDriveBackups([]);
  }, []);

  const updateCloudSyncSettings = useCallback(
    async (newSettings: Partial<CloudSyncSettings>) => {
      const updated = await StorageService.saveCloudSyncSettings(newSettings);
      setCloudSyncSettings(updated);
    },
    []
  );

  const backupToGoogleDrive = useCallback(
    async (trigger: 'manual' | 'scheduled' | 'auto_change' = 'manual') => {
      setIsSyncingDrive(true);
      try {
        const res = await CloudBackupService.backupToDrive(trigger);
        setLastBackupInfo(res.metadata);
        const logs = await StorageService.getCloudSyncLogs();
        setCloudSyncLogs(logs);
        if (googleUser && googleUser.accessToken) {
          try {
            const files = await GoogleDriveService.listBackups(googleUser.accessToken);
            setDriveBackups(files);
          } catch {
            // ignore
          }
        }
        return res.metadata;
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [googleUser]
  );

  const refreshDriveBackups = useCallback(async () => {
    if (!googleUser || !googleUser.accessToken) return [];
    setIsSyncingDrive(true);
    try {
      const files = await GoogleDriveService.listBackups(googleUser.accessToken);
      setDriveBackups(files);
      return files;
    } catch (e: any) {
      console.warn('Refresh drive backups error:', e);
      return [];
    } finally {
      setIsSyncingDrive(false);
    }
  }, [googleUser]);

  const restoreBackupFromDriveFile = useCallback(
    async (fileId: string) => {
      if (!googleUser || !googleUser.accessToken) return false;
      setLoading(true);
      try {
        const rawPayload = await GoogleDriveService.downloadBackup(googleUser.accessToken, fileId);
        const { payload } = CloudBackupService.normalizeBackupData(rawPayload);
        const meta = await CloudBackupService.restoreDatabase(payload);
        setLastBackupInfo(meta);
        await loadAllData();
        return true;
      } catch (e: any) {
        console.error('Failed to restore from Drive file:', e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [googleUser, loadAllData]
  );

  const deleteDriveBackupFile = useCallback(
    async (fileId: string) => {
      if (!googleUser || !googleUser.accessToken) return false;
      const success = await GoogleDriveService.deleteBackup(googleUser.accessToken, fileId);
      if (success) {
        setDriveBackups((prev) => prev.filter((f) => f.id !== fileId));
      }
      return success;
    },
    [googleUser]
  );

  const pickBackupFromDrive = useCallback(async () => {
    return CloudBackupService.pickBackupFromDrive();
  }, []);

  const restoreFromBackupPayload = useCallback(
    async (payload: CloudBackupPayload) => {
      setLoading(true);
      const meta = await CloudBackupService.restoreDatabase(payload);
      setLastBackupInfo(meta);
      await loadAllData();
      return true;
    },
    [loadAllData]
  );

  const refreshAllData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // --- Google Sign-Up, Login & Automatic Cloud Sync (Plan Architecture) ---
  const signInWithGoogle = useCallback(
    async (customClientId?: string) => {
      setIsSyncingDrive(true);
      try {
        const res = await AuthRepository.signInWithGoogle(customClientId);
        if (res.success && res.user) {
          setAppUser(res.user);
          const gU = await StorageService.getGoogleUser();
          setGoogleUser(gU);

          // Check if remote cloud data exists (e.g. Device B or fresh reinstall)
          const remoteCheck = await SyncCoordinator.checkForRemoteDataOnLogin(res.user);
          if (remoteCheck.hasRemoteData && remoteCheck.payload) {
            const localTxs = await StorageService.getTransactions();
            if (localTxs.length === 0) {
              await CloudBackupService.restoreDatabase(remoteCheck.payload);
              await loadAllData();
            }
          } else {
            // Trigger automatic migration of legacy local records if not yet migrated
            const isMig = await LocalDataMigrator.isMigrated(res.user.uid);
            if (!isMig) {
              try {
                const rep = await LocalDataMigrator.executeMigration(res.user);
                setMigrationReport(rep);
              } catch (migErr) {
                console.warn('Auto-migration notice:', migErr);
              }
            }
          }

          const newStatus = await StorageService.getSyncStatus();
          setSyncStatus(newStatus);
          return { success: true, user: res.user };
        }
        return { success: false, error: res.error };
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [loadAllData]
  );

  const signInWithAccessToken = useCallback(
    async (token: string) => {
      setIsSyncingDrive(true);
      try {
        const res = await AuthRepository.signInWithAccessToken(token);
        if (res.success && res.user) {
          setAppUser(res.user);
          const gU = await StorageService.getGoogleUser();
          setGoogleUser(gU);

          const remoteCheck = await SyncCoordinator.checkForRemoteDataOnLogin(res.user);
          if (remoteCheck.hasRemoteData && remoteCheck.payload) {
            const localTxs = await StorageService.getTransactions();
            if (localTxs.length === 0) {
              await CloudBackupService.restoreDatabase(remoteCheck.payload);
              await loadAllData();
            }
          }

          const newStatus = await StorageService.getSyncStatus();
          setSyncStatus(newStatus);
          return { success: true, user: res.user };
        }
        return { success: false, error: res.error };
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [loadAllData]
  );

  const signInWithDemoAccount = useCallback(async (email?: string, name?: string) => {
    const user = await AuthRepository.signInWithDemoAccount(email, name);
    setAppUser(user);
    const newStatus: SyncStatusInfo = {
      state: 'synced',
      pendingCount: 0,
      targetProvider: 'local_only',
      lastSyncedAt: new Date().toISOString(),
    };
    await StorageService.saveSyncStatus(newStatus);
    setSyncStatus(newStatus);
    return user;
  }, []);

  const signOutUser = useCallback(async () => {
    await AuthRepository.signOut();
    setAppUser(null);
    setGoogleUser(null);
    const defaultStatus: SyncStatusInfo = {
      state: 'idle',
      pendingCount: 0,
      targetProvider: 'local_only',
    };
    await StorageService.saveSyncStatus(defaultStatus);
    setSyncStatus(defaultStatus);
  }, []);

  const migrateLocalData = useCallback(
    async (onProgress?: (stage: 1 | 2 | 3 | 4, msg: string) => void) => {
      if (!appUser) {
        throw new Error('Please sign in with Google first before migrating records.');
      }
      const report = await LocalDataMigrator.executeMigration(appUser, onProgress);
      setMigrationReport(report);
      const updatedStatus = await StorageService.getSyncStatus();
      setSyncStatus(updatedStatus);
      return report;
    },
    [appUser]
  );

  const syncNow = useCallback(async () => {
    if (!appUser) return false;
    setIsSyncingDrive(true);
    try {
      const res = await SyncCoordinator.runPendingSync('manual');
      const updatedStatus = await StorageService.getSyncStatus();
      setSyncStatus(updatedStatus);
      return res.success;
    } finally {
      setIsSyncingDrive(false);
    }
  }, [appUser]);

  const checkForRemoteUserCloudData = useCallback(async () => {
    if (!appUser) return { hasRemoteData: false };
    return SyncCoordinator.checkForRemoteDataOnLogin(appUser);
  }, [appUser]);

  const saveFirebaseProjectConfig = useCallback(async (config: FirebaseProjectConfig | null) => {
    await StorageService.saveFirebaseConfig(config);
    FirebaseManager.reset();
  }, []);

  const getFirebaseProjectConfig = useCallback(async () => {
    return StorageService.getFirebaseConfig();
  }, []);

  // Phase 2: Income Ledgers & Loan Actions
  const totalBorrowedDebt = useMemo(() => {
    return loans
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => {
        const repaid = (l.repayments || []).reduce((rSum, r) => rSum + r.amount, 0);
        return sum + Math.max(0, l.totalAmount - repaid);
      }, 0);
  }, [loans]);

  const totalRepaidDebt = useMemo(() => {
    return loans.reduce((sum, l) => {
      const repaid = (l.repayments || []).reduce((rSum, r) => rSum + r.amount, 0);
      return sum + repaid;
    }, 0);
  }, [loans]);

  const upcomingLoanReminders = useMemo(() => {
    return loans
      .filter((l) => l.status === 'active' && !!l.dueDate)
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!).getTime();
        const dateB = new Date(b.dueDate!).getTime();
        return dateA - dateB;
      });
  }, [loans]);

  const addLoan = useCallback(
    async (
      data: Omit<Loan, 'id' | 'status'>,
      options?: { autoCreditAccount?: boolean }
    ) => {
      const loanId = `loan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      let txId: string | undefined;

      const autoCredit = options?.autoCreditAccount !== false;
      if (autoCredit && data.depositAccountId && data.totalAmount > 0) {
        txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newTx: Transaction = {
          id: txId,
          type: 'income',
          amount: data.totalAmount,
          categoryId: 'cat-loans-inc',
          accountId: data.depositAccountId,
          date: data.receivedDate || new Date().toISOString(),
          note: `Loan Inflow: ${data.lenderName}${data.purpose ? ' (' + data.purpose + ')' : ''}`,
          tags: ['#loan-inflow', `#loan-${loanId}`],
        };

        const updatedTxs = [newTx, ...transactions];
        setTransactions(updatedTxs);
        await StorageService.saveTransactions(updatedTxs);

        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === data.depositAccountId) {
            return { ...acc, balance: acc.balance + data.totalAmount };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }

      const newLoan: Loan = {
        ...data,
        id: loanId,
        status: 'active',
        spendingItems: data.spendingItems || [],
        repayments: data.repayments || [],
        linkedTransactionId: txId,
      };

      const updatedLoans = [newLoan, ...loans];
      setLoans(updatedLoans);
      await StorageService.saveLoans(updatedLoans);
    },
    [loans, transactions, accounts]
  );

  const updateLoan = useCallback(
    async (data: Loan) => {
      const updated = loans.map((l) => (l.id === data.id ? data : l));
      setLoans(updated);
      await StorageService.saveLoans(updated);
    },
    [loans]
  );

  const deleteLoan = useCallback(
    async (id: string) => {
      const updated = loans.filter((l) => l.id !== id);
      setLoans(updated);
      await StorageService.saveLoans(updated);
    },
    [loans]
  );

  const addLoanSpendingItem = useCallback(
    async (loanId: string, itemData: Omit<LoanSpendingItem, 'id' | 'loanId'>) => {
      const targetLoan = loans.find((l) => l.id === loanId);
      if (!targetLoan) return;

      const newItem: LoanSpendingItem = {
        ...itemData,
        id: `lsp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        loanId,
      };

      const currentItems = targetLoan.spendingItems || [];
      const updatedLoan: Loan = {
        ...targetLoan,
        spendingItems: [...currentItems, newItem],
      };

      const updatedLoans = loans.map((l) => (l.id === loanId ? updatedLoan : l));
      setLoans(updatedLoans);
      await StorageService.saveLoans(updatedLoans);
    },
    [loans]
  );

  const deleteLoanSpendingItem = useCallback(
    async (loanId: string, itemId: string) => {
      const targetLoan = loans.find((l) => l.id === loanId);
      if (!targetLoan) return;

      const currentItems = targetLoan.spendingItems || [];
      const updatedLoan: Loan = {
        ...targetLoan,
        spendingItems: currentItems.filter((i) => i.id !== itemId),
      };

      const updatedLoans = loans.map((l) => (l.id === loanId ? updatedLoan : l));
      setLoans(updatedLoans);
      await StorageService.saveLoans(updatedLoans);
    },
    [loans]
  );

  const recordLoanRepayment = useCallback(
    async (
      loanId: string,
      repaymentData: Omit<LoanRepayment, 'id' | 'loanId'>
    ) => {
      const targetLoan = loans.find((l) => l.id === loanId);
      if (!targetLoan) return;

      const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newTx: Transaction = {
        id: txId,
        type: 'expense',
        amount: repaymentData.amount,
        categoryId: 'cat-repayments',
        accountId: repaymentData.paidFromAccountId,
        date: repaymentData.date || new Date().toISOString(),
        note: `Loan Repayment to ${targetLoan.lenderName}${repaymentData.note ? ' - ' + repaymentData.note : ''}`,
        imageUri: repaymentData.slipImageUri,
        tags: ['#loan-repayment', `#loan-${loanId}`],
      };

      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      await StorageService.saveTransactions(updatedTxs);

      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === repaymentData.paidFromAccountId) {
          const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
          const delta = isLiability ? repaymentData.amount : -repaymentData.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      await StorageService.saveAccounts(updatedAccounts);

      const newRepayment: LoanRepayment = {
        ...repaymentData,
        id: `lrp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        loanId,
        linkedTransactionId: txId,
      };

      const currentRepayments = targetLoan.repayments || [];
      const allRepayments = [...currentRepayments, newRepayment];
      const totalRepaid = allRepayments.reduce((sum, r) => sum + r.amount, 0);

      const updatedLoan: Loan = {
        ...targetLoan,
        repayments: allRepayments,
        status: totalRepaid >= targetLoan.totalAmount ? 'paid_off' : 'active',
      };

      const updatedLoans = loans.map((l) => (l.id === loanId ? updatedLoan : l));
      setLoans(updatedLoans);
      await StorageService.saveLoans(updatedLoans);
    },
    [loans, transactions, accounts]
  );

  const deleteLoanRepayment = useCallback(
    async (loanId: string, repaymentId: string) => {
      const targetLoan = loans.find((l) => l.id === loanId);
      if (!targetLoan) return;

      const repToDelete = (targetLoan.repayments || []).find((r) => r.id === repaymentId);
      if (!repToDelete) return;

      if (repToDelete.linkedTransactionId) {
        const updatedTxs = transactions.filter((t) => t.id !== repToDelete.linkedTransactionId);
        setTransactions(updatedTxs);
        await StorageService.saveTransactions(updatedTxs);
      }

      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === repToDelete.paidFromAccountId) {
          const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
          const delta = isLiability ? -repToDelete.amount : repToDelete.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      await StorageService.saveAccounts(updatedAccounts);

      const currentRepayments = (targetLoan.repayments || []).filter((r) => r.id !== repaymentId);
      const totalRepaid = currentRepayments.reduce((sum, r) => sum + r.amount, 0);

      const updatedLoan: Loan = {
        ...targetLoan,
        repayments: currentRepayments,
        status: totalRepaid >= targetLoan.totalAmount ? 'paid_off' : 'active',
      };

      const updatedLoans = loans.map((l) => (l.id === loanId ? updatedLoan : l));
      setLoans(updatedLoans);
      await StorageService.saveLoans(updatedLoans);
    },
    [loans, transactions, accounts]
  );

  const addIncomeStream = useCallback(
    async (data: Omit<IncomeStream, 'id'>) => {
      const newStream: IncomeStream = {
        ...data,
        id: `stream-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...incomeStreams, newStream];
      setIncomeStreams(updated);
      await StorageService.saveIncomeStreams(updated);
    },
    [incomeStreams]
  );

  const deleteIncomeStream = useCallback(
    async (id: string) => {
      const updated = incomeStreams.filter((s) => s.id !== id);
      setIncomeStreams(updated);
      await StorageService.saveIncomeStreams(updated);
    },
    [incomeStreams]
  );

  // Phase 3: Vehicles, Fuel & Maintenance
  const totalFuelCostThisMonth = useMemo(() => {
    return fuelLogs
      .filter((fl) => fl.date.startsWith(selectedMonth))
      .reduce((sum, fl) => sum + fl.totalCost, 0);
  }, [fuelLogs, selectedMonth]);

  const totalFuelLitersThisMonth = useMemo(() => {
    return fuelLogs
      .filter((fl) => fl.date.startsWith(selectedMonth))
      .reduce((sum, fl) => sum + fl.liters, 0);
  }, [fuelLogs, selectedMonth]);

  const upcomingServiceReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminders: {
      vehicle: Vehicle;
      reason: 'odometer' | 'date';
      remainingKm?: number;
      remainingDays?: number;
      isOverdue: boolean;
    }[] = [];

    vehicles.forEach((veh) => {
      // Check Odometer limit
      if (veh.nextServiceOdometer) {
        const remainingKm = veh.nextServiceOdometer - veh.currentOdometer;
        if (remainingKm <= 500) {
          reminders.push({
            vehicle: veh,
            reason: 'odometer',
            remainingKm,
            isOverdue: remainingKm < 0,
          });
        }
      }

      // Check Date limit
      if (veh.nextServiceDate) {
        const dueDate = new Date(veh.nextServiceDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 14) {
          reminders.push({
            vehicle: veh,
            reason: 'date',
            remainingDays: diffDays,
            isOverdue: diffDays < 0,
          });
        }
      }
    });

    return reminders;
  }, [vehicles]);

  const addVehicle = useCallback(
    async (data: Omit<Vehicle, 'id'>) => {
      const newVeh: Vehicle = {
        ...data,
        id: `veh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };
      const updated = [...vehicles, newVeh];
      setVehicles(updated);
      await StorageService.saveVehicles(updated);
    },
    [vehicles]
  );

  const updateVehicle = useCallback(
    async (data: Vehicle) => {
      const updated = vehicles.map((v) => (v.id === data.id ? data : v));
      setVehicles(updated);
      await StorageService.saveVehicles(updated);
    },
    [vehicles]
  );

  const deleteVehicle = useCallback(
    async (id: string) => {
      const updated = vehicles.filter((v) => v.id !== id);
      setVehicles(updated);
      await StorageService.saveVehicles(updated);
    },
    [vehicles]
  );

  const addFuelLog = useCallback(
    async (data: Omit<FuelLog, 'id'>, options?: { autoDebitAccount?: boolean }) => {
      const logId = `fuel-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const targetVeh = vehicles.find((v) => v.id === data.vehicleId);

      const previousLogs = fuelLogs
        .filter((l) => l.vehicleId === data.vehicleId && new Date(l.date).getTime() < new Date(data.date).getTime())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastLog = previousLogs[0];
      let distanceDriven: number | undefined;
      let fuelEfficiencyKmPerLiter: number | undefined;

      if (lastLog && data.odometer > lastLog.odometer) {
        distanceDriven = data.odometer - lastLog.odometer;
        if (data.isFullTank && data.liters > 0) {
          fuelEfficiencyKmPerLiter = parseFloat((distanceDriven / data.liters).toFixed(2));
        }
      }

      let txId: string | undefined;
      const autoDebit = options?.autoDebitAccount !== false;
      if (autoDebit && data.paidFromAccountId && data.totalCost > 0) {
        txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newTx: Transaction = {
          id: txId,
          type: 'expense',
          amount: data.totalCost,
          categoryId: 'cat-transport',
          accountId: data.paidFromAccountId,
          date: data.date || new Date().toISOString(),
          note: `Fuel: ${targetVeh ? targetVeh.name : 'Vehicle'} (${data.liters}L @ Rs.${data.pricePerLiter})${data.stationName ? ' - ' + data.stationName : ''}`,
          imageUri: data.slipImageUri,
          tags: ['#fuel-log', `#vehicle-${data.vehicleId}`],
        };

        const updatedTxs = [newTx, ...transactions];
        setTransactions(updatedTxs);
        await StorageService.saveTransactions(updatedTxs);

        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === data.paidFromAccountId) {
            const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
            const delta = isLiability ? data.totalCost : -data.totalCost;
            return { ...acc, balance: acc.balance + delta };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }

      const newLog: FuelLog = {
        ...data,
        id: logId,
        distanceDriven: data.distanceDriven !== undefined ? data.distanceDriven : distanceDriven,
        fuelEfficiencyKmPerLiter: data.fuelEfficiencyKmPerLiter !== undefined ? data.fuelEfficiencyKmPerLiter : fuelEfficiencyKmPerLiter,
        linkedTransactionId: txId,
      };

      const updatedLogs = [newLog, ...fuelLogs];
      setFuelLogs(updatedLogs);
      await StorageService.saveFuelLogs(updatedLogs);

      if (targetVeh && data.odometer > targetVeh.currentOdometer) {
        const updatedVehicles = vehicles.map((v) =>
          v.id === targetVeh.id ? { ...v, currentOdometer: data.odometer } : v
        );
        setVehicles(updatedVehicles);
        await StorageService.saveVehicles(updatedVehicles);
      }
    },
    [vehicles, fuelLogs, transactions, accounts]
  );

  const deleteFuelLog = useCallback(
    async (id: string) => {
      const logToDelete = fuelLogs.find((l) => l.id === id);
      if (!logToDelete) return;

      if (logToDelete.linkedTransactionId) {
        const updatedTxs = transactions.filter((t) => t.id !== logToDelete.linkedTransactionId);
        setTransactions(updatedTxs);
        await StorageService.saveTransactions(updatedTxs);

        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === logToDelete.paidFromAccountId) {
            const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
            const delta = isLiability ? -logToDelete.totalCost : logToDelete.totalCost;
            return { ...acc, balance: acc.balance + delta };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }

      const updatedLogs = fuelLogs.filter((l) => l.id !== id);
      setFuelLogs(updatedLogs);
      await StorageService.saveFuelLogs(updatedLogs);
    },
    [fuelLogs, transactions, accounts]
  );

  const addServiceRecord = useCallback(
    async (data: Omit<ServiceRecord, 'id'>, options?: { autoDebitAccount?: boolean }) => {
      const srvId = `srv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const targetVeh = vehicles.find((v) => v.id === data.vehicleId);

      let txId: string | undefined;
      const autoDebit = options?.autoDebitAccount !== false;
      if (autoDebit && data.paidFromAccountId && data.cost > 0) {
        txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newTx: Transaction = {
          id: txId,
          type: 'expense',
          amount: data.cost,
          categoryId: 'cat-transport',
          accountId: data.paidFromAccountId,
          date: data.date || new Date().toISOString(),
          note: `Vehicle Service: ${targetVeh ? targetVeh.name : 'Vehicle'} - ${data.title}${data.workshopName ? ' (' + data.workshopName + ')' : ''}`,
          imageUri: data.slipImageUri,
          tags: ['#vehicle-service', `#vehicle-${data.vehicleId}`],
        };

        const updatedTxs = [newTx, ...transactions];
        setTransactions(updatedTxs);
        await StorageService.saveTransactions(updatedTxs);

        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === data.paidFromAccountId) {
            const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
            const delta = isLiability ? data.cost : -data.cost;
            return { ...acc, balance: acc.balance + delta };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }

      const newRecord: ServiceRecord = {
        ...data,
        id: srvId,
        linkedTransactionId: txId,
      };

      const updatedRecords = [newRecord, ...serviceRecords];
      setServiceRecords(updatedRecords);
      await StorageService.saveServiceRecords(updatedRecords);

      if (targetVeh) {
        const nextKm = data.nextServiceDueOdometer || targetVeh.nextServiceOdometer;
        const nextDt = data.nextServiceDueDate || targetVeh.nextServiceDate;
        const curKm = Math.max(targetVeh.currentOdometer, data.odometer);

        const updatedVehicles = vehicles.map((v) =>
          v.id === targetVeh.id
            ? {
                ...v,
                currentOdometer: curKm,
                nextServiceOdometer: nextKm,
                nextServiceDate: nextDt,
              }
            : v
        );
        setVehicles(updatedVehicles);
        await StorageService.saveVehicles(updatedVehicles);
      }
    },
    [vehicles, serviceRecords, transactions, accounts]
  );

  const deleteServiceRecord = useCallback(
    async (id: string) => {
      const recToDelete = serviceRecords.find((r) => r.id === id);
      if (!recToDelete) return;

      if (recToDelete.linkedTransactionId) {
        const updatedTxs = transactions.filter((t) => t.id !== recToDelete.linkedTransactionId);
        setTransactions(updatedTxs);
        await StorageService.saveTransactions(updatedTxs);

        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === recToDelete.paidFromAccountId) {
            const isLiability = acc.isLiability || acc.type === 'card' || acc.type === 'loan';
            const delta = isLiability ? -recToDelete.cost : recToDelete.cost;
            return { ...acc, balance: acc.balance + delta };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }

      const updatedRecords = serviceRecords.filter((r) => r.id !== id);
      setServiceRecords(updatedRecords);
      await StorageService.saveServiceRecords(updatedRecords);
    },
    [serviceRecords, transactions, accounts]
  );

  // Monarch Wealth & Net Worth Breakdown
  const totalAssets = useMemo(() => {
    const accountAssets = accounts
      .filter((a) => !a.isLiability && a.type !== 'card' && a.type !== 'loan')
      .reduce((sum, a) => sum + Math.max(0, a.balance), 0);
    const holdingsTotal = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    return accountAssets + holdingsTotal;
  }, [accounts, holdings]);

  const totalLiabilities = useMemo(() => {
    return accounts
      .filter((a) => a.isLiability || a.type === 'card' || a.type === 'loan')
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
  }, [accounts]);

  const totalNetWorth = useMemo(() => {
    return totalAssets - totalLiabilities;
  }, [totalAssets, totalLiabilities]);

  const debtToAssetRatio = useMemo(() => {
    if (totalAssets <= 0) return totalLiabilities > 0 ? 100 : 0;
    return Math.min(100, Math.round((totalLiabilities / totalAssets) * 100));
  }, [totalAssets, totalLiabilities]);

  const totalInvestments = useMemo(() => {
    const investAccs = accounts
      .filter((a) => a.type === 'investment')
      .reduce((sum, a) => sum + a.balance, 0);
    const holdingsVal = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    return investAccs + holdingsVal;
  }, [accounts, holdings]);

  // Selected Month Transactions (respecting selectedAccountId)
  const selectedMonthTransactions = useMemo(() => {
    return transactions
      .filter((tx) => tx.date.startsWith(selectedMonth))
      .filter((tx) => selectedAccountId === 'all' || tx.accountId === selectedAccountId);
  }, [transactions, selectedMonth, selectedAccountId]);

  // Monthly Income and Expense
  const monthlyIncome = useMemo(() => {
    return selectedMonthTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [selectedMonthTransactions]);

  const monthlyExpense = useMemo(() => {
    return selectedMonthTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [selectedMonthTransactions]);

  const netSavings = useMemo(() => {
    return monthlyIncome - monthlyExpense;
  }, [monthlyIncome, monthlyExpense]);

  const savingsRate = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    const rate = (netSavings / monthlyIncome) * 100;
    return Math.max(0, Math.min(100, Math.round(rate)));
  }, [netSavings, monthlyIncome]);

  // Category breakdown for selected month
  const categorySpending = useMemo(() => {
    const expenseTxs = selectedMonthTransactions.filter((tx) => tx.type === 'expense');
    const spendMap: Record<string, number> = {};

    expenseTxs.forEach((tx) => {
      spendMap[tx.categoryId] = (spendMap[tx.categoryId] || 0) + tx.amount;
    });

    const totalExp = Object.values(spendMap).reduce((a, b) => a + b, 0);

    const result: CategorySpend[] = [];
    Object.keys(spendMap).forEach((catId) => {
      const cat = categories.find((c) => c.id === catId);
      if (cat) {
        const total = spendMap[catId];
        result.push({
          category: cat,
          total,
          percentage: totalExp > 0 ? (total / totalExp) * 100 : 0,
        });
      }
    });

    return result.sort((a, b) => b.total - a.total);
  }, [selectedMonthTransactions, categories]);

  // Category spent helper
  const getCategorySpentForMonth = useCallback(
    (categoryId: string, month: string) => {
      return transactions
        .filter(
          (tx) =>
            tx.categoryId === categoryId &&
            tx.type === 'expense' &&
            (month === 'global' || tx.date.startsWith(month)) &&
            (selectedAccountId === 'all' || tx.accountId === selectedAccountId)
        )
        .reduce((sum, tx) => sum + tx.amount, 0);
    },
    [transactions, selectedAccountId]
  );

  // Cash flow history for past 6 months
  const cashFlowHistory = useMemo(() => {
    const history: MonthlyCashFlow[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNumber = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${monthNumber}`;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = monthNames[d.getMonth()];

      const monthTxs = transactions
        .filter((t) => t.date.startsWith(monthKey))
        .filter((t) => selectedAccountId === 'all' || t.accountId === selectedAccountId);
      const inc = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      history.push({
        monthKey,
        label,
        income: inc,
        expense: exp,
      });
    }

    return history;
  }, [transactions, selectedAccountId]);

  // Upcoming bills
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();

    return recurringItems
      .filter((item) => item.active && item.type === 'expense')
      .filter((item) => selectedAccountId === 'all' || item.accountId === selectedAccountId)
      .sort((a, b) => {
        const distA = (a.dueDay - currentDay + 31) % 31;
        const distB = (b.dueDay - currentDay + 31) % 31;
        return distA - distB;
      });
  }, [recurringItems, selectedAccountId]);

  // Monarch Cash Flow Forecasting (30 days predictive timeline)
  const cashFlowForecast = useMemo(() => {
    const forecast: DayForecast[] = [];
    const today = new Date();
    let rollingBalance = selectedAccountId === 'all' ? totalAssets : (selectedAccount?.balance ?? 0);

    for (let i = 1; i <= 30; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + i);
      const dayOfMonth = targetDate.getDate();
      const dateStr = targetDate.toISOString().split('T')[0];

      let incoming = 0;
      let outgoing = 0;
      const events: string[] = [];

      // Check recurring items due on this day of month
      recurringItems
        .filter((r) => selectedAccountId === 'all' || r.accountId === selectedAccountId)
        .forEach((r) => {
          if (r.active && r.dueDay === dayOfMonth) {
            if (r.type === 'income') {
              incoming += r.amount;
              events.push(`Income: ${r.title}`);
            } else {
              outgoing += r.amount;
              events.push(`Bill: ${r.title}`);
            }
          }
        });

      rollingBalance = rollingBalance + incoming - outgoing;

      forecast.push({
        date: dateStr,
        dayNum: i,
        projectedBalance: rollingBalance,
        incoming,
        outgoing,
        events,
      });
    }

    return forecast;
  }, [selectedAccountId, selectedAccount, totalAssets, recurringItems]);

  const value = useMemo(
    () => ({
      loading,
      transactions,
      categories,
      accounts,
      budgets,
      recurringItems,
      goals,
      holdings,
      rules,
      settings,
      selectedMonth,
      setSelectedMonth,
      selectedAccountId,
      setSelectedAccountId,
      selectedAccount,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addBudgetItem,
      updateBudgetItem,
      deleteBudgetItem,
      closeBudgetItem,
      addRecurringItem,
      updateRecurringItem,
      deleteRecurringItem,
      payRecurringItem,
      addAccount,
      updateAccount,
      deleteAccount,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      addHolding,
      updateHolding,
      deleteHolding,
      addRule,
      deleteRule,
      addCategory,
      updateSettings,
      resetDemoData,
      clearAllData,
      formatAmount,
      totalAssets,
      totalLiabilities,
      totalNetWorth,
      debtToAssetRatio,
      totalInvestments,
      monthlyIncome,
      monthlyExpense,
      netSavings,
      savingsRate,
      categorySpending,
      cashFlowHistory,
      cashFlowForecast,
      upcomingBills,
      getCategoryById,
      getAccountById,
      getCategorySpentForMonth,
      lastBackupInfo,
      googleUser,
      cloudSyncSettings,
      cloudSyncLogs,
      driveBackups,
      isSyncingDrive,
      connectGoogleDrive,
      connectWithAccessToken,
      disconnectGoogleDrive,
      updateCloudSyncSettings,
      backupToGoogleDrive,
      refreshDriveBackups,
      restoreBackupFromDriveFile,
      deleteDriveBackupFile,
      pickBackupFromDrive,
      restoreFromBackupPayload,
      refreshAllData,
      appUser,
      syncStatus,
      migrationReport,
      signInWithGoogle,
      signInWithAccessToken,
      signInWithDemoAccount,
      signOutUser,
      migrateLocalData,
      syncNow,
      checkForRemoteUserCloudData,
      saveFirebaseProjectConfig,
      getFirebaseProjectConfig,
      loans,
      incomeStreams,
      totalBorrowedDebt,
      totalRepaidDebt,
      upcomingLoanReminders,
      addLoan,
      updateLoan,
      deleteLoan,
      addLoanSpendingItem,
      deleteLoanSpendingItem,
      recordLoanRepayment,
      deleteLoanRepayment,
      addIncomeStream,
      deleteIncomeStream,
      vehicles,
      fuelLogs,
      serviceRecords,
      totalFuelCostThisMonth,
      totalFuelLitersThisMonth,
      upcomingServiceReminders,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addFuelLog,
      deleteFuelLog,
      addServiceRecord,
      deleteServiceRecord,
    }),
    [
      loading,
      transactions,
      categories,
      accounts,
      budgets,
      recurringItems,
      goals,
      holdings,
      rules,
      settings,
      selectedMonth,
      selectedAccountId,
      selectedAccount,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addBudgetItem,
      updateBudgetItem,
      deleteBudgetItem,
      closeBudgetItem,
      addRecurringItem,
      updateRecurringItem,
      deleteRecurringItem,
      payRecurringItem,
      addAccount,
      updateAccount,
      deleteAccount,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      addHolding,
      updateHolding,
      deleteHolding,
      addRule,
      deleteRule,
      addCategory,
      updateSettings,
      resetDemoData,
      clearAllData,
      formatAmount,
      totalAssets,
      totalLiabilities,
      totalNetWorth,
      debtToAssetRatio,
      totalInvestments,
      monthlyIncome,
      monthlyExpense,
      netSavings,
      savingsRate,
      categorySpending,
      cashFlowHistory,
      cashFlowForecast,
      upcomingBills,
      getCategoryById,
      getAccountById,
      getCategorySpentForMonth,
      lastBackupInfo,
      googleUser,
      cloudSyncSettings,
      cloudSyncLogs,
      driveBackups,
      isSyncingDrive,
      connectGoogleDrive,
      connectWithAccessToken,
      disconnectGoogleDrive,
      updateCloudSyncSettings,
      backupToGoogleDrive,
      refreshDriveBackups,
      restoreBackupFromDriveFile,
      deleteDriveBackupFile,
      pickBackupFromDrive,
      restoreFromBackupPayload,
      refreshAllData,
      appUser,
      syncStatus,
      migrationReport,
      signInWithGoogle,
      signInWithAccessToken,
      signInWithDemoAccount,
      signOutUser,
      migrateLocalData,
      syncNow,
      checkForRemoteUserCloudData,
      saveFirebaseProjectConfig,
      getFirebaseProjectConfig,
      loans,
      incomeStreams,
      totalBorrowedDebt,
      totalRepaidDebt,
      upcomingLoanReminders,
      addLoan,
      updateLoan,
      deleteLoan,
      addLoanSpendingItem,
      deleteLoanSpendingItem,
      recordLoanRepayment,
      deleteLoanRepayment,
      addIncomeStream,
      deleteIncomeStream,
      vehicles,
      fuelLogs,
      serviceRecords,
      totalFuelCostThisMonth,
      totalFuelLitersThisMonth,
      upcomingServiceReminders,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addFuelLog,
      deleteFuelLog,
      addServiceRecord,
      deleteServiceRecord,
    ]
  );

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = (): FinancialContextValue => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
