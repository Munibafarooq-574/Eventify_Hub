import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { getSecureData, saveSecureData } from '@/store';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8EAF2';
const GOLD = '#D6A943';
const GOLD_LIGHT = '#FFF5D6';
const TEXT = '#2A1F27';
const MUTED = '#8A7F87';
const BORDER = '#F0DCE7';

const CartManagementIndexScreen: React.FC = () => {
    const router = useRouter();
    const navigation = useNavigation();

    const [cartData, setCartData] = useState<any>(null);
    const [cateringCategory, setCateringCategory] = useState<any>(null);
    const [guests, setGuests] = useState<number>(0);

    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });

        const fetchCartData = async () => {
            try {
                const storedCart = await getSecureData('cartData');

                const eventDetailsRaw = await getSecureData('eventDetails');

                if (eventDetailsRaw) {
                    const eventDetails = JSON.parse(eventDetailsRaw);

                    if (eventDetails?.guests !== undefined) {
                        setGuests(parseInt(eventDetails.guests.toString(), 10));
                    }
                }

                const categoriesRaw = await getSecureData('categories');

                if (categoriesRaw) {
                    const categories = JSON.parse(categoriesRaw);

                    const catering = categories.find(
                        (x: any) =>
                            x?.name?.toLowerCase() === 'caterings'
                    );

                    setCateringCategory(catering || null);
                }

                if (storedCart) {
                    const parsedCart = JSON.parse(storedCart);

                    setCartData(
                        parsedCart?.vendors
                            ? parsedCart
                            : { vendors: [] }
                    );
                } else {
                    setCartData({ vendors: [] });
                }
            } catch (error) {
                console.error('Error fetching cart data:', error);

                setCartData({ vendors: [] });

                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to load cart data. Please try again.',
                    position: 'bottom',
                });
            }
        };

        fetchCartData();
    }, [navigation]);

    // -----------------------------------------
    // Remove complete cart
    // -----------------------------------------

    const handleEmptyCart = () => {
        Alert.alert(
            'Empty Cart',
            'Are you sure you want to remove all items from your cart?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Empty Cart',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await saveSecureData(
                                'cartData',
                                JSON.stringify({ vendors: [] })
                            );

                            setCartData({ vendors: [] });

                            Toast.show({
                                type: 'success',
                                text1: 'Cart Emptied',
                                text2: 'Your cart has been emptied.',
                                position: 'bottom',
                            });
                        } catch (error) {
                            console.error(
                                'Error emptying cart:',
                                error
                            );
                        }
                    },
                },
            ]
        );
    };

    // -----------------------------------------
    // Remove individual package
    // -----------------------------------------

    const handleDeletePackage = (
        vendorIndex: number,
        packageIndex: number
    ) => {
        if (!cartData?.vendors) return;

        const updatedCart = {
            ...cartData,
            vendors: [...cartData.vendors],
        };

        updatedCart.vendors[vendorIndex] = {
            ...updatedCart.vendors[vendorIndex],
            packages: [
                ...updatedCart.vendors[vendorIndex].packages,
            ],
        };

        updatedCart.vendors[vendorIndex].packages.splice(
            packageIndex,
            1
        );

        if (
            updatedCart.vendors[vendorIndex].packages.length === 0
        ) {
            updatedCart.vendors.splice(vendorIndex, 1);
        }

        saveSecureData(
            'cartData',
            JSON.stringify(updatedCart)
        );

        setCartData(updatedCart);

        Toast.show({
            type: 'success',
            text1: 'Package Removed',
            text2: 'The package has been removed from your cart.',
            position: 'bottom',
        });
    };

    const handleUpdateQuantity = (
    vendorIndex: number,
    packageIndex: number,
    delta: number
) => {
    if (!cartData?.vendors) return;

    const updatedCart = {
        ...cartData,
        vendors: [...cartData.vendors],
    };

    const vendor = {
        ...updatedCart.vendors[vendorIndex],
        packages: [
            ...updatedCart.vendors[vendorIndex].packages,
        ],
    };

    const pkg = {
        ...vendor.packages[packageIndex],
    };

    pkg.quantity = Math.max(
        1,
        Number(pkg.quantity || 1) + delta
    );

    vendor.packages[packageIndex] = pkg;
    updatedCart.vendors[vendorIndex] = vendor;

    saveSecureData(
        'cartData',
        JSON.stringify(updatedCart)
    );

    setCartData(updatedCart);
};

    // -----------------------------------------
    // Calculate total
    // -----------------------------------------

   const calculateTotalAmount = () => {
    if (!cartData?.vendors) return 0;

    let totalAmount = 0;

    cartData.vendors.forEach((vendor: any) => {
        if (!vendor?.packages) return;

        vendor.packages.forEach((pkg: any) => {
            const isCatering =
                cateringCategory?._id &&
                vendor?.vendor?.buisnessCategory ===
                    cateringCategory._id;

            const quantity = Number(pkg?.quantity || 1);
            const unitPrice = Number(pkg?.price || 0);

            totalAmount += isCatering
                ? unitPrice * Number(guests || 0) * quantity
                : unitPrice * quantity;
        });
    });

    return totalAmount;
};

    // -----------------------------------------
    // Checkout
    // -----------------------------------------

    const handleCheckout = () => {
        if (!cartData?.vendors?.length) {
            Toast.show({
                type: 'info',
                text1: 'Cart is Empty',
                text2: 'Please add a package before checkout.',
                position: 'bottom',
            });

            return;
        }

        router.push('/OrderReview');
    };

    // -----------------------------------------
    // Loading
    // -----------------------------------------

    if (!cartData) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingIcon}>
                    <Ionicons
                        name="cart-outline"
                        size={30}
                        color={PRIMARY}
                    />
                </View>

                <Text style={styles.loadingText}>
                    Loading your cart...
                </Text>
            </View>
        );
    }

    const totalAmount = calculateTotalAmount();

    const vendorCount = cartData?.vendors?.length || 0;

   const packageCount =
    cartData?.vendors?.reduce(
        (total: number, vendor: any) =>
            total +
            (vendor?.packages?.reduce(
                (s: number, p: any) =>
                    s + Number(p?.quantity || 1),
                0
            ) || 0),
        0
    ) || 0;

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-PK');
    };

    return (
        <View style={styles.container}>

            {/* =====================================
                HEADER
            ===================================== */}

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color={PRIMARY}
                    />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                        My Cart
                    </Text>

                    <Text style={styles.headerSubtitle}>
                        Review your selected services
                    </Text>
                </View>

                <View style={styles.headerCartIcon}>
                    <Ionicons
                        name="cart-outline"
                        size={23}
                        color={PRIMARY}
                    />

                    {packageCount > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>
                                {packageCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* =====================================
                CART SUMMARY
            ===================================== */}

            <View style={styles.summaryBanner}>
                <View style={styles.summaryIcon}>
                    <Ionicons
                        name="bag-handle-outline"
                        size={25}
                        color={PRIMARY}
                    />
                </View>

                <View style={styles.summaryTextContainer}>
                    <Text style={styles.summaryTitle}>
                        Your Event Cart
                    </Text>

                    <Text style={styles.summarySubtitle}>
                        {vendorCount} vendor
                        {vendorCount !== 1 ? 's' : ''} • {packageCount}{' '}
                        package
                        {packageCount !== 1 ? 's' : ''}
                    </Text>
                </View>

                <View style={styles.goldDot} />
            </View>

            {/* =====================================
                CART CONTENT
            ===================================== */}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {vendorCount === 0 ? (

                    /* =================================
                       EMPTY CART
                    ================================= */

                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons
                                name="cart-outline"
                                size={48}
                                color={PRIMARY}
                            />
                        </View>

                        <Text style={styles.emptyTitle}>
                            Your cart is empty
                        </Text>

                        <Text style={styles.emptyDescription}>
                            Add vendors and packages to start
                            planning your perfect event.
                        </Text>

                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.back()}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name="search-outline"
                                size={18}
                                color="#FFFFFF"
                            />

                            <Text style={styles.browseButtonText}>
                                Browse Vendors
                            </Text>
                        </TouchableOpacity>
                    </View>

                ) : (

                    <>
                        {/* =============================
                            VENDORS
                        ============================= */}

                        {cartData.vendors.map(
                            (vendor: any, vendorIndex: number) => {

                                 const vendorName =
                                    vendor?.vendorName ||
                                    vendor?.vendor?.contactDetails?.brandName ||
                                    vendor?.vendor?.ContactDetails?.brandName ||
                                    vendor?.vendor?.name ||
                                    'Vendor';

                                const packages =
                                    vendor?.packages || [];

                                return (
                                    <View
                                        key={`${vendorIndex}-${vendorName}`}
                                        style={styles.vendorCard}
                                    >
                                        {/* Vendor Header */}

                                        <View
                                            style={
                                                styles.vendorHeader
                                            }
                                        >
                                            <View
                                                style={
                                                    styles.vendorIcon
                                                }
                                            >
                                                <Ionicons
                                                    name="storefront-outline"
                                                    size={21}
                                                    color={PRIMARY}
                                                />
                                            </View>

                                            <View
                                                style={
                                                    styles.vendorInfo
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.vendorLabel
                                                    }
                                                >
                                                    VENDOR
                                                </Text>

                                                <Text
                                                    style={
                                                        styles.vendorName
                                                    }
                                                    numberOfLines={1}
                                                >
                                                    {vendorName}
                                                </Text>
                                            </View>

                                            <View
                                                style={
                                                    styles.packageCountBadge
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.packageCountText
                                                    }
                                                >
                                                    {packages.length}{' '}
                                                    {packages.length ===
                                                    1
                                                        ? 'Package'
                                                        : 'Packages'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Divider */}

                                        <View
                                            style={
                                                styles.vendorDivider
                                            }
                                        />

                                        {/* Packages */}

                                        {packages.map(
                                            (
                                                pkg: any,
                                                packageIndex: number
                                            ) => {
                                                const isCatering =
                                                    cateringCategory?._id &&
                                                    vendor?.vendor
                                                        ?.buisnessCategory ===
                                                        cateringCategory._id;

                                                const packagePrice =
                                                    Number(
                                                        pkg?.price || 0
                                                    );

                                                const finalPrice =
                                                    isCatering
                                                        ? packagePrice *
                                                          Number(
                                                              guests || 0
                                                          )
                                                        : packagePrice;

                                                return (
                                                    <View
                                                        key={`${packageIndex}-${pkg?.packageName || 'package'}`}
                                                        style={
                                                            styles.packageCard
                                                        }
                                                    >
                                                        <View
                                                            style={
                                                                styles.packageIcon
                                                            }
                                                        >
                                                            <Ionicons
                                                                name="cube-outline"
                                                                size={20}
                                                                color={
                                                                    PRIMARY
                                                                }
                                                            />
                                                        </View>

                                                        <View
                                                            style={
                                                                styles.packageInfo
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.packageName
                                                                }
                                                                numberOfLines={
                                                                    2
                                                                }
                                                            >
                                                                {
                                                                    pkg?.packageName
                                                                }
                                                            </Text>

                                                            {isCatering && (
                                                                <View
                                                                    style={
                                                                        styles.guestTag
                                                                    }
                                                                >
                                                                    <Ionicons
                                                                        name="people-outline"
                                                                        size={
                                                                            12
                                                                        }
                                                                        color={
                                                                            GOLD
                                                                        }
                                                                    />

                                                                    <Text
                                                                        style={
                                                                            styles.guestTagText
                                                                        }
                                                                    >
                                                                        {
                                                                            guests
                                                                        }{' '}
                                                                        guests
                                                                    </Text>
                                                                </View>
                                                            )}

                                                            <Text
                                                                style={
                                                                    styles.packagePrice
                                                                }
                                                            >
                                                                Rs.{' '}
                                                                {formatCurrency(
                                                                    finalPrice
                                                                )}
                                                            </Text>
                                                                                                                        <Text
                                                                style={{
                                                                    fontSize: 10,
                                                                    color: MUTED,
                                                                    marginTop: 2,
                                                                }}
                                                            >
                                                                {pkg.eventDate} • {pkg.startTime}–{pkg.endTime}
                                                            </Text>

                                                            <Text
                                                                style={{
                                                                    fontSize: 10,
                                                                    color: MUTED,
                                                                    marginTop: 2,
                                                                }}
                                                            >
                                                                Duration: {pkg.durationMinutes ? `${(pkg.durationMinutes / 60).toFixed(pkg.durationMinutes % 60 === 0 ? 0 : 1)} hr` : 'N/A'}
                                                                {pkg.priceBasis === 'custom' ? ' • Custom rate' : ' • Fixed rate'}
                                                                {typeof pkg.basePrice === 'number' && pkg.basePrice !== pkg.price ? ` • Base: Rs. ${pkg.basePrice.toLocaleString()}` : ''}
                                                            </Text>

                                                            <View
                                                                style={{
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center',
                                                                    marginTop: 6,
                                                                }}
                                                            >
                                                                <TouchableOpacity
                                                                    onPress={() =>
                                                                        handleUpdateQuantity(
                                                                            vendorIndex,
                                                                            packageIndex,
                                                                            -1
                                                                        )
                                                                    }
                                                                >
                                                                    <Ionicons
                                                                        name="remove-circle-outline"
                                                                        size={20}
                                                                        color={PRIMARY}
                                                                    />
                                                                </TouchableOpacity>

                                                                <Text
                                                                    style={{
                                                                        marginHorizontal: 8,
                                                                        fontWeight: '700',
                                                                    }}
                                                                >
                                                                    {pkg.quantity || 1}
                                                                </Text>

                                                                <TouchableOpacity
                                                                    onPress={() =>
                                                                        handleUpdateQuantity(
                                                                            vendorIndex,
                                                                            packageIndex,
                                                                            1
                                                                        )
                                                                    }
                                                                >
                                                                    <Ionicons
                                                                        name="add-circle-outline"
                                                                        size={20}
                                                                        color={PRIMARY}
                                                                    />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>

                                                        <TouchableOpacity
                                                            style={
                                                                styles.removeButton
                                                            }
                                                            onPress={() =>
                                                                handleDeletePackage(
                                                                    vendorIndex,
                                                                    packageIndex
                                                                )
                                                            }
                                                            activeOpacity={
                                                                0.75
                                                            }
                                                        >
                                                            <Ionicons
                                                                name="trash-outline"
                                                                size={18}
                                                                color="#C44D5C"
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            }
                                        )}
                                    </View>
                                );
                            }
                        )}

                        {/* =============================
                            PRICE SUMMARY
                        ============================= */}

                        <View style={styles.priceSummaryCard}>
                            <View style={styles.priceSummaryHeader}>
                                <View style={styles.priceSummaryIcon}>
                                    <Ionicons
                                        name="receipt-outline"
                                        size={20}
                                        color={PRIMARY}
                                    />
                                </View>

                                <Text
                                    style={
                                        styles.priceSummaryTitle
                                    }
                                >
                                    Price Summary
                                </Text>
                            </View>

                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>
                                    Packages
                                </Text>

                                <Text style={styles.priceValue}>
                                    Rs.{' '}
                                    {formatCurrency(
                                        totalAmount
                                    )}
                                </Text>
                            </View>

                            <View style={styles.priceDivider} />

                            <View style={styles.totalRow}>
                                <View>
                                    <Text
                                        style={
                                            styles.totalLabel
                                        }
                                    >
                                        Total Amount
                                    </Text>

                                    <Text
                                        style={
                                            styles.totalSubLabel
                                        }
                                    >
                                        Payable at checkout
                                    </Text>
                                </View>

                                <Text
                                    style={
                                        styles.totalAmount
                                    }
                                >
                                    Rs.{' '}
                                    {formatCurrency(
                                        totalAmount
                                    )}
                                </Text>
                            </View>
                        </View>

                        {/* Secure Payment Note */}

                        <View style={styles.secureNote}>
                            <View style={styles.secureIcon}>
                                <Ionicons
                                    name="shield-checkmark-outline"
                                    size={17}
                                    color="#278A4B"
                                />
                            </View>

                            <View style={styles.secureTextContainer}>
                                <Text
                                    style={
                                        styles.secureTitle
                                    }
                                >
                                    Secure Checkout
                                </Text>

                                <Text
                                    style={
                                        styles.secureDescription
                                    }
                                >
                                    Your payment information is
                                    protected.
                                </Text>
                            </View>
                        </View>

                        {/* Bottom spacing */}

                        <View style={{ height: 120 }} />
                    </>
                )}
            </ScrollView>

            {/* =====================================
                FIXED BOTTOM CHECKOUT
            ===================================== */}

            {vendorCount > 0 && (
                <View style={styles.bottomContainer}>

                    <View style={styles.bottomAmountRow}>
                        <View>
                            <Text style={styles.bottomAmountLabel}>
                                Total Payable
                            </Text>

                            <Text
                                style={
                                    styles.bottomAmountSubLabel
                                }
                            >
                                {packageCount} item
                                {packageCount !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        <Text style={styles.bottomAmount}>
                            Rs. {formatCurrency(totalAmount)}
                        </Text>
                    </View>

                    <View style={styles.bottomButtonsRow}>

                        {/* Empty Cart */}

                        <TouchableOpacity
                            style={styles.emptyCartButton}
                            onPress={handleEmptyCart}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={18}
                                color={PRIMARY}
                            />
                        </TouchableOpacity>

                        {/* Checkout */}

                        <TouchableOpacity
                            style={styles.checkoutButton}
                            onPress={handleCheckout}
                            activeOpacity={0.85}
                        >
                            <View style={styles.checkoutButtonContent}>
                                <Text
                                    style={
                                        styles.checkoutButtonText
                                    }
                                >
                                    Proceed to Checkout
                                </Text>

                                <Ionicons
                                    name="arrow-forward"
                                    size={19}
                                    color="#FFFFFF"
                                />
                            </View>
                        </TouchableOpacity>

                    </View>
                </View>
            )}
        </View>
    );
};

export default CartManagementIndexScreen;

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PRIMARY_LIGHT,
    },

    // ==========================================
    // Loading
    // ==========================================

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: PRIMARY_LIGHT,
    },

    loadingIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },

    loadingText: {
        fontSize: 14,
        color: MUTED,
        fontWeight: '600',
    },

    // ==========================================
    // Header
    // ==========================================

    header: {
        backgroundColor: '#FFFFFF',
        paddingTop: 52,
        paddingBottom: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },

    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },

    headerCenter: {
        flex: 1,
        marginLeft: 13,
    },

    headerTitle: {
        fontSize: 21,
        fontWeight: '800',
        color: TEXT,
    },

    headerSubtitle: {
        fontSize: 11,
        color: MUTED,
        marginTop: 2,
    },

    headerCartIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },

    cartBadge: {
        position: 'absolute',
        right: -2,
        top: -3,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: GOLD,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },

    cartBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    // ==========================================
    // Summary Banner
    // ==========================================

    summaryBanner: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },

    summaryIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },

    summaryTextContainer: {
        flex: 1,
        marginLeft: 12,
    },

    summaryTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: TEXT,
    },

    summarySubtitle: {
        fontSize: 11,
        color: MUTED,
        marginTop: 3,
    },

    goldDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: GOLD,
        marginRight: 4,
    },

    // ==========================================
    // Scroll
    // ==========================================

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },

    // ==========================================
    // Vendor Card
    // ==========================================

    vendorCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        marginBottom: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: BORDER,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },

    vendorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    vendorIcon: {
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },

    vendorInfo: {
        flex: 1,
        marginLeft: 11,
    },

    vendorLabel: {
        fontSize: 9,
        color: GOLD,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 2,
    },

    vendorName: {
        fontSize: 15,
        fontWeight: '800',
        color: TEXT,
    },

    packageCountBadge: {
        backgroundColor: GOLD_LIGHT,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 10,
    },

    packageCountText: {
        fontSize: 9,
        color: '#92721E',
        fontWeight: '800',
    },

    vendorDivider: {
        height: 1,
        backgroundColor: '#F3E8EE',
        marginVertical: 12,
    },

    // ==========================================
    // Package
    // ==========================================

    packageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FCF8FA',
        borderRadius: 14,
        padding: 11,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F4E6ED',
    },

    packageIcon: {
        width: 40,
        height: 40,
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER,
    },

    packageInfo: {
        flex: 1,
        marginLeft: 10,
    },

    packageName: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT,
    },

    packagePrice: {
        fontSize: 13,
        fontWeight: '800',
        color: PRIMARY,
        marginTop: 4,
    },

    guestTag: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: GOLD_LIGHT,
        borderRadius: 7,
        paddingHorizontal: 6,
        paddingVertical: 3,
        marginTop: 5,
    },

    guestTagText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#92721E',
        marginLeft: 3,
    },

    removeButton: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#FFF1F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },

    // ==========================================
    // Price Summary
    // ==========================================

    priceSummaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: BORDER,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },

    priceSummaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },

    priceSummaryIcon: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },

    priceSummaryTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: TEXT,
        marginLeft: 10,
    },

    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    priceLabel: {
        fontSize: 12,
        color: MUTED,
        fontWeight: '600',
    },

    priceValue: {
        fontSize: 13,
        color: TEXT,
        fontWeight: '700',
    },

    priceDivider: {
        height: 1,
        backgroundColor: '#F0E5EB',
        marginVertical: 14,
    },

    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    totalLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: TEXT,
    },

    totalSubLabel: {
        fontSize: 10,
        color: MUTED,
        marginTop: 3,
    },

    totalAmount: {
        fontSize: 19,
        fontWeight: '900',
        color: PRIMARY,
    },

    // ==========================================
    // Secure Note
    // ==========================================

    secureNote: {
        backgroundColor: '#F1FAF4',
        borderRadius: 14,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D9F0E0',
    },

    secureIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    secureTextContainer: {
        marginLeft: 9,
        flex: 1,
    },

    secureTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#278A4B',
    },

    secureDescription: {
        fontSize: 9,
        color: '#6E8B76',
        marginTop: 2,
    },

    // ==========================================
    // Empty Cart
    // ==========================================

    emptyContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        paddingHorizontal: 25,
        paddingVertical: 45,
        alignItems: 'center',
        marginTop: 18,
        borderWidth: 1,
        borderColor: BORDER,
    },

    emptyIconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },

    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: TEXT,
    },

    emptyDescription: {
        fontSize: 12,
        lineHeight: 19,
        color: MUTED,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 22,
    },

    browseButton: {
        backgroundColor: PRIMARY,
        borderRadius: 13,
        paddingHorizontal: 20,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
    },

    browseButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        marginLeft: 7,
    },

    // ==========================================
    // Bottom Checkout
    // ==========================================

    bottomContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },

    bottomAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 11,
    },

    bottomAmountLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: MUTED,
    },

    bottomAmountSubLabel: {
        fontSize: 9,
        color: '#A59AA1',
        marginTop: 2,
    },

    bottomAmount: {
        fontSize: 20,
        fontWeight: '900',
        color: PRIMARY,
    },

    bottomButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    emptyCartButton: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E9D1DF',
    },

    checkoutButton: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        backgroundColor: PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: PRIMARY,
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },

    checkoutButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    checkoutButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        marginRight: 9,
    },
});