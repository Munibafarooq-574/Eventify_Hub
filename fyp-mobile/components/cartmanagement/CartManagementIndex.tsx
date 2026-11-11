import { validateCoupon } from '@/services/validateCoupon';
import { cartCurrencies, currencySymbol, currencyOf, cartCurrency } from '@/utils/currency';
import { eventLocalDateTime, validTimeZone } from '@/utils/bookingTimezone';
import PackagePricingLabel from '@/components/booking/PackagePricingLabel';
import { packageAmount, pricingLabel, pricingMethod } from '@/utils/packagePricing';
import { usePullToRefresh } from '@/components/refresh/usePullToRefresh';
import DeliveryDetails from '@/components/booking/DeliveryDetails';
import { deliveryFee } from '@/utils/deliveryBooking';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { createBookingDraftStore, getSecureData } from '@/store';
import getActiveCities from '@/services/getActiveCities';
import getAllCategories from '@/services/getAllCategories';

const CART_REFRESH_INTERVAL_MS = 15000;

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8EAF2';
const GOLD = '#D6A943';
const GOLD_LIGHT = '#FFF5D6';
const TEXT = '#2A1F27';
const MUTED = '#8A7F87';
const BORDER = '#F0DCE7';

const formatCartDuration = (rawMinutes: unknown): string => {
    const minutes = Number(rawMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return 'Duration N/A';
    if (minutes % 1440 === 0) {
        const days = minutes / 1440;
        return `${days} ${days === 1 ? 'Day' : 'Days'}`;
    }
    if (minutes % 60 === 0) {
        const hours = minutes / 60;
        return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
    }
    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`;
};

const cartCategory = (pkg: any, entry: any) => {
    const category = entry?.vendor?.buisnessCategory;
    const id = [pkg?.categoryId, category?._id, category, entry?.vendor?.categoryId]
        .find(value => typeof value === 'string' && value.trim() && value !== '[object Object]');
    const name = [pkg?.categoryName, category?.name, entry?.vendor?.categoryName]
        .find(value => typeof value === 'string' && value.trim());
    return { id, name: name?.trim() };
};

const CartManagementIndexScreen: React.FC = () => {
  const [draft] = useState(createBookingDraftStore);
  const savingCart = useRef(false);
  const fetchingCart = useRef(false);
  const lastSnapshot = useRef<string | null>(null);
  const [syncingCart, setSyncingCart] = useState(false);
  const [syncError, setSyncError] = useState('');
const router = useRouter();
const navigation = useNavigation();

const [cartData, setCartData] = useState<any>(null);
const [categoryNames, setCategoryNames] = useState<Map<string, string>>(() => new Map());
const [cateringCategory, setCateringCategory] = useState<any>(null);
const [guests, setGuests] = useState<number>(0);

const [eventCityName, setEventCityName] = useState('');
const [eventTimeZone, setEventTimeZone] = useState('UTC');
 const [eventAddress, setEventAddress] = useState('');
const [eventDetails, setEventDetails] = useState<any>(null);


    const fetchCartData = useCallback(async () => {
        if (savingCart.current || fetchingCart.current || !draft.isCurrent()) return;
        fetchingCart.current = true;
        setSyncingCart(true);
        try {
                const [storedCart, eventDetailsRaw] = await Promise.all([
                    draft.get('cartData'), draft.get('eventDetails'),
                ]);
                if (!draft.isCurrent()) return;
                setSyncError('');
                const snapshot = JSON.stringify([storedCart, eventDetailsRaw]);
                if (lastSnapshot.current === snapshot) return;
                if (!eventDetailsRaw) {
                    setEventDetails(null);
                    setEventAddress('');
                    setEventCityName('');
                    setGuests(0);
                }

if (eventDetailsRaw) {
    const eventDetails = JSON.parse(eventDetailsRaw);
    setEventDetails(eventDetails);

    if (eventDetails?.guests !== undefined) {
        setGuests(
            parseInt(
                eventDetails.guests.toString(),
                10
            )
        );
    }

    setEventAddress(
        typeof eventDetails?.eventAddress === 'string'
            ? eventDetails.eventAddress.trim()
            : ''
    );

    if (eventDetails?.eventCityId) {
        try {
            const activeCities = await getActiveCities();

            const selectedCity = Array.isArray(activeCities)
                ? activeCities.find(
                      (city: any) =>
                          city?._id === eventDetails.eventCityId
                  )
                : undefined;

                    setEventTimeZone(validTimeZone(selectedCity?.timeZone || eventDetails?.eventTimeZone));
                    setEventCityName(
                        selectedCity?.name || ''
                    );
                } catch (error) {
                    console.error(
                        'Error loading event city:',
                        error
                    );

                    setEventCityName('');
                }
            } else {
                setEventCityName('');
            }
        }

                const categoriesRaw = await getSecureData('categories');
                const categories = categoriesRaw ? JSON.parse(categoriesRaw) : [];
                const cachedCategories = Array.isArray(categories) ? categories : [];
                setCateringCategory(cachedCategories.find(
                    (category: any) => category?.name?.toLowerCase() === 'caterings'
                ) || null);

                const parsedCart = storedCart ? JSON.parse(storedCart) : null;
                const cart = Array.isArray(parsedCart?.vendors) ? parsedCart : { vendors: [] };
                setCartData(cart);

                const names = new Map<string, string>(cachedCategories.map(
                    (category: any) => [String(category?._id), category?.name]
                ));
                setCategoryNames(names);

                const needsCategoryLookup = cart.vendors.some((entry: any) =>
                    entry.packages?.some((pkg: any) => {
                        const { id, name } = cartCategory(pkg, entry);
                        return id && !name && !names.get(id);
                    })
                );
                if (needsCategoryLookup) {
                    try {
                        const fetched = await getAllCategories();
                        if (Array.isArray(fetched)) {
                            const resolvedNames = new Map(names);
                            for (const category of fetched) {
                                if (category?._id && category?.name) resolvedNames.set(String(category._id), category.name);
                            }
                            setCategoryNames(resolvedNames);
                        }
                    } catch {
                        // Keep the cart usable when category names cannot be loaded.
                    }
                }
                lastSnapshot.current = snapshot;
        } catch (error) {
            if (draft.isCurrent()) {
                setSyncError(error instanceof Error ? error.message : 'Failed to load cart data. Please try again.');
            }
        } finally {
            fetchingCart.current = false;
            if (draft.isCurrent()) setSyncingCart(false);
        }
    }, [draft]);

    useFocusEffect(useCallback(() => {
        navigation.setOptions({ headerShown: false });
        void fetchCartData();
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') void fetchCartData();
        });
        const timer = setInterval(() => {
            if (AppState.currentState === 'active') void fetchCartData();
        }, CART_REFRESH_INTERVAL_MS);
        return () => {
            clearInterval(timer);
            subscription.remove();
        };
    }, [fetchCartData, navigation]));

    const { refreshControl } = usePullToRefresh(fetchCartData);

    const saveCart = async (updatedCart: any) => {
        if (savingCart.current) return false;
        if (fetchingCart.current) {
            Toast.show({ type: 'info', text1: 'Cart is refreshing', text2: 'Try your change again in a moment.' });
            return false;
        }
        savingCart.current = true;
        try {
            await draft.save('cartData', JSON.stringify(updatedCart));
            if (!draft.isCurrent()) return false;
            lastSnapshot.current = null;
            setCartData(updatedCart);
            return true;
        } catch (error) {
            if (draft.isCurrent()) {
                Toast.show({ type: 'error', text1: 'Could not update cart', text2: error instanceof Error ? error.message : 'Please try again.' });
            }
        } finally {
            savingCart.current = false;
        }
        if (draft.isCurrent()) await fetchCartData();
        return false;
    };

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
                            if (!await saveCart({ vendors: [] })) return;

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

    const handleDeletePackage = async (
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

        if (!await saveCart(updatedCart)) return;

        Toast.show({
            type: 'success',
            text1: 'Package Removed',
            text2: 'The package has been removed from your cart.',
            position: 'bottom',
        });
    };

    const handleUpdateQuantity = async (
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

        if (pricingMethod(pkg, !!(cateringCategory?._id && vendor.vendor?.buisnessCategory === cateringCategory._id) || pkg.categoryName?.toLowerCase().includes('catering')) === 'PER_PERSON') {
            pkg.personCount = Math.max(1, Number(pkg.personCount ?? guests ?? 1) + delta);
        } else {
            pkg.quantity = Math.max(1, Number(pkg.quantity || 1) + delta);
        }

        if (pkg.pendingCouponCode && updatedCart.appliedPromotions) {
            const key = `${vendor.vendor?._id || vendor.vendorId}:${pkg.packageId || pkg._id}`;
            const promotion = updatedCart.appliedPromotions[key];
            if (promotion?.promotionCode === pkg.pendingCouponCode) {
                updatedCart.appliedPromotions = { ...updatedCart.appliedPromotions };
                delete updatedCart.appliedPromotions[key];
            }
        }
        vendor.packages[packageIndex] = pkg;
        updatedCart.vendors[vendorIndex] = vendor;

        if (!await saveCart(updatedCart)) return;
    };

    const getCartLine = useCallback((vendor: any, pkg: any) => {
        const vendorId = String(vendor.vendor?._id || vendor.vendorId || '');
        const packageId = String(pkg.packageId || pkg._id || '');
        const code = String(pkg.pendingCouponCode || '').trim().toUpperCase();
        const isCatering = !!(cateringCategory?._id && vendor.vendor?.buisnessCategory === cateringCategory._id) ||
            !!pkg.categoryName?.toLowerCase().includes('catering');
        const originalAmount = packageAmount(pkg, guests, isCatering) +
            deliveryFee(pkg, Number(pkg.quantity || 1), guests, isCatering).totalFee;
        const currency = currencyOf(pkg);
        return { vendorId, packageId, code, originalAmount, currency,
            key: JSON.stringify([vendorId, packageId, code, originalAmount, currency]) };
    }, [cateringCategory?._id, guests]);

    const cartLines = useMemo(() => (cartData?.vendors || []).flatMap((vendor: any) =>
        (vendor.packages || []).map((pkg: any) => getCartLine(vendor, pkg)),
    ) as ReturnType<typeof getCartLine>[], [cartData, getCartLine]);

    const [couponQuotes, setCouponQuotes] = useState<Record<string, number | null>>({});
    useFocusEffect(useCallback(() => {
        let active = true;
        setCouponQuotes({});
        const offers = cartLines.filter(line => line.code && line.vendorId && line.packageId);
        if (offers.length) {
            void (async () => {
                const session = await draft.getSession().catch(() => null);
                const results: Record<string, number | null> = {};
                const quotedCodes = new Set<string>();
                for (const line of offers) {
                    if (!active) return;
                    const codeKey = `${line.vendorId}:${line.code}`;
                    results[line.key] = null;
                    if (!session || quotedCodes.has(codeKey)) continue;
                    try {
                        const quote = await validateCoupon(
                            line.vendorId, line.code, line.originalAmount, session.userId, line.packageId,
                        );
                        if (currencyOf(quote) === line.currency && Number.isFinite(quote.finalAmount) &&
                            quote.finalAmount >= 0 && quote.finalAmount < line.originalAmount) {
                            results[line.key] = quote.finalAmount;
                            quotedCodes.add(codeKey);
                        }
                    } catch {
                        // Review Order will display the backend's reason and ask before booking.
                    }
                }
                if (active && draft.isCurrent()) setCouponQuotes(results);
            })();
        }
        return () => { active = false; };
    }, [cartLines, draft]));

    const originalTotal = cartLines.reduce((sum, line) => sum + line.originalAmount, 0);
    const cartCouponSavings = cartLines.reduce((sum, line) =>
        sum + line.originalAmount - (couponQuotes[line.key] ?? line.originalAmount), 0);

    // -----------------------------------------
    // Checkout
    // -----------------------------------------

    const getResolvedServiceTiming = (pkg: any) => {
    if (String(pkg.bookingType || 'DURATION_BASED').toUpperCase() !== 'DURATION_BASED' && pkg.requiredServiceWindow?.startDateTime && pkg.requiredServiceWindow?.endDateTime) return { bookingType: pkg.deliveryFeeType ? 'DELIVERY_BASED' : String(pkg.bookingType || 'DURATION_BASED').toUpperCase(), start: new Date(pkg.requiredServiceWindow.startDateTime), end: new Date(pkg.requiredServiceWindow.endDateTime) };
    const bookingType = String(
        pkg?.bookingType || 'DURATION_BASED',
    ).toUpperCase();

    const eventDate =
        eventDetails?.eventDate ||
        pkg?.eventDate;

    const eventStartTime =
        eventDetails?.startTime ||
        eventDetails?.eventTime ||
        pkg?.startTime;

    const eventEndTime =
        eventDetails?.endTime ||
        pkg?.endTime;

    if (!eventDate || !eventStartTime) {
        return null;
    }

    const dateOnly =
        String(eventDate).split('T')[0];

    const eventStart =
        eventLocalDateTime(dateOnly, eventStartTime, eventTimeZone);

    if (Number.isNaN(eventStart.getTime())) {
        return null;
    }

    // -----------------------------------------
    // DURATION_BASED
    // Event start -> event end
    // -----------------------------------------
    if (bookingType === 'DURATION_BASED') {
        const durationMinutes = Number(pkg?.durationMinutes || eventDetails?.durationMinutes);
        const end = Number.isFinite(durationMinutes) && durationMinutes > 0
            ? new Date(eventStart.getTime() + durationMinutes * 60000)
            : eventLocalDateTime(dateOnly, eventEndTime || '', eventTimeZone);

        if (
            !end ||
            Number.isNaN(end.getTime())
        ) {
            return null;
        }

        return {
            bookingType,
            start: eventStart,
            end,
        };
    }

    // Selected appointment/setup interval is authoritative; never use the entire allowed setup window.
    if (bookingType === 'TIME_SLOT_BASED' || bookingType === 'SETUP_BASED') {
        const selectedWindow = pkg?.requiredServiceWindow;
        if (!selectedWindow?.startDateTime || !selectedWindow?.endDateTime) return null;
        const start = new Date(selectedWindow.startDateTime);
        const end = new Date(selectedWindow.endDateTime);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
            end.getTime() <= start.getTime()) return null;
        return { bookingType, start, end };
    }

    // -----------------------------------------
    // DELIVERY_BASED
    // Exact delivery time = configured start offset
    // -----------------------------------------
    if (bookingType === 'DELIVERY_BASED') {
        const deliveryOffset =
            Number(
                pkg?.serviceWindowStartOffsetMinutes,
            );

        if (!Number.isFinite(deliveryOffset)) {
            return null;
        }

        const deliveredAt =
            new Date(
                eventStart.getTime() +
                deliveryOffset * 60000,
            );

        return {
            bookingType,
            start: deliveredAt,
            end: deliveredAt,
        };
    }

    return null;
};

    const handleCheckout = () => {
        if (cartCurrencies(cartData).length > 1) {
            Alert.alert('Different currencies', 'Remove packages in the other currency before checkout.');
            return;
        }
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
                {syncError && !syncingCart ? (
                    <>
                        <Text style={styles.loadingText}>{syncError}</Text>
                        <TouchableOpacity accessibilityRole="button" onPress={() => void fetchCartData()}>
                            <Text style={styles.loadingText}>Try again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()}>
                            <Text style={styles.loadingText}>Go back</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <ActivityIndicator accessibilityLabel="Loading cart" size="large" color={PRIMARY} />
                        <Text style={styles.loadingText}>Loading your cart...</Text>
                    </>
                )}
            </View>
        );
    }

    const mixedCurrency = cartCurrencies(cartData).length > 1;
    const totalAmount = mixedCurrency ? 0 : originalTotal - cartCouponSavings;

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
            {mixedCurrency && <Text accessibilityRole="alert" style={{padding:16,color:'#A11A35'}}>This cart contains different currencies. Remove packages in the other currency before checkout.</Text>}

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
                        {syncingCart ? 'Refreshing cart…' : syncError ? 'Refresh failed. Pull down to retry.' : 'Review your selected services'}
                    </Text>
                </View>

                <View style={styles.headerCartIcon}>
                    {syncingCart ? <ActivityIndicator accessibilityLabel="Refreshing cart" color={PRIMARY} /> : <Ionicons
                        name="cart-outline"
                        size={23}
                        color={PRIMARY}
                    />}

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

{/* Event Location */}
{(eventCityName || eventAddress) && (
    <View style={styles.eventLocationCard}>
        <View style={styles.eventLocationIcon}>
            <Ionicons
                name="location-outline"
                size={20}
                color={PRIMARY}
            />
        </View>

        <View style={styles.eventLocationContent}>
            <Text style={styles.eventLocationTitle}>
                Event Location
            </Text>

            {!!eventCityName && (
                <View style={styles.eventLocationRow}>
                    <Text style={styles.eventLocationLabel}>
                        City
                    </Text>

                    <Text style={styles.eventLocationValue}>
                        {eventCityName} · {eventTimeZone}
                    </Text>
                </View>
            )}

            {!!eventAddress && (
                <View style={styles.eventLocationRow}>
                    <Text style={styles.eventLocationLabel}>
                        Address
                    </Text>

                    <Text
                        style={styles.eventLocationValue}
                        numberOfLines={3}
                    >
                        {eventAddress}
                    </Text>
                </View>
            )}
        </View>
    </View>
)}

{/* =====================================
    CART CONTENT
===================================== */}

            <ScrollView
                refreshControl={refreshControl}
                alwaysBounceVertical
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

                                        <View style={styles.vendorHeader}>
                                            <View style={styles.vendorIcon}>
                                                <Ionicons
                                                    name="storefront-outline"
                                                    size={21}
                                                    color={PRIMARY}
                                                />
                                            </View>

                                            <View style={styles.vendorInfo}>
                                                <Text style={styles.vendorLabel}>
                                                    VENDOR
                                                </Text>

                                                <Text
                                                    style={styles.vendorName}
                                                    numberOfLines={1}
                                                >
                                                    {vendorName}
                                                </Text>
                                            </View>

                                            <View style={styles.packageCountBadge}>
                                                <Text style={styles.packageCountText}>
                                                    {packages.length}{' '}
                                                    {packages.length === 1
                                                        ? 'Package'
                                                        : 'Packages'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Divider */}

                                        <View style={styles.vendorDivider} />

                                        {/* Packages */}

                                        {packages.map(
                                            (
                                                pkg: any,
                                                packageIndex: number
                                            ) => {
                                                const category = cartCategory(pkg, vendor);
                                                const categoryName = category.name || (category.id && categoryNames.get(category.id));
                                                const isCatering =
                                                    cateringCategory?._id &&
                                                    vendor?.vendor
                                                        ?.buisnessCategory ===
                                                        cateringCategory._id;

                                                         const resolvedTiming =
                                                            getResolvedServiceTiming(pkg);

                                                        const serviceWindowStart =
                                                            resolvedTiming?.start || null;

                                                        const serviceWindowEnd =
                                                            resolvedTiming?.end || null;

                                                const formatServiceTime = (
                                                            value: Date | null
                                                        ) => {
                                                            if (
                                                                !value ||
                                                                Number.isNaN(value.getTime())
                                                            ) {
                                                                return null;
                                                            }

                                                            return value.toLocaleTimeString(
                                                                'en-US',
                                                                {
                                                                    timeZone: eventTimeZone,
                                                                    hour: 'numeric',
                                                                    minute: '2-digit',
                                                                    hour12: true,
                                                                },
                                                            );
                                                        };

                                                    const serviceStartText =
                                                        formatServiceTime(serviceWindowStart);

                                                    const serviceEndText =
                                                        formatServiceTime(serviceWindowEnd);
                                                const cartLine = getCartLine(vendor, pkg);
                                                const quotedPrice = couponQuotes[cartLine.key];
                                                const finalPrice = quotedPrice ?? cartLine.originalAmount;


                                                return (
                                                    <View
                                                        key={`${packageIndex}-${pkg?.packageName || 'package'}`}
                                                        style={styles.packageCard}
                                                    >
                                                        <View style={styles.packageIcon}>
                                                            <Ionicons
                                                                name="cube-outline"
                                                                size={20}
                                                                color={PRIMARY}
                                                            />
                                                        </View>

                                                        <View style={styles.packageInfo}>
                                                            {categoryName && (
                                                                <Text style={styles.packageCategory} numberOfLines={1}>
                                                                    {categoryName}
                                                                </Text>
                                                            )}
                                                            <Text
                                                                style={styles.packageName}
                                                                numberOfLines={2}
                                                            >
                                                                {pkg?.packageName}
                                                            </Text>
                                                            <PackagePricingLabel pkg={pkg} legacyPerPerson={!!isCatering} />

                                                            {isCatering && (
                                                                <View style={styles.guestTag}>
                                                                    <Ionicons
                                                                        name="people-outline"
                                                                        size={12}
                                                                        color={GOLD}
                                                                    />

                                                                    <Text style={styles.guestTagText}>
                                                                        {guests}{' '}
                                                                        guests
                                                                    </Text>
                                                                </View>
                                                            )}

                                                            <Text style={styles.packagePrice}>
                                                                {currencySymbol(currencyOf(pkg))}{' '}
                                                                {formatCurrency(finalPrice)}
                                                                {quotedPrice != null && (
                                                                    <Text style={{ color: MUTED, fontSize: 12, textDecorationLine: 'line-through' }}>
                                                                        {'  '}{currencySymbol(currencyOf(pkg))} {formatCurrency(cartLine.originalAmount)}
                                                                    </Text>
                                                                )}
                                                            </Text>
                                                            {cartLine.code ? (
                                                              <Text style={{ color: PRIMARY, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                                                                {cartLine.code}{quotedPrice != null ? ' applied'
                                                                  : quotedPrice === null ? ' · Check availability on Review Order'
                                                                    : ' · Checking offer…'}
                                                              </Text>
                                                            ) : null}

                                                            {/* Booking Details */}

                                                            <View style={styles.bookingDetailsBox}>
                                                                <View style={styles.bookingDetailItem}>
                                                                    <View style={styles.bookingDetailIcon}>
                                                                        <Ionicons
                                                                            name="calendar-outline"
                                                                            size={14}
                                                                            color={PRIMARY}
                                                                        />
                                                                    </View>

                                                                    <Text style={styles.bookingDetailText}>
                                                                        {pkg.eventDate || 'Date not selected'}
                                                                    </Text>
                                                                </View>

                                                                <View style={styles.bookingDetailItem}>
                                                                    <View style={styles.bookingDetailIcon}>
                                                                        <Ionicons
                                                                            name="time-outline"
                                                                            size={14}
                                                                            color={PRIMARY}
                                                                        />
                                                                    </View>

                                                                    <Text style={styles.bookingDetailText}>
                                                                    {resolvedTiming?.bookingType ===
                                                                    'DELIVERY_BASED'
                                                                        ? serviceStartText
                                                                            ? `Delivered At: ${serviceStartText}`
                                                                            : 'Delivery time unavailable'

                                                                        : resolvedTiming?.bookingType ===
                                                                        'SETUP_BASED'
                                                                        ? serviceStartText &&
                                                                        serviceEndText
                                                                            ? `Setup Time: ${serviceStartText} - ${serviceEndText}`
                                                                            : 'Setup window unavailable'

                                                                        : resolvedTiming?.bookingType ===
                                                                        'TIME_SLOT_BASED'
                                                                        ? serviceStartText &&
                                                                        serviceEndText
                                                                            ? `Appointment: ${serviceStartText} - ${serviceEndText}`
                                                                            : 'Appointment time unavailable'

                                                                        : serviceStartText &&
                                                                        serviceEndText
                                                                        ? `Service: ${serviceStartText} - ${serviceEndText}`
                                                                        : 'Service time unavailable'}
                                                                        </Text>
                                                                </View>

                                                               {resolvedTiming?.bookingType !==
                                                                'DELIVERY_BASED' && (
                                                                <View style={styles.bookingDetailItem}>
                                                                    <View style={styles.bookingDetailIcon}>
                                                                        <Ionicons
                                                                            name="hourglass-outline"
                                                                            size={14}
                                                                            color={PRIMARY}
                                                                        />
                                                                    </View>

                                                                    <Text style={styles.bookingDetailText}>
                                                                        {formatCartDuration(
                                                                            (resolvedTiming?.bookingType === 'TIME_SLOT_BASED' || resolvedTiming?.bookingType === 'SETUP_BASED')
                                                                                 ? pkg?.requiredServiceDurationMinutes
                                                                                 : pkg?.durationMinutes
                                                                        )}
                                                                    </Text>
                                                                </View>
                                                            )}

                                                                <View style={styles.bookingDetailItem}>
                                                                    <View style={styles.bookingDetailIcon}>
                                                                        <Ionicons
                                                                            name="pricetag-outline"
                                                                            size={14}
                                                                            color={PRIMARY}
                                                                        />
                                                                    </View>

                                                                    <Text style={styles.bookingDetailText}>
{pkg.priceBasis === 'custom'
                                                                            ? 'Custom Duration'
                                                                            : 'Fixed Rate'}
                                                                    </Text>
                                                                </View>

                                                    <Text style={styles.quantityLabel}>Rate {pricingLabel(pkg, !!isCatering)}{pricingMethod(pkg, !!isCatering) === 'GROUP' ? ` · ${Number(pkg.groupSize) * Number(pkg.quantity || 1)} people included` : ''}</Text>
                                                    <DeliveryDetails pkg={pkg} quantity={Number(pkg.quantity || 1)} guests={Number(guests || 0)} isCatering={!!isCatering} />
                                                    {pkg.priceBasis === 'custom' &&
                                                        Number(pkg.customDurationRate) > 0 &&
                                                        Number(pkg.durationMinutes) > 0 && (
                                                            <View style={styles.bookingDetailItem}>
                                                                <View style={styles.bookingDetailIcon}>
                                                                    <Ionicons
                                                                        name="cash-outline"
                                                                        size={14}
                                                                        color={PRIMARY}
                                                                    />
                                                                </View>

                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={styles.bookingDetailText}>
                                                                        Rate: {currencySymbol(currencyOf(pkg))}{' '}
                                                                        {formatCurrency(
                                                                            Number(pkg.customDurationRate)
                                                                        )}{' '}
                                                                        /{' '}
                                                                        {pkg.customDurationUnit === 'DAYS'
                                                                            ? 'day'
                                                                            : 'hour'}
                                                                    </Text>

                                                                    <Text style={styles.bookingDetailText}>
                                                                        {Number(pkg.baseIncludedDurationMinutes) > 0 && Number(pkg.durationMinutes) > Number(pkg.baseIncludedDurationMinutes)
                                                                            ? `Base ${currencySymbol(currencyOf(pkg))} ${formatCurrency(Number(pkg.basePrice))} includes ${Number(pkg.baseIncludedDurationMinutes) / 60} hour(s). Extra time at the shown rate. Total ${currencySymbol(currencyOf(pkg))} ${formatCurrency(Number(pkg.price))}`
                                                                            : `${pkg.customDurationUnit === 'DAYS' ? Number(pkg.durationMinutes) / 1440 : Number(pkg.durationMinutes) / 60} unit(s) at the custom rate. Total ${currencySymbol(currencyOf(pkg))} ${formatCurrency(Number(pkg.price))}`}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        )}
                                                            </View>

                                                            {/* Quantity */}

                                                            <View style={styles.quantityRow}>
                                                                <Text style={styles.quantityLabel}>
                                                                    {pricingMethod(pkg, !!isCatering) === 'PER_PERSON' ? 'People' : 'Quantity'}
                                                                </Text>

                                                                <View style={styles.quantityControl}>
                                                                    <TouchableOpacity
                                                                        style={styles.quantityButton}
                                                                        onPress={() =>
                                                                            handleUpdateQuantity(
                                                                                vendorIndex,
                                                                                packageIndex,
                                                                                -1
                                                                            )
                                                                        }
                                                                        activeOpacity={0.75}
                                                                    >
                                                                        <Ionicons
                                                                            name="remove"
                                                                            size={17}
                                                                            color={PRIMARY}
                                                                        />
                                                                    </TouchableOpacity>

                                                                    <Text style={styles.quantityValue}>
                                                                        {pricingMethod(pkg, !!isCatering) === 'PER_PERSON' ? (pkg.personCount ?? guests) : (pkg.quantity || 1)}
                                                                    </Text>

                                                                    <TouchableOpacity
                                                                        style={styles.quantityButton}
                                                                        onPress={() =>
                                                                            handleUpdateQuantity(
                                                                                vendorIndex,
                                                                                packageIndex,
                                                                                1
                                                                            )
                                                                        }
                                                                        activeOpacity={0.75}
                                                                    >
                                                                        <Ionicons
                                                                            name="add"
                                                                            size={17}
                                                                            color={PRIMARY}
                                                                        />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        </View>

                                                        <TouchableOpacity
                                                            style={styles.removeButton}
                                                            onPress={() =>
                                                                handleDeletePackage(
                                                                    vendorIndex,
                                                                    packageIndex
                                                                )
                                                            }
                                                            activeOpacity={0.75}
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

                                <Text style={styles.priceSummaryTitle}>
                                    Price Summary
                                </Text>
                            </View>

                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>
                                    Packages
                                </Text>

                                <Text style={styles.priceValue}>
                                    {currencySymbol(cartCurrency(cartData))}{' '}
                                    {formatCurrency(mixedCurrency ? 0 : originalTotal)}
                                </Text>
                            </View>
                            {!mixedCurrency && cartCouponSavings > 0 && (
                                <View style={styles.priceRow}>
                                    <Text style={styles.priceLabel}>Coupon discount</Text>
                                    <Text style={styles.priceValue}>
                                        −{currencySymbol(cartCurrency(cartData))} {formatCurrency(cartCouponSavings)}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.priceDivider} />

                            <View style={styles.totalRow}>
                                <View>
                                    <Text style={styles.totalLabel}>
                                        Total Amount
                                    </Text>

                                    <Text style={styles.totalSubLabel}>
                                        Payable at checkout
                                    </Text>
                                </View>

                                <Text style={styles.totalAmount}>
                                    {currencySymbol(cartCurrency(cartData))}{' '}
                                    {formatCurrency(totalAmount)}
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
                                <Text style={styles.secureTitle}>
                                    Secure Checkout
                                </Text>

                                <Text style={styles.secureDescription}>
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

                            <Text style={styles.bottomAmountSubLabel}>
                                {packageCount} item
                                {packageCount !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        <Text style={styles.bottomAmount}>
                            {currencySymbol(cartCurrency(cartData))} {formatCurrency(totalAmount)}
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
                            disabled={mixedCurrency}
                            activeOpacity={0.85}
                        >
                            <View style={styles.checkoutButtonContent}>
                                <Text style={styles.checkoutButtonText}>
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

    packageCategory: {
        color: MUTED,
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 3,
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

    // ==========================================
    // Booking details + Quantity
    // ==========================================

    bookingDetailsBox: {
        marginTop: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#F2E3EB',
        gap: 7,
    },

    bookingDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    bookingDetailIcon: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: PRIMARY_LIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },

    bookingDetailText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 16,
        color: TEXT,
        fontWeight: '600',
    },

    quantityRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    quantityLabel: {
        fontSize: 11,
        color: MUTED,
        fontWeight: '700',
    },

    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PRIMARY_LIGHT,
        borderRadius: 10,
        padding: 3,
    },

    quantityButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: BORDER,
    },

    quantityValue: {
        minWidth: 32,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '800',
        color: TEXT,
    },
    eventLocationCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'flex-start',
},

eventLocationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
},

eventLocationContent: {
    flex: 1,
},

eventLocationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 8,
},

eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 3,
},

eventLocationLabel: {
    width: 58,
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
},

eventLocationValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: TEXT,
    lineHeight: 17,
},
});