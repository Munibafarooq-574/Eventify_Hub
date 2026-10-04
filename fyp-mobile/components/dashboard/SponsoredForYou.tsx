// fyp-mobile/components/dashboard/SponsoredForYou.tsx

import {
  recordCampaignClick,
  recordCampaignImpression,
} from "@/services/campaignAnalytics";
import getSponsoredCampaigns, {
  SponsoredCampaign,
} from "@/services/getSponsoredCampaigns";
import { Ionicons } from "@expo/vector-icons";
import getMarketplaceEventContext from "@/services/getMarketplaceEventContext";
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
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
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

/*
 * ---- Auto-scroll / carousel geometry ----
 *
 * CARD_WIDTH must match styles.card.width below.
 * CARD_MARGIN must match styles.card.marginRight below.
 * ITEM_SIZE is the horizontal distance from one card's start
 * to the next card's start.
 */
const CARD_WIDTH = 300;
const CARD_MARGIN = 12;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

const AUTO_SCROLL_INTERVAL_MS = 3000; // 3 sec

const SECTION_TITLE = "Promoted Picks";
const MODAL_TITLE = "All Promotions";
const PAGE_BG = "#FDF0F7";
const ALL_LIMIT = 100; // View All mein max kitne campaigns

const SponsoredForYou: React.FC = () => {
  const [campaigns, setCampaigns] = useState<
    SponsoredCampaign[]
  >([]);

  const [loading, setLoading] =
    useState<boolean>(true);

 const [modalVisible, setModalVisible] = useState(false);
const [allCampaigns, setAllCampaigns] = useState<SponsoredCampaign[]>([]);
const [allLoading, setAllLoading] = useState(false);

  const flatListRef =
    useRef<FlatList<SponsoredCampaign> | null>(
      null,
    );

  /*
   * Tracks which card is currently considered "active"
   * (centered) for the auto-scroll carousel. Kept in a ref
   * (not state) so the interval callback always reads the
   * latest value without needing to be recreated every tick.
   */
  const currentIndexRef = useRef<number>(0);

  /*
   * Holds the running auto-scroll timer so it can be cleared
   * and restarted (e.g. when the user manually scrolls).
   */
  const autoScrollTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

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

   const {
  discoveryCityId,
  categoryIds,
} = await getMarketplaceEventContext();

    const result =
    await getSponsoredCampaigns({
      eventCityId:
      discoveryCityId,
      categoryIds,
      limit: 4,
    });

    setCampaigns(
      Array.isArray(result)
        ? result.slice(0, 4)
        : [],
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

  /*
   * ---- Auto-scroll carousel ----
   *
   * Advances to the next card every AUTO_SCROLL_INTERVAL_MS,
   * scrolling it to the horizontal center of the screen.
   * Loops back to the first card after the last one.
   */
  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();

    if (campaigns.length <= 1) {
      // Nothing to rotate between.
      return;
    }

    autoScrollTimerRef.current = setInterval(
      () => {
        const nextIndex =
          (currentIndexRef.current + 1) %
          campaigns.length;

        currentIndexRef.current = nextIndex;

        flatListRef.current?.scrollToOffset({
          offset: nextIndex * ITEM_SIZE,
          animated: true,
        });

        // Re-check visibility so impressions still fire
        // correctly for the newly-centered card.
        setTimeout(() => {
          checkAllCampaignVisibility();
        }, 350);
      },
      AUTO_SCROLL_INTERVAL_MS,
    );
  }, [
    campaigns.length,
    stopAutoScroll,
    checkAllCampaignVisibility,
  ]);

  // (Re)start the auto-scroll loop whenever the campaign list
  // changes, and always clean up on unmount.
  useEffect(() => {
    if (loading || campaigns.length === 0) {
      return;
    }

    currentIndexRef.current = 0;
    startAutoScroll();

    return () => {
      stopAutoScroll();
    };
  }, [
    campaigns,
    loading,
    startAutoScroll,
    stopAutoScroll,
  ]);

  useEffect(() => {
  if (modalVisible) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
}, [modalVisible, startAutoScroll, stopAutoScroll]);

  /*
   * User has touched the list — pause auto-scroll so it
   * doesn't fight with their manual swipe.
   */
  const handleScrollBeginDrag =
    useCallback(() => {
      stopAutoScroll();
    }, [stopAutoScroll]);

  /*
   * List has settled after a manual scroll (drag release or
   * momentum finish). Sync currentIndexRef to wherever the
   * user actually landed, re-check visibility, then resume
   * the auto-scroll loop from that position.
   */
  const handleListScrollEnd = useCallback(
    (
      event:
        NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
      const offsetX =
        event.nativeEvent.contentOffset.x;

      const nearestIndex = Math.round(
        offsetX / ITEM_SIZE,
      );

      const clampedIndex = Math.max(
        0,
        Math.min(
          nearestIndex,
          Math.max(campaigns.length - 1, 0),
        ),
      );

      currentIndexRef.current = clampedIndex;

      setTimeout(() => {
        checkAllCampaignVisibility();
      }, 100);

      // Resume auto-rotation from the card the user left on.
      startAutoScroll();
    },
    [
      campaigns.length,
      checkAllCampaignVisibility,
      startAutoScroll,
    ],
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
  fromModal: boolean = false,
) => {
  if (fromModal) setModalVisible(false);

  if (shouldRecordClick(campaign._id)) {
    recordCampaignClick(campaign._id).catch(() => {});
  }

  stopAutoScroll();

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

const openViewAll = async () => {
  stopAutoScroll();
  setModalVisible(true);
  setAllLoading(true);

  try {
    const { discoveryCityId, categoryIds } =
      await getMarketplaceEventContext();

    const result = await getSponsoredCampaigns({
      eventCityId: discoveryCityId,
      categoryIds,
      limit: ALL_LIMIT,
    });

    setAllCampaigns(Array.isArray(result) ? result : campaigns);
  } catch (error) {
    console.error("Failed to load all campaigns:", error);
    setAllCampaigns(campaigns);
  } finally {
    setAllLoading(false);
  }
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

const renderCardBody = (item: SponsoredCampaign, fullWidth: boolean) => {
  const packageName = item.package?.packageName || "Package";
  const price = Number(item.package?.price || 0);

  return (
    <TouchableOpacity
      style={[styles.card, fullWidth && styles.cardFull]}
      activeOpacity={0.9}
      onPress={() => openCampaign(item, fullWidth)}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: item.image || item.package?.images?.[0] }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.adTag}>
          <Text style={styles.adTagText}>Ad</Text>
        </View>

        {!!item.offerLabel && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText} numberOfLines={1}>
              {item.offerLabel}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons
            name="storefront-outline"
            size={11}
            color="rgba(255,255,255,0.78)"
          />
          <Text style={styles.vendorName} numberOfLines={1}>
            {item.brandName || item.vendorName}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.price} numberOfLines={1}>
            {price > 0 ? `Rs ${price.toLocaleString()}` : packageName}
          </Text>

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View</Text>
            <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const renderCampaign = ({ item }: { item: SponsoredCampaign }) => (
  <View
    ref={(ref) => {
      campaignCardRefs.current[item._id] = ref;
    }}
    collapsable={false}
    onLayout={() => {
      setTimeout(() => {
        checkCampaignVisibility(item._id);
      }, 100);
    }}
  >
    {renderCardBody(item, false)}
  </View>
);

const renderModalCampaign = ({ item }: { item: SponsoredCampaign }) =>
  renderCardBody(item, true);

return (
  <View style={styles.container}>
    {/* Header: Special Offers jaisa */}
    <View style={styles.sectionHeader}>
      <View style={styles.headerLeft}>
        <View style={styles.headerAccent} />
        <Text style={styles.sectionTitle}>{SECTION_TITLE}</Text>
      </View>

      <TouchableOpacity activeOpacity={0.7} onPress={openViewAll}>
        <Text style={styles.viewAllText}>View All</Text>
      </TouchableOpacity>
    </View>

    <FlatList
      ref={flatListRef}
      data={campaigns}
      horizontal
      keyExtractor={(item) => item._id}
      renderItem={renderCampaign}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      snapToInterval={ITEM_SIZE}
      snapToAlignment="start"
      decelerationRate="fast"
      getItemLayout={(_, index) => ({
        length: ITEM_SIZE,
        offset: ITEM_SIZE * index,
        index,
      })}
      onScrollBeginDrag={handleScrollBeginDrag}
      onMomentumScrollEnd={handleListScrollEnd}
      onScrollEndDrag={handleListScrollEnd}
    />

    {/* View All: All Offers jaisi screen */}
    <Modal
      visible={modalVisible}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.headerSide} />

          <View style={styles.modalTitleWrap}>
            <Text style={styles.modalTitle}>{MODAL_TITLE}</Text>
            <View style={styles.titleUnderline} />
            <Text style={styles.modalSubtitle}>
              {allLoading
                ? "Loading promotions..."
                : `${allCampaigns.length} promotions available`}
            </Text>
          </View>

          <View style={[styles.headerSide, styles.headerSideRight]}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {allLoading ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={allCampaigns}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalList}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No promotions available</Text>
            }
            renderItem={renderModalCampaign}
          />
        )}
      </View>
    </Modal>
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
  },

  list: {
    paddingVertical: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textDark,
    letterSpacing: 0.3,
  },

  viewAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    paddingRight: 8,
  },
