//fyp-mobile/components/VendorSubscription/SubscriptionScreen.tsx
//
// Free / Growth / Premium plan comparison + Demo Activation.
// Per the product spec: NO real payment gateway yet. Every activation is
// clearly labeled "Demo Activation" — the UI never says "Payment Successful".
//
// TODO: same navigation/vendorId notes as VendorGrowthScreen.tsx apply here.

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

import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { activateDemoSubscription } from '../../services/activateDemoSubscription';
import { cancelSubscription } from '../../services/cancelSubscription';
import { PlanDefinition, SubscriptionPlan, VendorSubscription } from '../../types/subscription.types';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#F3E8FF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#FAFAFA',
  card: '#FFFFFF',
  popularBg: '#FEF3C7',
  popularText: '#92400E',
};

// Bullet copy per plan, matching the product spec's SubscriptionScreen mockup.
// Kept separate from the raw feature flags because the screen only needs to
// show 3-4 highlights, not the full feature matrix.
const PLAN_HIGHLIGHTS: Record<SubscriptionPlan, string[]> = {
  [SubscriptionPlan.FREE]: ['Vendor profile & packages', 'Booking management', 'Basic analytics'],
  [SubscriptionPlan.GROWTH]: ['More customers', 'Featured visibility', 'Coupons', 'Advanced analytics'],
  [SubscriptionPlan.PREMIUM]: ['More visibility', 'Advanced promotions', 'Advanced analytics', 'Business insights'],
};

const PLAN_ICON: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.FREE]: '',
  [SubscriptionPlan.GROWTH]: '⭐',
  [SubscriptionPlan.PREMIUM]: '💎',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SubscriptionScreen() {
  const router = useRouter();

  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [subscription, setSubscription] = useState<VendorSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [activatingPlan, setActivatingPlan] = useState<SubscriptionPlan | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!vendorIdValue) {
      setError('Missing vendorId');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [planList, sub] = await Promise.all([getSubscriptionPlans(), getVendorSubscription(vendorIdValue)]);
      setPlans(planList);
      setSubscription(sub);
    } catch (e: any) {
      setError(e?.message || 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, [vendorIdValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleActivate = (plan: PlanDefinition) => {
    Alert.alert(
      'Demo Activation',
      `This activates the ${plan.name} plan for 30 days as a DEMO — no real payment will be made. Your app's payment gateway isn't connected yet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate Demo Plan',
          onPress: async () => {
            try {
              setActivatingPlan(plan.key);
              const updated = await activateDemoSubscription(vendorIdValue, plan.key);
              setSubscription(updated);
              Alert.alert('Demo Activated', `${plan.name} plan is now active (demo mode) until ${formatDate(updated.endDate)}.`);
            } catch (e: any) {
              Alert.alert('Activation Failed', e?.message || 'Something went wrong');
            } finally {
              setActivatingPlan(null);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'You will lose access to Growth/Premium features immediately and drop back to the Free plan.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const updated = await cancelSubscription(vendorIdValue);
              setSubscription(updated);
            } catch (e: any) {
              Alert.alert('Could not cancel', e?.message || 'Something went wrong');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
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

  const currentPlan = subscription?.plan;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Subscription</Text>

      {currentPlan && currentPlan !== SubscriptionPlan.FREE && subscription?.endDate && (
        <Text style={styles.currentPlanNote}>
          Current plan active until {formatDate(subscription.endDate)}
        </Text>
      )}

      {plans.map((plan) => {
        const isCurrent = plan.key === currentPlan;
        const isActivating = activatingPlan === plan.key;

        return (
          <View
            key={plan.key}
            style={[styles.planCard, plan.isMostPopular && styles.planCardPopular]}
          >
            {plan.isMostPopular && (
              <View style={styles.popularTag}>
                <Text style={styles.popularTagText}>MOST POPULAR</Text>
              </View>
            )}

            <View style={styles.planHeaderRow}>
              <Text style={styles.planIcon}>{PLAN_ICON[plan.key]}</Text>
              <Text style={styles.planName}>{plan.name}</Text>
            </View>
            <Text style={styles.planPrice}>{plan.priceLabel}</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>

            <View style={styles.highlightsWrap}>
              {PLAN_HIGHLIGHTS[plan.key].map((h) => (
                <View key={h} style={styles.highlightRow}>
                  <Text style={styles.checkMark}>✓</Text>
                  <Text style={styles.highlightText}>{h}</Text>
                </View>
              ))}
            </View>

            {isCurrent ? (
              <View style={styles.currentPlanButton}>
                <Text style={styles.currentPlanButtonText}>Current Plan</Text>
              </View>
            ) : plan.key === SubscriptionPlan.FREE ? (
              // Free has no activation action — vendors land here automatically
              // by cancelling a paid plan.
              <View style={{ height: 4 }} />
            ) : (
              <TouchableOpacity
                style={styles.activateButton}
                onPress={() => handleActivate(plan)}
                disabled={isActivating}
              >
                {isActivating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.activateButtonText}>Activate Demo Plan</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {currentPlan && currentPlan !== SubscriptionPlan.FREE && (
        <TouchableOpacity style={styles.cancelLink} onPress={handleCancel} disabled={cancelling}>
          <Text style={styles.cancelLinkText}>
            {cancelling ? 'Cancelling…' : 'Cancel subscription & return to Free'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.demoDisclaimer}>
        Demo mode: activating a paid plan here does not charge any money. A real payment
        method will be added in a future update.
      </Text>
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

  screenTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  currentPlanNote: { fontSize: 13, color: COLORS.muted, marginBottom: 16 },

  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
  },
  planCardPopular: { borderColor: COLORS.primary, borderWidth: 2 },

  popularTag: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: COLORS.popularBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  popularTagText: { fontSize: 10, fontWeight: '800', color: COLORS.popularText, letterSpacing: 0.5 },

  planHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planIcon: { fontSize: 18 },
  planName: { fontSize: 19, fontWeight: '700', color: COLORS.text },
  planPrice: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginTop: 2 },
  planDescription: { fontSize: 12.5, color: COLORS.muted, marginTop: 4 },

  highlightsWrap: { marginTop: 12, gap: 6 },
  highlightRow: { flexDirection: 'row', alignItems: 'center' },
  checkMark: { color: COLORS.primary, fontWeight: '700', marginRight: 8 },
  highlightText: { fontSize: 13.5, color: COLORS.text },

  currentPlanButton: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentPlanButtonText: { color: COLORS.muted, fontWeight: '700', fontSize: 14 },

  activateButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activateButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  cancelLink: { marginTop: 20, alignItems: 'center' },
  cancelLinkText: { color: '#DC2626', fontSize: 13.5, fontWeight: '600' },

  demoDisclaimer: { fontSize: 11.5, color: COLORS.muted, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});