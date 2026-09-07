
// fyp-mobile/app/admin/index.tsx

import adminGetDashboard, {
  AdminDashboardStats,
} from '../../services/admin/adminGetDashboard';

import adminGetPopularServices, {
  PopularService,
} from '../../services/admin/adminGetPopularServices';

import adminGetRevenueAnalytics, {
  RevenuePoint,
} from '../../services/admin/adminGetRevenueAnalytics';

import adminGetVendorPerformance, {
  VendorPerformance,
} from '../../services/admin/adminGetVendorPerformance';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';
const GOLD = '#D6A943';
const TEXT = '#1A1A1A';
const MUTED = '#8A7F87';

const { width } = Dimensions.get('window');

const CARD_GAP = 10;
const CARD_WIDTH = (width - 16 * 2 - CARD_GAP * 2) / 3;

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `Rs ${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `Rs ${(value / 1000).toFixed(0)}K`;
  }

  return `Rs ${Math.round(value || 0)}`;
};

type KpiKey =
  | 'bookings'
  | 'revenue'
  | 'commission'
  | 'vendors'
  | 'refunds'
  | 'payouts';

const KPI_CONFIG: {
  key: KpiKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route: string;
}[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    icon: 'calendar-outline',
    color: '#780C60',
    bg: '#F3E1EC',
    route: '/admin/bookings',
  },
  {
    key: 'revenue',
    label: 'Revenue',
    icon: 'trending-up-outline',
    color: '#278A4B',
    bg: '#E1F5E8',
    route: '/admin/analytics',
  },
  {
    key: 'commission',
    label: 'Commission',
    icon: 'pricetag-outline',
    color: '#B8860B',
    bg: '#FFF3D6',
    route: '/admin/commission',
  },
  {
    key: 'vendors',
    label: 'Vendors',
    icon: 'people-outline',
    color: '#337AB7',
    bg: '#DCEBFA',
    route: '/admin/bookings',
  },
  {
    key: 'refunds',
    label: 'Refunds',
    icon: 'return-down-back-outline',
    color: '#C0392B',
    bg: '#FBE1DF',
    route: '/admin/refunds',
  },
  {
    key: 'payouts',
    label: 'Payouts',
    icon: 'wallet-outline',
    color: '#6B4FBB',
    bg: '#E9E1FA',
    route: '/admin/payouts',
  },
];

const AdminDashboardScreen = () => {
  const [stats, setStats] =
    useState<AdminDashboardStats | null>(null);

  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);

  const [popularServices, setPopularServices] =
    useState<PopularService[]>([]);

  const [vendorPerformance, setVendorPerformance] =
    useState<VendorPerformance[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);

    try {
      const [
        statsData,
        revenueData,
        servicesData,
        vendorsData,
      ] = await Promise.all([
        adminGetDashboard(),
        adminGetRevenueAnalytics(),
        adminGetPopularServices(),
        adminGetVendorPerformance(),
      ]);

      setStats(statsData);

      setRevenue(revenueData || []);

      setPopularServices(servicesData || []);

      setVendorPerformance(vendorsData || []);
    } catch (err) {
      console.error(
        'Error loading admin dashboard:',
        err
      );

      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const kpiValues: Record<KpiKey, string> = {
    bookings: String(stats?.totalBookings ?? 0),

    revenue: formatCurrency(
      stats?.totalRevenue ?? 0
    ),

    commission: formatCurrency(
      stats?.totalCommission ?? 0
    ),

    vendors: String(stats?.totalVendors ?? 0),

    refunds: formatCurrency(
      stats?.totalRefunds ?? 0
    ),

    payouts: formatCurrency(
      stats?.totalPayouts ?? 0
    ),
  };

  const maxRevenue = Math.max(
    1,
    ...revenue.map((item) => item.amount)
  );

  const maxServiceCount = Math.max(
    1,
    ...popularServices.map(
      (service) => service.bookingCount
    )
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerState,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />

        <Text style={styles.loadingText}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}

      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>
            EVENTIFY HUB
          </Text>

          <Text style={styles.headerTitle}>
            Admin Dashboard
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() =>
            router.push('/admin/disputes')
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* ================= CONTENT ================= */}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
          />
        }
      >
        {/* ================= ERROR ================= */}

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons
              name="warning-outline"
              size={16}
              color="#C0392B"
            />

            <Text style={styles.errorBannerText}>
              {error}
            </Text>

            <TouchableOpacity
              onPress={fetchAll}
            >
              <Text style={styles.errorBannerRetry}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= KPI GRID ================= */}

        <View style={styles.kpiGrid}>
          {KPI_CONFIG.map((kpi) => (
            <TouchableOpacity
              key={kpi.key}
              style={styles.kpiCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push(kpi.route as any)
              }
            >
              <View
                style={[
                  styles.kpiIconWrap,
                  {
                    backgroundColor: kpi.bg,
                  },
                ]}
              >
                <Ionicons
                  name={kpi.icon}
                  size={17}
                  color={kpi.color}
                />
              </View>

              <Text style={styles.kpiValue}>
                {kpiValues[kpi.key]}
              </Text>

              <Text style={styles.kpiLabel}>
                {kpi.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================= REVENUE OVERVIEW ================= */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Revenue Overview
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push('/admin/analytics' as any)
              }
            >
              <Text style={styles.sectionLink}>
                View all
              </Text>
            </TouchableOpacity>
          </View>

          {revenue.length === 0 ? (
            <Text style={styles.emptyText}>
              No revenue data yet.
            </Text>
          ) : (
            <>
              <View style={styles.chartRow}>
                {revenue.map((point) => {
                  const barHeight = Math.max(
                    6,
                    (point.amount / maxRevenue) *
                      110
                  );

                  return (
                    <View
                      key={point.label}
                      style={styles.chartBarWrap}
                    >
                      <View
                        style={styles.chartBarTrack}
                      >
                        <View
                          style={[
                            styles.chartBar,
                            {
                              height: barHeight,
                            },
                          ]}
                        />
                      </View>

                      <Text
                        style={styles.chartBarLabel}
                      >
                        {point.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.chartTotal}>
                Total:{' '}
                {formatCurrency(
                  revenue.reduce(
                    (sum, item) =>
                      sum + item.amount,
                    0
                  )
                )}
              </Text>
            </>
          )}
        </View>

        {/* ================= POPULAR SERVICES ================= */}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Popular Services
          </Text>

          {popularServices.length === 0 ? (
            <Text style={styles.emptyText}>
              No booking data yet.
            </Text>
          ) : (
            popularServices
              .slice(0, 5)
              .map((service, index) => (
                <View
                  key={service.name}
                  style={styles.serviceRow}
                >
                  <View
                    style={styles.serviceRank}
                  >
                    <Text
                      style={
                        styles.serviceRankText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.serviceName}
                    >
                      {service.name}
                    </Text>

                    <View
                      style={
                        styles.serviceBarTrack
                      }
                    >
                      <View
                        style={[
                          styles.serviceBarFill,
                          {
                            width: `${
                              (service.bookingCount /
                                maxServiceCount) *
                              100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <Text
                    style={styles.serviceCount}
                  >
                    {service.bookingCount}
                  </Text>
                </View>
              ))
          )}
        </View>

        {/* ================= VENDOR PERFORMANCE ================= */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Vendor Performance
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push('/admin/bookings')
              }
            >
              <Text style={styles.sectionLink}>
                View all
              </Text>
            </TouchableOpacity>
          </View>

          {vendorPerformance.length === 0 ? (
            <Text style={styles.emptyText}>
              No vendor data yet.
            </Text>
          ) : (
            vendorPerformance
              .slice(0, 5)
              .map((vendor) => {
                const good =
                  vendor.completionRate >= 85;

                const ok =
                  vendor.completionRate >= 60 &&
                  vendor.completionRate < 85;

                const barColor = good
                  ? '#278A4B'
                  : ok
                  ? GOLD
                  : '#C0392B';

                return (
                  <View
                    key={vendor.vendorId}
                    style={styles.vendorRow}
                  >
                    <View
                      style={styles.vendorAvatar}
                    >
                      <Text
                        style={
                          styles.vendorAvatarText
                        }
                      >
                        {vendor.vendorName
                          ?.charAt(0)
                          ?.toUpperCase() || 'V'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View
                        style={styles.vendorTopRow}
                      >
                        <Text
                          style={styles.vendorName}
                          numberOfLines={1}
                        >
                          {vendor.vendorName}
                        </Text>

                        <Text
                          style={[
                            styles.vendorPercent,
                            {
                              color: barColor,
                            },
                          ]}
                        >
                          {vendor.completionRate}%
                        </Text>
                      </View>

                      <View
                        style={
                          styles.vendorBarTrack
                        }
                      >
                        <View
                          style={[
                            styles.vendorBarFill,
                            {
                              width: `${Math.min(
                                Math.max(
                                  vendor.completionRate,
                                  0
                                ),
                                100
                              )}%`,
                              backgroundColor:
                                barColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })
          )}
        </View>

        {/* ================= QUICK LINKS ================= */}

        <View style={styles.quickLinksRow}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() =>
              router.push('/admin/disputes')
            }
          >
            <Ionicons
              name="hand-left-outline"
              size={18}
              color={PRIMARY}
            />

            <Text style={styles.quickLinkText}>
              Disputes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() =>
              router.push('/admin/payments')
            }
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={PRIMARY}
            />

            <Text style={styles.quickLinkText}>
              Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() =>
              router.push('/admin/commission')
            }
          >
            <Ionicons
              name="calculator-outline"
              size={18}
              color={PRIMARY}
            />

            <Text style={styles.quickLinkText}>
              Commission
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

export default AdminDashboardScreen;

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_LIGHT,
  },

  centerState: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
  },

  /* ================= HEADER ================= */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    backgroundColor: PRIMARY,

    paddingTop:
      Platform.OS === 'ios'
        ? 60
        : 40,

    paddingBottom: 20,
    paddingHorizontal: 18,

    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  headerEyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 3,
  },

  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,

    backgroundColor:
      'rgba(255,255,255,0.15)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ================= SCROLL ================= */

  scrollContent: {
    padding: 16,
    paddingBottom: 12,
  },

  /* ================= ERROR ================= */

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 8,

    backgroundColor: '#FBE1DF',

    borderRadius: 12,

    padding: 12,

    marginBottom: 14,
  },

  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#8A2E2E',
    fontWeight: '600',
  },

  errorBannerRetry: {
    fontSize: 12,
    color: '#C0392B',
    fontWeight: '800',
  },

  /* ================= KPI ================= */

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },

  kpiCard: {
    width: CARD_WIDTH,

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    padding: 12,

    borderWidth: 1,
    borderColor: '#F0DDEA',
  },

  kpiIconWrap: {
    width: 30,
    height: 30,

    borderRadius: 9,

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: 8,
  },

  kpiValue: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },

  kpiLabel: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '600',
    marginTop: 2,
  },

  /* ================= SECTION ================= */

  sectionCard: {
    backgroundColor: '#FFFFFF',

    borderRadius: 18,

    padding: 16,

    marginTop: 16,

    borderWidth: 1,
    borderColor: '#F0DDEA',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },

  sectionLink: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY,
  },

  emptyText: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 16,
  },

  /* ================= REVENUE CHART ================= */

  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
  },

  chartBarWrap: {
    alignItems: 'center',
    flex: 1,
  },

  chartBarTrack: {
    height: 110,
    justifyContent: 'flex-end',
  },

  chartBar: {
    width: 14,
    borderRadius: 6,
    backgroundColor: PRIMARY,
  },

  chartBarLabel: {
    fontSize: 9,
    color: MUTED,
    marginTop: 6,
    fontWeight: '600',
  },

  chartTotal: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'right',
    marginTop: 10,
    fontWeight: '700',
  },

  /* ================= SERVICES ================= */

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 10,

    marginBottom: 12,
  },

  serviceRank: {
    width: 24,
    height: 24,

    borderRadius: 12,

    backgroundColor: PRIMARY_LIGHT,

    justifyContent: 'center',
    alignItems: 'center',
  },

  serviceRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY,
  },

  serviceName: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 5,
  },

  serviceBarTrack: {
    height: 6,

    backgroundColor: '#F0E5EB',

    borderRadius: 3,

    overflow: 'hidden',
  },

  serviceBarFill: {
    height: 6,

    backgroundColor: GOLD,

    borderRadius: 3,
  },

  serviceCount: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT,

    width: 28,

    textAlign: 'right',
  },

  /* ================= VENDORS ================= */

  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 10,

    marginBottom: 14,
  },

  vendorAvatar: {
    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: PRIMARY_LIGHT,

    justifyContent: 'center',
    alignItems: 'center',
  },

  vendorAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },

  vendorTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',

    marginBottom: 5,
  },

  vendorName: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,

    flex: 1,

    marginRight: 8,
  },

  vendorPercent: {
    fontSize: 12,
    fontWeight: '800',
  },

  vendorBarTrack: {
    height: 6,

    backgroundColor: '#F0E5EB',

    borderRadius: 3,

    overflow: 'hidden',
  },

  vendorBarFill: {
    height: 6,
    borderRadius: 3,
  },

  /* ================= QUICK LINKS ================= */

  quickLinksRow: {
    flexDirection: 'row',

    gap: 10,

    marginTop: 16,
  },

  quickLink: {
    flex: 1,

    backgroundColor: '#FFFFFF',

    borderRadius: 14,

    paddingVertical: 14,

    alignItems: 'center',

    gap: 6,

    borderWidth: 1,
    borderColor: '#F0DDEA',
  },

  quickLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT,
  },
});
