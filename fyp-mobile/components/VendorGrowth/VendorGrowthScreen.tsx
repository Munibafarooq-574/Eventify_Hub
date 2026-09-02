
// fyp-mobile/components/VendorGrowth/VendorGrowthScreen.tsx

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

import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Crown,
  Star,
  Package,
  Award,
  Ticket,
  Percent,
  TrendingUp,
  Users,
  Wallet,
  Sparkles,
} from 'lucide-react-native';

import { VendorBadgeChips } from '../VendorFeature/VendorBadgeChips';

import { getVendorSubscription } from '../../services/getVendorSubscription';

import {
  getVendorAnalyticsSummary,
  VendorAnalyticsSummary,
} from '../../services/getVendorAnalyticsSummary';

import {
  SubscriptionPlan,
  VendorSubscription,
} from '../../types/subscription.types';

const COLORS = {
  primary: '#7D0C72',
  primaryDark: '#5A0852',
  primaryLight: '#F3E8FF',
  primarySoft: '#EDE9FE',
  text: '#18181B',
  muted: '#6B7280',
  border: '#ECEAF3',
  background: '#F7F6FB',
  card: '#FFFFFF',
  success: '#059669',
  danger: '#DC2626',
  locked: '#9CA3AF',
  gold: '#B8860B',
};

interface GrowthMenuItem {
  key: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  requiresPaidPlan: boolean;
}

