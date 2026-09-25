import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { SpendingDonutChart } from '../../components/SpendingDonutChart';
import { CashFlowBarChart } from '../../components/CashFlowBarChart';
import { ProgressBar } from '../../components/ProgressBar';

export default function AnalyticsScreen() {
  const {
    monthlyExpense,
    monthlyIncome,
    categorySpending,
    cashFlowHistory,
    settings,
    formatAmount,
    selectedMonth,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'category' | 'cashflow'>('category');

  // Days in selected month for average calculation
  const averageDailySpend = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return daysInMonth > 0 ? monthlyExpense / daysInMonth : 0;
  }, [selectedMonth, monthlyExpense]);

  // Top spending category
  const topCategory = categorySpending.length > 0 ? categorySpending[0] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Financial Insights</Text>
          <Text style={styles.subtitle}>Analysis for {selectedMonth}</Text>
        </View>

        {/* Overview Stat Cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.expenseBg }]}>
              <Ionicons name="arrow-up" size={16} color={COLORS.expense} />
            </View>
            <Text style={styles.statLabel}>Total Outflow</Text>
            <Text style={[styles.statValue, { color: COLORS.expense }]}>
              {formatAmount(monthlyExpense)}
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryGlow }]}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primaryLight} />
            </View>
            <Text style={styles.statLabel}>Daily Average</Text>
            <Text style={styles.statValue}>{formatAmount(averageDailySpend)}</Text>
          </Card>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'category' && styles.tabBtnActive]}
            onPress={() => setActiveTab('category')}
          >
            <Ionicons
              name="pie-chart"
              size={16}
              color={activeTab === 'category' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'category' && styles.tabBtnTextActive]}
            >
              Category Breakdown
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'cashflow' && styles.tabBtnActive]}
            onPress={() => setActiveTab('cashflow')}
          >
            <Ionicons
              name="bar-chart"
              size={16}
              color={activeTab === 'cashflow' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'cashflow' && styles.tabBtnTextActive]}
            >
              6-Month Trend
            </Text>
          </Pressable>
        </View>

        {/* Main Chart Card */}
        {activeTab === 'category' ? (
          <Card elevated style={styles.chartCard}>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <SpendingDonutChart
              data={categorySpending}
              totalExpense={monthlyExpense}
              currencySymbol={settings.currencySymbol}
              size={210}
            />
          </Card>
        ) : (
          <Card elevated style={styles.chartCard}>
            <Text style={styles.chartTitle}>Income vs Expense Trend</Text>
            <Text style={styles.chartSubtitle}>Comparison across past 6 months</Text>
            <CashFlowBarChart
              data={cashFlowHistory}
              currencySymbol={settings.currencySymbol}
              height={200}
            />
          </Card>
        )}

        {/* Insight Highlight Banner */}
        {topCategory && (
          <Card style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
              <Text style={styles.insightTitle}>Key Spending Insight</Text>
            </View>
            <Text style={styles.insightText}>
              Your highest expenditure this period is{' '}
              <Text style={styles.insightHighlight}>{topCategory.category.name}</Text> at{' '}
              <Text style={styles.insightHighlight}>
                {formatAmount(topCategory.total)}
              </Text>{' '}
              ({topCategory.percentage.toFixed(0)}% of total outflows).
            </Text>
          </Card>
        )}

        {/* Detailed Category Breakdown List */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionHeaderTitle}>Expense Details</Text>

          {categorySpending.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No expenses logged for this month</Text>
            </Card>
          ) : (
            categorySpending.map((item) => (
              <Card key={item.category.id} style={styles.categorySpendRow}>
                <View style={styles.catHeader}>
                  <View style={styles.catLeft}>
                    <View
                      style={[
                        styles.catIconWrap,
                        { backgroundColor: item.category.color + '25' },
                      ]}
                    >
                      <Ionicons
                        name={(item.category.icon as any) || 'pricetag'}
                        size={18}
                        color={item.category.color}
                      />
                    </View>
                    <Text style={styles.catName}>{item.category.name}</Text>
                  </View>

                  <View style={styles.catRight}>
                    <Text style={styles.catAmount}>{formatAmount(item.total)}</Text>
                    <Text style={styles.catPercent}>{item.percentage.toFixed(1)}%</Text>
                  </View>
                </View>

                {/* Percentage progress bar */}
                <ProgressBar
                  progress={item.percentage}
                  color={item.category.color}
                  height={6}
                  style={styles.catProgress}
                />
              </Card>
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
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  chartCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  chartTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  insightCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: SPACING.lg,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  insightTitle: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  insightHighlight: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  breakdownSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeaderTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  categorySpendRow: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  catIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  catRight: {
    alignItems: 'flex-end',
  },
  catAmount: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  catPercent: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  catProgress: {
    marginTop: SPACING.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
