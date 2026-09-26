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
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { TransactionType, RecurringFrequency } from '../../types';

export default function RecurringModal() {
  const router = useRouter();
  const { categories, accounts, addRecurringItem, settings } = useFinancial();

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [frequency] = useState<RecurringFrequency>('monthly');
  const [dueDay, setDueDay] = useState(1);

  const typeCategories = categories.filter((c) => c.type === type);
  const [selectedCatId, setSelectedCatId] = useState<string>(
    typeCategories[0]?.id || ''
  );
  const [selectedAccId, setSelectedAccId] = useState<string>(
    accounts[0]?.id || ''
  );

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const newCats = categories.filter((c) => c.type === newType);
    if (newCats.length > 0) {
      setSelectedCatId(newCats[0].id);
    }
  };

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title (e.g. Rent, Netflix).');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!selectedCatId) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }

    await addRecurringItem({
      title: title.trim(),
      amount,
      type,
      categoryId: selectedCatId,
      accountId: selectedAccId,
      frequency,
      dueDay,
      active: true,
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Recurring Bill / Income</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.fieldLabel}>Subscription / Bill Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Netflix, Gym, Apartment Rent"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* Type Switcher */}
        <Text style={styles.fieldLabel}>Type</Text>
        <View style={styles.typeSwitcher}>
          <Pressable
            style={[
              styles.typeBtn,
              type === 'expense' && { backgroundColor: COLORS.expense },
            ]}
            onPress={() => handleTypeChange('expense')}
          >
            <Text
              style={[
                styles.typeBtnText,
                type === 'expense' && styles.typeBtnTextActive,
              ]}
            >
              Recurring Bill / Expense
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.typeBtn,
              type === 'income' && { backgroundColor: COLORS.income },
            ]}
            onPress={() => handleTypeChange('income')}
          >
            <Text
              style={[
                styles.typeBtnText,
                type === 'income' && styles.typeBtnTextActive,
              ]}
            >
              Recurring Income
            </Text>
          </Pressable>
        </View>

        {/* Amount */}
        <Text style={styles.fieldLabel}>Recurring Amount</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>{settings.currencySymbol}</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            value={amountStr}
            onChangeText={setAmountStr}
          />
        </View>

        {/* Due Day Selector (Day 1 - 31) */}
        <Text style={styles.fieldLabel}>Day of Month Due (1-31)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScroll}
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
            const isSelected = dueDay === day;
            return (
              <Pressable
                key={day}
                style={[
                  styles.dayChip,
                  isSelected && {
                    backgroundColor: COLORS.primary,
                    borderColor: COLORS.primaryLight,
                  },
                ]}
                onPress={() => setDueDay(day)}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    isSelected && { color: '#FFF', fontWeight: '700' },
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Category Picker */}
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoriesGrid}>
          {typeCategories.slice(0, 6).map((cat) => {
            const isSelected = selectedCatId === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.catItem,
                  isSelected && {
                    borderColor: COLORS.primary,
                    backgroundColor: COLORS.primaryGlow,
                  },
                ]}
                onPress={() => setSelectedCatId(cat.id)}
              >
                <View
                  style={[
                    styles.catIconWrap,
                    { backgroundColor: isSelected ? COLORS.primary : cat.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={(cat.icon as any) || 'pricetag'}
                    size={18}
                    color={isSelected ? '#FFF' : cat.color}
                  />
                </View>
                <Text
                  style={[
                    styles.catName,
                    isSelected && { color: COLORS.textPrimary, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Account Picker */}
        <Text style={styles.fieldLabel}>Auto Payment Account</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accScroll}
        >
          {accounts.map((acc) => {
            const isSelected = selectedAccId === acc.id;
            return (
              <Pressable
                key={acc.id}
                style={[
                  styles.accCard,
                  isSelected && {
                    borderColor: COLORS.primary,
                    backgroundColor: COLORS.primaryGlow,
                  },
                ]}
                onPress={() => setSelectedAccId(acc.id)}
              >
                <Ionicons
                  name={(acc.icon as any) || 'wallet'}
                  size={16}
                  color={isSelected ? COLORS.primaryLight : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.accName,
                    isSelected && { color: COLORS.textPrimary, fontWeight: '700' },
                  ]}
                >
                  {acc.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
          accessibilityRole="button"
        >
          <Text style={styles.submitBtnText}>Save Scheduled Item</Text>
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
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  typeBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
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
  daysScroll: {
    gap: 6,
    paddingVertical: 4,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  catItem: {
    width: '31%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  catName: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  accScroll: {
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  accCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
});