const GROWTH_MENU_ITEMS: GrowthMenuItem[] = [
  {
    key: 'featureVendor',
    Icon: Star,
    iconBg: '#FDF2E9',
    iconColor: '#C2703D',
    title: 'Feature Your Business',
    subtitle: 'Get top placement in search',
    requiresPaidPlan: true,
  },
  {
    key: 'featuredPackages',
    Icon: Package,
    iconBg: COLORS.primarySoft,
    iconColor: COLORS.primary,
    title: 'Featured Packages',
    subtitle: 'Highlight your best packages',
    requiresPaidPlan: true,
  },
  {
    key: 'badges',
    Icon: Award,
    iconBg: '#ECFDF5',
    iconColor: '#047857',
    title: 'Promotional Badges',
    subtitle: 'Top Rated, Fast Response & more',
    requiresPaidPlan: false,
  },
  {
    key: 'coupons',
    Icon: Ticket,
    iconBg: '#FDF2F8',
    iconColor: '#BE185D',
    title: 'Coupons',
    subtitle: 'Create discount coupons',
    requiresPaidPlan: true,
  },
  {
    key: 'discountCodes',
    Icon: Percent,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    title: 'Discount Codes',
    subtitle: 'Run promotional campaigns',
    requiresPaidPlan: true,
  },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';

  const d = new Date(dateStr);

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function planDisplayName(plan: SubscriptionPlan): string {
  if (plan === SubscriptionPlan.GROWTH) return 'Growth';
  if (plan === SubscriptionPlan.PREMIUM) return 'Premium';

  return 'Free';
}

export default function VendorGrowthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId)
    ? vendorId[0]
    : vendorId;

  const [subscription, setSubscription] =
    useState<VendorSubscription | null>(null);

  const [analytics, setAnalytics] =
    useState<VendorAnalyticsSummary | null>(null);

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

        getVendorAnalyticsSummary(vendorIdValue).catch(
          (analyticsError) => {
            console.warn(
              '[Vendor Growth] Analytics failed:',
              analyticsError,
            );

            return null;
          },
        ),
      ]);

      setSubscription(sub);
      setAnalytics(analyticsSummary);
    } catch (e: any) {
      console.error(
        '[Vendor Growth] Subscription failed:',
        e,
      );

      setError(
        e?.message ||
          'Failed to load Vendor Growth data',
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

  const isPaidPlan =
    subscription
      ? subscription.plan !== SubscriptionPlan.FREE
      : false;

  const isPremium =
    subscription?.plan === SubscriptionPlan.PREMIUM;

  const handleMenuItemPress = (
    item: GrowthMenuItem,
  ) => {
    if (item.requiresPaidPlan && !isPaidPlan) {
      router.push({
        pathname: '/subscriptionscreen',
        params: {
          vendorId: vendorIdValue,
        },
      });

      return;
    }

    if (item.key === 'featureVendor') {
      router.push({
        pathname: '/featurevendorscreen',
        params: {
          vendorId: vendorIdValue,
        },
      });

      return;
    }

    if (item.key === 'featuredPackages') {
      router.push({
        pathname: '/featuredpackagesscreen',
        params: {
          vendorId: vendorIdValue,
        },
      });

      return;
    }

    if (item.key === 'badges') {
      router.push({
        pathname: '/vendorbadgesscreen',
        params: {
          vendorId: vendorIdValue,
        },
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

  const Header = () => (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
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
            color={COLORS.text}
            strokeWidth={2.5}
          />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>
            Vendor Growth
          </Text>

          <Text style={styles.headerSubtitle}>
            Boost visibility & manage promotions
          </Text>
        </View>

        <View style={styles.headerSideSpacer} />
      </View>
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

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{ headerShown: false }}
      />

      <Header />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* Paid Subscription Feature Note */}
        {subscription && isPaidPlan && (
          <View style={styles.featureNote}>
            <View style={styles.featureNoteIcon}>
              <Sparkles
                size={18}
                color={COLORS.primary}
                strokeWidth={2.2}
              />
            </View>

            <View style={styles.featureNoteContent}>
              <Text style={styles.featureNoteTitle}>
                {planDisplayName(subscription.plan)} Plan Benefits
              </Text>

              <Text style={styles.featureNoteText}>
                Your paid plan unlocks powerful growth tools:
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Star
                    size={13}
                    color={COLORS.primary}
                    strokeWidth={2.3}
                  />
                  <Text style={styles.featureItemText}>
                    Feature Your Business
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <Package
                    size={13}
                    color={COLORS.primary}
                    strokeWidth={2.3}
                  />
                  <Text style={styles.featureItemText}>
                    Featured Packages
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <Ticket
                    size={13}
                    color={COLORS.primary}
                    strokeWidth={2.3}
                  />
                  <Text style={styles.featureItemText}>
                    Coupons
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <Percent
                    size={13}
                    color={COLORS.primary}
                    strokeWidth={2.3}
                  />
                  <Text style={styles.featureItemText}>
                    Discount Codes
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Current Plan */}
        {subscription && isPaidPlan ? (
          <LinearGradient
            colors={[
              COLORS.primary,
              COLORS.primaryDark,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planCard}
          >
            <Text style={styles.planLabelOnDark}>
              Current Plan
            </Text>

            <View style={styles.planRow}>
              <View>
                <View style={styles.planNameRow}>
                  <Text style={styles.planNameOnDark}>
                    {planDisplayName(subscription.plan)}
                  </Text>

                  {isPremium && (
                    <Crown
                      size={18}
                      color="#FDE68A"
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>

                <Text style={styles.planMetaOnDark}>
                  {subscription.endDate
                    ? `Active until ${formatDate(
                        subscription.endDate,
                      )}`
                    : 'Your plan is active'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.manageButtonOnDark}
              onPress={() =>
                router.push({
                  pathname:
                    '/subscriptionscreen',
                  params: {
                    vendorId: vendorIdValue,
                  },
                })
              }
            >
              <Text
                style={styles.manageButtonTextOnDark}
              >
                Manage Subscription
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Current Plan
            </Text>

            <View style={styles.planRow}>
              <View>
                <Text style={styles.planName}>
                  {subscription
                    ? 'Free'
                    : 'No Active Plan'}
                </Text>

                <Text style={styles.planMeta}>
                  Upgrade to unlock growth features
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() =>
                router.push({
                  pathname:
                    '/subscriptionscreen',
                  params: {
                    vendorId: vendorIdValue,
                  },
                })
              }
            >
              <Text
                style={styles.manageButtonText}
              >
                Choose a Plan
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Your Badges */}
        <Text style={styles.sectionTitle}>
          Your Badges
        </Text>

        <View style={styles.card}>
          <VendorBadgeChips
            vendorId={vendorIdValue ?? ''}
            showEmptyState
          />

          <TouchableOpacity
            style={{ marginTop: 12 }}
            onPress={() =>
              router.push({
                pathname:
                  '/vendorbadgesscreen',
                params: {
                  vendorId: vendorIdValue,
                },
              })
            }
          >
            <Text
              style={{
                color: COLORS.primary,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              View all badges →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Grow Your Business */}
        <Text style={styles.sectionTitle}>
          Grow Your Business
        </Text>

        <View style={styles.card}>
          {GROWTH_MENU_ITEMS.map(
            (item, index) => {
              const locked =
                item.requiresPaidPlan &&
                !isPaidPlan;

              const ItemIcon = item.Icon;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuItem,
                    index <
                      GROWTH_MENU_ITEMS.length - 1 &&
                      styles.menuItemBorder,
                    locked &&
                      styles.menuItemLocked,
                  ]}
                  onPress={() =>
                    handleMenuItemPress(item)
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: locked
                          ? '#F3F4F6'
                          : item.iconBg,
                      },
                    ]}
                  >
                    <ItemIcon
                      size={20}
                      color={
                        locked
                          ? COLORS.locked
                          : item.iconColor
                      }
                      strokeWidth={2}
                    />
                  </View>

                  <View
                    style={styles.menuTextWrap}
                  >
                    <Text
                      style={styles.menuTitle}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={styles.menuSubtitle}
                    >
                      {item.subtitle}
                    </Text>
                  </View>

                  {locked ? (
                    <View
                      style={styles.lockPill}
                    >
                      <Lock
                        size={11}
                        color={COLORS.locked}
                        strokeWidth={2.5}
                      />

                      <Text
                        style={
                          styles.lockPillText
                        }
                      >
                        Upgrade
                      </Text>
                    </View>
                  ) : (
                    <ChevronRight
                      size={18}
                      color={COLORS.muted}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              );
            },
          )}
        </View>

        {/* Analytics */}
        <Text style={styles.sectionTitle}>
          Analytics
        </Text>

        <View style={styles.card}>
          {analytics ? (
            <View style={styles.statsGrid}>
              <StatBox
                icon={
                  <Wallet
                    size={16}
                    color={COLORS.primary}
                    strokeWidth={2}
                  />
                }
                label="Total Revenue"
                value={`Rs. ${analytics.totalRevenue.toLocaleString()}`}
              />

              <StatBox
                icon={
                  <TrendingUp
                    size={16}
                    color={COLORS.primary}
                    strokeWidth={2}
                  />
                }
                label="This Month"
                value={`Rs. ${analytics.monthlyRevenue.toLocaleString()}`}
                change={
                  analytics.monthlyRevenueChangePct
                }
              />

              <StatBox
                icon={
                  <Star
                    size={16}
                    color={COLORS.primary}
                    strokeWidth={2}
                  />
                }
                label="Rating"
                value={
                  analytics.averageRating != null
                    ? `${analytics.averageRating} / 5`
                    : 'No reviews yet'
                }
              />

              <StatBox
                icon={
                  <Users
                    size={16}
                    color={COLORS.primary}
                    strokeWidth={2}
                  />
                }
                label="Repeat Customers"
                value={`${analytics.repeatCustomers}`}
              />
            </View>
          ) : (
            <Text style={styles.menuSubtitle}>
              Analytics will appear once you have
              order history.
            </Text>
          )}

          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() =>
              router.push({
                pathname: '/GrowthAnalytics',
                params: {
                  vendorId: vendorIdValue,
                },
              })
            }
          >
            <Text
              style={styles.analyticsButtonText}
            >
              View Full Analytics
            </Text>

            <ChevronRight
              size={16}
              color="#FFFFFF"
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({
  icon,
  label,
  value,
  change,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: number | null;
}) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statIconWrap}>
        {icon}
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>

      {change != null && (
        <Text
          style={[
            styles.statChange,
            {
              color:
                change >= 0
                  ? COLORS.success
                  : COLORS.danger,
            },
          ]}
        >
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerRow: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  headerTextWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSideSpacer: {
    width: 36,
    height: 36,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },

  headerSubtitle: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 16,
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

  /*
   * Paid-plan feature note
   */
  featureNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: '#E5D5F8',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  featureNoteIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  featureNoteContent: {
    flex: 1,
  },

  featureNoteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 3,
  },

  featureNoteText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
  },

  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 7,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  featureItemText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 22,
    marginBottom: 10,
  },

  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#1F1147',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 1,
  },

  planCard: {
    borderRadius: 18,
    padding: 18,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 4,
  },

  planLabelOnDark: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  planName: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.text,
  },

  planNameOnDark: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  planMeta: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 3,
  },

  planMetaOnDark: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
  },

  manageButton: {
    marginTop: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },

  manageButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  manageButtonOnDark: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },

  manageButtonTextOnDark: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  analyticsButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  analyticsButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },

  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  menuItemLocked: {
    opacity: 0.9,
  },

  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  menuTextWrap: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  menuSubtitle: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 1,
  },

  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },

  lockPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.locked,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statBox: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 13,
  },

  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  statLabel: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },

  statChange: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});

