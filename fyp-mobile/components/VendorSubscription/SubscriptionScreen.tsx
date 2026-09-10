// fyp-mobile/components/VendorSubscription/SubscriptionScreen.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  ChevronLeft,
  Check,
  Clock3,
  Crown,
  Star,
  WalletCards,
} from 'lucide-react-native';

import {
  Stack,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  getSubscriptionPlans,
} from '../../services/getSubscriptionPlans';

import {
  getSubscriptionAccessState,
} from '../../services/getSubscriptionAccessState';

import {
  getSubscriptionHistory,
} from '../../services/getSubscriptionHistory';

import {
  getSubscriptionPaymentInstructions,
} from '../../services/getSubscriptionPaymentInstructions';

import {
  requestSubscriptionPayment,
} from '../../services/requestSubscriptionPayment';

import {
  cancelSubscription,
} from '../../services/cancelSubscription';

import {
  PaymentProvider,
  PaymentStatus,
  PlanDefinition,
  SubscriptionAccessState,
  SubscriptionPaymentInstructions,
  SubscriptionPlan,
  SubscriptionStatus,
  VendorSubscription,
} from '../../types/subscription.types';

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

  success: '#15803D',
  successBg: '#F0FDF4',

  warning: '#B45309',
  warningBg: '#FFF7ED',

  danger: '#DC2626',
  dangerBg: '#FEF2F2',

  info: '#1D4ED8',
  infoBg: '#EFF6FF',

  popularBg: '#FEF3C7',
  popularText: '#92400E',

  gold: '#B8860B',
};

const PLAN_HIGHLIGHTS: Partial<
  Record<SubscriptionPlan, string[]>
> = {
  [SubscriptionPlan.BASIC]: [
    'Up to 5 packages',
    'Up to 10 portfolio images',
    'Up to 3 images per package',
    'Standard marketplace listing',
    'Bookings, messages & availability',
    'Reviews and basic business stats',
  ],

  [SubscriptionPlan.GROWTH]: [
    'Up to 10 packages',
    'Up to 30 portfolio images',
    'Up to 6 images per package',
    '2 promotional campaigns per month',
    'Growth visibility & featured eligibility',
    'Advanced analytics & business insights',
  ],

  [SubscriptionPlan.PREMIUM]: [
    'Up to 20 packages',
    'Up to 60 portfolio images',
    'Up to 10 images per package',
    '5 promotional campaigns per month',
    'Premium Partner visibility',
    'Priority placement & support',
  ],
};

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

function getPlanName(
  plan?: SubscriptionPlan | null,
): string {
  switch (plan) {
    case SubscriptionPlan.BASIC:
      return 'Basic';

    case SubscriptionPlan.GROWTH:
      return 'Growth';

    case SubscriptionPlan.PREMIUM:
      return 'Premium';

    default:
      return 'Subscription';
  }
}

