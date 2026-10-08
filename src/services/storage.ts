import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Transaction,
  Category,
  Account,
  Budget,
  RecurringItem,
  UserSettings,
  FinancialGoal,
  InvestmentHolding,
  TransactionRule,
  CloudBackupMetadata,
  CloudBackupPayload,
  Loan,
  IncomeStream,
} from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../constants/theme';

export const DEFAULT_INCOME_STREAMS: IncomeStream[] = [
  {
    id: 'stream-salary',
    name: 'Primary Salary',
    category: 'salary',
    expectedMonthlyAmount: 100000,
    defaultAccountId: 'acc-salary',
    icon: 'briefcase',
    color: '#3B82F6',
  },
  {
    id: 'stream-friend-loan',
    name: 'Friend & Personal Loans',
    category: 'friend_loan',
    icon: 'people',
    color: '#EC4899',
  },
  {
    id: 'stream-part-time',
    name: 'Part-Time & Freelance Job',
    category: 'part_time',
    icon: 'laptop',
    color: '#10B981',
  },
  {
    id: 'stream-biz',
    name: 'Coconut / Business Supply',
    category: 'business',
    defaultAccountId: 'acc-company',
    icon: 'leaf',
    color: '#F59E0B',
  },
  {
    id: 'stream-other',
    name: 'Other Inflows',
    category: 'other',
    icon: 'cash',
    color: '#8B5CF6',
  },
];

export const STORAGE_KEYS = {
  TRANSACTIONS: '@money_management_transactions_v4',
  CATEGORIES: '@money_management_categories_v4',
  ACCOUNTS: '@money_management_accounts_v4',
  BUDGETS: '@money_management_budgets_v4',
  RECURRING: '@money_management_recurring_v4',
  GOALS: '@money_management_goals_v4',
  HOLDINGS: '@money_management_holdings_v4',
  RULES: '@money_management_rules_v4',
  SETTINGS: '@money_management_settings_v4',
  INITIALIZED: '@money_management_initialized_v4',
  LAST_BACKUP: '@money_management_last_backup_v4',
  LOANS: '@money_management_loans_v4',
  INCOME_STREAMS: '@money_management_income_streams_v4',
  VEHICLES: '@money_management_vehicles_v4',
  FUEL_LOGS: '@money_management_fuel_logs_v4',
  SERVICE_RECORDS: '@money_management_service_records_v4',
};

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'LKR',
  currencySymbol: 'Rs.',
  darkMode: true,
  biometricLock: false,
};

// Helper to generate ISO dates relative to today (used only for optional demo data)
const getRelativeDateISO = (daysAgo: number, hour: number = 12): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
};

