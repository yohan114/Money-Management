import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { RecurringItem } from '../types';
import { useFinancial } from '../context/FinancialContext';
import { Card } from './Card';

interface BillReminderCardProps {
  item: RecurringItem;
  onPay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const BillReminderCard: React.FC<BillReminderCardProps> = ({
  item,
  onPay,
  onEdit,
  onDelete,
}) => {
  const { getCategoryById, formatAmount } = useFinancial();
  const category = getCategoryById(item.categoryId);

  const today = new Date();
  const currentDay = today.getDate();

  // Days until due calculation
  const diffDays = (item.dueDay - currentDay + 31) % 31;
  const isDueToday = diffDays === 0;
  const isDueSoon = diffDays > 0 && diffDays <= 3;

  // Check if paid in the current month
  const isPaidThisMonth =
    item.lastPaidDate &&
    new Date(item.lastPaidDate).getMonth() === today.getMonth() &&
    new Date(item.lastPaidDate).getFullYear() === today.getFullYear();

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {/* Category Icon */}
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: (category?.color || COLORS.primary) + '20' },
          ]}
        >
          <Ionicons
            name={(category?.icon as any) || 'calendar'}
            size={20}
            color={category?.color || COLORS.primary}
          />
        </View>

        {/* Info */}
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.freqText}>
              Every {item.dueDay}th of month
            </Text>
            {isPaidThisMonth ? (
              <View style={[styles.badge, { backgroundColor: COLORS.incomeBg }]}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.income} />
                <Text style={[styles.badgeText, { color: COLORS.income }]}>Paid</Text>
              </View>
            ) : isDueToday ? (
              <View style={[styles.badge, { backgroundColor: COLORS.expenseBg }]}>
                <Ionicons name="alert-circle" size={12} color={COLORS.expense} />
                <Text style={[styles.badgeText, { color: COLORS.expense }]}>Due Today</Text>
              </View>
            ) : isDueSoon ? (
              <View style={[styles.badge, { backgroundColor: COLORS.warningBg }]}>
                <Ionicons name="time" size={12} color={COLORS.warning} />
                <Text style={[styles.badgeText, { color: COLORS.warning }]}>
                  In {diffDays} days
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={[styles.badgeText, { color: COLORS.textMuted }]}>
                  In {diffDays} days
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.rightCol}>
          <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
          {!isPaidThisMonth && onPay && (
            <Pressable
              style={({ pressed }) => [styles.payBtn, pressed && styles.payBtnPressed]}
              onPress={onPay}
              accessibilityRole="button"
              accessibilityLabel={`Pay ${item.title}`}
            >
              <Text style={styles.payBtnText}>Pay</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  details: {
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  freqText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rightCol: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  amount: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
  },
  payBtnPressed: {
    opacity: 0.8,
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
