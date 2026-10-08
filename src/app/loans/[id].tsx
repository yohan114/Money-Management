import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';

function getDueDateStatus(dueDateStr?: string) {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'overdue',
      text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`,
      color: COLORS.expense,
      bg: COLORS.expenseBg,
    };
  } else if (diffDays === 0) {
    return {
      status: 'due_today',
      text: 'Due Today',
      color: COLORS.warning,
      bg: COLORS.warningBg,
    };
  } else if (diffDays <= 7) {
    return {
      status: 'urgent',
      text: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
      color: COLORS.warning,
      bg: COLORS.warningBg,
    };
  } else {
    return {
      status: 'upcoming',
      text: `Due on ${dueDateStr}`,
      color: COLORS.primaryLight,
      bg: COLORS.primaryGlow,
    };
  }
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    loans,
    accounts,
    getAccountById,
    formatAmount,
    settings,
    deleteLoan,
    addLoanSpendingItem,
    deleteLoanSpendingItem,
    recordLoanRepayment,
    deleteLoanRepayment,
  } = useFinancial();

  const loan = loans.find((l) => l.id === id);
  const depositAccount = loan ? getAccountById(loan.depositAccountId) : undefined;

  // Active sub-tab: 'repayments' | 'spending'
  const [activeTab, setActiveTab] = useState<'repayments' | 'spending'>('repayments');

  // Add Spending Item Modal
  const [isAddSpendingVisible, setIsAddSpendingVisible] = useState(false);
  const [spendingTitle, setSpendingTitle] = useState('');
  const [spendingAmountStr, setSpendingAmountStr] = useState('');
  const [spendingDate, setSpendingDate] = useState(new Date().toISOString().split('T')[0]);
  const [spendingNote, setSpendingNote] = useState('');

  // Record Repayment Modal
  const [isRecordRepaymentVisible, setIsRecordRepaymentVisible] = useState(false);
  const [repaymentAmountStr, setRepaymentAmountStr] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [repaymentPaidFromId, setRepaymentPaidFromId] = useState(accounts[0]?.id || '');
  const [repaymentSlipUri, setRepaymentSlipUri] = useState<string | null>(null);
  const [repaymentNote, setRepaymentNote] = useState('');

  // Slip Photo Preview Modal
  const [previewSlipUri, setPreviewSlipUri] = useState<string | null>(null);

  // Calculations
  const totalBorrowed = loan?.totalAmount || 0;
  const repayments = loan?.repayments || [];
  const spendingItems = loan?.spendingItems || [];

  const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
  const remainingDebt = Math.max(0, totalBorrowed - totalRepaid);
  const repaymentPercentage = totalBorrowed > 0 ? Math.min(100, Math.round((totalRepaid / totalBorrowed) * 100)) : 0;

  const totalSpent = spendingItems.reduce((sum, s) => sum + s.amount, 0);
  const unspentLoanFunds = Math.max(0, totalBorrowed - totalSpent);
  const spentPercentage = totalBorrowed > 0 ? Math.min(100, Math.round((totalSpent / totalBorrowed) * 100)) : 0;

  const dueStatus = loan?.dueDate ? getDueDateStatus(loan.dueDate) : null;

  if (!loan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundBox}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.warning} />
          <Text style={styles.notFoundTitle}>Loan Not Found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back to Loans Hub</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Handle Photo Slip Picker
  const handlePickSlip = async () => {
    Alert.alert('Attach Repayment Slip / Receipt', 'Choose slip photo source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to capture receipt slips.');
            return;
          }
          const res = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.75,
          });
          if (!res.canceled && res.assets && res.assets.length > 0) {
            setRepaymentSlipUri(res.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.75,
          });
          if (!res.canceled && res.assets && res.assets.length > 0) {
            setRepaymentSlipUri(res.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Open Record Repayment Modal
  const handleOpenRecordRepayment = () => {
    setRepaymentAmountStr(remainingDebt > 0 ? remainingDebt.toString() : '');
    setRepaymentDate(new Date().toISOString().split('T')[0]);
    setRepaymentPaidFromId(depositAccount?.id || accounts[0]?.id || '');
    setRepaymentSlipUri(null);
    setRepaymentNote('');
    setIsRecordRepaymentVisible(true);
  };

  // Confirm Record Repayment
  const handleConfirmRepayment = async () => {
    const amount = parseFloat(repaymentAmountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid repayment amount greater than zero.');
      return;
    }
    if (!repaymentPaidFromId) {
      Alert.alert('Account Required', 'Please select which account paid this installment.');
      return;
    }

    try {
      await recordLoanRepayment(loan.id, {
        amount,
        date: repaymentDate ? new Date(repaymentDate).toISOString() : new Date().toISOString(),
        paidFromAccountId: repaymentPaidFromId,
        slipImageUri: repaymentSlipUri || undefined,
        note: repaymentNote.trim() || undefined,
      });
      setIsRecordRepaymentVisible(false);
    } catch (e: any) {
      Alert.alert('Repayment Failed', e?.message || 'Could not record repayment installment.');
    }
  };

  // Open Add Spending Item Modal
  const handleOpenAddSpending = () => {
    setSpendingTitle('');
    setSpendingAmountStr('');
    setSpendingDate(new Date().toISOString().split('T')[0]);
    setSpendingNote('');
    setIsAddSpendingVisible(true);
  };

  // Confirm Add Spending Item
  const handleConfirmSpending = async () => {
    const title = spendingTitle.trim();
    if (!title) {
      Alert.alert('Title Required', 'Please enter what this money was spent on.');
      return;
    }
    const amount = parseFloat(spendingAmountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter the amount spent.');
      return;
    }

    try {
      await addLoanSpendingItem(loan.id, {
        title,
        amount,
        date: spendingDate ? new Date(spendingDate).toISOString() : new Date().toISOString(),
        note: spendingNote.trim() || undefined,
      });
      setIsAddSpendingVisible(false);
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not record spending item.');
    }
  };

  // Delete Loan Action
  const handleDeleteLoan = () => {
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete this loan record from "${loan.lenderName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLoan(loan.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {loan.lenderName}
          </Text>
          <Text style={styles.headerSub}>
            {loan.type.toUpperCase()} LOAN • {loan.purpose}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push(`/modal/loan?id=${loan.id}`)}
            style={styles.headerActionBtn}
            hitSlop={10}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primaryLight} />
          </Pressable>
          <Pressable onPress={handleDeleteLoan} style={styles.headerActionBtn} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={COLORS.expense} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Debt KPI Card */}
        <Card elevated highlight style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroSubLabel}>Outstanding Debt Balance</Text>
              <Text style={[styles.heroMainAmount, { color: remainingDebt === 0 ? COLORS.income : COLORS.expense }]}>
                {formatAmount(remainingDebt)}
              </Text>
            </View>

            <View style={styles.statusBadgeCol}>
              {loan.status === 'paid_off' || remainingDebt === 0 ? (
                <View style={[styles.statusBadge, { backgroundColor: COLORS.incomeBg, borderColor: COLORS.income }]}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.income} />
                  <Text style={[styles.statusBadgeText, { color: COLORS.income }]}>PAID OFF</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: COLORS.expenseBg, borderColor: COLORS.expense }]}>
                  <Ionicons name="time" size={14} color={COLORS.expense} />
                  <Text style={[styles.statusBadgeText, { color: COLORS.expense }]}>ACTIVE DEBT</Text>
                </View>
              )}

              {dueStatus && remainingDebt > 0 && (
                <View style={[styles.dueBadge, { backgroundColor: dueStatus.bg }]}>
                  <Text style={[styles.dueBadgeText, { color: dueStatus.color }]}>
                    {dueStatus.text}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Repayment Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Repayment Progress ({repaymentPercentage}%)</Text>
              <Text style={styles.progressAmountSummary}>
                {formatAmount(totalRepaid)} of {formatAmount(totalBorrowed)}
              </Text>
            </View>
            <ProgressBar
              progress={repaymentPercentage / 100}
              color={repaymentPercentage >= 100 ? COLORS.income : COLORS.primary}
              height={8}
            />
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>Total Borrowed</Text>
              <Text style={styles.metricVal}>{formatAmount(totalBorrowed)}</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>Total Repaid</Text>
              <Text style={[styles.metricVal, { color: COLORS.income }]}>
                {formatAmount(totalRepaid)}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>Received Date</Text>
              <Text style={styles.metricVal}>
                {new Date(loan.receivedDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {/* Linked Account Banner */}
          {depositAccount && (
            <View style={styles.depositAccBanner}>
              <Ionicons
                name={(depositAccount.icon as any) || 'wallet'}
                size={14}
                color={depositAccount.color}
              />
              <Text style={styles.depositAccBannerText}>
                Deposited in: <Text style={{ color: depositAccount.color, fontWeight: '700' }}>{depositAccount.name}</Text>
              </Text>
            </View>
          )}

          {loan.notes ? (
            <Text style={styles.loanNotesText}>{`"${loan.notes}"`}</Text>
          ) : null}
        </Card>

        {/* Tab Switcher: Repayments vs Spending Breakdown */}
        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tabButton, activeTab === 'repayments' && styles.tabButtonActive]}
            onPress={() => setActiveTab('repayments')}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={activeTab === 'repayments' ? COLORS.primaryLight : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'repayments' && styles.tabButtonTextActive,
              ]}
            >
              Repayments & Slips ({repayments.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'spending' && styles.tabButtonActive]}
            onPress={() => setActiveTab('spending')}
          >
            <Ionicons
              name="pie-chart-outline"
              size={16}
              color={activeTab === 'spending' ? COLORS.primaryLight : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'spending' && styles.tabButtonTextActive,
              ]}
            >
              Spending Plan ({spendingItems.length})
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: REPAYMENTS & SLIPS */}
        {activeTab === 'repayments' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Installment Repayments</Text>
                <Text style={styles.sectionSubHeading}>
                  {repayments.length} installment{repayments.length === 1 ? '' : 's'} recorded • {formatAmount(totalRepaid)} paid
                </Text>
              </View>

              {remainingDebt > 0 && (
                <Pressable
                  style={styles.actionPillBtn}
                  onPress={handleOpenRecordRepayment}
                >
                  <Ionicons name="add" size={14} color="#FFF" />
                  <Text style={styles.actionPillBtnText}>Pay Installment</Text>
                </Pressable>
              )}
            </View>

            {repayments.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Installments Paid Yet</Text>
                <Text style={styles.emptySub}>
                  Record your loan repayments and attach receipt/slip photos as proof of payment.
                </Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={handleOpenRecordRepayment}
                >
                  <Text style={styles.emptyActionBtnText}>+ Record First Installment</Text>
                </Pressable>
              </Card>
            ) : (
              repayments.map((rep) => {
                const paidAcc = getAccountById(rep.paidFromAccountId);
                return (
                  <Card key={rep.id} style={styles.repaymentCard}>
                    <View style={styles.repaymentCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.repaymentAmount}>
                          {formatAmount(rep.amount)}
                        </Text>
                        <Text style={styles.repaymentDate}>
                          {new Date(rep.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>

                      <Pressable
                        style={styles.deleteRepBtn}
                        hitSlop={8}
                        onPress={() => {
                          Alert.alert(
                            'Delete Installment',
                            `Are you sure you want to delete this installment of ${formatAmount(rep.amount)}? The payment will be reversed in your account balance.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => deleteLoanRepayment(loan.id, rep.id),
                              },
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                      </Pressable>
                    </View>

                    {paidAcc && (
                      <View style={styles.repaymentAccRow}>
                        <Ionicons
                          name={(paidAcc.icon as any) || 'wallet'}
                          size={12}
                          color={paidAcc.color}
                        />
                        <Text style={styles.repaymentAccText}>
                          Paid from: <Text style={{ color: paidAcc.color, fontWeight: '600' }}>{paidAcc.name}</Text>
                        </Text>
                      </View>
                    )}

                    {rep.note ? (
                      <Text style={styles.repaymentNoteText}>{`"${rep.note}"`}</Text>
                    ) : null}

                    {/* Receipt / Slip photo attached */}
                    {rep.slipImageUri ? (
                      <Pressable
                        style={styles.slipThumbRow}
                        onPress={() => setPreviewSlipUri(rep.slipImageUri!)}
                      >
                        <Image
                          source={{ uri: rep.slipImageUri }}
                          style={styles.slipThumb}
                          resizeMode="cover"
                        />
                        <View style={styles.slipThumbInfo}>
                          <View style={styles.slipPill}>
                            <Ionicons name="image" size={12} color={COLORS.primaryLight} />
                            <Text style={styles.slipPillText}>Payment Slip Attached</Text>
                          </View>
                          <Text style={styles.slipTapHint}>Tap to view full receipt</Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: SPENDING PLAN */}
        {activeTab === 'spending' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Where Money Was Spent</Text>
                <Text style={styles.sectionSubHeading}>
                  {formatAmount(totalSpent)} allocated ({spentPercentage}%)
                </Text>
              </View>

              <Pressable
                style={styles.actionPillBtn}
                onPress={handleOpenAddSpending}
              >
                <Ionicons name="add" size={14} color="#FFF" />
                <Text style={styles.actionPillBtnText}>Add Spending Item</Text>
              </Pressable>
            </View>

            {/* Unallocated cash card */}
            <View style={styles.spendingSummaryCard}>
              <View style={styles.spendingSummaryItem}>
                <Text style={styles.spendingSummaryLabel}>Total Borrowed</Text>
                <Text style={styles.spendingSummaryVal}>{formatAmount(totalBorrowed)}</Text>
              </View>
              <View style={styles.spendingSummaryDivider} />
              <View style={styles.spendingSummaryItem}>
                <Text style={styles.spendingSummaryLabel}>Spent So Far</Text>
                <Text style={[styles.spendingSummaryVal, { color: COLORS.expense }]}>
                  {formatAmount(totalSpent)}
                </Text>
              </View>
              <View style={styles.spendingSummaryDivider} />
              <View style={styles.spendingSummaryItem}>
                <Text style={styles.spendingSummaryLabel}>Remaining Funds</Text>
                <Text style={[styles.spendingSummaryVal, { color: COLORS.income }]}>
                  {formatAmount(unspentLoanFunds)}
                </Text>
              </View>
            </View>

            {spendingItems.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="list-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Spending Items Logged</Text>
                <Text style={styles.emptySub}>
                  Keep full visibility into exactly what you bought or paid for with this borrowed money.
                </Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={handleOpenAddSpending}
                >
                  <Text style={styles.emptyActionBtnText}>+ Log First Spending Item</Text>
                </Pressable>
              </Card>
            ) : (
              spendingItems.map((item) => (
                <Card key={item.id} style={styles.spendingCard}>
                  <View style={styles.spendingCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.spendingItemTitle}>{item.title}</Text>
                      <Text style={styles.spendingItemDate}>
                        {new Date(item.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.spendingItemAmount}>{formatAmount(item.amount)}</Text>
                    <Pressable
                      style={styles.deleteSpendingBtn}
                      hitSlop={8}
                      onPress={() => {
                        Alert.alert(
                          'Delete Spending Item',
                          `Delete "${item.title}"?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteLoanSpendingItem(loan.id, item.id),
                            },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                    </Pressable>
                  </View>

                  {item.note ? (
                    <Text style={styles.spendingItemNote}>{`"${item.note}"`}</Text>
                  ) : null}
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: RECORD REPAYMENT */}
      <Modal
        visible={isRecordRepaymentVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsRecordRepaymentVisible(false)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Loan Installment</Text>
              <Pressable
                onPress={() => setIsRecordRepaymentVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Amount */}
              <Text style={styles.inputLabel}>Installment Amount ({settings.currencySymbol}) *</Text>
              <TextInput
                style={[styles.textInput, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={repaymentAmountStr}
                onChangeText={setRepaymentAmountStr}
              />

              {remainingDebt > 0 && (
                <Pressable
                  style={styles.quickPayFullBtn}
                  onPress={() => setRepaymentAmountStr(remainingDebt.toString())}
                >
                  <Ionicons name="sparkles" size={12} color={COLORS.primaryLight} />
                  <Text style={styles.quickPayFullText}>
                    Pay full remaining balance ({formatAmount(remainingDebt)})
                  </Text>
                </Pressable>
              )}

              {/* Paid From Account */}
              <Text style={styles.inputLabel}>Paid From Account *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScrollModal}>
                {accounts.map((acc) => {
                  const isSelected = repaymentPaidFromId === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      style={[
                        styles.accModalChip,
                        isSelected && { borderColor: acc.color, backgroundColor: acc.color + '20' },
                      ]}
                      onPress={() => setRepaymentPaidFromId(acc.id)}
                    >
                      <Ionicons name={(acc.icon as any) || 'wallet'} size={14} color={acc.color} />
                      <Text
                        style={[
                          styles.accModalChipText,
                          isSelected && { color: acc.color, fontWeight: '700' },
                        ]}
                      >
                        {acc.name}
                      </Text>
                      <Text style={styles.accModalChipBal}>{formatAmount(acc.balance)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Date */}
              <Text style={styles.inputLabel}>Payment Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={repaymentDate}
                onChangeText={setRepaymentDate}
              />

              {/* Attach Buying Slip / Receipt */}
              <Text style={styles.inputLabel}>Buying Slip / Payment Receipt (Optional)</Text>
              {repaymentSlipUri ? (
                <View style={styles.slipPreviewBox}>
                  <Image source={{ uri: repaymentSlipUri }} style={styles.slipAttachedImage} />
                  <View style={styles.slipAttachedOverlay}>
                    <Pressable
                      style={styles.slipChangeBtn}
                      onPress={handlePickSlip}
                    >
                      <Text style={styles.slipChangeBtnText}>Change Photo</Text>
                    </Pressable>
                    <Pressable
                      style={styles.slipRemoveBtn}
                      onPress={() => setRepaymentSlipUri(null)}
                    >
                      <Text style={styles.slipRemoveBtnText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.attachSlipBtn} onPress={handlePickSlip}>
                  <Ionicons name="camera-outline" size={20} color={COLORS.primaryLight} />
                  <Text style={styles.attachSlipBtnText}>Take Photo or Attach Receipt</Text>
                </Pressable>
              )}

              {/* Note */}
              <Text style={styles.inputLabel}>Note / Transaction Ref (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Bank slip ref #4982, Cash handed over"
                placeholderTextColor={COLORS.textMuted}
                value={repaymentNote}
                onChangeText={setRepaymentNote}
              />

              {/* Submit */}
              <Pressable
                style={({ pressed }) => [styles.submitModalBtn, pressed && { opacity: 0.85 }]}
                onPress={handleConfirmRepayment}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.submitModalBtnText}>Confirm Installment</Text>
              </Pressable>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL 2: ADD SPENDING ITEM */}
      <Modal
        visible={isAddSpendingVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddSpendingVisible(false)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Spending Item</Text>
              <Pressable
                onPress={() => setIsAddSpendingVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Item / Expense Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Bought cement, Paid carpenter advance, Spare parts"
                placeholderTextColor={COLORS.textMuted}
                value={spendingTitle}
                onChangeText={setSpendingTitle}
              />

              <Text style={styles.inputLabel}>Amount Spent ({settings.currencySymbol}) *</Text>
              <TextInput
                style={[styles.textInput, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={spendingAmountStr}
                onChangeText={setSpendingAmountStr}
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={spendingDate}
                onChangeText={setSpendingDate}
              />

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Additional details..."
                placeholderTextColor={COLORS.textMuted}
                value={spendingNote}
                onChangeText={setSpendingNote}
              />

              <Pressable
                style={({ pressed }) => [styles.submitModalBtn, pressed && { opacity: 0.85 }]}
                onPress={handleConfirmSpending}
              >
                <Ionicons name="add-circle" size={18} color="#FFF" />
                <Text style={styles.submitModalBtnText}>Save Spending Item</Text>
              </Pressable>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL 3: FULL SCREEN SLIP PHOTO PREVIEW */}
      <Modal
        visible={!!previewSlipUri}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewSlipUri(null)}
      >
        <View style={styles.previewBackdrop}>
          <SafeAreaView style={styles.previewHeader}>
            <Text style={styles.previewHeaderTitle}>Attached Buying Slip / Receipt</Text>
            <Pressable
              onPress={() => setPreviewSlipUri(null)}
              style={styles.previewCloseBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={26} color="#FFF" />
            </Pressable>
          </SafeAreaView>

          {previewSlipUri && (
            <View style={styles.previewImageContainer}>
              <Image
                source={{ uri: previewSlipUri }}
                style={styles.previewFullImage}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  notFoundTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  heroCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  heroSubLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroMainAmount: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusBadgeCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dueBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: SPACING.md,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressAmountSummary: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: SPACING.sm,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  metricSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  metricVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  depositAccBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  depositAccBannerText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  loanNotesText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  tabButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  tabContent: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeading: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubHeading: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  actionPillBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  emptyActionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  repaymentCard: {
    padding: 14,
    gap: 8,
  },
  repaymentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  repaymentAmount: {
    color: COLORS.income,
    fontSize: 18,
    fontWeight: '800',
  },
  repaymentDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  deleteRepBtn: {
    padding: 4,
  },
  repaymentAccRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repaymentAccText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  repaymentNoteText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  slipThumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    padding: 8,
    gap: 10,
    marginTop: 4,
  },
  slipThumb: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
  },
  slipThumbInfo: {
    flex: 1,
  },
  slipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slipPillText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  slipTapHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  spendingSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 4,
  },
  spendingSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  spendingSummaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  spendingSummaryLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  spendingSummaryVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  spendingCard: {
    padding: 14,
    gap: 6,
  },
  spendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spendingItemTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  spendingItemDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  spendingItemAmount: {
    color: COLORS.expense,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
  deleteSpendingBtn: {
    padding: 4,
  },
  spendingItemNote: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '90%',
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
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  quickPayFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginTop: 4,
  },
  quickPayFullText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  accountScrollModal: {
    marginBottom: 4,
  },
  accModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  accModalChipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  accModalChipBal: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  attachSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
  },
  attachSlipBtnText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  slipPreviewBox: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slipAttachedImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  slipAttachedOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: COLORS.card,
  },
  slipChangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.sm,
  },
  slipChangeBtnText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  slipRemoveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.expenseBg,
    borderRadius: RADIUS.sm,
  },
  slipRemoveBtnText: {
    color: COLORS.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  submitModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    marginTop: 20,
    marginBottom: 10,
  },
  submitModalBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  previewHeaderTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewCloseBtn: {
    padding: 4,
  },
  previewImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFullImage: {
    width: '100%',
    height: '100%',
  },
});
