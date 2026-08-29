//fyp-mobile/components/FeatureVendor/FeatureVendorScreen.tsx
//
// Lets a Growth/Premium vendor activate a "Featured Vendor" campaign
// (7/15/30 days), see active campaigns, and deactivate one early.
// Limit enforcement is backend-driven (FeatureAccessService) — this
// screen just reflects what the API allows/rejects.
//
// TODO: same navigation/vendorId/theme notes as the Phase 2 screens apply.
//
// TODO — UI-only redesign, no service/data changes:
//   - Uses lucide-react-native (+ react-native-svg) instead of emoji glyphs.
//   - Uses react-native-safe-area-context for the header (already a peer
//     dependency of expo-router, so it should already be installed).
//     npm install lucide-react-native react-native-svg

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeft, Star, AlertTriangle, X, Clock3, CheckCircle2, XCircle } from 'lucide-react-native';

import { getMyFeaturedVendorPromotions } from '../../services/getMyFeaturedVendorPromotions';
import { activateFeaturedVendor } from '../../services/activateFeaturedVendor';
import { deactivateFeaturedVendor } from '../../services/deactivateFeaturedVendor';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import { FEATURED_VENDOR_DURATION_OPTIONS, PromotionStatus, VendorPromotion } from '../../types/promotion.types';
import { GrowthApiError } from '../../services/growthApiClient';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already (e.g. src/theme/colors.ts).
// Brand color (used only for header + primary buttons, as requested):
const tintColorLight = '#7D0C72';
const tintColorDark = '#7D0C72';

const COLORS = {
  primary: tintColorLight,
  primaryDark: '#57084F',
  primaryLight: '#F8E9F6',
  primarySoft: '#F1D3EC',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#ECE7EA',
  background: '#FAF7F9',
  card: '#FFFFFF',
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#B45309',
  warningBg: '#FEF3E2',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
};

const HEADER_SIDE_WIDTH = 36;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isPromotionLive(p: VendorPromotion): boolean {
  return p.status === PromotionStatus.ACTIVE && new Date(p.endDate).getTime() > Date.now();
}

