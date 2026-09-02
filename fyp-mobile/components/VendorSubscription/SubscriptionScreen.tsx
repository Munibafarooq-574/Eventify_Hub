// fyp-mobile/components/VendorSubscription/SubscriptionScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ChevronLeft, Star, Crown, Check } from 'lucide-react-native';

import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { activateDemoSubscription } from '../../services/activateDemoSubscription';
import { cancelSubscription } from '../../services/cancelSubscription';

import {
  PlanDefinition,
  SubscriptionPlan,
  SubscriptionStatus,
  VendorSubscription,
} from '../../types/subscription.types';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already.
const COLORS = {
  primary: '#7D0C72',
  primaryDark: '#57084F',
  primaryLight: '#F8E9F6',
  primarySoft: '#F1D3EC',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E9E4E8',
  background: '#FAF6F9',
  card: '#FFFFFF',
  popularBg: '#FEF3C7',
  popularText: '#92400E',
  gold: '#B8860B',
  danger: '#DC2626',
};

// Bullet copy per plan.
const PLAN_HIGHLIGHTS: Record<SubscriptionPlan, string[]> = {
  [SubscriptionPlan.FREE]: [
    'Vendor profile & packages',
    'Booking management',
    'Basic analytics',
  ],

  [SubscriptionPlan.GROWTH]: [
    'More customers',
    'Featured visibility',
    'Coupons',
    'Advanced analytics',
  ],

  [SubscriptionPlan.PREMIUM]: [
    'More visibility',
    'Advanced promotions',
    'Advanced analytics',
    'Business insights',
  ],
};

// Plan icons.
const PLAN_ICON: Record<
  SubscriptionPlan,
  React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }> | null
> = {
  [SubscriptionPlan.FREE]: null,
  [SubscriptionPlan.GROWTH]: Star,
  [SubscriptionPlan.PREMIUM]: Crown,
};

const PLAN_ICON_TINT: Record<
  SubscriptionPlan,
  { bg: string; color: string }
