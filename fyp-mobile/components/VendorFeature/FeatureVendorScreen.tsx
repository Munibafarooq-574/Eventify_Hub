//fyp-mobile/components/FeatureVendor/FeatureVendorScreen.tsx
//
// Lets a Growth/Premium vendor activate a "Featured Vendor" campaign
// (7/15/30 days), see active campaigns, and deactivate one early.
// Limit enforcement is backend-driven (FeatureAccessService) — this
// screen just reflects what the API allows/rejects.
//
// TODO: same navigation/vendorId/theme notes as the Phase 2 screens apply.

import React, { useCallback, useEffect, useState } from 'react';
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
import { getMyFeaturedVendorPromotions } from '../../services/getMyFeaturedVendorPromotions';
import { activateFeaturedVendor } from '../../services/activateFeaturedVendor';
import { deactivateFeaturedVendor } from '../../services/deactivateFeaturedVendor';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import { FEATURED_VENDOR_DURATION_OPTIONS, PromotionStatus, VendorPromotion } from '../../types/promotion.types';
import { GrowthApiError } from '../../services/growthApiClient';


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
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isPromotionLive(p: VendorPromotion): boolean {
  return p.status === PromotionStatus.ACTIVE && new Date(p.endDate).getTime() > Date.now();
}

export default function FeatureVendorScreen() {
  const router = useRouter();

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

  const activePromotions = promotions.filter(isPromotionLive);
  const pastPromotions = promotions.filter((p) => !isPromotionLive(p));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>⭐ Feature Your Business</Text>
      <Text style={styles.subtitle}>
        Get priority placement in vendor discovery. Featured status boosts your visibility — it doesn't
        override relevance, location, and rating.
      </Text>

      {/* Active campaigns */}
      {activePromotions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Active Campaigns ({activeCount}/{limit})</Text>
          {activePromotions.map((p) => (
            <View key={p._id} style={styles.activeRow}>
              <View>
                <Text style={styles.activeRowTitle}>{p.durationDays}-day campaign</Text>
                <Text style={styles.activeRowMeta}>Featured until {formatDate(p.endDate)}</Text>
              </View>
              <TouchableOpacity
                style={styles.deactivateButton}
                onPress={() => handleDeactivate(p)}
                disabled={deactivatingId === p._id}
              >
                {deactivatingId === p._id ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Text style={styles.deactivateButtonText}>Deactivate</Text>
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
            <Text style={styles.limitTitle}>Limit reached ({activeCount}/{limit})</Text>
            <Text style={styles.limitSubtitle}>
              Deactivate an existing campaign, or upgrade to Premium for more Featured Vendor slots.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push({
  pathname: '/subscriptionscreen',
  params: { vendorId: vendorIdValue },
})}
            >
              <Text style={styles.upgradeButtonText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionLabel}>Choose Duration</Text>
            <View style={styles.durationRow}>
              {FEATURED_VENDOR_DURATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  style={[styles.durationChip, selectedDays === opt.days && styles.durationChipSelected]}
                  onPress={() => setSelectedDays(opt.days)}
                >
                  <Text
                    style={[styles.durationChipText, selectedDays === opt.days && styles.durationChipTextSelected]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.activateButton} onPress={handleActivate} disabled={activating}>
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
          {pastPromotions.map((p) => (
            <View key={p._id} style={styles.historyRow}>
              <Text style={styles.historyText}>{p.durationDays}-day campaign</Text>
              <Text
                style={[
                  styles.historyStatus,
                  p.status === PromotionStatus.CANCELLED ? { color: '#DC2626' } : { color: COLORS.muted },
                ]}
              >
                {p.status}
              </Text>
            </View>
          ))}
        </View>
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

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeRowTitle: { fontSize: 14.5, fontWeight: '600', color: COLORS.text },
  activeRowMeta: { fontSize: 12.5, color: COLORS.success, marginTop: 2 },
  deactivateButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' },
  deactivateButtonText: { color: '#DC2626', fontSize: 12.5, fontWeight: '700' },

  limitTitle: { fontSize: 15, fontWeight: '700', color: COLORS.warning },
  limitSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 6, lineHeight: 18 },
  upgradeButton: { marginTop: 14, backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  upgradeButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  durationRow: { flexDirection: 'row', gap: 8 },
  durationChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  durationChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durationChipText: { fontSize: 13.5, fontWeight: '600', color: COLORS.text },
  durationChipTextSelected: { color: '#fff' },

  activateButton: { marginTop: 14, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  activateButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  historyText: { fontSize: 13.5, color: COLORS.text },
  historyStatus: { fontSize: 12.5, fontWeight: '600', textTransform: 'capitalize' },
});