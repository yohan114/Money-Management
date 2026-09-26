import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { TransactionType, AssetClass } from '../../types';

const ASSET_CLASS_META: Record<
  AssetClass,
  { label: string; icon: string; color: string }
> = {
  stock: { label: 'Stock', icon: 'trending-up', color: '#10B981' },
  etf: { label: 'ETF', icon: 'pie-chart', color: '#3B82F6' },
  crypto: { label: 'Crypto', icon: 'logo-bitcoin', color: '#F59E0B' },
  real_estate: { label: 'Real Estate', icon: 'home', color: '#8B5CF6' },
  commodity: { label: 'Commodity', icon: 'diamond', color: '#EC4899' },
  other: { label: 'Asset', icon: 'cube', color: '#06B6D4' },
};

export default function DashboardScreen() {
  const router = useRouter();
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    totalNetWorth,
    totalAssets,
    totalLiabilities,
    debtToAssetRatio,
    totalInvestments,
    holdings,
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

  // Filtered recent transactions for selected month and account
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => tx.date.startsWith(selectedMonth))
      .filter((tx) => (selectedAccountId === 'all' ? true : tx.accountId === selectedAccountId))
      .filter((tx) => (filterType === 'all' ? true : tx.type === filterType));
  }, [transactions, selectedMonth, selectedAccountId, filterType]);

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

        {/* Multi-Account Isolation Switcher (Salary vs Channery vs Company) */}
        <View style={styles.accountSwitcherContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountSwitcherContent}
          >
            <Pressable
              style={[
                styles.accountTabChip,
                selectedAccountId === 'all' && styles.accountTabChipActive,
              ]}
              onPress={() => setSelectedAccountId('all')}
            >
              <Ionicons
                name="globe-outline"
                size={14}
                color={selectedAccountId === 'all' ? '#FFF' : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.accountTabChipText,
                  selectedAccountId === 'all' && styles.accountTabChipTextActive,
                ]}
              >
                All Accounts
              </Text>
            </Pressable>

            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <Pressable
                  key={acc.id}
                  style={[
                    styles.accountTabChip,
                    isSelected && {
                      backgroundColor: acc.color + '25',
                      borderColor: acc.color,
                    },
                  ]}
                  onPress={() => setSelectedAccountId(isSelected ? 'all' : acc.id)}
                >
                  <Ionicons
                    name={(acc.icon as any) || 'wallet'}
                    size={14}
                    color={isSelected ? acc.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.accountTabChipText,
                      isSelected && { color: acc.color, fontWeight: '700' },
                    ]}
                  >
                    {acc.name}
                  </Text>
                  <Text
                    style={[
                      styles.accountTabChipBalance,
                      isSelected && { color: acc.color, fontWeight: '700' },
                    ]}
                  >
                    {formatAmount(acc.balance)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Hero Balance Sheet Card (Isolated for selected account or Net Worth for all) */}
        <Card elevated highlight style={styles.heroCard}>
          <View style={styles.balanceHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {selectedAccount && (
                <Ionicons
                  name={(selectedAccount.icon as any) || 'wallet'}
                  size={16}
                  color={selectedAccount.color}
                />
              )}
              <Text style={styles.balanceLabel}>
                {selectedAccount ? `${selectedAccount.name} Balance` : 'Total Net Worth'}
              </Text>
            </View>
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
            {hideBalance
              ? '••••••••'
              : formatAmount(selectedAccount ? selectedAccount.balance : totalNetWorth)}
          </Text>

          {/* If All Accounts selected: show Monarch Balance Sheet (Assets vs Liabilities) */}
          {!selectedAccount ? (
            <View style={styles.balanceSheetRow}>
              <View style={styles.balanceSheetCol}>
                <Text style={styles.balanceSheetSub}>Total Assets</Text>
                <Text style={[styles.balanceSheetVal, { color: COLORS.income }]}>
                  {hideBalance ? '••••' : formatAmount(totalAssets)}
                </Text>
              </View>

              <View style={styles.balanceSheetDivider} />

              <View style={styles.balanceSheetCol}>
                <Text style={styles.balanceSheetSub}>Liabilities / Debt</Text>
                <Text style={[styles.balanceSheetVal, { color: COLORS.expense }]}>
                  {hideBalance ? '••••' : formatAmount(totalLiabilities)}
                </Text>
              </View>

              <View style={styles.balanceSheetDivider} />

              <View style={styles.balanceSheetCol}>
                <Text style={styles.balanceSheetSub}>Debt Ratio</Text>
                <Text style={[styles.balanceSheetVal, { color: COLORS.primaryLight }]}>
                  {debtToAssetRatio}%
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.activeAccountBanner, { borderColor: selectedAccount.color + '40' }]}>
              <Text style={styles.activeAccountBannerText}>
                Isolating transactions for{' '}
                <Text style={{ color: selectedAccount.color, fontWeight: '700' }}>
                  {selectedAccount.name}
                </Text>
              </Text>
              <Pressable onPress={() => setSelectedAccountId('all')} hitSlop={6}>
                <Text style={styles.resetAccountLink}>View All</Text>
              </Pressable>
            </View>
          )}

          {/* Monthly Income / Expense Split for active account scope */}
          <View style={styles.cashFlowRow}>
            {/* Income */}
            <View style={styles.cashFlowItem}>
              <View style={[styles.arrowCircle, { backgroundColor: COLORS.incomeBg }]}>
                <Ionicons name="arrow-down" size={14} color={COLORS.income} />
              </View>
              <View>
                <Text style={styles.cashFlowSub}>
                  {selectedAccount ? `${selectedAccount.name.split(' ')[0]} Inflow` : 'Income'}
                </Text>
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
                <Text style={styles.cashFlowSub}>
                  {selectedAccount ? `${selectedAccount.name.split(' ')[0]} Outflow` : 'Expense'}
                </Text>
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

        {/* Quick Action Buttons with Account Pre-fill */}
        <View style={styles.actionGrid}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: COLORS.expense },
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/modal/transaction',
                params: {
                  type: 'expense',
                  ...(selectedAccountId !== 'all' ? { accountId: selectedAccountId } : {}),
                },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Add Expense"
          >
            <Ionicons name="remove-circle" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>
              {selectedAccount ? `Add ${selectedAccount.name.split(' ')[0]} Exp` : 'Expense'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: COLORS.income },
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/modal/transaction',
                params: {
                  type: 'income',
                  ...(selectedAccountId !== 'all' ? { accountId: selectedAccountId } : {}),
                },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Add Income"
          >
            <Ionicons name="add-circle" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>
              {selectedAccount ? `Add ${selectedAccount.name.split(' ')[0]} Inc` : 'Income'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: COLORS.purple },
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => router.push('/modal/holding')}
            accessibilityRole="button"
            accessibilityLabel="Add Asset"
          >
            <Ionicons name="trending-up" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>+ Asset</Text>
          </Pressable>
        </View>

        {/* Monarch Investments & Holdings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Investments & Assets</Text>
              <Text style={styles.sectionSub}>
                Total Portfolio: {formatAmount(totalInvestments)}
              </Text>
            </View>

            <Pressable
              style={styles.addSectionBtn}
              onPress={() => router.push('/modal/holding')}
            >
              <Ionicons name="add" size={14} color="#FFF" />
              <Text style={styles.addSectionBtnText}>Add Asset</Text>
            </Pressable>
          </View>

          {holdings.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="trending-up-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No investments tracked</Text>
              <Text style={styles.emptySubtitle}>
                Add your stocks, crypto, ETFs, or real estate to track overall portfolio valuation.
              </Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => router.push('/modal/holding')}
              >
                <Text style={styles.emptyBtnText}>Add Your First Asset</Text>
              </Pressable>
            </Card>
          ) : (
            <Card style={styles.holdingsListCard}>
              {holdings.map((h, idx) => {
                const meta = ASSET_CLASS_META[h.assetClass] || ASSET_CLASS_META.other;
                const isLast = idx === holdings.length - 1;
                return (
                  <Pressable
                    key={h.id}
                    style={[styles.holdingRow, !isLast && styles.holdingRowBorder]}
                    onPress={() =>
                      router.push({
                        pathname: '/modal/holding',
                        params: { id: h.id },
                      })
                    }
                  >
                    <View style={styles.holdingLeft}>
                      <View
                        style={[
                          styles.holdingIconWrap,
                          { backgroundColor: meta.color + '20' },
                        ]}
                      >
                        <Ionicons
                          name={meta.icon as any}
                          size={18}
                          color={meta.color}
                        />
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.holdingSymbol}>{h.symbol}</Text>
                          <View
                            style={[
                              styles.assetClassTag,
                              { backgroundColor: meta.color + '20' },
                            ]}
                          >
                            <Text style={[styles.assetClassTagText, { color: meta.color }]}>
                              {meta.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.holdingName} numberOfLines={1}>
                          {h.name} • {h.quantity} units
                        </Text>
                      </View>
                    </View>

                    <View style={styles.alignRight}>
                      <Text style={styles.holdingVal}>{formatAmount(h.currentValue)}</Text>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          )}
        </View>

        {/* Upcoming Bills section */}
        {upcomingBills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedAccount
                  ? `${selectedAccount.name} Bills`
                  : 'Upcoming Bills & Subscriptions'}
              </Text>
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
            <View>
              <Text style={styles.sectionTitle}>
                {selectedAccount ? `${selectedAccount.name} History` : 'Transactions'}
              </Text>
              {selectedAccount && (
                <Pressable onPress={() => setSelectedAccountId('all')}>
                  <Text style={styles.filteredScopeLink}>
                    Filtered by {selectedAccount.name} • View All
                  </Text>
                </Pressable>
              )}
            </View>

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
              <Text style={styles.emptyTitle}>
                {selectedAccount
                  ? `No transactions in ${selectedAccount.name}`
                  : 'No transactions recorded'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedAccount
                  ? `Tap the buttons above to log an income or expense directly to ${selectedAccount.name}.`
                  : 'Tap the buttons above to log an expense or income for this month.'}
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
    marginBottom: SPACING.sm,
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
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountSwitcherContainer: {
    marginBottom: SPACING.sm,
  },
  accountSwitcherContent: {
    gap: 8,
    paddingVertical: 4,
  },
  accountTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  accountTabChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  accountTabChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  accountTabChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  accountTabChipBalance: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  heroCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: SPACING.xs,
  },
  balanceSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceSheetCol: {
    flex: 1,
    alignItems: 'center',
  },
  balanceSheetDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  balanceSheetSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  balanceSheetVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeAccountBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: SPACING.sm,
    borderWidth: 1,
  },
  activeAccountBannerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  resetAccountLink: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  cashFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  cashFlowItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  savingsRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  rateText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
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
  filteredScopeLink: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cardElevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addSectionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  holdingsListCard: {
    padding: 0,
    overflow: 'hidden',
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  holdingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  holdingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingSymbol: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  assetClassTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  assetClassTagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  holdingName: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  holdingVal: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
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
    padding: 2,
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
    overflow: 'hidden',
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.lg,
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
    marginBottom: SPACING.md,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
});
