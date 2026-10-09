import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { FirebaseProjectConfig } from '../../types';

export default function LoginScreen() {
  const router = useRouter();
  const {
    appUser,
    syncStatus,
    migrationReport,
    signInWithGoogle,
    signInWithAccessToken,
    signInWithDemoAccount,
    signOutUser,
    migrateLocalData,
    syncNow,
    checkForRemoteUserCloudData,
    saveFirebaseProjectConfig,
    getFirebaseProjectConfig,
    restoreFromBackupPayload,
    accounts,
    transactions,
    budgets,
    vehicles,
    loans,
  } = useFinancial();

  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationStep, setMigrationStep] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFirebaseConfig, setShowFirebaseConfig] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');

  // Firebase Config inputs
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbAppId, setFbAppId] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('');

  useEffect(() => {
    getFirebaseProjectConfig().then((cfg) => {
      if (cfg) {
        setFbApiKey(cfg.apiKey || '');
        setFbProjectId(cfg.projectId || '');
        setFbAppId(cfg.appId || '');
        setFbAuthDomain(cfg.authDomain || '');
      }
    });
  }, [getFirebaseProjectConfig]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const res = await signInWithGoogle(clientIdInput.trim() || undefined);
      if (res.success && res.user) {
        Alert.alert(
          'Sign-In Successful!',
          `Signed in as ${res.user.displayName} (${res.user.email}).\n\nYour data will now automatically sync to the cloud under your personal user account.`,
          [{ text: 'Continue' }]
        );
      } else if (res.error && !res.error.includes('cancelled')) {
        Alert.alert('Sign-In Notice', res.error);
      }
    } catch (e: any) {
      Alert.alert('Authentication Error', e?.message || 'Could not complete Google Sign-In.');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSignIn = async () => {
    if (!tokenInput.trim()) {
      Alert.alert('Token Required', 'Please paste a valid Google Access Token.');
      return;
    }
    try {
      setLoading(true);
      const res = await signInWithAccessToken(tokenInput.trim());
      if (res.success && res.user) {
        Alert.alert('Linked with Token', `Connected as ${res.user.email}`);
        setTokenInput('');
      } else {
        Alert.alert('Token Error', res.error || 'Invalid token.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithDemoAccount('demo.user@gmail.com', 'Monarch User');
      Alert.alert('Demo Account Active', `Logged in as ${user.displayName} (${user.email}).`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out & Privacy',
      'Signing out will stop active cloud synchronization. Your local financial records will remain safe and private on this device.\n\nAre you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOutUser();
            Alert.alert('Signed Out', 'You are now using offline guest storage.');
          },
        },
      ]
    );
  };

  const handleMigrate = async () => {
    if (!appUser) return;
    try {
      setMigrating(true);
      const rep = await migrateLocalData((stage, msg) => {
        setMigrationStep(`Stage ${stage}/4: ${msg}`);
      });
      Alert.alert(
        'Migration Complete!',
        `Successfully linked and uploaded ${rep.uploadedCount} local records to ${appUser.email}.\n\nYour records are now permanently backed up in the cloud.`
      );
    } catch (e: any) {
      Alert.alert('Migration Error', e?.message || 'Could not complete migration.');
    } finally {
      setMigrating(false);
      setMigrationStep('');
    }
  };

  const handleCheckRemoteData = async () => {
    if (!appUser) return;
    try {
      setLoading(true);
      const res = await checkForRemoteUserCloudData();
      if (res.hasRemoteData && res.payload) {
        const stats = res.payload.stats;
        Alert.alert(
          'Cloud Records Found!',
          `Found previous cloud backup from ${res.source === 'firestore' ? 'Cloud Firestore' : 'Google Drive'}:\n• ${stats.accountsCount} Accounts\n• ${stats.transactionsCount} Transactions\n• ${stats.budgetsCount} Budgets\n\nWould you like to restore this data onto this device?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore Now',
              onPress: async () => {
                await restoreFromBackupPayload(res.payload!);
                Alert.alert('Restored!', 'Your cloud data has been loaded successfully.');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'No Prior Backups Found',
          'We did not find any existing cloud database snapshots for this account. Tap "Migrate" or "Sync Now" to save your current device records to the cloud.'
        );
      }
    } catch (e: any) {
      Alert.alert('Check Error', e?.message || 'Could not check remote cloud data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFirebase = async () => {
    if (!fbApiKey.trim() || !fbProjectId.trim()) {
      Alert.alert('Missing Fields', 'API Key and Project ID are required.');
      return;
    }
    const config: FirebaseProjectConfig = {
      apiKey: fbApiKey.trim(),
      projectId: fbProjectId.trim(),
      appId: fbAppId.trim() || 'money-management',
      authDomain: fbAuthDomain.trim() || `${fbProjectId.trim()}.firebaseapp.com`,
    };
    await saveFirebaseProjectConfig(config);
    Alert.alert('Firebase Configured', 'Firebase project settings saved successfully!');
    setShowFirebaseConfig(false);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Google Account & Sync</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* If user is NOT signed in */}
        {!appUser ? (
          <View>
            {/* Hero Card */}
            <Card style={styles.heroCard}>
              <View style={styles.heroIconBox}>
                <Ionicons name="cloud-upload" size={32} color={COLORS.primaryLight} />
              </View>
              <Text style={styles.heroTitle}>Save & Sync Across Devices</Text>
              <Text style={styles.heroSub}>
                Sign in with Google to securely synchronize your accounts, budgets, and vehicle logs to the cloud.
                Reinstall or switch phones anytime without losing records.
              </Text>

              {/* Value props */}
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.income} />
                  <Text style={styles.featureText}>Automatic cloud backups on every change</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.income} />
                  <Text style={styles.featureText}>Instant recovery when reinstalling the app</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.income} />
                  <Text style={styles.featureText}>Local-first: full offline access anytime</Text>
                </View>
              </View>

              {/* Main Google Sign-In Button */}
              <Pressable
                style={[styles.googleSignInBtn, loading && { opacity: 0.7 }]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#1F2937" />
                ) : (
                  <>
                    <View style={styles.googleIconCircle}>
                      <Ionicons name="logo-google" size={16} color="#4285F4" />
                    </View>
                    <Text style={styles.googleSignInBtnText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              {/* Demo Account Button for emulator/quick testing */}
              <Pressable style={styles.demoBtn} onPress={handleDemoSignIn} disabled={loading}>
                <Ionicons name="flash-outline" size={14} color={COLORS.primaryLight} />
                <Text style={styles.demoBtnText}>Try Instant Demo Account (Test Sync)</Text>
              </Pressable>
            </Card>

            {/* Advanced & Firebase Configuration */}
            <Card style={styles.optionsCard}>
              <Pressable
                style={styles.optionsHeader}
                onPress={() => setShowAdvanced(!showAdvanced)}
              >
                <Text style={styles.optionsTitle}>Custom Client ID or Access Token</Text>
                <Ionicons
                  name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textMuted}
                />
              </Pressable>

              {showAdvanced && (
                <View style={styles.optionsBody}>
                  <Text style={styles.inputLabel}>Google Web Client ID (Optional):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 12345.apps.googleusercontent.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={clientIdInput}
                    onChangeText={setClientIdInput}
                    autoCapitalize="none"
                  />

                  <Text style={[styles.inputLabel, { marginTop: 10 }]}>Direct Access Token:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Paste Bearer Access Token"
                    placeholderTextColor={COLORS.textMuted}
                    value={tokenInput}
                    onChangeText={setTokenInput}
                    autoCapitalize="none"
                  />

                  <Pressable style={styles.submitBtn} onPress={handleTokenSignIn} disabled={loading}>
                    <Text style={styles.submitBtnText}>Sign In with Token</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          </View>
        ) : (
          /* If user IS signed in */
          <View>
            {/* Account Profile Card (Section 8 of Plan) */}
            <Card style={styles.profileCard}>
              <View style={styles.profileRow}>
                {appUser.photoUrl ? (
                  <Image source={{ uri: appUser.photoUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {appUser.displayName ? appUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {appUser.displayName}
                    </Text>
                    <View style={styles.providerBadge}>
                      <Text style={styles.providerBadgeText}>
                        {appUser.provider === 'firebase' ? 'FIREBASE' : 'GOOGLE'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {appUser.email}
                  </Text>
                  <Text style={styles.profileUid} numberOfLines={1}>
                    UID: {appUser.uid}
                  </Text>
                </View>
              </View>

              <View style={styles.profileDivider} />

              {/* Sync Status Row */}
              <View style={styles.syncStatusRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            syncStatus.state === 'synced'
                              ? COLORS.income
                              : syncStatus.state === 'syncing'
                              ? COLORS.primary
                              : syncStatus.state === 'offline'
                              ? COLORS.warning
                              : COLORS.expense,
                        },
                      ]}
                    />
                    <Text style={styles.statusTitle}>
                      {syncStatus.state === 'synced'
                        ? 'Cloud Synced'
                        : syncStatus.state === 'syncing'
                        ? 'Syncing in Progress...'
                        : syncStatus.state === 'offline'
                        ? 'Saved Locally (Offline)'
                        : 'Sync Error'}
                    </Text>
                  </View>
                  <Text style={styles.statusMeta}>
                    Last sync: {formatDate(syncStatus.lastSyncedAt)}
                  </Text>
                </View>

                <Pressable
                  style={[styles.syncNowBtn, syncStatus.state === 'syncing' && { opacity: 0.6 }]}
                  onPress={syncNow}
                  disabled={syncStatus.state === 'syncing'}
                >
                  <Ionicons name="sync" size={14} color="#FFF" />
                  <Text style={styles.syncNowBtnText}>Sync Now</Text>
                </Pressable>
              </View>
            </Card>

            {/* 4-Stage Legacy Data Migration Card (Section 12 of Plan) */}
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="swap-horizontal" size={18} color={COLORS.primaryLight} />
                  <Text style={styles.cardTitle}>Legacy Data Migration</Text>
                </View>
                {migrationReport?.status === 'completed' && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.badgeText, { color: COLORS.income }]}>MIGRATED</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardDesc}>
                Associates your existing local accounts, transactions, and vehicle records with your Google cloud UID
                so they are safely backed up under this account.
              </Text>

              {/* Discovered Records Preview */}
              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{accounts.length}</Text>
                  <Text style={styles.statLabel}>Accounts</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{transactions.length}</Text>
                  <Text style={styles.statLabel}>Transactions</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{budgets.length}</Text>
                  <Text style={styles.statLabel}>Budgets</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{vehicles.length}</Text>
                  <Text style={styles.statLabel}>Vehicles</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{loans.length}</Text>
                  <Text style={styles.statLabel}>Loans</Text>
                </View>
              </View>

              {migrationStep ? (
                <View style={styles.migrationProgressBox}>
                  <ActivityIndicator size="small" color={COLORS.primaryLight} />
                  <Text style={styles.migrationStepText}>{migrationStep}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.actionBtn, migrating && { opacity: 0.6 }]}
                onPress={handleMigrate}
                disabled={migrating}
              >
                <Ionicons name="cloud-upload-outline" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>
                  {migrationReport?.status === 'completed'
                    ? 'Re-upload / Update Cloud Snapshot'
                    : 'Migrate Local Records to Cloud (4 Stages)'}
                </Text>
              </Pressable>
            </Card>

            {/* Cross-Device / Reinstall Recovery Card (Section 3 of Plan) */}
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="phone-portrait-outline" size={18} color={COLORS.info} />
                  <Text style={styles.cardTitle}>Multi-Device & Reinstall Recovery</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>
                Switching phones or reinstalled the app? Check your Google Cloud vault to retrieve and link your previous records.
              </Text>

              <Pressable
                style={[styles.actionBtnSecondary, loading && { opacity: 0.6 }]}
                onPress={handleCheckRemoteData}
                disabled={loading}
              >
                <Ionicons name="search" size={16} color={COLORS.primaryLight} />
                <Text style={styles.actionBtnSecondaryText}>Check Cloud for Saved Backups</Text>
              </Pressable>
            </Card>

            {/* Firebase Custom Credentials (Section 4 & 5 of Plan) */}
            <Card style={styles.optionsCard}>
              <Pressable
                style={styles.optionsHeader}
                onPress={() => setShowFirebaseConfig(!showFirebaseConfig)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="flame-outline" size={16} color="#F59E0B" />
                  <Text style={styles.optionsTitle}>Firebase Project Credentials</Text>
                </View>
                <Ionicons
                  name={showFirebaseConfig ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textMuted}
                />
              </Pressable>

              {showFirebaseConfig && (
                <View style={styles.optionsBody}>
                  <Text style={styles.cardDesc}>
                    Optionally configure your own Firebase project for real-time Cloud Firestore synchronization.
                  </Text>

                  <Text style={styles.inputLabel}>Firebase API Key:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="AIzaSy..."
                    placeholderTextColor={COLORS.textMuted}
                    value={fbApiKey}
                    onChangeText={setFbApiKey}
                    autoCapitalize="none"
                  />

                  <Text style={[styles.inputLabel, { marginTop: 8 }]}>Project ID:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. money-management-prod"
                    placeholderTextColor={COLORS.textMuted}
                    value={fbProjectId}
                    onChangeText={setFbProjectId}
                    autoCapitalize="none"
                  />

                  <Text style={[styles.inputLabel, { marginTop: 8 }]}>App ID (Optional):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1:12345:android:xyz"
                    placeholderTextColor={COLORS.textMuted}
                    value={fbAppId}
                    onChangeText={setFbAppId}
                    autoCapitalize="none"
                  />

                  <Text style={[styles.inputLabel, { marginTop: 8 }]}>Auth Domain (Optional):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. project-id.firebaseapp.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={fbAuthDomain}
                    onChangeText={setFbAuthDomain}
                    autoCapitalize="none"
                  />

                  <Pressable style={styles.submitBtn} onPress={handleSaveFirebase}>
                    <Text style={styles.submitBtnText}>Save Firebase Config</Text>
                  </Pressable>
                </View>
              )}
            </Card>

            {/* Account Switching & Privacy Controls (Section 13 of Plan) */}
            <View style={{ marginTop: SPACING.md, gap: 10 }}>
              <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={16} color={COLORS.expense} />
                <Text style={styles.signOutBtnText}>Sign Out & Use Guest Storage</Text>
              </Pressable>
            </View>
          </View>
        )}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  heroCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  featureList: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 8,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    flex: 1,
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleSignInBtnText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 10,
  },
  demoBtnText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  optionsCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  optionsTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  optionsBody: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.textPrimary,
    fontSize: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  profileCard: {
    padding: 14,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primaryLight,
    fontSize: 20,
    fontWeight: '800',
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  profileEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  profileUid: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  providerBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  providerBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 9,
    fontWeight: '700',
  },
  profileDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  statusMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  syncNowBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    padding: 14,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  cardDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  migrationProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: RADIUS.xs,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  migrationStepText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#34A853',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  actionBtnSecondaryText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  signOutBtnText: {
    color: COLORS.expense,
    fontSize: 13,
    fontWeight: '700',
  },
});
