// fyp-mobile/components/vendorGrowth/GrowthAnalyticsScreen.tsx
//
// Growth vendors see sales/customers/packages/promotions. Premium vendors
// additionally see 6-month trends, top-performing packages/promotions,
// and Business Insights. Every number here comes from real data — where
// view-tracking hasn't been wired in yet (see trackVendorView.ts), the
// screen says "Not tracked yet" instead of showing a misleading 0.
//
// TODO: same navigation/vendorId/theme notes as the earlier screens apply.
//
// TODO — UI-only redesign, no service/data changes:
//   - Emoji (📊 / 💡) replaced with lucide-react-native icons.
//   - Adds the standard back-button + centered title/subtitle header on a
//     top-only SafeAreaView (react-native-safe-area-context, already a
//     peer dependency of expo-router).
//     npm install lucide-react-native react-native-svg

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  BarChart3,
  Lightbulb,
  Wallet,
  TrendingUp,
  Receipt,
  UserPlus,
  Repeat,
  Percent,
  Package,
  Star,
  Eye,
  Ticket,
  Tag,
} from 'lucide-react-native';

import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getGrowthAnalytics } from '../../services/getGrowthAnalytics';
import { getPremiumAnalytics } from '../../services/getPremiumAnalytics';
import { getBusinessInsights } from '../../services/getBusinessInsights';
import { SubscriptionPlan } from '../../types/subscription.types';
import {
  BusinessInsight,
  GrowthAnalytics,
  MonthlyPoint,
  PremiumAnalytics,
  TrackedMetric,
} from '../../types/analytics.types';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already (e.g. src/theme/colors.ts).
// Brand color (used only for header + primary buttons/accents, as requested):
const tintColorLight = '#7D0C72';
const tintColorDark = '#7D0C72';

const COLORS = {
  primary: tintColorLight,
  primaryDark: '#57084F',
  primaryLight: '#F8E9F6',
  text: '#1F2937',
  muted: '#6B7280',
  faint: '#9CA3AF',
  border: '#ECE7EA',
  background: '#FAF7F9',
  card: '#FFFFFF',
  success: '#059669',
  successBg: '#ECFDF5',
  danger: '#DC2626',
};

