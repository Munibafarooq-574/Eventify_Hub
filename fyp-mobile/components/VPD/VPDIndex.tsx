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

const PhotographerDetailsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'Details' | 'Packages' | 'Reviews'>('Details');
    const [activePackage, setActivePackage] = useState<number | null>(null);
    const [activeReviewTab, setActiveReviewTab] = useState<'Eventify' | 'Google'>('Eventify');
    const [vendorData, setVendorData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const { id } = useGlobalSearchParams();

    const [reviews, setReviews] = useState<any[]>([]);

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
                                    Rs. {vendorData?.BusinessDetails?.minimumPrice || "N/A"}/-
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
                    <View style={[styles.card, styles.photosSection]}>
                        <View style={styles.sectionTitleRow}>
                            <View style={styles.sectionTitleWithIcon}>
                                <Ionicons name="images-outline" size={18} color={PRIMARY} />
                                <Text style={styles.sectionTitle}>Photos</Text>
                            </View>
                            <TouchableOpacity
                                testID="see-all-photos"
                                onPress={() =>
                                    router.push({
                                        pathname: '/vendorprofileimages',
                                        params: { vendorId: vendorData._id },
                                    })
                                }
                                activeOpacity={0.7}
                            >
                                <Text style={styles.seeAllLink}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            testID="scroll-view"
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.photoContainer}
                        >
                            {vendorData.images.map((image: string, index: number) => (
                                <Image
                                    key={index}
                                    source={{
                                        uri: `${image}`,
                                    }}
                                    style={styles.photo}
                                />
                            ))}
                        </ScrollView>
                    </View>

                    {/* Business Details Card */}
                    <View style={styles.card}>
                        <View style={styles.detailsHeader}>
                            <View style={styles.sectionTitleWithIcon}>
                                <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
                                <Text style={styles.sectionTitle}>Details</Text>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/vendoreditprofile')} activeOpacity={0.7}>
                                <View style={styles.editPill}>
                                    <Ionicons name="pencil-outline" size={12} color={PRIMARY} />
                                    <Text style={styles.editLink}>Edit</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.detailBlock}>
                            <View style={styles.detailLabelRow}>
                                <Ionicons name="people-outline" size={15} color={TEXT_MUTED} />
                                <Text style={styles.detailLabel}>Staff</Text>
                            </View>
                            <Text style={styles.detailValue}>
                        {vendorData?.venueBusinessDetails?.staff?.join(', ') || "N/A"}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailBlock}>
                            <View style={styles.detailLabelRow}>
                                <Ionicons name="shield-checkmark-outline" size={15} color={TEXT_MUTED} />
                                <Text style={styles.detailLabel}>Cancellation Policy</Text>
                            </View>
                            <Text style={styles.detailValue}>
    {vendorData?.venueBusinessDetails?.cancellationPolicy || "N/A"}
</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailBlock}>
                            <View style={styles.detailLabelRow}>
                                <Ionicons name="map-outline" size={15} color={TEXT_MUTED} />
                                <Text style={styles.detailLabel}>Cities Covered</Text>
                            </View>
                            <Text style={styles.detailValue}>
                                {vendorData?.BusinessDetails?.cityCovered || "N/A"}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailBlock}>
                            <View style={styles.detailLabelRow}>
                                <Ionicons name="document-text-outline" size={15} color={TEXT_MUTED} />
                                <Text style={styles.detailLabel}>Description</Text>
                            </View>
                            <Text style={styles.detailValue}>
                                {vendorData?.BusinessDetails?.description || "N/A"}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {activeTab === "Packages" && (
                <View style={styles.detailsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.packageTabContainer}
                        contentContainerStyle={{ paddingRight: 8 }}
                    >
                        {vendorData.packages.map((pkg: any) => (
                            <TouchableOpacity
                                key={pkg._id}
                                style={[
                                    styles.packageTab,
                                    activePackage === pkg._id && styles.activePackageTab,
                                ]}
                                onPress={() => setActivePackage(pkg._id)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.packageTabText,
                                        activePackage === pkg._id && styles.activePackageTabText,
                                    ]}
                                >
                                    {pkg.packageName}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={styles.packageTab}
                            onPress={() => setActivePackage(null)} // deselect packages
                            activeOpacity={0.8}
                        >
                            <Text style={styles.packageTabText}>📩 Contact for custom packages</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Package Details */}
                    {vendorData.packages
                        .filter((pkg: any) => pkg._id === activePackage)
                        .map((pkg: any) => (
                            <View key={pkg._id} style={[styles.card, styles.packageDetails]}>
                                <View style={styles.sectionTitleWithIcon}>
                                    <Ionicons name="briefcase-outline" size={18} color={PRIMARY} />
                                    <Text style={styles.sectionTitle}>Services</Text>
                                </View>
                                <Text
                                    testID="package-services"
                                    style={styles.packageDetailItem}
                                >
                                    {pkg.services}
                                </Text>

                                <View style={styles.priceRow}>
                                    <Ionicons name="cash-outline" size={18} color={PRIMARY} />
                                    <Text testID="package-price" style={styles.priceText}>
                                        Rs. {pkg.price}/-
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    testID={`edit-package-${pkg._id}`}
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
                                    <Text style={styles.cartButtonText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                </View>
            )}

            {activeTab === "Reviews" && (
                <View style={styles.tabContent}>
                    {/* Eventify Reviews */}
                    {activeReviewTab === "Eventify" && (
                        <View>
                            {reviews.length === 0 && (
                                <View style={styles.emptyReviews}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={30} color={TEXT_MUTED} />
                                    <Text style={styles.emptyReviewsText}>No reviews yet</Text>
                                </View>
                            )}
                            {reviews.map((review, index) => (
                                <View key={index} style={styles.eventifyReview}>
                                    <View style={styles.reviewTopRow}>
                                        <View style={styles.avatarCircle}>
                                            <Text style={styles.avatarInitial}>
                                                {(review.reviewerName || 'A').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.reviewerName}>{review.reviewerName || 'Anonymous'}</Text>
                                            <Text style={styles.reviewDate}>{new Date(review.createdAt).toDateString()}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.reviewText}>{review.reviewText}</Text>
                                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Ionicons
                                                key={star}
                                                name={review.rating >= star ? 'star' : 'star-outline'}
                                                size={16}
                                                color="#FFC107"
                                            />
                                        ))}
                                    </View>
                                </View>
                            ))}
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
});

export default PhotographerDetailsScreen;