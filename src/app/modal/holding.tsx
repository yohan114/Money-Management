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
import { AssetClass } from '../../types';

const ASSET_CLASSES: { type: AssetClass; label: string; icon: string; color: string }[] = [
  { type: 'stock', label: 'Stock / Equity', icon: 'trending-up', color: '#10B981' },
  { type: 'etf', label: 'Index / ETF', icon: 'pie-chart', color: '#3B82F6' },
  { type: 'crypto', label: 'Crypto Asset', icon: 'logo-bitcoin', color: '#F59E0B' },
  { type: 'real_estate', label: 'Real Estate / Land', icon: 'home', color: '#8B5CF6' },
  { type: 'commodity', label: 'Gold / Commodity', icon: 'diamond', color: '#EC4899' },
  { type: 'other', label: 'Other Asset', icon: 'cube', color: '#06B6D4' },
];

export default function HoldingModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const holdingId = params.id as string | undefined;

  const { holdings, accounts, addHolding, updateHolding, deleteHolding, settings } =
    useFinancial();

  const existingHolding = holdingId ? holdings.find((h) => h.id === holdingId) : undefined;
  const isEditing = !!existingHolding;

  const [symbol, setSymbol] = useState(existingHolding?.symbol || '');
  const [name, setName] = useState(existingHolding?.name || '');
  const [assetClass, setAssetClass] = useState<AssetClass>(
    existingHolding?.assetClass || 'stock'
  );
  const [quantityStr, setQuantityStr] = useState(
    existingHolding ? existingHolding.quantity.toString() : '1'
  );
  const [currentValueStr, setCurrentValueStr] = useState(
    existingHolding ? existingHolding.currentValue.toString() : ''
  );
  const [accountId, setAccountId] = useState(
    existingHolding?.accountId || (accounts[0] ? accounts[0].id : '')
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Asset Name Required', 'Please enter a name for this asset or investment.');
      return;
    }

    const quantity = parseFloat(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0.');
      return;
    }

    const currentValue = parseFloat(currentValueStr);
    if (isNaN(currentValue) || currentValue < 0) {
      Alert.alert('Invalid Valuation', 'Please enter a valid current total market value.');
      return;
    }

    if (!accountId) {
      Alert.alert('Account Required', 'Please link this holding to a financial account.');
      return;
    }

    if (isEditing && existingHolding) {
      await updateHolding({
        ...existingHolding,
        symbol: symbol.trim().toUpperCase(),
        name: name.trim(),
        assetClass,
        quantity,
        currentValue,
        accountId,
      });
    } else {
      await addHolding({
        symbol: symbol.trim().toUpperCase() || name.trim().slice(0, 4).toUpperCase(),
        name: name.trim(),
        assetClass,
        quantity,
        currentValue,
        accountId,
      });
    }

    router.back();
  };

  const handleDelete = () => {
    if (!existingHolding) return;

    Alert.alert(
      'Delete Asset Holding',
      `Are you sure you want to remove "${existingHolding.name}" from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteHolding(existingHolding.id);
            router.back();
          },
        },
      ]
    );
  };

  const selectedClassConfig = ASSET_CLASSES.find((c) => c.type === assetClass) || ASSET_CLASSES[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Asset Holding' : 'Add Investment Asset'}
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
        {/* Preview Badge */}
        <View style={styles.previewContainer}>
          <View
            style={[
              styles.previewBadge,
              {
                backgroundColor: selectedClassConfig.color + '20',
                borderColor: selectedClassConfig.color,
              },
            ]}
          >
            <Ionicons
              name={selectedClassConfig.icon as any}
              size={36}
              color={selectedClassConfig.color}
            />
          </View>
          <Text style={styles.previewTitle}>
            {symbol ? `${symbol.toUpperCase()} - ` : ''}
            {name.trim() || 'Investment Holding'}
          </Text>
          <Text style={styles.previewSub}>
            Value: {settings.currencySymbol} {currentValueStr || '0'}
          </Text>
        </View>

        {/* Asset Class Selector */}
        <Text style={styles.fieldLabel}>Asset Class</Text>
        <View style={styles.assetClassGrid}>
          {ASSET_CLASSES.map((cls) => {
            const isSelected = assetClass === cls.type;
            return (
              <Pressable
                key={cls.type}
                style={[
                  styles.classCard,
                  isSelected && {
                    borderColor: cls.color,
                    backgroundColor: cls.color + '15',
                  },
                ]}
                onPress={() => setAssetClass(cls.type)}
              >
                <Ionicons
                  name={cls.icon as any}
                  size={20}
                  color={isSelected ? cls.color : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.classText,
                    isSelected && { color: cls.color, fontWeight: '700' },
                  ]}
                >
                  {cls.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Name */}
        <Text style={styles.fieldLabel}>Asset / Security Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Apple Inc, Vanguard S&P 500, Bitcoin"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* Ticker / Symbol */}
        <Text style={styles.fieldLabel}>Ticker Symbol / Short Code</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. AAPL, VOO, BTC, GOLD"
          placeholderTextColor={COLORS.textMuted}
          value={symbol}
          onChangeText={setSymbol}
          autoCapitalize="characters"
        />

        {/* Quantity and Total Value Row */}
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Units / Quantity</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 10 or 0.05"
              placeholderTextColor={COLORS.textMuted}
              value={quantityStr}
              onChangeText={setQuantityStr}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1.4 }}>
            <Text style={styles.fieldLabel}>Current Market Value ({settings.currencySymbol})</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 250000"
              placeholderTextColor={COLORS.textMuted}
              value={currentValueStr}
              onChangeText={setCurrentValueStr}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Link Account */}
        {accounts.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Holding Account / Custodian</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {accounts.map((acc) => {
                const isSelected = accountId === acc.id;
                return (
                  <Pressable
                    key={acc.id}
                    style={[styles.accountChip, isSelected && styles.accountChipActive]}
                    onPress={() => setAccountId(acc.id)}
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

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>
            {isEditing ? 'Save Changes' : 'Add to Portfolio'}
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
  assetClassGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  classText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
