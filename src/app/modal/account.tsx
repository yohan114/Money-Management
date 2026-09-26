import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { AccountType } from '../../types';

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: string }[] = [
  { type: 'cash', label: 'Cash Wallet', icon: 'wallet' },
  { type: 'bank', label: 'Bank Account', icon: 'business' },
  { type: 'card', label: 'Credit Card', icon: 'card' },
  { type: 'savings', label: 'Savings', icon: 'shield-checkmark' },
];

const ACCOUNT_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#64748B', // Slate
];

export default function AccountModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const accountId = params.id as string | undefined;

  const { accounts, addAccount, updateAccount, deleteAccount, settings } = useFinancial();

  const existingAccount = accountId ? accounts.find((a) => a.id === accountId) : undefined;
  const isEditing = !!existingAccount;

  const [name, setName] = useState(existingAccount?.name || '');
  const [type, setType] = useState<AccountType>(existingAccount?.type || 'bank');
  const [balanceStr, setBalanceStr] = useState(
    existingAccount ? existingAccount.balance.toString() : '0'
  );
  const [color, setColor] = useState(existingAccount?.color || '#3B82F6');
  const [icon, setIcon] = useState(existingAccount?.icon || 'business');

  const handleSelectType = (selectedType: AccountType, defaultIcon: string) => {
    setType(selectedType);
    setIcon(defaultIcon);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Account Name Required', 'Please enter a name for this account.');
      return;
    }

    const balance = parseFloat(balanceStr);
    if (isNaN(balance)) {
      Alert.alert('Invalid Balance', 'Please enter a valid initial balance (e.g. 0).');
      return;
    }

    if (isEditing && existingAccount) {
      await updateAccount({
        ...existingAccount,
        name: name.trim(),
        type,
        balance,
        color,
        icon,
      });
    } else {
      await addAccount({
        name: name.trim(),
        type,
        balance,
        color,
        icon,
      });
    }

    router.back();
  };

  const handleDelete = () => {
    if (!existingAccount) return;
    if (accounts.length <= 1) {
      Alert.alert('Action Denied', 'You must have at least one active account.');
      return;
    }

    Alert.alert(
      'Delete Account',
      `Are you sure you want to remove "${existingAccount.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount(existingAccount.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Account' : 'Add New Account'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Name */}
        <Text style={styles.fieldLabel}>Account Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Cash, Commercial Bank, BOC, Savings"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus={!isEditing}
        />

        {/* Account Type */}
        <Text style={styles.fieldLabel}>Account Type</Text>
        <View style={styles.typeGrid}>
          {ACCOUNT_TYPES.map((t) => {
            const isSelected = type === t.type;
            return (
              <Pressable
                key={t.type}
                style={[
                  styles.typeCard,
                  isSelected && {
                    borderColor: COLORS.primary,
                    backgroundColor: COLORS.primaryGlow,
                  },
                ]}
                onPress={() => handleSelectType(t.type, t.icon)}
              >
                <Ionicons
                  name={t.icon as any}
                  size={20}
                  color={isSelected ? COLORS.primaryLight : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    isSelected && { color: COLORS.textPrimary, fontWeight: '700' },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Starting Balance */}
        <Text style={styles.fieldLabel}>
          {isEditing ? 'Current Balance' : 'Starting Balance'}
        </Text>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>{settings.currencySymbol}</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
            value={balanceStr}
            onChangeText={setBalanceStr}
          />
        </View>

        {/* Color Choice */}
        <Text style={styles.fieldLabel}>Card / Theme Color</Text>
        <View style={styles.colorRow}>
          {ACCOUNT_COLORS.map((c) => {
            const isSelected = color === c;
            return (
              <Pressable
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  isSelected && styles.colorCircleSelected,
                ]}
                onPress={() => setColor(c)}
              >
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </Pressable>
            );
          })}
        </View>

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
          accessibilityRole="button"
        >
          <Text style={styles.submitBtnText}>
            {isEditing ? 'Save Changes' : 'Create Account'}
          </Text>
        </Pressable>

        {/* Delete Account Button (only when editing) */}
        {isEditing && (
          <Pressable
            style={styles.deleteBtn}
            onPress={handleDelete}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.expense} />
            <Text style={styles.deleteBtnText}>Delete This Account</Text>
          </Pressable>
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xs,
  },
  currencySymbol: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    color: COLORS.textPrimary,
    fontSize: 38,
    fontWeight: '800',
    minWidth: 120,
    textAlign: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteBtnText: {
    color: COLORS.expense,
    fontSize: 14,
    fontWeight: '700',
  },
});
