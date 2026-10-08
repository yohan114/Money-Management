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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    vehicles,
    fuelLogs,
    serviceRecords,
    formatAmount,
    settings,
    deleteVehicle,
    deleteFuelLog,
    deleteServiceRecord,
  } = useFinancial();

  const vehicle = vehicles.find((v) => v.id === id);

  const [activeTab, setActiveTab] = useState<'fuel' | 'service'>('fuel');
  const [previewSlipUri, setPreviewSlipUri] = useState<string | null>(null);

  // Filter logs for this vehicle
  const vehicleFuelLogs = useMemo(() => {
    return fuelLogs.filter((fl) => fl.vehicleId === id);
  }, [fuelLogs, id]);

  const vehicleServiceRecords = useMemo(() => {
    return serviceRecords.filter((sr) => sr.vehicleId === id);
  }, [serviceRecords, id]);

  // Statistics
  const totalFuelCost = useMemo(() => {
    return vehicleFuelLogs.reduce((sum, fl) => sum + fl.totalCost, 0);
  }, [vehicleFuelLogs]);

  const totalFuelLiters = useMemo(() => {
    return vehicleFuelLogs.reduce((sum, fl) => sum + fl.liters, 0);
  }, [vehicleFuelLogs]);

  const totalServiceCost = useMemo(() => {
    return vehicleServiceRecords.reduce((sum, sr) => sum + sr.cost, 0);
  }, [vehicleServiceRecords]);

  const totalDrivenDistance = useMemo(() => {
    return vehicleFuelLogs.reduce((sum, fl) => sum + (fl.distanceDriven || 0), 0);
  }, [vehicleFuelLogs]);

  const avgEfficiency = useMemo(() => {
    const logsWithEff = vehicleFuelLogs.filter((fl) => !!fl.fuelEfficiencyKmPerLiter);
    if (logsWithEff.length === 0) return null;
    const avg =
      logsWithEff.reduce((sum, fl) => sum + fl.fuelEfficiencyKmPerLiter!, 0) / logsWithEff.length;
    return parseFloat(avg.toFixed(1));
  }, [vehicleFuelLogs]);

  const costPerKm = useMemo(() => {
    if (totalDrivenDistance <= 0 || totalFuelCost <= 0) return null;
    return parseFloat((totalFuelCost / totalDrivenDistance).toFixed(2));
  }, [totalDrivenDistance, totalFuelCost]);

  // Maintenance Due Status
  const serviceKmRemaining = vehicle?.nextServiceOdometer
    ? vehicle.nextServiceOdometer - vehicle.currentOdometer
    : null;
  const isOdoServiceDue = serviceKmRemaining !== null && serviceKmRemaining <= 500;

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={48} color={COLORS.warning} />
          <Text style={styles.emptyTitle}>Vehicle Not Found</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Back to Fleet Hub</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.name}? Fuel and service records will remain safe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVehicle(vehicle.id);
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
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {vehicle.name}
          </Text>
          <Text style={styles.headerSub}>
            {vehicle.plateNumber || 'No Plate'} • {vehicle.fuelType.toUpperCase().replace('_', ' ')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerActionBtn}
            onPress={() => router.push(`/modal/vehicle?id=${vehicle.id}`)}
            hitSlop={10}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primaryLight} />
          </Pressable>
          <Pressable style={styles.headerActionBtn} onPress={handleDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={COLORS.expense} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle Hero Card */}
        <Card elevated highlight style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.heroIconBox, { backgroundColor: vehicle.color + '25', borderColor: vehicle.color }]}>
              <Ionicons name={(vehicle.icon as any) || 'car'} size={28} color={vehicle.color} />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.heroVehName}>{vehicle.name}</Text>
              <Text style={styles.heroVehPlate}>{vehicle.plateNumber || 'Unregistered Plate'}</Text>
              <Text style={styles.heroVehFuel}>{vehicle.fuelType.toUpperCase().replace('_', ' ')} FUEL</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroOdoLabel}>Current Meter</Text>
              <Text style={styles.heroOdoVal}>{vehicle.currentOdometer.toLocaleString()} km</Text>
            </View>
          </View>

          {/* Service Due Banner */}
          {vehicle.nextServiceOdometer || vehicle.nextServiceDate ? (
            <View style={[styles.serviceStatusBanner, isOdoServiceDue && styles.serviceStatusBannerDue]}>
              <Ionicons
                name={isOdoServiceDue ? 'warning' : 'shield-checkmark'}
                size={16}
                color={isOdoServiceDue ? COLORS.warning : COLORS.income}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceStatusTitle, isOdoServiceDue && { color: COLORS.warning }]}>
                  {serviceKmRemaining !== null
                    ? serviceKmRemaining <= 0
                      ? 'Service Overdue!'
                      : `Next Service Due in ${serviceKmRemaining.toLocaleString()} km`
                    : 'Scheduled Service'}
                </Text>
                <Text style={styles.serviceStatusSub}>
                  Due at {vehicle.nextServiceOdometer?.toLocaleString()} km
                  {vehicle.nextServiceDate ? ` or on ${vehicle.nextServiceDate}` : ''}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>
                Fuel ({totalFuelLiters > 0 ? `${totalFuelLiters.toFixed(0)}L` : 'Spent'})
              </Text>
              <Text style={[styles.metricVal, { color: COLORS.income }]}>{formatAmount(totalFuelCost)}</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>Avg Efficiency</Text>
              <Text style={[styles.metricVal, { color: COLORS.primaryLight }]}>
                {avgEfficiency ? `${avgEfficiency} km/L` : '—'}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>Cost / km</Text>
              <Text style={styles.metricVal}>
                {costPerKm ? `${settings.currencySymbol} ${costPerKm}` : '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push(`/modal/fuel-log?vehicleId=${vehicle.id}`)}
          >
            <Ionicons name="water" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>+ Fill Fuel</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, { backgroundColor: COLORS.purple }]}
            onPress={() => router.push(`/modal/service-record?vehicleId=${vehicle.id}`)}
          >
            <Ionicons name="build" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>+ Log Service</Text>
          </Pressable>
        </View>

        {/* Tabs: Fuel History vs Service History */}
        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tabButton, activeTab === 'fuel' && styles.tabButtonActive]}
            onPress={() => setActiveTab('fuel')}
          >
            <Ionicons
              name="water-outline"
              size={15}
              color={activeTab === 'fuel' ? COLORS.primaryLight : COLORS.textMuted}
            />
            <Text style={[styles.tabButtonText, activeTab === 'fuel' && styles.tabButtonTextActive]}>
              Fuel ({vehicleFuelLogs.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'service' && styles.tabButtonActive]}
            onPress={() => setActiveTab('service')}
          >
            <Ionicons
              name="build-outline"
              size={15}
              color={activeTab === 'service' ? COLORS.primaryLight : COLORS.textMuted}
            />
            <Text style={[styles.tabButtonText, activeTab === 'service' && styles.tabButtonTextActive]}>
              Service ({vehicleServiceRecords.length > 0 ? formatAmount(totalServiceCost) : '0'})
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: FUEL HISTORY */}
        {activeTab === 'fuel' && (
          <View style={styles.tabContent}>
            {vehicleFuelLogs.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="water-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Fuel Logs Yet</Text>
                <Text style={styles.emptySub}>Record fuel fill-ups to track consumption and mileage for this vehicle.</Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => router.push(`/modal/fuel-log?vehicleId=${vehicle.id}`)}
                >
                  <Text style={styles.emptyActionBtnText}>+ Record Fuel</Text>
                </Pressable>
              </Card>
            ) : (
              vehicleFuelLogs.map((log) => (
                <Card key={log.id} style={styles.logCard}>
                  <View style={styles.logCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.logDate}>
                          {new Date(log.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                        {log.isFullTank && (
                          <View style={styles.fullTankPill}>
                            <Text style={styles.fullTankText}>FULL</Text>
                          </View>
                        )}
                        {log.fuelEfficiencyKmPerLiter && (
                          <View style={styles.effPill}>
                            <Text style={styles.effText}>{log.fuelEfficiencyKmPerLiter} km/L</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.logOdo}>Meter: {log.odometer.toLocaleString()} km</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.logCost}>{formatAmount(log.totalCost)}</Text>
                      <Text style={styles.logSub}>
                        {log.liters} L @ Rs.{log.pricePerLiter}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.deleteBtn}
                      hitSlop={8}
                      onPress={() => {
                        Alert.alert('Delete Fuel Log', 'Delete this record?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteFuelLog(log.id) },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                    </Pressable>
                  </View>

                  {log.stationName && (
                    <Text style={styles.metaText}>📍 {log.stationName}</Text>
                  )}

                  {log.note && <Text style={styles.noteText}>{`"${log.note}"`}</Text>}

                  {/* Pump Slip Preview */}
                  {log.slipImageUri && (
                    <Pressable
                      style={styles.slipThumbRow}
                      onPress={() => setPreviewSlipUri(log.slipImageUri!)}
                    >
                      <Image source={{ uri: log.slipImageUri }} style={styles.slipThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.slipThumbTitle}>Pump Slip Attached</Text>
                        <Text style={styles.slipThumbSub}>Tap to view full receipt</Text>
                      </View>
                    </Pressable>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* TAB 2: SERVICE HISTORY */}
        {activeTab === 'service' && (
          <View style={styles.tabContent}>
            {vehicleServiceRecords.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="build-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Service Records</Text>
                <Text style={styles.emptySub}>Record routine oil changes and repairs with workshop bills.</Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => router.push(`/modal/service-record?vehicleId=${vehicle.id}`)}
                >
                  <Text style={styles.emptyActionBtnText}>+ Log Service</Text>
                </Pressable>
              </Card>
            ) : (
              vehicleServiceRecords.map((srv) => (
                <Card key={srv.id} style={styles.logCard}>
                  <View style={styles.logCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.srvTitle}>{srv.title}</Text>
                      <Text style={styles.logDate}>
                        {new Date(srv.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        • Meter: {srv.odometer.toLocaleString()} km
                      </Text>
                    </View>

                    <Text style={[styles.logCost, { color: COLORS.expense }]}>
                      {formatAmount(srv.cost)}
                    </Text>

                    <Pressable
                      style={styles.deleteBtn}
                      hitSlop={8}
                      onPress={() => {
                        Alert.alert('Delete Service Record', 'Delete this record?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteServiceRecord(srv.id) },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                    </Pressable>
                  </View>

                  {srv.workshopName && (
                    <Text style={styles.metaText}>🔧 {srv.workshopName}</Text>
                  )}

                  {srv.notes && <Text style={styles.noteText}>{`"${srv.notes}"`}</Text>}

                  {/* Service Invoice Slip */}
                  {srv.slipImageUri && (
                    <Pressable
                      style={styles.slipThumbRow}
                      onPress={() => setPreviewSlipUri(srv.slipImageUri!)}
                    >
                      <Image source={{ uri: srv.slipImageUri }} style={styles.slipThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.slipThumbTitle}>Service Invoice Attached</Text>
                        <Text style={styles.slipThumbSub}>Tap to view invoice</Text>
                      </View>
                    </Pressable>
                  )}
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* FULL SCREEN SLIP PREVIEW MODAL */}
      <Modal
        visible={!!previewSlipUri}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewSlipUri(null)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.previewHeader}>
            <Text style={styles.previewHeaderTitle}>Attached Bill / Slip</Text>
            <Pressable onPress={() => setPreviewSlipUri(null)} hitSlop={10}>
              <Ionicons name="close" size={26} color="#FFF" />
            </Pressable>
          </SafeAreaView>

          {previewSlipUri && (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: previewSlipUri }}
                style={styles.previewImage}
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
    marginBottom: SPACING.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroVehName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  heroVehPlate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  heroVehFuel: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  heroOdoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  heroOdoVal: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  serviceStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serviceStatusBannerDue: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning + '40',
  },
  serviceStatusTitle: {
    color: COLORS.income,
    fontSize: 12,
    fontWeight: '700',
  },
  serviceStatusSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  metricSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  metricVal: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  tabButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  tabContent: {
    gap: 10,
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
  logCard: {
    padding: 12,
    gap: 6,
  },
  logCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  srvTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  logDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  logOdo: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  logCost: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  logSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
  fullTankPill: {
    backgroundColor: COLORS.incomeBg,
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: RADIUS.xs,
  },
  fullTankText: {
    color: COLORS.income,
    fontSize: 8,
    fontWeight: '800',
  },
  effPill: {
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: RADIUS.xs,
  },
  effText: {
    color: COLORS.primaryLight,
    fontSize: 9,
    fontWeight: '700',
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  noteText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  slipThumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slipThumb: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  slipThumbTitle: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  slipThumbSub: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  modalBackdrop: {
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
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 12,
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