export default function SubscriptionScreen() {
  const router = useRouter();

  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams<{
      vendorId?: string | string[];
    }>();

  const vendorId =
    Array.isArray(params.vendorId)
      ? params.vendorId[0]
      : params.vendorId;

  const [plans, setPlans] =
    useState<PlanDefinition[]>([]);

  const [
    accessState,
    setAccessState,
  ] =
    useState<
      SubscriptionAccessState | null
    >(null);

  const [
    history,
    setHistory,
  ] =
    useState<VendorSubscription[]>([]);

  const [
    paymentInstructions,
    setPaymentInstructions,
  ] =
    useState<
      SubscriptionPaymentInstructions | null
    >(null);

  const [
    selectedPlan,
    setSelectedPlan,
  ] =
    useState<PlanDefinition | null>(
      null,
    );

  const [
    paymentReference,
    setPaymentReference,
  ] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    cancelling,
    setCancelling,
  ] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const loadData =
    useCallback(async () => {
      if (!vendorId) {
        setError(
          'Missing vendorId.',
        );

        setLoading(false);
        return;
      }

      try {
        setError(null);

        const [
          planList,
          access,
          subscriptionHistory,
          instructions,
        ] =
          await Promise.all([
            getSubscriptionPlans(),

            getSubscriptionAccessState(
              vendorId,
            ),

            getSubscriptionHistory(
              vendorId,
            ),

            getSubscriptionPaymentInstructions(),
          ]);

        setPlans(
          planList.filter(
            (plan) =>
              plan.key !==
              SubscriptionPlan.FREE,
          ),
        );

        setAccessState(
          access,
        );

        setHistory(
          subscriptionHistory,
        );

        setPaymentInstructions(
          instructions,
        );
      } catch (e: any) {
        setError(
          e?.message ||
            'Failed to load subscription information.',
        );
      } finally {
        setLoading(false);
      }
    }, [vendorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latestRejectedPayment =
    useMemo(() => {
      return history.find(
        (item) =>
          item.status ===
            SubscriptionStatus.REJECTED ||
          item.paymentStatus ===
            PaymentStatus.FAILED,
      );
    }, [history]);

  const currentSubscription =
    accessState?.subscription;

  const isTrial =
    accessState?.isTrial ===
    true;

  const isExpired =
    currentSubscription?.status ===
    SubscriptionStatus.EXPIRED;

  const isCancellationScheduled =
    currentSubscription?.status ===
    SubscriptionStatus.CANCELLED;

  const hasPendingPayment =
    accessState
      ?.hasPendingPayment ===
    true;

  const isActivePaid =
    accessState?.isPaidPlan ===
    true;

  const selectPlan = (
    plan: PlanDefinition,
  ) => {
    if (hasPendingPayment) {
      Alert.alert(
        'Payment Under Review',
        'You already have a subscription payment waiting for Admin verification.',
      );

      return;
    }

    if (
      isActivePaid &&
      currentSubscription?.plan ===
        plan.key &&
      !isCancellationScheduled
    ) {
      Alert.alert(
        'Current Plan',
        `${plan.name} is already your active subscription.`,
      );

      return;
    }

    setSelectedPlan(
      plan,
    );

    setPaymentReference(
      '',
    );
  };

  const submitPayment =
    async () => {
      if (!selectedPlan) {
        return;
      }

      const reference =
        paymentReference
          .trim()
          .toUpperCase();

      if (
        reference.length <
        2
      ) {
        Alert.alert(
          'Payment Reference Required',
          'Enter the Easypaisa transaction/reference ID after sending the payment.',
        );

        return;
      }

      Alert.alert(
        'Submit Payment?',
        `Confirm that you have sent ${selectedPlan.priceLabel} through Easypaisa.\n\nReference: ${reference}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text:
              'Submit for Verification',

            onPress:
              async () => {
                try {
                  setSubmitting(
                    true,
                  );

                  await requestSubscriptionPayment(
                    {
                      plan:
                        selectedPlan.key as
                          | SubscriptionPlan.BASIC
                          | SubscriptionPlan.GROWTH
                          | SubscriptionPlan.PREMIUM,

                      paymentProvider:
                        PaymentProvider.EASYPAISA,

                      paymentReference:
                        reference,
                    },
                  );

                  setSelectedPlan(
                    null,
                  );

                  setPaymentReference(
                    '',
                  );

                  await loadData();

                  Alert.alert(
                    'Payment Submitted',
                    'Your payment has been submitted for Admin verification. Your current subscription access will remain unchanged until the payment is approved.',
                  );
                } catch (
                  e: any
                ) {
                  Alert.alert(
                    'Submission Failed',
                    e?.message ||
                      'Could not submit payment.',
                  );
                } finally {
                  setSubmitting(
                    false,
                  );
                }
              },
          },
        ],
      );
    };

  const handleCancel =
    () => {
      if (
        !currentSubscription
          ?.endDate
      ) {
        return;
      }

      Alert.alert(
        'Cancel Renewal',
        `Your ${getPlanName(
          currentSubscription.plan,
        )} subscription will stop renewing.\n\nYour current paid access will remain available until ${formatDate(
          currentSubscription.endDate,
        )}.`,
        [
          {
            text:
              'Keep Subscription',
            style: 'cancel',
          },
          {
            text:
              'Cancel Renewal',

            style:
              'destructive',

            onPress:
              performCancellation,
          },
        ],
      );
    };

  const performCancellation =
    async () => {
      try {
        setCancelling(
          true,
        );

        await cancelSubscription(
          'Cancelled by vendor',
        );

        await loadData();

        Alert.alert(
          'Renewal Cancelled',
          'Your current paid subscription remains usable until its expiry date.',
        );
      } catch (e: any) {
        Alert.alert(
          'Could Not Cancel',
          e?.message ||
            'Something went wrong.',
        );
      } finally {
        setCancelling(
          false,
        );
      }
    };

  const Header = () => (
    <View
      style={[
        styles.header,
        {
          paddingTop:
            insets.top +
            34,
        },
      ]}
    >
      <TouchableOpacity
        style={
          styles.headerIcon
        }
        onPress={() =>
          router.back()
        }
      >
        <ChevronLeft
          size={22}
          color="#FFFFFF"
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      <View
        style={
          styles.headerTextWrap
        }
      >
        <Text
          style={
            styles.headerTitle
          }
        >
          Subscription
        </Text>

        <Text
          style={
            styles.headerSubtitle
          }
        >
          Choose the right plan
          for your business
        </Text>
      </View>

      <View
        style={
          styles.headerPlaceholder
        }
      />
    </View>
  );

  if (loading) {
    return (
      <View
        style={styles.root}
      >
        <Stack.Screen
          options={{
            headerShown:
              false,
          }}
        />

        <Header />

        <View
          style={
            styles.centered
          }
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />
        </View>
      </View>
    );
  }

  if (
    error ||
    !accessState
  ) {
    return (
      <View
        style={styles.root}
      >
        <Stack.Screen
          options={{
            headerShown:
              false,
          }}
        />

        <Header />

        <View
          style={
            styles.centered
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {error ||
              'Unable to load subscription.'}
          </Text>

          <TouchableOpacity
            style={
              styles.primaryButton
            }
            onPress={
              loadData
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <Header />

      <ScrollView
        style={
          styles.container
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* ================================================= */}
        {/* CURRENT STATUS */}
        {/* ================================================= */}

        {isTrial && (
          <View
            style={[
              styles.statusCard,
              styles.infoCard,
            ]}
          >
            <Clock3
              size={20}
              color={
                COLORS.info
              }
            />

            <View
              style={
                styles.statusTextWrap
              }
            >
              <Text
                style={
                  styles.statusTitle
                }
              >
                Free Basic Trial
              </Text>

              <Text
                style={
                  styles.statusDescription
                }
              >
                You have{' '}
                <Text
                  style={
                    styles.statusBold
                  }
                >
                  {
                    accessState.trialDaysRemaining
                  }{' '}
                  day
                  {accessState.trialDaysRemaining ===
                  1
                    ? ''
                    : 's'}
                </Text>{' '}
                remaining.
              </Text>

              {accessState.trialEndDate && (
                <Text
                  style={
                    styles.statusSecondary
                  }
                >
                  Trial ends{' '}
                  {formatDate(
                    accessState.trialEndDate,
                  )}
                </Text>
              )}
            </View>
          </View>
        )}

        {isActivePaid && (
          <View
            style={[
              styles.statusCard,
              styles.successCard,
            ]}
          >
            <Check
              size={20}
              color={
                COLORS.success
              }
            />

            <View
              style={
                styles.statusTextWrap
              }
            >
              <Text
                style={
                  styles.statusTitle
                }
              >
                {getPlanName(
                  accessState.effectivePlan,
                )}{' '}
                Plan Active
              </Text>

              <Text
                style={
                  styles.statusDescription
                }
              >
                {
                  accessState.daysRemaining
                }{' '}
                days remaining
              </Text>

              {currentSubscription?.endDate && (
                <Text
                  style={
                    styles.statusSecondary
                  }
                >
                  Valid until{' '}
                  {formatDate(
                    currentSubscription.endDate,
                  )}
                </Text>
              )}
            </View>
          </View>
        )}

        {isCancellationScheduled && (
          <View
            style={[
              styles.statusCard,
              styles.warningCard,
            ]}
          >
            <Clock3
              size={20}
              color={
                COLORS.warning
              }
            />

            <View
              style={
                styles.statusTextWrap
              }
            >
              <Text
                style={
                  styles.statusTitle
                }
              >
                Renewal Cancelled
              </Text>

              <Text
                style={
                  styles.statusDescription
                }
              >
                Your current access
                remains available until{' '}
                {formatDate(
                  currentSubscription?.endDate,
                )}
                .
              </Text>
            </View>
          </View>
        )}

        {isExpired && (
          <View
            style={[
              styles.statusCard,
              styles.dangerCard,
            ]}
          >
            <Clock3
              size={20}
              color={
                COLORS.danger
              }
            />

            <View
              style={
                styles.statusTextWrap
              }
            >
              <Text
                style={
                  styles.statusTitle
                }
              >
                Subscription Required
              </Text>

              <Text
                style={
                  styles.statusDescription
                }
              >
                Your trial or paid
                subscription has
                expired. Choose a plan
                below to continue using
                subscription features.
              </Text>
            </View>
          </View>
        )}

        {hasPendingPayment &&
          accessState.pendingPayment && (
            <View
              style={[
                styles.statusCard,
                styles.warningCard,
              ]}
            >
              <WalletCards
                size={20}
                color={
                  COLORS.warning
                }
              />

              <View
                style={
                  styles.statusTextWrap
                }
              >
                <Text
                  style={
                    styles.statusTitle
                  }
                >
                  Payment Under Review
                </Text>

                <Text
                  style={
                    styles.statusDescription
                  }
                >
                  Your{' '}
                  {getPlanName(
                    accessState
                      .pendingPayment
                      .plan,
                  )}{' '}
                  payment is waiting
                  for Admin verification.
                </Text>

                <Text
                  style={
                    styles.statusSecondary
                  }
                >
                  Reference:{' '}
                  {accessState
                    .pendingPayment
                    .paymentReference ||
                    '—'}
                </Text>
              </View>
            </View>
          )}

        {!hasPendingPayment &&
          latestRejectedPayment && (
            <View
              style={[
                styles.statusCard,
                styles.dangerCard,
              ]}
            >
              <WalletCards
                size={20}
                color={
                  COLORS.danger
                }
              />

              <View
                style={
                  styles.statusTextWrap
                }
              >
                <Text
                  style={
                    styles.statusTitle
                  }
                >
                  Previous Payment
                  Rejected
                </Text>

                <Text
                  style={
                    styles.statusDescription
                  }
                >
                  {getPlanName(
                    latestRejectedPayment.plan,
                  )}{' '}
                  payment was not
                  approved.
                </Text>

                {latestRejectedPayment.rejectionReason ? (
                  <Text
                    style={
                      styles.statusSecondary
                    }
                  >
                    Reason:{' '}
                    {
                      latestRejectedPayment.rejectionReason
                    }
                  </Text>
                ) : null}
              </View>
            </View>
          )}

        {/* ================================================= */}
        {/* BASIC TRIAL ENTITLEMENTS */}
        {/* ================================================= */}

        {isTrial && (
          <View
            style={
              styles.trialInfoCard
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Your Trial Includes
            </Text>

            <Text
              style={
                styles.trialLimitText
              }
            >
              {
                accessState
                  .limits
                  .maxPackages
              }{' '}
              packages
            </Text>

            <Text
              style={
                styles.trialLimitText
              }
            >
              {
                accessState
                  .limits
                  .maxPortfolioImages
              }{' '}
              portfolio images
            </Text>

            <Text
              style={
                styles.trialLimitText
              }
            >
              {
                accessState
                  .limits
                  .maxImagesPerPackage
              }{' '}
              images per package
            </Text>

            <Text
              style={
                styles.trialNotice
              }
            >
              Trial provides Basic-level
              access only. Growth and
              Premium promotional
              features are not included.
            </Text>
          </View>
        )}

        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Choose Your Plan
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Monthly subscription ·
            manual Easypaisa payment
          </Text>
        </View>

        {/* ================================================= */}
        {/* PLANS */}
        {/* ================================================= */}

        {plans.map(
          (plan) => {
            const isCurrentPaidPlan =
              isActivePaid &&
              currentSubscription?.plan ===
                plan.key;

            const highlights =
              PLAN_HIGHLIGHTS[
                plan.key
              ] || [];

            const PlanIcon =
              plan.key ===
              SubscriptionPlan.PREMIUM
                ? Crown
                : plan.key ===
                    SubscriptionPlan.GROWTH
                  ? Star
                  : null;

            return (
              <View
                key={
                  plan.key
                }
                style={[
                  styles.planCard,

                  plan.isMostPopular &&
                    styles.popularPlanCard,

                  selectedPlan?.key ===
                    plan.key &&
                    styles.selectedPlanCard,
                ]}
              >
                {plan.isMostPopular && (
                  <View
                    style={
                      styles.popularBadge
                    }
                  >
                    <Text
                      style={
                        styles.popularBadgeText
                      }
                    >
                      MOST POPULAR
                    </Text>
                  </View>
                )}

                <View
                  style={
                    styles.planHeader
                  }
                >
                  {PlanIcon && (
                    <View
                      style={
                        styles.planIcon
                      }
                    >
                      <PlanIcon
                        size={18}
                        color={
                          plan.key ===
                          SubscriptionPlan.PREMIUM
                            ? COLORS.gold
                            : COLORS.primary
                        }
                      />
                    </View>
                  )}

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.planName
                      }
                    >
                      {plan.name}
                    </Text>

                    <Text
                      style={
                        styles.planPrice
                      }
                    >
                      {
                        plan.priceLabel
                      }
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.planDescription
                  }
                >
                  {plan.description}
                </Text>

                <View
                  style={
                    styles.highlights
                  }
                >
                  {highlights.map(
                    (
                      highlight,
                    ) => (
                      <View
                        key={
                          highlight
                        }
                        style={
                          styles.highlightRow
                        }
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
                            strokeWidth={
                              3
                            }
                          />
                        </View>

                        <Text
                          style={
                            styles.highlightText
                          }
                        >
                          {
                            highlight
                          }
                        </Text>
                      </View>
                    ),
                  )}
                </View>

                {isCurrentPaidPlan &&
                !isCancellationScheduled ? (
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
                      Current Plan
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,

                      hasPendingPayment &&
                        styles.disabledButton,
                    ]}
                    disabled={
                      hasPendingPayment
                    }
                    onPress={() =>
                      selectPlan(
                        plan,
                      )
                    }
                  >
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      {isTrial &&
                      plan.key ===
                        SubscriptionPlan.BASIC
                        ? 'Subscribe to Basic'
                        : `Choose ${plan.name}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          },
        )}

        {/* ================================================= */}
        {/* PAYMENT */}
        {/* ================================================= */}

        {selectedPlan &&
          !hasPendingPayment && (
            <View
              style={
                styles.paymentCard
              }
            >
              <View
                style={
                  styles.paymentTitleRow
                }
              >
                <WalletCards
                  size={22}
                  color={
                    COLORS.primary
                  }
                />

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.paymentTitle
                    }
                  >
                    Pay with
                    Easypaisa
                  </Text>

                  <Text
                    style={
                      styles.paymentSubtitle
                    }
                  >
                    Manual payment ·
                    Admin verification
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.selectedPlanSummary
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Selected Plan
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    selectedPlan.name
                  }
                </Text>

                <Text
                  style={
                    styles.summaryPrice
                  }
                >
                  {
                    selectedPlan.priceLabel
                  }
                </Text>
              </View>

              <Text
                style={
                  styles.instructionText
                }
              >
                Send the exact amount
                shown above to the
                Easypaisa account below.
              </Text>

              <View
                style={
                  styles.accountDetails
                }
              >
                <Text
                  style={
                    styles.accountLabel
                  }
                >
                  Account Title
                </Text>

                <Text
                  style={
                    styles.accountValue
                  }
                >
                  {paymentInstructions
                    ?.accountTitle ||
                    'Not configured'}
                </Text>

                <View
                  style={
                    styles.accountDivider
                  }
                />

                <Text
                  style={
                    styles.accountLabel
                  }
                >
                  Easypaisa Number
                </Text>

                <Text
                  style={
                    styles.accountValue
                  }
                >
                  {paymentInstructions
                    ?.mobileNumber ||
                    'Not configured'}
                </Text>
              </View>

              <Text
                style={
                  styles.referenceLabel
                }
              >
                Transaction / Reference
                ID
              </Text>

              <TextInput
                style={
                  styles.referenceInput
                }
                value={
                  paymentReference
                }
                onChangeText={
                  setPaymentReference
                }
                placeholder="Enter Easypaisa transaction ID"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                autoCorrect={
                  false
                }
                maxLength={120}
              />

              <Text
                style={
                  styles.referenceHelp
                }
              >
                Enter the transaction
                reference shown in your
                Easypaisa payment
                confirmation.
              </Text>

              <TouchableOpacity
                style={[
                  styles.submitButton,

                  submitting &&
                    styles.disabledButton,
                ]}
                disabled={
                  submitting
                }
                onPress={
                  submitPayment
                }
              >
                {submitting ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.submitButtonText
                    }
                  >
                    Submit Payment for
                    Verification
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.changePlanButton
                }
                disabled={
                  submitting
                }
                onPress={() => {
                  setSelectedPlan(
                    null,
                  );

                  setPaymentReference(
                    '',
                  );
                }}
              >
                <Text
                  style={
                    styles.changePlanText
                  }
                >
                  Choose another plan
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* ================================================= */}
        {/* CANCEL */}
        {/* ================================================= */}

        {isActivePaid &&
          !isCancellationScheduled && (
            <TouchableOpacity
              style={
                styles.cancelButton
              }
              disabled={
                cancelling
              }
              onPress={
                handleCancel
              }
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                {cancelling
                  ? 'Cancelling…'
                  : 'Cancel subscription renewal'}
              </Text>
            </TouchableOpacity>
          )}

        <Text
          style={
            styles.footerText
          }
        >
          Subscription payments are
          manually verified by Eventify
          Hub. Your current access will
          not change until a submitted
          payment is approved.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    header: {
      backgroundColor:
        COLORS.primary,

      paddingHorizontal: 18,
      paddingBottom: 22,

      flexDirection: 'row',
      alignItems: 'center',

      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,

      marginBottom: 8,

      elevation: 5,

      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,

      backgroundColor:
        'rgba(255,255,255,0.15)',

      justifyContent:
        'center',

      alignItems:
        'center',
    },

    headerPlaceholder: {
      width: 40,
      height: 40,
    },

    headerTextWrap: {
      flex: 1,
      alignItems:
        'center',

      paddingHorizontal: 8,
    },

    headerTitle: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '800',
    },

    headerSubtitle: {
      color:
        'rgba(255,255,255,0.78)',

      fontSize: 11.5,
      marginTop: 2,

      textAlign:
        'center',
    },

    container: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },

    centered: {
      flex: 1,

      justifyContent:
        'center',

      alignItems:
        'center',

      paddingHorizontal: 24,
    },

    errorText: {
      color: COLORS.danger,

      textAlign:
        'center',

      marginBottom: 14,
    },

    statusCard: {
      flexDirection: 'row',
      alignItems:
        'flex-start',

      borderRadius: 14,

      padding: 14,

      marginTop: 14,

      borderWidth: 1,
    },

    infoCard: {
      backgroundColor:
        COLORS.infoBg,

      borderColor:
        '#BFDBFE',
    },

    successCard: {
      backgroundColor:
        COLORS.successBg,

      borderColor:
        '#BBF7D0',
    },

    warningCard: {
      backgroundColor:
        COLORS.warningBg,

      borderColor:
        '#FED7AA',
    },

    dangerCard: {
      backgroundColor:
        COLORS.dangerBg,

      borderColor:
        '#FECACA',
    },

    statusTextWrap: {
      flex: 1,
      marginLeft: 10,
    },

    statusTitle: {
      fontSize: 14,
      fontWeight: '800',

      color: COLORS.text,
    },

    statusDescription: {
      marginTop: 4,

      fontSize: 12.5,

      lineHeight: 18,

      color: COLORS.text,
    },

    statusSecondary: {
      marginTop: 5,

      fontSize: 11.5,

      lineHeight: 17,

      color: COLORS.muted,
    },

    statusBold: {
      fontWeight: '800',
    },

    trialInfoCard: {
      marginTop: 14,

      borderRadius: 14,

      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      padding: 15,
    },

    trialLimitText: {
      marginTop: 7,

      color: COLORS.text,

      fontSize: 12.5,

      fontWeight: '600',
    },

    trialNotice: {
      marginTop: 12,

      color: COLORS.muted,

      fontSize: 11.5,

      lineHeight: 17,
    },

    sectionHeader: {
      marginTop: 24,
      marginBottom: 2,
    },

    sectionTitle: {
      color: COLORS.text,

      fontSize: 17,

      fontWeight: '800',
    },

    sectionSubtitle: {
      marginTop: 4,

      color: COLORS.muted,

      fontSize: 12,
    },

    planCard: {
      position:
        'relative',

      marginTop: 16,

      padding: 18,

      borderRadius: 18,

      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      elevation: 1,

      shadowColor:
        '#3B0836',

      shadowOpacity: 0.04,

      shadowRadius: 10,

      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    popularPlanCard: {
      borderColor:
        COLORS.primary,

      borderWidth: 2,
    },

    selectedPlanCard: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        '#FFF9FE',
    },

    popularBadge: {
      position:
        'absolute',

      top: -10,
      left: 16,

      backgroundColor:
        COLORS.popularBg,

      borderRadius: 7,

      paddingHorizontal: 9,
      paddingVertical: 4,
    },

    popularBadgeText: {
      color:
        COLORS.popularText,

      fontSize: 9.5,

      fontWeight: '900',

      letterSpacing: 0.5,
    },

    planHeader: {
      flexDirection: 'row',

      alignItems:
        'center',

      marginBottom: 10,
    },

    planIcon: {
      width: 38,
      height: 38,

      borderRadius: 12,

      backgroundColor:
        COLORS.primaryLight,

      justifyContent:
        'center',

      alignItems:
        'center',

      marginRight: 11,
    },

    planName: {
      color: COLORS.text,

      fontSize: 18,

      fontWeight: '800',
    },

    planPrice: {
      color:
        COLORS.primary,

      fontSize: 13.5,

      fontWeight: '700',

      marginTop: 2,
    },

    planDescription: {
      color:
        COLORS.muted,

      fontSize: 12.5,

      lineHeight: 18,
    },

    highlights: {
      marginTop: 14,
      gap: 9,
    },

    highlightRow: {
      flexDirection: 'row',

      alignItems:
        'center',
    },

    checkCircle: {
      width: 18,
      height: 18,

      borderRadius: 9,

      backgroundColor:
        COLORS.primaryLight,

      justifyContent:
        'center',

      alignItems:
        'center',

      marginRight: 9,
    },

    highlightText: {
      flex: 1,

      color: COLORS.text,

      fontSize: 12.5,

      lineHeight: 17,
    },

    primaryButton: {
      marginTop: 18,

      backgroundColor:
        COLORS.primary,

      borderRadius: 12,

      paddingHorizontal: 18,
      paddingVertical: 12,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    primaryButtonText: {
      color: '#FFFFFF',

      fontSize: 13.5,

      fontWeight: '800',
    },

    currentPlanButton: {
      marginTop: 18,

      backgroundColor:
        COLORS.successBg,

      borderRadius: 12,

      paddingVertical: 12,

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#BBF7D0',
    },

    currentPlanButtonText: {
      color:
        COLORS.success,

      fontSize: 13.5,

      fontWeight: '800',
    },

    disabledButton: {
      opacity: 0.55,
    },

    paymentCard: {
      marginTop: 22,

      padding: 18,

      borderRadius: 18,

      backgroundColor:
        COLORS.card,

      borderWidth: 2,

      borderColor:
        COLORS.primarySoft,
    },

    paymentTitleRow: {
      flexDirection: 'row',

      alignItems:
        'center',

      gap: 10,
    },

    paymentTitle: {
      color: COLORS.text,

      fontSize: 17,

      fontWeight: '800',
    },

    paymentSubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontSize: 11.5,
    },

    selectedPlanSummary: {
      marginTop: 16,

      padding: 13,

      borderRadius: 12,

      backgroundColor:
        COLORS.primaryLight,
    },

    summaryLabel: {
      color:
        COLORS.muted,

      fontSize: 11,
    },

    summaryValue: {
      color:
        COLORS.text,

      fontWeight: '800',

      fontSize: 15,

      marginTop: 3,
    },

    summaryPrice: {
      color:
        COLORS.primary,

      fontWeight: '800',

      fontSize: 14,

      marginTop: 2,
    },

    instructionText: {
      marginTop: 15,

      color:
        COLORS.muted,

      fontSize: 12,

      lineHeight: 18,
    },

    accountDetails: {
      marginTop: 12,

      backgroundColor:
        '#F9FAFB',

      borderRadius: 12,

      padding: 14,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',
    },

    accountLabel: {
      color:
        COLORS.muted,

      fontSize: 10.5,

      textTransform:
        'uppercase',

      letterSpacing: 0.4,
    },

    accountValue: {
      marginTop: 4,

      color:
        COLORS.text,

      fontWeight: '800',

      fontSize: 14,
    },

    accountDivider: {
      height: 1,

      backgroundColor:
        '#E5E7EB',

      marginVertical: 12,
    },

    referenceLabel: {
      marginTop: 16,

      color:
        COLORS.text,

      fontSize: 12.5,

      fontWeight: '700',
    },

    referenceInput: {
      marginTop: 7,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 12,

      backgroundColor:
        '#FFFFFF',

      color: COLORS.text,

      paddingHorizontal: 13,

      paddingVertical: 12,

      fontSize: 13.5,
    },

    referenceHelp: {
      marginTop: 6,

      color:
        COLORS.muted,

      fontSize: 10.5,

      lineHeight: 15,
    },

    submitButton: {
      marginTop: 18,

      backgroundColor:
        COLORS.primary,

      borderRadius: 12,

      paddingVertical: 13,

      justifyContent:
        'center',

      alignItems:
        'center',
    },

    submitButtonText: {
      color: '#FFFFFF',

      fontSize: 13,

      fontWeight: '800',

      textAlign:
        'center',
    },

    changePlanButton: {
      marginTop: 12,

      alignItems:
        'center',
    },

    changePlanText: {
      color:
        COLORS.primary,

      fontSize: 12.5,

      fontWeight: '700',
    },

    cancelButton: {
      marginTop: 24,

      alignItems:
        'center',

      paddingVertical: 10,
    },

    cancelButtonText: {
      color:
        COLORS.danger,

      fontSize: 13,

      fontWeight: '700',
    },

    footerText: {
      marginTop: 18,

      color:
        COLORS.muted,

      fontSize: 10.5,

      lineHeight: 16,

      textAlign:
        'center',

      paddingHorizontal: 12,
    },
  });