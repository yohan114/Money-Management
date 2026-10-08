import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { LoanStatus, IncomeStreamCategory } from '../../types';

const STREAM_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'cash',
  'briefcase',
  'leaf',
  'laptop',
  'home',
  'people',
  'cart',
  'trending-up',
  'gift',
  'storefront',
];

const STREAM_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const CATEGORY_LABELS: Record<IncomeStreamCategory, string> = {
  salary: 'Salary Job',
  friend_loan: 'Friend Loan',
  part_time: 'Part-Time / Gig',
  business: 'Business / Supply',
  rental: 'Rental Property',
  other: 'Other Inflow',
};

function getDueDateBadge(dueDateStr?: string) {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)}d`,
      color: COLORS.expense,
      bg: COLORS.expenseBg,
    };
  } else if (diffDays === 0) {
    return {
      text: 'Due Today',
      color: COLORS.warning,
      bg: COLORS.warningBg,
    };
  } else if (diffDays <= 7) {
    return {
      text: `Due in ${diffDays}d`,
      color: COLORS.warning,
      bg: COLORS.warningBg,
    };
  } else {
    return {
      text: `Due ${dueDateStr}`,
      color: COLORS.primaryLight,
      bg: COLORS.primaryGlow,
    };
  }
}

export default function LoansAndIncomeHub() {
  const router = useRouter();

  const {
    loans,
    incomeStreams,
    totalBorrowedDebt,
    upcomingLoanReminders,
    transactions,
    getAccountById,
    formatAmount,
    settings,
    selectedMonth,
    setSelectedMonth,
    addIncomeStream,
  } = useFinancial();

  // Active hub tab: 'loans' | 'income_streams'
  const [hubTab, setHubTab] = useState<'loans' | 'income_streams'>('loans');

  // Loans filter: 'all' | 'active' | 'paid_off'
  const [loanFilter, setLoanFilter] = useState<'all' | LoanStatus>('all');

  // Add Income Stream Modal State
  const [isAddStreamModalVisible, setIsAddStreamModalVisible] = useState(false);
  const [streamName, setStreamName] = useState('');
  const [streamCategory, setStreamCategory] = useState<IncomeStreamCategory>('business');
  const [streamTargetStr, setStreamTargetStr] = useState('');
  const [streamIcon, setStreamIcon] = useState<keyof typeof Ionicons.glyphMap>('briefcase');
  const [streamColor, setStreamColor] = useState('#10B981');

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

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    if (loanFilter === 'all') return loans;
    return loans.filter((l) => l.status === loanFilter);
  }, [loans, loanFilter]);

  // Income transactions for selected month
  const monthlyIncomes = useMemo(() => {
    return transactions.filter(
      (tx) => tx.type === 'income' && tx.date.startsWith(selectedMonth)
    );
  }, [transactions, selectedMonth]);

  const totalMonthlyInflow = useMemo(() => {
    return monthlyIncomes.reduce((sum, tx) => sum + tx.amount, 0);
  }, [monthlyIncomes]);

  // Compute breakdown for each income stream
  const streamBreakdowns = useMemo(() => {
    return incomeStreams.map((stream) => {
      const streamNameLower = stream.name.toLowerCase();
      const matchedTxs = monthlyIncomes.filter((tx) => {
        const noteLower = (tx.note || '').toLowerCase();
        const hasTag = (tx.tags || []).some((t) => t.toLowerCase().includes(streamNameLower));

        if (stream.category === 'salary') {
          return tx.categoryId === 'cat-salary' || noteLower.includes('salary');
        }
        if (stream.category === 'friend_loan') {
          return (
            tx.categoryId === 'cat-loans-inc' ||
            (tx.tags || []).includes('#loan-inflow') ||
            noteLower.includes('loan')
          );
        }
        if (stream.category === 'part_time') {
          return (
            noteLower.includes('part-time') ||
            noteLower.includes('gig') ||
            noteLower.includes('freelance') ||
            noteLower.includes(streamNameLower)
          );
        }
        if (stream.category === 'business') {
          return (
            noteLower.includes('business') ||
            noteLower.includes('supply') ||
            noteLower.includes('coconut') ||
            noteLower.includes(streamNameLower)
          );
        }
        if (stream.category === 'rental') {
          return noteLower.includes('rent') || noteLower.includes(streamNameLower);
        }
        return noteLower.includes(streamNameLower) || hasTag;
      });

      const totalEarned = matchedTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const target = stream.expectedMonthlyAmount || 0;
      const progress = target > 0 ? Math.min(100, Math.round((totalEarned / target) * 100)) : 0;

      return {
        stream,
        matchedTxs,
        totalEarned,
        target,
        progress,
        count: matchedTxs.length,
      };
    });
  }, [incomeStreams, monthlyIncomes]);

  // Handle Save New Income Stream
  const handleSaveStream = async () => {
    if (!streamName.trim()) {
      Alert.alert('Stream Name Required', 'Please enter a name for this income stream (e.g. Coconut Supply).');
      return;
    }

    const targetAmount = streamTargetStr ? parseFloat(streamTargetStr) : undefined;
    if (targetAmount !== undefined && (isNaN(targetAmount) || targetAmount < 0)) {
      Alert.alert('Invalid Target', 'Please enter a valid monthly expected amount or leave it blank.');
      return;
    }

    try {
      await addIncomeStream({
        name: streamName.trim(),
        category: streamCategory,
        expectedMonthlyAmount: targetAmount,
        icon: streamIcon,
        color: streamColor,
      });

      setIsAddStreamModalVisible(false);
      setStreamName('');
      setStreamTargetStr('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save income stream.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Income & Debts Hub</Text>
          <Text style={styles.headerSub}>Income Ledgers & Borrowed Loans</Text>
        </View>

        <Pressable
          style={styles.addLoanHeaderBtn}
          onPress={() => router.push('/modal/loan')}
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.addLoanHeaderBtnText}>Loan</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Summary Cards Row */}
        <View style={styles.kpiRow}>
          <Card elevated style={[styles.kpiCard, { borderColor: COLORS.expense + '40' }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: COLORS.expenseBg }]}>
              <Ionicons name="arrow-up-circle" size={18} color={COLORS.expense} />
            </View>
            <Text style={styles.kpiSub}>Active Debt</Text>
            <Text style={[styles.kpiAmount, { color: COLORS.expense }]}>
              {formatAmount(totalBorrowedDebt)}
            </Text>
            <Text style={styles.kpiHint}>
              {loans.filter((l) => l.status === 'active').length} active loan{loans.filter((l) => l.status === 'active').length === 1 ? '' : 's'}
            </Text>
          </Card>

          <Card elevated style={[styles.kpiCard, { borderColor: COLORS.income + '40' }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: COLORS.incomeBg }]}>
              <Ionicons name="arrow-down-circle" size={18} color={COLORS.income} />
            </View>
            <Text style={styles.kpiSub}>{monthDate.toLocaleDateString(undefined, { month: 'short' })} Inflow</Text>
            <Text style={[styles.kpiAmount, { color: COLORS.income }]}>
              {formatAmount(totalMonthlyInflow)}
            </Text>
            <Text style={styles.kpiHint}>
              {incomeStreams.length} income stream{incomeStreams.length === 1 ? '' : 's'}
            </Text>
          </Card>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tabButton, hubTab === 'loans' && styles.tabButtonActive]}
            onPress={() => setHubTab('loans')}
          >
            <Ionicons
              name="cash-outline"
              size={16}
              color={hubTab === 'loans' ? COLORS.primaryLight : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                hubTab === 'loans' && styles.tabButtonTextActive,
              ]}
            >
              Loans & Debts ({loans.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, hubTab === 'income_streams' && styles.tabButtonActive]}
            onPress={() => setHubTab('income_streams')}
          >
            <Ionicons
              name="pie-chart-outline"
              size={16}
              color={hubTab === 'income_streams' ? COLORS.primaryLight : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                hubTab === 'income_streams' && styles.tabButtonTextActive,
              ]}
            >
              Income Ledgers ({incomeStreams.length})
            </Text>
          </Pressable>
        </View>

        {/* ===================== TAB 1: LOANS & DEBTS ===================== */}
        {hubTab === 'loans' && (
          <View style={styles.tabSection}>
            {/* Filter Chips */}
            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterChip, loanFilter === 'all' && styles.filterChipActive]}
                onPress={() => setLoanFilter('all')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    loanFilter === 'all' && styles.filterChipTextActive,
                  ]}
                >
                  All ({loans.length})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, loanFilter === 'active' && styles.filterChipActive]}
                onPress={() => setLoanFilter('active')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    loanFilter === 'active' && styles.filterChipTextActive,
                  ]}
                >
                  Active ({loans.filter((l) => l.status === 'active').length})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, loanFilter === 'paid_off' && styles.filterChipActive]}
                onPress={() => setLoanFilter('paid_off')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    loanFilter === 'paid_off' && styles.filterChipTextActive,
                  ]}
                >
                  Paid Off ({loans.filter((l) => l.status === 'paid_off').length})
                </Text>
              </Pressable>
            </View>

            {/* Upcoming Due Date Reminders Banner */}
            {upcomingLoanReminders.length > 0 && (
              <View style={styles.reminderBanner}>
                <View style={styles.reminderHeader}>
                  <Ionicons name="notifications-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.reminderTitle}>Upcoming Payment Due Dates</Text>
                </View>
                {upcomingLoanReminders.slice(0, 3).map((ul) => {
                  const badge = getDueDateBadge(ul.dueDate);
                  const repaid = (ul.repayments || []).reduce((s, r) => s + r.amount, 0);
                  const remaining = Math.max(0, ul.totalAmount - repaid);
                  return (
                    <Pressable
                      key={ul.id}
                      style={styles.reminderItem}
                      onPress={() => router.push(`/loans/${ul.id}`)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reminderLender}>{ul.lenderName}</Text>
                        <Text style={styles.reminderAmount}>
                          Remaining: {formatAmount(remaining)}
                        </Text>
                      </View>
                      {badge && (
                        <View style={[styles.reminderBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.reminderBadgeText, { color: badge.color }]}>
                            {badge.text}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Loan Cards List */}
            {filteredLoans.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="cash-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Loans Recorded</Text>
                <Text style={styles.emptySub}>
                  Keep track of money borrowed from friends, family, or banks, track installments with receipt photos, and monitor outstanding debts.
                </Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => router.push('/modal/loan')}
                >
                  <Text style={styles.emptyActionBtnText}>+ Record First Loan</Text>
                </Pressable>
              </Card>
            ) : (
              filteredLoans.map((loan) => {
                const totalRepaid = (loan.repayments || []).reduce((s, r) => s + r.amount, 0);
                const remainingDebt = Math.max(0, loan.totalAmount - totalRepaid);
                const percentage = loan.totalAmount > 0 ? Math.min(100, Math.round((totalRepaid / loan.totalAmount) * 100)) : 0;
                const badge = getDueDateBadge(loan.dueDate);

                return (
                  <Pressable
                    key={loan.id}
                    onPress={() => router.push(`/loans/${loan.id}`)}
                  >
                    <Card style={styles.loanCard}>
                      <View style={styles.loanCardTop}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.lenderNameRow}>
                            <Text style={styles.loanLenderName}>{loan.lenderName}</Text>
                            <View style={styles.loanTypeBadge}>
                              <Text style={styles.loanTypeBadgeText}>{loan.type.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={styles.loanPurpose}>{loan.purpose}</Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.loanRemainingAmount, { color: remainingDebt === 0 ? COLORS.income : COLORS.expense }]}>
                            {remainingDebt === 0 ? 'PAID OFF' : formatAmount(remainingDebt)}
                          </Text>
                          <Text style={styles.loanTotalSub}>
                            of {formatAmount(loan.totalAmount)}
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.loanProgressBox}>
                        <ProgressBar
                          progress={percentage / 100}
                          color={remainingDebt === 0 ? COLORS.income : COLORS.primary}
                          height={6}
                        />
                      </View>

                      {/* Bottom Meta Row */}
                      <View style={styles.loanMetaRow}>
                        <Text style={styles.loanMetaRepaid}>
                          Repaid: {formatAmount(totalRepaid)} ({percentage}%)
                        </Text>

                        {badge && remainingDebt > 0 && (
                          <View style={[styles.loanDuePill, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.loanDuePillText, { color: badge.color }]}>
                              {badge.text}
                            </Text>
                          </View>
                        )}

                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                      </View>
                    </Card>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ===================== TAB 2: INCOME LEDGERS ===================== */}
        {hubTab === 'income_streams' && (
          <View style={styles.tabSection}>
            {/* Month Navigator Header */}
            <View style={styles.monthNavRow}>
              <Pressable style={styles.monthNavBtn} onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
              </Pressable>
              <Text style={styles.monthNavText}>{monthLabel}</Text>
              <Pressable style={styles.monthNavBtn} onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            {/* Income Streams Header with Add Button */}
            <View style={styles.streamsHeadingRow}>
              <View>
                <Text style={styles.streamsHeading}>Income Coming Methods</Text>
                <Text style={styles.streamsSubHeading}>
                  {formatAmount(totalMonthlyInflow)} total received in {monthLabel}
                </Text>
              </View>

              <Pressable
                style={styles.addStreamBtn}
                onPress={() => setIsAddStreamModalVisible(true)}
              >
                <Ionicons name="add" size={14} color="#FFF" />
                <Text style={styles.addStreamBtnText}>Add Stream</Text>
              </Pressable>
            </View>

            {/* Stream Cards */}
            {streamBreakdowns.map(({ stream, totalEarned, target, progress, count }) => {
              return (
                <Card key={stream.id} style={styles.streamCard}>
                  <View style={styles.streamTopRow}>
                    <View style={[styles.streamIconCircle, { backgroundColor: stream.color + '22' }]}>
                      <Ionicons
                        name={(stream.icon as any) || 'cash'}
                        size={20}
                        color={stream.color}
                      />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.streamName}>{stream.name}</Text>
                      <Text style={styles.streamCategoryLabel}>
                        {CATEGORY_LABELS[stream.category] || stream.category}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.streamAmount, { color: COLORS.income }]}>
                        {formatAmount(totalEarned)}
                      </Text>
                      <Text style={styles.streamTxCount}>
                        {count} transaction{count === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  {/* Expected Monthly Target Progress */}
                  {target > 0 && (
                    <View style={styles.streamProgressContainer}>
                      <View style={styles.streamProgressLabels}>
                        <Text style={styles.streamProgressTitle}>
                          Target: {formatAmount(target)}
                        </Text>
                        <Text style={[styles.streamProgressPercent, { color: stream.color }]}>
                          {progress}%
                        </Text>
                      </View>
                      <ProgressBar
                        progress={progress / 100}
                        color={stream.color}
                        height={5}
                      />
                    </View>
                  )}
                </Card>
              );
            })}

            {/* Recent Inflow Transactions for the Month */}
            <View style={styles.recentInflowSection}>
              <Text style={styles.recentInflowTitle}>Inflows Received in {monthLabel}</Text>
              {monthlyIncomes.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptySub}>No income transactions recorded for this month.</Text>
                </Card>
              ) : (
                monthlyIncomes.map((tx) => {
                  const acc = getAccountById(tx.accountId);
                  return (
                    <Pressable
                      key={tx.id}
                      onPress={() => router.push(`/modal/transaction?id=${tx.id}`)}
                    >
                      <Card style={styles.inflowTxCard}>
                        <View style={styles.inflowTxLeft}>
                          <View style={[styles.inflowTxIconBox, { backgroundColor: COLORS.incomeBg }]}>
                            <Ionicons name="arrow-down" size={16} color={COLORS.income} />
                          </View>
                          <View>
                            <Text style={styles.inflowTxNote}>{tx.note || 'Income Inflow'}</Text>
                            <Text style={styles.inflowTxMeta}>
                              {new Date(tx.date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              {acc ? `• ${acc.name}` : ''}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.inflowTxAmount, { color: COLORS.income }]}>
                          +{formatAmount(tx.amount)}
                        </Text>
                      </Card>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL: ADD INCOME STREAM */}
      <Modal
        visible={isAddStreamModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddStreamModalVisible(false)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Income Stream / Method</Text>
              <Pressable
                onPress={() => setIsAddStreamModalVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Stream Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Coconut Supply, Freelance Design, Rent"
                placeholderTextColor={COLORS.textMuted}
                value={streamName}
                onChangeText={setStreamName}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.streamCatGrid}>
                {(Object.keys(CATEGORY_LABELS) as IncomeStreamCategory[]).map((cat) => {
                  const isSelected = streamCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.streamCatChip,
                        isSelected && styles.streamCatChipActive,
                      ]}
                      onPress={() => setStreamCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.streamCatChipText,
                          isSelected && styles.streamCatChipTextActive,
                        ]}
                      >
                        {CATEGORY_LABELS[cat]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Expected Monthly Target ({settings.currencySymbol})</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Optional (e.g. 150000)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={streamTargetStr}
                onChangeText={setStreamTargetStr}
              />

              <Text style={styles.inputLabel}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {STREAM_ICONS.map((ic) => {
                  const isSelected = streamIcon === ic;
                  return (
                    <Pressable
                      key={ic}
                      style={[
                        styles.iconPickerChip,
                        isSelected && { borderColor: streamColor, backgroundColor: streamColor + '25' },
                      ]}
                      onPress={() => setStreamIcon(ic)}
                    >
                      <Ionicons
                        name={ic}
                        size={20}
                        color={isSelected ? streamColor : COLORS.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Theme Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {STREAM_COLORS.map((col) => {
                  const isSelected = streamColor === col;
                  return (
                    <Pressable
                      key={col}
                      style={[
                        styles.colorPickerChip,
                        { backgroundColor: col },
                        isSelected && styles.colorPickerChipSelected,
                      ]}
                      onPress={() => setStreamColor(col)}
                    />
                  );
                })}
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.submitModalBtn, pressed && { opacity: 0.85 }]}
                onPress={handleSaveStream}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.submitModalBtnText}>Save Income Stream</Text>
              </Pressable>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  addLoanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  addLoanHeaderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  kpiCard: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.lg,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiAmount: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiHint: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  tabButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  tabSection: {
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.borderHighlight,
  },
  filterChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  reminderBanner: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    padding: 12,
    gap: 8,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderTitle: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.warning + '20',
  },
  reminderLender: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  reminderAmount: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  reminderBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  reminderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  emptyActionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loanCard: {
    padding: 14,
    gap: 10,
  },
  loanCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lenderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loanLenderName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  loanTypeBadge: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
  },
  loanTypeBadgeText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  loanPurpose: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  loanRemainingAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  loanTotalSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  loanProgressBox: {
    marginVertical: 2,
  },
  loanMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loanMetaRepaid: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  loanDuePill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
  },
  loanDuePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  streamsHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  streamsHeading: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  streamsSubHeading: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  addStreamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  addStreamBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  streamCard: {
    padding: 14,
    gap: 10,
  },
  streamTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  streamCategoryLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  streamAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  streamTxCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  streamProgressContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    gap: 6,
  },
  streamProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streamProgressTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  streamProgressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  recentInflowSection: {
    marginTop: 12,
    gap: 8,
  },
  recentInflowTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  inflowTxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  inflowTxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  inflowTxIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inflowTxNote: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  inflowTxMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  inflowTxAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  streamCatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  streamCatChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  streamCatChipActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.borderHighlight,
  },
  streamCatChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  streamCatChipTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  iconPickerChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  colorPickerChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  colorPickerChipSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  submitModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    marginTop: 10,
    marginBottom: 10,
  },
  submitModalBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
