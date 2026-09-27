import React, { useState, useMemo } from 'react';
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
import { BudgetItem } from '../../types';

// Quick staple grocery suggestions for Sri Lankan / Asian households
const GROCERY_STAPLES = [
  { name: 'Keeri Samba Rice 10kg', cost: 2600, week: 1 },
  { name: 'Red Raw Rice 5kg', cost: 1200, week: 1 },
  { name: 'Mysore Dhal 5kg', cost: 1750, week: 1 },
  { name: 'White Sugar 3kg', cost: 900, week: 2 },
  { name: 'Anchor Milk Powder 400g x 2', cost: 2200, week: 2 },
  { name: 'Coconut Oil 1.5L Bottle', cost: 1450, week: 2 },
  { name: 'Spices, Chili & Curry Powder', cost: 1800, week: 3 },
  { name: 'Washing Powder & Soaps', cost: 2500, week: 3 },
  { name: 'Tea Leaves & Condiments', cost: 1200, week: 4 },
  { name: 'Flour & Pulses Pack', cost: 1600, week: 4 },
];

export default function BudgetModal() {
  const router = useRouter();
  const { categories, addBudget, settings, budgets, accounts, selectedAccountId } =
    useFinancial();

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Filter out categories that already have a budget
  const availableCategories = expenseCategories.filter(
    (cat) => !budgets.some((b) => b.categoryId === cat.id)
  );

  const [mode, setMode] = useState<'itemized' | 'flat'>('itemized');
  const [selectedCatId, setSelectedCatId] = useState<string>(
    availableCategories.find((c) => c.id === 'cat-groceries')?.id ||
      availableCategories[0]?.id ||
      expenseCategories[0]?.id ||
      ''
  );

  const [selectedAccId, setSelectedAccId] = useState<string>(
    selectedAccountId !== 'all' ? selectedAccountId : accounts[0]?.id || ''
  );

  // Flat mode limit
  const [flatLimitStr, setFlatLimitStr] = useState('');

  // Itemized mode list of items
  const [items, setItems] = useState<Omit<BudgetItem, 'id' | 'budgetId'>[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCostStr, setNewItemCostStr] = useState('');
  const [newItemWeek, setNewItemWeek] = useState<1 | 2 | 3 | 4>(1);

  // Calculate weekly totals
  const weeklyTotals = useMemo(() => {
    const w1 = items.filter((i) => i.targetWeek === 1).reduce((s, i) => s + i.estimatedCost, 0);
    const w2 = items.filter((i) => i.targetWeek === 2).reduce((s, i) => s + i.estimatedCost, 0);
    const w3 = items.filter((i) => i.targetWeek === 3).reduce((s, i) => s + i.estimatedCost, 0);
    const w4 = items.filter((i) => i.targetWeek === 4).reduce((s, i) => s + i.estimatedCost, 0);
    return { w1, w2, w3, w4, total: w1 + w2 + w3 + w4 };
  }, [items]);

  const handleAddStaple = (staple: { name: string; cost: number; week: number }) => {
    if (items.some((i) => i.name.toLowerCase() === staple.name.toLowerCase())) {
      Alert.alert('Item Added', `"${staple.name}" is already in your budget list.`);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        name: staple.name,
        estimatedCost: staple.cost,
        targetWeek: staple.week as 1 | 2 | 3 | 4,
        status: 'planned',
      },
    ]);
  };

  const handleAddCustomItem = () => {
    const name = newItemName.trim();
    const cost = parseFloat(newItemCostStr);
    if (!name) {
      Alert.alert('Item Name', 'Please enter a name for the budget item.');
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Item Cost', 'Please enter a valid estimated cost.');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        name,
        estimatedCost: cost,
        targetWeek: newItemWeek,
        status: 'planned',
      },
    ]);

    setNewItemName('');
    setNewItemCostStr('');
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!selectedCatId) {
      Alert.alert('Category Required', 'Please select a category for this budget.');
      return;
    }

    let finalLimit = 0;
    let budgetItems: BudgetItem[] = [];

    if (mode === 'itemized') {
      if (items.length === 0) {
        Alert.alert(
          'No Items Added',
          'Please add at least one item or switch to "Quick Flat Limit" mode.'
        );
        return;
      }
      finalLimit = weeklyTotals.total;
      budgetItems = items.map((item, idx) => ({
        ...item,
        id: `bi-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        budgetId: '', // Assigned in storage/context
      }));
    } else {
      finalLimit = parseFloat(flatLimitStr);
      if (isNaN(finalLimit) || finalLimit <= 0) {
        Alert.alert('Invalid Limit', 'Please enter a monthly budget limit greater than 0.');
        return;
      }
    }

    await addBudget({
      categoryId: selectedCatId,
      accountId: selectedAccId || undefined,
      monthlyLimit: finalLimit,
      month: 'global',
      items: budgetItems,
      weeklyLimits: {
        week1: weeklyTotals.w1 || Math.round(finalLimit / 4),
        week2: weeklyTotals.w2 || Math.round(finalLimit / 4),
        week3: weeklyTotals.w3 || Math.round(finalLimit / 4),
        week4: weeklyTotals.w4 || Math.round(finalLimit / 4),
      },
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
        <Text style={styles.headerTitle}>Create Master Budget</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode Selector */}
        <View style={styles.modeSwitcher}>
          <Pressable
            style={[styles.modeBtn, mode === 'itemized' && styles.modeBtnActive]}
            onPress={() => setMode('itemized')}
          >
            <Ionicons
              name="list"
              size={15}
              color={mode === 'itemized' ? '#FFF' : COLORS.textMuted}
            />
            <Text style={[styles.modeBtnText, mode === 'itemized' && styles.modeBtnTextActive]}>
              Master Itemized (Recommended)
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'flat' && styles.modeBtnActive]}
            onPress={() => setMode('flat')}
          >
            <Ionicons
              name="speedometer-outline"
              size={15}
              color={mode === 'flat' ? '#FFF' : COLORS.textMuted}
            />
            <Text style={[styles.modeBtnText, mode === 'flat' && styles.modeBtnTextActive]}>
              Quick Flat Limit
            </Text>
          </Pressable>
        </View>

        {/* Account Association */}
        <Text style={styles.fieldLabel}>Link to Account</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountChipsRow}
        >
          {accounts.map((acc) => {
            const isSelected = selectedAccId === acc.id;
            return (
              <Pressable
                key={acc.id}
                style={[
                  styles.accChip,
                  isSelected && {
                    backgroundColor: acc.color + '25',
                    borderColor: acc.color,
                  },
                ]}
                onPress={() => setSelectedAccId(acc.id)}
              >
                <Ionicons
                  name={(acc.icon as any) || 'wallet'}
                  size={14}
                  color={isSelected ? acc.color : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.accChipText,
                    isSelected && { color: acc.color, fontWeight: '700' },
                  ]}
                >
                  {acc.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Category Picker */}
        <Text style={styles.fieldLabel}>Select Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catChipsRow}
        >
          {expenseCategories.map((cat) => {
            const isSelected = selectedCatId === cat.id;
            const alreadyHasBudget = budgets.some((b) => b.categoryId === cat.id);

            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.catChip,
                  isSelected && {
                    borderColor: COLORS.primary,
                    backgroundColor: COLORS.primaryGlow,
                  },
                ]}
                onPress={() => setSelectedCatId(cat.id)}
              >
                <Ionicons
                  name={(cat.icon as any) || 'pie-chart'}
                  size={15}
                  color={isSelected ? COLORS.primaryLight : cat.color}
                />
                <Text
                  style={[
                    styles.catChipText,
                    isSelected && { color: COLORS.primaryLight, fontWeight: '700' },
                  ]}
                >
                  {cat.name}
                </Text>
                {alreadyHasBudget && <Text style={styles.existsBadge}>active</Text>}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ITEMIZATION SECTION */}
        {mode === 'itemized' ? (
          <>
            {/* Quick Staples Presets */}
            <View style={styles.staplesContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="basket-outline" size={16} color={COLORS.primaryLight} />
                <Text style={styles.sectionTitle}>Tap to Add Grocery Staples</Text>
              </View>
              <View style={styles.staplesGrid}>
                {GROCERY_STAPLES.map((st) => {
                  const added = items.some((i) => i.name.toLowerCase() === st.name.toLowerCase());
                  return (
                    <Pressable
                      key={st.name}
                      style={[styles.stapleChip, added && styles.stapleChipAdded]}
                      onPress={() => handleAddStaple(st)}
                    >
                      <Ionicons
                        name={added ? 'checkmark-circle' : 'add-circle-outline'}
                        size={14}
                        color={added ? COLORS.income : COLORS.textSecondary}
                      />
                      <Text style={[styles.stapleText, added && styles.stapleTextAdded]}>
                        {st.name} (W{st.week} • Rs. {st.cost.toLocaleString()})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Custom Item Form */}
            <View style={styles.addItemCard}>
              <Text style={styles.addItemTitle}>Add Custom Item</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Item name (e.g. Cooking Gas, Fresh Fish)"
                placeholderTextColor={COLORS.textMuted}
                value={newItemName}
                onChangeText={setNewItemName}
              />

              <View style={styles.costAndWeekRow}>
                <View style={styles.costInputWrap}>
                  <Text style={styles.currencyPrefix}>{settings.currencySymbol}</Text>
                  <TextInput
                    style={styles.costInput}
                    placeholder="Est. Cost"
                    placeholderTextColor={COLORS.textMuted}
                    value={newItemCostStr}
                    onChangeText={setNewItemCostStr}
                    keyboardType="numeric"
                  />
                </View>

                {/* Week Selector Chips */}
                <View style={styles.weekPicker}>
                  {([1, 2, 3, 4] as const).map((w) => (
                    <Pressable
                      key={w}
                      style={[styles.weekBtn, newItemWeek === w && styles.weekBtnActive]}
                      onPress={() => setNewItemWeek(w)}
                    >
                      <Text
                        style={[
                          styles.weekBtnText,
                          newItemWeek === w && styles.weekBtnTextActive,
                        ]}
                      >
                        W{w}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable style={styles.addItemBtn} onPress={handleAddCustomItem}>
                  <Ionicons name="add" size={20} color="#FFF" />
                </Pressable>
              </View>
            </View>

            {/* Planned Items List */}
            <View style={styles.itemsListContainer}>
              <View style={styles.itemsListHeader}>
                <Text style={styles.sectionTitle}>
                  Planned Items ({items.length})
                </Text>
                <Text style={styles.totalBadge}>
                  Total: {settings.currencySymbol} {weeklyTotals.total.toLocaleString()}
                </Text>
              </View>

              {items.length === 0 ? (
                <View style={styles.emptyItemsBox}>
                  <Ionicons name="cart-outline" size={32} color={COLORS.textMuted} />
                  <Text style={styles.emptyItemsText}>
                    No items added yet. Tap grocery staples above or type custom items.
                  </Text>
                </View>
              ) : (
                items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemWeekBadge}>
                      <Text style={styles.itemWeekText}>W{item.targetWeek}</Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCost}>
                        Est: {settings.currencySymbol} {item.estimatedCost.toLocaleString()}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveItem(idx)}
                      style={styles.removeItemBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.expense} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* Weekly Division Breakdown Cards */}
            <Text style={styles.fieldLabel}>Weekly Budget Division</Text>
            <View style={styles.weeklyGrid}>
              <View style={styles.weekCard}>
                <Text style={styles.weekTitle}>Week 1 (1–7)</Text>
                <Text style={styles.weekAmount}>
                  {settings.currencySymbol} {weeklyTotals.w1.toLocaleString()}
                </Text>
                <Text style={styles.weekSub}>
                  {items.filter((i) => i.targetWeek === 1).length} items
                </Text>
              </View>

              <View style={styles.weekCard}>
                <Text style={styles.weekTitle}>Week 2 (8–14)</Text>
                <Text style={styles.weekAmount}>
                  {settings.currencySymbol} {weeklyTotals.w2.toLocaleString()}
                </Text>
                <Text style={styles.weekSub}>
                  {items.filter((i) => i.targetWeek === 2).length} items
                </Text>
              </View>

              <View style={styles.weekCard}>
                <Text style={styles.weekTitle}>Week 3 (15–21)</Text>
                <Text style={styles.weekAmount}>
                  {settings.currencySymbol} {weeklyTotals.w3.toLocaleString()}
                </Text>
                <Text style={styles.weekSub}>
                  {items.filter((i) => i.targetWeek === 3).length} items
                </Text>
              </View>

              <View style={styles.weekCard}>
                <Text style={styles.weekTitle}>Week 4 (22+)</Text>
                <Text style={styles.weekAmount}>
                  {settings.currencySymbol} {weeklyTotals.w4.toLocaleString()}
                </Text>
                <Text style={styles.weekSub}>
                  {items.filter((i) => i.targetWeek === 4).length} items
                </Text>
              </View>
            </View>
          </>
        ) : (
          /* FLAT LIMIT SECTION */
          <>
            <Text style={styles.fieldLabel}>Monthly Spending Limit</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>{settings.currencySymbol}</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                value={flatLimitStr}
                onChangeText={setFlatLimitStr}
                autoFocus
              />
            </View>

            <View style={styles.chipsRow}>
              {[10000, 25000, 45000, 60000, 100000].map((preset) => (
                <Pressable
                  key={preset}
                  style={styles.chip}
                  onPress={() => setFlatLimitStr(preset.toString())}
                >
                  <Text style={styles.chipText}>
                    {settings.currencySymbol} {preset.toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Submit Button */}
        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.submitBtnText}>
            {mode === 'itemized'
              ? `Save Master Budget (${settings.currencySymbol} ${weeklyTotals.total.toLocaleString()})`
              : 'Save Monthly Budget'}
          </Text>
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
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  modeBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  accountChipsRow: {
    gap: 8,
    paddingBottom: 6,
  },
  accChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  accChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  catChipsRow: {
    gap: 8,
    paddingBottom: 6,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  catChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  existsBadge: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  staplesContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  staplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stapleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  stapleChipAdded: {
    backgroundColor: COLORS.incomeBg,
    borderColor: COLORS.income,
  },
  stapleText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  stapleTextAdded: {
    color: COLORS.income,
    fontWeight: '600',
  },
  addItemCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addItemTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  inputField: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  costAndWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  costInputWrap: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencyPrefix: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  costInput: {
    flex: 1,
    paddingVertical: 8,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  weekPicker: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: RADIUS.xs,
  },
  weekBtnActive: {
    backgroundColor: COLORS.primary,
  },
  weekBtnText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  weekBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  addItemBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsListContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  totalBadge: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyItemsBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyItemsText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  itemWeekBadge: {
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: RADIUS.xs,
  },
  itemWeekText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  itemCost: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  removeItemBtn: {
    padding: 4,
  },
  weeklyGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  weekCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  weekTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  weekAmount: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  weekSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
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
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chip: {
    backgroundColor: COLORS.card,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
