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
  { code: 'LKR', symbol: 'Rs.', name: 'Sri Lankan Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'PKR', symbol: 'PKR', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expenses
  { id: 'cat-groceries', name: 'Food - Grocery Shops', icon: 'cart', color: '#10B981', type: 'expense' },
  { id: 'cat-vegetable', name: 'Food - Vegetable Market', icon: 'leaf', color: '#22C55E', type: 'expense' },
  { id: 'cat-meat', name: 'Food - Meat & Fish Shop', icon: 'fish', color: '#EF4444', type: 'expense' },
  { id: 'cat-food', name: 'Food, Snacks & Dining', icon: 'restaurant', color: '#F97316', type: 'expense' },
  { id: 'cat-company-food', name: 'Company Food Expenses', icon: 'briefcase', color: '#F59E0B', type: 'expense' },
  { id: 'cat-kids-school', name: 'Kids, School & Classes', icon: 'school', color: '#06B6D4', type: 'expense' },
  { id: 'cat-fuel', name: 'Vehicle Fuel (Petrol/Diesel)', icon: 'speedometer', color: '#3B82F6', type: 'expense' },
  { id: 'cat-vehicle-maint', name: 'Vehicle Maintenance & Spares', icon: 'construct', color: '#64748B', type: 'expense' },
  { id: 'cat-utilities', name: 'House Electricity & Gas', icon: 'flash', color: '#EAB308', type: 'expense' },
  { id: 'cat-phone', name: 'House Telephone & Internet', icon: 'call', color: '#8B5CF6', type: 'expense' },
  { id: 'cat-cash-giving', name: 'Cash Giving (Family)', icon: 'heart', color: '#EC4899', type: 'expense' },
  { id: 'cat-seettu', name: 'Saving Seettu', icon: 'shield-checkmark', color: '#14B8A6', type: 'expense' },
  { id: 'cat-coco-biz', name: 'Company - Coco Business', icon: 'business', color: '#D97706', type: 'expense' },
  { id: 'cat-dinu-land', name: 'Company - Dinu Land', icon: 'earth', color: '#84CC16', type: 'expense' },
  { id: 'cat-health', name: 'Healthcare & Medical', icon: 'medkit', color: '#F43F5E', type: 'expense' },
  { id: 'cat-gifts', name: 'Church, Gifts & Donations', icon: 'gift', color: '#A855F7', type: 'expense' },
  { id: 'cat-other-expense', name: 'Other Expense', icon: 'ellipsis-horizontal-circle', color: '#475569', type: 'expense' },
  
  // Income
  { id: 'cat-salary', name: 'My Salary', icon: 'cash', color: '#10B981', type: 'income' },
  { id: 'cat-coco-inc', name: 'Coconut Business Income', icon: 'trending-up', color: '#3B82F6', type: 'income' },
  { id: 'cat-wife-salary', name: 'Wife Salary / Tuition', icon: 'school', color: '#8B5CF6', type: 'income' },
  { id: 'cat-dinu-inc', name: 'Dinu Cash / Land Income', icon: 'earth', color: '#84CC16', type: 'income' },
  { id: 'cat-loans-inc', name: 'Loans & Cash In', icon: 'wallet', color: '#F59E0B', type: 'income' },
  { id: 'cat-fitness', name: 'Fitness Income', icon: 'barbell', color: '#06B6D4', type: 'income' },
  { id: 'cat-other-income', name: 'Other Income & Allowances', icon: 'add-circle', color: '#14B8A6', type: 'income' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-salary', name: 'My Salary Account', type: 'bank', balance: 0, icon: 'wallet', color: '#3B82F6' },
  { id: 'acc-chamery', name: 'Channery Expenses', type: 'cash', balance: 0, icon: 'home', color: '#10B981' },
  { id: 'acc-company', name: 'Company Money', type: 'bank', balance: 0, icon: 'business', color: '#F59E0B' },
  { id: 'acc-credit-card', name: 'Credit Cards & Loans', type: 'card', balance: 0, icon: 'card', color: '#EC4899', isLiability: true },
];
