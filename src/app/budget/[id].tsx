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
import { BudgetItem } from '../../types';

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    budgets,
    getCategoryById,
    getAccountById,
    accounts,
    deleteBudget,
    addBudgetItem,
    deleteBudgetItem,
    closeBudgetItem,
    getCategorySpentForMonth,
    selectedMonth,
    formatAmount,
    settings,
  } = useFinancial();

  const budget = budgets.find((b) => b.id === id);
  const category = budget ? getCategoryById(budget.categoryId) : undefined;
  const linkedAccount = budget?.accountId ? getAccountById(budget.accountId) : undefined;

  // Selected week filter: 'all' | 1 | 2 | 3 | 4
  const [selectedWeek, setSelectedWeek] = useState<'all' | 1 | 2 | 3 | 4>('all');

  // Close / Fulfill item modal state
  const [targetItemToClose, setTargetItemToClose] = useState<BudgetItem | null>(null);
  const [actualCostStr, setActualCostStr] = useState('');
  const [selectedPaidAccId, setSelectedPaidAccId] = useState(
    budget?.accountId || accounts[0]?.id || ''
  );
  const [slipImageUri, setSlipImageUri] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState('');

  // Add Item Modal State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCostStr, setNewItemCostStr] = useState('');
  const [newItemWeek, setNewItemWeek] = useState<1 | 2 | 3 | 4>(1);

  // Full Slip Preview Modal
  const [previewSlipUri, setPreviewSlipUri] = useState<string | null>(null);

  // Budget calculations
  const items = useMemo(() => budget?.items || [], [budget?.items]);
  const spent = budget ? getCategorySpentForMonth(budget.categoryId, selectedMonth) : 0;
  const limit = budget?.monthlyLimit || 0;
  const remaining = limit - spent;
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;

  // Items fulfillment stats
  const totalItemsCount = items.length;
  const closedItemsCount = items.filter((i) => i.status === 'closed').length;
  const itemsFulfillPercentage =
    totalItemsCount > 0 ? Math.round((closedItemsCount / totalItemsCount) * 100) : 0;
  const totalSlipsCount = items.filter((i) => !!i.slipImageUri).length;

  // Weekly breakdown calculation
  const weeklyStats = useMemo(() => {
    const stats: Record<number, { planned: number; closed: number; count: number }> = {
      1: { planned: 0, closed: 0, count: 0 },
      2: { planned: 0, closed: 0, count: 0 },
      3: { planned: 0, closed: 0, count: 0 },
      4: { planned: 0, closed: 0, count: 0 },
    };

    items.forEach((item) => {
      const w = item.targetWeek || 1;
      if (stats[w]) {
        stats[w].count += 1;
        stats[w].planned += item.estimatedCost;
        if (item.status === 'closed' && item.actualCost !== undefined) {
          stats[w].closed += item.actualCost;
        }
      }
    });

    return stats;
  }, [items]);

  // Filtered items by selected week
  const filteredItems = useMemo(() => {
    if (selectedWeek === 'all') return items;
    return items.filter((i) => i.targetWeek === selectedWeek);
  }, [items, selectedWeek]);

  if (!budget || !category) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundBox}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.warning} />
          <Text style={styles.notFoundTitle}>Budget Not Found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back to Budgets</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Handle Photo Slip Attachment
  const handlePickSlip = async () => {
    Alert.alert('Attach Buying Slip / Receipt', 'Choose slip source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to capture buying slips.');
            return;
          }
          const res = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.75,
          });
          if (!res.canceled && res.assets && res.assets.length > 0) {
            setSlipImageUri(res.assets[0].uri);
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
            setSlipImageUri(res.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Open Close Item Modal
  const handleOpenCloseModal = (item: BudgetItem) => {
    setTargetItemToClose(item);
    setActualCostStr(item.estimatedCost.toString());
    setSelectedPaidAccId(budget.accountId || accounts[0]?.id || '');
    setSlipImageUri(null);
    setCloseNotes('');
  };

  // Confirm Close & Create Transaction
  const handleConfirmClose = async () => {
    if (!targetItemToClose) return;
    const actualCost = parseFloat(actualCostStr);
    if (isNaN(actualCost) || actualCost <= 0) {
      Alert.alert('Invalid Cost', 'Please enter the actual amount paid for this item.');
      return;
    }
    if (!selectedPaidAccId) {
      Alert.alert('Account Required', 'Please select which account paid for this item.');
      return;
    }

    await closeBudgetItem(budget.id, targetItemToClose.id, {
      actualCost,
      accountId: selectedPaidAccId,
      slipImageUri: slipImageUri || undefined,
      notes: closeNotes.trim() || undefined,
    });

    setTargetItemToClose(null);
  };

  // Handle Add Item
  const handleConfirmAddItem = async () => {
    const name = newItemName.trim();
    const cost = parseFloat(newItemCostStr);
    if (!name) {
      Alert.alert('Item Name', 'Please enter an item name.');
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Cost', 'Please enter a valid estimated cost.');
      return;
    }

    await addBudgetItem(budget.id, {
      name,
      estimatedCost: cost,
      targetWeek: newItemWeek,
      status: 'planned',
    });

    setNewItemName('');
    setNewItemCostStr('');
    setIsAddModalVisible(false);
  };

  const handleDeleteBudget = () => {
    Alert.alert(
      'Delete Master Budget',
      `Are you sure you want to delete the budget for ${category.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBudget(budget.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    Alert.alert('Remove Item', `Remove "${itemName}" from this budget?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteBudgetItem(budget.id, itemId),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <View style={[styles.catIconWrap, { backgroundColor: category.color + '25' }]}>
            <Ionicons name={(category.icon as any) || 'pie-chart'} size={18} color={category.color} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{category.name}</Text>
            <Text style={styles.headerSubtitle}>
              Master Budget • {selectedMonth}
              {linkedAccount ? ` • ${linkedAccount.name}` : ''}
            </Text>
          </View>
        </View>

        <Pressable onPress={handleDeleteBudget} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Hero Card */}
        <Card elevated highlight style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroSub}>Monthly Allocated Limit</Text>
              <Text style={styles.heroLimit}>{formatAmount(limit)}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    percentage >= 100
                      ? COLORS.expenseBg
                      : percentage >= 80
                      ? COLORS.warningBg
                      : COLORS.incomeBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      percentage >= 100
                        ? COLORS.expense
                        : percentage >= 80
                        ? COLORS.warning
                        : COLORS.income,
                  },
                ]}
              >
                {percentage >= 100
                  ? 'Over Budget'
                  : percentage >= 80
                  ? 'Near Limit'
                  : 'On Track'}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressWrap}>
            <ProgressBar
              progress={percentage}
              color={percentage >= 100 ? COLORS.expense : percentage >= 80 ? COLORS.warning : COLORS.income}
              height={10}
            />
          </View>

          {/* Bottom Numbers Row */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCol}>
              <Text style={styles.statLabel}>Spent So Far</Text>
              <Text style={[styles.statValue, { color: COLORS.expense }]}>
                {formatAmount(spent)}
              </Text>
            </View>

            <View style={styles.heroStatCol}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: remaining >= 0 ? COLORS.income : COLORS.expense },
                ]}
              >
                {formatAmount(Math.abs(remaining))}
              </Text>
            </View>

            <View style={styles.heroStatCol}>
              <Text style={styles.statLabel}>Items Bought</Text>
              <Text style={styles.statValue}>
                {closedItemsCount}/{totalItemsCount} ({itemsFulfillPercentage}%)
              </Text>
            </View>
          </View>

          {/* Slips badge */}
          {totalSlipsCount > 0 && (
            <View style={styles.slipsCountBadge}>
              <Ionicons name="receipt-outline" size={14} color={COLORS.primaryLight} />
              <Text style={styles.slipsCountText}>
                {totalSlipsCount} buying slip{totalSlipsCount > 1 ? 's' : ''} attached & verified
              </Text>
            </View>
          )}
        </Card>

        {/* Weekly Division Segmented Tabs */}
        <View style={styles.weekTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekTabsContent}
          >
            <Pressable
              style={[styles.weekTabChip, selectedWeek === 'all' && styles.weekTabChipActive]}
              onPress={() => setSelectedWeek('all')}
            >
              <Text
                style={[
                  styles.weekTabChipText,
                  selectedWeek === 'all' && styles.weekTabChipTextActive,
                ]}
              >
                All Weeks ({items.length})
              </Text>
            </Pressable>

            {([1, 2, 3, 4] as const).map((w) => {
              const isSelected = selectedWeek === w;
              const wStat = weeklyStats[w];
              return (
                <Pressable
                  key={w}
                  style={[styles.weekTabChip, isSelected && styles.weekTabChipActive]}
                  onPress={() => setSelectedWeek(w)}
                >
                  <Text
                    style={[
                      styles.weekTabChipText,
                      isSelected && styles.weekTabChipTextActive,
                    ]}
                  >
                    Week {w} ({wStat.count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Weekly Sub-Summary Card */}
        {selectedWeek !== 'all' && (
          <Card style={styles.weeklySummaryCard}>
            <View style={styles.weeklySummaryHeader}>
              <View>
                <Text style={styles.weeklySummaryTitle}>
                  Week {selectedWeek} Budget Breakdown
                </Text>
                <Text style={styles.weeklySummarySub}>
                  Days {selectedWeek === 1 ? '1–7' : selectedWeek === 2 ? '8–14' : selectedWeek === 3 ? '15–21' : '22–End of Month'}
                </Text>
              </View>
              <View style={styles.weeklySummaryBadge}>
                <Text style={styles.weeklySummaryBadgeText}>
                  Est: {settings.currencySymbol} {weeklyStats[selectedWeek].planned.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.weeklyProgressRow}>
              <Text style={styles.weeklyProgressSpent}>
                Actual Paid: {settings.currencySymbol} {weeklyStats[selectedWeek].closed.toLocaleString()}
              </Text>
              <Text style={styles.weeklyProgressItems}>
                {items.filter((i) => i.targetWeek === selectedWeek && i.status === 'closed').length}/
                {weeklyStats[selectedWeek].count} bought
              </Text>
            </View>
          </Card>
        )}

        {/* Section Title with Add Item Button */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {selectedWeek === 'all' ? 'All Master Items' : `Week ${selectedWeek} Items`} ({filteredItems.length})
          </Text>

          <Pressable
            style={styles.addItemHeaderBtn}
            onPress={() => {
              setNewItemWeek(selectedWeek === 'all' ? 1 : selectedWeek);
              setIsAddModalVisible(true);
            }}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.addItemHeaderBtnText}>Add Item</Text>
          </Pressable>
        </View>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="basket-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No items for this week</Text>
            <Text style={styles.emptySub}>
              Tap &quot;Add Item&quot; to plan groceries, provisions, or household items for this week.
            </Text>
            <Pressable
              style={styles.addFirstItemBtn}
              onPress={() => {
                setNewItemWeek(selectedWeek === 'all' ? 1 : selectedWeek);
                setIsAddModalVisible(true);
              }}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addFirstItemBtnText}>Add Item Now</Text>
            </Pressable>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const isClosed = item.status === 'closed';
            const costVariance = isClosed && item.actualCost !== undefined
              ? item.actualCost - item.estimatedCost
              : 0;

            return (
              <Card
                key={item.id}
                style={[
                  styles.itemCard,
                  isClosed && styles.itemCardClosed,
                ]}
              >
                <View style={styles.itemTopRow}>
                  {/* Left: Checkmark / Clock icon */}
                  <View
                    style={[
                      styles.itemStatusIcon,
                      {
                        backgroundColor: isClosed ? COLORS.incomeBg : COLORS.warningBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isClosed ? 'checkmark-circle' : 'time-outline'}
                      size={18}
                      color={isClosed ? COLORS.income : COLORS.warning}
                    />
                  </View>

                  {/* Middle: Details */}
                  <View style={styles.itemCenter}>
                    <Text
                      style={[
                        styles.itemTitle,
                        isClosed && styles.itemTitleClosed,
                      ]}
                    >
                      {item.name}
                    </Text>

                    <View style={styles.itemMetaRow}>
                      <View style={styles.weekPill}>
                        <Text style={styles.weekPillText}>W{item.targetWeek}</Text>
                      </View>

                      <Text style={styles.itemEstText}>
                        Est: {settings.currencySymbol} {item.estimatedCost.toLocaleString()}
                      </Text>

                      {isClosed && item.actualCost !== undefined && (
                        <Text style={styles.itemPaidText}>
                          • Paid: {settings.currencySymbol} {item.actualCost.toLocaleString()}
                        </Text>
                      )}
                    </View>

                    {/* Variance info */}
                    {isClosed && costVariance !== 0 && (
                      <Text
                        style={[
                          styles.varianceText,
                          { color: costVariance > 0 ? COLORS.expense : COLORS.income },
                        ]}
                      >
                        {costVariance > 0
                          ? `+${settings.currencySymbol} ${costVariance.toLocaleString()} over est.`
                          : `-${settings.currencySymbol} ${Math.abs(costVariance).toLocaleString()} saved!`}
                      </Text>
                    )}

                    {item.notes && <Text style={styles.itemNotes}>&ldquo;{item.notes}&rdquo;</Text>}
                  </View>

                  {/* Right Actions */}
                  <View style={styles.itemRightCol}>
                    {!isClosed ? (
                      <Pressable
                        style={styles.buyBtn}
                        onPress={() => handleOpenCloseModal(item)}
                      >
                        <Ionicons name="camera-outline" size={14} color="#FFF" />
                        <Text style={styles.buyBtnText}>Buy & Slip</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.closedActionsRow}>
                        {item.slipImageUri ? (
                          <Pressable
                            style={styles.viewSlipBtn}
                            onPress={() => setPreviewSlipUri(item.slipImageUri || null)}
                          >
                            <Ionicons name="receipt" size={14} color={COLORS.primaryLight} />
                            <Text style={styles.viewSlipText}>Slip</Text>
                          </Pressable>
                        ) : (
                          <View style={styles.closedPill}>
                            <Text style={styles.closedPillText}>Bought</Text>
                          </View>
                        )}

                        <Pressable
                          style={styles.deleteItemBtn}
                          onPress={() => handleDeleteItem(item.id, item.name)}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            );
          })
        )}

        {/* Generate Monthly Report Shortcut */}
        <Pressable
          style={styles.reportShortcutBtn}
          onPress={() => router.push('/reports/monthly-cost')}
        >
          <Ionicons name="document-text-outline" size={20} color={COLORS.primaryLight} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reportShortcutTitle}>Generate Full Monthly Cost Report</Text>
            <Text style={styles.reportShortcutSub}>
              Audit itemized costs, slips, and export to PDF / WhatsApp
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </Pressable>
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL 1: BUY & ATTACH SLIP (FULFILL ITEM)                  */}
      {/* ========================================================= */}
      <Modal
        visible={!!targetItemToClose}
        animationType="slide"
        transparent
        onRequestClose={() => setTargetItemToClose(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTargetItemToClose(null)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Attach Buying Slip & Close</Text>
                <Text style={styles.modalSub}>{targetItemToClose?.name}</Text>
              </View>
              <Pressable
                onPress={() => setTargetItemToClose(null)}
                style={styles.modalCloseBtn}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            {/* Actual Amount Paid */}
            <Text style={styles.inputLabel}>Actual Amount Paid</Text>
            <View style={styles.modalAmountWrap}>
              <Text style={styles.modalCurrency}>{settings.currencySymbol}</Text>
              <TextInput
                style={styles.modalAmountInput}
                keyboardType="numeric"
                value={actualCostStr}
                onChangeText={setActualCostStr}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />
            </View>

            {/* Account Selector */}
            <Text style={styles.inputLabel}>Paid From Account</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.accountChipsRow}
            >
              {accounts.map((acc) => {
                const isSelected = selectedPaidAccId === acc.id;
                return (
                  <Pressable
                    key={acc.id}
                    style={[
                      styles.accChip,
                      isSelected && {
                        backgroundColor: acc.color + '25',
                        borderColor: acc.color,
                      },
                    ]}
                    onPress={() => setSelectedPaidAccId(acc.id)}
                  >
                    <Ionicons
                      name={(acc.icon as any) || 'wallet'}
                      size={14}
                      color={isSelected ? acc.color : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.accChipText,
                        isSelected && { color: acc.color, fontWeight: '700' },
                      ]}
                    >
                      {acc.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Buying Slip / Receipt Attachment */}
            <Text style={styles.inputLabel}>Buying Slip / Receipt Photo</Text>
            {slipImageUri ? (
              <View style={styles.slipPreviewCard}>
                <Image source={{ uri: slipImageUri }} style={styles.slipThumb} />
                <View style={styles.slipPreviewInfo}>
                  <Text style={styles.slipAttachedText}>Slip Photo Attached</Text>
                  <View style={styles.slipActionBtns}>
                    <Pressable style={styles.retakeBtn} onPress={handlePickSlip}>
                      <Text style={styles.retakeBtnText}>Change</Text>
                    </Pressable>
                    <Pressable
                      style={styles.removeSlipBtn}
                      onPress={() => setSlipImageUri(null)}
                    >
                      <Text style={styles.removeSlipText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable style={styles.attachSlipBtn} onPress={handlePickSlip}>
                <Ionicons name="camera" size={20} color={COLORS.primaryLight} />
                <Text style={styles.attachSlipBtnText}>Take Slip Photo / Upload Receipt</Text>
              </Pressable>
            )}

            {/* Optional Notes */}
            <Text style={styles.inputLabel}>Notes / Shop Name (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Keells Super / Wholesale shop"
              placeholderTextColor={COLORS.textMuted}
              value={closeNotes}
              onChangeText={setCloseNotes}
            />

            {/* Submit Close Button */}
            <Pressable style={styles.confirmCloseBtn} onPress={handleConfirmClose}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.confirmCloseBtnText}>Close Item & Record Expense</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: ADD NEW ITEM TO BUDGET                            */}
      {/* ========================================================= */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsAddModalVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item to Master Budget</Text>
              <Pressable
                onPress={() => setIsAddModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Item Name</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Keeri Samba Rice 10kg, Cooking Gas"
              placeholderTextColor={COLORS.textMuted}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Estimated Cost ({settings.currencySymbol})</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. 2600"
              placeholderTextColor={COLORS.textMuted}
              value={newItemCostStr}
              onChangeText={setNewItemCostStr}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Target Week</Text>
            <View style={styles.weekPickerRow}>
              {([1, 2, 3, 4] as const).map((w) => (
                <Pressable
                  key={w}
                  style={[
                    styles.weekPickerBtn,
                    newItemWeek === w && styles.weekPickerBtnActive,
                  ]}
                  onPress={() => setNewItemWeek(w)}
                >
                  <Text
                    style={[
                      styles.weekPickerBtnText,
                      newItemWeek === w && styles.weekPickerBtnTextActive,
                    ]}
                  >
                    Week {w}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.confirmCloseBtn} onPress={handleConfirmAddItem}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.confirmCloseBtnText}>Add Item to Budget</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: FULL SCREEN SLIP PHOTO PREVIEW                    */}
      {/* ========================================================= */}
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
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 10,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  heroCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  heroSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  heroLimit: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressWrap: {
    marginBottom: SPACING.md,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  heroStatCol: {
    flex: 1,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  slipsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cardElevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slipsCountText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  weekTabsContainer: {
    marginBottom: SPACING.md,
  },
  weekTabsContent: {
    gap: 8,
  },
  weekTabChip: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekTabChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  weekTabChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  weekTabChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  weeklySummaryCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.cardElevated,
  },
  weeklySummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weeklySummaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  weeklySummarySub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  weeklySummaryBadge: {
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.xs,
  },
  weeklySummaryBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  weeklyProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyProgressSpent: {
    color: COLORS.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  weeklyProgressItems: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  addItemHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  addItemHeaderBtnText: {
    color: '#FFF',
    fontSize: 11,
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
    fontWeight: '600',
    marginTop: 6,
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  addFirstItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    gap: 6,
  },
  addFirstItemBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  itemCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  itemCardClosed: {
    backgroundColor: COLORS.cardElevated,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.income,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCenter: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemTitleClosed: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  weekPill: {
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  weekPillText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  itemEstText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  itemPaidText: {
    color: COLORS.expense,
    fontSize: 11,
    fontWeight: '600',
  },
  varianceText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  itemNotes: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemRightCol: {
    alignItems: 'flex-end',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  buyBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  closedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.xs,
    gap: 4,
  },
  viewSlipText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  closedPill: {
    backgroundColor: COLORS.incomeBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.xs,
  },
  closedPillText: {
    color: COLORS.income,
    fontSize: 11,
    fontWeight: '700',
  },
  deleteItemBtn: {
    padding: 4,
  },
  reportShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
    gap: 12,
  },
  reportShortcutTitle: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  reportShortcutSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    color: COLORS.primaryLight,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  modalAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  modalCurrency: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginRight: 6,
  },
  modalAmountInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    paddingVertical: 10,
  },
  accountChipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  accChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  accChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  attachSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
    borderStyle: 'dashed',
    gap: 8,
  },
  attachSlipBtnText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  slipPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  slipThumb: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
  },
  slipPreviewInfo: {
    flex: 1,
  },
  slipAttachedText: {
    color: COLORS.income,
    fontSize: 13,
    fontWeight: '700',
  },
  slipActionBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  retakeBtn: {
    paddingVertical: 4,
  },
  retakeBtnText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  removeSlipBtn: {
    paddingVertical: 4,
  },
  removeSlipText: {
    color: COLORS.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    gap: 8,
  },
  confirmCloseBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  weekPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  weekPickerBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekPickerBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  weekPickerBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  weekPickerBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
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
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 12,
  },
  notFoundTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
