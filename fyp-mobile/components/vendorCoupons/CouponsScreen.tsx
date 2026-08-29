// fyp-mobile/components/vendorCoupons/CouponsScreen.tsx

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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Ticket, Percent, Plus } from 'lucide-react-native';

import { getVendorCoupons } from '../../services/getVendorCoupons';
import { deleteVendorCoupon } from '../../services/deleteVendorCoupon';
import { getVendorDiscountCodes } from '../../services/getVendorDiscountCodes';
import { deleteVendorDiscountCode } from '../../services/deleteVendorDiscountCode';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import { DiscountKind, DiscountStatus, VendorDiscount } from '../../types/discount.types';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already (e.g. src/theme/colors.ts).
// Brand color (used only for header + primary buttons, as requested):
const tintColorLight = '#7D0C72';
const tintColorDark = '#7D0C72';

const COLORS = {
  primary: tintColorLight,
  primaryDark: '#57084F',
  primaryLight: '#F8E9F6',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#ECE7EA',
  background: '#FAF7F9',
  card: '#FFFFFF',
  success: '#059669',
  warning: '#B45309',
  danger: '#DC2626',
};

const STATUS_COLOR: Record<DiscountStatus, string> = {
  [DiscountStatus.ACTIVE]: COLORS.success,
  [DiscountStatus.EXPIRED]: COLORS.muted,
  [DiscountStatus.CANCELLED]: COLORS.danger,
  [DiscountStatus.EXHAUSTED]: COLORS.warning,
};

type EntryTab = 'coupon' | 'discountCode';

const TAB_CONFIG: Record<EntryTab, { label: string; Icon: typeof Ticket; emptyText: string }> = {
  coupon: { label: 'Coupons', Icon: Ticket, emptyText: 'No coupons yet. Create one to attract more bookings.' },
  discountCode: { label: 'Discount Codes', Icon: Percent, emptyText: 'No discount codes yet. Create one to run a promotion.' },
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
const insets = useSafeAreaInsets();

  const { vendorId, initialTab, refresh } = useLocalSearchParams<{
    vendorId?: string;
    initialTab?: string;
    refresh?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const initialTabValue = Array.isArray(initialTab) ? initialTab[0] : initialTab;

  const [activeTab, setActiveTab] = useState<EntryTab>(initialTabValue === 'discountCode' ? 'discountCode' : 'coupon');

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

  const activeCount = useMemo(() => entries.filter((e) => e.status === DiscountStatus.ACTIVE).length, [entries]);
  const atLimit = activeCount >= limit;

  const handleCancel = (entry: VendorDiscount) => {
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

    if (activeTab === 'coupon') {
      router.push({
        pathname: '/createcouponscreen',
        params: { vendorId: vendorIdValue },
      });
    } else {
      router.push({
        pathname: '/creatediscountcodescreen',
        params: { vendorId: vendorIdValue },
      });
    }
  };
const Header = () => (
  <View style={styles.headerContainer}>
    {/* Purple Header */}
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 40,
        },
      ]}
    >
      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft
            size={22}
            color="#FFFFFF"
            strokeWidth={2.5}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {TAB_CONFIG[activeTab].label}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Manage your promotional codes
          </Text>
        </View>

        {/* Keeps title perfectly centered */}
        <View style={styles.headerIconBtnPlaceholder} />
      </View>
    </View>

    {/* Separate tabs with spacing below purple header */}
    <View style={styles.tabRow}>
      {(Object.keys(TAB_CONFIG) as EntryTab[]).map((tab) => {
        const selected = activeTab === tab;
        const TabIcon = TAB_CONFIG[tab].Icon;

        return (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selected && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <TabIcon
              size={15}
              color={selected ? COLORS.primary : COLORS.muted}
              strokeWidth={2.25}
            />

            <Text
              style={[
                styles.tabText,
                selected && styles.tabTextActive,
              ]}
            >
              {TAB_CONFIG[tab].label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />

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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryCount}>{activeCount}</Text>
              <Text style={styles.summaryTotal}> / {limit} active</Text>
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreatePress} activeOpacity={0.85}>
              <Plus size={15} color="#fff" strokeWidth={2.5} />
              <Text style={styles.createButtonText}>Create</Text>
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
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[entry.status] + '1A' }]}>
                    <Text style={[styles.statusPillText, { color: STATUS_COLOR[entry.status] }]}>{entry.status}</Text>
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
                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(entry)} disabled={cancellingId === entry._id}>
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
  root: { flex: 1, backgroundColor: COLORS.background },

  headerContainer: {
  backgroundColor: COLORS.background,
},

header: {
  backgroundColor: COLORS.primary,
  borderBottomLeftRadius: 26,
  borderBottomRightRadius: 26,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 6,
},

headerTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 18,
  paddingBottom: 22,
},

headerIconBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(255,255,255,0.15)',
  justifyContent: 'center',
  alignItems: 'center',
},

headerIconBtnPlaceholder: {
  width: 40,
  height: 40,
},

headerTitleWrap: {
  flex: 1,
  alignItems: 'center',
},

headerTitle: {
  fontSize: 19,
  fontWeight: '800',
  color: '#FFFFFF',
},

headerSubtitle: {
  fontSize: 12,
  color: 'rgba(255,255,255,0.75)',
  marginTop: 2,
  textAlign: 'center',
},

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: COLORS.primary },

  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryText: { fontSize: 13 },
  summaryCount: { fontWeight: '800', color: COLORS.text },
  summaryTotal: { color: COLORS.muted },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createButtonText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: '#3B0836',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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