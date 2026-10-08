import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { BackupScheduleFrequency, GoogleDriveFile } from '../../types';

export default function CloudSyncScreen() {
  const router = useRouter();
  const {
    accounts,
    transactions,
    budgets,
    loans,
    vehicles,
    fuelLogs,
    googleUser,
    cloudSyncSettings,
    cloudSyncLogs,
    driveBackups,
    isSyncingDrive,
    connectGoogleDrive,
    connectWithAccessToken,
    disconnectGoogleDrive,
    updateCloudSyncSettings,
    backupToGoogleDrive,
    refreshDriveBackups,
    restoreBackupFromDriveFile,
    deleteDriveBackupFile,
    pickBackupFromDrive,
    restoreFromBackupPayload,
    formatAmount,
    totalNetWorth,
  } = useFinancial();

  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);

  // Advanced Token / Client ID entry state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [clientIdInput, setClientIdInput] = useState(cloudSyncSettings.customClientId || '');

  // Fetch Drive backups on mount if Google user is connected
  useEffect(() => {
    if (googleUser?.accessToken) {
      refreshDriveBackups();
    }
  }, [googleUser?.accessToken, refreshDriveBackups]);

  const totalBudgetItems = budgets.reduce(
    (sum, b) => sum + (Array.isArray(b.items) ? b.items.length : 0),
    0
  );

  const formatBackupDate = (isoStr?: string) => {
    if (!isoStr) return 'No backup recorded yet';
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Google OAuth Sign In
  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      const res = await connectGoogleDrive(clientIdInput.trim() || undefined);
      if (res.success) {
        Alert.alert(
          'Google Drive Connected',
          'Successfully connected to Google Drive! You can now write and read cloud backups automatically.'
        );
      } else if (res.error && res.error !== 'Sign in was cancelled.') {
        Alert.alert(
          'Connection Info',
          `${res.error}\n\nTip: You can also use the 'Manual Access Token' option below to link directly.`
        );
      }
    } catch (e: any) {
      Alert.alert('Connection Error', e?.message || 'Could not connect to Google Drive.');
    } finally {
      setConnecting(false);
    }
  };

  // Connect via Access Token
  const handleConnectWithToken = async () => {
    if (!tokenInput.trim()) {
      Alert.alert('Missing Token', 'Please enter a valid Google OAuth access token.');
      return;
    }
    try {
      setConnecting(true);
      const res = await connectWithAccessToken(tokenInput.trim());
      if (res.success) {
        Alert.alert('Connected!', 'Google Drive linked successfully with token.');
        setTokenInput('');
        setShowAdvanced(false);
      } else {
        Alert.alert('Token Error', res.error || 'Failed to authenticate token.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to connect.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google Drive',
      'Are you sure you want to disconnect your Google account from Money Management?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectGoogleDrive();
            Alert.alert('Disconnected', 'Google Drive account disconnected.');
          },
        },
      ]
    );
  };

  // Direct Cloud Backup
  const handleDirectBackupNow = async () => {
    try {
      setSyncing(true);
      const meta = await backupToGoogleDrive('manual');
      if (meta.isDirectSync) {
        Alert.alert(
          'Cloud Sync Complete!',
          `Directly saved to Google Drive:\n• ${meta.fileName}\n• ${meta.accountsCount} Accounts, ${meta.transactionsCount} Transactions\n• ${meta.budgetsCount} Budgets, ${meta.vehiclesCount || 0} Vehicles\n\nYour data is safely stored in Google Drive / MoneyManagement_Backups.`
        );
      } else {
        Alert.alert(
          'Backup File Ready',
          `Snapshot prepared:\n• ${meta.accountsCount} Accounts, ${meta.transactionsCount} Transactions\n\nUse 'Save to Drive' on the share menu to upload.`
        );
      }
    } catch (e: any) {
      Alert.alert('Sync Error', e?.message || 'Failed to sync with Google Drive.');
    } finally {
      setSyncing(false);
    }
  };

  // Restore directly from a Drive file
  const handleRestoreFromDriveFile = (file: GoogleDriveFile) => {
    Alert.alert(
      'Restore From Google Drive',
      `Restore from:\n${file.name}\nSize: ${formatFileSize(file.size)}\nCreated: ${formatBackupDate(file.createdTime)}\n\nThis will download the file from your Google Drive and replace your local records with this backup. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Now',
          style: 'destructive',
          onPress: async () => {
            try {
              setRestoringFileId(file.id);
              await restoreBackupFromDriveFile(file.id);
              Alert.alert(
                'Restore Complete!',
                'Your database was restored successfully from Google Drive.'
              );
            } catch (err: any) {
              Alert.alert('Restore Failed', err?.message || 'Could not restore backup from Google Drive.');
            } finally {
              setRestoringFileId(null);
            }
          },
        },
      ]
    );
  };

  // Delete Drive file
  const handleDeleteDriveFile = (file: GoogleDriveFile) => {
    Alert.alert(
      'Delete Backup from Drive',
      `Delete "${file.name}" from your Google Drive?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteDriveBackupFile(file.id);
              if (success) {
                Alert.alert('Deleted', 'Backup removed from Google Drive.');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete file.');
            }
          },
        },
      ]
    );
  };

  // Fallback: Pick file from device storage/picker
  const handlePickAndRestore = async () => {
    try {
      const res = await pickBackupFromDrive();
      if (res.canceled) return;
      if (res.error || !res.payload || !res.preview) {
        Alert.alert('Invalid Backup File', res.error || 'Failed to parse backup JSON.');
        return;
      }

      const { payload, preview } = res;
      Alert.alert(
        'Confirm Database Restore',
        `File: ${preview.fileName}\nSaved: ${formatBackupDate(preview.exportedAt)}\n\nContains:\n• ${preview.accountsCount} Accounts\n• ${preview.transactionsCount} Transactions\n• ${preview.budgetsCount} Budgets\n• ${preview.vehiclesCount || 0} Vehicles, ${preview.loansCount || 0} Loans\n\nRestoring will link and replace your local records. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Now',
            onPress: async () => {
              await restoreFromBackupPayload(payload);
              Alert.alert('Restore Complete!', 'Your records have been restored.');
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Restore Error', e?.message || 'Failed to restore file.');
    }
  };

  const handleScheduleChange = async (freq: BackupScheduleFrequency) => {
    await updateCloudSyncSettings({ autoBackupFrequency: freq });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Google Drive Cloud</Text>
          <Text style={styles.headerSub}>Read, write & automated backups</Text>
        </View>
        <View style={styles.cloudBadgeHeader}>
          <Ionicons
            name={googleUser ? 'cloud-done' : 'cloud-offline-outline'}
            size={16}
            color={googleUser ? '#34A853' : COLORS.textMuted}
          />
          <Text style={[styles.cloudBadgeHeaderText, { color: googleUser ? '#34A853' : COLORS.textMuted }]}>
            {googleUser ? 'Linked' : 'Not Linked'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: GOOGLE ACCOUNT CONNECTION */}
        <Card elevated style={styles.accountCard}>
          {googleUser ? (
            <View style={styles.connectedUserBox}>
              <View style={styles.userRow}>
                {googleUser.picture ? (
                  <Image source={{ uri: googleUser.picture }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarFallback}>
                    <Ionicons name="person" size={20} color="#FFF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.userName}>{googleUser.name}</Text>
                    <View style={styles.activePill}>
                      <Ionicons name="checkmark-circle" size={12} color="#34A853" />
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  </View>
                  <Text style={styles.userEmail}>{googleUser.email}</Text>
                  <Text style={styles.userFolder}>
                    Folder: Google Drive / {cloudSyncSettings.folderName || 'MoneyManagement_Backups'}
                  </Text>
                </View>
              </View>

              <View style={styles.userActionsRow}>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: '#34A85320', borderColor: '#34A853' }]}
                  onPress={handleDirectBackupNow}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#34A853" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={14} color="#34A853" />
                      <Text style={[styles.smallBtnText, { color: '#34A853' }]}>Sync to Drive</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.smallBtn, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
                  onPress={handleDisconnect}
                >
                  <Ionicons name="log-out-outline" size={14} color={COLORS.expense} />
                  <Text style={[styles.smallBtnText, { color: COLORS.expense }]}>Disconnect</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.connectPromptBox}>
              <View style={styles.googleIconCircle}>
                <Ionicons name="logo-google" size={28} color="#4285F4" />
              </View>
              <Text style={styles.connectTitle}>Link Your Google Drive</Text>
              <Text style={styles.connectSubtitle}>
                Authorize Money Management to create, read, and write automatic backups inside a private folder in your Google Drive.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.connectMainBtn,
                  pressed && { opacity: 0.85 },
                  connecting && { opacity: 0.6 },
                ]}
                onPress={handleConnectGoogle}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#FFF" />
                    <Text style={styles.connectMainBtnText}>Connect with Google</Text>
                  </>
                )}
              </Pressable>

              {/* Advanced Token / Client ID Toggle */}
              <Pressable
                style={styles.advancedToggleBtn}
                onPress={() => setShowAdvanced(!showAdvanced)}
              >
                <Text style={styles.advancedToggleText}>
                  {showAdvanced ? 'Hide Advanced Options' : 'Custom Client ID or Access Token'}
                </Text>
                <Ionicons
                  name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={COLORS.textMuted}
                />
              </Pressable>

              {showAdvanced && (
                <View style={styles.advancedBox}>
                  <Text style={styles.advancedLabel}>Google OAuth Web Client ID (Optional):</Text>
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="e.g. 12345-xyz.apps.googleusercontent.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={clientIdInput}
                    onChangeText={setClientIdInput}
                    autoCapitalize="none"
                  />

                  <Text style={[styles.advancedLabel, { marginTop: 10 }]}>Direct Access Token:</Text>
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Paste Bearer Access Token"
                    placeholderTextColor={COLORS.textMuted}
                    value={tokenInput}
                    onChangeText={setTokenInput}
                    autoCapitalize="none"
                  />

                  <Pressable
                    style={styles.tokenConnectBtn}
                    onPress={handleConnectWithToken}
                    disabled={connecting}
                  >
                    <Text style={styles.tokenConnectBtnText}>Link with Token</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Local Database Summary Card */}
        <Card style={styles.localStatsCard}>
          <View style={styles.localStatsRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="server-outline" size={16} color={COLORS.primaryLight} />
                <Text style={styles.localStatsTitle}>Local Database Snapshot</Text>
              </View>
              <Text style={styles.localStatsSub}>
                {accounts.length} Accounts • {transactions.length} Transactions • {budgets.length} Budgets ({totalBudgetItems} items)
              </Text>
              <Text style={styles.localStatsSub}>
                {vehicles.length} Vehicles • {fuelLogs.length} Fuel Logs • {loans.length} Loans
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={styles.localStatsValLabel}>Net Worth</Text>
              <Text style={styles.localStatsVal}>{formatAmount(totalNetWorth)}</Text>
            </View>
          </View>
        </Card>

        {/* SECTION 2: AUTOMATIC BACKUP SCHEDULE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automated Backup Schedule</Text>
          <Card style={styles.scheduleCard}>
            <Text style={styles.scheduleDesc}>
              Automatically sync your financial data, receipts, and vehicle logs to Google Drive without manual taps.
            </Text>

            <View style={styles.scheduleGrid}>
              {(['off', 'daily', 'weekly', 'on_change'] as BackupScheduleFrequency[]).map((freq) => {
                const isSelected = cloudSyncSettings.autoBackupFrequency === freq;
                const labels: Record<BackupScheduleFrequency, { title: string; sub: string; icon: string }> = {
                  off: { title: 'Off', sub: 'Manual only', icon: 'power-outline' },
                  daily: { title: 'Daily', sub: 'Once a day', icon: 'today-outline' },
                  weekly: { title: 'Weekly', sub: 'Once a week', icon: 'calendar-outline' },
                  on_change: { title: 'On Change', sub: 'Every update', icon: 'sync-outline' },
                };
                const item = labels[freq];
                return (
                  <Pressable
                    key={freq}
                    style={[
                      styles.scheduleChip,
                      isSelected && styles.scheduleChipActive,
                    ]}
                    onPress={() => handleScheduleChange(freq)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={isSelected ? '#34A853' : COLORS.textMuted}
                    />
                    <Text style={[styles.scheduleChipTitle, isSelected && { color: '#34A853', fontWeight: '700' }]}>
                      {item.title}
                    </Text>
                    <Text style={styles.scheduleChipSub}>{item.sub}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.scheduleStatusRow}>
              <Ionicons
                name={cloudSyncSettings.autoBackupFrequency !== 'off' ? 'checkmark-circle' : 'information-circle'}
                size={16}
                color={cloudSyncSettings.autoBackupFrequency !== 'off' ? '#34A853' : COLORS.textMuted}
              />
              <Text style={styles.scheduleStatusText}>
                {cloudSyncSettings.autoBackupFrequency === 'off'
                  ? 'Auto-backup is disabled. Remember to tap Sync manually.'
                  : `Automated ${cloudSyncSettings.autoBackupFrequency} sync is active.`}
                {cloudSyncSettings.lastAutoBackupDate
                  ? ` Last run: ${formatBackupDate(cloudSyncSettings.lastAutoBackupDate)}`
                  : ''}
              </Text>
            </View>
          </Card>
        </View>

        {/* SECTION 3: BACKUPS VAULT IN GOOGLE DRIVE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Backups in Google Drive</Text>
              <Text style={styles.sectionSub}>
                {googleUser ? `${driveBackups.length} file(s) found in Drive` : 'Connect Drive to view files'}
              </Text>
            </View>
            {googleUser && (
              <Pressable
                style={styles.refreshListBtn}
                onPress={() => refreshDriveBackups()}
              >
                <Ionicons name="refresh" size={14} color={COLORS.primaryLight} />
                <Text style={styles.refreshListBtnText}>Refresh</Text>
              </Pressable>
            )}
          </View>

          {isSyncingDrive ? (
            <Card style={styles.emptyCard}>
              <ActivityIndicator size="small" color={COLORS.primaryLight} />
              <Text style={[styles.emptySub, { marginTop: 8 }]}>Connecting to Google Drive...</Text>
            </Card>
          ) : !googleUser ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="cloud-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Google Drive Not Linked</Text>
              <Text style={styles.emptySub}>
                Connect your account above to read and restore backups directly from your Google Drive folder.
              </Text>
            </Card>
          ) : driveBackups.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Backups in Drive Yet</Text>
              <Text style={styles.emptySub}>
                Tap &apos;Sync to Drive&apos; above to save your first cloud backup.
              </Text>
            </Card>
          ) : (
            driveBackups.map((file) => (
              <Card key={file.id} style={styles.fileCard}>
                <View style={styles.fileRow}>
                  <View style={styles.fileIconBox}>
                    <Ionicons name="document-text" size={20} color="#4285F4" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileMeta}>
                      {formatBackupDate(file.createdTime)} • {formatFileSize(file.size)}
                    </Text>
                  </View>
                </View>

                <View style={styles.fileActionRow}>
                  <Pressable
                    style={[styles.fileBtn, { backgroundColor: '#4285F4' }]}
                    onPress={() => handleRestoreFromDriveFile(file)}
                    disabled={restoringFileId === file.id}
                  >
                    {restoringFileId === file.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="cloud-download" size={13} color="#FFF" />
                        <Text style={styles.fileBtnText}>Restore</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={[styles.fileBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                    onPress={() => handleDeleteDriveFile(file)}
                  >
                    <Ionicons name="trash-outline" size={13} color={COLORS.expense} />
                    <Text style={[styles.fileBtnText, { color: COLORS.expense }]}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* SECTION 4: OFFLINE / MANUAL FALLBACK EXPORT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual & Offline Options</Text>
          <Card style={styles.offlineCard}>
            <Pressable style={styles.offlineItem} onPress={handlePickAndRestore}>
              <View style={styles.offlineLeft}>
                <View style={[styles.offlineIconBox, { backgroundColor: '#F59E0B25' }]}>
                  <Ionicons name="folder-open-outline" size={18} color="#F59E0B" />
                </View>
                <View>
                  <Text style={styles.offlineTitle}>Pick Backup from Device</Text>
                  <Text style={styles.offlineSub}>Open system file picker to select a JSON backup</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </Pressable>
          </Card>
        </View>

        {/* SECTION 5: SYNC LOGS & AUDIT TRAIL */}
        {cloudSyncLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sync Activity</Text>
            <Card style={styles.logsCard}>
              {cloudSyncLogs.slice(0, 5).map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <Ionicons
                    name={log.status === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={log.status === 'success' ? '#34A853' : COLORS.expense}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logTitle}>
                      {log.trigger.toUpperCase()} SYNC • {log.status.toUpperCase()}
                    </Text>
                    <Text style={styles.logSub}>
                      {formatBackupDate(log.timestamp)}
                      {log.recordsCount ? ` • ${log.recordsCount} records` : ''}
                      {log.fileSize ? ` • ${formatFileSize(log.fileSize)}` : ''}
                    </Text>
                    {log.error && <Text style={styles.logError}>{log.error}</Text>}
                  </View>
                </View>
              ))}
            </Card>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  cloudBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cloudBadgeHeaderText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  accountCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    borderColor: COLORS.borderHighlight,
  },
  connectedUserBox: {
    gap: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  userFolder: {
    color: '#4285F4',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(52, 168, 83, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  activePillText: {
    color: '#34A853',
    fontSize: 10,
    fontWeight: '700',
  },
  userActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  connectPromptBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  googleIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  connectTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  connectSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
    paddingHorizontal: 10,
  },
  connectMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4285F4',
    width: '100%',
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    marginTop: 18,
  },
  connectMainBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  advancedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
  },
  advancedToggleText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  advancedBox: {
    width: '100%',
    marginTop: 14,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  advancedLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  advancedInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: COLORS.textPrimary,
    fontSize: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tokenConnectBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    marginTop: 10,
  },
  tokenConnectBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  localStatsCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  localStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  localStatsTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  localStatsSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  localStatsValLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  localStatsVal: {
    color: COLORS.income,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  refreshListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refreshListBtnText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  scheduleCard: {
    padding: 14,
    borderRadius: RADIUS.lg,
  },
  scheduleDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  scheduleChip: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 3,
  },
  scheduleChipActive: {
    borderColor: '#34A853',
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
  },
  scheduleChipTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleChipSub: {
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: 'center',
  },
  scheduleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  scheduleStatusText: {
    color: COLORS.textMuted,
    fontSize: 11,
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  fileCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  fileMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  fileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
  },
  fileBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  offlineCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: RADIUS.md,
  },
  offlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  offlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  offlineIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  offlineSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  logsCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logTitle: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  logSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  logError: {
    color: COLORS.expense,
    fontSize: 10,
    marginTop: 2,
  },
});
