import {
  CampaignUsage,
  cancelVendorCampaign,
  getMyVendorCampaigns,
  getVendorCampaignUsage,
  VendorCampaign,
} from "@/services/vendorCampaignApi";
import { getSubscriptionAccessState } from "@/services/getSubscriptionAccessState";
import { getUserData } from "@/store";
import {
  SubscriptionAccessState,
  SubscriptionPlan,
} from "@/types/subscription.types";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  router,
  useFocusEffect,
} from "expo-router";
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#7D0C72";
const PRIMARY_DARK = "#5E0A55";
const TEXT = "#2B1730";
const MUTED = "#8E7C93";
const BACKGROUND = "#FBF6FA";

type CampaignStatusConfig = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  text: string;
};

const getCampaignStatusConfig = (
  status: VendorCampaign["status"],
): CampaignStatusConfig => {
  switch (status) {
    case "active":
      return {
        label: "Active",
        icon: "radio-button-on",
        background: "#E4F7EA",
        text: "#20884E",
      };

    case "approved":
      return {
        label: "Approved",
        icon: "checkmark-circle",
        background: "#E6F4FF",
        text: "#2774A8",
      };

    case "pending":
      return {
        label: "Pending Review",
        icon: "time",
        background: "#FFF2D8",
        text: "#A66A00",
      };

    case "rejected":
      return {
        label: "Rejected",
        icon: "close-circle",
        background: "#FDE8EC",
        text: "#C43B54",
      };

        case "expired":
      return {
        label: "Expired",
        icon: "hourglass",
        background: "#EEE9EF",
        text: "#786A7C",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        icon: "ban",
        background: "#F1EDF2",
        text: "#746A76",
      };

    case "draft":
    default:
      return {
        label: "Draft",
        icon: "document-text",
        background: "#F0E9F3",
        text: "#765F7D",
      };
  }
};

const formatDate = (value?: string) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getPlanLabel = (
  access: SubscriptionAccessState | null,
) => {
  if (!access) {
    return "Subscription";
  }

  switch (access.effectivePlan) {
    case SubscriptionPlan.PREMIUM:
      return "Premium";

    case SubscriptionPlan.GROWTH:
      return "Growth";

    case SubscriptionPlan.BASIC:
      return "Basic";

    default:
      return "Basic";
  }
};

