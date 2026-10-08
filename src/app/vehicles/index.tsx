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
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useFinancial } from '../../context/FinancialContext';
import { Card } from '../../components/Card';
import { Vehicle } from '../../types';

export default function VehiclesHubScreen() {
  const router = useRouter();

  const {
    vehicles,
    fuelLogs,
    serviceRecords,
    selectedMonth,
    setSelectedMonth,
    formatAmount,
    settings,
    upcomingServiceReminders,
    deleteFuelLog,
    deleteServiceRecord,
  } = useFinancial();

  // Active sub-tab: 'fuel' | 'service' | 'fleet'
  const [activeTab, setActiveTab] = useState<'fuel' | 'service' | 'fleet'>('fuel');

  // Slip photo preview modal
  const [previewSlipUri, setPreviewSlipUri] = useState<string | null>(null);

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

  // Monthly Fuel Metrics
  const monthlyFuelLogs = useMemo(() => {
    return fuelLogs.filter((fl) => fl.date.startsWith(selectedMonth));
  }, [fuelLogs, selectedMonth]);

  const totalFuelCost = useMemo(() => {
    return monthlyFuelLogs.reduce((sum, fl) => sum + fl.totalCost, 0);
  }, [monthlyFuelLogs]);

  const totalFuelLiters = useMemo(() => {
    return monthlyFuelLogs.reduce((sum, fl) => sum + fl.liters, 0);
  }, [monthlyFuelLogs]);

  const totalMonthlyDistance = useMemo(() => {
    return monthlyFuelLogs.reduce((sum, fl) => sum + (fl.distanceDriven || 0), 0);
  }, [monthlyFuelLogs]);

  const averageEfficiency = useMemo(() => {
    const logsWithEff = monthlyFuelLogs.filter((fl) => !!fl.fuelEfficiencyKmPerLiter);
    if (logsWithEff.length === 0) return null;
    const avg =
      logsWithEff.reduce((sum, fl) => sum + fl.fuelEfficiencyKmPerLiter!, 0) / logsWithEff.length;
    return parseFloat(avg.toFixed(1));
  }, [monthlyFuelLogs]);

  const costPerKm = useMemo(() => {
    if (totalMonthlyDistance <= 0 || totalFuelCost <= 0) return null;
    return parseFloat((totalFuelCost / totalMonthlyDistance).toFixed(2));
  }, [totalMonthlyDistance, totalFuelCost]);

  // Helper to map vehicle to log
  const getVehicleForLog = (vehicleId: string): Vehicle | undefined => {
    return vehicles.find((v) => v.id === vehicleId);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Vehicles & Fuel Logs</Text>
          <Text style={styles.headerSub}>Fleet monitoring & maintenance</Text>
        </View>

        <Pressable
          style={styles.addVehHeaderBtn}
          onPress={() => router.push('/modal/vehicle')}
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.addVehHeaderBtnText}>Vehicle</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicles Quick Fleet Cards Carousel */}
        {vehicles.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.fleetScroll}
          >
            {vehicles.map((veh) => {
              const kmLeft = veh.nextServiceOdometer ? veh.nextServiceOdometer - veh.currentOdometer : null;
              const isDue = kmLeft !== null && kmLeft <= 500;

              return (
                <Pressable
                  key={veh.id}
                  onPress={() => router.push(`/vehicles/${veh.id}`)}
                >
                  <Card style={[styles.fleetCard, { borderColor: veh.color + '50' }]}>
                    <View style={styles.fleetCardTop}>
                      <View style={[styles.fleetIconWrap, { backgroundColor: veh.color + '22' }]}>
                        <Ionicons name={(veh.icon as any) || 'car'} size={20} color={veh.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.fleetCardName} numberOfLines={1}>
                          {veh.name}
                        </Text>
                        <Text style={styles.fleetCardPlate}>
                          {veh.plateNumber || 'No Plate'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fleetCardBottom}>
                      <View>
                        <Text style={styles.fleetCardOdoLabel}>Current Meter</Text>
                        <Text style={styles.fleetCardOdoVal}>
                          {veh.currentOdometer.toLocaleString()} km
                        </Text>
                      </View>

                      {kmLeft !== null && (
                        <View style={[styles.fleetServiceBadge, isDue && styles.fleetServiceBadgeDue]}>
                          <Text style={[styles.fleetServiceBadgeText, isDue && { color: COLORS.warning }]}>
                            {kmLeft <= 0 ? 'Service Overdue' : `Service in ${kmLeft} km`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Maintenance & Service Reminders Alert Banner */}
        {upcomingServiceReminders.length > 0 && (
          <View style={styles.reminderBanner}>
            <View style={styles.reminderHeader}>
              <Ionicons name="warning" size={16} color={COLORS.warning} />
              <Text style={styles.reminderTitle}>Service & Maintenance Due Soon</Text>
            </View>
            {upcomingServiceReminders.map((rem, idx) => (
              <Pressable
                key={`${rem.vehicle.id}-${idx}`}
                style={styles.reminderItem}
                onPress={() => router.push(`/modal/service-record?vehicleId=${rem.vehicle.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderVehName}>{rem.vehicle.name} ({rem.vehicle.plateNumber})</Text>
                  <Text style={styles.reminderDetail}>
                    {rem.reason === 'odometer'
                      ? rem.isOverdue
                        ? `Overdue by ${Math.abs(rem.remainingKm!)} km!`
                        : `Service due in ${rem.remainingKm} km (at ${rem.vehicle.nextServiceOdometer} km)`
                      : rem.isOverdue
                      ? `Overdue by ${Math.abs(rem.remainingDays!)} days!`
                      : `Due in ${rem.remainingDays} days (${rem.vehicle.nextServiceDate})`}
                  </Text>
                </View>
                <View style={styles.serviceNowBtn}>
                  <Text style={styles.serviceNowBtnText}>Log Service</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Month Navigation Row */}
        <View style={styles.monthNavRow}>
          <Pressable style={styles.monthNavBtn} onPress={() => changeMonth(-1)}>
            <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.monthNavText}>{monthLabel}</Text>
          <Pressable style={styles.monthNavBtn} onPress={() => changeMonth(1)}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* Monthly Fuel Consumption KPI Card */}
        <Card elevated highlight style={styles.consumptionCard}>
          <View style={styles.consumptionTopRow}>
            <View>
              <Text style={styles.consumptionSub}>Fuel Expenses in {monthLabel}</Text>
              <Text style={styles.consumptionTotalCost}>{formatAmount(totalFuelCost)}</Text>
            </View>

            <View style={styles.litersBadge}>
              <Ionicons name="water" size={14} color={COLORS.primaryLight} />
              <Text style={styles.litersBadgeText}>{totalFuelLiters.toFixed(1)} L</Text>
            </View>
          </View>

          {/* Efficiency & Distance Grid */}
          <View style={styles.consumptionGrid}>
            <View style={styles.consumptionGridItem}>
              <Text style={styles.consumptionGridSub}>Distance Driven</Text>
              <Text style={styles.consumptionGridVal}>
                {totalMonthlyDistance > 0 ? `${totalMonthlyDistance.toLocaleString()} km` : '—'}
              </Text>
            </View>

            <View style={styles.consumptionGridDivider} />

            <View style={styles.consumptionGridItem}>
              <Text style={styles.consumptionGridSub}>Avg Mileage</Text>
              <Text style={[styles.consumptionGridVal, { color: COLORS.income }]}>
                {averageEfficiency ? `${averageEfficiency} km/L` : '—'}
              </Text>
            </View>

            <View style={styles.consumptionGridDivider} />

            <View style={styles.consumptionGridItem}>
              <Text style={styles.consumptionGridSub}>Cost / km</Text>
              <Text style={[styles.consumptionGridVal, { color: COLORS.primaryLight }]}>
                {costPerKm ? `${settings.currencySymbol} ${costPerKm}` : '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Action FAB Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push('/modal/fuel-log')}
          >
            <Ionicons name="water" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>+ Fill Fuel</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, { backgroundColor: COLORS.purple }]}
            onPress={() => router.push('/modal/service-record')}
          >
            <Ionicons name="build" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>+ Log Service</Text>
          </Pressable>
        </View>

        {/* Tab Switcher: Fuel Logs vs Service Records vs Fleet */}
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
              Fuel Logs ({fuelLogs.length})
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
              Service Logs ({serviceRecords.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'fleet' && styles.tabButtonActive]}
            onPress={() => setActiveTab('fleet')}
          >
            <Ionicons
              name="car-outline"
              size={15}
              color={activeTab === 'fleet' ? COLORS.primaryLight : COLORS.textMuted}
            />
            <Text style={[styles.tabButtonText, activeTab === 'fleet' && styles.tabButtonTextActive]}>
              Fleet ({vehicles.length})
            </Text>
          </Pressable>
        </View>

        {/* ==================== TAB 1: FUEL LOGS ==================== */}
        {activeTab === 'fuel' && (
          <View style={styles.tabSection}>
            {fuelLogs.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="water-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Fuel Logs Recorded</Text>
                <Text style={styles.emptySub}>
                  Record meter readings when buying fuel to automatically calculate monthly consumption and km/L mileage.
                </Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => router.push('/modal/fuel-log')}
                >
                  <Text style={styles.emptyActionBtnText}>+ Log First Fuel Purchase</Text>
                </Pressable>
              </Card>
            ) : (
              fuelLogs.map((log) => {
                const veh = getVehicleForLog(log.vehicleId);
                return (
                  <Card key={log.id} style={styles.logCard}>
                    <View style={styles.logCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.logVehName}>{veh?.name || 'Vehicle'}</Text>
                          {log.isFullTank && (
                            <View style={styles.fullTankPill}>
                              <Text style={styles.fullTankText}>FULL TANK</Text>
                            </View>
                          )}
                          {log.fuelEfficiencyKmPerLiter && (
                            <View style={styles.effPill}>
                              <Text style={styles.effText}>{log.fuelEfficiencyKmPerLiter} km/L</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.logDate}>
                          {new Date(log.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          • Meter: {log.odometer.toLocaleString()} km
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.logCost}>{formatAmount(log.totalCost)}</Text>
                        <Text style={styles.logLiters}>
                          {log.liters} L @ Rs.{log.pricePerLiter}
                        </Text>
                      </View>

                      <Pressable
                        style={styles.deleteBtn}
                        hitSlop={8}
                        onPress={() => {
                          Alert.alert('Delete Fuel Log', 'Delete this fuel purchase record?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteFuelLog(log.id) },
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                      </Pressable>
                    </View>

                    {log.stationName && (
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>{log.stationName}</Text>
                      </View>
                    )}

                    {log.note && <Text style={styles.noteText}>{`"${log.note}"`}</Text>}

                    {/* Attached Pump Slip Thumbnail */}
                    {log.slipImageUri && (
                      <Pressable
                        style={styles.slipThumbRow}
                        onPress={() => setPreviewSlipUri(log.slipImageUri!)}
                      >
                        <Image source={{ uri: log.slipImageUri }} style={styles.slipThumb} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="image" size={12} color={COLORS.primaryLight} />
                            <Text style={styles.slipThumbTitle}>Pump Slip Attached</Text>
                          </View>
                          <Text style={styles.slipThumbSub}>Tap to view full receipt</Text>
                        </View>
                      </Pressable>
                    )}
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* ==================== TAB 2: SERVICE LOGS ==================== */}
        {activeTab === 'service' && (
          <View style={styles.tabSection}>
            {serviceRecords.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="build-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Maintenance Records</Text>
                <Text style={styles.emptySub}>
                  Keep an organized log of oil changes, repairs, and inspections with attached bills.
                </Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => router.push('/modal/service-record')}
                >
                  <Text style={styles.emptyActionBtnText}>+ Log First Service</Text>
                </Pressable>
              </Card>
            ) : (
              serviceRecords.map((srv) => {
                const veh = getVehicleForLog(srv.vehicleId);
                return (
                  <Card key={srv.id} style={styles.logCard}>
                    <View style={styles.logCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.logVehName}>{srv.title}</Text>
                        <Text style={styles.logDate}>
                          {veh?.name} •{' '}
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
                          Alert.alert('Delete Service Record', 'Delete this service record?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteServiceRecord(srv.id) },
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                      </Pressable>
                    </View>

                    {srv.workshopName && (
                      <View style={styles.metaRow}>
                        <Ionicons name="business-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>{srv.workshopName}</Text>
                      </View>
                    )}

                    {srv.notes && <Text style={styles.noteText}>{`"${srv.notes}"`}</Text>}

                    {/* Invoice Slip Thumbnail */}
                    {srv.slipImageUri && (
                      <Pressable
                        style={styles.slipThumbRow}
                        onPress={() => setPreviewSlipUri(srv.slipImageUri!)}
                      >
                        <Image source={{ uri: srv.slipImageUri }} style={styles.slipThumb} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="image" size={12} color={COLORS.primaryLight} />
                            <Text style={styles.slipThumbTitle}>Service Bill Attached</Text>
                          </View>
                          <Text style={styles.slipThumbSub}>Tap to view invoice</Text>
                        </View>
                      </Pressable>
                    )}
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* ==================== TAB 3: FLEET ==================== */}
        {activeTab === 'fleet' && (
          <View style={styles.tabSection}>
            {vehicles.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => router.push(`/vehicles/${v.id}`)}
              >
                <Card style={styles.fleetListCard}>
                  <View style={[styles.fleetIconWrapLarge, { backgroundColor: v.color + '22' }]}>
                    <Ionicons name={(v.icon as any) || 'car'} size={24} color={v.color} />
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={styles.fleetListName}>{v.name}</Text>
                    <Text style={styles.fleetListSub}>
                      {v.plateNumber || 'No Plate'} • {v.fuelType.toUpperCase().replace('_', ' ')}
                    </Text>
                    <Text style={styles.fleetListOdo}>
                      Odometer: {v.currentOdometer.toLocaleString()} km
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </Card>
              </Pressable>
            ))}

            <Pressable
              style={styles.addNewVehBtn}
              onPress={() => router.push('/modal/vehicle')}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primaryLight} />
              <Text style={styles.addNewVehBtnText}>Add Another Vehicle</Text>
            </Pressable>
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
  addVehHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  addVehHeaderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  fleetScroll: {
    marginBottom: SPACING.md,
  },
  fleetCard: {
    width: 220,
    padding: 12,
    marginRight: 10,
    borderRadius: RADIUS.lg,
  },
  fleetCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fleetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetCardName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  fleetCardPlate: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  fleetCardBottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    gap: 4,
  },
  fleetCardOdoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  fleetCardOdoVal: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  fleetServiceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.cardElevated,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.xs,
    marginTop: 4,
  },
  fleetServiceBadgeDue: {
    backgroundColor: COLORS.warningBg,
  },
  fleetServiceBadgeText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  reminderBanner: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    padding: 12,
    marginBottom: SPACING.md,
    gap: 8,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderTitle: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.warning + '20',
  },
  reminderVehName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  reminderDetail: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  serviceNowBtn: {
    backgroundColor: COLORS.warning,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
  },
  serviceNowBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: SPACING.sm,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  consumptionCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  consumptionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  consumptionSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  consumptionTotalCost: {
    color: COLORS.income,
    fontSize: 26,
    fontWeight: '900',
  },
  litersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  litersBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  consumptionGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  consumptionGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  consumptionGridDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  consumptionGridSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  consumptionGridVal: {
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
    paddingVertical: 11,
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
  tabSection: {
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
  logVehName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  logDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  logCost: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  logLiters: {
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  fleetListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  fleetIconWrapLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetListName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  fleetListSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  fleetListOdo: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addNewVehBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    borderStyle: 'dashed',
    marginTop: 6,
  },
  addNewVehBtnText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
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
});
