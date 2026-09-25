export type TransactionType = 'expense' | 'income';

export type AccountType = 'cash' | 'bank' | 'card' | 'savings';

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string;
  name: string;
  icon: string; // Ionicons name
  color: string;
  type: TransactionType;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  date: string; // ISO 8601 string: YYYY-MM-DDTHH:mm:ss.sssZ
  note?: string;
  recurringId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  month: string; // YYYY-MM or 'global'
}

export interface RecurringItem {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  frequency: RecurringFrequency;
  dueDay: number; // 1-31 (day of month)
  lastPaidDate?: string; // ISO date of last recorded payment
  active: boolean;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  darkMode: boolean;
  biometricLock: boolean;
}
