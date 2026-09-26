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
} from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../constants/theme';

const STORAGE_KEYS = {
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
  { id: 'b-food', categoryId: 'cat-food', monthlyLimit: 35000, month: 'global' },
  { id: 'b-groceries', categoryId: 'cat-groceries', monthlyLimit: 45000, month: 'global' },
  { id: 'b-transport', categoryId: 'cat-transport', monthlyLimit: 25000, month: 'global' },
  { id: 'b-shopping', categoryId: 'cat-shopping', monthlyLimit: 30000, month: 'global' },
  { id: 'b-entertainment', categoryId: 'cat-entertainment', monthlyLimit: 15000, month: 'global' },
  { id: 'b-utilities', categoryId: 'cat-utilities', monthlyLimit: 20000, month: 'global' },
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
      return data ? JSON.parse(data) : [];
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
      [STORAGE_KEYS.INITIALIZED, 'true'],
    ]);
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
    ]);
  },
};
