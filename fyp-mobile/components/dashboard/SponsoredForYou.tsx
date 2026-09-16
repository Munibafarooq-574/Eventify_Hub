// fyp-mobile/components/dashboard/SponsoredForYou.tsx

import {
  recordCampaignClick,
  recordCampaignImpression,
} from "@/services/campaignAnalytics";
import getSponsoredCampaigns, {
  SponsoredCampaign,
} from "@/services/getSponsoredCampaigns";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  primary: "#6B1E4F",
  accent: "#D4A657",
  textMuted: "#8B7688",
  textDark: "#2A1B25",
  soft: "#F3E8EF",
  cardBg: "#FFFFFF",
  border: "#EFE3EC",
  overlayDark: "rgba(0,0,0,0.45)",
  adTagBg: "rgba(255,255,255,0.85)",
  adTagText: "#3A3A3A",
};

/*
 * Session-level impression dedupe.
 *
 * This lives outside the component, so navigating away from the
 * dashboard and returning during the same JS/app session does not
 * count the same campaign again.
 */
const impressedCampaignIds = new Set<string>();

/*
 * Minimum time (ms) that must pass between two genuine clicks on
 * the SAME campaign before a new click is counted.
 *
 * This exists only to protect against accidental double-taps /
 * rapid repeated taps (e.g. finger bounce, fast double press).
 * A real second visit minutes/hours/days later is NOT affected —
 * it is always counted as a fresh, genuine click.
 */
const CLICK_DEBOUNCE_MS = 1500;

