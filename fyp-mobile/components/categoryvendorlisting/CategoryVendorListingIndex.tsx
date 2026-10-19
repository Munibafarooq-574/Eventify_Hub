//fyp-mobile/components/categoryvendorlisting/CategoryVendorListingIndex.tsx

import searchVendorsWithFilters from "@/services/searchVendorsWithFilters";
import getVendorReviewSummary from "@/services/getVendorReviewSummary";
import { getVendorPackagesList } from "@/services/getVendorPackagesList";
import { emptyVendorFilters, loadVendorFilters, saveVendorFilters, SORT_OPTIONS, sortVendorResults, vendorStartingPrice, VendorSearchPreferences } from '@/services/vendorSearchPreferences';
import getMarketplaceEventContext from "@/services/getMarketplaceEventContext";
import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { COLORS, scale, isSmallScreen } from "./theme";
import VendorSearchFilterBar from "./VendorSearchFilterBar";
import {
  ActivityIndicator,
  ScrollView,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function App() {
  const [preferences, setPreferences] = useState<VendorSearchPreferences>(emptyVendorFilters);
  const [searchError, setSearchError] = useState(false);
  const requestId = useRef(0);
  const [data, setData] = useState<any>([]);
  const [headerTitle, setHeaderTitle] = useState<string>("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vendorReviews, setVendorReviews] = useState<Record<string, any>>({});
  const [vendorPackages, setVendorPackages] = useState<Record<string, any[]>>({});
  const [loadingVendorDetails, setLoadingVendorDetails] = useState(false);
  const [eventTiming, setEventTiming] = useState<{
  eventId?: string;
  eventCityId: string;
  eventAddress?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
} | null>(null);
  const routeParams = useLocalSearchParams();
  const routeParamsKey = JSON.stringify(routeParams);
  const isBrowseMode = (Array.isArray(routeParams.bookingMode)
    ? routeParams.bookingMode[0]
    : routeParams.bookingMode) === "browse";
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryIdToName, setCategoryIdToName] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategoryName();
  }, [routeParamsKey]);
  
 const getEventTimingParams = async () => {
  // Home category browsing must never inherit a saved event.
  if (isBrowseMode) return null;
  const context =
    await getMarketplaceEventContext();

  const replacementMode = String(Array.isArray(routeParams?.replacementMode) ? routeParams.replacementMode[0] : routeParams?.replacementMode || '') === 'true';
  if (replacementMode) {
    const eventCityId = String(Array.isArray(routeParams?.eventCityId) ? routeParams.eventCityId[0] : routeParams?.eventCityId || '');
    const eventDate = String(Array.isArray(routeParams?.eventDate) ? routeParams.eventDate[0] : routeParams?.eventDate || '');
    const startTime = String(Array.isArray(routeParams?.startTime) ? routeParams.startTime[0] : routeParams?.startTime || '');
    const durationMinutes = Number(Array.isArray(routeParams?.durationMinutes) ? routeParams.durationMinutes[0] : routeParams?.durationMinutes);
    if (eventCityId && eventDate && startTime && Number.isFinite(durationMinutes) && durationMinutes > 0) {
      const [h, m] = startTime.split(':').map(Number);
      const end = new Date(`${eventDate}T00:00:00`);
      end.setHours(h, m, 0, 0);
      end.setMinutes(end.getMinutes() + durationMinutes);
      return {
        eventId: String(Array.isArray(routeParams?.replacementOrderId) ? routeParams.replacementOrderId[0] : routeParams?.replacementOrderId || context.eventId || ''),
        eventCityId,
        eventAddress: context.eventAddress ?? '',
        eventDate,
        startTime,
        endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
        durationMinutes,
      };
    }
  }

  if (
    !context.eventCityId ||
    !context.eventDate ||
    !context.startTime ||
    !context.endTime ||
    !context.durationMinutes
  ) {
    return null;
  }

  return {
    eventId: context.eventId,
    eventCityId:
      context.eventCityId,
    eventAddress:
      context.eventAddress ?? "",
    eventDate:
      context.eventDate,
    startTime:
      context.startTime,
    endTime:
      context.endTime,
    durationMinutes:
      context.durationMinutes,
  };
};

