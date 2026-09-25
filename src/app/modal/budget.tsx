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

export default function BudgetModal() {
  const router = useRouter();
  const { categories, addBudget, settings, budgets } = useFinancial();

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Filter out categories that already have a budget
  const availableCategories = expenseCategories.filter(
    (cat) => !budgets.some((b) => b.categoryId === cat.id)
  );

  const [selectedCatId, setSelectedCatId] = useState<string>(
    availableCategories[0]?.id || expenseCategories[0]?.id || ''
  );
  const [limitStr, setLimitStr] = useState('');

  const handleSetPreset = (val: number) => {
    setLimitStr(val.toString());
  };

  const handleSave = async () => {
    const limit = parseFloat(limitStr);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid Limit', 'Please enter a monthly budget limit greater than 0.');
      return;
    }

    if (!selectedCatId) {
      Alert.alert('Category Required', 'Please select a category for this budget.');
      return;
    }

    await addBudget({
      categoryId: selectedCatId,
      monthlyLimit: limit,
      month: 'global',
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
        <Text style={styles.headerTitle}>Create Monthly Budget</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Limit Input */}
        <Text style={styles.fieldLabel}>Monthly Spending Limit</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>{settings.currencySymbol}</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
            value={limitStr}
            onChangeText={setLimitStr}
            autoFocus
          />
        </View>

        {/* Quick Limit Presets */}
        <View style={styles.chipsRow}>
          {[100, 250, 500, 1000].map((preset) => (
            <Pressable
              key={preset}
              style={styles.chip}
              onPress={() => handleSetPreset(preset)}
            >
              <Text style={styles.chipText}>
                {settings.currencySymbol}
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Pick Category */}
        <Text style={styles.fieldLabel}>Select Category</Text>
        <View style={styles.categoriesGrid}>
          {expenseCategories.map((cat) => {
            const isSelected = selectedCatId === cat.id;
            const alreadyHasBudget = budgets.some((b) => b.categoryId === cat.id);

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
                    name={(cat.icon as any) || 'pie-chart'}
                    size={20}
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
                {alreadyHasBudget && (
                  <Text style={styles.existsBadge}>Has budget</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
          accessibilityRole="button"
        >
          <Text style={styles.submitBtnText}>Save Budget</Text>
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
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  currencySymbol: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    color: COLORS.textPrimary,
    fontSize: 48,
    fontWeight: '800',
    minWidth: 120,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chip: {
    backgroundColor: COLORS.card,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    color: COLORS.primaryLight,
    fontSize: 13,
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
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catName: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  existsBadge: {
    color: COLORS.warning,
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
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