export const SAMPLE_BUDGETS: Budget[] = [
  {
    id: 'b-groceries',
    categoryId: 'cat-groceries',
    accountId: 'acc-chamery',
    monthlyLimit: 45000,
    month: 'global',
    items: [
      {
        id: 'bi-01',
        budgetId: 'b-groceries',
        name: 'Keeri Samba Rice 10kg',
        estimatedCost: 2600,
        targetWeek: 1,
        status: 'closed',
        actualCost: 2650,
        closedAt: getRelativeDateISO(20),
        notes: 'Bought from wholesale shop',
      },
      {
        id: 'bi-02',
        budgetId: 'b-groceries',
        name: 'Mysore Dhal 5kg',
        estimatedCost: 1750,
        targetWeek: 1,
        status: 'closed',
        actualCost: 1700,
        closedAt: getRelativeDateISO(19),
      },
      {
        id: 'bi-03',
        budgetId: 'b-groceries',
        name: 'White Sugar 3kg',
        estimatedCost: 900,
        targetWeek: 2,
        status: 'closed',
        actualCost: 920,
        closedAt: getRelativeDateISO(12),
      },
      {
        id: 'bi-04',
        budgetId: 'b-groceries',
        name: 'Anchor Milk Powder 400g x 2',
        estimatedCost: 2200,
        targetWeek: 2,
        status: 'planned',
      },
      {
        id: 'bi-05',
        budgetId: 'b-groceries',
        name: 'Coconut Oil 1.5L',
        estimatedCost: 1450,
        targetWeek: 3,
        status: 'planned',
      },
      {
        id: 'bi-06',
        budgetId: 'b-groceries',
        name: 'Spices, Chili & Curry Powder',
        estimatedCost: 1800,
        targetWeek: 3,
        status: 'planned',
      },
      {
        id: 'bi-07',
        budgetId: 'b-groceries',
        name: 'Washing Powder & House Soaps',
        estimatedCost: 2500,
        targetWeek: 4,
        status: 'planned',
      },
    ],
    weeklyLimits: {
      week1: 12000,
      week2: 11000,
      week3: 11000,
      week4: 11000,
    },
  },
  { id: 'b-food', categoryId: 'cat-food', accountId: 'acc-chamery', monthlyLimit: 35000, month: 'global', items: [] },
  { id: 'b-transport', categoryId: 'cat-transport', accountId: 'acc-salary', monthlyLimit: 25000, month: 'global', items: [] },
  { id: 'b-shopping', categoryId: 'cat-shopping', monthlyLimit: 30000, month: 'global', items: [] },
  { id: 'b-entertainment', categoryId: 'cat-entertainment', monthlyLimit: 15000, month: 'global', items: [] },
  { id: 'b-utilities', categoryId: 'cat-utilities', accountId: 'acc-chamery', monthlyLimit: 20000, month: 'global', items: [] },
];

export const SAMPLE_GOALS: FinancialGoal[] = [
  {
    id: 'g-emergency',
    title: 'Emergency Safety Net (6 Months)',
    targetAmount: 1000000,
    currentAmount: 650000,
    targetDate: '2027-06-30',
    icon: 'shield-checkmark',
    color: '#10B981',
  },
  {
    id: 'g-vacation',
    title: 'Family Holiday in Europe',
    targetAmount: 500000,
    currentAmount: 220000,
    targetDate: '2026-12-20',
    icon: 'airplane',
    color: '#3B82F6',
  },
  {
    id: 'g-house',
    title: 'Home Down Payment',
    targetAmount: 3500000,
    currentAmount: 1200000,
    targetDate: '2028-01-01',
    icon: 'home',
    color: '#8B5CF6',
  },
];

export const SAMPLE_HOLDINGS: InvestmentHolding[] = [
  {
    id: 'h-sp500',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetClass: 'etf',
    quantity: 4,
    currentValue: 620000,
    accountId: 'acc-savings',
  },
  {
    id: 'h-btc',
    symbol: 'BTC',
    name: 'Bitcoin Digital Gold',
    assetClass: 'crypto',
    quantity: 0.03,
    currentValue: 285000,
    accountId: 'acc-savings',
  },
];