headerLeft: {
  flexDirection: "row",
  alignItems: "center",
},
headerAccent: {
  width: 5,
  height: 24,
  borderRadius: 3,
  backgroundColor: COLORS.primary,
  marginRight: 10,
},
cardFull: {
  width: "100%",
  marginRight: 0,
},

/* View All modal */
modalContainer: {
  flex: 1,
  backgroundColor: PAGE_BG,
  paddingTop: Platform.OS === "ios" ? 54 : (StatusBar.currentHeight ?? 24) + 8,
},
modalHeader: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingTop: 6,
  paddingBottom: 14,
  marginBottom: 6,
  backgroundColor: "#FFFFFF",
  borderBottomWidth: 1,
  borderBottomColor: "#F3DCE8",
  borderBottomLeftRadius: 24,
  borderBottomRightRadius: 24,
  elevation: 3,
  shadowColor: "#6B1E4F",
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
},
headerSide: {
  width: 44,
},
headerSideRight: {
  alignItems: "flex-end",
},
modalTitleWrap: {
  flex: 1,
  alignItems: "center",
},
modalTitle: {
  fontSize: 22,
  fontWeight: "800",
  color: "#6B1E4F",
  letterSpacing: 0.5,
  textAlign: "center",
},
titleUnderline: {
  width: 36,
  height: 3,
  borderRadius: 2,
  backgroundColor: "#D4A85A",
  marginTop: 4,
},
modalSubtitle: {
  fontSize: 12,
  color: "#8B7688",
  marginTop: 4,
  textAlign: "center",
},
closeBtn: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "#FBF2F8",
  borderWidth: 1,
  borderColor: "#F3DCE8",
  alignItems: "center",
  justifyContent: "center",
},
closeText: {
  fontSize: 16,
  fontWeight: "700",
  color: "#6B1E4F",
},
modalList: {
  paddingHorizontal: 20,
  paddingTop: 6,
  paddingBottom: 40,
},
modalLoading: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
},
emptyText: {
  textAlign: "center",
  color: "#8B7688",
  marginTop: 40,
  fontSize: 14,
},
  card: {
    width: CARD_WIDTH,
    height: 200,
    marginRight: CARD_MARGIN,
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