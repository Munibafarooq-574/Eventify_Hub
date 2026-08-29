// fyp-mobile/components/vendorGrowth/GrowthAnalyticsScreen.tsx
//
// Growth vendors see sales/customers/packages/promotions. Premium vendors
// additionally see 6-month trends, top-performing packages/promotions,
// and Business Insights. Every number here comes from real data — where
// view-tracking hasn't been wired in yet (see trackVendorView.ts), the
// screen says "Not tracked yet" instead of showing a misleading 0.
//
// TODO: same navigation/vendorId/theme notes as the earlier screens apply.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';

import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getGrowthAnalytics } from '../../services/getGrowthAnalytics';
import { getPremiumAnalytics } from '../../services/getPremiumAnalytics';
import { getBusinessInsights } from '../../services/getBusinessInsights';
import { SubscriptionPlan } from '../../types/subscription.types';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  BusinessInsight,
  GrowthAnalytics,
  MonthlyPoint,
  PremiumAnalytics,
  TrackedMetric,
} from '../../types/analytics.types';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#F3E8FF',
  text: '#1F2937',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  background: '#FAFAFA',
  card: '#FFFFFF',
  success: '#059669',
  danger: '#DC2626',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number): string {
  return n.toLocaleString();
}

function metricText(m: TrackedMetric): string {
  return m.tracked ? `${m.value}` : 'Not tracked yet';
}

export default function GrowthAnalyticsScreen() {
  const router = useRouter();

  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [growth, setGrowth] = useState<GrowthAnalytics | null>(null);
  const [premium, setPremium] = useState<PremiumAnalytics | null>(null);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!vendorIdValue) {
      setError('Missing vendorId');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const subscription = await getVendorSubscription(vendorIdValue);
      setPlan(subscription.plan);

      if (subscription.plan === SubscriptionPlan.FREE) {
        setLoading(false);
        return;
      }

      if (subscription.plan === SubscriptionPlan.PREMIUM) {
        const [premiumData, insightData] = await Promise.all([
          getPremiumAnalytics(vendorIdValue),
          getBusinessInsights(vendorIdValue),
        ]);
        setPremium(premiumData);
        setInsights(insightData);
      } else {
        setGrowth(await getGrowthAnalytics(vendorIdValue));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [vendorIdValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (plan === SubscriptionPlan.FREE) {
    return (
      <View style={styles.centered}>
        <Text style={styles.upsellEmoji}>📊</Text>
        <Text style={styles.upsellTitle}>Growth Analytics</Text>
        <Text style={styles.upsellSubtitle}>
          Upgrade to Growth or Premium to see revenue, customer, and package analytics.
        </Text>
        <TouchableOpacity
          style={styles.upsellButton}
          onPress={() =>
  router.push({
    pathname: '/subscriptionscreen',
    params: { vendorId: vendorIdValue },
  })
}
        >
          <Text style={styles.upsellButtonText}>View Plans</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const data: GrowthAnalytics | null = premium ?? growth;
  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>📊 Analytics</Text>

      {/* Business Insights — Premium only */}
      {insights.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Business Insights</Text>
          {insights.map((insight) => (
            <View key={insight.id} style={styles.insightRow}>
              <Text style={styles.insightBullet}>💡</Text>
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Sales */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Sales</Text>
        <View style={styles.statsGrid}>
          <Stat label="Total Revenue" value={`Rs. ${fmt(data.sales.totalRevenue)}`} />
          <Stat
            label="This Month"
            value={`Rs. ${fmt(data.sales.monthlyRevenue)}`}
            change={data.sales.monthlyRevenueChangePct}
          />
          <Stat
            label="Avg Order Value"
            value={data.sales.averageOrderValue != null ? `Rs. ${fmt(data.sales.averageOrderValue)}` : '—'}
          />
        </View>
      </View>

      {/* Customers */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Customers</Text>
        <View style={styles.statsGrid}>
          <Stat label="New Customers" value={`${data.customers.newCustomers}`} />
          <Stat label="Repeat Customers" value={`${data.customers.repeatCustomers}`} />
          <Stat
            label="Booking Conversion"
            value={data.customers.bookingConversionRate != null ? `${data.customers.bookingConversionRate}%` : '—'}
          />
        </View>
      </View>

      {/* Packages */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Packages</Text>
        <InfoRow label="Most Booked" value={data.packages.mostBookedPackage?.name ?? '—'} />
        <InfoRow label="Highest Revenue" value={data.packages.highestRevenuePackage?.name ?? '—'} />
        <InfoRow
          label="Most Viewed"
          value={data.packages.mostViewedPackage?.packageName ?? metricText(data.packages.mostViewedPackage ?? { tracked: false, value: 0 })}
        />
      </View>

      {/* Promotions */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Promotions</Text>
        <InfoRow label="Featured Views" value={metricText(data.promotions.featuredVendorViews)} />
        <InfoRow label="Coupon Redemptions" value={`${data.promotions.couponRedemptions}`} />
        <InfoRow label="Discount Code Redemptions" value={`${data.promotions.discountCodeRedemptions}`} />
      </View>

      {/* Premium-only sections */}
      {premium && (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Revenue Trend (6 months)</Text>
            <MiniBarChart points={premium.revenueTrend} color={COLORS.primary} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Booking Trend (6 months)</Text>
            <MiniBarChart points={premium.bookingTrend} color={COLORS.success} />
          </View>

          {premium.topPerformingPackages.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Top Performing Packages</Text>
              {premium.topPerformingPackages.map((pkg) => (
                <InfoRow
                  key={pkg.packageId}
                  label={pkg.packageName}
                  value={`Rs. ${fmt(pkg.revenue)} · ${pkg.bookingCount} bookings`}
                />
              ))}
            </View>
          )}

          {premium.topPerformingPromotions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Top Performing Promotions</Text>
              {premium.topPerformingPromotions.map((promo) => (
                <InfoRow
                  key={promo.code}
                  label={promo.code}
                  value={`${promo.usedCount}/${promo.usageLimit} used`}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, change }: { label: string; value: string; change?: number | null }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {change != null && (
        <Text style={[styles.statChange, { color: change >= 0 ? COLORS.success : COLORS.danger }]}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MiniBarChart({ points, color }: { points: MonthlyPoint[]; color: string }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <View style={styles.chartRow}>
      {points.map((p, i) => (
        <View key={i} style={styles.chartBarWrap}>
          <View style={[styles.chartBar, { height: Math.max((p.value / max) * 80, 3), backgroundColor: color }]} />
          <Text style={styles.chartLabel}>{MONTH_LABELS[p.month - 1]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: 24 },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  upsellEmoji: { fontSize: 40, marginBottom: 10 },
  upsellTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  upsellSubtitle: { fontSize: 13.5, color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  upsellButton: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 11 },
  upsellButtonText: { color: '#fff', fontWeight: '700' },

  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 16 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { width: '30%', minWidth: 90 },
  statValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statChange: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: COLORS.muted, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'right', flex: 1 },

  insightRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  insightBullet: { fontSize: 14, marginRight: 8 },
  insightText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 100, justifyContent: 'space-between' },
  chartBarWrap: { alignItems: 'center', flex: 1 },
  chartBar: { width: 14, borderRadius: 4 },
  chartLabel: { fontSize: 10, color: COLORS.muted, marginTop: 4 },
});