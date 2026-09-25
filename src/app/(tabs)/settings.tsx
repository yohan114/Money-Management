import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, RADIUS, SPACING, CURRENCIES } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { CurrencyConfig } from '../../types';
import { ExportService } from '../../services/export';

export default function SettingsScreen() {
  const {
    accounts,
    categories,
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
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  // Filter currencies by search query
  const filteredCurrencies = useMemo(() => {
    const q = currencySearchQuery.toLowerCase().trim();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [currencySearchQuery]);

  const handleSelectCurrency = (curr: CurrencyConfig) => {
    updateSettings({
      currency: curr.code,
      currencySymbol: curr.symbol,
    });
    setCurrencyModalVisible(false);
    setCurrencySearchQuery('');
  };

  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Unavailable',
          'Biometric hardware or enrollment (Fingerprint / Face ID) is not set up on this device.'
        );
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric protection',
        fallbackLabel: 'Use Device Passcode',
      });

      if (auth.success) {
        await updateSettings({ biometricLock: true });
        Alert.alert('Protection Enabled', 'App is now secured with biometric authentication.');
      }
    } else {
      await updateSettings({ biometricLock: false });
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await ExportService.exportTransactionsToCSV(
        transactions,
        categories,
        accounts,
        settings.currency
      );
    } catch {
      Alert.alert('Export Failed', 'An error occurred while exporting your CSV records.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      await ExportService.exportJSONBackup({
        transactions,
        categories,
        accounts,
        budgets,
        recurringItems,
        settings,
        exportedAt: new Date().toISOString(),
      });
    } catch {
      Alert.alert('Export Failed', 'An error occurred while creating your JSON backup.');
    } finally {
      setExporting(false);
    }
  };

  const handleResetDemo = () => {
    Alert.alert(
      'Load Demo Data',
      'This will populate your app with sample transactions, budgets, and bills in LKR (Rs.) for easy testing. Proceed?',
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

            {/* Biometric Lock Toggle */}
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Ionicons name="finger-print-outline" size={18} color={COLORS.purple} />
                </View>
                <View>
                  <Text style={styles.menuTitle}>Biometric Lock</Text>
                  <Text style={styles.menuSubtitle}>Fingerprint / Face ID protection</Text>
                </View>
              </View>
              <Switch
                value={settings.biometricLock}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#FFF"
              />
            </View>

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

        {/* Export Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reports & Exports</Text>
          <Card style={styles.menuCard}>
            <Pressable
              style={styles.menuItem}
              onPress={handleExportCSV}
              disabled={exporting}
              accessibilityRole="button"
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: COLORS.primaryGlow }]}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.primaryLight} />
                </View>
                <View>
                  <Text style={styles.menuTitle}>Export to CSV (Excel)</Text>
                  <Text style={styles.menuSubtitle}>Share via WhatsApp, Email, or Drive</Text>
                </View>
              </View>
              <Ionicons name="share-outline" size={18} color={COLORS.primaryLight} />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItem}
              onPress={handleExportJSON}
              disabled={exporting}
              accessibilityRole="button"
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <Ionicons name="cloud-download-outline" size={18} color={COLORS.info} />
                </View>
                <View>
                  <Text style={styles.menuTitle}>Full JSON Backup</Text>
                  <Text style={styles.menuSubtitle}>Complete portable database dump</Text>
                </View>
              </View>
              <Ionicons name="download-outline" size={18} color={COLORS.info} />
            </Pressable>
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
                  <Text style={styles.menuSubtitle}>Restore rich sample data in LKR (Rs.)</Text>
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
          <Text style={styles.versionText}>Money Management App v1.1.0</Text>
          <Text style={styles.subVersionText}>Offline-First • Cross-Platform Mobile</Text>
        </View>
      </ScrollView>

      {/* Currency Selection Modal with Instant Search */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCurrencyModalVisible(false);
          setCurrencySearchQuery('');
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setCurrencyModalVisible(false);
            setCurrencySearchQuery('');
          }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Currency</Text>
              <Pressable
                onPress={() => {
                  setCurrencyModalVisible(false);
                  setCurrencySearchQuery('');
                }}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            {/* Currency Search Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search currency, country, or code..."
                placeholderTextColor={COLORS.textMuted}
                value={currencySearchQuery}
                onChangeText={setCurrencySearchQuery}
                autoCorrect={false}
              />
              {currencySearchQuery.length > 0 && (
                <Pressable onPress={() => setCurrencySearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </Pressable>
              )}
            </View>

            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              {filteredCurrencies.map((curr) => {
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
              {filteredCurrencies.length === 0 && (
                <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                    No currencies matching "{currencySearchQuery}"
                  </Text>
                </View>
              )}
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
    flex: 1,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    padding: 0,
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
