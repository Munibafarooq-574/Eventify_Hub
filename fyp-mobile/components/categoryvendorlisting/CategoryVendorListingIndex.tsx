// fyp-mobile/app/categoryvendorlisting.tsx
// -----------------------------------------------------------------------
// Redesigned for a warmer, more "celebratory event marketplace" feel,
// and made fully responsive across iOS / Android screen sizes
// (small phones, tall phones, tablets) using a scale() helper + SafeAreaView.
// -----------------------------------------------------------------------

import getAllVendorsByCategoryId from "@/services/getAllVendorsByCategoryId";
import searchVendorsWithFilters from "@/services/searchVendorsWithFilters";
import checkVendorsAvailability from "@/services/checkVendorsAvailability";
import getVendorReviewSummary from "@/services/getVendorReviewSummary";
import { getVendorPackagesList } from "@/services/getVendorPackagesList";
import { getSecureData } from "@/store";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  PixelRatio,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// -----------------------------------------------------------------------
// Responsive scaling helpers
// Base design was done on a 375pt-wide screen (iPhone standard baseline).
// scale() adapts font sizes / spacing proportionally to the device width,
// clamped so things don't blow up on tablets or shrink too much on small
// phones (e.g. iPhone SE, small Android devices).
// -----------------------------------------------------------------------
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BASE_WIDTH = 375;
const MAX_SCALE = 1.25;
const MIN_SCALE = 0.85;

function scale(size: number) {
  const ratio = SCREEN_WIDTH / BASE_WIDTH;
  const clamped = Math.min(Math.max(ratio, MIN_SCALE), MAX_SCALE);
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
}

const isSmallScreen = SCREEN_WIDTH < 360;

// -----------------------------------------------------------------------
// Palette — kept the brand's plum/maroon + blush-pink identity, but tuned
// for better contrast, a warmer gold accent for ratings, and clearer
// hierarchy between text tones.
// -----------------------------------------------------------------------
const COLORS = {
  bg: "#FBF1F5",
  card: "#FFFFFF",
  primary: "#780C60",
  primaryDark: "#5C0A49",
  primarySoft: "#F4E3ED",
  gold: "#E3A008",
  success: "#1E9E5A",
  successSoft: "#E7F7EE",
  ink: "#241723",
  inkMuted: "#8A7A87",
  border: "#F0DDE9",
  placeholder: "#B9A9B4",
};

export default function App() {
  const [data, setData] = useState<any>([]);
  const [headerTitle, setHeaderTitle] = useState<string>("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vendorReviews, setVendorReviews] = useState<Record<string, any>>({});
  const [vendorPackages, setVendorPackages] = useState<Record<string, any[]>>({});
  const [loadingVendorDetails, setLoadingVendorDetails] = useState(false);
  const [eventTiming, setEventTiming] = useState<{
  eventDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
} | null>(null);
    const routeParams = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryIdToName, setCategoryIdToName] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
    fetchCategoryName();
  }, []);

  // -------------------------------------------------------
  // Read saved event details (date/time/duration)
  // -------------------------------------------------------
  const getEventTimingParams = async () => {
    const raw = await getSecureData("eventDetails");
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);

      if (!parsed.eventDate || !parsed.startTime || !parsed.durationMinutes) {
        return null;
      }

      const dateOnly = new Date(parsed.eventDate).toISOString().split("T")[0];

      const [hours, minutes] = parsed.startTime
  .split(":")
  .map(Number);

const startDateTime = new Date(parsed.eventDate);
startDateTime.setHours(hours, minutes, 0, 0);

const endDateTime = new Date(
  startDateTime.getTime() +
    parsed.durationMinutes * 60 * 1000
);

const endHours = endDateTime
  .getHours()
  .toString()
  .padStart(2, "0");

const endMinutes = endDateTime
  .getMinutes()
  .toString()
  .padStart(2, "0");

