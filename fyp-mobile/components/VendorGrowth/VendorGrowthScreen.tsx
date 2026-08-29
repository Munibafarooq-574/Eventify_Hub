//fyp-mobile/components/VendorGrowth/VendorGrowthScreen.tsx
//
// Main "Vendor Growth" dashboard — current plan summary, entry points into
// each growth feature (locked/unlocked based on the vendor's plan), and a
// small real-data analytics preview (reuses the existing analytics
// endpoint — no fake numbers).
//
// TODO: `navigation` / `route` are typed loosely here. Replace `any` with
// your app's actual navigation types (e.g. from @react-navigation/native-stack)
// once you wire this into your navigator.
//
// TODO: `vendorId` is read from `route.params.vendorId`. If EventifyHub
// already has an auth context / hook that exposes the logged-in vendor's
// id, use that instead and drop the route param.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getVendorAnalyticsSummary, VendorAnalyticsSummary } from '../../services/getVendorAnalyticsSummary';
import { SubscriptionPlan, VendorSubscription } from '../../types/subscription.types';
import { useRouter, useLocalSearchParams } from 'expo-router';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already (e.g. src/theme/colors.ts).
const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#F3E8FF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#FAFAFA',
  card: '#FFFFFF',
  success: '#059669',
  locked: '#9CA3AF',
};

interface GrowthMenuItem {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  requiresPaidPlan: boolean;
}

