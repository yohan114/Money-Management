import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { ExportService } from '../../services/export';
import { BudgetItem } from '../../types';

export default function MonthlyCostReportScreen() {
  const router = useRouter();
  const {
    budgets,
    transactions,
    categories,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    selectedMonth,
    setSelectedMonth,
    formatAmount,
    settings,
  } = useFinancial();

  // Full slip preview modal state
  const [previewSlipUri, setPreviewSlipUri] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Month navigation
  const monthDate = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [selectedMonth]);

  const changeMonth = (offset: number) => {
    const nextDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
    const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextDate.getFullYear()}-${mStr}`);
  };

  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  // Filter transactions for selected month and account
  const monthTxs = useMemo(() => {
    return transactions
      .filter((t) => t.date.startsWith(selectedMonth))
      .filter((t) => selectedAccountId === 'all' || t.accountId === selectedAccountId);
  }, [transactions, selectedMonth, selectedAccountId]);

  // Filter budgets for selected account
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (selectedAccountId === 'all') return true;
      return !b.accountId || b.accountId === selectedAccountId;
    });
  }, [budgets, selectedAccountId]);

  // Collect all items across all filtered budgets
  const allBudgetItems = useMemo(() => {
    const list: (BudgetItem & { categoryName: string; categoryColor: string })[] = [];
    filteredBudgets.forEach((b) => {
      const cat = categories.find((c) => c.id === b.categoryId);
      (b.items || []).forEach((item) => {
        list.push({
          ...item,
          categoryName: cat?.name || 'General',
          categoryColor: cat?.color || COLORS.primary,
        });
      });
    });
    return list;
  }, [filteredBudgets, categories]);

  // Overall financial calculations
  const totalAllocatedBudget = filteredBudgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalActualSpent = monthTxs
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const netVariance = totalAllocatedBudget - totalActualSpent;

  // Items stats
  const itemsCount = allBudgetItems.length;
  const closedCount = allBudgetItems.filter((i) => i.status === 'closed').length;

  // Also collect any transactions that have an imageUri attached
  const allAttachedSlips = useMemo(() => {
    const map = new Map<string, { uri: string; title: string; amount: number; date: string }>();

    allBudgetItems.forEach((i) => {
      if (i.slipImageUri) {
        map.set(i.slipImageUri, {
          uri: i.slipImageUri,
          title: i.name,
          amount: i.actualCost || i.estimatedCost,
          date: i.closedAt ? i.closedAt.split('T')[0] : selectedMonth,
        });
      }
    });

    monthTxs.forEach((t) => {
      if (t.imageUri && !map.has(t.imageUri)) {
        const cat = categories.find((c) => c.id === t.categoryId);
        map.set(t.imageUri, {
          uri: t.imageUri,
          title: t.note || cat?.name || 'Receipt',
          amount: t.amount,
          date: t.date.split('T')[0],
        });
      }
    });

    return Array.from(map.values());
  }, [allBudgetItems, monthTxs, categories, selectedMonth]);

  // Weekly breakdown calculation
  // Days 1-7 (W1), 8-14 (W2), 15-21 (W3), 22-end (W4)
  const weeklyReport = useMemo(() => {
    const weeks: {
      week: number;
      label: string;
      planned: number;
      actual: number;
      variance: number;
      itemsCount: number;
      closedCount: number;
    }[] = [
      { week: 1, label: 'Days 1–7', planned: 0, actual: 0, variance: 0, itemsCount: 0, closedCount: 0 },
      { week: 2, label: 'Days 8–14', planned: 0, actual: 0, variance: 0, itemsCount: 0, closedCount: 0 },
      { week: 3, label: 'Days 15–21', planned: 0, actual: 0, variance: 0, itemsCount: 0, closedCount: 0 },
      { week: 4, label: 'Days 22+', planned: 0, actual: 0, variance: 0, itemsCount: 0, closedCount: 0 },
    ];

    // Planned items by week
    allBudgetItems.forEach((item) => {
      const wIdx = Math.min(3, Math.max(0, (item.targetWeek || 1) - 1));
      weeks[wIdx].planned += item.estimatedCost;
      weeks[wIdx].itemsCount += 1;
      if (item.status === 'closed') {
        weeks[wIdx].closedCount += 1;
      }
    });

    // If budget has weeklyLimits defined, take those if no items
    if (allBudgetItems.length === 0 && totalAllocatedBudget > 0) {
      const q = Math.round(totalAllocatedBudget / 4);
      weeks[0].planned = q;
      weeks[1].planned = q;
      weeks[2].planned = q;
      weeks[3].planned = totalAllocatedBudget - q * 3;
    }

    // Actual spending by day of month
    monthTxs
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const day = parseInt(t.date.split('T')[0].split('-')[2], 10);
        let wIdx = 0;
        if (day >= 1 && day <= 7) wIdx = 0;
        else if (day >= 8 && day <= 14) wIdx = 1;
        else if (day >= 15 && day <= 21) wIdx = 2;
        else wIdx = 3;

        weeks[wIdx].actual += t.amount;
      });

    weeks.forEach((w) => {
      w.variance = w.planned - w.actual;
    });

    return weeks;
  }, [allBudgetItems, monthTxs, totalAllocatedBudget]);

  // Handle Export HTML / Printable PDF
  const handleExportHTML = async () => {
    try {
      setExporting(true);
      const accName = selectedAccount ? selectedAccount.name : 'All Accounts';

      const weeklyData = weeklyReport.map((w) => ({
        week: w.week,
        label: w.label,
        planned: w.planned,
        actual: w.actual,
        variance: w.variance,
      }));

      const itemsData = allBudgetItems.map((it) => ({
        categoryName: it.categoryName,
        itemName: it.name,
        week: it.targetWeek,
        planned: it.estimatedCost,
        actual: it.actualCost || 0,
        status: it.status,
        notes: it.notes,
      }));

      await ExportService.exportMonthlyCostReportHTML({
        month: selectedMonth,
        accountName: accName,
        currencySymbol: settings.currencySymbol,
        totalBudget: totalAllocatedBudget,
        totalSpent: totalActualSpent,
        netVariance,
        itemsCount,
        closedCount,
        slipsCount: allAttachedSlips.length,
        weeklyData,
        itemsData,
      });
    } catch {
      Alert.alert('Export Error', 'Failed to generate monthly cost report document.');
    } finally {
      setExporting(false);
    }
  };

  // Handle Text / WhatsApp Sharing
  const handleShareSummaryText = async () => {
    const accName = selectedAccount ? selectedAccount.name : 'All Accounts';
    const sym = settings.currencySymbol;

    const lines = [
      `📊 MONTHLY COST REPORT - ${monthLabel}`,
      `Domain: ${accName}`,
      `--------------------------------`,
      `💰 Allocated Budget: ${sym} ${totalAllocatedBudget.toLocaleString()}`,
      `💸 Total Spent: ${sym} ${totalActualSpent.toLocaleString()}`,
      netVariance >= 0
        ? `✅ Net Savings: ${sym} ${netVariance.toLocaleString()}`
        : `⚠️ Over Budget: ${sym} ${Math.abs(netVariance).toLocaleString()}`,
      `🛒 Items Bought: ${closedCount} of ${itemsCount} (${allAttachedSlips.length} slips attached)`,
      ``,
      `📅 WEEKLY BREAKDOWN:`,
      ...weeklyReport.map(
        (w) =>
          `• Week ${w.week} (${w.label}): Paid ${sym} ${w.actual.toLocaleString()} / Est ${sym} ${w.planned.toLocaleString()} (${w.variance >= 0 ? '+' : ''}${w.variance.toLocaleString()})`
      ),
      ``,
      allBudgetItems.length > 0 ? `📋 TOP ITEMS AUDIT:` : '',
      ...allBudgetItems.slice(0, 15).map(
        (it) =>
          `• [W${it.targetWeek}] ${it.name}: ${it.status === 'closed' ? `Paid ${sym} ${(it.actualCost || 0).toLocaleString()} (Done)` : `Est ${sym} ${it.estimatedCost.toLocaleString()} (Pending)`}`
      ),
      ``,
      `Generated by Money Management App`,
    ].filter(Boolean);

    await Share.share({
      message: lines.join('\n'),
      title: `Monthly Cost Report - ${selectedMonth}`,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Monthly Cost Report</Text>
          <View style={styles.monthSelector}>
            <Pressable onPress={() => changeMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={14} color={COLORS.primaryLight} />
            </Pressable>
            <Text style={styles.monthLabelText}>{monthLabel}</Text>
            <Pressable onPress={() => changeMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primaryLight} />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={handleExportHTML} style={styles.iconBtn} hitSlop={10} disabled={exporting}>
          <Ionicons name="share-outline" size={20} color={COLORS.primaryLight} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Domain Switcher */}
        <View style={styles.accountSwitcherContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountChipsRow}
          >
            <Pressable
              style={[
                styles.accountChip,
                selectedAccountId === 'all' && styles.accountChipActive,
              ]}
              onPress={() => setSelectedAccountId('all')}
            >
              <Ionicons
                name="globe-outline"
                size={14}
                color={selectedAccountId === 'all' ? '#FFF' : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.accountChipText,
                  selectedAccountId === 'all' && styles.accountChipTextActive,
                ]}
              >
                All Accounts
              </Text>
            </Pressable>

            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <Pressable
                  key={acc.id}
                  style={[
                    styles.accountChip,
                    isSelected && {
                      backgroundColor: acc.color + '25',
                      borderColor: acc.color,
                    },
                  ]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <Ionicons
                    name={(acc.icon as any) || 'wallet'}
                    size={14}
                    color={isSelected ? acc.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.accountChipText,
                      isSelected && { color: acc.color, fontWeight: '700' },
                    ]}
                  >
                    {acc.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Executive Summary Hero Card */}
        <Card elevated highlight style={styles.executiveCard}>
          <View style={styles.executiveHeader}>
            <View>
              <Text style={styles.executiveSubtitle}>
                {selectedAccount ? selectedAccount.name : 'All Accounts'} • Full Month Audit
              </Text>
              <Text style={styles.executiveTitle}>Cost & Variance Summary</Text>
            </View>

            <View
              style={[
                styles.varianceBadge,
                {
                  backgroundColor:
                    netVariance >= 0 ? COLORS.incomeBg : COLORS.expenseBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.varianceBadgeText,
                  { color: netVariance >= 0 ? COLORS.income : COLORS.expense },
                ]}
              >
                {netVariance >= 0 ? 'Within Budget' : 'Over Budget'}
              </Text>
            </View>
          </View>

          {/* 4-KPI Grid */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Allocated Budget</Text>
              <Text style={styles.kpiValue}>{formatAmount(totalAllocatedBudget)}</Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Actual Spent</Text>
              <Text style={[styles.kpiValue, { color: COLORS.expense }]}>
                {formatAmount(totalActualSpent)}
              </Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Net Variance</Text>
              <Text
                style={[
                  styles.kpiValue,
                  { color: netVariance >= 0 ? COLORS.income : COLORS.expense },
                ]}
              >
                {netVariance >= 0 ? '+' : ''}
                {formatAmount(netVariance)}
              </Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Items & Slips</Text>
              <Text style={styles.kpiValue}>
                {closedCount}/{itemsCount} ({allAttachedSlips.length} slips)
              </Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.reportActionRow}>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={handleExportHTML}
              disabled={exporting}
            >
              <Ionicons name="document-text" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Export PDF / Print</Text>
            </Pressable>

            <Pressable style={styles.actionBtnSecondary} onPress={handleShareSummaryText}>
              <Ionicons name="logo-whatsapp" size={16} color={COLORS.income} />
              <Text style={styles.actionBtnSecondaryText}>Share WhatsApp</Text>
            </Pressable>
          </View>
        </Card>

        {/* Weekly Spending Breakdown Table */}
        <Text style={styles.sectionHeaderTitle}>Weekly Cost Breakdown</Text>
        <Card style={styles.weeklyTableCard}>
          {weeklyReport.map((w, index) => {
            const isOver = w.actual > w.planned && w.planned > 0;
            return (
              <View
                key={w.week}
                style={[
                  styles.weeklyRow,
                  index < weeklyReport.length - 1 && styles.weeklyRowBorder,
                ]}
              >
                <View style={styles.weeklyColLeft}>
                  <Text style={styles.weekLabel}>Week {w.week}</Text>
                  <Text style={styles.weekTimeline}>{w.label}</Text>
                  <Text style={styles.weekItemsFulfilled}>
                    {w.closedCount}/{w.itemsCount} items bought
                  </Text>
                </View>

                <View style={styles.weeklyColMiddle}>
                  <Text style={styles.colSub}>Planned Limit</Text>
                  <Text style={styles.colAmount}>{formatAmount(w.planned)}</Text>
                </View>

                <View style={styles.weeklyColRight}>
                  <Text style={styles.colSub}>Actual Cost</Text>
                  <Text
                    style={[
                      styles.colAmount,
                      { color: isOver ? COLORS.expense : COLORS.income },
                    ]}
                  >
                    {formatAmount(w.actual)}
                  </Text>
                  <Text
                    style={[
                      styles.colVariance,
                      { color: w.variance >= 0 ? COLORS.income : COLORS.expense },
                    ]}
                  >
                    {w.variance >= 0 ? '+' : ''}
                    {formatAmount(w.variance)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Itemized Master Budget Audit Table */}
        <View style={styles.itemAuditSectionHeader}>
          <Text style={styles.sectionHeaderTitle}>
            Itemized Master Budget Audit ({allBudgetItems.length})
          </Text>
        </View>

        {allBudgetItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={36} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No itemized budget entries yet</Text>
            <Text style={styles.emptySub}>
              Create a Master Itemized Budget in the Budgets tab to track items, slips, and weekly progress.
            </Text>
          </Card>
        ) : (
          allBudgetItems.map((item) => {
            const isClosed = item.status === 'closed';
            const costVariance =
              isClosed && item.actualCost !== undefined
                ? item.actualCost - item.estimatedCost
                : 0;

            return (
              <Card key={item.id} style={styles.itemAuditCard}>
                <View style={styles.itemAuditRow}>
                  {/* Status Indicator */}
                  <View
                    style={[
                      styles.itemAuditIcon,
                      {
                        backgroundColor: isClosed ? COLORS.incomeBg : COLORS.warningBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isClosed ? 'checkmark' : 'hourglass-outline'}
                      size={16}
                      color={isClosed ? COLORS.income : COLORS.warning}
                    />
                  </View>

                  <View style={styles.itemAuditInfo}>
                    <Text style={styles.itemAuditTitle}>{item.name}</Text>
                    <View style={styles.itemAuditMeta}>
                      <View style={styles.auditWeekPill}>
                        <Text style={styles.auditWeekText}>W{item.targetWeek}</Text>
                      </View>
                      <Text style={styles.auditCatName}>{item.categoryName}</Text>
                      {item.notes && <Text style={styles.auditNotes}>• {item.notes}</Text>}
                    </View>
                  </View>

                  {/* Amounts */}
                  <View style={styles.itemAuditAmounts}>
                    <Text style={styles.auditEst}>Est: {formatAmount(item.estimatedCost)}</Text>
                    {isClosed && item.actualCost !== undefined ? (
                      <Text style={styles.auditActual}>
                        Paid: {formatAmount(item.actualCost)}
                      </Text>
                    ) : (
                      <Text style={styles.auditPending}>Pending</Text>
                    )}

                    {isClosed && costVariance !== 0 && (
                      <Text
                        style={[
                          styles.auditVariance,
                          { color: costVariance > 0 ? COLORS.expense : COLORS.income },
                        ]}
                      >
                        {costVariance > 0
                          ? `+${costVariance.toLocaleString()}`
                          : `-${Math.abs(costVariance).toLocaleString()}`}
                      </Text>
                    )}
                  </View>

                  {/* Slip Thumbnail */}
                  {item.slipImageUri && (
                    <Pressable
                      style={styles.slipThumbBtn}
                      onPress={() => setPreviewSlipUri(item.slipImageUri || null)}
                    >
                      <Image source={{ uri: item.slipImageUri }} style={styles.slipThumbImg} />
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })
        )}

        {/* Buying Slips Gallery Section */}
        {allAttachedSlips.length > 0 && (
          <>
            <Text style={styles.sectionHeaderTitle}>
              Verified Buying Slips & Receipts ({allAttachedSlips.length})
            </Text>
            <View style={styles.slipsGrid}>
              {allAttachedSlips.map((slip, idx) => (
                <Pressable
                  key={idx}
                  style={styles.slipCard}
                  onPress={() => setPreviewSlipUri(slip.uri)}
                >
                  <Image source={{ uri: slip.uri }} style={styles.slipCardImg} />
                  <View style={styles.slipCardDetails}>
                    <Text style={styles.slipCardTitle} numberOfLines={1}>
                      {slip.title}
                    </Text>
                    <Text style={styles.slipCardAmount}>{formatAmount(slip.amount)}</Text>
                    <Text style={styles.slipCardDate}>{slip.date}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Full-Screen Slip Preview Modal */}
      <Modal
        visible={!!previewSlipUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewSlipUri(null)}
      >
        <View style={styles.fullPreviewOverlay}>
          <Pressable
            style={styles.fullPreviewCloseBtn}
            onPress={() => setPreviewSlipUri(null)}
          >
            <Ionicons name="close" size={26} color="#FFF" />
          </Pressable>
          {previewSlipUri && (
            <Image
              source={{ uri: previewSlipUri }}
              style={styles.fullPreviewImage}
              resizeMode="contain"
            />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  monthLabelText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  accountSwitcherContainer: {
    marginBottom: SPACING.md,
  },
  accountChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
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
    fontWeight: '700',
  },
  executiveCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  executiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  executiveSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  executiveTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  varianceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  varianceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  kpiBox: {
    width: '48%',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  kpiValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  reportActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardElevated,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  actionBtnSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  weeklyTableCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  weeklyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weeklyColLeft: {
    flex: 1.2,
  },
  weekLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  weekTimeline: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  weekItemsFulfilled: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  weeklyColMiddle: {
    flex: 1,
    alignItems: 'flex-end',
  },
  weeklyColRight: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  colSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  colAmount: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  colVariance: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  itemAuditSectionHeader: {
    marginTop: SPACING.sm,
  },
  itemAuditCard: {
    padding: 12,
    marginBottom: 8,
  },
  itemAuditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemAuditIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAuditInfo: {
    flex: 1,
  },
  itemAuditTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  itemAuditMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  auditWeekPill: {
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  auditWeekText: {
    color: COLORS.primaryLight,
    fontSize: 9,
    fontWeight: '700',
  },
  auditCatName: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  auditNotes: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  itemAuditAmounts: {
    alignItems: 'flex-end',
  },
  auditEst: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  auditActual: {
    color: COLORS.expense,
    fontSize: 12,
    fontWeight: '700',
  },
  auditPending: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  auditVariance: {
    fontSize: 10,
    fontWeight: '700',
  },
  slipThumbBtn: {
    padding: 2,
  },
  slipThumbImg: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.cardElevated,
  },
  slipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  slipCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  slipCardImg: {
    width: '100%',
    height: 110,
    backgroundColor: COLORS.cardElevated,
  },
  slipCardDetails: {
    padding: 8,
  },
  slipCardTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  slipCardAmount: {
    color: COLORS.expense,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  slipCardDate: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
  },
  fullPreviewOverlay: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPreviewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullPreviewImage: {
    width: '100%',
    height: '85%',
  },
});
