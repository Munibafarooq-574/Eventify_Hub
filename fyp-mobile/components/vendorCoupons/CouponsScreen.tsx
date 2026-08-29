// fyp-mobile/components/vendorCoupons/CouponsScreen.tsx
// Handles BOTH Coupons and Discount Codes via a tab switcher — per the
// product spec's own suggestion ("a separate screen isn't necessary,
// tabs inside one Coupons/Promotions screen is enough"). Same list UI,
// different backend endpoints/limits underneath depending on which tab
// is selected.
// TODO: same navigation/vendorId/theme notes as the earlier screens apply.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { getVendorCoupons } from '../../services/getVendorCoupons';
import { deleteVendorCoupon } from '../../services/deleteVendorCoupon';
import { getVendorDiscountCodes } from '../../services/getVendorDiscountCodes';
import { deleteVendorDiscountCode } from '../../services/deleteVendorDiscountCode';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import { DiscountKind, DiscountStatus, VendorDiscount } from '../../types/discount.types';
import { useRouter, useLocalSearchParams } from 'expo-router';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#F3E8FF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#FAFAFA',
  card: '#FFFFFF',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
};

const STATUS_COLOR: Record<DiscountStatus, string> = {
  [DiscountStatus.ACTIVE]: COLORS.success,
  [DiscountStatus.EXPIRED]: COLORS.muted,
  [DiscountStatus.CANCELLED]: COLORS.danger,
  [DiscountStatus.EXHAUSTED]: COLORS.warning,
};

type EntryTab = 'coupon' | 'discountCode';

const TAB_CONFIG: Record<EntryTab, { label: string; emptyText: string }> = {
  coupon: { label: 'Coupons', emptyText: "No coupons yet. Create one to attract more bookings." },
  discountCode: { label: 'Discount Codes', emptyText: 'No discount codes yet. Create one to run a promotion.' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function discountSummary(entry: VendorDiscount): string {
  return entry.discountType === DiscountKind.PERCENTAGE
    ? `${entry.discountValue}% OFF`
    : `Rs. ${entry.discountValue.toLocaleString()} OFF`;
}

export default function CouponsScreen() {
  const router = useRouter();

  const { vendorId, initialTab, refresh } = useLocalSearchParams<{
    vendorId?: string;
    initialTab?: string;
    refresh?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const initialTabValue = Array.isArray(initialTab)
    ? initialTab[0]
    : initialTab;

  const [activeTab, setActiveTab] = useState<EntryTab>(
    initialTabValue === 'discountCode' ? 'discountCode' : 'coupon'
  );

  const [entries, setEntries] = useState<VendorDiscount[]>([]);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!vendorIdValue) {
      setError('Missing vendorId');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const [mine, subscription, plans] = await Promise.all([
        activeTab === 'coupon' ? getVendorCoupons(vendorIdValue) : getVendorDiscountCodes(vendorIdValue),
        getVendorSubscription(vendorIdValue),
        getSubscriptionPlans(),
      ]);
      setEntries(mine);
      const planDef = plans.find((p) => p.key === subscription.plan);
      setLimit((activeTab === 'coupon' ? planDef?.limits.couponLimit : planDef?.limits.discountCodeLimit) ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [vendorIdValue, activeTab]);

  useEffect(() => {
  loadData();
}, [loadData, refresh]);

  const activeCount = useMemo(
    () => entries.filter((e) => e.status === DiscountStatus.ACTIVE).length,
    [entries],
  );
  const atLimit = activeCount >= limit;

  const handleCancel = (entry: VendorDiscount) => {
    const noun = activeTab === 'coupon' ? 'coupon' : 'discount code';
    Alert.alert(`Cancel ${TAB_CONFIG[activeTab].label.slice(0, -1)}`, `Deactivate "${entry.code}"? Customers won't be able to use it anymore.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancellingId(entry._id);
            if (activeTab === 'coupon') {
              await deleteVendorCoupon(vendorIdValue, entry._id);
            } else {
              await deleteVendorDiscountCode(vendorIdValue, entry._id);
            }
            await loadData();
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.message || 'Something went wrong');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

 const handleCreatePress = () => {
  if (atLimit) {
    Alert.alert(
      'Limit reached',
      `You can have up to ${limit} active ${TAB_CONFIG[activeTab].label.toLowerCase()} on your plan. Cancel one or upgrade for more.`,
      [
        { text: 'OK', style: 'cancel' },
        {
          text: 'View Plans',
          onPress: () =>
            router.push({
              pathname: '/subscriptionscreen',
              params: { vendorId: vendorIdValue },
            }),
        },
      ],
    );
    return;
  }

  router.push({
    pathname: '/createcouponscreen',
    params: {
      vendorId: vendorIdValue,
      entryType: activeTab,
    },
  });
};

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {(Object.keys(TAB_CONFIG) as EntryTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'coupon' ? '🎟 Coupons' : '💸 Discount Codes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.subtitle}>{activeCount}/{limit} active</Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreatePress}>
              <Text style={styles.createButtonText}>+ Create</Text>
            </TouchableOpacity>
          </View>

          {entries.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>{TAB_CONFIG[activeTab].emptyText}</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry._id} style={styles.card}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryCode}>{entry.code}</Text>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[entry.status] + '22' }]}>
                    <Text style={[styles.statusPillText, { color: STATUS_COLOR[entry.status] }]}>
                      {entry.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.entryDiscount}>{discountSummary(entry)}</Text>
                <Text style={styles.entryMeta}>
                  Min order: Rs. {entry.minimumOrderAmount.toLocaleString()}
                  {entry.maximumDiscountAmount != null && ` · Max discount: Rs. ${entry.maximumDiscountAmount.toLocaleString()}`}
                </Text>
                <Text style={styles.entryMeta}>
                  {formatDate(entry.startDate)} – {formatDate(entry.endDate)}
                </Text>
                <Text style={styles.entryMeta}>
                  Used {entry.usedCount}/{entry.usageLimit}
                </Text>

                {entry.status === DiscountStatus.ACTIVE && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancel(entry)}
                    disabled={cancellingId === entry._id}
                  >
                    {cancellingId === entry._id ? (
                      <ActivityIndicator size="small" color={COLORS.danger} />
                    ) : (
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  tabRow: { flexDirection: 'row', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13.5, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: COLORS.primary },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  subtitle: { fontSize: 12.5, color: COLORS.muted },
  createButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  createButtonText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  emptyText: { fontSize: 13.5, color: COLORS.muted, textAlign: 'center' },

  entryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryCode: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  entryDiscount: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  entryMeta: { fontSize: 12.5, color: COLORS.muted, marginTop: 4 },

  cancelButton: { marginTop: 12, alignSelf: 'flex-start' },
  cancelButtonText: { color: COLORS.danger, fontSize: 12.5, fontWeight: '700' },
});