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
import { BillReminderCard } from '../../components/BillReminderCard';

export default function RecurringScreen() {
  const router = useRouter();
  const {
    recurringItems,
    payRecurringItem,
    deleteRecurringItem,
    formatAmount,
  } = useFinancial();

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
            <Text style={styles.subtitle}>Track upcoming recurring charges</Text>
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

        {/* Recurring List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            Scheduled Payments ({recurringItems.length})
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
    marginBottom: SPACING.lg,
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