return {
  eventDate: dateOnly,
  startTime: parsed.startTime,
  durationMinutes: parsed.durationMinutes,
  endTime: `${endHours}:${endMinutes}`,
};
    } catch (error) {
      console.error("Error parsing eventDetails:", error);
      return null;
    }
  };

  const formatTime = (time?: string) => {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

  const fetchData = async () => {
  try {
    // -----------------------------------------
    // 1. Multiple category IDs route params se lo
    // -----------------------------------------
    const categoryIdsRaw = Array.isArray(routeParams?.categoryIds)
      ? routeParams.categoryIds[0]
      : routeParams?.categoryIds;

        let categoryIds: string[] = [];

    try {
      categoryIds = categoryIdsRaw ? JSON.parse(categoryIdsRaw) : [];
    } catch (error) {
      console.error("Error parsing categoryIds:", error);
      categoryIds = [];
    }

    // -----------------------------------------
    // Category ID -> Name map (for per-card category display)
    // -----------------------------------------
    const categoryNamesRaw = Array.isArray(routeParams?.categoryNames)
      ? routeParams.categoryNames[0]
      : routeParams?.categoryNames;

    try {
      const names: string[] = categoryNamesRaw
        ? JSON.parse(categoryNamesRaw)
        : [];

      const idToName: Record<string, string> = {};
      categoryIds.forEach((id, index) => {
        if (names[index]) {
          idToName[id] = names[index];
        }
      });

      setCategoryIdToName(idToName);
    } catch (error) {
      console.error("Error parsing categoryNames:", error);
    }

    // -----------------------------------------
    // 2. Old/single category flow ka fallback
    // -----------------------------------------
    if (categoryIds.length === 0) {
      const singleCategoryId = await getSecureData("categoryId");

      if (singleCategoryId) {
        categoryIds = [singleCategoryId];
      }
    }

    console.log("Category IDs:", categoryIds);

    // -----------------------------------------
    // 3. Filters
    // -----------------------------------------
    const city = Array.isArray(routeParams?.city)
      ? routeParams.city[0]
      : routeParams?.city;

    const staff = Array.isArray(routeParams?.staff)
      ? routeParams.staff[0]
      : routeParams?.staff;

    const cancellationPolicy = Array.isArray(
      routeParams?.cancellationPolicy
    )
      ? routeParams.cancellationPolicy[0]
      : routeParams?.cancellationPolicy;

    const minRatingStr = Array.isArray(routeParams?.minRating)
      ? routeParams.minRating[0]
      : routeParams?.minRating;

    const filters = {
      name: searchQuery || undefined,
      city: city || undefined,
      staff: staff || undefined,
      cancellationPolicy: cancellationPolicy || undefined,
      minRating: minRatingStr
        ? parseInt(minRatingStr, 10)
        : undefined,
    };

    // -----------------------------------------
    // 4. Har category ke vendors fetch karo
    // -----------------------------------------
    const resultsPerCategory = await Promise.all(
  categoryIds.map(async (catId) => {
    const vendors = await searchVendorsWithFilters({
      ...filters,
      categoryId: catId,
    });

    return (vendors || []).map((vendor: any) => ({
      ...vendor,
      _matchedCategoryId: catId,
    }));
  })
);

    // -----------------------------------------
    // 5. Saare category results merge karo
    // -----------------------------------------
    const mergedResults = resultsPerCategory.flat();

    // -----------------------------------------
    // 6. Duplicate vendors remove karo
    //    agar same vendor multiple categories
    //    mein available ho
    // -----------------------------------------
    const uniqueVendorsMap = new Map<string, any>();

    mergedResults.forEach((vendor: any) => {
      if (vendor?._id) {
        uniqueVendorsMap.set(vendor._id, vendor);
      }
    });

    const vendorResults = Array.from(uniqueVendorsMap.values());

    console.log("Total vendors after merge:", vendorResults.length);

    // -----------------------------------------
    // 7. Event timing nikalo
    // -----------------------------------------
    const timing = await getEventTimingParams();
    setEventTiming(timing);

    // Agar timing nahi hai ya vendors nahi mile
    if (!timing || !vendorResults.length) {
      setData(vendorResults);
      return;
    }

    // -----------------------------------------
    // 8. Availability check
    // -----------------------------------------
    setCheckingAvailability(true);

    try {
      const vendorIds = vendorResults.map(
        (vendor: any) => vendor._id
      );

      const availabilityResults =
        await checkVendorsAvailability({
          vendorIds,
          eventDate: timing.eventDate,
          startTime: timing.startTime,
          durationMinutes: timing.durationMinutes,
        });

      // -----------------------------------------
      // 9. Sirf available vendor IDs nikalo
      // -----------------------------------------
      const availableIds = new Set(
        (availabilityResults ?? [])
          .filter((result: any) => result.available)
          .map((result: any) => result.vendorId)
      );

      // -----------------------------------------
      // 10. Sirf available vendors show karo
      // -----------------------------------------
      const availableVendors = vendorResults.filter(
        (vendor: any) => availableIds.has(vendor._id)
      );

      console.log(
        "Available vendors:",
        availableVendors.length
      );

      setData(availableVendors);

      // -----------------------------------------
      // 11. Reviews + packages etc.
      // -----------------------------------------
      fetchVendorDetails(availableVendors);

    } catch (error) {
      console.error(
        "Error checking vendor availability:",
        error
      );

      setData([]);
    } finally {
      setCheckingAvailability(false);
    }

  } catch (error) {
    console.error("Error fetching vendors:", error);
    setData([]);
  }
};

  const fetchVendorDetails = async (vendors: any[]) => {
    try {
      setLoadingVendorDetails(true);

      const reviewsMap: Record<string, any> = {};
      const packagesMap: Record<string, any[]> = {};

      await Promise.all(
        vendors.map(async (vendor: any) => {
          try {
            const reviewSummary = await getVendorReviewSummary(vendor._id);
            reviewsMap[vendor._id] = reviewSummary;
          } catch (error) {
            console.error(`Failed to load reviews for vendor ${vendor._id}:`, error);
            reviewsMap[vendor._id] = { averageRating: 0, totalReviews: 0 };
          }

          try {
            const packages = await getVendorPackagesList(vendor._id);
            packagesMap[vendor._id] = packages || [];
          } catch (error) {
            console.error(`Failed to load packages for vendor ${vendor._id}:`, error);
            packagesMap[vendor._id] = [];
          }
        })
      );

      setVendorReviews(reviewsMap);
      setVendorPackages(packagesMap);
    } catch (error) {
      console.error("Failed to load vendor details:", error);
    } finally {
      setLoadingVendorDetails(false);
    }
  };

  const fetchCategoryName = async () => {
  const namesRaw = Array.isArray(routeParams?.categoryNames)
    ? routeParams.categoryNames[0]
    : routeParams?.categoryNames;

  try {
    const names = namesRaw ? JSON.parse(namesRaw) : [];

        if (names.length > 0) {
      setHeaderTitle("Vendors"); // generic title instead of joined category names
      return;
    }
  } catch (error) {
    console.error("Error parsing categoryNames:", error);
  }

  // fallback purana single-category flow
  const categoryName = (await getSecureData("categoryName")) || "Category";
  setHeaderTitle(categoryName);
};

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [searchQuery]);

  const resultsLabel = useMemo(() => {
    const count = data?.length ?? 0;
    if (checkingAvailability) return "";
    return `${count} ${count === 1 ? "vendor" : "vendors"} found`;
  }, [data, checkingAvailability]);

  const renderItem = ({ item }: any) => {
  const review = vendorReviews[item._id];

  const rating = review?.averageRating
    ? Number(review.averageRating).toFixed(1)
    : "0.0";

  const reviewCount = review?.totalReviews || 0;

  const price =
    item?.BusinessDetails?.minimumPrice ||
    item?.BusinessDetails?.minimumPricePerEvent;

  const brandName =
  item?.contactDetails?.brandName ||
  item?.ContactDetails?.brandName ||
  item?.BusinessDetails?.brandName ||
  "Vendor";

  const vendorName =
    item?.name ||
    item?.vendorName ||
    item?.ownerName ||
    "Vendor";

    const categoryName =
  item?.buisnessCategory?.name ||
  item?.buisnessCategory?.categoryName ||
  item?.category?.name ||
  item?.categoryName ||
  item?.serviceName ||
  categoryIdToName[item?._matchedCategoryId] ||
  "Category";

  const city =
    item?.contactDetails?.city ||
    "Pakistan";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() =>
        router.push(
          `/vendorprofiledetails?id=${item._id}`
        )
      }
    >
      {/* ================================================= */}
      {/* TOP SECTION */}
      {/* ================================================= */}

      <View style={styles.cardTopRow}>

        {/* Vendor Image */}
        <Image
  source={{
    uri:
      item?.contactDetails?.brandLogo ||
      item?.ContactDetails?.brandLogo ||
      item?.coverImage ||
      item?.images?.[0] ||
      "https://via.placeholder.com/300",
  }}
  style={styles.image}
