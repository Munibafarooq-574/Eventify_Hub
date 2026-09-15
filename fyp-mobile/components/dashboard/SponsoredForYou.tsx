import getSponsoredCampaigns, {
  SponsoredCampaign,
} from "@/services/getSponsoredCampaigns";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  primary: "#6B1E4F",
  primaryDark: "#4A1436",
  accent: "#D4A657",
  card: "#FFFFFF",
  textDark: "#2B1B26",
  textMuted: "#8B7688",
  border: "#F3DCE8",
  soft: "#FFF7FB",
};

const SponsoredForYou: React.FC = () => {
  const [campaigns, setCampaigns] = useState<
    SponsoredCampaign[]
  >([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);

      const result =
        await getSponsoredCampaigns();

      setCampaigns(result);
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

  const openCampaign = (
    campaign: SponsoredCampaign,
  ) => {
    /*
     * Open the campaign's exact vendor and request
     * the exact linked package.
     *
     * VendorProfileDetails already supports opening
     * the Packages tab.
     */
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.heading}>
              Sponsored for You
            </Text>

            <View style={styles.titleAccent} />
          </View>

          <View style={styles.sponsoredHeaderBadge}>
            <Text style={styles.sponsoredHeaderText}>
              Sponsored
            </Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading offers...
          </Text>
        </View>
      </View>
    );
  }

  /*
   * Don't leave an empty Sponsored section on
   * Client Dashboard when no eligible campaign exists.
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
      item.package?.packageName || "Package";

    const price = Number(
      item.package?.price || 0,
    );

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => openCampaign(item)}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri:
                item.image ||
                item.package?.images?.[0],
            }}
            style={styles.image}
            resizeMode="cover"
          />

          <View style={styles.sponsoredBadge}>
            <Ionicons
              name="megaphone-outline"
              size={11}
              color="#FFFFFF"
            />

            <Text style={styles.sponsoredText}>
              Sponsored
            </Text>
          </View>

          {!!item.offerLabel && (
            <View style={styles.offerBadge}>
              <Text
                style={styles.offerText}
                numberOfLines={1}
              >
                {item.offerLabel}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text
            style={styles.campaignTitle}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <Text
            style={styles.packageName}
            numberOfLines={1}
          >
            {packageName}
          </Text>

          <View style={styles.vendorRow}>
            <Ionicons
              name="storefront-outline"
              size={12}
              color={COLORS.textMuted}
            />

            <Text
              style={styles.vendorName}
              numberOfLines={1}
            >
              {item.brandName ||
                item.vendorName}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View>
              <Text style={styles.priceLabel}>
                Package
              </Text>

              <Text style={styles.price}>
                {price > 0
                  ? `Rs ${price.toLocaleString()}`
                  : "View details"}
              </Text>
            </View>

            <View style={styles.viewButton}>
              <Text style={styles.viewButtonText}>
                View
              </Text>

              <Ionicons
                name="chevron-forward"
                size={13}
                color="#FFFFFF"
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.heading}>
            Sponsored for You
          </Text>

          <View style={styles.titleAccent} />
        </View>

        <View style={styles.sponsoredHeaderBadge}>
          <Text style={styles.sponsoredHeaderText}>
            Sponsored
          </Text>
        </View>
      </View>

      <FlatList
        data={campaigns}
        horizontal
        keyExtractor={(item) => item._id}
        renderItem={renderCampaign}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textDark,
  },

  titleAccent: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 6,
  },

  sponsoredHeaderBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  sponsoredHeaderText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  loadingContainer: {
    height: 100,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 7,
  },

  list: {
    paddingRight: 8,
  },

  card: {
    width: 230,
    marginRight: 14,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primaryDark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },

  imageContainer: {
    position: "relative",
    height: 130,
    backgroundColor: COLORS.soft,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  sponsoredBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(43,27,38,0.86)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  sponsoredText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 4,
  },

  offerBadge: {
    position: "absolute",
    bottom: 9,
    left: 9,
    right: 9,
    alignSelf: "flex-start",
  },

  offerText: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    color: "#FFFFFF",
    overflow: "hidden",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
  },

  cardBody: {
    padding: 12,
  },

  campaignTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  packageName: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  vendorName: {
    flex: 1,
    marginLeft: 5,
    fontSize: 11,
    color: COLORS.textMuted,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
  },

  priceLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
  },

  price: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textDark,
    marginTop: 1,
  },

  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
  },

  viewButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 2,
  },
});

export default SponsoredForYou;