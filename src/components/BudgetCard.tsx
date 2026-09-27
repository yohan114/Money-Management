import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { Budget } from '../types';
import { useFinancial } from '../context/FinancialContext';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';

interface BudgetCardProps {
  budget: Budget;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onEdit, onDelete }) => {
  const router = useRouter();
  const { getCategoryById, getCategorySpentForMonth, selectedMonth, formatAmount } =
    useFinancial();

  const category = getCategoryById(budget.categoryId);
  const spent = getCategorySpentForMonth(budget.categoryId, selectedMonth);
  const limit = budget.monthlyLimit;
  const remaining = limit - spent;
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;

  const isOver = spent > limit;
  const isWarning = percentage >= 80 && !isOver;

  const statusColor = isOver
    ? COLORS.expense
    : isWarning
    ? COLORS.warning
    : COLORS.income;

  const statusLabel = isOver
    ? 'Over Limit'
    : isWarning
    ? 'Near Limit'
    : 'On Track';

  const items = budget.items || [];
  const closedCount = items.filter((i) => i.status === 'closed').length;
  const slipsCount = items.filter((i) => !!i.slipImageUri).length;

  const handleCardPress = () => {
    router.push(`/budget/${budget.id}` as any);
  };

  return (
    <Pressable onPress={handleCardPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <Card style={styles.card}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.catInfo}>
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: (category?.color || COLORS.primary) + '20' },
              ]}
            >
              <Ionicons
                name={(category?.icon as any) || 'pie-chart'}
                size={18}
                color={category?.color || COLORS.primary}
              />
            </View>
            <View>
              <Text style={styles.catName}>{category?.name || 'All Categories'}</Text>
              <Text style={styles.subtext}>Monthly Limit</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            {onEdit && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={styles.iconBtn}
                hitSlop={8}
                accessibilityLabel="Edit budget"
              >
                <Ionicons name="pencil-outline" size={16} color={COLORS.textSecondary} />
              </Pressable>
            )}

            {onDelete && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={styles.iconBtn}
                hitSlop={8}
                accessibilityLabel="Delete budget"
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <ProgressBar progress={percentage} color={statusColor} height={8} />
        </View>

        {/* Bottom Numbers */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={styles.statValue}>{formatAmount(spent)}</Text>
          </View>

          <View style={styles.alignCenter}>
            <Text style={styles.statLabel}>Progress</Text>
            <Text style={[styles.statValue, { color: statusColor }]}>
              {percentage.toFixed(0)}%
            </Text>
          </View>

          <View style={styles.alignRight}>
            <Text style={styles.statLabel}>{isOver ? 'Exceeded by' : 'Remaining'}</Text>
            <Text
              style={[
                styles.statValue,
                { color: isOver ? COLORS.expense : COLORS.textPrimary },
              ]}
            >
              {formatAmount(Math.abs(remaining))}
            </Text>
          </View>
        </View>

        {/* Itemized / Slips Indicator Bar */}
        <View style={styles.itemsIndicatorRow}>
          <View style={styles.itemsIndicatorLeft}>
            <Ionicons name="list-circle-outline" size={16} color={COLORS.primaryLight} />
            <Text style={styles.itemsIndicatorText}>
              {items.length > 0
                ? `${closedCount}/${items.length} items bought`
                : 'Tap to add items & slips'}
            </Text>
            {slipsCount > 0 && (
              <View style={styles.slipsMiniBadge}>
                <Ionicons name="receipt" size={11} color={COLORS.primaryLight} />
                <Text style={styles.slipsMiniText}>{slipsCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.viewItemsLink}>
            <Text style={styles.viewItemsLinkText}>View Items</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primaryLight} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  catInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  catName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  subtext: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  iconBtn: {
    padding: 6,
  },
  progressSection: {
    marginVertical: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  alignCenter: {
    alignItems: 'center',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  itemsIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '60',
  },
  itemsIndicatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemsIndicatorText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  slipsMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  slipsMiniText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  viewItemsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewItemsLinkText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
});