> = {
  [SubscriptionPlan.FREE]: {
    bg: '#F3F4F6',
    color: COLORS.muted,
  },

  [SubscriptionPlan.GROWTH]: {
    bg: COLORS.primaryLight,
    color: COLORS.primary,
  },

  [SubscriptionPlan.PREMIUM]: {
    bg: '#FBF0D9',
    color: COLORS.gold,
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';

  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId)
    ? vendorId[0]
    : vendorId;

  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [subscription, setSubscription] =
    useState<VendorSubscription | null>(null);

  const [loading, setLoading] = useState(true);
  const [activatingPlan, setActivatingPlan] =
    useState<SubscriptionPlan | null>(null);

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

      const [planList, sub] = await Promise.all([
        getSubscriptionPlans(),
        getVendorSubscription(vendorIdValue),
      ]);

      setPlans(planList);
      setSubscription(sub);
    } catch (e: any) {
      setError(
        e?.message || 'Failed to load subscription plans',
      );
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
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Activate Demo Plan',
          onPress: async () => {
            try {
              setActivatingPlan(plan.key);

              const updated = await activateDemoSubscription(
                vendorIdValue,
                plan.key,
              );

              setSubscription(updated);

              Alert.alert(
                'Demo Activated',
                `${plan.name} plan is now active (demo mode) until ${formatDate(
                  updated.endDate,
                )}.`,
              );
            } catch (e: any) {
              Alert.alert(
                'Activation Failed',
                e?.message || 'Something went wrong',
              );
            } finally {
              setActivatingPlan(null);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    if (!subscription?.endDate) {
      Alert.alert(
        'Cancel Subscription',
        'Are you sure you want to cancel your subscription?',
        [
          {
            text: 'Keep Plan',
            style: 'cancel',
          },
          {
            text: 'Cancel Subscription',
            style: 'destructive',
            onPress: performCancellation,
          },
        ],
      );

      return;
    }

    const planName =
      subscription.plan === SubscriptionPlan.GROWTH
        ? 'Growth'
        : 'Premium';

    Alert.alert(
      'Cancel Subscription',
      `Your ${planName} subscription will be cancelled for renewal, but you will NOT lose your paid features immediately.\n\nFeatured Your Business and Featured Packages will remain active until ${formatDate(
        subscription.endDate,
      )}. After the expiry date, your subscription will automatically move to the Free plan.`,
      [
        {
          text: 'Keep Plan',
          style: 'cancel',
        },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: performCancellation,
        },
      ],
    );
  };

  const performCancellation = async () => {
    try {
      setCancelling(true);

      const updated = await cancelSubscription(
        vendorIdValue,
      );

      setSubscription(updated);

      const planName =
        updated.plan === SubscriptionPlan.GROWTH
          ? 'Growth'
          : updated.plan === SubscriptionPlan.PREMIUM
            ? 'Premium'
            : 'Paid';

      Alert.alert(
        'Subscription Cancelled',
        `Your ${planName} subscription has been cancelled for renewal.\n\nYour paid features, including Featured Your Business and Featured Packages, will remain active until ${formatDate(
          updated.endDate,
        )}. After that date, your subscription will automatically move to the Free plan.`,
      );
    } catch (e: any) {
      Alert.alert(
        'Could not cancel',
        e?.message || 'Something went wrong',
      );
    } finally {
      setCancelling(false);
    }
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
        hitSlop={{
          top: 8,
          bottom: 8,
          left: 8,
          right: 8,
        }}
      >
        <ChevronLeft
          size={22}
          color="#FFFFFF"
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>
          Subscription
        </Text>

        <Text style={styles.headerSubtitle}>
          Compare plans & activate demo access
        </Text>
      </View>

      {/* Empty space keeps the title perfectly centered */}
      <View style={styles.headerIconBtnPlaceholder} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <Stack.Screen
          options={{ headerShown: false }}
        />

        <Header />

        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <Stack.Screen
          options={{ headerShown: false }}
        />

        <Header />

        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadData}
          >
            <Text style={styles.retryButtonText}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentPlan = subscription?.plan;

  const isPaidPlan =
    currentPlan &&
    currentPlan !== SubscriptionPlan.FREE;

  const isCancellationScheduled =
    subscription?.status ===
    SubscriptionStatus.CANCELLED;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{ headerShown: false }}
      />

      <Header />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current subscription / cancellation status */}
        {isPaidPlan &&
          subscription?.endDate && (
            <View
              style={[
                styles.activeBanner,
                isCancellationScheduled &&
                  styles.cancelledBanner,
              ]}
            >
              <View
                style={[
                  styles.activeDot,
                  isCancellationScheduled &&
                    styles.cancelledDot,
                ]}
              />

              <View style={styles.bannerTextWrap}>
                <Text
                  style={styles.currentPlanNote}
                >
                  {isCancellationScheduled
                    ? `Subscription cancelled — features remain active until ${formatDate(
                        subscription.endDate,
                      )}`
                    : `Current plan active until ${formatDate(
                        subscription.endDate,
                      )}`}
                </Text>

                {isCancellationScheduled && (
                  <Text
                    style={styles.bannerSubText}
                  >
                    Featured Your Business and Featured
                    Packages will continue until the
                    expiry date.
                  </Text>
                )}
              </View>
            </View>
          )}

        {plans.map((plan) => {
          const isCurrent =
            plan.key === currentPlan;

          const isActivating =
            activatingPlan === plan.key;

          const PlanIcon =
            PLAN_ICON[plan.key];

          const tint =
            PLAN_ICON_TINT[plan.key];

          return (
            <View
              key={plan.key}
              style={[
                styles.planCard,
                plan.isMostPopular &&
                  styles.planCardPopular,
              ]}
            >
              {plan.isMostPopular && (
                <View style={styles.popularTag}>
                  <Text
                    style={styles.popularTagText}
                  >
                    MOST POPULAR
                  </Text>
                </View>
              )}

              <View style={styles.planHeaderRow}>
                {PlanIcon && (
                  <View
                    style={[
                      styles.planIconBadge,
                      {
                        backgroundColor:
                          tint.bg,
                      },
                    ]}
                  >
                    <PlanIcon
                      size={16}
                      color={tint.color}
                      strokeWidth={2.25}
                    />
                  </View>
                )}

                <View>
                  <Text style={styles.planName}>
                    {plan.name}
                  </Text>

                  <Text style={styles.planPrice}>
                    {plan.priceLabel}
                  </Text>
                </View>
              </View>

              <Text style={styles.planDescription}>
                {plan.description}
              </Text>

              <View style={styles.highlightsWrap}>
                {PLAN_HIGHLIGHTS[plan.key].map(
                  (highlight) => (
                    <View
                      key={highlight}
                      style={styles.highlightRow}
                    >
                      <View
                        style={
                          styles.checkCircle
                        }
                      >
                        <Check
                          size={11}
                          color={
                            COLORS.primary
                          }
                          strokeWidth={3}
                        />
                      </View>

                      <Text
                        style={
                          styles.highlightText
                        }
                      >
                        {highlight}
                      </Text>
                    </View>
                  ),
                )}
              </View>

              {isCurrent ? (
                <View
                  style={
                    styles.currentPlanButton
                  }
                >
                  <Text
                    style={
                      styles.currentPlanButtonText
                    }
                  >
                    {isCancellationScheduled
                      ? 'Cancellation Scheduled'
                      : 'Current Plan'}
                  </Text>
                </View>
              ) : plan.key ===
                SubscriptionPlan.FREE ? (
                // Free has no activation action.
                <View style={{ height: 4 }} />
              ) : (
                <TouchableOpacity
                  style={styles.activateButton}
                  onPress={() =>
                    handleActivate(plan)
                  }
                  disabled={isActivating}
                  activeOpacity={0.85}
                >
                  {isActivating ? (
                    <ActivityIndicator
                      color="#fff"
                      size="small"
                    />
                  ) : (
                    <Text
                      style={
                        styles.activateButtonText
                      }
                    >
                      Activate Demo Plan
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Cancellation action */}
        {isPaidPlan &&
          !isCancellationScheduled && (
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={handleCancel}
              disabled={cancelling}
            >
              <Text
                style={styles.cancelLinkText}
              >
                {cancelling
                  ? 'Cancelling…'
                  : 'Cancel subscription'}
              </Text>
            </TouchableOpacity>
          )}

        {/* Cancellation information */}
        {isPaidPlan &&
          isCancellationScheduled &&
          subscription?.endDate && (
            <View style={styles.cancellationInfo}>
              <Text
                style={styles.cancellationInfoTitle}
              >
                Subscription cancelled
              </Text>

              <Text
                style={styles.cancellationInfoText}
              >
                Your paid features will remain
                available until{' '}
                <Text
                  style={
                    styles.cancellationInfoBold
                  }
                >
                  {formatDate(
                    subscription.endDate,
                  )}
                </Text>
                .
              </Text>

              <Text
                style={styles.cancellationInfoText}
              >
                Featured Your Business and Featured
                Packages will continue to display
                until your current subscription period
                ends.
              </Text>
            </View>
          )}

        <Text style={styles.demoDisclaimer}>
          Demo mode: activating a paid plan here does
          not charge any money. A real payment method
          will be added in a future update.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 18,
  },

  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      'rgba(255,255,255,0.15)',
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

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  errorText: {
    color: COLORS.muted,
    marginBottom: 12,
  },

  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },

  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  activeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 16,
  },

  cancelledBanner: {
    backgroundColor: '#FFF7ED',
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
    marginTop: 5,
  },

  cancelledDot: {
    backgroundColor: '#EA580C',
  },

  bannerTextWrap: {
    flex: 1,
  },

  currentPlanNote: {
    fontSize: 12.5,
    color: COLORS.primaryDark,
    fontWeight: '600',
    lineHeight: 18,
  },

  bannerSubText: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 16,
  },

  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
    shadowColor: '#3B0836',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 1,
  },

  planCardPopular: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },

  popularTag: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: COLORS.popularBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  popularTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.popularText,
    letterSpacing: 0.5,
  },

  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  planIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  planPrice: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 1,
  },

  planDescription: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 10,
  },

  highlightsWrap: {
    marginTop: 14,
    gap: 9,
  },

  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  highlightText: {
    fontSize: 13.5,
    color: COLORS.text,
  },

  currentPlanButton: {
    marginTop: 18,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  currentPlanButtonText: {
    color: COLORS.muted,
    fontWeight: '700',
    fontSize: 14,
  },

  activateButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },

  activateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  cancelLink: {
    marginTop: 20,
    alignItems: 'center',
  },

  cancelLinkText: {
    color: COLORS.danger,
    fontSize: 13.5,
    fontWeight: '600',
  },

  cancellationInfo: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
  },

  cancellationInfoTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 5,
  },

  cancellationInfoText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
    marginTop: 3,
  },

  cancellationInfoBold: {
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  demoDisclaimer: {
    fontSize: 11.5,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
});