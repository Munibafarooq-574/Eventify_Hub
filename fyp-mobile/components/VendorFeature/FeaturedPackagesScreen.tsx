//fyp-mobile/components/FeatureVendor/FeaturedPackagesScreen.tsx
// Lets a Growth/Premium vendor pick which of their own packages are
// "Featured" (no time duration — a toggle constrained by the plan's
// count limit: 1 for Growth, 3 for Premium). Reuses the same promotion
// infrastructure as Featured Vendor (Phase 3).
//
// TODO: same navigation/vendorId/theme notes as the earlier screens apply.
//
// TODO — UI-only redesign, no service/data changes:
//   - Uses lucide-react-native (+ react-native-svg) instead of emoji glyphs.
//   - Uses react-native-safe-area-context for the header (already a peer
//     dependency of expo-router, so it should already be installed).
//     npm install lucide-react-native react-native-svg

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ChevronLeft, Package, Star, AlertTriangle, X } from 'lucide-react-native';

import { getVendorPackagesList, VendorPackageListItem } from '../../services/getVendorPackagesList';
import { getMyFeaturedPackages } from '../../services/getMyFeaturedPackages';
import { activateFeaturedPackage } from '../../services/activateFeaturedPackage';
import { deactivateFeaturedPackage } from '../../services/deactivateFeaturedPackage';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import { PromotionStatus, VendorPromotion } from '../../types/promotion.types';

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
  warning: '#B45309',
  warningBg: '#FEF3E2',
  warningBorder: '#F6DDB0',
  featuredBg: '#FBF0D9',
  featuredText: '#92600C',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
};



function isPromotionLive(p: VendorPromotion): boolean {
  return p.status === PromotionStatus.ACTIVE;
}

export default function FeaturedPackagesScreen() {
  const router = useRouter();
const insets = useSafeAreaInsets();

  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const [packages, setPackages] = useState<VendorPackageListItem[]>([]);
  const [promotions, setPromotions] = useState<VendorPromotion[]>([]);
  const [limit, setLimit] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!vendorIdValue) {
      setError('Missing vendorId');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [pkgs, mine, subscription, plans] = await Promise.all([
        getVendorPackagesList(vendorIdValue),
        getMyFeaturedPackages(vendorIdValue),
        getVendorSubscription(vendorIdValue),
        getSubscriptionPlans(),
      ]);
      setPackages(pkgs);
      setPromotions(mine);
      const planDef = plans.find((p) => p.key === subscription.plan);
      setLimit(planDef?.limits.featuredPackageLimit ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load Featured Packages data');
    } finally {
      setLoading(false);
    }
  }, [vendorIdValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activePromotionByPackageId = useMemo(() => {
    const map = new Map<string, VendorPromotion>();
    promotions.filter(isPromotionLive).forEach((p) => {
      if (p.packageId) map.set(p.packageId, p);
    });
    return map;
  }, [promotions]);

  const activeCount = activePromotionByPackageId.size;
  const atLimit = activeCount >= limit;

  const handleFeature = async (pkg: VendorPackageListItem) => {
    try {
      setBusyPackageId(pkg._id);
      await activateFeaturedPackage(vendorIdValue, pkg._id);
      await loadData();
    } catch (e: any) {
      Alert.alert('Could not feature package', e?.message || 'Something went wrong');
    } finally {
      setBusyPackageId(null);
    }
  };

  const handleUnfeature = (pkg: VendorPackageListItem, promotion: VendorPromotion) => {
    Alert.alert('Unfeature Package', `Stop featuring "${pkg.packageName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfeature',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyPackageId(pkg._id);
            await deactivateFeaturedPackage(vendorIdValue, promotion._id);
            await loadData();
          } catch (e: any) {
            Alert.alert('Could not unfeature', e?.message || 'Something went wrong');
          } finally {
            setBusyPackageId(null);
          }
        },
      },
    ]);
  };
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
        Featured Packages
      </Text>

      <Text style={styles.headerSubtitle}>
        Priority placement for your best packages
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

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <View style={styles.introIconBadge}>
            <Package size={18} color={COLORS.primary} strokeWidth={2.25} />
          </View>
          <Text style={styles.subtitle}>
            Featured packages ({activeCount}/{limit}) get priority placement on the home screen and in search.
          </Text>
        </View>

        {atLimit && (
          <View style={styles.limitBanner}>
            <View style={styles.limitBannerRow}>
              <AlertTriangle size={15} color={COLORS.warning} strokeWidth={2.25} />
              <Text style={styles.limitBannerText}>Limit reached. Unfeature a package below, or upgrade for more slots.</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/subscriptionscreen',
                  params: { vendorId: vendorIdValue },
                })
              }
            >
              <Text style={styles.limitBannerLink}>View Plans →</Text>
            </TouchableOpacity>
          </View>
        )}

        {packages.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>You don't have any packages yet. Add a package first.</Text>
          </View>
        ) : (
          packages.map((pkg) => {
            const activePromotion = activePromotionByPackageId.get(pkg._id);
            const isFeatured = !!activePromotion;
            const isBusy = busyPackageId === pkg._id;

            return (
              <View key={pkg._id} style={[styles.card, isFeatured && styles.cardFeatured]}>
                <View style={styles.packageRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packageName}>{pkg.packageName}</Text>
                    <Text style={styles.packagePrice}>Rs. {pkg.price.toLocaleString()}</Text>
                    {isFeatured && (
                      <View style={styles.featuredTag}>
                        <Star size={11} color={COLORS.featuredText} strokeWidth={2.5} />
                        <Text style={styles.featuredTagText}>Featured</Text>
                      </View>
                    )}
                  </View>

                  {isFeatured ? (
                    <TouchableOpacity
                      style={styles.unfeatureButton}
                      onPress={() => handleUnfeature(pkg, activePromotion!)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color={COLORS.danger} />
                      ) : (
                        <>
                          <X size={12} color={COLORS.danger} strokeWidth={2.5} />
                          <Text style={styles.unfeatureButtonText}>Unfeature</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.featureButton, atLimit && styles.featureButtonDisabled]}
                      onPress={() => handleFeature(pkg)}
                      disabled={isBusy || atLimit}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.featureButtonText}>Feature</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
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
    marginBottom: 14,
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

  limitBanner: {
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  limitBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitBannerText: { flex: 1, fontSize: 12.5, color: COLORS.warning, lineHeight: 17 },
  limitBannerLink: { fontSize: 12.5, color: COLORS.primary, fontWeight: '700', marginTop: 8 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: '#3B0836',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardFeatured: { borderColor: '#EBCE84' },
  emptyText: { fontSize: 13.5, color: COLORS.muted, textAlign: 'center' },

  packageRow: { flexDirection: 'row', alignItems: 'center' },
  packageName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  packagePrice: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  featuredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.featuredBg,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 7,
  },
  featuredTagText: { fontSize: 11, fontWeight: '700', color: COLORS.featuredText },

  featureButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  featureButtonDisabled: { backgroundColor: '#D1D5DB' },
  featureButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  unfeatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
  },
  unfeatureButtonText: { color: COLORS.danger, fontSize: 12.5, fontWeight: '700' },
});