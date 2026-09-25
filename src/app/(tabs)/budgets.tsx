import React from 'react';
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
import { BudgetCard } from '../../components/BudgetCard';
import { ProgressBar } from '../../components/ProgressBar';

export default function BudgetsScreen() {
  const router = useRouter();
  const {
    budgets,
    deleteBudget,
    selectedMonth,
    getCategorySpentForMonth,
    formatAmount,
  } = useFinancial();

  // Calculate total allocated vs total spent across all budgets
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalBudgetSpent = budgets.reduce(
    (sum, b) => sum + getCategorySpentForMonth(b.categoryId, selectedMonth),
    0
  );
  const overallPercentage =
    totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;
  const remainingBudget = totalBudgetLimit - totalBudgetSpent;

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Monthly Budgets</Text>
            <Text style={styles.subtitle}>Track spending limits & goals</Text>
          </View>

          <Pressable
            style={styles.addBtn}
            onPress={() => router.push('/modal/budget')}
            accessibilityRole="button"
            accessibilityLabel="Add Budget"
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>New Budget</Text>
          </Pressable>
        </View>

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
                    overallPercentage >= 100
                      ? COLORS.expenseBg
                      : overallPercentage >= 80
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
                      overallPercentage >= 100
                        ? COLORS.expense
                        : overallPercentage >= 80
                        ? COLORS.warning
                        : COLORS.income,
                  },
                ]}
              >
                {overallPercentage >= 100
                  ? 'Exceeded'
                  : overallPercentage >= 80
                  ? '80%+ Used'
                  : 'Healthy'}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <ProgressBar progress={overallPercentage} height={10} style={styles.summaryProgress} />

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
              <Ionicons name="flag-outline" size={38} color={COLORS.textMuted} />
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
});
