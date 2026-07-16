import getVendorReviews from '@/services/getAllReviewsForVendor';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useGlobalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

const PRIMARY = '#7B2869';
const PRIMARY_LIGHT = '#9F4F8E';
const PRIMARY_SOFT = '#F3E4EF';
const BG = '#FAF6F9';
const CARD = '#FFFFFF';
const TEXT_DARK = '#221A20';
const TEXT_MUTED = '#8A7C86';
const BORDER = '#EFE0EB';

const VendorProfileDetailsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'Details' | 'Packages' | 'Reviews'>('Details');
    const [activePackage, setActivePackage] = useState<number | null>(null);
    const [activeReviewTab, setActiveReviewTab] = useState<'Eventify' | 'Google'>('Eventify');
    const [vendorData, setVendorData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const { id } = useGlobalSearchParams();

    const [reviews, setReviews] = useState<any[]>([]);


    const getBusinessDetailsRoute = () => {
    if (vendorData?.photographerBusinessDetails) return "/bdphotographer";
    if (vendorData?.salonBusinessDetails) return "/bdsalon";
    if (vendorData?.venueBusinessDetails) return "/bdvenue";
    if (vendorData?.cateringBusinessDetails) return "/bdcatering";
    if (vendorData?.cakeBusinessDetails) return "/bdcakes";
    if (vendorData?.mehndiBusinessDetails) return "/bdmehndi";
    if (vendorData?.soundBusinessDetails) return "/bdsounds";

    return "/bdvenue"; // fallback
};
    const fetchReviews = async () => {
        try {
            const data = await getVendorReviews(vendorData._id);
            console.log("reviews", data);
            setReviews(data);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
    };

    // ✅ Call fetchReviews after vendorData loads
    useEffect(() => {
        if (vendorData?._id) {
            fetchReviews();
        }
    }, [vendorData]);


    useEffect(() => {
        const fetchVendorDetails = async () => {
            try {
                const response = await axios.get(`https://eventify-hub.onrender.com/vendor?userId=${id}`);
                setVendorData(response.data);
                setActivePackage(response.data.packages?.[0]?._id || null); // Set the first package as active by default
            } catch (error) {
                console.error('Error fetching vendor data:', error);
            } finally {
                setLoading(false);
            }
        };
        console.log("id", id);
        if (id) {
            fetchVendorDetails();
        }

    }, [id]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator
                    testID="loading-indicator" //add test id
                    size="large"
                    color={PRIMARY}
                />
                <Text style={styles.loadingText}>Loading vendor details...</Text>
            </View>
        );
    }

    const businessDetails =
    vendorData?.photographerBusinessDetails ||
    vendorData?.salonBusinessDetails ||
    vendorData?.venueBusinessDetails ||
    vendorData?.cateringBusinessDetails ||
    vendorData?.cakeBusinessDetails ||
    vendorData?.mehndiBusinessDetails ||
    vendorData?.soundBusinessDetails;

const category =
    vendorData?.photographerBusinessDetails ? "photographer" :
    vendorData?.salonBusinessDetails ? "salon" :
    vendorData?.venueBusinessDetails ? "venue" :
    vendorData?.cateringBusinessDetails ? "catering" :
    vendorData?.cakeBusinessDetails ? "cake" :
    vendorData?.mehndiBusinessDetails ? "mehndi" :
    vendorData?.soundBusinessDetails ? "sound" :
    "";
    // add test id 
    if (!vendorData) {
        return (
            <View testID="error-message" style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={42} color="#D64545" style={{ marginBottom: 10 }} />
                <Text style={styles.errorText}>
                    Failed to load vendor details. Please try again.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Toast />

            {/* Cover Image with floating header */}
            <View style={styles.coverWrapper}>
                <Image
                    testID="vendor-cover-image"
                    source={{
                        uri: vendorData?.contactDetails?.brandLogo
                            ? `${vendorData.contactDetails.brandLogo}`
                            : "https://via.placeholder.com/600x300",
                    }}
                    style={styles.coverImage}
                />
                <View style={styles.coverOverlay} />

                {/* Floating Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        testID="back-button"
                        onPress={() => router.back()}
                        style={styles.backIconButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <Text style={styles.title} numberOfLines={1}>{vendorData.name}</Text>

                    <View style={styles.headerSpacer} />
                </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                {["Details", "Packages", "Reviews"].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        testID={
                            tab === "Details"
                                ? "tab-details"
                                : tab === "Packages"
                                    ? "tab-packages"
                                    : "tab-reviews"
                        } // ✅ Add testID here
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() =>
                            setActiveTab(tab as "Details" | "Packages" | "Reviews")
                        }
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === tab && styles.activeTabText,
                            ]}
                        >
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === "Details" && (
                <View style={styles.detailsContainer}>

                    {/* Name + Price Card */}
                    <View style={styles.card}>
                        <View style={styles.rowContainer}>
                            <Text testID="vendor-name" style={styles.name}>
                                {vendorData.name}
                            </Text>
                            <View style={styles.priceBadge}>
                                <Text testID="vendor-price" style={styles.price}>
                                    Rs. {businessDetails?.minimumPrice || "N/A"}/-
                                </Text>
                                
                            </View>
                        </View>

                        <View style={styles.addressRow}>
                            <Ionicons name="location-outline" size={16} color={TEXT_MUTED} />
                            <Text testID="vendor-address" style={styles.address}>
                                {vendorData.contactDetails.officialAddress}
                            </Text>
                        </View>
                    </View>

                    {/* Photos Section */}
                    {/* Photos Section */}
<View style={[styles.card, styles.photosSection]}>
    <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleWithIcon}>
            <View style={styles.sectionIconCircle}>
                <Ionicons name="images-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={styles.sectionTitle}>Photos</Text>
            {vendorData.images.length > 0 && (
                <View style={styles.photoCountBadge}>
                    <Text style={styles.photoCountText}>{vendorData.images.length}</Text>
                </View>
            )}
        </View>

        {vendorData.images.length > 0 && (
            <TouchableOpacity
                testID="see-all-photos"
                onPress={() =>
                    router.push({
                        pathname: '/vendorprofileimages',
                        params: { vendorId: vendorData._id },
                    })
                }
                activeOpacity={0.7}
                style={styles.seeAllButton}
            >
                <Text style={styles.seeAllLink}>See All</Text>
                <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
            </TouchableOpacity>
        )}
    </View>

    {vendorData.images.length > 0 ? (
        <ScrollView
            testID="scroll-view"
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoContainer}
            contentContainerStyle={styles.photoContainerContent}
        >
            {vendorData.images.map((image: string, index: number) => (
                <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    onPress={() =>
                        router.push({
                            pathname: '/vendorprofileimages',
                            params: { vendorId: vendorData._id },
                        })
                    }
                    style={styles.photoWrapper}
                >
                    <Image
                        source={{ uri: `${image}` }}
                        style={styles.photo}
                    />
                </TouchableOpacity>
            ))}
        </ScrollView>
    ) : (
        <View style={styles.noPhotosBox}>
            <Ionicons name="image-outline" size={26} color="#C9A9BE" />
            <Text style={styles.noPhotosText}>No photos added yet</Text>
        </View>
    )}
</View>
                    {/* Business Details Card */}
                    <View style={styles.card}>
                        <View style={styles.detailsHeader}>
                            <View style={styles.sectionTitleWithIcon}>
                                <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
                                <Text style={styles.sectionTitle}>Details</Text>
                            </View>
                           <TouchableOpacity
    onPress={() =>
        router.push({
            pathname: getBusinessDetailsRoute() as any,
            params: {
                edit: "true",
                userId: vendorData._id,
            },
        })
    }
    activeOpacity={0.7}
>
    <View style={styles.editPill}>
        <Ionicons name="pencil-outline" size={12} color={PRIMARY} />
        <Text style={styles.editLink}>Edit</Text>
    </View>
</TouchableOpacity>
 </View>

                      {category === "cake" && (
  <>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Cake Types</Text>
      <Text style={styles.detailValue}>{businessDetails?.cakeTypes?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Delivery Options</Text>
      <Text style={styles.detailValue}>{businessDetails?.deliveryOptions?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Delivery To Home</Text>
      <Text style={styles.detailValue}>{businessDetails?.deliveryToHome ? "YES" : "NO"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Expertise</Text>
      <Text style={styles.detailValue}>{businessDetails?.expertise || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>City Covered</Text>
      <Text style={styles.detailValue}>{businessDetails?.cityCovered || "N/A"}</Text>
    </View>
  </>
)}

{category === "catering" && (
  <>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Expertise</Text>
      <Text style={styles.detailValue}>{businessDetails?.expertise?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Staff</Text>
      <Text style={styles.detailValue}>{businessDetails?.staff?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>City Covered</Text>
      <Text style={styles.detailValue}>{businessDetails?.cityCovered || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Travels To Client Home</Text>
      <Text style={styles.detailValue}>{businessDetails?.travelsToClientHome ? "YES" : "NO"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Services Provided</Text>
      <Text style={styles.detailValue}>
        {[
          businessDetails?.provideFoodTesting && "Food Testing",
          businessDetails?.provideDecoration && "Decoration",
          businessDetails?.provideSoundSystem && "Sound System",
          businessDetails?.provideSeatingArrangement && "Seating",
          businessDetails?.provideWaiters && "Waiters",
          businessDetails?.provideCutleryAndPlates && "Cutlery & Plates",
        ].filter(Boolean).join(", ") || "N/A"}
      </Text>
    </View>
  </>
)}

{category === "mehndi" && (
  <>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Mehndi Type</Text>
      <Text style={styles.detailValue}>{businessDetails?.mehndiType?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Staff Gender</Text>
      <Text style={styles.detailValue}>{businessDetails?.staffGender?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>City Covered</Text>
      <Text style={styles.detailValue}>{businessDetails?.cityCovered || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Travels To Client Home</Text>
      <Text style={styles.detailValue}>{businessDetails?.travelsToClientHome ? "YES" : "NO"}</Text>
    </View>
  </>
)}

{category === "photographer" && (
  <>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Photography Types</Text>
      <Text style={styles.detailValue}>{businessDetails?.photographyTypes?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Equipment</Text>
      <Text style={styles.detailValue}>{businessDetails?.equipment?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Editing Services</Text>
      <Text style={styles.detailValue}>{businessDetails?.editingServices?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Photo Style</Text>
      <Text style={styles.detailValue}>{businessDetails?.photoStyle?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Staff Gender</Text>
      <Text style={styles.detailValue}>{businessDetails?.staffGender?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Delivery Time</Text>
      <Text style={styles.detailValue}>{businessDetails?.deliveryTime || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>City Covered</Text>
      <Text style={styles.detailValue}>{businessDetails?.cityCovered || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Cancellation Policy</Text>
      <Text style={styles.detailValue}>{businessDetails?.covidRefundPolicy || "N/A"}</Text>
    </View>
  </>
)}

{category === "salon" && (
  <>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Type</Text>
      <Text style={styles.detailValue}>{businessDetails?.staffType || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Expertise</Text>
      <Text style={styles.detailValue}>{businessDetails?.expertise || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Staff Gender</Text>
      <Text style={styles.detailValue}>{businessDetails?.staffGender?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>City Covered</Text>
      <Text style={styles.detailValue}>{businessDetails?.cityCovered || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Travels To Client Home</Text>
      <Text style={styles.detailValue}>{businessDetails?.travelsToClientHome ? "YES" : "NO"}</Text>
    </View>
  </>
)}

{category === "sound" && (
  <>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Sound/DJ Type</Text>
      <Text style={styles.detailValue}>{businessDetails?.soundType?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Equipment Provided</Text>
      <Text style={styles.detailValue}>{businessDetails?.equipmentProvided?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Staff Gender</Text>
      <Text style={styles.detailValue}>{businessDetails?.staffGender?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>City Covered</Text>
      <Text style={styles.detailValue}>{businessDetails?.cityCovered || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Travels To Client Home</Text>
      <Text style={styles.detailValue}>{businessDetails?.travelsToClientHome ? "YES" : "NO"}</Text>
    </View>
  </>
)}

{category === "venue" && (
  <>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Venue Type</Text>
      <Text style={styles.detailValue}>{businessDetails?.typeOfVenue?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Expertise</Text>
      <Text style={styles.detailValue}>{businessDetails?.expertise || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Amenities</Text>
      <Text style={styles.detailValue}>{businessDetails?.amenities || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Max People Capacity</Text>
      <Text style={styles.detailValue}>{businessDetails?.maximumPeopleCapacity ?? "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Catering</Text>
      <Text style={styles.detailValue}>{businessDetails?.catering?.join(", ") || "N/A"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Parking</Text>
      <Text style={styles.detailValue}>{businessDetails?.parking ? "YES" : "NO"}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Staff</Text>
      <Text style={styles.detailValue}>{businessDetails?.staff?.join(", ") || "N/A"}</Text>
    </View>
  </>
)}

{/* Common fields for ALL categories */}
{/* Common fields for ALL categories */}
{category !== "photographer" && (
  <>
    <View style={styles.divider} />
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Cancellation Policy</Text>
      <Text style={styles.detailValue}>{businessDetails?.cancellationPolicy || "N/A"}</Text>
    </View>
  </>
)}
<View style={styles.divider} />
<View style={styles.detailBlock}>
  <Text style={styles.detailLabel}>Down Payment</Text>
  <Text style={styles.detailValue}>
    {businessDetails?.downPaymentType ? `${businessDetails.downPaymentType} - ${businessDetails.downPayment ?? "N/A"}` : "N/A"}
  </Text>
</View>
<View style={styles.divider} />
<View style={styles.detailBlock}>
  <Text style={styles.detailLabel}>COVID Compliant</Text>
  <Text style={styles.detailValue}>{businessDetails?.covidCompliant || "N/A"}</Text>
</View>
<View style={styles.divider} />
<View style={styles.detailBlock}>
  <Text style={styles.detailLabel}>Description</Text>
  <Text style={styles.detailValue}>{businessDetails?.description || "N/A"}</Text>
</View>
<View style={styles.divider} />
<View style={styles.detailBlock}>
  <Text style={styles.detailLabel}>Additional Notes</Text>
  <Text style={styles.detailValue}>{businessDetails?.additionalInfo || "N/A"}</Text>
</View>
                    </View>
                </View>
            )}

            {activeTab === "Packages" && (
    <View style={styles.detailsContainer}>

        {/* Package Selector Cards */}
        <Text style={styles.packagesSectionTitle}>Choose a Package</Text>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.packageTabContainer}
            contentContainerStyle={{ paddingRight: 8 }}
        >
            {vendorData.packages.map((pkg: any, idx: number) => {
                const isActive = activePackage === pkg._id;
                return (
                    <TouchableOpacity
                        key={pkg._id}
                        style={[styles.packageCard, isActive && styles.activePackageCard]}
                        onPress={() => setActivePackage(pkg._id)}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.packageCardIconWrap, isActive && styles.packageCardIconWrapActive]}>
                            <Ionicons
                                name="gift-outline"
                                size={18}
                                color={isActive ? '#FFFFFF' : PRIMARY}
                            />
                        </View>
                        <Text
                            style={[styles.packageCardName, isActive && styles.packageCardNameActive]}
                            numberOfLines={1}
                        >
                            {pkg.packageName}
                        </Text>
                        <Text style={[styles.packageCardPrice, isActive && styles.packageCardPriceActive]}>
                            Rs. {pkg.price}/-
                        </Text>
                        {isActive && (
                            <View style={styles.activeDot}>
                                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}

            {/* Custom Package CTA */}
            <TouchableOpacity
                style={[styles.customPackageCard, activePackage === null && styles.customPackageCardActive]}
                onPress={() => setActivePackage(null)}
                activeOpacity={0.85}
            >
                <View style={styles.customPackageIconWrap}>
                    <Ionicons name="sparkles-outline" size={20} color={PRIMARY} />
                </View>
                <Text style={styles.customPackageTitle}>Custom</Text>
                <Text style={styles.customPackageSubtitle}>Build your own</Text>
            </TouchableOpacity>
        </ScrollView>

        {/* Selected Package Details */}
        {vendorData.packages
            .filter((pkg: any) => pkg._id === activePackage)
            .map((pkg: any) => (
                <View key={pkg._id} style={[styles.card, styles.packageDetailsCreative]}>

                    {/* Header strip */}
                    <View style={styles.packageDetailsHeader}>
                        <View style={styles.packageDetailsHeaderLeft}>
                            <View style={styles.packageBadgeIcon}>
                                <Ionicons name="briefcase-outline" size={20} color="#FFFFFF" />
                            </View>
                            <View>
                                <Text style={styles.packageDetailsName}>{pkg.packageName}</Text>
                                <Text style={styles.packageDetailsTag}>Package Details</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            testID={`edit-package-${pkg._id}`}
                            style={styles.editIconButton}
                            onPress={() => {
                                router.push({
                                    pathname: '/vendorpackages',
                                    params: { packageId: pkg._id },
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="create-outline" size={16} color={PRIMARY} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.packageDivider} />

                    {/* Services */}
                    <View style={styles.servicesBlock}>
                        <View style={styles.sectionTitleWithIcon}>
                            <Ionicons name="list-outline" size={16} color={PRIMARY} />
                            <Text style={styles.servicesLabel}>What's Included</Text>
                        </View>
                        <Text testID="package-services" style={styles.packageDetailItem}>
                            {pkg.services}
                        </Text>
                    </View>

                    {/* Price footer */}
                    <View style={styles.packagePriceFooter}>
                        <View>
                            <Text style={styles.priceFooterLabel}>Total Price</Text>
                            <Text testID="package-price" style={styles.priceText}>
                                Rs. {pkg.price}/-
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.cartButton}
                            onPress={() => {
                                router.push({
                                    pathname: '/vendorpackages',
                                    params: { packageId: pkg._id },
                                });
                            }}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.cartButtonText}>Edit Package</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}

        {/* Custom package selected state */}
        {activePackage === null && (
            <View style={[styles.card, styles.customPackagePanel]}>
                <View style={styles.customPackagePanelIcon}>
                    <Ionicons name="chatbubbles-outline" size={26} color={PRIMARY} />
                </View>
                <Text style={styles.customPackagePanelTitle}>Need something different?</Text>
                <Text style={styles.customPackagePanelText}>
                    Contact this vendor directly to discuss a custom package tailored to your event's needs and budget.
                </Text>
                <TouchableOpacity style={styles.customPackagePanelButton} activeOpacity={0.85}>
                    <Ionicons name="chatbubble-ellipses-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.customPackagePanelButtonText}>Contact Vendor</Text>
                </TouchableOpacity>
            </View>
        )}
    </View>
)}

            {activeTab === "Reviews" && (
    <View style={styles.tabContent}>
        {activeReviewTab === "Eventify" && (
            <View>
                {reviews.length === 0 ? (
                    <View style={styles.emptyReviewsCreative}>
                        <View style={styles.emptyReviewsIconWrap}>
                            <Ionicons name="chatbubble-ellipses-outline" size={28} color={PRIMARY} />
                        </View>
                        <Text style={styles.emptyReviewsTitle}>No reviews yet</Text>
                        <Text style={styles.emptyReviewsSubtext}>
                            Be the first to share your experience with this vendor
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Rating Summary Card */}
                        <View style={styles.ratingSummaryCard}>
                            <View style={styles.ratingSummaryLeft}>
                                <Text style={styles.ratingBigNumber}>
                                    {(
                                        reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
                                        reviews.length
                                    ).toFixed(1)}
                                </Text>
                                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                    {[1, 2, 3, 4, 5].map((star) => {
                                        const avg =
                                            reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
                                            reviews.length;
                                        return (
                                            <Ionicons
                                                key={star}
                                                name={avg >= star ? 'star' : avg >= star - 0.5 ? 'star-half' : 'star-outline'}
                                                size={14}
                                                color="#FFC107"
                                            />
                                        );
                                    })}
                                </View>
                                <Text style={styles.ratingCountText}>
                                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                                </Text>
                            </View>

                            <View style={styles.ratingSummaryDivider} />

                            <View style={styles.ratingSummaryRight}>
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = reviews.filter(
                                        (r) => Math.round(r.rating) === star
                                    ).length;
                                    const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                                    return (
                                        <View key={star} style={styles.ratingBarRow}>
                                            <Text style={styles.ratingBarLabel}>{star}</Text>
                                            <Ionicons name="star" size={10} color="#FFC107" />
                                            <View style={styles.ratingBarTrack}>
                                                <View
                                                    style={[
                                                        styles.ratingBarFill,
                                                        { width: `${pct}%` },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.ratingBarCount}>{count}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Review Cards */}
                        {reviews.map((review, index) => (
                            <View key={index} style={styles.eventifyReviewCreative}>
                                <View style={styles.reviewTopRow}>
                                    <View style={styles.avatarCircleCreative}>
                                        <Text style={styles.avatarInitial}>
                                            {(review.reviewerName || 'A').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.reviewerName}>
                                            {review.reviewerName || 'Anonymous'}
                                        </Text>
                                        <Text style={styles.reviewDate}>
                                            {new Date(review.createdAt).toDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.reviewRatingPill}>
                                        <Ionicons name="star" size={12} color="#FFC107" />
                                        <Text style={styles.reviewRatingPillText}>
                                            {review.rating || 0}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.reviewQuoteBar} />
                                <Text style={styles.reviewTextCreative}>{review.reviewText}</Text>
                            </View>
                        ))}
                    </>
                )}
            </View>
        )}
    </View>
)}

            <View style={{ height: 24 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },
    coverWrapper: {
        width: '100%',
        height: 230,
        position: 'relative',
        backgroundColor: '#000',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    coverOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 90,
        backgroundColor: 'rgba(0,0,0,0.28)',
    },
    header: {
        position: 'absolute',
        top: 44,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    backIconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {
        width: 38,
    },
    title: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
        color: '#FFFFFF',
        marginHorizontal: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: CARD,
        marginHorizontal: 16,
        marginTop: -22,
        borderRadius: 16,
        padding: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        zIndex: 5,
    },
    tab: {
        paddingVertical: 10,
        flex: 1,
        alignItems: 'center',
        borderRadius: 12,
    },
    activeTab: {
        backgroundColor: PRIMARY_SOFT,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_MUTED,
    },
    activeTabText: {
        color: PRIMARY,
        fontWeight: '700',
    },
    detailsContainer: {
        padding: 16,
        gap: 14,
    },
    card: {
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        borderWidth: 1,
        borderColor: BORDER,
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    priceBadge: {
        backgroundColor: PRIMARY_SOFT,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: 'flex-end',
    },
    name: {
        fontSize: 21,
        fontWeight: '800',
        color: TEXT_DARK,
        flex: 1,
        marginRight: 10,
    },
    price: {
        fontSize: 14,
        fontWeight: '800',
        color: PRIMARY,
    },
    perHead: {
        fontSize: 11,
        color: TEXT_MUTED,
        marginTop: 2,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    address: {
        fontSize: 13,
        color: TEXT_MUTED,
        flex: 1,
    },
    photosSection: {
        paddingBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    seeAllLink: {
        fontSize: 12,
        color: PRIMARY,
        fontWeight: '700',
    },
    photoContainer: {
        flexDirection: 'row',
    },
    photo: {
        width: 104,
        height: 104,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: '#EEE',
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    editPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: PRIMARY_SOFT,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    editLink: {
        fontSize: 12,
        color: PRIMARY,
        fontWeight: '700',
    },
    detailBlock: {
        paddingVertical: 8,
    },
    detailLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    detailValue: {
        fontSize: 13,
        color: TEXT_MUTED,
        marginTop: 4,
        lineHeight: 19,
    },
    divider: {
        height: 1,
        backgroundColor: BORDER,
    },
    packageTabContainer: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    packageTab: {
        paddingVertical: 9,
        paddingHorizontal: 14,
        alignItems: 'center',
        marginRight: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: CARD,
    },
    activePackageTab: {
        backgroundColor: PRIMARY_LIGHT,
        borderColor: PRIMARY,
    },
    packageTabText: {
        fontSize: 12,
        fontWeight: '700',
        color: TEXT_MUTED,
        textAlign: 'center',
    },
    packagesSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 10,
},
packageCard: {
    width: 128,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    position: 'relative',
},
activePackageCard: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
},
packageCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
},
packageCardIconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
},
packageCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
},
packageCardNameActive: {
    color: '#FFFFFF',
},
packageCardPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
},
packageCardPriceActive: {
    color: 'rgba(255,255,255,0.85)',
},
activeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
},
customPackageCard: {
    width: 128,
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: PRIMARY_LIGHT,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'flex-start',
    justifyContent: 'center',
},
customPackageCardActive: {
    borderStyle: 'solid',
    backgroundColor: PRIMARY,
},
customPackageIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
},
customPackageTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
},
customPackageSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
},
packageDetailsCreative: {
    marginTop: 4,
    padding: 0,
    overflow: 'hidden',
},
packageDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
},
packageDetailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
},
packageBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
},
packageDetailsName: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
},
packageDetailsTag: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
},
editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
},
packageDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 16,
},
servicesBlock: {
    padding: 16,
},
servicesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
},
packagePriceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PRIMARY_SOFT,
    paddingHorizontal: 16,
    paddingVertical: 14,
},
priceFooterLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 2,
},
customPackagePanel: {
    alignItems: 'center',
    paddingVertical: 28,
},
customPackagePanelIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
},
customPackagePanelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 6,
},
customPackagePanelText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
    marginBottom: 16,
},
customPackagePanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
},
customPackagePanelButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
},
    activePackageTabText: {
        color: '#FFFFFF',
    },
    packageDetails: {
        marginTop: 2,
    },
    packageDetailItem: {
        fontSize: 13,
        marginTop: 6,
        marginBottom: 6,
        color: TEXT_MUTED,
        lineHeight: 19,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        marginTop: 6,
        marginBottom: 4,
    },
    priceText: {
        fontSize: 18,
        fontWeight: '800',
        color: PRIMARY,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: BG,
        gap: 10,
    },
    loadingText: {
        color: TEXT_MUTED,
        fontSize: 13,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: BG,
        padding: 24,
    },
    errorText: {
        fontSize: 15,
        color: '#D64545',
        textAlign: 'center',
        fontWeight: '600',
    },
    tabContent: {
        padding: 16,
    },
    eventifyReview: {
        backgroundColor: CARD,
        padding: 16,
        borderRadius: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: BORDER,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    reviewTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: PRIMARY_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 15,
        fontWeight: '800',
        color: PRIMARY,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    reviewDate: {
        fontSize: 11,
        color: TEXT_MUTED,
        marginTop: 1,
    },
    reviewText: {
        fontSize: 13,
        color: TEXT_DARK,
        lineHeight: 19,
    },
    emptyReviews: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyReviewsText: {
        color: TEXT_MUTED,
        fontSize: 13,
    },
    cartButton: {
        marginTop: 10,
        alignSelf: 'flex-end',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 18,
        backgroundColor: PRIMARY,
        borderRadius: 20,
    },
    cartButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
      emptyReviewsCreative: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
},
emptyReviewsIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
},
emptyReviewsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 6,
},
emptyReviewsSubtext: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
},
ratingSummaryCard: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
},
ratingSummaryLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    minWidth: 84,
},
ratingBigNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: PRIMARY,
},
ratingCountText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
},
ratingSummaryDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginRight: 16,
},
ratingSummaryRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
},
ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
},
ratingBarLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '600',
    width: 8,
},
ratingBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY_SOFT,
    overflow: 'hidden',
},
ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFC107',
    borderRadius: 3,
},
ratingBarCount: {
    fontSize: 11,
    color: TEXT_MUTED,
    width: 16,
    textAlign: 'right',
},
eventifyReviewCreative: {
    backgroundColor: CARD,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
},
avatarCircleCreative: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
},
reviewRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: PRIMARY_SOFT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
},
reviewRatingPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_DARK,
},
reviewQuoteBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: PRIMARY_LIGHT,
    marginTop: 10,
    marginBottom: 8,
},
reviewTextCreative: {
    fontSize: 13,
    color: TEXT_DARK,
    lineHeight: 20,
},

sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3D9EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
},
photoCountBadge: {
    backgroundColor: '#F3D9EC',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
},
photoCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY,
},
seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
},
photoContainerContent: {
    paddingVertical: 4,
    paddingRight: 8,
},
photoWrapper: {
    marginRight: 10,
    borderRadius: 16,
    overflow: 'hidden',

    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
},
noPhotosBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    backgroundColor: '#FBF6FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1D5E8',
    borderStyle: 'dashed',
},
noPhotosText: {
    fontSize: 13,
    color: '#8A7A85',
    marginTop: 8,
    fontWeight: '600',
},
});

export default VendorProfileDetailsScreen;