export const SAMPLE_RECURRING: RecurringItem[] = [
  {
    id: 'rec-salary',
    title: 'Monthly Salary Credit',
    amount: 100000,
    type: 'income',
    categoryId: 'cat-salary',
    accountId: 'acc-salary',
    frequency: 'monthly',
    dueDay: 28,
    active: true,
    lastPaidDate: getRelativeDateISO(26),
  },
  {
    id: 'rec-seettu',
    title: 'Monthly Seettu Savings',
    amount: 35000,
    type: 'expense',
    categoryId: 'cat-seettu',
    accountId: 'acc-salary',
    frequency: 'monthly',
    dueDay: 28,
    active: true,
  },
  {
    id: 'rec-rent',
    title: 'House Electricity & Gas',
    amount: 8500,
    type: 'expense',
    categoryId: 'cat-utilities',
    accountId: 'acc-chamery',
    frequency: 'monthly',
    dueDay: 10,
    active: true,
  },
  {
    id: 'rec-phone',
    title: 'House Telephone & Internet',
    amount: 2500,
    type: 'expense',
    categoryId: 'cat-phone',
    accountId: 'acc-chamery',
    frequency: 'monthly',
    dueDay: 15,
    active: true,
  },
];

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-01',
    type: 'income',
    amount: 100000,
    categoryId: 'cat-salary',
    accountId: 'acc-salary',
    date: getRelativeDateISO(1, 9),
    note: 'Jan26 salary credited',
  },
  {
    id: 'tx-02',
    type: 'income',
    amount: 138500,
    categoryId: 'cat-coco-inc',
    accountId: 'acc-company',
    date: getRelativeDateISO(2, 10),
    note: 'Coconut Business coco cash in hand',
  },
  {
    id: 'tx-03',
    type: 'income',
    amount: 48000,
    categoryId: 'cat-loans-inc',
    accountId: 'acc-chamery',
    date: getRelativeDateISO(2, 12),
    note: 'Household cash brought from House loan',
  },
  {
    id: 'tx-04',
    type: 'expense',
    amount: 82500,
    categoryId: 'cat-coco-biz',
    accountId: 'acc-company',
    date: getRelativeDateISO(2, 14),
    note: 'Company coco business Francis coco supply',
  },
  {
    id: 'tx-05',
    type: 'expense',
    amount: 12500,
    categoryId: 'cat-groceries',
    accountId: 'acc-chamery',
    date: getRelativeDateISO(3, 11),
    note: 'Channery pantry grocery shopping',
  },
  {
    id: 'tx-06',
    type: 'expense',
    amount: 4800,
    categoryId: 'cat-meat',
    accountId: 'acc-chamery',
    date: getRelativeDateISO(3, 15),
    note: 'Channery meat shop chicken & fish',
  },
  {
    id: 'tx-07',
    type: 'expense',
    amount: 3500,
    categoryId: 'cat-fuel',
    accountId: 'acc-salary',
    date: getRelativeDateISO(4, 8),
    note: 'Vehicle fuel petrol fill',
  },
  {
    id: 'tx-08',
    type: 'expense',
    amount: 10000,
    categoryId: 'cat-cash-giving',
    accountId: 'acc-salary',
    date: getRelativeDateISO(4, 16),
    note: 'Cash giving wife',
  },
  {
    id: 'tx-09',
    type: 'expense',
    amount: 35000,
    categoryId: 'cat-seettu',
    accountId: 'acc-salary',
    date: getRelativeDateISO(5, 17),
    note: 'Monthly Seettu contribution',
  },
  {
    id: 'tx-10',
    type: 'expense',
    amount: 6000,
    categoryId: 'cat-company-food',
    accountId: 'acc-company',
    date: getRelativeDateISO(6, 13),
    note: 'Company staff lunch & food expenses',
  },
];

export const DEMO_ACCOUNTS: Account[] = [
  { id: 'acc-salary', name: 'My Salary Account', type: 'bank', balance: 93000, icon: 'wallet', color: '#3B82F6' },
  { id: 'acc-chamery', name: 'Channery Expenses', type: 'cash', balance: 48000, icon: 'home', color: '#10B981' },
  { id: 'acc-company', name: 'Company Money', type: 'bank', balance: 138500, icon: 'business', color: '#F59E0B' },
  { id: 'acc-credit-card', name: 'Credit Cards & Loans', type: 'card', balance: 48000, icon: 'card', color: '#EC4899', isLiability: true },
];

