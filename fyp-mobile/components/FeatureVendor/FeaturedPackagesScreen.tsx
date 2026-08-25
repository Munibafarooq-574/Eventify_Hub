//fyp-mobile/components/FeatureVendor/FeaturedPackagesScreen.tsx
// Lets a Growth/Premium vendor pick which of their own packages are
// "Featured" (no time duration — a toggle constrained by the plan's
// count limit: 1 for Growth, 3 for Premium). Reuses the same promotion
// infrastructure as Featured Vendor (Phase 3).
//
// TODO: same navigation/vendorId/theme notes as the earlier screens apply.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { getVendorPackagesList, VendorPackageListItem } from '../../services/getVendorPackagesList';
import { getMyFeaturedPackages } from '../../services/getMyFeaturedPackages';
import { activateFeaturedPackage } from '../../services/activateFeaturedPackage';
import { deactivateFeaturedPackage } from '../../services/deactivateFeaturedPackage';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import { PromotionStatus, VendorPromotion } from '../../types/promotion.types';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#F3E8FF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#FAFAFA',
  card: '#FFFFFF',
  warning: '#D97706',
  featuredBg: '#FEF3C7',
  featuredText: '#92400E',
};

function isPromotionLive(p: VendorPromotion): boolean {
  return p.status === PromotionStatus.ACTIVE;
}

export default function FeaturedPackagesScreen() {
  const router = useRouter();

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
        getVendorSubscription(vendorIdValue ),
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>📦 Featured Packages</Text>
      <Text style={styles.subtitle}>
        Featured packages ({activeCount}/{limit}) get priority placement on the home screen and in search.
      </Text>

      {atLimit && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>
            Limit reached. Unfeature a package below, or upgrade for more slots.
          </Text>
          <TouchableOpacity
  onPress={() =>
    router.push({
      pathname: '/subscriptionscreen',
      params: { vendorId: vendorIdValue },
    })
  }
>
  <Text style={styles.limitBannerLink}>View Plans</Text>
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
            <View key={pkg._id} style={styles.card}>
              <View style={styles.packageRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packageName}>{pkg.packageName}</Text>
                  <Text style={styles.packagePrice}>Rs. {pkg.price.toLocaleString()}</Text>
                  {isFeatured && (
                    <View style={styles.featuredTag}>
                      <Text style={styles.featuredTagText}>⭐ Featured</Text>
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
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Text style={styles.unfeatureButtonText}>Unfeature</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 16 },

  limitBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  limitBannerText: { fontSize: 12.5, color: COLORS.warning },
  limitBannerLink: { fontSize: 12.5, color: COLORS.primary, fontWeight: '700', marginTop: 6 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  emptyText: { fontSize: 13.5, color: COLORS.muted, textAlign: 'center' },

  packageRow: { flexDirection: 'row', alignItems: 'center' },
  packageName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  packagePrice: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  featuredTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.featuredBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  featuredTagText: { fontSize: 11, fontWeight: '700', color: COLORS.featuredText },

  featureButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  featureButtonDisabled: { backgroundColor: '#D1D5DB' },
  featureButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  unfeatureButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' },
  unfeatureButtonText: { color: '#DC2626', fontSize: 12.5, fontWeight: '700' },
});