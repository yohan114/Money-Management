import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  Category,
  Account,
  Budget,
  RecurringItem,
  UserSettings,
} from '../types';
import { StorageService, DEFAULT_SETTINGS } from '../services/storage';

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

interface FinancialContextValue {
  loading: boolean;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  recurringItems: RecurringItem[];
  settings: UserSettings;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;

  // Actions
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (data: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addBudget: (data: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (data: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  addRecurringItem: (data: Omit<RecurringItem, 'id'>) => Promise<void>;
  updateRecurringItem: (data: RecurringItem) => Promise<void>;
  deleteRecurringItem: (id: string) => Promise<void>;
  payRecurringItem: (id: string) => Promise<void>;

  addAccount: (data: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (data: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  formatAmount: (amount: number, options?: { showSign?: boolean; absolute?: boolean }) => string;

  // Computed Metrics
  totalNetWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  savingsRate: number;
  categorySpending: CategorySpend[];
  cashFlowHistory: MonthlyCashFlow[];
  upcomingBills: RecurringItem[];
  getCategoryById: (id: string) => Category | undefined;
  getAccountById: (id: string) => Account | undefined;
  getCategorySpentForMonth: (categoryId: string, month: string) => number;
}

const FinancialContext = createContext<FinancialContextValue | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const currentYearMonth = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // Load data on startup
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await StorageService.initDemoDataIfFirstTime();
    const [txs, cats, accs, bdgs, recs, sets] = await Promise.all([
      StorageService.getTransactions(),
      StorageService.getCategories(),
      StorageService.getAccounts(),
      StorageService.getBudgets(),
      StorageService.getRecurring(),
      StorageService.getSettings(),
    ]);

    setTransactions(txs);
    setCategories(cats);
    setAccounts(accs);
    setBudgets(bdgs);
    setRecurringItems(recs);
    setSettings(sets);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Format money string helper
  const formatAmount = useCallback(
    (amount: number, options?: { showSign?: boolean; absolute?: boolean }) => {
      const val = options?.absolute ? Math.abs(amount) : amount;
      const formattedNumber = val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const sym = settings.currencySymbol || '$';
      if (options?.showSign && amount > 0) {
        return `+${sym}${formattedNumber}`;
      } else if (options?.showSign && amount < 0) {
        return `-${sym}${Math.abs(val).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }
      return `${sym}${formattedNumber}`;
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

  // Add Transaction
  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id'>) => {
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      };

      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      await StorageService.saveTransactions(updatedTxs);

      // Adjust account balance
      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === data.accountId) {
          const delta = data.type === 'income' ? data.amount : -data.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      await StorageService.saveAccounts(updatedAccounts);
    },
    [transactions, accounts]
  );

  // Update Transaction
  const updateTransaction = useCallback(
    async (tx: Transaction) => {
      const oldTx = transactions.find((t) => t.id === tx.id);
      const updatedTxs = transactions.map((t) => (t.id === tx.id ? tx : t));
      setTransactions(updatedTxs);
      await StorageService.saveTransactions(updatedTxs);

      if (oldTx) {
        // Recalculate account balances
        const updatedAccounts = accounts.map((acc) => {
          let balance = acc.balance;
          // Revert old
          if (acc.id === oldTx.accountId) {
            balance += oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
          }
          // Apply new
          if (acc.id === tx.accountId) {
            balance += tx.type === 'income' ? tx.amount : -tx.amount;
          }
          return { ...acc, balance };
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }
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
            const revertDelta = txToDelete.type === 'income' ? -txToDelete.amount : txToDelete.amount;
            return { ...acc, balance: acc.balance + revertDelta };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        await StorageService.saveAccounts(updatedAccounts);
      }
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

  // Pay recurring bill (registers a transaction for today)
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

  // Total Net Worth
  const totalNetWorth = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + curr.balance, 0);
  }, [accounts]);

  // Selected Month Transactions
  const selectedMonthTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

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

    const totalExpense = Object.values(spendMap).reduce((a, b) => a + b, 0);

    const result: CategorySpend[] = [];
    Object.keys(spendMap).forEach((catId) => {
      const cat = categories.find((c) => c.id === catId);
      if (cat) {
        const total = spendMap[catId];
        result.push({
          category: cat,
          total,
          percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
        });
      }
    });

    return result.sort((a, b) => b.total - a.total);
  }, [selectedMonthTransactions, categories]);

  // Category spent helper for a specific category & month
  const getCategorySpentForMonth = useCallback(
    (categoryId: string, month: string) => {
      return transactions
        .filter((tx) => tx.categoryId === categoryId && tx.type === 'expense' && (month === 'global' || tx.date.startsWith(month)))
        .reduce((sum, tx) => sum + tx.amount, 0);
    },
    [transactions]
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

      const monthTxs = transactions.filter((t) => t.date.startsWith(monthKey));
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
  }, [transactions]);

  // Upcoming bills: active recurring items
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();

    return recurringItems
      .filter((item) => item.active && item.type === 'expense')
      .sort((a, b) => {
        // Distance in days from today
        const distA = (a.dueDay - currentDay + 31) % 31;
        const distB = (b.dueDay - currentDay + 31) % 31;
        return distA - distB;
      });
  }, [recurringItems]);

  const value = useMemo(
    () => ({
      loading,
      transactions,
      categories,
      accounts,
      budgets,
      recurringItems,
      settings,
      selectedMonth,
      setSelectedMonth,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addRecurringItem,
      updateRecurringItem,
      deleteRecurringItem,
      payRecurringItem,
      addAccount,
      updateAccount,
      deleteAccount,
      updateSettings,
      resetDemoData,
      clearAllData,
      formatAmount,
      totalNetWorth,
      monthlyIncome,
      monthlyExpense,
      netSavings,
      savingsRate,
      categorySpending,
      cashFlowHistory,
      upcomingBills,
      getCategoryById,
      getAccountById,
      getCategorySpentForMonth,
    }),
    [
      loading,
      transactions,
      categories,
      accounts,
      budgets,
      recurringItems,
      settings,
      selectedMonth,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addRecurringItem,
      updateRecurringItem,
      deleteRecurringItem,
      payRecurringItem,
      addAccount,
      updateAccount,
      deleteAccount,
      updateSettings,
      resetDemoData,
      clearAllData,
      formatAmount,
      totalNetWorth,
      monthlyIncome,
      monthlyExpense,
      netSavings,
      savingsRate,
      categorySpending,
      cashFlowHistory,
      upcomingBills,
      getCategoryById,
      getAccountById,
      getCategorySpentForMonth,
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
