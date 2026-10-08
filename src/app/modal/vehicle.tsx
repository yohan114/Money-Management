import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { VehicleType, FuelType } from '../../types';

const VEHICLE_TYPES: { type: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'car', label: 'Car', icon: 'car' },
  { type: 'bike', label: 'Motorbike', icon: 'bicycle' },
  { type: 'scooter', label: 'Scooter', icon: 'bicycle' },
  { type: 'van', label: 'Van / SUV', icon: 'bus' },
  { type: 'truck', label: 'Truck / Lorry', icon: 'train' },
  { type: 'other', label: 'Other', icon: 'speedometer' },
];

const FUEL_TYPES: { type: FuelType; label: string; color: string }[] = [
  { type: 'petrol_92', label: 'Petrol 92', color: '#10B981' },
  { type: 'petrol_95', label: 'Petrol 95', color: '#3B82F6' },
  { type: 'auto_diesel', label: 'Auto Diesel', color: '#F59E0B' },
  { type: 'super_diesel', label: 'Super Diesel', color: '#EC4899' },
  { type: 'hybrid', label: 'Hybrid', color: '#06B6D4' },
  { type: 'electric', label: 'Electric', color: '#8B5CF6' },
];

const VEHICLE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#64748B', // Slate
];

function getFutureDateISO(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().split('T')[0];
}

