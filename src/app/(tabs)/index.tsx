import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { TransactionRow } from '../../components/TransactionRow';
import { BillReminderCard } from '../../components/BillReminderCard';
import { TransactionType } from '../../types';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    totalNetWorth,
    monthlyIncome,
    monthlyExpense,
    netSavings,
    savingsRate,
    transactions,
    upcomingBills,
    formatAmount,
    payRecurringItem,
    deleteTransaction,
    selectedMonth,
    setSelectedMonth,
  } = useFinancial();

  const [hideBalance, setHideBalance] = useState(false);
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');

  // Month navigation
  const monthDate = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [selectedMonth]);

  const changeMonth = (offset: number) => {
    const nextDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
    const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextDate.getFullYear()}-${mStr}`);
  };

  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  // Filtered recent transactions for selected month
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => tx.date.startsWith(selectedMonth))
      .filter((tx) => (filterType === 'all' ? true : tx.type === filterType));
  }, [transactions, selectedMonth, filterType]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Money Management</Text>
            <View style={styles.monthSelector}>
              <Pressable
                onPress={() => changeMonth(-1)}
                style={styles.monthArrow}
                hitSlop={10}
                accessibilityLabel="Previous month"
              >
                <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
              </Pressable>
              <Text style={styles.monthText}>{monthLabel}</Text>
              <Pressable
                onPress={() => changeMonth(1)}
                style={styles.monthArrow}
                hitSlop={10}
                accessibilityLabel="Next month"
              >
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.headerIconBtn}
            onPress={() => router.push('/(tabs)/settings')}
            accessibilityLabel="Settings"
          >
            <Ionicons name="options-outline" size={20} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* Hero Balance Card */}
        <Card elevated highlight style={styles.heroCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Total Net Worth</Text>
            <Pressable
              onPress={() => setHideBalance(!hideBalance)}
              hitSlop={10}
              accessibilityLabel={hideBalance ? 'Show balance' : 'Hide balance'}
            >
              <Ionicons
                name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={COLORS.textMuted}
              />
            </Pressable>
          </View>

          <Text style={styles.balanceAmount}>
            {hideBalance ? '••••••••' : formatAmount(totalNetWorth)}
          </Text>

          {/* Monthly Income / Expense Split */}
          <View style={styles.cashFlowRow}>
            {/* Income */}
            <View style={styles.cashFlowItem}>
              <View style={[styles.arrowCircle, { backgroundColor: COLORS.incomeBg }]}>
                <Ionicons name="arrow-down" size={14} color={COLORS.income} />
              </View>
              <View>
                <Text style={styles.cashFlowSub}>Income</Text>
                <Text style={[styles.cashFlowValue, { color: COLORS.income }]}>
                  {hideBalance ? '••••' : formatAmount(monthlyIncome)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Expense */}
            <View style={styles.cashFlowItem}>
              <View style={[styles.arrowCircle, { backgroundColor: COLORS.expenseBg }]}>
                <Ionicons name="arrow-up" size={14} color={COLORS.expense} />
              </View>
              <View>
                <Text style={styles.cashFlowSub}>Expense</Text>
                <Text style={[styles.cashFlowValue, { color: COLORS.expense }]}>
                  {hideBalance ? '••••' : formatAmount(monthlyExpense)}
                </Text>
              </View>
            </View>
          </View>

          {/* Savings Rate Badge */}
          <View style={styles.savingsRateRow}>
            <View style={styles.ratePill}>
              <Ionicons name="sparkles" size={12} color={COLORS.primaryLight} />
              <Text style={styles.rateText}>
                Savings Rate: <Text style={styles.rateHighlight}>{savingsRate}%</Text>
              </Text>
            </View>
            <Text style={styles.netSavingsText}>
              Net: {formatAmount(netSavings, { showSign: true })}
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionGrid}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: COLORS.expense },
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => router.push({ pathname: '/modal/transaction', params: { type: 'expense' } })}
            accessibilityRole="button"
            accessibilityLabel="Add Expense"
          >
            <Ionicons name="remove-circle" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Add Expense</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: COLORS.income },
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => router.push({ pathname: '/modal/transaction', params: { type: 'income' } })}
            accessibilityRole="button"
            accessibilityLabel="Add Income"
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Add Income</Text>
          </Pressable>
        </View>

        {/* Upcoming Bills section */}
        {upcomingBills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Bills & Subscriptions</Text>
              <Pressable onPress={() => router.push('/(tabs)/recurring')}>
                <Text style={styles.seeAllText}>See all ({upcomingBills.length})</Text>
              </Pressable>
            </View>

            {upcomingBills.slice(0, 2).map((bill) => (
              <BillReminderCard
                key={bill.id}
                item={bill}
                onPay={() => {
                  payRecurringItem(bill.id);
                  Alert.alert('Payment Logged', `Marked ${bill.title} as paid for this month!`);
                }}
              />
            ))}
          </View>
        )}

        {/* Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>

            {/* Filter Tabs */}
            <View style={styles.filterPillGroup}>
              {(['all', 'expense', 'income'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.filterChip, filterType === t && styles.filterChipActive]}
                  onPress={() => setFilterType(t)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterType === t && styles.filterChipTextActive,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {filteredTransactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={36} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No transactions recorded</Text>
              <Text style={styles.emptySubtitle}>
                Tap the buttons above to log an expense or income for this month.
              </Text>
            </Card>
          ) : (
            <Card style={styles.txListCard}>
              {filteredTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  onDelete={() => handleDelete(tx.id)}
                />
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  greeting: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  monthArrow: {
    padding: 4,
  },
  monthText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: COLORS.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: SPACING.lg,
  },
  cashFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  cashFlowItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashFlowSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  cashFlowValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  savingsRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  rateText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  rateHighlight: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  netSavingsText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnPressed: {
    opacity: 0.85,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  seeAllText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  txListCard: {
    padding: 0,
    paddingHorizontal: SPACING.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
