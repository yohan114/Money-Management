import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';

export default function FuelLogModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string }>();

  const {
    vehicles,
    accounts,
    formatAmount,
    settings,
    addFuelLog,
  } = useFinancial();

  const initialVehicle = vehicles.find((v) => v.id === params.vehicleId) || vehicles[0];
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicle?.id || ''
  );
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || initialVehicle;

  const [odometerStr, setOdometerStr] = useState(
    initialVehicle ? initialVehicle.currentOdometer.toString() : ''
  );
  const [litersStr, setLitersStr] = useState('');
  const [pricePerLiterStr, setPricePerLiterStr] = useState('370');
  const [totalCostStr, setTotalCostStr] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [paidFromAccountId, setPaidFromAccountId] = useState(accounts[0]?.id || '');
  const [stationName, setStationName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slipImageUri, setSlipImageUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [autoDebit, setAutoDebit] = useState(true);

  // Auto calculate total cost when liters or price changes
  const handleLitersChange = (val: string) => {
    setLitersStr(val);
    const l = parseFloat(val);
    const p = parseFloat(pricePerLiterStr);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCostStr(Math.round(l * p).toString());
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerLiterStr(val);
    const l = parseFloat(litersStr);
    const p = parseFloat(val);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCostStr(Math.round(l * p).toString());
    }
  };

  const handlePickSlip = async () => {
    Alert.alert('Attach Pump Slip / Receipt', 'Choose slip photo source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to capture fuel slips.');
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

  const handleSave = async () => {
    if (!selectedVehicle) {
      Alert.alert('Vehicle Required', 'Please add a vehicle first before logging fuel.');
      return;
    }

    const odo = parseFloat(odometerStr);
    if (isNaN(odo) || odo <= 0) {
      Alert.alert('Invalid Meter Reading', 'Please enter a valid meter reading / odometer value.');
      return;
    }

    const liters = parseFloat(litersStr);
    if (isNaN(liters) || liters <= 0) {
      Alert.alert('Invalid Liters', 'Please enter the liters filled.');
      return;
    }

    const totalCost = parseFloat(totalCostStr);
    if (isNaN(totalCost) || totalCost <= 0) {
      Alert.alert('Invalid Cost', 'Please enter the total cost of fuel.');
      return;
    }

    const pricePerLiter = parseFloat(pricePerLiterStr) || Math.round(totalCost / liters);

    try {
      await addFuelLog(
        {
          vehicleId: selectedVehicle.id,
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          odometer: odo,
          liters,
          pricePerLiter,
          totalCost,
          isFullTank,
          paidFromAccountId,
          stationName: stationName.trim() || undefined,
          slipImageUri: slipImageUri || undefined,
          note: note.trim() || undefined,
        },
        { autoDebitAccount: autoDebit }
      );
      router.back();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save fuel log.');
    }
  };

  if (vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={48} color={COLORS.primaryLight} />
          <Text style={styles.emptyTitle}>No Vehicles Registered</Text>
          <Text style={styles.emptySub}>Add your car, bike, or scooter first to start logging fuel purchases.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/modal/vehicle')}>
            <Text style={styles.primaryBtnText}>+ Add Vehicle</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Record Fuel Purchase</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Select Vehicle Chips */}
        <Text style={styles.fieldLabel}>Select Vehicle *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehScroll}>
          {vehicles.map((v) => {
            const isSelected = v.id === selectedVehicle?.id;
            return (
              <Pressable
                key={v.id}
                style={[
                  styles.vehChip,
                  isSelected && { backgroundColor: v.color + '25', borderColor: v.color },
                ]}
                onPress={() => {
                  setSelectedVehicleId(v.id);
                  setOdometerStr(v.currentOdometer.toString());
                }}
              >
                <Ionicons name={(v.icon as any) || 'car'} size={16} color={isSelected ? v.color : COLORS.textMuted} />
                <View>
                  <Text style={[styles.vehChipName, isSelected && { color: v.color, fontWeight: '700' }]}>
                    {v.name}
                  </Text>
                  <Text style={styles.vehChipSub}>{v.plateNumber || 'No plate'}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Meter Reading / Odometer */}
        <View style={styles.heroInputBox}>
          <Text style={styles.heroInputLabel}>Current Meter Reading (km) *</Text>
          <TextInput
            style={styles.heroTextInput}
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={odometerStr}
            onChangeText={setOdometerStr}
          />
          {selectedVehicle && (
            <Text style={styles.heroInputHelper}>
              Previous reading was: {selectedVehicle.currentOdometer.toLocaleString()} km
            </Text>
          )}
        </View>

        {/* Liters and Price Row */}
        <View style={styles.twoColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Liters Filled *</Text>
            <TextInput
              style={[styles.textInput, styles.highlightInput]}
              placeholder="e.g. 25.5"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={litersStr}
              onChangeText={handleLitersChange}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Price / Liter ({settings.currencySymbol})</Text>
            <TextInput
              style={styles.textInput}
              placeholder="370"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={pricePerLiterStr}
              onChangeText={handlePriceChange}
            />
          </View>
        </View>

        {/* Total Cost */}
        <Text style={styles.fieldLabel}>Total Cost ({settings.currencySymbol}) *</Text>
        <TextInput
          style={[styles.textInput, styles.totalAmountInput]}
          placeholder="0.00"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={totalCostStr}
          onChangeText={setTotalCostStr}
        />

        {/* Full Tank Toggle */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.switchTitle}>Filled Full Tank</Text>
            <Text style={styles.switchSub}>
              Required to calculate exact fuel consumption (km/L) between fill-ups.
            </Text>
          </View>
          <Switch
            value={isFullTank}
            onValueChange={setIsFullTank}
            trackColor={{ false: COLORS.border, true: COLORS.incomeBg }}
            thumbColor={isFullTank ? COLORS.income : '#f4f3f4'}
          />
        </View>

        {/* Paid From Account */}
        <Text style={styles.fieldLabel}>Paid From Account *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
          {accounts.map((acc) => {
            const isSelected = paidFromAccountId === acc.id;
            return (
              <Pressable
                key={acc.id}
                style={[
                  styles.accChip,
                  isSelected && { borderColor: acc.color, backgroundColor: acc.color + '20' },
                ]}
                onPress={() => setPaidFromAccountId(acc.id)}
              >
                <Ionicons name={(acc.icon as any) || 'wallet'} size={14} color={acc.color} />
                <Text style={[styles.accChipName, isSelected && { color: acc.color, fontWeight: '700' }]}>
                  {acc.name}
                </Text>
                <Text style={styles.accChipBal}>{formatAmount(acc.balance)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Auto Debit Switch */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.switchTitle}>Log Expense Transaction</Text>
            <Text style={styles.switchSub}>
              Automatically deduct {settings.currencySymbol} {totalCostStr || '0'} from your account and log transaction.
            </Text>
          </View>
          <Switch
            value={autoDebit}
            onValueChange={setAutoDebit}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={autoDebit ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        {/* Gas Station & Date */}
        <View style={styles.twoColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Fuel Station</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ceypetco, IOC, Sinopec"
              placeholderTextColor={COLORS.textMuted}
              value={stationName}
              onChangeText={setStationName}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={date}
              onChangeText={setDate}
            />
          </View>
        </View>

        {/* Attach Receipt Slip Photo */}
        <Text style={styles.fieldLabel}>Fuel Pump Slip / Receipt (Optional)</Text>
        {slipImageUri ? (
          <View style={styles.slipPreviewBox}>
            <Image source={{ uri: slipImageUri }} style={styles.slipAttachedImage} />
            <View style={styles.slipActionRow}>
              <Pressable style={styles.slipChangeBtn} onPress={handlePickSlip}>
                <Text style={styles.slipChangeBtnText}>Change Photo</Text>
              </Pressable>
              <Pressable style={styles.slipRemoveBtn} onPress={() => setSlipImageUri(null)}>
                <Text style={styles.slipRemoveBtnText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.attachSlipBtn} onPress={handlePickSlip}>
            <Ionicons name="camera-outline" size={20} color={COLORS.primaryLight} />
            <Text style={styles.attachSlipBtnText}>Attach Pump Slip Photo</Text>
          </Pressable>
        )}

        {/* Notes */}
        <Text style={styles.fieldLabel}>Notes (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Trip to Kandy, Long highway drive..."
          placeholderTextColor={COLORS.textMuted}
          value={note}
          onChangeText={setNote}
        />

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>Save Fuel Log</Text>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  fieldLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  highlightInput: {
    color: COLORS.primaryLight,
    fontWeight: '700',
    fontSize: 16,
  },
  totalAmountInput: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.income,
  },
  heroInputBox: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    padding: SPACING.md,
    marginTop: 6,
    marginBottom: 4,
  },
  heroInputLabel: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroTextInput: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  heroInputHelper: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  vehScroll: {
    marginBottom: 6,
  },
  vehChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  vehChipName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  vehChipSub: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginTop: 12,
  },
  switchTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  switchSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  accountScroll: {
    marginBottom: 4,
  },
  accChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  accChipName: {
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  accChipBal: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  attachSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginTop: 4,
  },
  attachSlipBtnText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  slipPreviewBox: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  slipAttachedImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  slipActionRow: {
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
