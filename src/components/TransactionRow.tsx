import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { Transaction } from '../types';
import { useFinancial } from '../context/FinancialContext';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
  onDelete?: () => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onPress,
  onDelete,
}) => {
  const { getCategoryById, getAccountById, formatAmount } = useFinancial();

  const category = getCategoryById(transaction.categoryId);
  const account = getAccountById(transaction.accountId);

  const isIncome = transaction.type === 'income';

  // Format date: e.g. "Today", "Yesterday", or "Sep 24"
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${transaction.type} ${transaction.amount} for ${category?.name || 'item'}`}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: (category?.color || COLORS.primary) + '20' },
        ]}
      >
        <Ionicons
          name={(category?.icon as any) || 'pricetag'}
          size={20}
          color={category?.color || COLORS.primary}
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.note || category?.name || 'Transaction'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.categoryBadge}>{category?.name || 'General'}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.accountName}>{account?.name || 'Account'}</Text>
          {transaction.imageUri && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Ionicons name="receipt-outline" size={13} color={COLORS.primaryLight} />
            </>
          )}
        </View>
      </View>

      {/* Amount & Time */}
      <View style={styles.amountCol}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? COLORS.income : COLORS.textPrimary },
          ]}
        >
          {isIncome ? '+' : '-'}
          {formatAmount(transaction.amount)}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>

      {/* Optional Quick Delete button */}
      {onDelete && (
        <Pressable
          style={styles.deleteBtn}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          hitSlop={8}
          accessibilityLabel="Delete transaction"
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginHorizontal: 4,
  },
  accountName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  amountCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  date: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  deleteBtn: {
    marginLeft: SPACING.sm,
    padding: 6,
  },
});
