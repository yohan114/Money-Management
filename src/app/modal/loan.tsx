import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { LoanType } from '../../types';

const LOAN_TYPES: { type: LoanType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { type: 'friend', label: 'Friend', icon: 'people', color: '#3B82F6' },
  { type: 'bank', label: 'Bank', icon: 'business', color: '#10B981' },
  { type: 'family', label: 'Family', icon: 'home', color: '#EC4899' },
  { type: 'personal', label: 'Personal', icon: 'person', color: '#8B5CF6' },
  { type: 'business', label: 'Business', icon: 'briefcase', color: '#F59E0B' },
];

function getFutureDateISO(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().split('T')[0];
}

export default function LoanModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const loanId = params.id;

  const { loans, accounts, addLoan, updateLoan, deleteLoan, formatAmount, settings } = useFinancial();

  const existingLoan = loanId ? loans.find((l) => l.id === loanId) : undefined;
  const isEditing = !!existingLoan;

  const [lenderName, setLenderName] = useState(existingLoan?.lenderName || '');
  const [loanType, setLoanType] = useState<LoanType>(existingLoan?.type || 'friend');
  const [totalAmountStr, setTotalAmountStr] = useState(
    existingLoan ? existingLoan.totalAmount.toString() : ''
  );
  const [receivedDate, setReceivedDate] = useState(
    existingLoan ? existingLoan.receivedDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(existingLoan?.dueDate || '');
  const [depositAccountId, setDepositAccountId] = useState<string>(
    existingLoan?.depositAccountId || accounts[0]?.id || ''
  );
  const [purpose, setPurpose] = useState(existingLoan?.purpose || '');
  const [notes, setNotes] = useState(existingLoan?.notes || '');
  const [autoCreditAccount, setAutoCreditAccount] = useState(!isEditing);

  const handleSave = async () => {
    if (!lenderName.trim()) {
      Alert.alert('Lender Required', 'Please enter who provided this loan (e.g. Kasun, Commercial Bank).');
      return;
    }

    const totalAmount = parseFloat(totalAmountStr);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid loan amount greater than zero.');
      return;
    }

    if (!depositAccountId) {
      Alert.alert('Deposit Account Required', 'Please select which account received these funds.');
      return;
    }

    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Invalid Due Date', 'Due date must be in YYYY-MM-DD format (or leave it blank).');
      return;
    }

    try {
      if (isEditing && existingLoan) {
        await updateLoan({
          ...existingLoan,
          lenderName: lenderName.trim(),
          type: loanType,
          totalAmount,
          receivedDate: receivedDate ? new Date(receivedDate).toISOString() : existingLoan.receivedDate,
          dueDate: dueDate.trim() || undefined,
          depositAccountId,
          purpose: purpose.trim() || 'General loan',
          notes: notes.trim() || undefined,
        });
      } else {
        await addLoan(
          {
            lenderName: lenderName.trim(),
            type: loanType,
            totalAmount,
            receivedDate: receivedDate ? new Date(receivedDate).toISOString() : new Date().toISOString(),
            dueDate: dueDate.trim() || undefined,
            depositAccountId,
            purpose: purpose.trim() || 'General loan',
            notes: notes.trim() || undefined,
          },
          { autoCreditAccount }
        );
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save loan details.');
    }
  };

  const handleDelete = () => {
    if (!existingLoan) return;

    Alert.alert(
      'Delete Loan Record',
      `Are you sure you want to delete the loan from "${existingLoan.lenderName}"? Repayments and history for this loan will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLoan(existingLoan.id);
            router.back();
          },
        },
      ]
    );
  };

  const activeTypeConfig = LOAN_TYPES.find((t) => t.type === loanType) || LOAN_TYPES[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Loan Record' : 'Record New Loan / Debt'}
        </Text>
        {isEditing ? (
          <Pressable onPress={handleDelete} hitSlop={10} style={styles.deleteHeaderBtn}>
            <Ionicons name="trash-outline" size={20} color={COLORS.expense} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Visual Badge Card */}
        <View style={styles.previewContainer}>
          <View
            style={[
              styles.previewBadge,
              { backgroundColor: activeTypeConfig.color + '22', borderColor: activeTypeConfig.color },
            ]}
          >
            <Ionicons name={activeTypeConfig.icon} size={34} color={activeTypeConfig.color} />
          </View>
          <Text style={styles.previewTitle}>
            {lenderName.trim() || 'Lender / Source Name'}
          </Text>
          <Text style={styles.previewSub}>
            {totalAmountStr ? `${settings.currencySymbol} ${totalAmountStr}` : `${settings.currencySymbol} 0.00`} • {activeTypeConfig.label}
          </Text>
        </View>

        {/* Loan Source / Lender Name */}
        <Text style={styles.fieldLabel}>Lender / Source Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Kasun (Friend), Commercial Bank, Uncle Sunil"
          placeholderTextColor={COLORS.textMuted}
          value={lenderName}
          onChangeText={setLenderName}
        />

        {/* Loan Type Selector */}
        <Text style={styles.fieldLabel}>Loan Type</Text>
        <View style={styles.typeGrid}>
          {LOAN_TYPES.map((t) => {
            const isSelected = loanType === t.type;
            return (
              <Pressable
                key={t.type}
                style={[
                  styles.typeChip,
                  isSelected && {
                    backgroundColor: t.color + '25',
                    borderColor: t.color,
                  },
                ]}
                onPress={() => setLoanType(t.type)}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={isSelected ? t.color : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    isSelected && { color: t.color, fontWeight: '700' },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Total Loan Amount */}
        <Text style={styles.fieldLabel}>Total Loan Amount ({settings.currencySymbol}) *</Text>
        <TextInput
          style={[styles.textInput, styles.amountInput]}
          placeholder="0.00"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={totalAmountStr}
          onChangeText={setTotalAmountStr}
        />

        {/* Deposit Account */}
        <Text style={styles.fieldLabel}>Deposit Into Account *</Text>
        <Text style={styles.fieldHelper}>Where was this borrowed money received?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
          {accounts.map((acc) => {
            const isSelected = depositAccountId === acc.id;
            return (
              <Pressable
                key={acc.id}
                style={[
                  styles.accountCard,
                  isSelected && { borderColor: acc.color, backgroundColor: acc.color + '20' },
                ]}
                onPress={() => setDepositAccountId(acc.id)}
              >
                <View style={[styles.accIconCircle, { backgroundColor: acc.color + '25' }]}>
                  <Ionicons name={(acc.icon as any) || 'wallet'} size={18} color={acc.color} />
                </View>
                <Text
                  style={[styles.accCardName, isSelected && { color: acc.color, fontWeight: '700' }]}
                  numberOfLines={1}
                >
                  {acc.name}
                </Text>
                <Text style={styles.accCardBalance}>{formatAmount(acc.balance)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Auto Credit Option (For New Loans) */}
        {!isEditing && (
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchTitle}>Auto-Credit Account Balance</Text>
              <Text style={styles.switchSub}>
                Automatically add {settings.currencySymbol} {totalAmountStr || '0'} to the selected account and record an income transaction tagged #loan-inflow.
              </Text>
            </View>
            <Switch
              value={autoCreditAccount}
              onValueChange={setAutoCreditAccount}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={autoCreditAccount ? COLORS.primary : '#f4f3f4'}
            />
          </View>
        )}

        {/* Date Received */}
        <Text style={styles.fieldLabel}>Date Received (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={receivedDate}
          onChangeText={setReceivedDate}
        />

        {/* Agreed Due Date */}
        <Text style={styles.fieldLabel}>Agreed Due Date (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="YYYY-MM-DD (e.g. 2026-12-31)"
          placeholderTextColor={COLORS.textMuted}
          value={dueDate}
          onChangeText={setDueDate}
        />

        {/* Quick presets for Due Date */}
        <View style={styles.quickDateRow}>
          <Pressable
            style={styles.quickDateBtn}
            onPress={() => setDueDate(getFutureDateISO(1))}
          >
            <Text style={styles.quickDateText}>+1 Month</Text>
          </Pressable>
          <Pressable
            style={styles.quickDateBtn}
            onPress={() => setDueDate(getFutureDateISO(3))}
          >
            <Text style={styles.quickDateText}>+3 Months</Text>
          </Pressable>
          <Pressable
            style={styles.quickDateBtn}
            onPress={() => setDueDate(getFutureDateISO(6))}
          >
            <Text style={styles.quickDateText}>+6 Months</Text>
          </Pressable>
          <Pressable
            style={styles.quickDateBtn}
            onPress={() => setDueDate(getFutureDateISO(12))}
          >
            <Text style={styles.quickDateText}>+1 Year</Text>
          </Pressable>
          {dueDate ? (
            <Pressable style={styles.quickClearBtn} onPress={() => setDueDate('')}>
              <Text style={styles.quickClearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Purpose */}
        <Text style={styles.fieldLabel}>Purpose / Spending Plan</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. House advance, Vehicle repair parts, Business stock"
          placeholderTextColor={COLORS.textMuted}
          value={purpose}
          onChangeText={setPurpose}
        />

        {/* Notes */}
        <Text style={styles.fieldLabel}>Additional Notes (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Any payment terms, contact details, or conditions..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Record Loan'}</Text>
        </Pressable>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  deleteHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  previewBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  previewTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  previewSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  fieldLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  fieldHelper: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  amountInput: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  typeChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  accountScroll: {
    marginBottom: 8,
  },
  accountCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginRight: 10,
    width: 140,
  },
  accIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accCardName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  accCardBalance: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: SPACING.md,
  },
  switchTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  switchSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickDateBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickDateText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  quickClearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.expenseBg,
  },
  quickClearText: {
    color: COLORS.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