export default function FeatureVendorScreen() {
const router = useRouter();
const insets = useSafeAreaInsets();

const { vendorId } = useLocalSearchParams<{
  vendorId?: string;
}>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const [promotions, setPromotions] = useState<VendorPromotion[]>([]);
  const [limit, setLimit] = useState<number>(0);
  const [selectedDays, setSelectedDays] = useState<number>(FEATURED_VENDOR_DURATION_OPTIONS[0].days);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!vendorIdValue) {
      setError('Missing vendorId');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [mine, subscription, plans] = await Promise.all([
        getMyFeaturedVendorPromotions(vendorIdValue),
        getVendorSubscription(vendorIdValue),
        getSubscriptionPlans(),
      ]);
      setPromotions(mine);
      const planDef = plans.find((p) => p.key === subscription.plan);
      setLimit(planDef?.limits.featuredVendorLimit ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load Featured Vendor data');
    } finally {
      setLoading(false);
    }
  }, [vendorIdValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCount = promotions.filter(isPromotionLive).length;
  const atLimit = activeCount >= limit;

  const handleActivate = async () => {
    try {
      setActivating(true);
      await activateFeaturedVendor(vendorIdValue, selectedDays);
      await loadData();
      Alert.alert('Featured Vendor Activated', `Your business will be featured for ${selectedDays} days.`);
    } catch (e: any) {
      const message = e instanceof GrowthApiError ? e.message : 'Something went wrong';
      Alert.alert('Could not activate', message);
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = (promotion: VendorPromotion) => {
    Alert.alert('Deactivate Campaign', 'This will stop your Featured Vendor placement immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeactivatingId(promotion._id);
            await deactivateFeaturedVendor(vendorIdValue, promotion._id);
            await loadData();
          } catch (e: any) {
            Alert.alert('Could not deactivate', e?.message || 'Something went wrong');
          } finally {
            setDeactivatingId(null);
          }
        },
      },
    ]);
  };

  // Standard screen header: back button (left) — title + subtitle (center) —
  // empty placeholder (right) so the title stays visually centered even
  // though there's no right-side action here. Sits inside a top-only
  // SafeAreaView so it clears the status bar on every device.
 const Header = () => (
  <View
    style={[
      styles.header,
      {
        paddingTop: insets.top + 40,
      },
    ]}
  >
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
      <Text style={styles.headerTitle}>
        Feature Your Business
      </Text>

      <Text style={styles.headerSubtitle}>
        Priority placement in vendor discovery
      </Text>
    </View>

    {/* Empty space keeps the title perfectly centered */}
    <View style={styles.headerIconBtnPlaceholder} />
  </View>
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

  const activePromotions = promotions.filter(isPromotionLive);
  const pastPromotions = promotions.filter((p) => !isPromotionLive(p));

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <View style={styles.introIconBadge}>
            <Star size={18} color={COLORS.primary} strokeWidth={2.25} />
          </View>
          <Text style={styles.subtitle}>
            Featured status boosts your visibility in search — it doesn't override relevance, location, and
            rating.
          </Text>
        </View>

        {/* Active campaigns */}
        {activePromotions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Active Campaigns ({activeCount}/{limit})
            </Text>
            {activePromotions.map((p) => (
              <View key={p._id} style={styles.activeRow}>
                <View style={styles.activeRowLeft}>
                  <View style={styles.liveDot} />
                  <View>
                    <Text style={styles.activeRowTitle}>{p.durationDays}-day campaign</Text>
                    <Text style={styles.activeRowMeta}>Featured until {formatDate(p.endDate)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deactivateButton}
                  onPress={() => handleDeactivate(p)}
                  disabled={deactivatingId === p._id}
                >
                  {deactivatingId === p._id ? (
                    <ActivityIndicator size="small" color={COLORS.danger} />
                  ) : (
                    <>
                      <X size={12} color={COLORS.danger} strokeWidth={2.5} />
                      <Text style={styles.deactivateButtonText}>Deactivate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Activate new campaign */}
        <View style={styles.card}>
          {atLimit ? (
            <View>
              <View style={styles.limitHeaderRow}>
                <View style={styles.limitIconBadge}>
                  <AlertTriangle size={16} color={COLORS.warning} strokeWidth={2.25} />
                </View>
                <Text style={styles.limitTitle}>
                  Limit reached ({activeCount}/{limit})
                </Text>
              </View>
              <Text style={styles.limitSubtitle}>
                Deactivate an existing campaign, or upgrade to Premium for more Featured Vendor slots.
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() =>
                  router.push({
                    pathname: '/subscriptionscreen',
                    params: { vendorId: vendorIdValue },
                  })
                }
              >
                <Text style={styles.upgradeButtonText}>View Plans</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionLabel}>Choose Duration</Text>
              <View style={styles.durationRow}>
                {FEATURED_VENDOR_DURATION_OPTIONS.map((opt) => {
                  const selected = selectedDays === opt.days;
                  return (
                    <TouchableOpacity
                      key={opt.days}
                      style={[styles.durationChip, selected && styles.durationChipSelected]}
                      onPress={() => setSelectedDays(opt.days)}
                      activeOpacity={0.8}
                    >
                      <Clock3 size={13} color={selected ? '#fff' : COLORS.muted} strokeWidth={2.25} />
                      <Text style={[styles.durationChipText, selected && styles.durationChipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.activateButton} onPress={handleActivate} disabled={activating} activeOpacity={0.85}>
                {activating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.activateButtonText}>Activate Featured Vendor</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* History */}
        {pastPromotions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>History</Text>
            {pastPromotions.map((p) => {
              const cancelled = p.status === PromotionStatus.CANCELLED;
              return (
                <View key={p._id} style={styles.historyRow}>
                  <Text style={styles.historyText}>{p.durationDays}-day campaign</Text>
                  <View style={[styles.historyStatusPill, { backgroundColor: cancelled ? COLORS.dangerBg : COLORS.successBg }]}>
                    {cancelled ? (
                      <XCircle size={11} color={COLORS.danger} strokeWidth={2.5} />
                    ) : (
                      <CheckCircle2 size={11} color={COLORS.success} strokeWidth={2.5} />
                    )}
                    <Text style={[styles.historyStatusText, { color: cancelled ? COLORS.danger : COLORS.success }]}>
                      {p.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: COLORS.primary,
  paddingHorizontal: 18,
  paddingBottom: 22,
  borderBottomLeftRadius: 26,
  borderBottomRightRadius: 26,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 6,
  marginBottom: 18,
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

  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  introIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { flex: 1, fontSize: 12.5, color: COLORS.primaryDark, lineHeight: 17.5 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: '#3B0836',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  activeRowTitle: { fontSize: 14.5, fontWeight: '600', color: COLORS.text },
  activeRowMeta: { fontSize: 12.5, color: COLORS.success, marginTop: 2 },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
  },
  deactivateButtonText: { color: COLORS.danger, fontSize: 12.5, fontWeight: '700' },

  limitHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitTitle: { fontSize: 15, fontWeight: '700', color: COLORS.warning },
  limitSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 8, lineHeight: 18 },
  upgradeButton: { marginTop: 14, backgroundColor: COLORS.primaryLight, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  upgradeButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  durationRow: { flexDirection: 'row', gap: 8 },
  durationChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
  },
  durationChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durationChipText: { fontSize: 13.5, fontWeight: '600', color: COLORS.text },
  durationChipTextSelected: { color: '#fff' },

  activateButton: { marginTop: 14, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  activateButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
  historyText: { fontSize: 13.5, color: COLORS.text },
  historyStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  historyStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});