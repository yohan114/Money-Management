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

export interface BudgetItem {
  id: string;
  budgetId: string;
  name: string;
  estimatedCost: number;
  targetWeek: 1 | 2 | 3 | 4 | 5;
  status: 'planned' | 'closed';
  actualCost?: number;
  closedAt?: string;
  slipImageUri?: string;
  linkedTransactionId?: string;
  notes?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  accountId?: string;
  monthlyLimit: number;
  month: string; // YYYY-MM or 'global'
  items?: BudgetItem[];
  weeklyLimits?: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
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

export type LoanType = 'friend' | 'bank' | 'family' | 'personal' | 'business';
export type LoanStatus = 'active' | 'paid_off';

export interface LoanSpendingItem {
  id: string;
  loanId: string;
  title: string;
  amount: number;
  date: string; // ISO 8601
  note?: string;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  date: string; // ISO 8601
  paidFromAccountId: string;
  slipImageUri?: string; // buying slip or receipt photo
  note?: string;
  linkedTransactionId?: string;
}

export interface Loan {
  id: string;
  lenderName: string; // e.g. "Kasun (Friend)", "Commercial Bank"
  type: LoanType;
  totalAmount: number;
  receivedDate: string; // ISO 8601
  dueDate?: string; // YYYY-MM-DD
  depositAccountId: string;
  purpose: string; // e.g. "House Advance", "Vehicle Repair"
  status: LoanStatus;
  notes?: string;
  spendingItems?: LoanSpendingItem[];
  repayments?: LoanRepayment[];
  linkedTransactionId?: string;
}

export type IncomeStreamCategory = 'salary' | 'friend_loan' | 'part_time' | 'business' | 'rental' | 'other';

export interface IncomeStream {
  id: string;
  name: string;
  category: IncomeStreamCategory;
  expectedMonthlyAmount?: number;
  defaultAccountId?: string;
  icon: string;
  color: string;
}

export type VehicleType = 'car' | 'bike' | 'van' | 'scooter' | 'truck' | 'other';
export type FuelType = 'petrol_92' | 'petrol_95' | 'auto_diesel' | 'super_diesel' | 'electric' | 'hybrid' | 'cng';

export interface Vehicle {
  id: string;
  name: string; // e.g. "Toyota Prius", "Honda Dio"
  plateNumber: string; // e.g. "WP CAD-1234"
  type: VehicleType;
  fuelType: FuelType;
  initialOdometer: number; // km
  currentOdometer: number; // km
  tankCapacityLiters?: number;
  icon: string;
  color: string;
  nextServiceOdometer?: number; // km
  nextServiceDate?: string; // YYYY-MM-DD
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string; // ISO 8601
  odometer: number; // meter reading at pump in km
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  isFullTank: boolean;
  paidFromAccountId: string;
  slipImageUri?: string; // pump receipt photo
  stationName?: string; // e.g. "Ceypetco Nugegoda", "IOC"
  note?: string;
  distanceDriven?: number;
  fuelEfficiencyKmPerLiter?: number;
  linkedTransactionId?: string;
}

export type ServiceType =
  | 'routine_oil'
  | 'full_service'
  | 'brakes'
  | 'tires'
  | 'battery'
  | 'repair'
  | 'insurance_revenue'
  | 'wash_detailing'
  | 'other';

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  date: string; // ISO 8601
  odometer: number;
  serviceType: ServiceType;
  title: string;
  cost: number;
  paidFromAccountId: string;
  workshopName?: string;
  slipImageUri?: string; // invoice/receipt photo
  notes?: string;
  nextServiceDueOdometer?: number;
  nextServiceDueDate?: string; // YYYY-MM-DD
  linkedTransactionId?: string;
}

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  darkMode: boolean;
  biometricLock: boolean;
}

export interface GoogleDriveUser {
  id: string; // Google sub id
  email: string;
  name: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // timestamp in ms
  connectedAt: string; // ISO 8601
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  size?: number; // bytes
  createdTime: string; // ISO 8601
  modifiedTime?: string;
  webViewLink?: string;
}

export type BackupScheduleFrequency = 'off' | 'daily' | 'weekly' | 'on_change';

export interface CloudSyncSettings {
  autoBackupFrequency: BackupScheduleFrequency;
  lastAutoBackupDate?: string; // ISO 8601
  customClientId?: string; // Optional user Google Cloud OAuth Client ID
  folderId?: string;
  folderName?: string;
}

export interface CloudSyncLog {
  id: string;
  timestamp: string; // ISO 8601
  status: 'success' | 'failed';
  trigger: 'manual' | 'scheduled' | 'auto_change';
  recordsCount?: number;
  fileSize?: number;
  fileName?: string;
  driveFileId?: string;
  error?: string;
}

export interface CloudBackupMetadata {
  lastBackupDate: string; // ISO 8601
  fileName: string;
  accountsCount: number;
  transactionsCount: number;
  budgetsCount: number;
  budgetItemsCount: number;
  loansCount?: number;
  vehiclesCount?: number;
  fuelLogsCount?: number;
  serviceRecordsCount?: number;
  totalNetWorth?: number;
  driveFileId?: string;
  folderId?: string;
  isDirectSync?: boolean;
}

export interface CloudBackupPayload {
  schemaVersion: number;
  appName: string;
  appVersion: string;
  exportedAt: string;
  stats: {
    accountsCount: number;
    transactionsCount: number;
    budgetsCount: number;
    budgetItemsCount: number;
    recurringCount: number;
    goalsCount: number;
    holdingsCount: number;
    rulesCount: number;
    categoriesCount: number;
    loansCount?: number;
    vehiclesCount?: number;
    fuelLogsCount?: number;
    serviceRecordsCount?: number;
  };
  data: {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
    budgets: Budget[];
    recurringItems: RecurringItem[];
    goals: FinancialGoal[];
    holdings: InvestmentHolding[];
    rules: TransactionRule[];
    settings: UserSettings;
    loans?: Loan[];
    incomeStreams?: IncomeStream[];
    vehicles?: Vehicle[];
    fuelLogs?: FuelLog[];
    serviceRecords?: ServiceRecord[];
  };
}

export interface AppUser {
  uid: string; // Scoped Unique User ID (Firebase UID or Google Sub ID)
  email: string;
  displayName: string;
  photoUrl?: string;
  provider: 'google' | 'firebase';
  accessToken?: string;
  lastLoginAt: string; // ISO 8601
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  lastSyncedAt?: string; // ISO 8601
  pendingCount: number;
  lastError?: string;
  targetProvider: 'firestore' | 'google_drive' | 'local_only';
}

export interface MigrationReport {
  stage: 1 | 2 | 3 | 4; // 1: Discover, 2: Associate, 3: Upload, 4: Commit
  discoveredRecords: {
    accounts: number;
    transactions: number;
    budgets: number;
    vehicles: number;
    loans: number;
    fuelLogs: number;
  };
  associatedUid?: string;
  uploadedCount: number;
  committedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface FirebaseProjectConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface OutboxOperation {
  id: string;
  uid: string;
  timestamp: string;
  type: 'upsert' | 'delete';
  entity: 'transaction' | 'account' | 'budget' | 'vehicle' | 'fuel_log' | 'loan' | 'full_database';
  entityId?: string;
  payload?: any;
}