export default function VehicleModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vehicleId = params.id;

  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useFinancial();

  const existingVehicle = vehicleId ? vehicles.find((v) => v.id === vehicleId) : undefined;
  const isEditing = !!existingVehicle;

  const [name, setName] = useState(existingVehicle?.name || '');
  const [plateNumber, setPlateNumber] = useState(existingVehicle?.plateNumber || '');
  const [vehicleType, setVehicleType] = useState<VehicleType>(existingVehicle?.type || 'car');
  const [fuelType, setFuelType] = useState<FuelType>(existingVehicle?.fuelType || 'petrol_92');
  const [initialOdoStr, setInitialOdoStr] = useState(
    existingVehicle ? existingVehicle.initialOdometer.toString() : '0'
  );
  const [currentOdoStr, setCurrentOdoStr] = useState(
    existingVehicle ? existingVehicle.currentOdometer.toString() : '0'
  );
  const [tankCapacityStr, setTankCapacityStr] = useState(
    existingVehicle?.tankCapacityLiters ? existingVehicle.tankCapacityLiters.toString() : ''
  );
  const [nextServiceOdoStr, setNextServiceOdoStr] = useState(
    existingVehicle?.nextServiceOdometer ? existingVehicle.nextServiceOdometer.toString() : ''
  );
  const [nextServiceDate, setNextServiceDate] = useState(existingVehicle?.nextServiceDate || '');
  const [color, setColor] = useState(existingVehicle?.color || '#3B82F6');

  const selectedTypeConfig = VEHICLE_TYPES.find((t) => t.type === vehicleType) || VEHICLE_TYPES[0];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Vehicle Name Required', 'Please enter vehicle model or name (e.g. Toyota Prius, Honda Dio).');
      return;
    }

    const initialOdo = parseFloat(initialOdoStr) || 0;
    const currentOdo = parseFloat(currentOdoStr) || initialOdo;
    const tankCap = tankCapacityStr ? parseFloat(tankCapacityStr) : undefined;
    const nextServiceOdo = nextServiceOdoStr ? parseFloat(nextServiceOdoStr) : undefined;

    if (nextServiceDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextServiceDate)) {
      Alert.alert('Invalid Service Date', 'Next service date must be in YYYY-MM-DD format (or leave empty).');
      return;
    }

    try {
      if (isEditing && existingVehicle) {
        await updateVehicle({
          ...existingVehicle,
          name: name.trim(),
          plateNumber: plateNumber.trim(),
          type: vehicleType,
          fuelType,
          initialOdometer: initialOdo,
          currentOdometer: currentOdo,
          tankCapacityLiters: tankCap,
          icon: selectedTypeConfig.icon,
          color,
          nextServiceOdometer: nextServiceOdo,
          nextServiceDate: nextServiceDate.trim() || undefined,
        });
      } else {
        await addVehicle({
          name: name.trim(),
          plateNumber: plateNumber.trim(),
          type: vehicleType,
          fuelType,
          initialOdometer: initialOdo,
          currentOdometer: currentOdo,
          tankCapacityLiters: tankCap,
          icon: selectedTypeConfig.icon,
          color,
          nextServiceOdometer: nextServiceOdo,
          nextServiceDate: nextServiceDate.trim() || undefined,
        });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save vehicle.');
    }
  };

  const handleDelete = () => {
    if (!existingVehicle) return;

    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete "${existingVehicle.name}"? Fuel logs and service records will remain safe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVehicle(existingVehicle.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
        </Text>
        {isEditing ? (
          <Pressable onPress={handleDelete} hitSlop={10} style={styles.deleteHeaderBtn}>
            <Ionicons name="trash-outline" size={20} color={COLORS.expense} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Visual Badge Card */}
        <View style={styles.previewContainer}>
          <View style={[styles.previewBadge, { backgroundColor: color + '22', borderColor: color }]}>
            <Ionicons name={selectedTypeConfig.icon} size={36} color={color} />
          </View>
          <Text style={styles.previewTitle}>{name.trim() || 'Vehicle Name'}</Text>
          <Text style={styles.previewSub}>
            {plateNumber.trim() ? `${plateNumber.toUpperCase()} • ` : ''}
            {FUEL_TYPES.find((f) => f.type === fuelType)?.label}
          </Text>
        </View>

        {/* Vehicle Name / Model */}
        <Text style={styles.fieldLabel}>Vehicle Name / Model *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Toyota Prius, Honda Dio, Suzuki Alto"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* License Plate Number */}
        <Text style={styles.fieldLabel}>License Plate Number</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. WP CAD-1234, SP BHY-5678"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="characters"
          value={plateNumber}
          onChangeText={setPlateNumber}
        />

        {/* Vehicle Type */}
        <Text style={styles.fieldLabel}>Vehicle Type</Text>
        <View style={styles.typeGrid}>
          {VEHICLE_TYPES.map((t) => {
            const isSelected = vehicleType === t.type;
            return (
              <Pressable
                key={t.type}
                style={[
                  styles.typeChip,
                  isSelected && {
                    backgroundColor: color + '25',
                    borderColor: color,
                  },
                ]}
                onPress={() => setVehicleType(t.type)}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={isSelected ? color : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    isSelected && { color, fontWeight: '700' },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Fuel Type */}
        <Text style={styles.fieldLabel}>Fuel Type</Text>
        <View style={styles.fuelGrid}>
          {FUEL_TYPES.map((f) => {
            const isSelected = fuelType === f.type;
            return (
              <Pressable
                key={f.type}
                style={[
                  styles.fuelChip,
                  isSelected && {
                    backgroundColor: f.color + '25',
                    borderColor: f.color,
                  },
                ]}
                onPress={() => setFuelType(f.type)}
              >
                <Text
                  style={[
                    styles.fuelChipText,
                    isSelected && { color: f.color, fontWeight: '700' },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Meter Readings Row */}
        <View style={styles.twoColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Initial Odometer (km)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={initialOdoStr}
              onChangeText={setInitialOdoStr}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Current Odometer (km)</Text>
            <TextInput
              style={[styles.textInput, { color: COLORS.primaryLight, fontWeight: '700' }]}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={currentOdoStr}
              onChangeText={setCurrentOdoStr}
            />
          </View>
        </View>

        {/* Tank Capacity */}
        <Text style={styles.fieldLabel}>Fuel Tank Capacity (Liters, Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 45"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={tankCapacityStr}
          onChangeText={setTankCapacityStr}
        />

        {/* Next Service Due Reminders */}
        <Text style={styles.sectionHeaderTitle}>Service Reminders Setup</Text>
        <Text style={styles.fieldHelper}>
          Get alerts on the dashboard when service is approaching.
        </Text>

        <View style={styles.twoColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Next Service Odometer (km)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 50000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={nextServiceOdoStr}
              onChangeText={setNextServiceOdoStr}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Next Service Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={nextServiceDate}
              onChangeText={setNextServiceDate}
            />
          </View>
        </View>

        {/* Quick Date Presets */}
        <View style={styles.quickDateRow}>
          <Pressable
            style={styles.quickDateBtn}
            onPress={() => setNextServiceDate(getFutureDateISO(3))}
          >
            <Text style={styles.quickDateText}>+3 Months</Text>
          </Pressable>
          <Pressable
            style={styles.quickDateBtn}
            onPress={() => setNextServiceDate(getFutureDateISO(6))}
          >
            <Text style={styles.quickDateText}>+6 Months</Text>
          </Pressable>
          {nextServiceDate ? (
            <Pressable style={styles.quickClearBtn} onPress={() => setNextServiceDate('')}>
              <Text style={styles.quickClearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Color Picker */}
        <Text style={styles.fieldLabel}>Vehicle Theme Color</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
          {VEHICLE_COLORS.map((c) => {
            const isSelected = color === c;
            return (
              <Pressable
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  isSelected && styles.colorCircleSelected,
                ]}
                onPress={() => setColor(c)}
              />
            );
          })}
        </ScrollView>

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Vehicle'}</Text>
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
  deleteHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  previewBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  previewTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  previewSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  fieldLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: SPACING.sm + 4,
    marginBottom: 6,
  },
  fieldHelper: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  typeChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  fuelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fuelChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  fuelChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
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
  quickClearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.expenseBg,
  },
  quickClearText: {
    color: COLORS.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  colorScroll: {
    marginVertical: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
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
});
