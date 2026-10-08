import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';

export default function CloudSyncScreen() {
  const router = useRouter();
  const {
    accounts,
    transactions,
    budgets,
    lastBackupInfo,
    backupToGoogleDrive,
    pickBackupFromDrive,
    restoreFromBackupPayload,
    formatAmount,
    totalNetWorth,
  } = useFinancial();

  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const totalBudgetItems = budgets.reduce(
    (sum, b) => sum + (Array.isArray(b.items) ? b.items.length : 0),
    0
  );

  const formatBackupDate = (isoStr?: string) => {
    if (!isoStr) return 'No backup saved yet';
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} at ${d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return isoStr;
    }
  };

  const handleSaveToDrive = async () => {
    try {
      setSaving(true);
      const metadata = await backupToGoogleDrive();
      Alert.alert(
        'Backup Created Successfully',
        `Your database containing ${metadata.accountsCount} accounts, ${metadata.transactionsCount} transactions, and ${metadata.budgetsCount} budgets is ready.\n\nOn the share menu, choose 'Google Drive' ('Save to Drive') to store it securely in your personal cloud.`,
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Backup Error', e?.message || 'Could not create Google Drive backup.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAndRestore = async () => {
    try {
      setRestoring(true);
      const res = await pickBackupFromDrive();

      if (res.canceled) {
        setRestoring(false);
        return;
      }

      if (res.error || !res.payload || !res.preview) {
        Alert.alert('Invalid Backup File', res.error || 'Failed to parse backup JSON.');
        setRestoring(false);
        return;
      }

      const { payload, preview } = res;

      Alert.alert(
        'Confirm Database Restore',
        `Found backup file: ${preview.fileName}\nSaved: ${formatBackupDate(preview.exportedAt)}\n\nContains:\n• ${preview.accountsCount} Accounts\n• ${preview.transactionsCount} Transactions\n• ${preview.budgetsCount} Budgets (${preview.budgetItemsCount} grocery/shop items)\n• ${preview.recurringCount} Recurring Bills\n• ${preview.goalsCount} Goals & ${preview.holdingsCount} Holdings\n\nRestoring will link and replace your local records with this backup. Proceed?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setRestoring(false);
            },
          },
          {
            text: 'Restore Now',
            style: 'default',
            onPress: async () => {
              try {
                await restoreFromBackupPayload(payload);
                Alert.alert(
                  'Database Restored!',
                  'All your accounts, transactions, grocery budgets, and buying slips have been restored and linked successfully.',
                  [
                    {
                      text: 'View Dashboard',
                      onPress: () => router.replace('/(tabs)'),
                    },
                  ]
                );
              } catch (err: any) {
                Alert.alert('Restore Failed', err?.message || 'Could not restore database.');
              } finally {
                setRestoring(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Restore Error', e?.message || 'Could not pick file from Google Drive.');
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Google Drive Cloud Sync</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cloud Status Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIconRow}>
            <View style={styles.heroIconBox}>
              <Ionicons name="phone-portrait-outline" size={26} color={COLORS.primaryLight} />
            </View>
            <View style={styles.heroArrowBox}>
              <Ionicons name="swap-horizontal" size={22} color={COLORS.primary} />
            </View>
            <View style={[styles.heroIconBox, { backgroundColor: 'rgba(52, 168, 83, 0.15)', borderColor: 'rgba(52, 168, 83, 0.4)' }]}>
              <Ionicons name="cloud-upload" size={26} color="#34A853" />
            </View>
          </View>

          <Text style={styles.heroTitle}>Zero Data Loss with Google Drive</Text>
          <Text style={styles.heroSubtitle}>
            Save your database directly to Google Drive. When you reinstall the app or change phones, restore your entire database in 1 tap.
          </Text>

          {/* Cloud Sync Status Indicator */}
          <View style={styles.statusIndicatorRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: lastBackupInfo ? '#10B981' : '#F59E0B' },
              ]}
            />
            <Text style={styles.statusLabel}>
              {lastBackupInfo ? 'Cloud Backup Active' : 'No Backup Saved Yet'}
            </Text>
          </View>
          <Text style={styles.lastBackupText}>
            Last saved: {formatBackupDate(lastBackupInfo?.lastBackupDate)}
          </Text>
        </Card>

        {/* Current Database Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Local Database</Text>
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{accounts.length}</Text>
                <Text style={styles.statName}>Accounts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{transactions.length}</Text>
                <Text style={styles.statName}>Transactions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{budgets.length}</Text>
                <Text style={styles.statName}>Budgets</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{totalBudgetItems}</Text>
                <Text style={styles.statName}>Items</Text>
              </View>
            </View>
            <View style={styles.netWorthRow}>
              <Text style={styles.netWorthLabel}>Total Net Worth Recorded:</Text>
              <Text style={styles.netWorthVal}>{formatAmount(totalNetWorth)}</Text>
            </View>
          </Card>
        </View>

        {/* Action 1: Save to Google Drive */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Save & Sync to Cloud</Text>
          <Card style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(52, 168, 83, 0.15)' }]}>
                <Ionicons name="cloud-upload-outline" size={24} color="#34A853" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Save to Google Drive</Text>
                <Text style={styles.actionSubtitle}>
                  Creates a secure, portable database package and opens Google Drive to save it.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: '#34A853' },
                pressed && { opacity: 0.85 },
                saving && { opacity: 0.6 },
              ]}
              onPress={handleSaveToDrive}
              disabled={saving || restoring}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Save Database to Google Drive</Text>
                </>
              )}
            </Pressable>

            <View style={styles.tipBox}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.tipText}>
                When the share sheet appears, tap &apos;Drive&apos; (&apos;Save to Drive&apos;) to select your preferred Google Drive folder.
              </Text>
            </View>
          </Card>
        </View>

        {/* Action 2: Restore from Google Drive */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Restore from Cloud</Text>
          <Card style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(66, 133, 244, 0.15)' }]}>
                <Ionicons name="cloud-download-outline" size={24} color="#4285F4" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Restore from Google Drive</Text>
                <Text style={styles.actionSubtitle}>
                  Select your saved backup from Google Drive to automatically link and restore all records.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: '#4285F4' },
                pressed && { opacity: 0.85 },
                restoring && { opacity: 0.6 },
              ]}
              onPress={handlePickAndRestore}
              disabled={saving || restoring}
              accessibilityRole="button"
            >
              {restoring ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="folder-open-outline" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Select Backup from Google Drive</Text>
                </>
              )}
            </Pressable>

            <View style={styles.tipBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
              <Text style={styles.tipText}>
                You will preview the contents and confirm before any existing data is overwritten.
              </Text>
            </View>
          </Card>
        </View>

        {/* Step-by-Step Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Card style={styles.guideCard}>
            <View style={styles.guideStep}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Save Before Uninstalling</Text>
                <Text style={styles.stepDesc}>
                  Tap &apos;Save to Google Drive&apos; periodically. A timestamped JSON file is saved to your personal Google Drive account.
                </Text>
              </View>
            </View>

            <View style={styles.guideStepDivider} />

            <View style={styles.guideStep}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Reinstall or New Device</Text>
                <Text style={styles.stepDesc}>
                  Install Money Management on any phone or after wiping app data.
                </Text>
              </View>
            </View>

            <View style={styles.guideStepDivider} />

            <View style={styles.guideStep}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>1-Tap Auto Link & Restore</Text>
                <Text style={styles.stepDesc}>
                  Tap &apos;Select Backup from Google Drive&apos;, choose your saved file, and your entire database is linked back immediately!
                </Text>
              </View>
            </View>
          </Card>
        </View>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardElevated,
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
  heroCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 168, 83, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: 12,
  },
  heroIconBox: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArrowBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  lastBackupText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  statsCard: {
    padding: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  statName: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  netWorthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
  },
  netWorthLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  netWorthVal: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  actionCard: {
    padding: SPACING.md,
  },
  actionHeader: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.cardElevated,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  tipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  guideCard: {
    padding: SPACING.md,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  stepNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  stepDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  guideStepDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
    marginLeft: 32,
  },
});