const SponsoredForYou: React.FC = () => {
  const [campaigns, setCampaigns] = useState<
    SponsoredCampaign[]
  >([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  /*
   * Keep refs for every rendered campaign card.
   * These refs let us measure the card's actual position
   * on the device screen.
   */
  const campaignCardRefs = useRef<
    Record<string, View | null>
  >({});

  /*
   * Prevent delayed impression timers from being created
   * repeatedly for the same campaign.
   */
  const pendingImpressionIds = useRef<
    Set<string>
  >(new Set());

  /*
   * Click debounce tracking.
   *
   * Maps campaignId -> timestamp (ms) of the last genuine click
   * that was accepted. A new tap on the same campaign within
   * CLICK_DEBOUNCE_MS of the last accepted tap is treated as an
   * accidental double-tap and is ignored for analytics purposes
   * (navigation itself is unaffected either way).
   */
  const lastClickTimestamps = useRef<
    Record<string, number>
  >({});

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);

      const result =
        await getSponsoredCampaigns();

      setCampaigns(
        Array.isArray(result) ? result : [],
      );
    } catch (error) {
      console.error(
        "Sponsored campaigns error:",
        error,
      );

      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  /*
   * Record one impression for the whole current app session.
   */
  const sendImpression = useCallback(
    (campaignId: string) => {
      if (
        !campaignId ||
        impressedCampaignIds.has(campaignId)
      ) {
        return;
      }

      /*
       * Mark before API request so multiple layout/scroll
       * callbacks cannot create duplicate impressions.
       */
      impressedCampaignIds.add(campaignId);

      console.log(
        "[Campaign Analytics] Sending impression:",
        campaignId,
      );

      recordCampaignImpression(
        campaignId,
      ).catch(() => {
        /*
         * If the request fails, allow a later genuine
         * visibility event to retry.
         */
        impressedCampaignIds.delete(
          campaignId,
        );
      });
    },
    [],
  );

  /*
   * Check whether a campaign card is actually visible
   * inside the device viewport.
   *
   * We require at least 50% of the card width to be
   * horizontally visible.
   */
  const checkCampaignVisibility = useCallback(
    (campaignId: string) => {
      if (
        !campaignId ||
        impressedCampaignIds.has(campaignId) ||
        pendingImpressionIds.current.has(
          campaignId,
        )
      ) {
        return;
      }

      const card =
        campaignCardRefs.current[campaignId];

      if (!card) {
        return;
      }

      card.measureInWindow(
        (
          x,
          y,
          width,
          height,
        ) => {
          if (
            width <= 0 ||
            height <= 0
          ) {
            return;
          }

          const screenWidth =
            Dimensions.get("window").width;

          const screenHeight =
            Dimensions.get("window").height;

          /*
           * Calculate how much of the card is visible
           * horizontally.
           */
          const visibleLeft = Math.max(
            x,
            0,
          );

          const visibleRight = Math.min(
            x + width,
            screenWidth,
          );

          const visibleWidth = Math.max(
            0,
            visibleRight - visibleLeft,
          );

          const horizontalVisiblePercent =
            (visibleWidth / width) * 100;

          /*
           * Also make sure the card exists vertically
           * inside the current screen.
           */
          const verticallyVisible =
            y < screenHeight &&
            y + height > 0;

          if (
            horizontalVisiblePercent < 50 ||
            !verticallyVisible
          ) {
            return;
          }

          /*
           * Require the campaign to remain visible for
           * approximately 500ms before counting it.
           */
          pendingImpressionIds.current.add(
            campaignId,
          );

          setTimeout(() => {
            pendingImpressionIds.current.delete(
              campaignId,
            );

            const latestCard =
              campaignCardRefs.current[
                campaignId
              ];

            if (
              !latestCard ||
              impressedCampaignIds.has(
                campaignId,
              )
            ) {
              return;
            }

            latestCard.measureInWindow(
              (
                latestX,
                latestY,
                latestWidth,
                latestHeight,
              ) => {
                if (
                  latestWidth <= 0 ||
                  latestHeight <= 0
                ) {
                  return;
                }

                const latestScreenWidth =
                  Dimensions.get(
                    "window",
                  ).width;

                const latestScreenHeight =
                  Dimensions.get(
                    "window",
                  ).height;

                const latestVisibleLeft =
                  Math.max(
                    latestX,
                    0,
                  );

                const latestVisibleRight =
                  Math.min(
                    latestX +
                      latestWidth,
                    latestScreenWidth,
                  );

                const latestVisibleWidth =
                  Math.max(
                    0,
                    latestVisibleRight -
                      latestVisibleLeft,
                  );

                const latestPercent =
                  (latestVisibleWidth /
                    latestWidth) *
                  100;

                const latestVerticallyVisible =
                  latestY <
                    latestScreenHeight &&
                  latestY +
                    latestHeight >
                    0;

                if (
                  latestPercent >= 50 &&
                  latestVerticallyVisible
                ) {
                  sendImpression(
                    campaignId,
                  );
                }
              },
            );
          }, 500);
        },
      );
    },
    [sendImpression],
  );

  /*
   * Check all currently rendered cards.
   *
   * Used after campaign loading and after horizontal
   * scrolling.
   */
  const checkAllCampaignVisibility =
    useCallback(() => {
      campaigns.forEach((campaign) => {
        checkCampaignVisibility(
          campaign._id,
        );
      });
    }, [
      campaigns,
      checkCampaignVisibility,
    ]);

  /*
   * Campaign cards are rendered after the API response.
   * Give React Native a short moment to finish layout,
   * then inspect actual visibility.
   */
  useEffect(() => {
    if (
      loading ||
      campaigns.length === 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      checkAllCampaignVisibility();
    }, 700);

    return () => {
      clearTimeout(timer);
    };
  }, [
    campaigns,
    loading,
    checkAllCampaignVisibility,
  ]);

  const handleListScrollEnd = useCallback(
    (
      _event:
        NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
      /*
       * Wait until the horizontal list settles before
       * checking which campaign is actually visible.
       */
      setTimeout(() => {
        checkAllCampaignVisibility();
      }, 100);
    },
    [checkAllCampaignVisibility],
  );

  /*
   * Decide whether a tap on this campaign should count as a
   * genuine click for analytics.
   *
   * Returns true (and records the timestamp) the first time a
   * campaign is tapped, and every time afterwards as long as
   * CLICK_DEBOUNCE_MS has passed since the last accepted tap.
   * Returns false for a rapid repeated tap inside that window,
   * so it does not get double-counted.
   */
  const shouldRecordClick = useCallback(
    (campaignId: string) => {
      const now = Date.now();

      const lastClickAt =
        lastClickTimestamps.current[
          campaignId
        ];

      if (
        lastClickAt &&
        now - lastClickAt <
          CLICK_DEBOUNCE_MS
      ) {
        return false;
      }

      lastClickTimestamps.current[
        campaignId
      ] = now;

      return true;
    },
    [],
  );

  const openCampaign = (
    campaign: SponsoredCampaign,
  ) => {
    /*
     * A click is independent from an impression.
     * Do not await analytics because navigation should
     * remain instant even if the API is slow.
     *
     * Debounce guards only the analytics call — navigation
     * always happens on every tap, so the app never feels
     * unresponsive even if a tap is skipped for counting.
     */
    if (shouldRecordClick(campaign._id)) {
      recordCampaignClick(
        campaign._id,
      ).catch(() => {});
    }

    router.push({
      pathname: "/vendorprofiledetails",
      params: {
        id: campaign.vendorId,
        openTab: "Packages",
        packageId: campaign.packageId,
        campaignId: campaign._id,
        source: "sponsored",
        bookingMode: "browse",
      },
    });
  };

  /*
   * While loading, render nothing visible rather than a
   * labeled placeholder — a banner strip either shows real
   * banners or is simply absent, the same way it behaves on
   * Noon/Daraz while their promo carousel is still fetching.
   */
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBanner}>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
          />
        </View>
      </View>
    );
  }

  /*
   * Do not leave an empty banner strip on the
   * Client Dashboard.
   */
  if (campaigns.length === 0) {
    return null;
  }

  const renderCampaign = ({
    item,
  }: {
    item: SponsoredCampaign;
  }) => {
    const packageName =
      item.package?.packageName ||
      "Package";

    const price = Number(
      item.package?.price || 0,
    );

    return (
      <View
        ref={(ref) => {
          campaignCardRefs.current[
            item._id
          ] = ref;
        }}
        collapsable={false}
        onLayout={() => {
          /*
           * onLayout confirms that the native card exists.
           * Small delay lets its final window position settle.
           */
          setTimeout(() => {
            checkCampaignVisibility(
              item._id,
            );
          }, 100);
        }}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() =>
            openCampaign(item)
          }
        >
          {/*
            Image fills the whole card. Only small chips and
            the translucent bottom panel sit on top of it, so
            the picture itself stays visible.
          */}
          <View style={styles.imageWrapper}>
            <Image
              source={{
                uri:
                  item.image ||
                  item.package
                    ?.images?.[0],
              }}
              style={styles.image}
              resizeMode="cover"
            />

            {/*
              Small, unobtrusive "Ad" tag — same idea as
              Daraz/Amazon: it discloses that this is a
              paid placement without shouting about it.
            */}
            <View style={styles.adTag}>
              <Text
                style={styles.adTagText}
              >
                Ad
              </Text>
            </View>

            {!!item.offerLabel && (
              <View
                style={styles.offerBadge}
              >
                <Text
                  style={styles.offerText}
                  numberOfLines={1}
                >
                  {item.offerLabel}
                </Text>
              </View>
            )}
          </View>

          {/*
            Details panel — translucent black over the bottom
            of the image, so text stays readable while the
            artwork still shows through.
          */}
          <View style={styles.details}>
            {/*
              A long campaign title is allowed to wrap onto a
              second line before it gets truncated. The panel is
              anchored to the bottom, so it simply grows upward.
            */}
            <Text
              style={styles.title}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons
                name="storefront-outline"
                size={11}
                color="rgba(255,255,255,0.78)"
              />

              <Text
                style={styles.vendorName}
                numberOfLines={1}
              >
                {item.brandName ||
                  item.vendorName}
              </Text>
            </View>

            <View
              style={styles.bottomRow}
            >
              <Text
                style={styles.price}
                numberOfLines={1}
              >
                {price > 0
                  ? `Rs ${price.toLocaleString()}`
                  : packageName}
              </Text>

              {/*
                "View" is only a visual cue — the whole
                card is one tap target, so analytics stay
                exactly as before.
              */}
              <View
                style={styles.viewButton}
              >
                <Text
                  style={
                    styles.viewButtonText
                  }
                >
                  View
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color="#FFFFFF"
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={campaigns}
        horizontal
        keyExtractor={(item) =>
          item._id
        }
        renderItem={renderCampaign}
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.list
        }
        onMomentumScrollEnd={
          handleListScrollEnd
        }
        onScrollEndDrag={
          handleListScrollEnd
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },

  loadingBanner: {
    height: 200,
    borderRadius: 16,
    backgroundColor: COLORS.soft,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },

  list: {
    paddingHorizontal: 16,
  },

  card: {
    width: 300,
    height: 200,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.soft,
    position: "relative",
  },

  imageWrapper: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.soft,
    position: "relative",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  /*
   * Translucent black panel over the bottom of the image.
   * Anchored to the bottom, so it grows upward when the
   * title needs a second line.
   */
  details: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlayDark,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },

  offerBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    maxWidth: 160,
  },

  offerText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
  },

  /*
   * lineHeight is explicit so two wrapped lines breathe
   * instead of sitting on top of each other.
   */
  title: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },

  vendorName: {
    fontSize: 10.5,
    color: "#FFFFFF",
    flex: 1,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },

  price: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
    marginRight: 8,
  },

  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 2,
  },

  viewButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  adTag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.adTagBg,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },

  adTagText: {
    color: COLORS.adTagText,
    fontSize: 9,
    fontWeight: "700",
  },
});

export default SponsoredForYou;