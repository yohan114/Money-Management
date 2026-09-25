import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { TransactionType } from '../../types';

export default function TransactionModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialType = (params.type as TransactionType) || 'expense';

  const { categories, accounts, addTransaction, settings } = useFinancial();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Available categories for selected type
  const typeCategories = categories.filter((c) => c.type === type);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    typeCategories[0]?.id || ''
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ''
  );

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const newCats = categories.filter((c) => c.type === newType);
    if (newCats.length > 0) {
      setSelectedCategoryId(newCats[0].id);
    }
  };

  const handleAddPreset = (val: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + val).toString());
  };

  const handlePickReceipt = async () => {
    Alert.alert('Attach Receipt', 'Choose a source for your receipt photo:', [
      {
        text: 'Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
          }
          const res = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.7,
          });
          if (!res.canceled && res.assets && res.assets.length > 0) {
            setImageUri(res.assets[0].uri);
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
          });
          if (!res.canceled && res.assets && res.assets.length > 0) {
            setImageUri(res.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Category Required', 'Please pick a category.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Account Required', 'Please select an account.');
      return;
    }

    await addTransaction({
      type,
      amount,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
      note: note.trim() || undefined,
      imageUri: imageUri || undefined,
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>New Transaction</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type Switcher */}
          <View style={styles.typeSwitcher}>
            <Pressable
              style={[
                styles.typeBtn,
                type === 'expense' && { backgroundColor: COLORS.expense },
              ]}
              onPress={() => handleTypeChange('expense')}
            >
              <Ionicons
                name="arrow-up-circle"
                size={18}
                color={type === 'expense' ? '#FFF' : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  type === 'expense' && styles.typeBtnTextActive,
                ]}
              >
                Expense
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.typeBtn,
                type === 'income' && { backgroundColor: COLORS.income },
              ]}
              onPress={() => handleTypeChange('income')}
            >
              <Ionicons
                name="arrow-down-circle"
                size={18}
                color={type === 'income' ? '#FFF' : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  type === 'income' && styles.typeBtnTextActive,
                ]}
              >
                Income
              </Text>
            </Pressable>
          </View>

          {/* Amount Display & Input */}
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{settings.currencySymbol}</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              value={amountStr}
              onChangeText={setAmountStr}
              autoFocus
            />
          </View>

          {/* Quick Amount Chips */}
          <View style={styles.chipsRow}>
            {[100, 500, 1000, 5000].map((preset) => (
              <Pressable
                key={preset}
                style={styles.chip}
                onPress={() => handleAddPreset(preset)}
              >
                <Text style={styles.chipText}>+{preset.toLocaleString()}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.chip} onPress={() => setAmountStr('')}>
              <Text style={[styles.chipText, { color: COLORS.expense }]}>Clear</Text>
            </Pressable>
          </View>

          {/* Categories Grid */}
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoriesGrid}>
            {typeCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.catItem,
                    isSelected && {
                      borderColor: cat.color,
                      backgroundColor: cat.color + '20',
                    },
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <View
                    style={[
                      styles.catIconWrap,
                      { backgroundColor: isSelected ? cat.color : cat.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={(cat.icon as any) || 'pricetag'}
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
                </Pressable>
              );
            })}
          </View>

          {/* Account Picker */}
          <Text style={styles.fieldLabel}>Account / Wallet</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountScroll}
          >
            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
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
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <Ionicons
                    name={(acc.icon as any) || 'wallet'}
                    size={18}
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

          {/* Note Input */}
          <Text style={styles.fieldLabel}>Note / Description</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add memo (e.g. Supermarket shopping)..."
            placeholderTextColor={COLORS.textMuted}
            value={note}
            onChangeText={setNote}
          />

          {/* Receipt Attachment Section */}
          <Text style={styles.fieldLabel}>Receipt Photo (Optional)</Text>
          {imageUri ? (
            <View style={styles.receiptPreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.receiptPreview} />
              <Pressable
                style={styles.removeReceiptBtn}
                onPress={() => setImageUri(null)}
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="trash" size={16} color="#FFF" />
                <Text style={styles.removeReceiptText}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.attachReceiptBtn}
              onPress={handlePickReceipt}
              accessibilityRole="button"
              accessibilityLabel="Attach Receipt Photo"
            >
              <Ionicons name="camera-outline" size={20} color={COLORS.primaryLight} />
              <Text style={styles.attachReceiptText}>Take Photo or Upload Receipt</Text>
            </Pressable>
          )}

          {/* Submit Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: type === 'expense' ? COLORS.expense : COLORS.income },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSubmit}
            accessibilityRole="button"
          >
            <Text style={styles.submitBtnText}>
              Save {type === 'expense' ? 'Expense' : 'Income'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    gap: 8,
  },
  typeBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
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
    marginBottom: SPACING.sm,
  },
  currencySymbol: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    color: COLORS.textPrimary,
    fontSize: 44,
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
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
  accountScroll: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  accCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  noteInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attachReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  attachReceiptText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  receiptPreviewContainer: {
    position: 'relative',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptPreview: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  removeReceiptBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  removeReceiptText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