export default function VendorCampaignsIndex() {
  const insets = useSafeAreaInsets();

  const [vendorId, setVendorId] =
    useState<string | null>(null);

  const [campaigns, setCampaigns] =
    useState<VendorCampaign[]>([]);

  const [usage, setUsage] =
    useState<CampaignUsage | null>(null);

  const [subscriptionAccess, setSubscriptionAccess] =
    useState<SubscriptionAccessState | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

    const [cancellingCampaignId, setCancellingCampaignId] =
  useState<string | null>(null);

  const loadCampaignData = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const user = await getUserData();

        if (!user?._id) {
          setVendorId(null);
          setCampaigns([]);
          setUsage(null);
          setSubscriptionAccess(null);

          setError(
            "Vendor account information could not be found.",
          );

          return;
        }

        const currentVendorId = user._id;

        setVendorId(currentVendorId);

        /*
         * Subscription is loaded first because Basic/Trial vendors
         * may not have campaign access.
         */
        const access =
          await getSubscriptionAccessState(
            currentVendorId,
          );

        setSubscriptionAccess(access);

        /*
         * My Campaigns history should remain visible even if the
         * vendor later downgrades or their subscription expires.
         */
        const campaignsRequest =
          getMyVendorCampaigns(currentVendorId);

        /*
         * Usage endpoint is still requested independently.
         * If campaign entitlement is unavailable and the backend
         * returns 0/0, UI will correctly show the locked state.
         */
        const usageRequest =
          getVendorCampaignUsage(currentVendorId);

        const results = await Promise.allSettled([
          campaignsRequest,
          usageRequest,
        ]);

        const campaignResult = results[0];
        const usageResult = results[1];

        if (
          campaignResult.status === "fulfilled"
        ) {
          setCampaigns(
            Array.isArray(campaignResult.value)
              ? campaignResult.value
              : [],
          );
        } else {
          console.error(
            "Unable to load vendor campaigns:",
            campaignResult.reason,
          );

          setCampaigns([]);
        }

        if (usageResult.status === "fulfilled") {
          setUsage(usageResult.value);
        } else {
          console.error(
            "Unable to load campaign usage:",
            usageResult.reason,
          );

          setUsage(null);
        }

        if (
          campaignResult.status === "rejected" &&
          usageResult.status === "rejected"
        ) {
          setError(
            "Unable to load campaign information. Please try again.",
          );
        }
      } catch (loadError) {
        console.error(
          "Campaign screen load error:",
          loadError,
        );

        setError(
          "Unable to load campaign information. Please try again.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadCampaignData(true);
    }, [loadCampaignData]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampaignData(false);
  }, [loadCampaignData]);

  const isGrowthOrPremium = useMemo(() => {
    if (!subscriptionAccess) {
      return false;
    }

    return (
      subscriptionAccess.effectivePlan ===
        SubscriptionPlan.GROWTH ||
      subscriptionAccess.effectivePlan ===
        SubscriptionPlan.PREMIUM
    );
  }, [subscriptionAccess]);

  const monthlyLimit =
    usage?.limit ?? 0;

  const monthlyUsed =
    usage?.used ?? 0;

  const remaining =
    usage?.remaining ?? 0;

  const campaignLimitReached =
    usage !== null &&
    !usage.canCreate;

  const canCreateCampaign =
    Boolean(vendorId) &&
    isGrowthOrPremium &&
    usage !== null &&
    usage.canCreate;

  const usagePercentage = useMemo(() => {
    if (monthlyLimit <= 0) {
      return 0;
    }

    return Math.min(
      (monthlyUsed / monthlyLimit) * 100,
      100,
    );
  }, [monthlyLimit, monthlyUsed]);

  const activeCount = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.status === "active",
      ).length,
    [campaigns],
  );

  const pendingCount = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.status === "pending",
      ).length,
    [campaigns],
  );

  const totalImpressions = useMemo(
    () =>
      campaigns.reduce(
        (sum, campaign) =>
          sum +
          Number(campaign.impressions || 0),
        0,
      ),
    [campaigns],
  );

  const handleCreateCampaign = () => {
    if (!vendorId) {
      Alert.alert(
        "Unable to Continue",
        "Vendor ID could not be found.",
      );

      return;
    }

    if (!isGrowthOrPremium) {
      Alert.alert(
        "Upgrade Required",
        "Campaign Ads are available on Growth and Premium plans.",
        [
          {
            text: "Not Now",
            style: "cancel",
          },
          {
            text: "View Plans",
            onPress: () =>
              router.push({
                pathname: "/subscriptionscreen",
                params: {
                  vendorId,
                },
              }),
          },
        ],
      );

      return;
    }

    if (!usage) {
      Alert.alert(
        "Please Try Again",
        "Campaign usage information is still unavailable.",
      );

      return;
    }

    if (campaignLimitReached) {
      Alert.alert(
        "Monthly Limit Reached",
        `You have used all ${monthlyLimit} campaign${
          monthlyLimit === 1 ? "" : "s"
        } available for this month.`,
        [
          {
            text: "OK",
            style: "cancel",
          },
          {
            text: "View Plans",
            onPress: () =>
              router.push({
                pathname: "/subscriptionscreen",
                params: {
                  vendorId,
                },
              }),
          },
        ],
      );

      return;
    }

    /*
     * This route will be created in Step 3C.
     */
    router.push({
      pathname: "/createvendorcampaign" as any,
      params: {
        vendorId,
      },
    });
  };

  const handleCancelCampaign = useCallback(
  (campaign: VendorCampaign) => {
    if (!vendorId) {
      Alert.alert(
        "Unable to Continue",
        "Vendor ID could not be found.",
      );
      return;
    }

    if (
      campaign.status === "cancelled" ||
      campaign.status === "expired" ||
      campaign.status === "rejected"
    ) {
      return;
    }

    const actionLabel =
      campaign.status === "pending"
        ? "Cancel Submission"
        : campaign.status === "active"
          ? "Stop Campaign"
          : "Cancel Campaign";

    const message =
      campaign.status === "pending"
        ? "Cancel this campaign submission? It will remain in your campaign history and will still count toward this month's campaign limit."
        : "Stop this campaign? It will no longer be shown to clients. Its history and analytics will be preserved, and it will still count toward this month's campaign limit.";

    Alert.alert(
      actionLabel,
      message,
      [
        {
          text: "Keep Campaign",
          style: "cancel",
        },
        {
          text: actionLabel,
          style: "destructive",
          onPress: async () => {
            try {
              setCancellingCampaignId(campaign._id);

              await cancelVendorCampaign(
                vendorId,
                campaign._id,
              );

              await loadCampaignData(false);
            } catch (cancelError: any) {
              console.error(
                "Campaign cancellation error:",
                cancelError,
              );

              Alert.alert(
                "Unable to Update Campaign",
                cancelError?.message ||
                  "The campaign could not be updated. Please try again.",
              );
            } finally {
              setCancellingCampaignId(null);
            }
          },
        },
      ],
    );
  },
  [vendorId, loadCampaignData],
);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={PRIMARY_DARK}
        />

        <LinearGradient
          colors={[
            "#8A0F7C",
            PRIMARY_DARK,
          ]}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingLogo}>
            <Ionicons
              name="megaphone"
              size={30}
              color="#FFFFFF"
            />
          </View>

          <ActivityIndicator
            size="large"
            color="#FFFFFF"
            style={{
              marginTop: 22,
            }}
          />

          <Text style={styles.loadingTitle}>
            Marketing & Campaigns
          </Text>

          <Text style={styles.loadingSubtitle}>
            Loading your campaign workspace...
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PRIMARY_DARK}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Math.max(insets.bottom, 16) + 30,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* HEADER */}

        <LinearGradient
          colors={[
            "#8A0F7C",
            PRIMARY_DARK,
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={[
            styles.header,
            {
              paddingTop:
                insets.top + 12,
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View
              style={
                styles.headerTitleContainer
              }
            >
              <Text style={styles.headerTitle}>
                Marketing & Campaigns
              </Text>

              <Text
                style={styles.headerSubtitle}
              >
                Promote your best packages
              </Text>
            </View>

            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.8}
              onPress={handleRefresh}
            >
              <Ionicons
                name="refresh"
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.headerHero}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="megaphone"
                size={28}
                color={PRIMARY}
              />
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>
                {getPlanLabel(
                  subscriptionAccess,
                )}{" "}
                Marketing
              </Text>

              <Text style={styles.heroTitle}>
                Turn your packages into
                campaigns
              </Text>

              <Text style={styles.heroDescription}>
                Reach more clients with
                sponsored package promotions.
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ERROR */}

        {error ? (
          <View style={styles.errorCard}>
            <View
              style={styles.errorIconContainer}
            >
              <Ionicons
                name="alert-circle"
                size={22}
                color="#D13E59"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>
                Something went wrong
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                loadCampaignData(true)
              }
              style={styles.retryButton}
            >
              <Text
                style={styles.retryButtonText}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* BASIC / LOCKED PLAN */}

        {!isGrowthOrPremium ? (
          <View style={styles.section}>
            <LinearGradient
              colors={[
                "#F7EAF8",
                "#F1E1F4",
              ]}
              style={styles.upgradeCard}
            >
              <View
                style={styles.upgradeIconWrap}
              >
                <Ionicons
                  name="lock-closed"
                  size={24}
                  color={PRIMARY}
                />
              </View>

              <View
                style={styles.upgradeContent}
              >
                <View
                  style={
                    styles.upgradeLabelRow
                  }
                >
                  <Text
                    style={styles.upgradeTitle}
                  >
                    Campaign Ads
                  </Text>

                  <View
                    style={
                      styles.upgradeBadge
                    }
                  >
                    <Text
                      style={
                        styles.upgradeBadgeText
                      }
                    >
                      GROWTH+
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.upgradeDescription
                  }
                >
                  Promote existing packages
                  and reach more relevant
                  clients with Growth or
                  Premium.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={
                    styles.upgradeButton
                  }
                  onPress={() => {
                    if (!vendorId) {
                      return;
                    }

                    router.push({
                      pathname:
                        "/subscriptionscreen",
                      params: {
                        vendorId,
                      },
                    });
                  }}
                >
                  <Ionicons
                    name="rocket-outline"
                    size={17}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.upgradeButtonText
                    }
                  >
                    View Growth Plans
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <>
            {/* USAGE */}

            <View style={styles.section}>
              <View
                style={styles.sectionHeadingRow}
              >
                <View>
                  <Text
                    style={styles.sectionTitle}
                  >
                    Monthly Campaigns
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Your campaign allowance
                    this month
                  </Text>
                </View>

                <View style={styles.planBadge}>
                  <Ionicons
                    name={
                      subscriptionAccess
                        ?.effectivePlan ===
                      SubscriptionPlan.PREMIUM
                        ? "diamond"
                        : "rocket"
                    }
                    size={13}
                    color={PRIMARY}
                  />

                  <Text
                    style={
                      styles.planBadgeText
                    }
                  >
                    {getPlanLabel(
                      subscriptionAccess,
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.usageCard}>
                <View
                  style={styles.usageTopRow}
                >
                  <View>
                    <Text
                      style={styles.usageLabel}
                    >
                      Campaigns used
                    </Text>

                    <View
                      style={
                        styles.usageValueRow
                      }
                    >
                      <Text
                        style={
                          styles.usageValue
                        }
                      >
                        {monthlyUsed}
                      </Text>

                      <Text
                        style={
                          styles.usageLimit
                        }
                      >
                        {" "}
                        / {monthlyLimit}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.remainingBubble,
                      remaining === 0 &&
                        styles.remainingBubbleFull,
                    ]}
                  >
                    <Text
                      style={[
                        styles.remainingValue,
                        remaining === 0 &&
                          styles.remainingValueFull,
                      ]}
                    >
                      {remaining}
                    </Text>

                    <Text
                      style={[
                        styles.remainingLabel,
                        remaining === 0 &&
                          styles.remainingLabelFull,
                      ]}
                    >
                      remaining
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.progressBackground
                  }
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${usagePercentage}%`,
                      },
                    ]}
                  />
                </View>

                <View
                  style={styles.usageFooter}
                >
                  <Ionicons
                    name={
                      remaining > 0
                        ? "checkmark-circle"
                        : "information-circle"
                    }
                    size={16}
                    color={
                      remaining > 0
                        ? "#258A52"
                        : "#B46C17"
                    }
                  />

                  <Text
                    style={[
                      styles.usageFooterText,
                      {
                        color:
                          remaining > 0
                            ? "#258A52"
                            : "#B46C17",
                      },
                    ]}
                  >
                    {remaining > 0
                      ? `${remaining} campaign${
                          remaining === 1
                            ? ""
                            : "s"
                        } available this month`
                      : "Monthly campaign limit reached"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={
                  !canCreateCampaign
                }
                onPress={
                  handleCreateCampaign
                }
                style={[
                  styles.createButton,
                  !canCreateCampaign &&
                    styles.createButtonDisabled,
                ]}
              >
                <LinearGradient
                  colors={
                    canCreateCampaign
                      ? [
                          "#8A0F7C",
                          "#640080",
                        ]
                      : [
                          "#D8CCD7",
                          "#C9BDC8",
                        ]
                  }
                  start={{
                    x: 0,
                    y: 0,
                  }}
                  end={{
                    x: 1,
                    y: 1,
                  }}
                  style={
                    styles.createButtonGradient
                  }
                >
                  <View
                    style={
                      styles.createButtonIcon
                    }
                  >
                    <Ionicons
                      name={
                        canCreateCampaign
                          ? "add"
                          : "lock-closed"
                      }
                      size={21}
                      color={
                        canCreateCampaign
                          ? PRIMARY
                          : "#8C808A"
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.createButtonTitle,
                        !canCreateCampaign && {
                          color:
                            "#665D65",
                        },
                      ]}
                    >
                      {campaignLimitReached
                        ? "Monthly Limit Reached"
                        : "Create New Campaign"}
                    </Text>

                    <Text
                      style={[
                        styles.createButtonSubtitle,
                        !canCreateCampaign && {
                          color:
                            "#817780",
                        },
                      ]}
                    >
                      {campaignLimitReached
                        ? "More campaigns become available next month"
                        : "Promote one of your existing packages"}
                    </Text>
                  </View>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={
                      canCreateCampaign
                        ? "#FFFFFF"
                        : "#817780"
                    }
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* QUICK STATS */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Campaign Overview
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                Performance at a glance
              </Text>

              <View style={styles.statsRow}>
                <CampaignStat
                  icon="radio-button-on"
                  value={activeCount}
                  label="Active"
                  background="#E6F6EC"
                  iconColor="#258A52"
                />

                <CampaignStat
                  icon="time"
                  value={pendingCount}
                  label="Pending"
                  background="#FFF2D9"
                  iconColor="#B27316"
                />

                <CampaignStat
                  icon="eye"
                  value={totalImpressions}
                  label="Views"
                  background="#F0E5FA"
                  iconColor={PRIMARY}
                />
              </View>
            </View>
          </>
        )}

        {/* MY CAMPAIGNS */}

        <View style={styles.section}>
          <View style={styles.campaignHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                My Campaigns
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                {campaigns.length > 0
                  ? `${campaigns.length} campaign${
                      campaigns.length === 1
                        ? ""
                        : "s"
                    } created`
                  : "Your campaign history"}
              </Text>
            </View>

            {campaigns.length > 0 ? (
              <View
                style={
                  styles.campaignCountBadge
                }
              >
                <Text
                  style={
                    styles.campaignCountText
                  }
                >
                  {campaigns.length}
                </Text>
              </View>
            ) : null}
          </View>

          {campaigns.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="megaphone-outline"
                  size={34}
                  color={PRIMARY}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No campaigns yet
              </Text>

              <Text style={styles.emptyText}>
                {isGrowthOrPremium
                  ? "Create your first campaign and promote an existing package to more clients."
                  : "Your campaign history will appear here when you start using Campaign Ads."}
              </Text>

              {canCreateCampaign ? (
                <TouchableOpacity
                  style={
                    styles.emptyCreateButton
                  }
                  activeOpacity={0.85}
                  onPress={
                    handleCreateCampaign
                  }
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.emptyCreateButtonText
                    }
                  >
                    Create First Campaign
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            campaigns.map((campaign) => (
              <CampaignCard
  key={campaign._id}
  campaign={campaign}
  onCancel={handleCancelCampaign}
  isCancelling={
    cancellingCampaignId === campaign._id
  }
/>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const CampaignStat = ({
  icon,
  value,
  label,
  background,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  background: string;
  iconColor: string;
}) => {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor: background,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={iconColor}
        />
      </View>

      <Text style={styles.statValue}>
        {value.toLocaleString()}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
};

const CampaignCard = ({
  campaign,
  onCancel,
  isCancelling,
}: {
  campaign: VendorCampaign;
  onCancel: (campaign: VendorCampaign) => void;
  isCancelling: boolean;
}) => {
  const status =
  getCampaignStatusConfig(
    campaign.status,
  );

const canCancel =
  campaign.status === "pending" ||
  campaign.status === "approved" ||
  campaign.status === "active" ||
  campaign.status === "draft";

const actionLabel =
  campaign.status === "pending"
    ? "Cancel Submission"
    : campaign.status === "active"
      ? "Stop Campaign"
      : "Cancel Campaign";

return (
    <View style={styles.campaignCard}>
      <View
        style={styles.campaignImageContainer}
      >
        {campaign.image ? (
          <Image
            source={{
              uri: campaign.image,
            }}
            style={styles.campaignImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.campaignImageFallback
            }
          >
            <Ionicons
              name="image-outline"
              size={28}
              color="#B89FBA"
            />
          </View>
        )}

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                status.background,
            },
          ]}
        >
          <Ionicons
            name={status.icon}
            size={12}
            color={status.text}
          />

          <Text
            style={[
              styles.statusBadgeText,
              {
                color: status.text,
              },
            ]}
          >
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.campaignBody}>
        <Text
          style={styles.campaignTitle}
          numberOfLines={2}
        >
          {campaign.title}
        </Text>

        {campaign.offerLabel ? (
          <View style={styles.offerPill}>
            <Ionicons
              name="pricetag"
              size={12}
              color={PRIMARY}
            />

            <Text
              style={styles.offerPillText}
              numberOfLines={1}
            >
              {campaign.offerLabel}
            </Text>
          </View>
        ) : null}

        <Text
          style={styles.campaignDescription}
          numberOfLines={2}
        >
          {campaign.description}
        </Text>

        <View style={styles.dateContainer}>
          <View style={styles.dateItem}>
            <View style={styles.dateIcon}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={PRIMARY}
              />
            </View>

            <View>
              <Text
                style={styles.dateLabel}
              >
                Starts
              </Text>

              <Text
                style={styles.dateValue}
              >
                {formatDate(
                  campaign.startDate,
                )}
              </Text>
            </View>
          </View>

          <Ionicons
            name="arrow-forward"
            size={14}
            color="#B5A4B7"
          />

          <View style={styles.dateItem}>
            <View style={styles.dateIcon}>
              <Ionicons
                name="flag-outline"
                size={14}
                color={PRIMARY}
              />
            </View>

            <View>
              <Text
                style={styles.dateLabel}
              >
                Ends
              </Text>

              <Text
                style={styles.dateValue}
              >
                {formatDate(
                  campaign.endDate,
                )}
              </Text>
            </View>
          </View>
        </View>

        {campaign.status ===
          "rejected" &&
        campaign.rejectionReason ? (
          <View style={styles.rejectionBox}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color="#C43B54"
            />

            <Text
              style={
                styles.rejectionText
              }
            >
              {campaign.rejectionReason}
            </Text>
          </View>
        ) : null}

        {canCancel ? (
  <TouchableOpacity
    activeOpacity={0.8}
    disabled={isCancelling}
    onPress={() => onCancel(campaign)}
    style={[
      styles.campaignActionButton,
      isCancelling &&
        styles.campaignActionButtonDisabled,
    ]}
  >
    {isCancelling ? (
      <ActivityIndicator
        size="small"
        color="#B23A4B"
      />
    ) : (
      <Ionicons
        name={
          campaign.status === "active"
            ? "stop-circle-outline"
            : "close-circle-outline"
        }
        size={18}
        color="#B23A4B"
      />
    )}

    <Text style={styles.campaignActionButtonText}>
      {isCancelling
        ? "Updating..."
        : actionLabel}
    </Text>
  </TouchableOpacity>
) : null}

<View style={styles.metricsDivider} />

<View style={styles.metricsRow}>
          <CampaignMetric
            icon="eye-outline"
            value={
              campaign.impressions || 0
            }
            label="Impressions"
          />

          <View
            style={styles.metricDivider}
          />

          <CampaignMetric
            icon="finger-print-outline"
            value={campaign.clicks || 0}
            label="Clicks"
          />

          <View
            style={styles.metricDivider}
          />

          <CampaignMetric
            icon="cube-outline"
            value={
              campaign.packageVisits || 0
            }
            label="Visits"
          />
        </View>
      </View>
    </View>
  );
};

const CampaignMetric = ({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) => {
  return (
    <View style={styles.metric}>
      <Ionicons
        name={icon}
        size={15}
        color={PRIMARY}
      />

      <Text style={styles.metricValue}>
        {Number(value).toLocaleString()}
      </Text>

      <Text style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
};

const { width: SCREEN_WIDTH } =
  Dimensions.get("window");

const CONTENT_MAX_WIDTH = 720;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: PRIMARY_DARK,
  },

  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  loadingLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 18,
    textAlign: "center",
  },

  loadingSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },

  header: {
    paddingHorizontal:
      SCREEN_WIDTH < 360 ? 16 : 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize:
      SCREEN_WIDTH < 360 ? 17 : 19,
    fontWeight: "800",
    textAlign: "center",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },

  headerHero: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.13)",
    borderRadius: 22,
    padding:
      SCREEN_WIDTH < 360 ? 14 : 17,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  heroContent: {
    flex: 1,
  },

  heroEyebrow: {
    color: "#F2D5F3",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize:
      SCREEN_WIDTH < 360 ? 16 : 18,
    lineHeight: 23,
    fontWeight: "800",
    marginTop: 3,
  },

  heroDescription: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 4,
  },

  section: {
    paddingHorizontal:
      SCREEN_WIDTH < 360 ? 16 : 20,
    marginTop: 24,
  },

  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  sectionTitle: {
    fontSize:
      SCREEN_WIDTH < 360 ? 16 : 18,
    fontWeight: "800",
    color: TEXT,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
    marginBottom: 14,
  },

  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F2E4F4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  planBadgeText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "800",
  },

  usageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding:
      SCREEN_WIDTH < 360 ? 16 : 19,
    borderWidth: 1,
    borderColor: "#F0E3EF",
    ...cardShadow(),
  },

  usageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  usageLabel: {
    fontSize: 12,
    color: MUTED,
    fontWeight: "600",
  },

  usageValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },

  usageValue: {
    fontSize: 32,
    fontWeight: "900",
    color: TEXT,
  },

  usageLimit: {
    fontSize: 18,
    fontWeight: "700",
    color: "#A692A9",
  },

  remainingBubble: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: "#EDF8F1",
    alignItems: "center",
  },

  remainingBubbleFull: {
    backgroundColor: "#FFF1E3",
  },

  remainingValue: {
    color: "#258A52",
    fontSize: 17,
    fontWeight: "900",
  },

  remainingValueFull: {
    color: "#B46C17",
  },

  remainingLabel: {
    color: "#5E9C75",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 1,
  },

  remainingLabelFull: {
    color: "#B88750",
  },

  progressBackground: {
    height: 9,
    backgroundColor: "#F1E9F1",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 18,
  },

  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 10,
  },

  usageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
  },

  usageFooterText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 6,
    flex: 1,
  },

  createButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 14,
    ...cardShadow(0.12),
  },

  createButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },

  createButtonGradient: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  createButtonIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  createButtonTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  createButtonSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10.5,
    marginTop: 3,
    paddingRight: 8,
  },

  statsRow: {
    flexDirection: "row",
    gap: SCREEN_WIDTH < 360 ? 7 : 10,
  },

  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1E7F0",
    ...cardShadow(0.04),
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT,
    marginTop: 8,
  },

  statLabel: {
    color: MUTED,
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },

  campaignHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  campaignCountBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: "#F1E3F2",
    alignItems: "center",
    justifyContent: "center",
  },

  campaignCountText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "800",
  },

  campaignCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0E5EF",
    ...cardShadow(0.07),
  },

  campaignImageContainer: {
    width: "100%",
    height:
      SCREEN_WIDTH < 360 ? 155 : 180,
    backgroundColor: "#F4EAF4",
    position: "relative",
  },

  campaignImage: {
    width: "100%",
    height: "100%",
  },

  campaignImageFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },

  campaignBody: {
    padding:
      SCREEN_WIDTH < 360 ? 14 : 17,
  },

  campaignTitle: {
    color: TEXT,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },

  offerPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5E7F5",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
    maxWidth: "100%",
  },

  offerPillText: {
    color: PRIMARY,
    fontSize: 10.5,
    fontWeight: "700",
    flexShrink: 1,
  },

  campaignDescription: {
    color: "#77667B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },

  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FCF8FC",
    borderRadius: 15,
    padding: 11,
    marginTop: 14,
  },

  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  dateIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F3E5F3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 7,
  },

  dateLabel: {
    color: "#A08EA4",
    fontSize: 9,
    fontWeight: "600",
  },

  dateValue: {
    color: TEXT,
    fontSize:
      SCREEN_WIDTH < 360 ? 10 : 11,
    fontWeight: "700",
    marginTop: 1,
  },

  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF0F2",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },

  rejectionText: {
    flex: 1,
    color: "#B73C52",
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 7,
  },

  campaignActionButton: {
  minHeight: 44,
  marginTop: 14,
  borderRadius: 13,
  borderWidth: 1,
  borderColor: "#F1CDD3",
  backgroundColor: "#FFF5F6",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  paddingHorizontal: 14,
  paddingVertical: 10,
},

campaignActionButtonDisabled: {
  opacity: 0.6,
},

campaignActionButtonText: {
  color: "#B23A4B",
  fontSize: 11.5,
  fontWeight: "800",
},

  metricsDivider: {
    height: 1,
    backgroundColor: "#F0E7F0",
    marginVertical: 14,
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },

  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#EEE5EE",
  },

  metricValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },

  metricLabel: {
    color: MUTED,
    fontSize:
      SCREEN_WIDTH < 360 ? 8.5 : 9.5,
    marginTop: 1,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0E4EF",
    ...cardShadow(0.05),
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#F4E5F4",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 15,
  },

  emptyText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 330,
  },

  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: PRIMARY,
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 17,
  },

  emptyCreateButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  upgradeCard: {
    flexDirection: "row",
    borderRadius: 22,
    padding: 17,
    borderWidth: 1,
    borderColor: "#EAD4EB",
    ...cardShadow(0.06),
  },

  upgradeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  upgradeContent: {
    flex: 1,
  },

  upgradeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  upgradeTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },

  upgradeBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  upgradeBadgeText: {
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "900",
  },

  upgradeDescription: {
    color: "#746278",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 6,
  },

  upgradeButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 13,
  },

  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F2",
    marginHorizontal:
      SCREEN_WIDTH < 360 ? 16 : 20,
    marginTop: 20,
    borderRadius: 17,
    padding: 13,
    borderWidth: 1,
    borderColor: "#F6D6DC",
  },

  errorIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  errorTitle: {
    color: "#A62D43",
    fontSize: 12,
    fontWeight: "800",
  },

  errorText: {
    color: "#A95C69",
    fontSize: 10.5,
    marginTop: 2,
  },

  retryButton: {
    marginLeft: 8,
    backgroundColor: "#D13E59",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});

function cardShadow(
  opacity = 0.08,
) {
  return Platform.select({
    ios: {
      shadowColor: "#4B234D",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: opacity,
      shadowRadius: 12,
    },

    android: {
      elevation:
        opacity >= 0.1 ? 5 : 3,
    },

    default: {},
  }) as any;
}