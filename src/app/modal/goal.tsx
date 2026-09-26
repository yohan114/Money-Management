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

const GOAL_ICONS = [
  'flag',
  'shield-checkmark',
  'home',
  'car',
  'airplane',
  'school',
  'laptop',
  'heart',
  'trophy',
  'cash',
  'gift',
  'diamond',
  'boat',
  'briefcase',
  'fitness',
  'sparkles',
];

const GOAL_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#14B8A6', // Teal
];

function getQuickDateISO(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toISOString().split('T')[0];
}

export default function GoalModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const goalId = params.id as string | undefined;

  const { goals, accounts, addGoal, updateGoal, deleteGoal, settings } = useFinancial();

  const existingGoal = goalId ? goals.find((g) => g.id === goalId) : undefined;
  const isEditing = !!existingGoal;

  const [title, setTitle] = useState(existingGoal?.title || '');
  const [targetAmountStr, setTargetAmountStr] = useState(
    existingGoal ? existingGoal.targetAmount.toString() : ''
  );
  const [currentAmountStr, setCurrentAmountStr] = useState(
    existingGoal ? existingGoal.currentAmount.toString() : '0'
  );
  const [targetDate, setTargetDate] = useState(
    existingGoal?.targetDate || getQuickDateISO(12)
  );
  const [icon, setIcon] = useState(existingGoal?.icon || 'flag');
  const [color, setColor] = useState(existingGoal?.color || '#10B981');
  const [linkedAccountId, setLinkedAccountId] = useState<string | undefined>(
    existingGoal?.linkedAccountId
  );

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a name for your financial goal.');
      return;
    }

    const targetAmount = parseFloat(targetAmountStr);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Invalid Target', 'Please enter a target amount greater than 0.');
      return;
    }

    const currentAmount = parseFloat(currentAmountStr) || 0;
    if (currentAmount < 0) {
      Alert.alert('Invalid Amount', 'Current amount cannot be negative.');
      return;
    }

    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      Alert.alert('Invalid Target Date', 'Please enter a valid target date (YYYY-MM-DD).');
      return;
    }

    if (isEditing && existingGoal) {
      await updateGoal({
        ...existingGoal,
        title: title.trim(),
        targetAmount,
        currentAmount,
        targetDate,
        icon,
        color,
        linkedAccountId: linkedAccountId || undefined,
      });
    } else {
      await addGoal({
        title: title.trim(),
        targetAmount,
        currentAmount,
        targetDate,
        icon,
        color,
        linkedAccountId: linkedAccountId || undefined,
      });
    }

    router.back();
  };

  const handleDelete = () => {
    if (!existingGoal) return;

    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete the goal "${existingGoal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGoal(existingGoal.id);
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
          {isEditing ? 'Edit Goal' : 'New Financial Goal'}
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
        {/* Goal Preview Icon Badge */}
        <View style={styles.previewContainer}>
          <View style={[styles.previewBadge, { backgroundColor: color + '25', borderColor: color }]}>
            <Ionicons name={(icon as any) || 'flag'} size={36} color={color} />
          </View>
          <Text style={styles.previewTitle}>{title.trim() || 'Goal Name'}</Text>
          <Text style={styles.previewSub}>
            Target: {settings.currencySymbol} {targetAmountStr || '0'}
          </Text>
        </View>

        {/* Goal Title */}
        <Text style={styles.fieldLabel}>Goal Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Emergency Fund, New Car, Vacation"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        {/* Target Amount */}
        <Text style={styles.fieldLabel}>Target Amount ({settings.currencySymbol})</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 500000"
          placeholderTextColor={COLORS.textMuted}
          value={targetAmountStr}
          onChangeText={setTargetAmountStr}
          keyboardType="numeric"
        />

        {/* Current Saved Amount */}
        <Text style={styles.fieldLabel}>Current Saved Amount ({settings.currencySymbol})</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Initial starting balance (e.g. 50000)"
          placeholderTextColor={COLORS.textMuted}
          value={currentAmountStr}
          onChangeText={setCurrentAmountStr}
          keyboardType="numeric"
        />

        {/* Target Date */}
        <Text style={styles.fieldLabel}>Target Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={targetDate}
          onChangeText={setTargetDate}
        />

        {/* Quick Date Selectors */}
        <View style={styles.quickDateRow}>
          {[
            { label: '6 Months', months: 6 },
            { label: '1 Year', months: 12 },
            { label: '2 Years', months: 24 },
            { label: '5 Years', months: 60 },
          ].map((item) => (
            <Pressable
              key={item.label}
              style={styles.quickDateChip}
              onPress={() => setTargetDate(getQuickDateISO(item.months))}
            >
              <Text style={styles.quickDateText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Linked Account (Optional) */}
        {accounts.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Link to Account (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <Pressable
                style={[
                  styles.accountChip,
                  !linkedAccountId && styles.accountChipActive,
                ]}
                onPress={() => setLinkedAccountId(undefined)}
              >
                <Text
                  style={[
                    styles.accountChipText,
                    !linkedAccountId && styles.accountChipTextActive,
                  ]}
                >
                  None (Standalone)
                </Text>
              </Pressable>
              {accounts.map((acc) => {
                const isSelected = linkedAccountId === acc.id;
                return (
                  <Pressable
                    key={acc.id}
                    style={[styles.accountChip, isSelected && styles.accountChipActive]}
                    onPress={() => setLinkedAccountId(acc.id)}
                  >
                    <Ionicons
                      name={(acc.icon as any) || 'wallet'}
                      size={14}
                      color={isSelected ? '#FFF' : acc.color}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.accountChipText,
                        isSelected && styles.accountChipTextActive,
                      ]}
                    >
                      {acc.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Icon Selection */}
        <Text style={styles.fieldLabel}>Goal Icon</Text>
        <View style={styles.iconGrid}>
          {GOAL_ICONS.map((ic) => {
            const isSelected = icon === ic;
            return (
              <Pressable
                key={ic}
                style={[
                  styles.iconOption,
                  isSelected && { borderColor: color, backgroundColor: color + '20' },
                ]}
                onPress={() => setIcon(ic)}
              >
                <Ionicons
                  name={ic as any}
                  size={20}
                  color={isSelected ? color : COLORS.textMuted}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Color Selection */}
        <Text style={styles.fieldLabel}>Accent Color</Text>
        <View style={styles.colorRow}>
          {GOAL_COLORS.map((c) => {
            const isSelected = color === c;
            return (
              <Pressable
                key={c}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  isSelected && styles.colorOptionSelected,
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
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Create Goal'}</Text>
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
    padding: 6,
  },
  deleteHeaderBtn: {
    padding: 6,
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
  previewContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  previewBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: SPACING.xs,
  },
  previewTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  previewSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
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
  quickDateRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  quickDateChip: {
    backgroundColor: COLORS.card,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickDateText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    marginRight: 8,
  },
  accountChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  accountChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  accountChipTextActive: {
    color: '#FFF',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    marginBottom: SPACING.lg,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
