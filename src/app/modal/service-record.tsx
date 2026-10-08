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
import { ServiceType } from '../../types';

const SERVICE_TYPES: { type: ServiceType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { type: 'routine_oil', label: 'Engine Oil', icon: 'water', color: '#10B981' },
  { type: 'full_service', label: 'Full Service', icon: 'build', color: '#3B82F6' },
  { type: 'brakes', label: 'Brakes', icon: 'shield', color: '#F59E0B' },
  { type: 'tires', label: 'Tires', icon: 'disc', color: '#8B5CF6' },
  { type: 'battery', label: 'Battery', icon: 'battery-charging', color: '#EC4899' },
  { type: 'repair', label: 'Repair', icon: 'construct', color: '#F43F5E' },
  { type: 'insurance_revenue', label: 'Insurance/Rev', icon: 'document-text', color: '#06B6D4' },
  { type: 'wash_detailing', label: 'Wash', icon: 'sparkles', color: '#14B8A6' },
  { type: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#64748B' },
];

function getFutureDateISO(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().split('T')[0];
}

export default function ServiceRecordModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string }>();

  const {
    vehicles,
    accounts,
    formatAmount,
    settings,
    addServiceRecord,
  } = useFinancial();

  const initialVehicle = vehicles.find((v) => v.id === params.vehicleId) || vehicles[0];
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicle?.id || ''
  );
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || initialVehicle;

  const [serviceType, setServiceType] = useState<ServiceType>('routine_oil');
  const [title, setTitle] = useState('Engine Oil & Filter Change');
  const [odometerStr, setOdometerStr] = useState(
    initialVehicle ? initialVehicle.currentOdometer.toString() : ''
  );
  const [costStr, setCostStr] = useState('');
  const [paidFromAccountId, setPaidFromAccountId] = useState(accounts[0]?.id || '');
  const [workshopName, setWorkshopName] = useState('');
  const [nextOdoStr, setNextOdoStr] = useState(
    initialVehicle ? (initialVehicle.currentOdometer + 5000).toString() : ''
  );
  const [nextDate, setNextDate] = useState(getFutureDateISO(6));
  const [slipImageUri, setSlipImageUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [autoDebit, setAutoDebit] = useState(true);

  const handlePickSlip = async () => {
    Alert.alert('Attach Service Invoice / Bill', 'Choose photo source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to capture invoices.');
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
      Alert.alert('Vehicle Required', 'Please register a vehicle before adding service records.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a description for this service.');
      return;
    }

    const odo = parseFloat(odometerStr);
    if (isNaN(odo) || odo <= 0) {
      Alert.alert('Invalid Odometer', 'Please enter a valid meter reading at service.');
      return;
    }

    const cost = parseFloat(costStr);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Invalid Cost', 'Please enter the service amount.');
      return;
    }

    const nextOdo = nextOdoStr ? parseFloat(nextOdoStr) : undefined;
    if (nextDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      Alert.alert('Invalid Next Date', 'Next service date must be in YYYY-MM-DD format.');
      return;
    }

    try {
      await addServiceRecord(
        {
          vehicleId: selectedVehicle.id,
          date: new Date().toISOString(),
          odometer: odo,
          serviceType,
          title: title.trim(),
          cost,
          paidFromAccountId,
          workshopName: workshopName.trim() || undefined,
          slipImageUri: slipImageUri || undefined,
          notes: notes.trim() || undefined,
          nextServiceDueOdometer: nextOdo,
          nextServiceDueDate: nextDate.trim() || undefined,
        },
        { autoDebitAccount: autoDebit }
      );
      router.back();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save service record.');
    }
  };

  if (vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="build-outline" size={48} color={COLORS.primaryLight} />
          <Text style={styles.emptyTitle}>No Vehicles Available</Text>
          <Text style={styles.emptySub}>Add a vehicle first before logging maintenance.</Text>
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
        <Text style={styles.headerTitle}>Record Maintenance / Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Select Vehicle Chips */}
        <Text style={styles.fieldLabel}>Vehicle *</Text>
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
                  setNextOdoStr((v.currentOdometer + 5000).toString());
                }}
              >
                <Ionicons name={(v.icon as any) || 'car'} size={16} color={isSelected ? v.color : COLORS.textMuted} />
                <View>
                  <Text style={[styles.vehChipName, isSelected && { color: v.color, fontWeight: '700' }]}>
                    {v.name}
                  </Text>
                  <Text style={styles.vehChipSub}>{v.plateNumber}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Service Type Selection */}
        <Text style={styles.fieldLabel}>Service Type</Text>
        <View style={styles.serviceTypeGrid}>
          {SERVICE_TYPES.map((st) => {
            const isSelected = serviceType === st.type;
            return (
              <Pressable
                key={st.type}
                style={[
                  styles.serviceTypeChip,
                  isSelected && { backgroundColor: st.color + '25', borderColor: st.color },
                ]}
                onPress={() => {
                  setServiceType(st.type);
                  if (st.type === 'routine_oil') setTitle('Engine Oil & Filter Change');
                  else if (st.type === 'full_service') setTitle('Comprehensive Full Service');
                  else if (st.type === 'brakes') setTitle('Brake Pad Inspection & Replacement');
                  else if (st.type === 'tires') setTitle('Tire Replacement / Wheel Alignment');
                  else if (st.type === 'battery') setTitle('Battery Check / Replacement');
                  else if (st.type === 'insurance_revenue') setTitle('Revenue License & Insurance Renewal');
                }}
              >
                <Ionicons name={st.icon} size={15} color={isSelected ? st.color : COLORS.textMuted} />
                <Text style={[styles.serviceTypeChipText, isSelected && { color: st.color, fontWeight: '700' }]}>
                  {st.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Service Title */}
        <Text style={styles.fieldLabel}>Service Title / Description *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 50,000 km Routine Engine Oil Change"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        {/* Meter Reading and Cost */}
        <View style={styles.twoColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Odometer (km) *</Text>
            <TextInput
              style={[styles.textInput, { color: COLORS.primaryLight, fontWeight: '700' }]}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={odometerStr}
              onChangeText={setOdometerStr}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Cost ({settings.currencySymbol}) *</Text>
            <TextInput
              style={[styles.textInput, styles.costInput]}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={costStr}
              onChangeText={setCostStr}
            />
          </View>
        </View>

        {/* Workshop / Garage Name */}
        <Text style={styles.fieldLabel}>Workshop / Service Center</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Toyota Lanka, Auto Miraj, Local Mechanic"
          placeholderTextColor={COLORS.textMuted}
          value={workshopName}
          onChangeText={setWorkshopName}
        />

        {/* Paying Account */}
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
              Automatically deduct {settings.currencySymbol} {costStr || '0'} from your account.
            </Text>
          </View>
          <Switch
            value={autoDebit}
            onValueChange={setAutoDebit}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={autoDebit ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        {/* Next Service Due Reminders */}
        <Text style={styles.sectionHeading}>Next Service Reminders</Text>
        <Text style={styles.fieldHelper}>Will update vehicle alerts on your Dashboard.</Text>

        <View style={styles.twoColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Next Service Odo (km)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 55000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={nextOdoStr}
              onChangeText={setNextOdoStr}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Next Service Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={nextDate}
              onChangeText={setNextDate}
            />
          </View>
        </View>

        {/* Quick Date Presets */}
        <View style={styles.quickDateRow}>
          <Pressable style={styles.quickDateBtn} onPress={() => setNextDate(getFutureDateISO(3))}>
            <Text style={styles.quickDateText}>+3 Months</Text>
          </Pressable>
          <Pressable style={styles.quickDateBtn} onPress={() => setNextDate(getFutureDateISO(6))}>
            <Text style={styles.quickDateText}>+6 Months</Text>
          </Pressable>
          <Pressable style={styles.quickDateBtn} onPress={() => setNextDate(getFutureDateISO(12))}>
            <Text style={styles.quickDateText}>+1 Year</Text>
          </Pressable>
        </View>

        {/* Attach Invoice Photo */}
        <Text style={styles.fieldLabel}>Workshop Invoice / Bill Photo (Optional)</Text>
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
            <Text style={styles.attachSlipBtnText}>Attach Workshop Invoice Photo</Text>
          </Pressable>
        )}

        {/* Notes */}
        <Text style={styles.fieldLabel}>Parts Replaced / Mechanics Notes</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Oil grade used, filter part numbers, remarks..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>Save Service Record</Text>
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
  fieldHelper: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  sectionHeading: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: SPACING.lg,
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
  costInput: {
    color: COLORS.expense,
    fontSize: 18,
    fontWeight: '700',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  vehScroll: {
    marginBottom: 4,
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
  serviceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  serviceTypeChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
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
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickDateBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickDateText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
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
