
import getVendorReviewSummary from "@/services/getVendorReviewSummary";
import searchVendorsWithFilters from "@/services/searchVendorsWithFilters";
import getMarketplaceEventContext from "@/services/getMarketplaceEventContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PAGE_BG = '#FDF0F7';

const COLORS = {
  primary: "#6B1E4F",
  primaryDark: "#4A1436",
  primarySoft: "#F7E7F0",
  card: "#FFFFFF",
  text: "#2B1B26",
  muted: "#8B7688",
  border: "#F3DCE8",
  gold: "#D4A657",
};

const RecommendedForYourEvent: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
    const [allVendors, setAllVendors] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const loadRecommended = useCallback(async () => {
    try {
      setLoading(true);

     const context =
  await getMarketplaceEventContext();

const {
  eventCityId,
  eventDate,
  startTime,
  durationMinutes,
  categoryIds,
} = context;

if (
  !eventCityId ||
  !eventDate ||
  !startTime ||
  !durationMinutes ||
  categoryIds.length === 0
) {
  setVendors([]);
  return;
}

      /*
       * Reuse the existing backend marketplace discovery.
       * Do NOT create a frontend ranking algorithm.
       */
      const resultsPerCategory = await Promise.all(
        categoryIds.map((categoryId: string) =>
          searchVendorsWithFilters({
          categoryId,
          eventCityId,
          eventDate,
          startTime,
          durationMinutes,
        })
        ),
      );

      /*
       * Preserve backend ordering while removing vendors that
       * matched more than one selected category.
       */
      const uniqueVendorMap = new Map<string, any>();

      resultsPerCategory
        .flat()
        .forEach((vendor: any) => {
          if (
            vendor?._id &&
            !uniqueVendorMap.has(vendor._id)
          ) {
            uniqueVendorMap.set(
              vendor._id,
              vendor,
            );
          }
        });

      const discoveredVendors = Array.from(
        uniqueVendorMap.values(),
      );

      if (discoveredVendors.length === 0) {
        setVendors([]);
        return;
      }

            /*
       * Backend discovery already applies the authoritative
       * package-aware availability engine.
       */
      const recommended =
        discoveredVendors.slice(0, 6);

      setVendors(recommended);
       setAllVendors(discoveredVendors);

      const reviewEntries = await Promise.all(
                discoveredVendors.map(async (vendor: any) => {
          try {
            const summary =
              await getVendorReviewSummary(
                vendor._id,
              );

            return [
              vendor._id,
              summary,
            ] as const;
          } catch {
            return [
              vendor._id,
              {
                averageRating: 0,
                totalReviews: 0,
              },
            ] as const;
          }
        }),
      );

      setReviews(
        Object.fromEntries(reviewEntries),
      );
    } catch (error) {
      console.error(
        "Failed to load recommended vendors:",
        error,
      );

      setVendors([]);
      setReviews({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommended();
  }, [loadRecommended]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
        />
      </View>
    );
  }

  /*
   * No event context / no eligible vendors:
   * do not leave an empty dashboard section.
   */
  if (vendors.length === 0) {
    return null;
  }

    const renderVendorCard = (vendor: any, fullWidth: boolean) => {
    const review = reviews[vendor._id];

    const rating = Number(review?.averageRating ?? 0).toFixed(1);

    const brandName =
      vendor?.contactDetails?.brandName ||
      vendor?.ContactDetails?.brandName ||
      vendor?.name ||
      "Vendor";

    const image =
      vendor?.contactDetails?.brandLogo ||
      vendor?.ContactDetails?.brandLogo ||
      vendor?.coverImage ||
      vendor?.images?.[0];

    const subscriptionBadge =
      vendor?.marketplaceSubscription?.subscriptionBadge;

    const isPremium = subscriptionBadge === "Premium";
    const isGrowth = subscriptionBadge === "Growth";

    return (
      <TouchableOpacity
        key={vendor._id}
        activeOpacity={0.85}
        style={[styles.card, fullWidth && styles.cardFull]}
        onPress={() => {
          if (fullWidth) setModalVisible(false);
          router.push({
            pathname: "/vendorprofiledetails",
            params: {
              id: vendor._id,
              openTab: "Packages",
              bookingMode: "event",
            },
          });
        }}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons
              name="storefront-outline"
              size={28}
              color={COLORS.primary}
            />
          </View>
        )}

        <View style={styles.nameRow}>
          <Text style={styles.vendorName} numberOfLines={1}>
            {brandName}
          </Text>

          {isPremium ? (
            <View style={[styles.badge, styles.premiumBadge]}>
              <Ionicons name="diamond-outline" size={10} color="#7A4B00" />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          ) : isGrowth ? (
            <View style={[styles.badge, styles.growthBadge]}>
              <Ionicons
                name="trending-up-outline"
                size={10}
                color={COLORS.primary}
              />
              <Text style={styles.growthBadgeText}>Growth</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={COLORS.gold} />
          <Text style={styles.rating}>{rating}</Text>
          <Text style={styles.reviewCount}>
            ({review?.totalReviews ?? 0})
          </Text>
        </View>

        <View style={styles.availableRow}>
          <Ionicons name="checkmark-circle" size={13} color="#25855A" />
          <Text style={styles.availableText}>Available</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.hdrRow}>
        <View style={styles.hdrLeft}>
          <View style={styles.hdrAccent} />
          <Text style={styles.hdrTitle}>Recommended for Your Event</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.hdrViewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {vendors.map((vendor: any) => renderVendorCard(vendor, false))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.mContainer}>
          <View style={styles.mHeader}>
            <View style={styles.mSide} />

            <View style={styles.mTitleWrap}>
              <Text style={styles.mTitle}>Recommended</Text>
              <View style={styles.mUnderline} />
              <Text style={styles.mSubtitle}>
                {allVendors.length} vendors available
              </Text>
            </View>

            <View style={[styles.mSide, styles.mSideRight]}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
                style={styles.mClose}
              >
                <Text style={styles.mCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={allVendors}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mList}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
            ListEmptyComponent={
              <Text style={styles.mEmpty}>No vendors available</Text>
            }
            renderItem={({ item }) => renderVendorCard(item, true)}
          />
        </View>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },

    hdrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hdrLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hdrAccent: {
    width: 5,
    height: 24,
    borderRadius: 3,
    backgroundColor: '#6B1E4F',
    marginRight: 10,
  },
  hdrTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B1B26',
    letterSpacing: 0.3,
  },
  hdrViewAll: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B1E4F',
    paddingRight: 8,
  },
  
    mContainer: {
    flex: 1,
    backgroundColor: PAGE_BG,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8,
  },
  mHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3DCE8',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: '#6B1E4F',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  mSide: { width: 44 },
  mSideRight: { alignItems: 'flex-end' },
  mTitleWrap: { flex: 1, alignItems: 'center' },
  mTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6B1E4F',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  mUnderline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4A85A',
    marginTop: 4,
  },
  mSubtitle: {
    fontSize: 12,
    color: '#8B7688',
    marginTop: 4,
    textAlign: 'center',
  },
  mClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBF2F8',
    borderWidth: 1,
    borderColor: '#F3DCE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mCloseText: { fontSize: 16, fontWeight: '700', color: '#6B1E4F' },
  mList: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 },
  mLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mEmpty: { textAlign: 'center', color: '#8B7688', marginTop: 40, fontSize: 14 },
  cardFull: { width: '100%', marginRight: 0 },
  
  header: {
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  titleAccent: {
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
    marginTop: 5,
  },

  list: {
    gap: 12,
    paddingRight: 4,
  },

  card: {
    width: 180,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  image: {
    width: "100%",
    height: 105,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: COLORS.primarySoft,
  },

  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  vendorName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },

  premiumBadge: {
    backgroundColor: "#FFF3D6",
  },

  premiumBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#7A4B00",
  },

  growthBadge: {
    backgroundColor: COLORS.primarySoft,
  },

  growthBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.primary,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  rating: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  reviewCount: {
    marginLeft: 3,
    fontSize: 11,
    color: COLORS.muted,
  },

  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 4,
  },

  availableText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#25855A",
  },

  loading: {
    paddingVertical: 20,
    alignItems: "center",
  },
});

export default RecommendedForYourEvent;