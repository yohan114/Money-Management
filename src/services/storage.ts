import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category, Account, Budget, RecurringItem, UserSettings } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../constants/theme';

const STORAGE_KEYS = {
  TRANSACTIONS: '@money_management_transactions_v2',
  CATEGORIES: '@money_management_categories_v2',
  ACCOUNTS: '@money_management_accounts_v2',
  BUDGETS: '@money_management_budgets_v2',
  RECURRING: '@money_management_recurring_v2',
  SETTINGS: '@money_management_settings_v2',
  INITIALIZED: '@money_management_initialized_v2',
};

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'LKR',
  currencySymbol: 'Rs.',
  darkMode: true,
  biometricLock: false,
};

// Helper to generate ISO dates relative to today
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

export const SAMPLE_RECURRING: RecurringItem[] = [
  {
    id: 'rec-rent',
    title: 'Apartment Rent',
    amount: 65000,
    type: 'expense',
    categoryId: 'cat-housing',
    accountId: 'acc-main-bank',
    frequency: 'monthly',
    dueDay: 1,
    active: true,
    lastPaidDate: getRelativeDateISO(24),
  },
  {
    id: 'rec-salary',
    title: 'Monthly Tech Salary',
    amount: 280000,
    type: 'income',
    categoryId: 'cat-salary',
    accountId: 'acc-main-bank',
    frequency: 'monthly',
    dueDay: 28,
    active: true,
    lastPaidDate: getRelativeDateISO(26),
  },
  {
    id: 'rec-netflix',
    title: 'Netflix & Spotify Subs',
    amount: 4200,
    type: 'expense',
    categoryId: 'cat-entertainment',
    accountId: 'acc-credit-card',
    frequency: 'monthly',
    dueDay: 14,
    active: true,
  },
  {
    id: 'rec-gym',
    title: 'Gym & Fitness Center',
    amount: 7500,
    type: 'expense',
    categoryId: 'cat-health',
    accountId: 'acc-credit-card',
    frequency: 'monthly',
    dueDay: 8,
    active: true,
  },
  {
    id: 'rec-wifi',
    title: 'Fiber Internet & Power Bill',
    amount: 14800,
    type: 'expense',
    categoryId: 'cat-utilities',
    accountId: 'acc-main-bank',
    frequency: 'monthly',
    dueDay: 20,
    active: true,
  },
];

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-01',
    type: 'income',
    amount: 280000,
    categoryId: 'cat-salary',
    accountId: 'acc-main-bank',
    date: getRelativeDateISO(1, 9),
    note: 'Monthly salary deposit',
  },
  {
    id: 'tx-02',
    type: 'expense',
    amount: 14500,
    categoryId: 'cat-groceries',
    accountId: 'acc-main-bank',
    date: getRelativeDateISO(0, 14),
    note: 'Supermarket weekly fresh groceries & provisions',
  },
  {
    id: 'tx-03',
    type: 'expense',
    amount: 6800,
    categoryId: 'cat-food',
    accountId: 'acc-credit-card',
    date: getRelativeDateISO(1, 19),
    note: 'Family dinner at restaurant',
  },
  {
    id: 'tx-04',
    type: 'expense',
    amount: 8500,
    categoryId: 'cat-transport',
    accountId: 'acc-credit-card',
    date: getRelativeDateISO(2, 8),
    note: 'Fuel station petrol fill',
  },
  {
    id: 'tx-05',
    type: 'income',
    amount: 65000,
    categoryId: 'cat-freelance',
    accountId: 'acc-main-bank',
    date: getRelativeDateISO(3, 16),
    note: 'Client mobile app UI milestone payout',
  },
  {
    id: 'tx-06',
    type: 'expense',
    amount: 2200,
    categoryId: 'cat-food',
    accountId: 'acc-cash',
    date: getRelativeDateISO(3, 12),
    note: 'Coffee & bakery snack',
  },
  {
    id: 'tx-07',
    type: 'expense',
    amount: 18500,
    categoryId: 'cat-shopping',
    accountId: 'acc-credit-card',
    date: getRelativeDateISO(4, 15),
    note: 'Casual clothes & footwear purchase',
  },
  {
    id: 'tx-08',
    type: 'expense',
    amount: 12400,
    categoryId: 'cat-utilities',
    accountId: 'acc-main-bank',
    date: getRelativeDateISO(6, 11),
    note: 'Electricity bill payment',
  },
  {
    id: 'tx-09',
    type: 'expense',
    amount: 4200,
    categoryId: 'cat-entertainment',
    accountId: 'acc-credit-card',
    date: getRelativeDateISO(7, 10),
    note: 'Online media subscriptions',
  },
  {
    id: 'tx-10',
    type: 'expense',
    amount: 65000,
    categoryId: 'cat-housing',
    accountId: 'acc-main-bank',
    date: getRelativeDateISO(10, 10),
    note: 'Monthly house rent bank transfer',
  },
  {
    id: 'tx-11',
    type: 'expense',
    amount: 16200,
    categoryId: 'cat-groceries',
    accountId: 'acc-main-bank',
    date: getRelativeDateISO(12, 17),
    note: 'Pantry items & household supplies',
  },
  {
    id: 'tx-12',
    type: 'income',
    amount: 25000,
    categoryId: 'cat-investments',
    accountId: 'acc-savings',
    date: getRelativeDateISO(15, 14),
    note: 'Monthly investment interest yield',
  },
];

export const StorageService = {
  async initDemoDataIfFirstTime(): Promise<boolean> {
    try {
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.TRANSACTIONS, JSON.stringify(SAMPLE_TRANSACTIONS)],
          [STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES)],
          [STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS)],
          [STORAGE_KEYS.BUDGETS, JSON.stringify(SAMPLE_BUDGETS)],
          [STORAGE_KEYS.RECURRING, JSON.stringify(SAMPLE_RECURRING)],
          [STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS)],
          [STORAGE_KEYS.INITIALIZED, 'true'],
        ]);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to init demo data:', e);
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
      return data ? JSON.parse(data) : SAMPLE_BUDGETS;
    } catch {
      return SAMPLE_BUDGETS;
    }
  },

  async saveBudgets(budgets: Budget[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  },

  async getRecurring(): Promise<RecurringItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECURRING);
      return data ? JSON.parse(data) : SAMPLE_RECURRING;
    } catch {
      return SAMPLE_RECURRING;
    }
  },

  async saveRecurring(items: RecurringItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(items));
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

  async resetToDemo(): Promise<void> {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TRANSACTIONS, JSON.stringify(SAMPLE_TRANSACTIONS)],
      [STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES)],
      [STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS)],
      [STORAGE_KEYS.BUDGETS, JSON.stringify(SAMPLE_BUDGETS)],
      [STORAGE_KEYS.RECURRING, JSON.stringify(SAMPLE_RECURRING)],
      [STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS)],
      [STORAGE_KEYS.INITIALIZED, 'true'],
    ]);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TRANSACTIONS,
      STORAGE_KEYS.BUDGETS,
      STORAGE_KEYS.RECURRING,
    ]);
  },
};
