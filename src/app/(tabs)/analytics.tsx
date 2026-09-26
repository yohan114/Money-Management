import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { SpendingDonutChart } from '../../components/SpendingDonutChart';
import { CashFlowBarChart } from '../../components/CashFlowBarChart';
import { ProgressBar } from '../../components/ProgressBar';

export default function AnalyticsScreen() {
  const router = useRouter();
  const {
    monthlyExpense,
    categorySpending,
    cashFlowHistory,
    cashFlowForecast,
    totalAssets,
    settings,
    formatAmount,
    selectedMonth,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'category' | 'trends' | 'forecast'>('category');

  // Days in selected month for average calculation
  const averageDailySpend = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return daysInMonth > 0 ? monthlyExpense / daysInMonth : 0;
  }, [selectedMonth, monthlyExpense]);

  // Top spending category
  const topCategory = categorySpending.length > 0 ? categorySpending[0] : null;

  // Forecast Metrics
  const startingBalance = totalAssets;
  const endProjectedBalance =
    cashFlowForecast.length > 0
      ? cashFlowForecast[cashFlowForecast.length - 1].projectedBalance
      : startingBalance;
  const projectedNetChange = endProjectedBalance - startingBalance;
  const totalForecastInflow = cashFlowForecast.reduce((sum, d) => sum + d.incoming, 0);
  const totalForecastOutflow = cashFlowForecast.reduce((sum, d) => sum + d.outgoing, 0);
  const forecastEventDays = cashFlowForecast.filter((d) => d.events.length > 0);

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

        {/* Tab Switcher (Monarch 3-way segmented control) */}
        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'category' && styles.tabBtnActive]}
            onPress={() => setActiveTab('category')}
          >
            <Ionicons
              name="pie-chart"
              size={15}
              color={activeTab === 'category' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'category' && styles.tabBtnTextActive]}
            >
              Categories
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'trends' && styles.tabBtnActive]}
            onPress={() => setActiveTab('trends')}
          >
            <Ionicons
              name="bar-chart"
              size={15}
              color={activeTab === 'trends' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'trends' && styles.tabBtnTextActive]}
            >
              6M Trends
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'forecast' && styles.tabBtnActive]}
            onPress={() => setActiveTab('forecast')}
          >
            <Ionicons
              name="trending-up"
              size={15}
              color={activeTab === 'forecast' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'forecast' && styles.tabBtnTextActive]}
            >
              30D Forecast
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: CATEGORY BREAKDOWN */}
        {activeTab === 'category' && (
          <>
            <Card elevated style={styles.chartCard}>
              <Text style={styles.chartTitle}>Spending by Category</Text>
              <SpendingDonutChart
                data={categorySpending}
                totalExpense={monthlyExpense}
                currencySymbol={settings.currencySymbol}
                size={210}
              />
            </Card>

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
                        <Text style={styles.catTotal}>{formatAmount(item.total)}</Text>
                        <Text style={styles.catPercentage}>
                          {item.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>

                    <ProgressBar
                      progress={item.percentage}
                      color={item.category.color}
                      height={6}
                      style={{ marginTop: SPACING.sm }}
                    />
                  </Card>
                ))
              )}
            </View>
          </>
        )}

        {/* TAB 2: 6-MONTH TRENDS */}
        {activeTab === 'trends' && (
          <>
            <Card elevated style={styles.chartCard}>
              <Text style={styles.chartTitle}>Income vs Expense Trend</Text>
              <Text style={styles.chartSubtitle}>Comparison across past 6 months</Text>
              <CashFlowBarChart
                data={cashFlowHistory}
                currencySymbol={settings.currencySymbol}
                height={200}
              />
            </Card>

            <View style={styles.breakdownSection}>
              <Text style={styles.sectionHeaderTitle}>Monthly Net Summaries</Text>
              {cashFlowHistory.map((item) => {
                const net = item.income - item.expense;
                return (
                  <Card key={item.monthKey} style={styles.trendRow}>
                    <View>
                      <Text style={styles.trendMonth}>{item.label} ({item.monthKey})</Text>
                      <Text style={styles.trendDetails}>
                        In: {formatAmount(item.income)} • Out: {formatAmount(item.expense)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.trendNet,
                        { color: net >= 0 ? COLORS.income : COLORS.expense },
                      ]}
                    >
                      {formatAmount(net, { showSign: true })}
                    </Text>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* TAB 3: MONARCH 30-DAY CASH FLOW FORECAST */}
        {activeTab === 'forecast' && (
          <>
            {/* Forecast Hero Card */}
            <Card elevated highlight style={styles.forecastHeroCard}>
              <View style={styles.forecastHeader}>
                <View>
                  <Text style={styles.forecastLabel}>Projected Balance in 30 Days</Text>
                  <Text style={styles.forecastValue}>
                    {formatAmount(endProjectedBalance)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.forecastBadge,
                    {
                      backgroundColor:
                        projectedNetChange >= 0 ? COLORS.incomeBg : COLORS.expenseBg,
                    },
                  ]}
                >
                  <Ionicons
                    name={projectedNetChange >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={projectedNetChange >= 0 ? COLORS.income : COLORS.expense}
                  />
                  <Text
                    style={[
                      styles.forecastBadgeText,
                      {
                        color:
                          projectedNetChange >= 0 ? COLORS.income : COLORS.expense,
                      },
                    ]}
                  >
                    {projectedNetChange >= 0 ? 'Surplus' : 'Deficit'}
                  </Text>
                </View>
              </View>

              {/* Trajectory Breakdown */}
              <View style={styles.forecastTrajectoryRow}>
                <View style={styles.forecastCol}>
                  <Text style={styles.forecastSub}>Current Assets</Text>
                  <Text style={styles.forecastAmount}>{formatAmount(startingBalance)}</Text>
                </View>
                <View style={styles.forecastArrowCol}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
                </View>
                <View style={styles.forecastCol}>
                  <Text style={styles.forecastSub}>Expected Inflows</Text>
                  <Text style={[styles.forecastAmount, { color: COLORS.income }]}>
                    +{formatAmount(totalForecastInflow)}
                  </Text>
                </View>
                <View style={styles.forecastArrowCol}>
                  <Ionicons name="remove" size={16} color={COLORS.textMuted} />
                </View>
                <View style={styles.forecastCol}>
                  <Text style={styles.forecastSub}>Expected Bills</Text>
                  <Text style={[styles.forecastAmount, { color: COLORS.expense }]}>
                    -{formatAmount(totalForecastOutflow)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Scheduled Cash Flow Events */}
            <View style={styles.breakdownSection}>
              <View style={styles.forecastSectionHeader}>
                <Text style={styles.sectionHeaderTitle}>
                  Upcoming 30-Day Cash Events ({forecastEventDays.length})
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/recurring')}>
                  <Text style={styles.manageBillsLink}>Manage Bills</Text>
                </Pressable>
              </View>

              {forecastEventDays.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={36} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No scheduled recurring events</Text>
                  <Text style={styles.emptySubtitle}>
                    Add recurring salary, rent, and subscriptions to generate dynamic daily forecasts.
                  </Text>
                  <Pressable
                    style={styles.emptyForecastBtn}
                    onPress={() => router.push('/modal/recurring')}
                  >
                    <Text style={styles.emptyForecastBtnText}>Add Recurring Item</Text>
                  </Pressable>
                </Card>
              ) : (
                forecastEventDays.map((item) => (
                  <Card key={item.date} style={styles.forecastEventCard}>
                    <View style={styles.forecastEventHeader}>
                      <View style={styles.forecastDateBadge}>
                        <Ionicons name="calendar" size={12} color={COLORS.primaryLight} />
                        <Text style={styles.forecastDateText}>{item.date}</Text>
                        <Text style={styles.forecastDayNum}>Day +{item.dayNum}</Text>
                      </View>
                      <Text style={styles.forecastRollingBalance}>
                        Est. Balance: {formatAmount(item.projectedBalance)}
                      </Text>
                    </View>

                    {item.events.map((evt, idx) => {
                      const isIncome = evt.startsWith('Income');
                      return (
                        <View key={idx} style={styles.eventRow}>
                          <Ionicons
                            name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                            size={16}
                            color={isIncome ? COLORS.income : COLORS.expense}
                          />
                          <Text style={styles.eventText}>{evt}</Text>
                          <Text
                            style={[
                              styles.eventAmount,
                              { color: isIncome ? COLORS.income : COLORS.expense },
                            ]}
                          >
                            {isIncome
                              ? `+${formatAmount(item.incoming)}`
                              : `-${formatAmount(item.outgoing)}`}
                          </Text>
                        </View>
                      );
                    })}
                  </Card>
                ))
              )}
            </View>
          </>
        )}
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
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  chartCard: {
    alignItems: 'center',
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
    marginBottom: SPACING.md,
  },
  insightCard: {
    backgroundColor: COLORS.cardElevated,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
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
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  catRight: {
    alignItems: 'flex-end',
  },
  catTotal: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  catPercentage: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  trendMonth: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  trendDetails: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  trendNet: {
    fontSize: 15,
    fontWeight: '700',
  },
  forecastHeroCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  forecastLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  forecastValue: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  forecastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  forecastBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  forecastTrajectoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  forecastCol: {
    flex: 1,
    alignItems: 'center',
  },
  forecastArrowCol: {
    paddingHorizontal: 4,
  },
  forecastSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  forecastAmount: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  forecastSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  manageBillsLink: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  forecastEventCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  forecastEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  forecastDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastDateText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  forecastDayNum: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  forecastRollingBalance: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  eventText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  eventAmount: {
    fontSize: 13,
    fontWeight: '700',
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
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  emptyForecastBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  emptyForecastBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