/>

        <View style={styles.cardContent}>

          {/* BRAND NAME - BIG */}
          <Text
            style={styles.brandName}
            numberOfLines={1}
          >
            {brandName}
          </Text>

          {/* VENDOR NAME - SMALL */}
          <Text
            style={styles.vendorName}
            numberOfLines={1}
          >
            {vendorName}
          </Text>

          {/* DESIRED SERVICE / CATEGORY */}
          <Text
            style={styles.subtitle}
            numberOfLines={1}
          >
            {categoryName}
          </Text>

          {/* RATING + REVIEWS */}
          <View style={styles.ratingRow}>

            <View style={styles.ratingPill}>
              <Ionicons
                name="star"
                size={scale(12)}
                color={COLORS.gold}
              />

              <Text style={styles.ratingText}>
                {rating}
              </Text>
            </View>

            <Text style={styles.reviewText}>
              ({reviewCount} review
              {reviewCount === 1 ? "" : "s"})
            </Text>

          </View>

          {/* LOCATION */}
          <View style={styles.row}>
            <Ionicons
              name="location-outline"
              size={scale(13)}
              color={COLORS.primary}
            />

            <Text
              style={styles.address}
              numberOfLines={1}
            >
              {city}
            </Text>
          </View>

        </View>
      </View>

      {/* ================================================= */}
      {/* DIVIDER */}
      {/* ================================================= */}

      <View style={styles.cardDivider} />

      {/* ================================================= */}
      {/* AVAILABILITY */}
      {/* ================================================= */}

      <View style={styles.availabilitySection}>

        <View style={styles.availabilityRow}>

          <Ionicons
            name="checkmark-circle"
            size={scale(16)}
            color={COLORS.success}
          />

          <View style={styles.availabilityTextContainer}>

            <Text style={styles.availableText}>
              Available
            </Text>

            {eventTiming && (
              <Text style={styles.selectedTimeText}>
                {eventTiming.eventDate} •{" "}
                {formatTime(eventTiming.startTime)}
                {" - "}
                {formatTime(eventTiming.endTime)}
              </Text>
            )}

          </View>

        </View>

      </View>

      {/* ================================================= */}
      {/* PRICE + VIEW BUTTON */}
      {/* ================================================= */}

      <View style={styles.cardBottomRow}>

        <View style={styles.priceSection}>
          <Text style={styles.priceText}>
            Starting from
          </Text>

          <Text style={styles.price}>
            {price ? `Rs ${price}` : "N/A"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() =>
            router.push(
              `/vendorprofiledetails?id=${item._id}`
            )
          }
        >
          <Text style={styles.viewButtonText}>
            View
          </Text>

          <Ionicons
            name="chevron-forward"
            size={scale(14)}
            color="white"
          />
        </TouchableOpacity>

      </View>

    </TouchableOpacity>
  );
};

  const renderEmptyState = () => {
    if (checkingAvailability) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="calendar-outline" size={scale(34)} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>No vendors match right now</Text>
        <Text style={styles.emptySubtitle}>
          Try adjusting your search or filters, or check a different date and time.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.container}>
                               <View style={styles.header}>
          <TouchableOpacity
            testID="back-button"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={scale(20)} color={COLORS.primary} />
          </TouchableOpacity>
                   <View style={{ flex: 1, alignItems: "center" }}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="storefront-outline" size={scale(15)} color={COLORS.primary} />
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {headerTitle || "Loading..."}
              </Text>
            </View>
            {!!resultsLabel && (
              <View style={styles.headerSubtitleRow}>
                <View style={styles.headerDot} />
                <Text style={styles.headerSubtitle}>{resultsLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={scale(19)}
            color={COLORS.placeholder}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search vendors..."
            style={styles.searchInput}
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            returnKeyType="search"
            onChangeText={setSearchQuery}
            onSubmitEditing={async () => {
              await fetchData();
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                fetchData();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={scale(18)} color={COLORS.placeholder} />
            </TouchableOpacity>
          )}
          <View style={styles.searchDivider} />
          <TouchableOpacity
            testID="filter-button"
            onPress={() => {
              router.push({
                pathname: "/makeupfilter",
                params: { name: searchQuery },
              });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="tune" size={scale(22)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {checkingAvailability && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Checking vendor availability...</Text>
          </View>
        )}

        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.list,
            data?.length === 0 && { flexGrow: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: scale(18),
    paddingTop: Platform.OS === "android" ? scale(12) : scale(4),
  },

   // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(18),
  },
    backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(13),
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerSpacer: {
    width: scale(40) + scale(13), // matches backButton width + its marginRight
  },
    headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  headerIconBadge: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: "800",
    color: COLORS.primaryDark,
    letterSpacing: 0.2,
  },
    headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(4),
    gap: scale(6),
  },
  headerDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(2.5),
    backgroundColor: COLORS.success,
  },
  headerSubtitle: {
    fontSize: scale(12.5),
    color: COLORS.inkMuted,
    fontWeight: "500",
  },

  brandName: {
  fontSize: scale(17),
  fontWeight: "800",
  color: COLORS.primaryDark,
  marginBottom: scale(2),
},

vendorName: {
  fontSize: scale(12),
  color: COLORS.inkMuted,
  marginBottom: scale(4),
},

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: scale(26),
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: scale(8),
  },
  searchIcon: {
    marginRight: scale(2),
  },
  searchInput: {
    flex: 1,
    fontSize: scale(14.5),
    color: COLORS.ink,
    paddingVertical: 0,
  },
  searchDivider: {
    width: 1,
    height: scale(20),
    backgroundColor: COLORS.border,
    marginHorizontal: scale(2),
  },

  // Loading banner
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: scale(14),
    paddingVertical: scale(10),
    marginBottom: scale(14),
    gap: scale(8),
  },
  loadingText: {
    color: COLORS.primaryDark,
    fontSize: scale(12.5),
    fontWeight: "500",
  },

  // List
  list: {
    paddingBottom: scale(24),
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: scale(18),
    padding: scale(14),
    marginBottom: scale(16),
    shadowColor: "#3D0330",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
  },
  image: {
    width: isSmallScreen ? scale(72) : scale(80),
    height: isSmallScreen ? scale(72) : scale(80),
    borderRadius: scale(14),
    marginRight: scale(12),
    backgroundColor: COLORS.primarySoft,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: scale(15.5),
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: scale(3),
  },
  subtitle: {
    fontSize: scale(12.5),
    color: COLORS.inkMuted,
    marginBottom: scale(6),
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(5),
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF3DC",
    borderRadius: scale(8),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    gap: scale(3),
  },
  ratingText: {
    fontSize: scale(12),
    fontWeight: "700",
    color: "#7A5A00",
  },
  reviewText: {
    fontSize: scale(11.5),
    color: COLORS.inkMuted,
    marginLeft: scale(6),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  address: {
    fontSize: scale(12.5),
    color: COLORS.inkMuted,
    marginLeft: scale(4),
  },

  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: scale(12),
  },

  cardBottomRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: scale(8),
},
  availabilityRow: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  backgroundColor: COLORS.successSoft,
  paddingHorizontal: scale(9),
  paddingVertical: scale(7),
  borderRadius: scale(10),
  flexShrink: 1,
},

  availabilitySection: {
  marginBottom: scale(10),
},

availabilityTextContainer: {
  marginLeft: scale(5),
  flexShrink: 1,
},

selectedTimeText: {
  fontSize: scale(11.5),
  color: COLORS.inkMuted,
  marginTop: scale(2),
},
  availableText: {
  fontSize: scale(12),
  color: COLORS.success,
  fontWeight: "700",
},

  priceSection: {
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: scale(11),
    color: COLORS.inkMuted,
  },
  price: {
    fontSize: scale(15),
    color: COLORS.ink,
    fontWeight: "800",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: scale(9),
    paddingHorizontal: scale(14),
    borderRadius: scale(20),
    gap: scale(2),
  },
  viewButtonText: {
    color: "white",
    fontSize: scale(13),
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(30),
    paddingTop: scale(40),
  },
  emptyIconWrap: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: scale(16),
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: scale(6),
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: scale(13),
    color: COLORS.inkMuted,
    textAlign: "center",
    lineHeight: scale(19),
  },
});