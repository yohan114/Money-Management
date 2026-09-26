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
import { BillReminderCard } from '../../components/BillReminderCard';
import { RecurringItem } from '../../types';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function RecurringScreen() {
  const router = useRouter();
  const {
    recurringItems,
    payRecurringItem,
    deleteRecurringItem,
    formatAmount,
    selectedMonth,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  // Total recurring commitments per month
  const totalMonthlyCommitments = recurringItems
    .filter((item) => item.active && item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalRecurringIncome = recurringItems
    .filter((item) => item.active && item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);

  const handlePay = (id: string, title: string) => {
    payRecurringItem(id);
    Alert.alert('Payment Recorded', `Payment for ${title} has been logged.`);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Recurring Bill',
      `Are you sure you want to delete ${title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRecurringItem(id) },
      ]
    );
  };

  // Calendar calculations for selected month
  const calendarData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    // Map bills to due days
    const billsByDay: Record<number, RecurringItem[]> = {};
    recurringItems.forEach((item) => {
      if (item.active) {
        const day = Math.min(item.dueDay, daysInMonth);
        if (!billsByDay[day]) {
          billsByDay[day] = [];
        }
        billsByDay[day].push(item);
      }
    });

    const cells: ({ day: number; isCurrentMonth: boolean; items: RecurringItem[] } | null)[] = [];

    // Leading empty cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }

    // Days in month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        items: billsByDay[d] || [],
      });
    }

    return {
      cells,
      billsByDay,
      daysInMonth,
    };
  }, [selectedMonth, recurringItems]);

  // Selected calendar day items or all calendar items
  const calendarFilteredItems = useMemo(() => {
    if (selectedCalendarDay !== null) {
      return calendarData.billsByDay[selectedCalendarDay] || [];
    }
    // Return all items sorted by dueDay
    return [...recurringItems]
      .filter((r) => r.active)
      .sort((a, b) => a.dueDay - b.dueDay);
  }, [selectedCalendarDay, calendarData, recurringItems]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Subscriptions & Bills</Text>
            <Text style={styles.subtitle}>Monarch cash calendar & recurring charges</Text>
          </View>

          <Pressable
            style={styles.addBtn}
            onPress={() => router.push('/modal/recurring')}
            accessibilityRole="button"
            accessibilityLabel="Add Recurring"
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>New Bill</Text>
          </Pressable>
        </View>

        {/* Commitment Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.expenseBg }]}>
              <Ionicons name="repeat" size={16} color={COLORS.expense} />
            </View>
            <Text style={styles.statLabel}>Monthly Bills</Text>
            <Text style={[styles.statValue, { color: COLORS.expense }]}>
              {formatAmount(totalMonthlyCommitments)}
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.incomeBg }]}>
              <Ionicons name="cash-outline" size={16} color={COLORS.income} />
            </View>
            <Text style={styles.statLabel}>Recurring Income</Text>
            <Text style={[styles.statValue, { color: COLORS.income }]}>
              {formatAmount(totalRecurringIncome)}
            </Text>
          </Card>
        </View>

        {/* Segmented View Switcher: List vs Calendar */}
        <View style={styles.segmentedContainer}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'list' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('list')}
          >
            <Ionicons
              name="list"
              size={16}
              color={activeTab === 'list' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'list' && styles.segmentBtnTextActive,
              ]}
            >
              Schedule List ({recurringItems.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, activeTab === 'calendar' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('calendar')}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={activeTab === 'calendar' ? '#FFF' : COLORS.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'calendar' && styles.segmentBtnTextActive,
              ]}
            >
              Calendar Matrix
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: LIST VIEW */}
        {activeTab === 'list' && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              Scheduled Commitments ({recurringItems.length})
            </Text>

            {recurringItems.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No recurring items</Text>
                <Text style={styles.emptySubtitle}>
                  Add regular rent, subscriptions (Netflix, Spotify), utilities, or salary to track them effortlessly.
                </Text>
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() => router.push('/modal/recurring')}
                >
                  <Text style={styles.emptyBtnText}>Add Your First Bill</Text>
                </Pressable>
              </Card>
            ) : (
              recurringItems.map((item) => (
                <BillReminderCard
                  key={item.id}
                  item={item}
                  onPay={() => handlePay(item.id, item.title)}
                  onDelete={() => handleDelete(item.id, item.title)}
                />
              ))
            )}
          </View>
        )}

        {/* TAB 2: CALENDAR MATRIX VIEW */}
        {activeTab === 'calendar' && (
          <View style={styles.calendarSection}>
            {/* Calendar Grid Card */}
            <Card elevated style={styles.calendarCard}>
              <View style={styles.calendarHeaderRow}>
                <Text style={styles.calendarTitle}>Month of {selectedMonth}</Text>
                {selectedCalendarDay !== null && (
                  <Pressable
                    style={styles.clearFilterBtn}
                    onPress={() => setSelectedCalendarDay(null)}
                  >
                    <Text style={styles.clearFilterText}>Show All Days</Text>
                  </Pressable>
                )}
              </View>

              {/* Days of Week Header */}
              <View style={styles.daysOfWeekRow}>
                {DAYS_OF_WEEK.map((d) => (
                  <Text key={d} style={styles.dayOfWeekText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Grid Cells */}
              <View style={styles.gridContainer}>
                {calendarData.cells.map((cell, idx) => {
                  if (!cell) {
                    return <View key={`empty-${idx}`} style={styles.calendarCell} />;
                  }

                  const hasBills = cell.items.length > 0;
                  const hasIncome = cell.items.some((i) => i.type === 'income');
                  const isSelected = selectedCalendarDay === cell.day;

                  return (
                    <Pressable
                      key={`day-${cell.day}`}
                      style={[
                        styles.calendarCell,
                        hasBills && styles.calendarCellHasBill,
                        isSelected && styles.calendarCellSelected,
                      ]}
                      onPress={() =>
                        setSelectedCalendarDay(isSelected ? null : cell.day)
                      }
                    >
                      <Text
                        style={[
                          styles.cellDayText,
                          hasBills && styles.cellDayTextBold,
                          isSelected && styles.cellDayTextSelected,
                        ]}
                      >
                        {cell.day}
                      </Text>

                      {hasBills && (
                        <View
                          style={[
                            styles.cellDot,
                            {
                              backgroundColor: hasIncome ? COLORS.income : COLORS.expense,
                            },
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Selected Day Bills Header */}
            <View style={styles.dayBillsSection}>
              <Text style={styles.sectionTitle}>
                {selectedCalendarDay !== null
                  ? `Bills Due on Day ${selectedCalendarDay}`
                  : `All Scheduled Bills for ${selectedMonth}`}
              </Text>

              {calendarFilteredItems.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons name="sunny-outline" size={32} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>
                    No bills due on Day {selectedCalendarDay}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    Tap a highlighted day on the calendar above to inspect scheduled payments.
                  </Text>
                </Card>
              ) : (
                calendarFilteredItems.map((item) => (
                  <BillReminderCard
                    key={item.id}
                    item={item}
                    onPay={() => handlePay(item.id, item.title)}
                    onDelete={() => handleDelete(item.id, item.title)}
                  />
                ))
              )}
            </View>
          </View>
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
  statsRow: {
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
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
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  listSection: {
    marginBottom: SPACING.lg,
  },
  calendarSection: {
    marginBottom: SPACING.lg,
  },
  calendarCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  calendarTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  clearFilterBtn: {
    backgroundColor: COLORS.cardElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  clearFilterText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 6,
  },
  dayOfWeekText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    position: 'relative',
  },
  calendarCellHasBill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  calendarCellSelected: {
    backgroundColor: COLORS.primary,
  },
  cellDayText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  cellDayTextBold: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  cellDayTextSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  cellDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 4,
  },
  dayBillsSection: {
    marginBottom: SPACING.md,
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
