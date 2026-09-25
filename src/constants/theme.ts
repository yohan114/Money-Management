import { Category, Account, CurrencyConfig } from '../types';

export const COLORS = {
  // Base backgrounds
  background: '#0B0F19',
  card: '#131B2E',
  cardElevated: '#1B253E',
  cardMuted: '#0E1524',
  
  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.08)',
  borderHighlight: 'rgba(59, 130, 246, 0.3)',
  
  // Brand & Accents
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  primaryGlow: 'rgba(59, 130, 246, 0.15)',

  // Semantic Status
  income: '#10B981', // Mint/Emerald
  incomeBg: 'rgba(16, 185, 129, 0.12)',
  expense: '#F43F5E', // Rose/Crimson
  expenseBg: 'rgba(244, 63, 94, 0.12)',
  warning: '#F59E0B', // Amber
  warningBg: 'rgba(245, 158, 11, 0.12)',
  info: '#06B6D4', // Cyan
  purple: '#8B5CF6',
  purpleBg: 'rgba(139, 92, 246, 0.12)',
  
  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0F19',
  
  // Overlays
  scrim: 'rgba(0, 0, 0, 0.65)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  full: 9999,
};

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expenses
  { id: 'cat-food', name: 'Food & Dining', icon: 'restaurant', color: '#F97316', type: 'expense' },
  { id: 'cat-groceries', name: 'Groceries', icon: 'cart', color: '#10B981', type: 'expense' },
  { id: 'cat-housing', name: 'Rent & Housing', icon: 'home', color: '#6366F1', type: 'expense' },
  { id: 'cat-transport', name: 'Transport & Fuel', icon: 'car', color: '#3B82F6', type: 'expense' },
  { id: 'cat-utilities', name: 'Bills & Utilities', icon: 'flash', color: '#EAB308', type: 'expense' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'bag-handle', color: '#EC4899', type: 'expense' },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'game-controller', color: '#8B5CF6', type: 'expense' },
  { id: 'cat-health', name: 'Healthcare', icon: 'medkit', color: '#14B8A6', type: 'expense' },
  { id: 'cat-education', name: 'Education', icon: 'school', color: '#06B6D4', type: 'expense' },
  { id: 'cat-personal', name: 'Personal Care', icon: 'sparkles', color: '#F43F5E', type: 'expense' },
  { id: 'cat-other-expense', name: 'Other Expense', icon: 'ellipsis-horizontal-circle', color: '#64748B', type: 'expense' },
  
  // Income
  { id: 'cat-salary', name: 'Salary', icon: 'cash', color: '#10B981', type: 'income' },
  { id: 'cat-freelance', name: 'Freelance & Projects', icon: 'laptop', color: '#3B82F6', type: 'income' },
  { id: 'cat-investments', name: 'Investments', icon: 'trending-up', color: '#8B5CF6', type: 'income' },
  { id: 'cat-business', name: 'Business Income', icon: 'briefcase', color: '#F59E0B', type: 'income' },
  { id: 'cat-gift', name: 'Gifts & Rewards', icon: 'gift', color: '#EC4899', type: 'income' },
  { id: 'cat-other-income', name: 'Other Income', icon: 'add-circle', color: '#14B8A6', type: 'income' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-cash', name: 'Cash Wallet', type: 'cash', balance: 450, icon: 'wallet', color: '#10B981' },
  { id: 'acc-main-bank', name: 'Main Checking Account', type: 'bank', balance: 3820, icon: 'business', color: '#3B82F6' },
  { id: 'acc-credit-card', name: 'Credit Card', type: 'card', balance: -350, icon: 'card', color: '#EC4899' },
  { id: 'acc-savings', name: 'Emergency Fund', type: 'savings', balance: 8500, icon: 'shield-checkmark', color: '#8B5CF6' },
];