const formatTime = (time?: string) => {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${String(minutes).padStart(2, "0")}${period}`;
};

const formatServiceWindowTime = (dateTime?: string, timeZone?: string) => {
  if (!dateTime || !timeZone) return "";
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone, hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(date);
  } catch { return ""; }
};

const getServiceWindowLabel = (
  pkg: any,
  requiredServiceWindow: any,
  timeZone?: string,
) => {
  if (
    !requiredServiceWindow?.startDateTime ||
    !requiredServiceWindow?.endDateTime
  ) {
    return "";
  }

  const start = formatServiceWindowTime(
    requiredServiceWindow.startDateTime,
    timeZone,
  );

  const end = formatServiceWindowTime(
    requiredServiceWindow.endDateTime,
    timeZone,
  );

  if (!start || !end) return "";
  switch (pkg?.bookingType) {
    case "DELIVERY_BASED":
      return start === end
        ? `Delivery at ${start}`
        : `Delivery: ${start} - ${end}`;

    case "SETUP_BASED":
      return start === end
        ? `Setup at ${start}`
        : `Setup: ${start} - ${end}`;

    case "TIME_SLOT_BASED":
      return start === end
        ? `Time Slot: ${start}`
        : `Time Slot: ${start} - ${end}`;

    case "CUSTOM":
      return start === end
        ? `Service at ${start}`
        : `Service Window: ${start} - ${end}`;

    case "DURATION_BASED":
    default:
      return start === end
        ? `Service at ${start}`
        : `Service: ${start} - ${end}`;
  }
};
  const fetchData = async (query = searchQuery, override?: VendorSearchPreferences) => {
  const currentRequest = ++requestId.current;
  setCheckingAvailability(true);
  setSearchError(false);
  try {
    const savedFilters = override ?? await loadVendorFilters();
    if (currentRequest !== requestId.current) return;
    setPreferences(savedFilters);
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

    if (categoryIds.length === 0) {
      const singleCategoryId = await getSecureData("categoryId");

      if (singleCategoryId) {
        categoryIds = [singleCategoryId];
        const singleCategoryName = await getSecureData("categoryName");
        if (singleCategoryName) {
          setCategoryIdToName({ [singleCategoryId]: singleCategoryName });
        }
      }
    }

    console.log("Category IDs:", categoryIds);

    const timing = await getEventTimingParams();
    setEventTiming(timing);

    // Keep the existing event/city fallback for event selection only.
    const marketplaceContext = isBrowseMode
      ? null
      : await getMarketplaceEventContext();

    const discoveryCityId =
      timing?.eventCityId ||
      marketplaceContext?.discoveryCityId;

    const filters = {
      name: query.trim() || undefined,
      eventCityId: discoveryCityId || undefined,
      cityIds: isBrowseMode ? savedFilters.cityIds : undefined,
      eventDate: timing?.eventDate,
      startTime: timing?.startTime,
      durationMinutes: timing?.durationMinutes,
      staffOptions: savedFilters.staffOptions,
      policies: savedFilters.policies,
      ratingBands: savedFilters.ratingBands,
    };

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

console.log("PHASE 7 EVENT INPUT:", {
  eventTiming,
  filters,
});

console.log(
  "PHASE 7 VENDOR SEARCH RESPONSE:",
  JSON.stringify(resultsPerCategory, null, 2)
);

if (currentRequest !== requestId.current) return;
const mergedResults = resultsPerCategory.flat();
    const uniqueVendorsMap = new Map<string, any>();
    mergedResults.forEach((vendor: any) => { if (vendor?._id) uniqueVendorsMap.set(vendor._id, vendor); });
    const vendorResults = Array.from(uniqueVendorsMap.values());
    console.log("Total vendors after merge:", vendorResults.length);

    if (!vendorResults.length) {
      setData([]);
      return;
    }

    const excludedVendorId = String(Array.isArray(routeParams?.excludedVendorId) ? routeParams.excludedVendorId[0] : routeParams?.excludedVendorId || '');
    let excludedVendorIds: string[] = [];
    try { const excluded = JSON.parse(String(routeParams?.excludedVendorIds || '[]')); excludedVendorIds = Array.isArray(excluded) ? excluded.map(String) : []; } catch { /* Optional route filter. */ }
    const eligibleVendorResults = vendorResults.filter((vendor: any) => !excludedVendorIds.includes(String(vendor?._id)));
    const visibleVendorResults = excludedVendorId
      ? eligibleVendorResults.filter((vendor: any) => String(vendor?._id) !== excludedVendorId)
      : eligibleVendorResults;
    setData(visibleVendorResults);
    await fetchVendorDetails(visibleVendorResults, currentRequest, savedFilters.sort);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    if (currentRequest === requestId.current) {
      setData([]);
      setSearchError(true);
    }
  } finally {
    if (currentRequest === requestId.current) setCheckingAvailability(false);
  }
};

  const latestFetchData = useRef(fetchData);
  latestFetchData.current = fetchData;
  useFocusEffect(useCallback(() => {
    latestFetchData.current();
    return () => { requestId.current += 1; };
  }, [routeParamsKey]));

const fetchVendorDetails = async (vendors: any[], currentRequest: number, sort: VendorSearchPreferences['sort']) => {
  try {
    setLoadingVendorDetails(true);
    let reviewLoadFailed = false;
    const reviewsMap: Record<string, any> = {};
    const packagesMap: Record<string, any[]> = {};

    await Promise.all(
      vendors.map(async (vendor: any) => {
        try { reviewsMap[vendor._id] = await getVendorReviewSummary(vendor._id); }
        catch (error) { reviewLoadFailed = true; console.error(`Failed to load reviews for vendor ${vendor._id}:`, error); reviewsMap[vendor._id] = { averageRating: 0, totalReviews: 0 }; }

        try { packagesMap[vendor._id] = (await getVendorPackagesList(vendor._id)) || []; }
        catch (error) { console.error(`Failed to load packages for vendor ${vendor._id}:`, error); packagesMap[vendor._id] = []; }
      })
    );

    if (reviewLoadFailed && (sort === 'rating' || sort === 'reviews')) {
      throw new Error('Review summaries are required for this sort order. Please retry.');
    }
    if (currentRequest === requestId.current) {
      setVendorReviews(reviewsMap);
      setVendorPackages(packagesMap);
    }
  } catch (error) {
    console.error("Failed to load vendor details:", error);
    throw error;
  } finally {
    if (currentRequest === requestId.current) setLoadingVendorDetails(false);
  }
};

const fetchCategoryName = async () => {
  const namesRaw = Array.isArray(routeParams?.categoryNames) ? routeParams.categoryNames[0] : routeParams?.categoryNames;
  try {
    const names = namesRaw ? JSON.parse(namesRaw) : [];
    if (names.length > 0) { setHeaderTitle(names.length === 1 ? names[0] : "Vendors"); return; }
  } catch (error) {
    console.error("Error parsing categoryNames:", error);
  }
  const categoryName = (await getSecureData("categoryName")) || "Category";
  setHeaderTitle(categoryName);
};

const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }, [searchQuery, routeParamsKey]);

  const resultsLabel = useMemo(() => {
    const count = data?.length ?? 0;
    return checkingAvailability ? "" : `${count} ${count === 1 ? "vendor" : "vendors"} found`;
  }, [data, checkingAvailability]);

  const renderItem = ({ item }: any) => {
  const review = vendorReviews[item._id];

  const availablePackage = Array.isArray(item?.packages)
    ? item.packages.find(
        (pkg: any) => pkg?.requiredServiceWindow
      )
    : undefined;

    const requiredServiceWindow =
  availablePackage?.requiredServiceWindow;
  
    const availablePackageIds = Array.isArray(item?.packages)
  ? item.packages
      .map((pkg: any) => String(pkg?._id || ""))
      .filter(Boolean)
  : [];
    const rating = review?.averageRating ? Number(review.averageRating).toFixed(1) : "0.0";
    const reviewCount = review?.totalReviews || 0;

    const price = vendorStartingPrice(item);
    const brandName = item?.contactDetails?.brandName || item?.ContactDetails?.brandName || item?.BusinessDetails?.brandName || "Vendor";
    const vendorName = item?.name || item?.vendorName || item?.ownerName || "Vendor";
    const categoryName = item?.buisnessCategory?.name || item?.buisnessCategory?.categoryName || item?.category?.name || item?.categoryName || item?.serviceName || categoryIdToName[item?._matchedCategoryId] || "Category";
    const businessCity = item?.businessCityId;
    const city =
      businessCity?.name
        ? [
            businessCity.name,
            businessCity.stateProvinceCode,
          ]
            .filter(Boolean)
            .join(", ")
        : "";

    return (
      <TouchableOpacity activeOpacity={0.85} style={styles.card}
       onPress={() =>
router.push({
  pathname: "/vendorprofiledetails",   
  params: {
  id: item._id,
  eventId: eventTiming?.eventId || "",
  eventCityId: eventTiming?.eventCityId || "",
  eventDate: eventTiming?.eventDate || "",
  startTime: eventTiming?.startTime || "",
  endTime: eventTiming?.endTime || "",
  durationMinutes: String(eventTiming?.durationMinutes || 0),
  openTab: "Details",
  bookingMode: eventTiming ? "event" : "browse",
  replacementMode: Array.isArray(routeParams?.replacementMode) ? routeParams.replacementMode[0] : routeParams?.replacementMode || "",
  replacementOrderId: Array.isArray(routeParams?.replacementOrderId) ? routeParams.replacementOrderId[0] : routeParams?.replacementOrderId || "",
  replacementRequestId: Array.isArray(routeParams?.replacementRequestId) ? routeParams.replacementRequestId[0] : routeParams?.replacementRequestId || "",
  availablePackageIds: JSON.stringify(availablePackageIds),
},
})
}
       >
        <View style={styles.cardTopRow}>
          <Image source={{ uri: item?.contactDetails?.brandLogo || item?.ContactDetails?.brandLogo || item?.coverImage || item?.images?.[0] || "https://via.placeholder.com/300" }} style={styles.image} />
          <View style={styles.cardContent}>
            <View style={styles.brandRow}>
  <Text
    style={styles.brandName}
    numberOfLines={1}
  >
    {brandName}
  </Text>

</View>
            <Text style={styles.vendorName} numberOfLines={1}>{vendorName}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{categoryName}</Text>
            <View style={styles.ratingRow}>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={scale(12)} color={COLORS.gold} />
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
              <Text style={styles.reviewText}>({reviewCount} review{reviewCount === 1 ? "" : "s"})</Text>
            </View>
            {city ? (
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
        ) : null}
          </View>
        </View>

<View style={styles.cardDivider} />

      {!!eventTiming && !!requiredServiceWindow?.startDateTime && !!requiredServiceWindow?.endDateTime && (
      <View style={styles.availabilitySection}>
        <View style={styles.availabilityRow}>
          <Ionicons name="checkmark-circle" size={scale(16)} color={COLORS.success} />
          <View style={styles.availabilityTextContainer}>
            <Text style={styles.availableText}>Available for your event</Text>
            {requiredServiceWindow?.startDateTime &&
          requiredServiceWindow?.endDateTime && (
            <Text style={styles.selectedTimeText}>
              {getServiceWindowLabel(
                availablePackage,
                requiredServiceWindow,
                item?.eventTimeZone,
              )}
            </Text>
          )}
          </View>
        </View>
      </View>

      )}

      <View style={styles.cardBottomRow}>
        <View style={styles.priceSection}>
          <Text style={styles.priceText}>Starting from</Text>
          <Text style={styles.price}>{price !== undefined ? `Rs ${price}` : "N/A"}</Text>
        </View>

        <TouchableOpacity style={styles.viewButton}
         onPress={() =>
  router.push({
   pathname: "/vendorpackagebooking",
   params: {
  id: item._id,
  eventId: eventTiming?.eventId || "",
  eventCityId: eventTiming?.eventCityId || "",
  eventDate: eventTiming?.eventDate || "",
  startTime: eventTiming?.startTime || "",
  endTime: eventTiming?.endTime || "",
  durationMinutes: String(eventTiming?.durationMinutes || 0),
  openTab: "Packages",
  packageOnly: "true",
  bookingMode: eventTiming ? "event" : "browse",
  replacementMode: Array.isArray(routeParams?.replacementMode) ? routeParams.replacementMode[0] : routeParams?.replacementMode || "",
  replacementOrderId: Array.isArray(routeParams?.replacementOrderId) ? routeParams.replacementOrderId[0] : routeParams?.replacementOrderId || "",
  replacementRequestId: Array.isArray(routeParams?.replacementRequestId) ? routeParams.replacementRequestId[0] : routeParams?.replacementRequestId || "",
  availablePackageIds: JSON.stringify(availablePackageIds),
},
})
}
         >
          <Text style={styles.viewButtonText}>View Packages</Text>
          <Ionicons name="chevron-forward" size={scale(14)} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const activeChips = [
  ...(isBrowseMode ? preferences.cityIds.map(value => ({ key: 'cityIds' as const, value, label: preferences.cityLabels[value] || 'Selected city' })) : []),
  ...preferences.staffOptions.map(value => ({ key: 'staffOptions' as const, value, label: value === 'MALE' ? 'Male' : 'Female' })),
  ...preferences.policies.map(value => ({ key: 'policies' as const, value, label: value.toLowerCase() })),
  ...preferences.ratingBands.map(value => ({ key: 'ratingBands' as const, value, label: value === 'unrated' ? 'Not rated' : value === '5' ? '5 ★' : `${value}–<${Number(value) + 1} ★` })),
  ...(preferences.sort !== 'default' ? [{ key: 'sort' as const, value: preferences.sort, label: SORT_OPTIONS.find(([value]) => value === preferences.sort)?.[1] || '' }] : []),
];
const updateFilters = async (next: VendorSearchPreferences) => {
  try {
    await saveVendorFilters(next);
    await fetchData(searchQuery, next);
  } catch { setSearchError(true); }
};

const renderEmptyState = () => {
  if (checkingAvailability || searchError) return null;
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="calendar-outline" size={scale(34)} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>No vendors match these filters</Text>
      <Text style={styles.emptySubtitle}>{eventTiming ? 'Try adjusting your filters or event date and time.' : 'Try adjusting your search or clearing filters.'}</Text>
      {activeChips.length > 0 && <TouchableOpacity disabled={checkingAvailability} onPress={() => updateFilters(emptyVendorFilters())} style={{ padding: 14 }}><Text style={{ color: COLORS.primary, fontWeight: '700' }}>Clear filters</Text></TouchableOpacity>}
    </View>
  );
};

return (
  <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={scale(20)} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="storefront-outline" size={scale(15)} color={COLORS.primary} />
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle || "Loading..."}</Text>
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

      <VendorSearchFilterBar searchQuery={searchQuery} onChangeSearchQuery={setSearchQuery} onSubmitSearch={() => fetchData()} onClearSearch={() => { setSearchQuery(""); fetchData(""); }}
        extraFilterParams={{
          bookingMode: isBrowseMode ? "browse" : "event",
          eventCityId: isBrowseMode ? "" : eventTiming?.eventCityId || "",
        }}
        activeFilterCount={activeChips.length}
        disabled={checkingAvailability}

      />

      {activeChips.length > 0 && <View style={{ marginBottom: scale(12) }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: scale(8), alignItems: 'center' }}>
          {activeChips.map(chip => <TouchableOpacity key={`${chip.key}:${chip.value}`} accessibilityLabel={`Remove ${chip.label} filter`} disabled={checkingAvailability} onPress={() => updateFilters(chip.key === 'sort'
            ? { ...preferences, sort: 'default' }
            : { ...preferences, [chip.key]: preferences[chip.key].filter(value => value !== chip.value) })}
            style={{ flexDirection: 'row', gap: 6, alignItems: 'center', padding: scale(9), borderRadius: 18, backgroundColor: COLORS.primarySoft }}>
            <Text style={{ color: COLORS.primary, fontSize: scale(12) }}>{chip.label}</Text><Ionicons name="close" size={14} color={COLORS.primary} />
          </TouchableOpacity>)}
          <TouchableOpacity disabled={checkingAvailability} onPress={() => updateFilters(emptyVendorFilters())}><Text style={{ color: COLORS.primary, fontWeight: '700' }}>Clear all</Text></TouchableOpacity>
        </ScrollView>
      </View>}
      {searchError && <TouchableOpacity onPress={() => fetchData()} style={{ padding: 12 }}><Text style={{ color: COLORS.primary }}>Could not load results. Tap to retry.</Text></TouchableOpacity>}

      {checkingAvailability && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>{eventTiming ? "Checking vendor availability..." : "Loading vendors..."}</Text>
        </View>
      )}

      <FlatList
        data={sortVendorResults(data, preferences.sort, vendorReviews)}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.list, data?.length === 0 && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  </SafeAreaView>
);
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: scale(18), paddingTop: Platform.OS === "android" ? scale(12) : scale(4) },

  // Header
  header: { flexDirection: "row", alignItems: "center", marginBottom: scale(18) },
  backButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginRight: scale(13), borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  headerSpacer: { width: scale(40) + scale(13) },
  headerTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: scale(8) },
  headerIconBadge: { width: scale(26), height: scale(26), borderRadius: scale(13), backgroundColor: COLORS.primarySoft, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: scale(20), fontWeight: "800", color: COLORS.primaryDark, letterSpacing: 0.2 },
  headerSubtitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: scale(4), gap: scale(6) },
  headerDot: { width: scale(5), height: scale(5), borderRadius: scale(2.5), backgroundColor: COLORS.success },
  headerSubtitle: { fontSize: scale(12.5), color: COLORS.inkMuted, fontWeight: "500" },
brandRow: {
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: scale(6),
  marginBottom: scale(2),
},

brandName: {
  fontSize: scale(17),
  fontWeight: "800",
  color: COLORS.primaryDark,
  flexShrink: 1,
},

  vendorName: { fontSize: scale(12), color: COLORS.inkMuted, marginBottom: scale(4) },

  // Loading banner
  loadingBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primarySoft, borderRadius: scale(14), paddingVertical: scale(10), marginBottom: scale(14), gap: scale(8) },
  loadingText: { color: COLORS.primaryDark, fontSize: scale(12.5), fontWeight: "500" },

  // List & Card
  list: { paddingBottom: scale(24) },
  card: { backgroundColor: COLORS.card, borderRadius: scale(18), padding: scale(14), marginBottom: scale(16), shadowColor: "#3D0330", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardTopRow: { flexDirection: "row" },
  image: { width: isSmallScreen ? scale(72) : scale(80), height: isSmallScreen ? scale(72) : scale(80), borderRadius: scale(14), marginRight: scale(12), backgroundColor: COLORS.primarySoft },
  cardContent: { flex: 1, justifyContent: "center" },
  title: { fontSize: scale(15.5), fontWeight: "700", color: COLORS.ink, marginBottom: scale(3) },
  subtitle: { fontSize: scale(12.5), color: COLORS.inkMuted, marginBottom: scale(6) },
  ratingRow: { flexDirection: "row", alignItems: "center", marginBottom: scale(5) },
  ratingPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#FDF3DC", borderRadius: scale(8), paddingHorizontal: scale(6), paddingVertical: scale(2), gap: scale(3) },
  ratingText: { fontSize: scale(12), fontWeight: "700", color: "#7A5A00" },
  reviewText: { fontSize: scale(11.5), color: COLORS.inkMuted, marginLeft: scale(6) },
  row: { flexDirection: "row", alignItems: "center" },
  address: { fontSize: scale(12.5), color: COLORS.inkMuted, marginLeft: scale(4) },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: scale(12) },
  // Availability & Actions
  cardBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: scale(8) },
  availabilityRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: COLORS.successSoft, paddingHorizontal: scale(9), paddingVertical: scale(7), borderRadius: scale(10), flexShrink: 1 },
  availabilitySection: { marginBottom: scale(10) },
  availabilityTextContainer: { marginLeft: scale(5), flexShrink: 1 },
  selectedTimeText: { fontSize: scale(11.5), color: COLORS.inkMuted, marginTop: scale(2) },
  availableText: { fontSize: scale(12), color: COLORS.success, fontWeight: "700" },

  priceSection: { alignItems: "flex-end" },
  priceText: { fontSize: scale(11), color: COLORS.inkMuted },
  price: { fontSize: scale(15), color: COLORS.ink, fontWeight: "800" },
  viewButton: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary, paddingVertical: scale(9), paddingHorizontal: scale(14), borderRadius: scale(20), gap: scale(2) },
  viewButtonText: { color: "white", fontSize: scale(13), fontWeight: "700" },
  // Empty state
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: scale(30), paddingTop: scale(40) },
  emptyIconWrap: { width: scale(72), height: scale(72), borderRadius: scale(36), backgroundColor: COLORS.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: scale(16) },
  emptyTitle: { fontSize: scale(16), fontWeight: "700", color: COLORS.ink, marginBottom: scale(6), textAlign: "center" },
  emptySubtitle: { fontSize: scale(13), color: COLORS.inkMuted, textAlign: "center", lineHeight: scale(19) },
});