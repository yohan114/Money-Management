export type TransactionType = 'expense' | 'income';

export type AccountType =
  | 'cash'
  | 'bank'
  | 'card'
  | 'savings'
  | 'investment'
  | 'loan'
  | 'asset';

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export type AssetClass =
  | 'stock'
  | 'crypto'
  | 'etf'
  | 'commodity'
  | 'real_estate'
  | 'other';

export interface Category {
  id: string;
  name: string;
  icon: string; // Ionicons name
  color: string;
  type: TransactionType;
  isCustom?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  icon: string;
  color: string;
  isLiability?: boolean; // Credit Cards, Mortgages, Loans
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
  imageUri?: string; // Receipt or bill photo
  tags?: string[]; // e.g. ["#business", "#tax-deductible", "#travel"]
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

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  icon: string;
  color: string;
  linkedAccountId?: string;
}

export interface InvestmentHolding {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  currentValue: number;
  accountId: string;
}

export interface TransactionRule {
  id: string;
  keyword: string;
  categoryId: string;
  tag?: string;
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
