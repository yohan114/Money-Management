import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, CURRENCIES } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { CurrencyConfig } from '../../types';

export default function SettingsScreen() {
  const {
    accounts,
    settings,
    updateSettings,
    resetDemoData,
    clearAllData,
    formatAmount,
    transactions,
    budgets,
    recurringItems,
  } = useFinancial();

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const handleSelectCurrency = (curr: CurrencyConfig) => {
    updateSettings({
      currency: curr.code,
      currencySymbol: curr.symbol,
    });
    setCurrencyModalVisible(false);
  };

  const handleResetDemo = () => {
    Alert.alert(
      'Load Demo Data',
      'This will populate your app with sample transactions, budgets, and bills for easy testing. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load Demo Data', onPress: () => resetDemoData() },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Records',
      'This will erase all transaction history, budgets, and scheduled bills. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearAllData() },
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
          <Text style={styles.title}>Accounts & Settings</Text>
          <Text style={styles.subtitle}>Preferences & financial accounts</Text>
        </View>

        {/* Accounts / Wallets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Accounts ({accounts.length})</Text>
          </View>

          {accounts.map((acc) => (
            <Card key={acc.id} style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View style={[styles.accIconWrap, { backgroundColor: acc.color + '20' }]}>
                  <Ionicons
                    name={(acc.icon as any) || 'wallet'}
                    size={22}
                    color={acc.color}
                  />
                </View>
                <View style={styles.accDetails}>
                  <Text style={styles.accName}>{acc.name}</Text>
                  <Text style={styles.accType}>
                    {acc.type.toUpperCase()} ACCOUNT
                  </Text>
                </View>
                <Text
                  style={[
                    styles.accBalance,
                    { color: acc.balance >= 0 ? COLORS.textPrimary : COLORS.expense },
                  ]}
                >
                  {formatAmount(acc.balance)}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <Card style={styles.menuCard}>
            {/* Currency Option */}
            <Pressable
              style={styles.menuItem}
              onPress={() => setCurrencyModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Select Currency"
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: COLORS.primaryGlow }]}>
                  <Ionicons name="cash-outline" size={18} color={COLORS.primaryLight} />
                </View>
                <View>
                  <Text style={styles.menuTitle}>Currency</Text>
                  <Text style={styles.menuSubtitle}>
                    {settings.currency} ({settings.currencySymbol})
                  </Text>
                </View>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>Change</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </View>
            </Pressable>

            <View style={styles.menuDivider} />

            {/* Offline Storage Info */}
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.income} />
                </View>
                <View>
                  <Text style={styles.menuTitle}>Offline & Private</Text>
                  <Text style={styles.menuSubtitle}>Stored securely on this device</Text>
                </View>
              </View>
              <Ionicons name="lock-closed" size={16} color={COLORS.income} />
            </View>
          </Card>
        </View>

        {/* Database Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Data Stats</Text>
          <Card style={styles.statsCard}>
            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{transactions.length}</Text>
                <Text style={styles.statDesc}>Transactions</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{budgets.length}</Text>
                <Text style={styles.statDesc}>Budgets</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{recurringItems.length}</Text>
                <Text style={styles.statDesc}>Recurring</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Data Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <Card style={styles.menuCard}>
            <Pressable style={styles.menuItem} onPress={handleResetDemo}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: COLORS.primaryGlow }]}>
                  <Ionicons name="refresh" size={18} color={COLORS.primaryLight} />
                </View>
                <View>
                  <Text style={styles.menuTitle}>Load Sample Demo Data</Text>
                  <Text style={styles.menuSubtitle}>Test the app with realistic data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItem} onPress={handleClearAll}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: COLORS.expenseBg }]}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.expense} />
                </View>
                <View>
                  <Text style={[styles.menuTitle, { color: COLORS.expense }]}>
                    Clear All Transactions
                  </Text>
                  <Text style={styles.menuSubtitle}>Reset to empty state</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </Pressable>
          </Card>
        </View>

        {/* Footer Note */}
        <View style={styles.footerInfo}>
          <Text style={styles.versionText}>Money Management App v1.0.0</Text>
          <Text style={styles.subVersionText}>Offline-First • Cross-Platform Mobile</Text>
        </View>
      </ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCurrencyModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Currency</Text>
              <Pressable
                onPress={() => setCurrencyModalVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {CURRENCIES.map((curr) => {
                const isSelected = settings.currency === curr.code;
                return (
                  <Pressable
                    key={curr.code}
                    style={[
                      styles.currencyItem,
                      isSelected && styles.currencyItemActive,
                    ]}
                    onPress={() => handleSelectCurrency(curr)}
                  >
                    <View style={styles.currencyLeft}>
                      <View style={styles.currencySymbolBadge}>
                        <Text style={styles.currencySymbolText}>{curr.symbol}</Text>
                      </View>
                      <View>
                        <Text style={styles.currencyName}>{curr.name}</Text>
                        <Text style={styles.currencyCode}>{curr.code}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={COLORS.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  accountCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  accDetails: {
    flex: 1,
  },
  accName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  accType: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  accBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuValue: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  statsCard: {
    padding: SPACING.md,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  statDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  subVersionText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  currencyItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: RADIUS.sm,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  currencySymbolBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbolText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  currencyName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  currencyCode: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
