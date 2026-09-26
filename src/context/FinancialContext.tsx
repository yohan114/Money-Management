import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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

  const currentYearMonth = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // Load data on startup
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await StorageService.initFreshDataIfFirstTime();
    const [txs, cats, accs, bdgs, recs, gls, hlds, rls, sets] = await Promise.all([
      StorageService.getTransactions(),
      StorageService.getCategories(),
      StorageService.getAccounts(),
      StorageService.getBudgets(),
      StorageService.getRecurring(),
      StorageService.getGoals(),
      StorageService.getHoldings(),
      StorageService.getRules(),
      StorageService.getSettings(),
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
    setLoading(false);
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
            (month === 'global' || tx.date.startsWith(month))
        )
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

  // Upcoming bills
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();

    return recurringItems
      .filter((item) => item.active && item.type === 'expense')
      .sort((a, b) => {
        const distA = (a.dueDay - currentDay + 31) % 31;
        const distB = (b.dueDay - currentDay + 31) % 31;
        return distA - distB;
      });
  }, [recurringItems]);

  // Monarch Cash Flow Forecasting (30 days predictive timeline)
  const cashFlowForecast = useMemo(() => {
    const forecast: DayForecast[] = [];
    const today = new Date();
    let rollingBalance = totalAssets;

    for (let i = 1; i <= 30; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + i);
      const dayOfMonth = targetDate.getDate();
      const dateStr = targetDate.toISOString().split('T')[0];

      let incoming = 0;
      let outgoing = 0;
      const events: string[] = [];

      // Check recurring items due on this day of month
      recurringItems.forEach((r) => {
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
  }, [totalAssets, recurringItems]);

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