const GROWTH_MENU_ITEMS: GrowthMenuItem[] = [
  { key: 'featureVendor', icon: '⭐', title: 'Feature Your Business', subtitle: 'Get top placement in search', requiresPaidPlan: true },
  { key: 'featuredPackages', icon: '📦', title: 'Featured Packages', subtitle: 'Highlight your best packages', requiresPaidPlan: true },
  { key: 'badges', icon: '🏆', title: 'Promotional Badges', subtitle: 'Top Rated, Fast Response & more', requiresPaidPlan: false },
  { key: 'coupons', icon: '🎟', title: 'Coupons', subtitle: 'Create discount coupons', requiresPaidPlan: true },
  { key: 'discountCodes', icon: '💸', title: 'Discount Codes', subtitle: 'Run promotional campaigns', requiresPaidPlan: true },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function planDisplayName(plan: SubscriptionPlan): string {
  if (plan === SubscriptionPlan.GROWTH) return 'Growth';
  if (plan === SubscriptionPlan.PREMIUM) return 'Premium';
  return 'Free';
}

export default function VendorGrowthScreen() {
  const router = useRouter();

  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const [subscription, setSubscription] = useState<VendorSubscription | null>(null);
  const [analytics, setAnalytics] = useState<VendorAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
  if (!vendorIdValue) {
    setError('Missing vendorId');
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const [sub, analyticsSummary] = await Promise.all([
      getVendorSubscription(vendorIdValue),
      getVendorAnalyticsSummary(vendorIdValue).catch((analyticsError) => {
        console.warn('[Vendor Growth] Analytics failed:', analyticsError);
        return null;
      }),
    ]);

    setSubscription(sub);
    setAnalytics(analyticsSummary);
  } catch (e: any) {
    console.error('[Vendor Growth] Subscription failed:', e);

    setError(
      e?.message || 'Failed to load Vendor Growth data',
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [vendorIdValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const isPaidPlan = subscription ? subscription.plan !== SubscriptionPlan.FREE : false;

  const handleMenuItemPress = (item: GrowthMenuItem) => {
    if (item.requiresPaidPlan && !isPaidPlan) {
      router.push({
  pathname: '/subscriptionscreen',
  params: { vendorId: vendorIdValue },
});
      return;
    }
    if (item.key === 'featureVendor') {
      router.push({
  pathname: '/featurevendorscreen',
  params: { vendorId: vendorIdValue },
});
      return;
    }
    if (item.key === 'featuredPackages') {
  router.push({
  pathname: '/featuredpackagesscreen',
  params: { vendorId: vendorIdValue },
  });
  return;
}
if (item.key === 'badges') {
  router.push({
    pathname: '/vendorbadgesscreen',
    params: { vendorId },
  });
  return;
}
if (item.key === 'coupons') {
  router.push({
    pathname: '/couponsscreen',
    params: {
      vendorId: vendorIdValue,
      initialTab: 'coupon',
    },
  });
  return;
}

if (item.key === 'discountCodes') {
  router.push({
    pathname: '/couponsscreen',
    params: {
      vendorId: vendorIdValue,
      initialTab: 'discountCode',
    },
  });
  return;
}
  };

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <Text style={styles.screenTitle}>Vendor Growth</Text>

      
      {/* Current Plan */}
<View style={styles.card}>
  <Text style={styles.sectionLabel}>Current Plan</Text>

  <View style={styles.planRow}>
    <View>
      {subscription ? (
        <>
          <Text style={styles.planName}>
            {planDisplayName(subscription.plan)}
          </Text>

          {subscription.plan !== SubscriptionPlan.FREE &&
          subscription.endDate ? (
            <Text style={styles.planMeta}>
              Active until {formatDate(subscription.endDate)}
            </Text>
          ) : (
            <Text style={styles.planMeta}>
              Upgrade to grow your business
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.planName}>No Active Plan</Text>

          <Text style={styles.planMeta}>
            Choose a subscription plan to unlock growth features.
          </Text>
        </>
      )}
    </View>

    {subscription?.plan === SubscriptionPlan.PREMIUM && (
      <Text style={styles.badgeEmoji}>💎</Text>
    )}
  </View>

  <TouchableOpacity
    style={styles.manageButton}
    onPress={() =>
      router.push({
        pathname: '/subscriptionscreen',
        params: { vendorId: vendorIdValue },
      })
    }
  >
    <Text style={styles.manageButtonText}>
      Manage Subscription
    </Text>
  </TouchableOpacity>
</View>

      {/* Grow Your Business */}
      <Text style={styles.sectionTitle}>Grow Your Business</Text>
      <View style={styles.card}>
        {GROWTH_MENU_ITEMS.map((item, index) => {
          const locked = item.requiresPaidPlan && !isPaidPlan;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, index < GROWTH_MENU_ITEMS.length - 1 && styles.menuItemBorder]}
              onPress={() => handleMenuItemPress(item)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              {locked && <Text style={styles.lockIcon}>🔒</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

             {/* Analytics preview (real data, existing endpoint) */}
      <Text style={styles.sectionTitle}>Analytics</Text>

      <View style={styles.card}>
        {analytics ? (
          <View style={styles.statsGrid}>
            <StatBox
              label="Total Revenue"
              value={`Rs. ${analytics.totalRevenue.toLocaleString()}`}
            />

            <StatBox
              label="This Month"
              value={`Rs. ${analytics.monthlyRevenue.toLocaleString()}`}
              change={analytics.monthlyRevenueChangePct}
            />

            <StatBox
              label="Rating"
              value={
                analytics.averageRating != null
                  ? `${analytics.averageRating} ★`
                  : 'No reviews yet'
              }
            />

            <StatBox
              label="Repeat Customers"
              value={`${analytics.repeatCustomers}`}
            />
          </View>
        ) : (
          <Text style={styles.menuSubtitle}>
            Analytics will appear once you have order history.
          </Text>
        )}

        <TouchableOpacity
          style={styles.analyticsButton}
          onPress={() =>
            router.push({
              pathname: '/GrowthAnalytics',
              params: { vendorId: vendorIdValue },
            })
          }
        >
          <Text style={styles.analyticsButtonText}>
            View Full Analytics →
          </Text>
        </TouchableOpacity>
      </View>
      
    </ScrollView>
  );
}

function StatBox({ label, value, change }: { label: string; value: string; change?: number | null }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {change != null && (
        <Text style={[styles.statChange, { color: change >= 0 ? COLORS.success : '#DC2626' }]}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  screenTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  planMeta: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  badgeEmoji: { fontSize: 28 },

  manageButton: {
    marginTop: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  manageButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
    analyticsButton: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },

  analyticsButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { fontSize: 22, width: 36 },
  menuTextWrap: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  menuSubtitle: { fontSize: 12.5, color: COLORS.muted, marginTop: 1 },
  lockIcon: { fontSize: 14, color: COLORS.locked },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { width: '47%', backgroundColor: COLORS.background, borderRadius: 10, padding: 12 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  statChange: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});