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
import { CurrencyConfig, TransactionType } from '../../types';
import { ExportService } from '../../services/export';
import { useRouter } from 'expo-router';

const CATEGORY_ICONS = [
  'cart',
  'fast-food',
  'car',
  'flash',
  'film',
  'medkit',
  'briefcase',
  'school',
  'home',
  'airplane',
  'fitness',
  'gift',
  'cash',
  'pricetag',
];

const CATEGORY_COLORS = [
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#F43F5E',
  '#14B8A6',
];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    accounts,
    categories,
    goals,
    holdings,
    rules,
    addRule,
    deleteRule,
    addCategory,
    settings,
    updateSettings,
    resetDemoData,
    clearAllData,
    formatAmount,
    transactions,
    budgets,
    recurringItems,
  } = useFinancial();

  // Modals state
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  // Rule Modal State
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState(categories[0]?.id || '');
  const [ruleTag, setRuleTag] = useState('');

  // Category Modal State
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<TransactionType>('expense');
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);
  const [catIcon, setCatIcon] = useState(CATEGORY_ICONS[0]);

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

  const handleSaveRule = async () => {
    if (!ruleKeyword.trim()) {
      Alert.alert('Keyword Required', 'Please enter a keyword to match (e.g. uber, netflix).');
      return;
    }
    if (!ruleCategoryId) {
      Alert.alert('Category Required', 'Please select a destination category.');
      return;
    }

    await addRule({
      keyword: ruleKeyword.trim(),
      categoryId: ruleCategoryId,
      tag: ruleTag.trim() ? (ruleTag.startsWith('#') ? ruleTag.trim() : `#${ruleTag.trim()}`) : undefined,
    });

    setRuleModalVisible(false);
    setRuleKeyword('');
    setRuleTag('');
    Alert.alert('Rule Saved', 'New auto-categorization rule added successfully!');
  };

  const handleDeleteRule = (id: string, keyword: string) => {
    Alert.alert(
      'Delete Rule',
      `Delete automation rule for "${keyword}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRule(id) },
      ]
    );
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the category.');
      return;
    }

    await addCategory({
      name: catName.trim(),
      type: catType,
      color: catColor,
      icon: catIcon,
    });

    setCategoryModalVisible(false);
    setCatName('');
    Alert.alert('Category Created', `Custom category "${catName.trim()}" added!`);
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
        goals,
        holdings,
        rules,
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
      'This will populate your app with rich sample transactions, accounts, investments, and goals in LKR (Rs.) for testing. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load Demo Data', onPress: () => resetDemoData() },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Records',
      'This will erase all transaction history, budgets, investments, goals, and scheduled bills. Are you sure?',
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
          <Text style={styles.subtitle}>Monarch wealth preferences & automation</Text>
        </View>

        {/* Accounts / Wallets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Accounts ({accounts.length})</Text>
            <Pressable
              style={styles.addAccountBtn}
              onPress={() => router.push('/modal/account')}
              accessibilityRole="button"
              accessibilityLabel="Add New Account"
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addAccountBtnText}>Add Account</Text>
            </Pressable>
          </View>

          {accounts.map((acc) => (
            <Pressable
              key={acc.id}
              onPress={() => router.push({ pathname: '/modal/account', params: { id: acc.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${acc.name}`}
            >
              <Card style={styles.accountCard}>
                <View style={styles.accountRow}>
                  <View style={[styles.accIconWrap, { backgroundColor: acc.color + '20' }]}>
                    <Ionicons
                      name={(acc.icon as any) || 'wallet'}
                      size={22}
                      color={acc.color}
                    />
                  </View>
                  <View style={styles.accDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.accName}>{acc.name}</Text>
                      <Ionicons name="pencil" size={12} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.accType}>
                      {acc.type.toUpperCase()}{' '}
                      {acc.isLiability ? '• LIABILITY' : 'ACCOUNT'}
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
            </Pressable>
          ))}
        </View>

        {/* Automation & Rules Section (Monarch Rules Engine) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rules & Automation ({rules.length})</Text>
            <Pressable
              style={styles.addAccountBtn}
              onPress={() => setRuleModalVisible(true)}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addAccountBtnText}>New Rule</Text>
            </Pressable>
          </View>

          {rules.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="flash-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No automation rules yet</Text>
              <Text style={styles.emptySubtitle}>
                Auto-assign categories and tags based on transaction keywords (e.g. &apos;uber&apos; → Transport).
              </Text>
              <Pressable
                style={styles.emptyActionBtn}
                onPress={() => setRuleModalVisible(true)}
              >
                <Text style={styles.emptyActionBtnText}>Create Automation Rule</Text>
              </Pressable>
            </Card>
          ) : (
            <Card style={styles.rulesListCard}>
              {rules.map((rule, idx) => {
                const targetCat = categories.find((c) => c.id === rule.categoryId);
                const isLast = idx === rules.length - 1;
                return (
                  <View
                    key={rule.id}
                    style={[styles.ruleRow, !isLast && styles.ruleRowBorder]}
                  >
                    <View style={styles.ruleLeft}>
                      <View style={styles.keywordBadge}>
                        <Text style={styles.keywordText}>{rule.keyword}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={14} color={COLORS.textMuted} />
                      {targetCat && (
                        <View
                          style={[
                            styles.catBadge,
                            { backgroundColor: targetCat.color + '20' },
                          ]}
                        >
                          <Text style={[styles.catBadgeText, { color: targetCat.color }]}>
                            {targetCat.name}
                          </Text>
                        </View>
                      )}
                      {rule.tag && (
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{rule.tag}</Text>
                        </View>
                      )}
                    </View>

                    <Pressable
                      onPress={() => handleDeleteRule(rule.id, rule.keyword)}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {/* Custom Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories ({categories.length})</Text>
            <Pressable
              style={styles.addAccountBtn}
              onPress={() => setCategoryModalVisible(true)}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addAccountBtnText}>New Category</Text>
            </Pressable>
          </View>

          <Card style={styles.catGridCard}>
            <View style={styles.catGrid}>
              {categories.map((c) => (
                <View key={c.id} style={styles.catItemChip}>
                  <View style={[styles.catChipIcon, { backgroundColor: c.color + '20' }]}>
                    <Ionicons name={(c.icon as any) || 'pricetag'} size={14} color={c.color} />
                  </View>
                  <Text style={styles.catChipText} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Custom</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Card>
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
                <Text style={styles.statNum}>{accounts.length}</Text>
                <Text style={styles.statDesc}>Accounts</Text>
              </View>
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
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{goals.length}</Text>
                <Text style={styles.statDesc}>Goals</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{holdings.length}</Text>
                <Text style={styles.statDesc}>Holdings</Text>
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
                  <Text style={styles.menuSubtitle}>Restore sample Monarch records in LKR (Rs.)</Text>
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
                    Clear All Records
                  </Text>
                  <Text style={styles.menuSubtitle}>Reset to fresh clean install</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </Pressable>
          </Card>
        </View>

        {/* Footer Note */}
        <View style={styles.footerInfo}>
          <Text style={styles.versionText}>Money Management App v1.2.0</Text>
          <Text style={styles.subVersionText}>Monarch Wealth Edition • Offline-First</Text>
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
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Add Automation Rule Modal */}
      <Modal
        visible={ruleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRuleModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRuleModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Automation Rule</Text>
              <Pressable onPress={() => setRuleModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>When Note / Payee Contains</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. uber, netflix, salary, keells"
              placeholderTextColor={COLORS.textMuted}
              value={ruleKeyword}
              onChangeText={setRuleKeyword}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Assign to Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: SPACING.sm }}
            >
              {categories.map((c) => {
                const isSelected = ruleCategoryId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.ruleCatChip,
                      isSelected && {
                        backgroundColor: c.color,
                        borderColor: c.color,
                      },
                    ]}
                    onPress={() => setRuleCategoryId(c.id)}
                  >
                    <Text
                      style={[
                        styles.ruleCatChipText,
                        isSelected && { color: '#FFF', fontWeight: '700' },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Auto Tag (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. #commute, #tax-deductible, #work"
              placeholderTextColor={COLORS.textMuted}
              value={ruleTag}
              onChangeText={setRuleTag}
              autoCapitalize="none"
            />

            <Pressable style={styles.primaryModalBtn} onPress={handleSaveRule}>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.primaryModalBtnText}>Save Rule</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Add Custom Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Custom Category</Text>
              <Pressable onPress={() => setCategoryModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Category Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Pet Care, Software, Gym"
              placeholderTextColor={COLORS.textMuted}
              value={catName}
              onChangeText={setCatName}
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeToggleRow}>
              {(['expense', 'income'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.typeToggleBtn,
                    catType === t && {
                      backgroundColor: t === 'expense' ? COLORS.expense : COLORS.income,
                    },
                  ]}
                  onPress={() => setCatType(t)}
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      catType === t && { color: '#FFF', fontWeight: '700' },
                    ]}
                  >
                    {t.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Category Icon</Text>
            <View style={styles.iconSelectionRow}>
              {CATEGORY_ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  style={[
                    styles.iconOptionChip,
                    catIcon === ic && {
                      backgroundColor: catColor + '25',
                      borderColor: catColor,
                    },
                  ]}
                  onPress={() => setCatIcon(ic)}
                >
                  <Ionicons
                    name={ic as any}
                    size={18}
                    color={catIcon === ic ? catColor : COLORS.textMuted}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Accent Color</Text>
            <View style={styles.colorSelectionRow}>
              {CATEGORY_COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.colorChip,
                    { backgroundColor: c },
                    catColor === c && styles.colorChipSelected,
                  ]}
                  onPress={() => setCatColor(c)}
                >
                  {catColor === c && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.primaryModalBtn} onPress={handleSaveCategory}>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.primaryModalBtnText}>Create Category</Text>
            </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  addAccountBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  accountCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accIconWrap: {
    width: 42,
    height: 42,
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
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  accBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  rulesListCard: {
    padding: 0,
    overflow: 'hidden',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  ruleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ruleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  keywordBadge: {
    backgroundColor: COLORS.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keywordText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  tagBadgeText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  catGridCard: {
    padding: SPACING.md,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  catChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 100,
  },
  customBadge: {
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  customBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 9,
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
    fontSize: 15,
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
    marginLeft: 56,
  },
  statsCard: {
    padding: SPACING.md,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statBox: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: {
    color: COLORS.primaryLight,
    fontSize: 18,
    fontWeight: '800',
  },
  statDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  subVersionText: {
    color: COLORS.textMuted,
    fontSize: 11,
    opacity: 0.6,
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
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  ruleCatChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginRight: 6,
  },
  ruleCatChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.xs,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeToggleText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  iconSelectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.xs,
  },
  iconOptionChip: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  colorChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipSelected: {
    borderWidth: 2.5,
    borderColor: '#FFF',
  },
  primaryModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  primaryModalBtnText: {
    color: '#FFF',
    fontSize: 14,
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
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  emptyActionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