export const SAMPLE_LOANS: Loan[] = [
  {
    id: 'loan-01',
    lenderName: 'Kasun (Friend Loan)',
    type: 'friend',
    totalAmount: 50000,
    receivedDate: getRelativeDateISO(25),
    dueDate: '2026-11-15',
    depositAccountId: 'acc-salary',
    purpose: 'Urgent household medical and repair bill',
    status: 'active',
    spendingItems: [
      {
        id: 'lsp-01',
        loanId: 'loan-01',
        title: 'Emergency Medical Treatment',
        amount: 32000,
        date: getRelativeDateISO(24),
      },
      {
        id: 'lsp-02',
        loanId: 'loan-01',
        title: 'House Roof Water Leak Repair',
        amount: 18000,
        date: getRelativeDateISO(22),
      },
    ],
    repayments: [
      {
        id: 'lrp-01',
        loanId: 'loan-01',
        amount: 15000,
        date: getRelativeDateISO(5),
        paidFromAccountId: 'acc-salary',
        note: 'First installment paid back via online transfer',
      },
    ],
  },
  {
    id: 'loan-02',
    lenderName: 'Commercial Bank Personal Loan',
    type: 'bank',
    totalAmount: 200000,
    receivedDate: getRelativeDateISO(60),
    dueDate: '2027-01-30',
    depositAccountId: 'acc-salary',
    purpose: 'House construction advance',
    status: 'active',
    spendingItems: [
      {
        id: 'lsp-03',
        loanId: 'loan-02',
        title: 'Cement & Building Materials',
        amount: 140000,
        date: getRelativeDateISO(58),
      },
      {
        id: 'lsp-04',
        loanId: 'loan-02',
        title: 'Labor Advance Payment',
        amount: 60000,
        date: getRelativeDateISO(50),
      },
    ],
    repayments: [
      {
        id: 'lrp-02',
        loanId: 'loan-02',
        amount: 40000,
        date: getRelativeDateISO(30),
        paidFromAccountId: 'acc-salary',
        note: 'Month 1 installment',
      },
      {
        id: 'lrp-03',
        loanId: 'loan-02',
        amount: 40000,
        date: getRelativeDateISO(2),
        paidFromAccountId: 'acc-salary',
        note: 'Month 2 installment',
      },
    ],
  },
];

