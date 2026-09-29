import {
  recordCampaignClick,
  recordCampaignImpression,
} from "@/services/campaignAnalytics";
import getSponsoredCampaigns, {
  SponsoredCampaign,
  SponsoredCampaignsPage,
} from "@/services/getSponsoredCampaigns";
import getMarketplaceEventContext from "@/services/getMarketplaceEventContext";
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
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PAGE_SIZE = 10;

const impressedCampaignIds = new Set<string>();

const SponsoredCampaignsViewAll = () => {
  const [campaigns, setCampaigns] = useState<
    SponsoredCampaign[]
  >([]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] =
    useState(false);

  const loadingMoreRef = useRef(false);

  const getContext =
  useCallback(async () => {
  const {
  discoveryCityId,
  categoryIds,
} =
  await getMarketplaceEventContext();

return {
  eventCityId:
    discoveryCityId,
  categoryIds,
};
  }, []);

  const loadPage = useCallback(
    async (
      targetPage: number,
      append: boolean,
    ) => {
      if (
        append &&
        loadingMoreRef.current
      ) {
        return;
      }

      try {
        if (append) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const context = await getContext();

        const result =
          (await getSponsoredCampaigns({
            ...context,
            page: targetPage,
            limit: PAGE_SIZE,
            viewAll: true,
          })) as SponsoredCampaignsPage;

        setCampaigns((current) =>
          append
            ? [
                ...current,
                ...result.items.filter(
                  (item) =>
                    !current.some(
                      (existing) =>
                        existing._id ===
                        item._id,
                    ),
                ),
              ]
            : result.items,
        );

        setPage(targetPage);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error(
          "Sponsored campaigns page error:",
          error,
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [getContext],
  );

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const openCampaign = (
    campaign: SponsoredCampaign,
  ) => {
    recordCampaignClick(
      campaign._id,
    ).catch(() => {});

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

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: any) => {
      viewableItems.forEach(({ item }: any) => {
        const campaignId = item?._id;

        if (
          !campaignId ||
          impressedCampaignIds.has(
            campaignId,
          )
        ) {
          return;
        }

        impressedCampaignIds.add(
          campaignId,
        );

        recordCampaignImpression(
          campaignId,
        ).catch(() => {
          impressedCampaignIds.delete(
            campaignId,
          );
        });
      });
    },
  ).current;

  const viewabilityConfig =
    useRef({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 500,
    }).current;

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loader}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#2A1B25"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Sponsored For You
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item._id}
        contentContainerStyle={
          styles.listContent
        }
        onViewableItemsChanged={
          onViewableItemsChanged
        }
        viewabilityConfig={
          viewabilityConfig
        }
        onEndReached={() => {
          if (
            hasMore &&
            !loadingMoreRef.current
          ) {
            loadPage(page + 1, true);
          }
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No sponsored campaigns available.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              style={styles.footerLoader}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const price = Number(
            item.package?.price || 0,
          );

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() =>
                openCampaign(item)
              }
            >
              <Image
                source={{
                  uri:
                    item.image ||
                    item.package?.images?.[0],
                }}
                style={styles.image}
                resizeMode="cover"
              />

              <View style={styles.adTag}>
                <Text style={styles.adTagText}>
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

              <View style={styles.details}>
                <Text
                  style={styles.title}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <Text
                  style={styles.vendor}
                  numberOfLines={1}
                >
                  {item.brandName ||
                    item.vendorName}
                </Text>

                <Text style={styles.price}>
                  {price > 0
                    ? `Rs ${price.toLocaleString()}`
                    : item.package
                        ?.packageName ||
                      "Package"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF2F8",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#2A1B25",
  },

  headerSpacer: {
    width: 40,
  },

  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  card: {
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#F3E8EF",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  details: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    padding: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  vendor: {
    color: "#FFFFFF",
    fontSize: 11,
    marginTop: 4,
  },

  price: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 7,
  },

  adTag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor:
      "rgba(255,255,255,0.85)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  adTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#3A3A3A",
  },

  offerBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#D4A657",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  offerText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  footerLoader: {
    marginVertical: 16,
  },

  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },

  emptyText: {
    color: "#8B7688",
    fontSize: 14,
  },
});

export default SponsoredCampaignsViewAll;