const HEADER_SIDE_WIDTH = 36;
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

  // Standard screen header: back button (left) — title + subtitle (center)
  // — empty placeholder (right) so the title stays visually centered. Sits
  // inside a top-only SafeAreaView so it clears the status bar everywhere.
  const Header = () => (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Analytics
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Track your growth performance
          </Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>
    </SafeAreaView>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (plan === SubscriptionPlan.FREE) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.centered}>
          <View style={styles.upsellIconBadge}>
            <BarChart3 size={30} color={COLORS.primary} strokeWidth={2} />
          </View>
          <Text style={styles.upsellTitle}>Growth Analytics</Text>
          <Text style={styles.upsellSubtitle}>Upgrade to Growth or Premium to see revenue, customer, and package analytics.</Text>
          <TouchableOpacity
            style={styles.upsellButton}
            onPress={() =>
              router.push({
                pathname: '/subscriptionscreen',
                params: { vendorId: vendorIdValue },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.upsellButtonText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const data: GrowthAnalytics | null = premium ?? growth;
  if (!data) return null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Business Insights — Premium only */}
        {insights.length > 0 && (
          <View style={[styles.card, styles.insightsCard]}>
            <View style={styles.sectionLabelRow}>
              <Lightbulb size={14} color={COLORS.primaryDark} strokeWidth={2.25} />
              <Text style={[styles.sectionLabel, { color: COLORS.primaryDark, marginBottom: 0 }]}>Business Insights</Text>
            </View>
            {insights.map((insight) => (
              <View key={insight.id} style={styles.insightRow}>
                <View style={styles.insightDot} />
                <Text style={styles.insightText}>{insight.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sales */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Sales</Text>
          <View style={styles.statsGrid}>
            <Stat icon={Wallet} label="Total Revenue" value={`Rs. ${fmt(data.sales.totalRevenue)}`} />
            <Stat icon={TrendingUp} label="This Month" value={`Rs. ${fmt(data.sales.monthlyRevenue)}`} change={data.sales.monthlyRevenueChangePct} />
            <Stat icon={Receipt} label="Avg Order Value" value={data.sales.averageOrderValue != null ? `Rs. ${fmt(data.sales.averageOrderValue)}` : '—'} />
          </View>
        </View>

        {/* Customers */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Customers</Text>
          <View style={styles.statsGrid}>
            <Stat icon={UserPlus} label="New Customers" value={`${data.customers.newCustomers}`} />
            <Stat icon={Repeat} label="Repeat Customers" value={`${data.customers.repeatCustomers}`} />
            <Stat icon={Percent} label="Booking Conversion" value={data.customers.bookingConversionRate != null ? `${data.customers.bookingConversionRate}%` : '—'} />
          </View>
        </View>

        {/* Packages */}
        <View style={styles.card}>
          <View style={styles.sectionLabelRow}>
            <Package size={13} color={COLORS.muted} strokeWidth={2.25} />
            <Text style={styles.sectionLabel}>Packages</Text>
          </View>
          <InfoRow label="Most Booked" value={data.packages.mostBookedPackage?.name ?? '—'} />
          <InfoRow label="Highest Revenue" value={data.packages.highestRevenuePackage?.name ?? '—'} />
          <InfoRow
            label="Most Viewed"
            value={data.packages.mostViewedPackage?.packageName ?? metricText(data.packages.mostViewedPackage ?? { tracked: false, value: 0 })}
          />
        </View>

        {/* Promotions */}
        <View style={styles.card}>
          <View style={styles.sectionLabelRow}>
            <Tag size={13} color={COLORS.muted} strokeWidth={2.25} />
            <Text style={styles.sectionLabel}>Promotions</Text>
          </View>
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
                <View style={styles.sectionLabelRow}>
                  <Star size={13} color={COLORS.muted} strokeWidth={2.25} />
                  <Text style={styles.sectionLabel}>Top Performing Packages</Text>
                </View>
                {premium.topPerformingPackages.map((pkg) => (
                  <InfoRow key={pkg.packageId} label={pkg.packageName} value={`Rs. ${fmt(pkg.revenue)} · ${pkg.bookingCount} bookings`} />
                ))}
              </View>
            )}

            {premium.topPerformingPromotions.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionLabelRow}>
                  <Ticket size={13} color={COLORS.muted} strokeWidth={2.25} />
                  <Text style={styles.sectionLabel}>Top Performing Promotions</Text>
                </View>
                {premium.topPerformingPromotions.map((promo) => (
                  <InfoRow key={promo.code} label={promo.code} value={`${promo.usedCount}/${promo.usageLimit} used`} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  change?: number | null;
}) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statIconWrap}>
        <Icon size={14} color={COLORS.primary} strokeWidth={2.25} />
      </View>
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
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <View key={i} style={styles.chartBarWrap}>
            <View
              style={[
                styles.chartBar,
                {
                  height: Math.max((p.value / max) * 80, 3),
                  backgroundColor: isLast ? color : color + '55',
                },
              ]}
            />
            <Text style={[styles.chartLabel, isLast && { color, fontWeight: '700' }]}>{MONTH_LABELS[p.month - 1]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  safeArea: { backgroundColor: COLORS.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  backButton: {
    width: HEADER_SIDE_WIDTH,
    height: HEADER_SIDE_WIDTH,
    borderRadius: HEADER_SIDE_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16.5, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  headerRightPlaceholder: { width: HEADER_SIDE_WIDTH, height: HEADER_SIDE_WIDTH },

  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: 24 },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  upsellIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  upsellTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  upsellSubtitle: { fontSize: 13.5, color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  upsellButton: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  upsellButtonText: { color: '#fff', fontWeight: '700' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    shadowColor: '#3B0836',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  insightsCard: { backgroundColor: COLORS.primaryLight, borderColor: '#EBD3E7' },

  sectionLabel: { fontSize: 11.5, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  statBox: { width: '28%', minWidth: 90 },
  statIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statChange: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  infoLabel: { fontSize: 13, color: COLORS.muted, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'right', flex: 1 },

  insightRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  insightDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 6, marginRight: 9 },
  insightText: { flex: 1, fontSize: 13, color: COLORS.primaryDark, lineHeight: 18 },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 100, justifyContent: 'space-between' },
  chartBarWrap: { alignItems: 'center', flex: 1 },
  chartBar: { width: 14, borderRadius: 5 },
  chartLabel: { fontSize: 10, color: COLORS.faint, marginTop: 6 },
});