export const StorageService = {
  // Brand new installs start 100% clean and fresh with NO dummy data!
  async initFreshDataIfFirstTime(): Promise<boolean> {
    try {
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.TRANSACTIONS, JSON.stringify([])], // Clean empty transaction list!
          [STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES)],
          [STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS)], // Initial 0 balances!
          [STORAGE_KEYS.BUDGETS, JSON.stringify([])], // Clean empty budgets!
          [STORAGE_KEYS.RECURRING, JSON.stringify([])], // Clean empty recurring bills!
          [STORAGE_KEYS.GOALS, JSON.stringify([])], // Clean empty goals!
          [STORAGE_KEYS.HOLDINGS, JSON.stringify([])], // Clean empty investment holdings!
          [STORAGE_KEYS.RULES, JSON.stringify([])], // Clean empty rules!
          [STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS)],
          [STORAGE_KEYS.LOANS, JSON.stringify([])], // Clean empty loans!
          [STORAGE_KEYS.INCOME_STREAMS, JSON.stringify(DEFAULT_INCOME_STREAMS)],
          [STORAGE_KEYS.INITIALIZED, 'true'],
        ]);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to init fresh data:', e);
      return false;
    }
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveTransactions(txs: Transaction[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  },

  async getCategories(): Promise<Category[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  async saveCategories(cats: Category[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
  },

  async getAccounts(): Promise<Account[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return data ? JSON.parse(data) : DEFAULT_ACCOUNTS;
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  },

  async saveAccounts(accs: Account[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs));
  },

  async getBudgets(): Promise<Budget[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (!data) return [];
      const parsed: Budget[] = JSON.parse(data);
      return parsed.map((b) => ({
        ...b,
        items: Array.isArray(b.items) ? b.items : [],
      }));
    } catch {
      return [];
    }
  },

  async saveBudgets(budgets: Budget[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  },

  async getRecurring(): Promise<RecurringItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECURRING);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveRecurring(items: RecurringItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(items));
  },

  async getGoals(): Promise<FinancialGoal[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveGoals(goals: FinancialGoal[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  },

  async getHoldings(): Promise<InvestmentHolding[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HOLDINGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveHoldings(holdings: InvestmentHolding[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings));
  },

  async getRules(): Promise<TransactionRule[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RULES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveRules(rules: TransactionRule[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
  },

  async getSettings(): Promise<UserSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Loans & Income Streams
  async getLoans(): Promise<Loan[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LOANS);
      if (!data) return [];
      const parsed: Loan[] = JSON.parse(data);
      return parsed.map((l) => ({
        ...l,
        spendingItems: Array.isArray(l.spendingItems) ? l.spendingItems : [],
        repayments: Array.isArray(l.repayments) ? l.repayments : [],
      }));
    } catch {
      return [];
    }
  },

  async saveLoans(loans: Loan[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  },

  async getIncomeStreams(): Promise<IncomeStream[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.INCOME_STREAMS);
      return data ? JSON.parse(data) : DEFAULT_INCOME_STREAMS;
    } catch {
      return DEFAULT_INCOME_STREAMS;
    }
  },

  async saveIncomeStreams(streams: IncomeStream[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.INCOME_STREAMS, JSON.stringify(streams));
  },

  // Optional manual demo populator (from Settings screen)
  async resetToDemo(): Promise<void> {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TRANSACTIONS, JSON.stringify(SAMPLE_TRANSACTIONS)],
      [STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES)],
      [STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEMO_ACCOUNTS)],
      [STORAGE_KEYS.BUDGETS, JSON.stringify(SAMPLE_BUDGETS)],
      [STORAGE_KEYS.RECURRING, JSON.stringify(SAMPLE_RECURRING)],
      [STORAGE_KEYS.GOALS, JSON.stringify(SAMPLE_GOALS)],
      [STORAGE_KEYS.HOLDINGS, JSON.stringify(SAMPLE_HOLDINGS)],
      [STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS)],
      [STORAGE_KEYS.LOANS, JSON.stringify(SAMPLE_LOANS)],
      [STORAGE_KEYS.INCOME_STREAMS, JSON.stringify(DEFAULT_INCOME_STREAMS)],
      [STORAGE_KEYS.INITIALIZED, 'true'],
    ]);
  },

  // Cloud Backup & Restore Methods
  async getLastBackupMetadata(): Promise<CloudBackupMetadata | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async saveLastBackupMetadata(meta: CloudBackupMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_BACKUP, JSON.stringify(meta));
    } catch (e) {
      console.error('Failed to save last backup metadata:', e);
    }
  },

  async getFullDatabaseSnapshot(): Promise<CloudBackupPayload> {
    const [txs, cats, accs, bdgs, recs, gls, hlds, rls, sets, loans, streams] = await Promise.all([
      this.getTransactions(),
      this.getCategories(),
      this.getAccounts(),
      this.getBudgets(),
      this.getRecurring(),
      this.getGoals(),
      this.getHoldings(),
      this.getRules(),
      this.getSettings(),
      this.getLoans(),
      this.getIncomeStreams(),
    ]);

    // Optional future vehicle models
    let vehicles: any[] = [];
    let fuelLogs: any[] = [];
    let serviceRecords: any[] = [];
    try {
      const [vData, fData, sData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.VEHICLES),
        AsyncStorage.getItem(STORAGE_KEYS.FUEL_LOGS),
        AsyncStorage.getItem(STORAGE_KEYS.SERVICE_RECORDS),
      ]);
      if (vData) vehicles = JSON.parse(vData);
      if (fData) fuelLogs = JSON.parse(fData);
      if (sData) serviceRecords = JSON.parse(sData);
    } catch {
      // ignore
    }

    const budgetItemsCount = bdgs.reduce(
      (sum, b) => sum + (Array.isArray(b.items) ? b.items.length : 0),
      0
    );

    return {
      schemaVersion: 1,
      appName: 'MoneyManagementApp',
      appVersion: '1.6.0',
      exportedAt: new Date().toISOString(),
      stats: {
        accountsCount: accs.length,
        transactionsCount: txs.length,
        budgetsCount: bdgs.length,
        budgetItemsCount,
        recurringCount: recs.length,
        goalsCount: gls.length,
        holdingsCount: hlds.length,
        rulesCount: rls.length,
        categoriesCount: cats.length,
        loansCount: loans.length,
      },
      data: {
        transactions: txs,
        categories: cats,
        accounts: accs,
        budgets: bdgs,
        recurringItems: recs,
        goals: gls,
        holdings: hlds,
        rules: rls,
        settings: sets,
        loans,
        incomeStreams: streams,
        vehicles,
        fuelLogs,
        serviceRecords,
      },
    };
  },

  async restoreFullDatabaseSnapshot(snapshot: CloudBackupPayload): Promise<void> {
    const data = snapshot.data || (snapshot as any); // Supports both structured payload and flat legacy dumps

    const txs = Array.isArray(data.transactions) ? data.transactions : [];
    const cats = Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES;
    const accs = Array.isArray(data.accounts) && data.accounts.length > 0 ? data.accounts : DEFAULT_ACCOUNTS;
    const bdgs = Array.isArray(data.budgets) ? data.budgets : [];
    const recs = Array.isArray(data.recurringItems) ? data.recurringItems : (Array.isArray((data as any).recurring) ? (data as any).recurring : []);
    const gls = Array.isArray(data.goals) ? data.goals : [];
    const hlds = Array.isArray(data.holdings) ? data.holdings : [];
    const rls = Array.isArray(data.rules) ? data.rules : [];
    const sets = data.settings && typeof data.settings === 'object' ? { ...DEFAULT_SETTINGS, ...data.settings } : DEFAULT_SETTINGS;
    const loans = Array.isArray(data.loans) ? data.loans : [];
    const streams = Array.isArray(data.incomeStreams) && data.incomeStreams.length > 0 ? data.incomeStreams : DEFAULT_INCOME_STREAMS;
    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    const fuelLogs = Array.isArray(data.fuelLogs) ? data.fuelLogs : [];
    const serviceRecords = Array.isArray(data.serviceRecords) ? data.serviceRecords : [];

    const pairs: [string, string][] = [
      [STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs)],
      [STORAGE_KEYS.CATEGORIES, JSON.stringify(cats)],
      [STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs)],
      [STORAGE_KEYS.BUDGETS, JSON.stringify(bdgs)],
      [STORAGE_KEYS.RECURRING, JSON.stringify(recs)],
      [STORAGE_KEYS.GOALS, JSON.stringify(gls)],
      [STORAGE_KEYS.HOLDINGS, JSON.stringify(hlds)],
      [STORAGE_KEYS.RULES, JSON.stringify(rls)],
      [STORAGE_KEYS.SETTINGS, JSON.stringify(sets)],
      [STORAGE_KEYS.LOANS, JSON.stringify(loans)],
      [STORAGE_KEYS.INCOME_STREAMS, JSON.stringify(streams)],
      [STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles)],
      [STORAGE_KEYS.FUEL_LOGS, JSON.stringify(fuelLogs)],
      [STORAGE_KEYS.SERVICE_RECORDS, JSON.stringify(serviceRecords)],
      [STORAGE_KEYS.INITIALIZED, 'true'],
    ];

    await AsyncStorage.multiSet(pairs);
  },

  // Clear all data back to clean fresh user state
  async clearAll(): Promise<void> {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TRANSACTIONS, JSON.stringify([])],
      [STORAGE_KEYS.BUDGETS, JSON.stringify([])],
      [STORAGE_KEYS.RECURRING, JSON.stringify([])],
      [STORAGE_KEYS.GOALS, JSON.stringify([])],
      [STORAGE_KEYS.HOLDINGS, JSON.stringify([])],
      [STORAGE_KEYS.RULES, JSON.stringify([])],
      [STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS)],
      [STORAGE_KEYS.LOANS, JSON.stringify([])],
      [STORAGE_KEYS.INCOME_STREAMS, JSON.stringify(DEFAULT_INCOME_STREAMS)],
      [STORAGE_KEYS.VEHICLES, JSON.stringify([])],
      [STORAGE_KEYS.FUEL_LOGS, JSON.stringify([])],
      [STORAGE_KEYS.SERVICE_RECORDS, JSON.stringify([])],
    ]);
  },
};
