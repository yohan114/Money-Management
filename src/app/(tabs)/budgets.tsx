import React, { useState } from 'react';
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
import { BudgetCard } from '../../components/BudgetCard';
import { ProgressBar } from '../../components/ProgressBar';
import { FinancialGoal } from '../../types';

export default function BudgetsScreen() {
  const router = useRouter();
  const {
    budgets,
    deleteBudget,
    goals,
    deleteGoal,
    contributeToGoal,
    accounts,
    selectedMonth,
    getCategorySpentForMonth,
    formatAmount,
    settings,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets');

  // Contribute Modal State (Cross-Platform Android & iOS)
  const [contributeTargetGoal, setContributeTargetGoal] = useState<FinancialGoal | null>(null);
  const [contributionAmountStr, setContributionAmountStr] = useState('');

  // Calculate total allocated vs total spent across all budgets
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalBudgetSpent = budgets.reduce(
    (sum, b) => sum + getCategorySpentForMonth(b.categoryId, selectedMonth),
    0
  );
  const overallBudgetPercentage =
    totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;
  const remainingBudget = totalBudgetLimit - totalBudgetSpent;

  // Goals Aggregation
  const totalGoalsTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalGoalsSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallGoalsPercentage =
    totalGoalsTarget > 0 ? Math.min(100, (totalGoalsSaved / totalGoalsTarget) * 100) : 0;
  const completedGoalsCount = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  const handleDeleteBudget = (id: string, name: string) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteBudget(id) },
      ]
    );
  };

  const handleDeleteGoal = (id: string, title: string) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete the financial goal "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) },
      ]
    );
  };

  const handleOpenContribute = (goal: FinancialGoal) => {
    setContributeTargetGoal(goal);
    setContributionAmountStr('');
  };

  const handleConfirmContribute = async () => {
    if (!contributeTargetGoal) return;
    const amount = parseFloat(contributionAmountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to contribute.');
      return;
    }

    await contributeToGoal(contributeTargetGoal.id, amount);
    setContributeTargetGoal(null);
    setContributionAmountStr('');
    Alert.alert(
      'Contribution Saved',
      `Successfully added ${formatAmount(amount)} towards "${contributeTargetGoal.title}"!`
    );
  };

  // Helper for goal remaining time & monthly savings pace
  const getGoalPace = (goal: FinancialGoal) => {
    const today = new Date();
    const target = new Date(goal.targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.max(1, Math.round(diffDays / 30.4));

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const monthlyNeeded = remainingAmount > 0 ? Math.round(remainingAmount / diffMonths) : 0;

    return {
      diffDays,
      diffMonths,
      remainingAmount,
      monthlyNeeded,
      isExpired: diffDays < 0,
      isCompleted: goal.currentAmount >= goal.targetAmount,
    };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Segmented Selector */}
        <View style={styles.segmentedContainer}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'budgets' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('budgets')}
          >
            <Ionicons
              name="pie-chart"
              size={16}
              color={activeTab === 'budgets' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'budgets' && styles.segmentBtnTextActive,
              ]}
            >
              Monthly Budgets ({budgets.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, activeTab === 'goals' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('goals')}
          >
            <Ionicons
              name="flag"
              size={16}
              color={activeTab === 'goals' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'goals' && styles.segmentBtnTextActive,
              ]}
            >
              Financial Goals ({goals.length})
            </Text>
          </Pressable>
        </View>

        {/* Header with Title and Add Button */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {activeTab === 'budgets' ? 'Monthly Budgets' : 'Financial Goals'}
            </Text>
            <Text style={styles.subtitle}>
              {activeTab === 'budgets'
                ? 'Track spending limits & caps'
                : 'Monarch target planning & milestones'}
            </Text>
          </View>

          <Pressable
            style={styles.addBtn}
            onPress={() =>
              activeTab === 'budgets'
                ? router.push('/modal/budget')
                : router.push('/modal/goal')
            }
            accessibilityRole="button"
            accessibilityLabel={activeTab === 'budgets' ? 'Add Budget' : 'Add Goal'}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>
              {activeTab === 'budgets' ? 'New Budget' : 'New Goal'}
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: MONTHLY BUDGETS VIEW */}
        {activeTab === 'budgets' && (
          <>
            {/* Overall Budget Summary Card */}
            <Card elevated highlight style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={styles.summaryLabel}>Total Allocated Budget</Text>
                  <Text style={styles.summaryLimit}>{formatAmount(totalBudgetLimit)}</Text>
                </View>
                <View
                  style={[
                    styles.summaryBadge,
                    {
                      backgroundColor:
                        overallBudgetPercentage >= 100
                          ? COLORS.expenseBg
                          : overallBudgetPercentage >= 80
                          ? COLORS.warningBg
                          : COLORS.incomeBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryBadgeText,
                      {
                        color:
                          overallBudgetPercentage >= 100
                            ? COLORS.expense
                            : overallBudgetPercentage >= 80
                            ? COLORS.warning
                            : COLORS.income,
                      },
                    ]}
                  >
                    {overallBudgetPercentage >= 100
                      ? 'Exceeded'
                      : overallBudgetPercentage >= 80
                      ? '80%+ Used'
                      : 'Healthy'}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <ProgressBar
                progress={overallBudgetPercentage}
                height={10}
                style={styles.summaryProgress}
              />

              <View style={styles.summaryFooter}>
                <View>
                  <Text style={styles.footerLabel}>Spent so far</Text>
                  <Text style={styles.footerValue}>{formatAmount(totalBudgetSpent)}</Text>
                </View>

                <View style={styles.alignRight}>
                  <Text style={styles.footerLabel}>
                    {remainingBudget >= 0 ? 'Remaining' : 'Over budget'}
                  </Text>
                  <Text
                    style={[
                      styles.footerValue,
                      { color: remainingBudget < 0 ? COLORS.expense : COLORS.income },
                    ]}
                  >
                    {formatAmount(Math.abs(remainingBudget))}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Category Budgets List */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Category Limits ({budgets.length})</Text>

              {budgets.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons name="pie-chart-outline" size={38} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No budgets configured</Text>
                  <Text style={styles.emptySubtitle}>
                    Create category spending caps to keep your expenditures in check.
                  </Text>
                  <Pressable
                    style={styles.emptyBtn}
                    onPress={() => router.push('/modal/budget')}
                  >
                    <Text style={styles.emptyBtnText}>Create Your First Budget</Text>
                  </Pressable>
                </Card>
              ) : (
                budgets.map((b) => (
                  <BudgetCard
                    key={b.id}
                    budget={b}
                    onDelete={() => handleDeleteBudget(b.id, 'this category')}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* TAB 2: FINANCIAL GOALS VIEW */}
        {activeTab === 'goals' && (
          <>
            {/* Overall Goals Summary Card */}
            <Card elevated highlight style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={styles.summaryLabel}>Total Goals Target</Text>
                  <Text style={styles.summaryLimit}>{formatAmount(totalGoalsTarget)}</Text>
                </View>
                <View
                  style={[
                    styles.summaryBadge,
                    {
                      backgroundColor:
                        overallGoalsPercentage >= 100 ? COLORS.incomeBg : COLORS.primaryGlow,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryBadgeText,
                      {
                        color:
                          overallGoalsPercentage >= 100
                            ? COLORS.income
                            : COLORS.primaryLight,
                      },
                    ]}
                  >
                    {completedGoalsCount}/{goals.length} Completed
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <ProgressBar
                progress={overallGoalsPercentage}
                color={COLORS.income}
                height={10}
                style={styles.summaryProgress}
              />

              <View style={styles.summaryFooter}>
                <View>
                  <Text style={styles.footerLabel}>Total Accumulated</Text>
                  <Text style={[styles.footerValue, { color: COLORS.income }]}>
                    {formatAmount(totalGoalsSaved)}
                  </Text>
                </View>

                <View style={styles.alignRight}>
                  <Text style={styles.footerLabel}>Remaining to Target</Text>
                  <Text style={styles.footerValue}>
                    {formatAmount(Math.max(0, totalGoalsTarget - totalGoalsSaved))}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Goals List */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Your Goals ({goals.length})</Text>

              {goals.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons name="flag-outline" size={38} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No financial goals yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Plan targets like an Emergency Fund, Vacation, Car, or Real Estate.
                  </Text>
                  <Pressable
                    style={styles.emptyBtn}
                    onPress={() => router.push('/modal/goal')}
                  >
                    <Text style={styles.emptyBtnText}>Create Your First Goal</Text>
                  </Pressable>
                </Card>
              ) : (
                goals.map((goal) => {
                  const pace = getGoalPace(goal);
                  const progressPct =
                    goal.targetAmount > 0
                      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                      : 0;
                  const linkedAccount = accounts.find((a) => a.id === goal.linkedAccountId);

                  return (
                    <Card key={goal.id} style={styles.goalCard}>
                      {/* Top Row: Icon, Title, and Action buttons */}
                      <View style={styles.goalHeaderRow}>
                        <View style={styles.goalTitleWrap}>
                          <View
                            style={[
                              styles.goalIconCircle,
                              { backgroundColor: goal.color + '20', borderColor: goal.color },
                            ]}
                          >
                            <Ionicons
                              name={(goal.icon as any) || 'flag'}
                              size={20}
                              color={goal.color}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.goalTitle}>{goal.title}</Text>
                            <Text style={styles.goalTargetDate}>
                              Target: {goal.targetDate}
                              {pace.isCompleted
                                ? ' • Achieved! 🎉'
                                : pace.diffDays > 0
                                ? ` • ${pace.diffDays} days left`
                                : ' • Past target date'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.goalActionsRow}>
                          <Pressable
                            style={styles.goalActionBtn}
                            onPress={() =>
                              router.push({
                                pathname: '/modal/goal',
                                params: { id: goal.id },
                              })
                            }
                            hitSlop={8}
                          >
                            <Ionicons name="pencil" size={16} color={COLORS.textMuted} />
                          </Pressable>
                          <Pressable
                            style={styles.goalActionBtn}
                            onPress={() => handleDeleteGoal(goal.id, goal.title)}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <ProgressBar
                        progress={progressPct}
                        color={goal.color}
                        height={8}
                        style={styles.goalProgress}
                      />

                      {/* Saved vs Target Values */}
                      <View style={styles.goalValuesRow}>
                        <View>
                          <Text style={styles.goalValueLabel}>Saved</Text>
                          <Text style={[styles.goalSavedAmount, { color: goal.color }]}>
                            {formatAmount(goal.currentAmount)}
                          </Text>
                        </View>
                        <View style={styles.alignRight}>
                          <Text style={styles.goalValueLabel}>Target</Text>
                          <Text style={styles.goalTargetAmount}>
                            {formatAmount(goal.targetAmount)} ({progressPct.toFixed(0)}%)
                          </Text>
                        </View>
                      </View>

                      {/* Footer Row: Monthly Pace & Quick Contribute Button */}
                      <View style={styles.goalFooterRow}>
                        <View style={{ flex: 1 }}>
                          {!pace.isCompleted && pace.monthlyNeeded > 0 && (
                            <View style={styles.paceBadge}>
                              <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                              <Text style={styles.paceText}>
                                Save ~{formatAmount(pace.monthlyNeeded)}/mo to reach on time
                              </Text>
                            </View>
                          )}
                          {linkedAccount && (
                            <Text style={styles.linkedAccText}>
                              Linked: {linkedAccount.name}
                            </Text>
                          )}
                        </View>

                        <Pressable
                          style={[styles.contributeBtn, { backgroundColor: goal.color }]}
                          onPress={() => handleOpenContribute(goal)}
                        >
                          <Ionicons name="add" size={14} color="#FFF" />
                          <Text style={styles.contributeBtnText}>Add Funds</Text>
                        </Pressable>
                      </View>
                    </Card>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Cross-Platform Quick Contribute Modal */}
      <Modal
        visible={!!contributeTargetGoal}
        transparent
        animationType="fade"
        onRequestClose={() => setContributeTargetGoal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setContributeTargetGoal(null)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Contribute to Goal</Text>
                <Text style={styles.modalSubtitle}>
                  {contributeTargetGoal?.title}
                </Text>
              </View>
              <Pressable
                onPress={() => setContributeTargetGoal(null)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>
              Amount to Add ({settings.currencySymbol})
            </Text>
            <TextInput
              style={styles.amountInput}
              placeholder="e.g. 5000"
              placeholderTextColor={COLORS.textMuted}
              value={contributionAmountStr}
              onChangeText={setContributionAmountStr}
              keyboardType="numeric"
              autoFocus
            />

            {/* Quick Amount Chips */}
            <View style={styles.quickChipsRow}>
              {[500, 1000, 5000, 10000, 50000].map((val) => (
                <Pressable
                  key={val}
                  style={styles.quickChip}
                  onPress={() => setContributionAmountStr(val.toString())}
                >
                  <Text style={styles.quickChipText}>+{val.toLocaleString()}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.confirmContributeBtn}
              onPress={handleConfirmContribute}
            >
              <Ionicons name="sparkles" size={18} color="#FFF" />
              <Text style={styles.confirmContributeText}>Confirm Contribution</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  summaryLimit: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryProgress: {
    marginVertical: SPACING.md,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  footerValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  listSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: SPACING.sm,
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
    marginBottom: SPACING.md,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  goalCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  goalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goalIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  goalTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  goalTargetDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  goalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalActionBtn: {
    padding: 6,
  },
  goalProgress: {
    marginVertical: SPACING.sm,
  },
  goalValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  goalValueLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  goalSavedAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  goalTargetAmount: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  goalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paceText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  linkedAccText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  contributeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  contributeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: COLORS.primaryLight,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  amountInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  quickChip: {
    backgroundColor: COLORS.cardElevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  confirmContributeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  confirmContributeText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
