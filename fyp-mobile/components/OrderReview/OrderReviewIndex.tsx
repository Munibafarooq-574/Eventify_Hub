// fyp-mobile/components/orderreview/OrderReviewIndex.tsx
import postPlaceOrder from '@/services/postPlaceOrder';
import axios from 'axios';
import { deleteSecureData, getSecureData, getUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
TextInput,
TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8EAF2';
const GOLD = '#D6A943';
const GOLD_LIGHT = '#FFF5D6';
const TEXT = '#2A1F27';
const MUTED = '#8A7F87';
const BORDER = '#F0DCE7';
const DISCOUNT_RED = '#C44D5C';

const STEPS = ['Cart', 'Review', 'Payment', 'Confirm'];
const CURRENT_STEP = 1; // Review is active

const OrderReviewScreen = () => {
  const [cartData, setCartData] = useState<any>(null);
  const [cateringCategory, setCateringCategory] = useState<any>(null);
  const [guests, setGuests] = useState<number>(0);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [publicCoupons, setPublicCoupons] =
  useState<Record<string, any[]>>({});

const [appliedPromotions, setAppliedPromotions] =
  useState<Record<string, any>>({});

const [applyingCouponId, setApplyingCouponId] =
  useState<string | null>(null);

  const [discountCodes, setDiscountCodes] =
  useState<Record<string, string>>({});

const [applyingDiscountCodeKey, setApplyingDiscountCodeKey] =
  useState<string | null>(null);

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const storedCart = await getSecureData('cartData');

        const eventDetailsRaw = await getSecureData('eventDetails');
        const eventDetails = eventDetailsRaw ? JSON.parse(eventDetailsRaw) : null;
        setGuests(eventDetails?.guests ? parseInt(eventDetails.guests.toString(), 10) : 0);

        const categoriesRaw = await getSecureData('categories');
        const categories = categoriesRaw ? JSON.parse(categoriesRaw) : [];
        const catering = categories.find(
          (x: any) => x?.name?.toLowerCase() === 'caterings',
        );
        setCateringCategory(catering || null);

        setCartData(storedCart ? JSON.parse(storedCart) : { vendors: [] });
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
  }, []);

  // -----------------------------------------
  // Total calculation
  // -----------------------------------------

  const calculateTotalAmount = () => {
    if (!cartData?.vendors?.length) return 0;

    let totalAmount = 0;

    cartData.vendors.forEach((vendor: any) => {
      vendor?.packages?.forEach((pkg: any) => {
        const isCatering =
          cateringCategory?._id &&
          vendor?.vendor?.buisnessCategory === cateringCategory._id;

            const quantity = Math.max(
        1,
        Number(pkg?.quantity || 1),
      );

      totalAmount += isCatering
        ? Number(pkg?.price || 0) *
          Number(guests || 0) *
          quantity
        : Number(pkg?.price || 0) *
          quantity;
      });
    });

    return totalAmount;
  };

  const totalAmount = calculateTotalAmount();

const totalPromotionDiscount =
  Object.values(appliedPromotions).reduce(
    (sum: number, promotion: any) =>
      sum +
      Number(
        promotion?.discountAmount || 0,
      ),
    0,
  );

const backendPromotionFinalTotal =
  Object.values(appliedPromotions).reduce(
    (sum: number, promotion: any) =>
      sum +
      Number(
        promotion?.finalAmount ??
          promotion?.originalAmount ??
          0,
      ),
    0,
  );

const promotedOriginalTotal =
  Object.values(appliedPromotions).reduce(
    (sum: number, promotion: any) =>
      sum +
      Number(
        promotion?.originalAmount || 0,
      ),
    0,
  );

const finalTotal =
  totalAmount -
  promotedOriginalTotal +
  backendPromotionFinalTotal;

  const vendorCount = cartData?.vendors?.length || 0;
  const packageCount =
    cartData?.vendors?.reduce(
      (total: number, vendor: any) => total + (vendor?.packages?.length || 0),
      0,
    ) || 0;

  const formatCurrency = (amount: number) => Math.round(amount).toLocaleString('en-PK');

  const getPromotionKey = (
  vendorId: string,
  packageId: string,
) => `${vendorId}:${packageId}`;

const getPackageAmount = (
  vendor: any,
  pkg: any,
) => {
  const isCatering =
    cateringCategory?._id &&
    vendor?.vendor?.buisnessCategory ===
      cateringCategory._id;

  const quantity = Math.max(
    1,
    Number(pkg?.quantity || 1),
  );

  return isCatering
    ? Number(pkg?.price || 0) *
        Number(guests || 0) *
        quantity
    : Number(pkg?.price || 0) *
        quantity;
};


const fetchPublicCouponsForPackage = async (
  vendorId: string,
  packageId: string,
) => {
  const key = getPromotionKey(
    vendorId,
    packageId,
  );

  try {
    const response = await axios.get(
      `https://eventify-hub.onrender.com/vendor/growth/discount/coupon/public/${vendorId}`,
      {
        params: {
          packageId,
        },
      },
    );

    setPublicCoupons((current) => ({
      ...current,
      [key]: Array.isArray(response.data)
        ? response.data
        : [],
    }));
  } catch (error) {
    console.error(
      'Error fetching public coupons:',
      error,
    );

    setPublicCoupons((current) => ({
      ...current,
      [key]: [],
    }));
  }
};

useEffect(() => {
  if (!cartData?.vendors?.length) {
    return;
  }

  cartData.vendors.forEach(
    (vendor: any) => {
      const vendorId =
        vendor?.vendor?._id;

      if (!vendorId) {
        return;
      }

      vendor?.packages?.forEach(
        (pkg: any) => {
          const packageId =
            pkg?.packageId ||
            pkg?._id;

          if (!packageId) {
            return;
          }

          fetchPublicCouponsForPackage(
            String(vendorId),
            String(packageId),
          );
        },
      );
    },
  );
}, [cartData]);

const handleApplyPublicCoupon = async (
  vendor: any,
  pkg: any,
  coupon: any,
) => {
  const vendorId = String(
    vendor?.vendor?._id || '',
  );

  const packageId = String(
    pkg?.packageId ||
      pkg?._id ||
      '',
  );

  if (!vendorId || !packageId) {
    return;
  }

  const key = getPromotionKey(
    vendorId,
    packageId,
  );

  const originalAmount =
  getPackageAmount(
    vendor,
    pkg,
  );

const currentPromotion =
  appliedPromotions[key];

if (
  currentPromotion &&
  currentPromotion.promotionId !==
    String(coupon._id)
) {
  const shouldReplace =
    await confirmPromotionReplacement(
      currentPromotion.promotionCode,
      coupon.code,
    );

  if (!shouldReplace) {
    return;
  }
}

try {
    setApplyingCouponId(
      String(coupon._id),
    );

    const user = await getUserData();

    const response = await axios.post(
      `https://eventify-hub.onrender.com/vendor/growth/discount/coupon/validate?vendorId=${vendorId}`,
      {
        code: coupon.code,
        orderAmount: originalAmount,
        clientId: user?._id,
        packageId,
      },
    );

    const result = response.data;

    setAppliedPromotions(
      (current) => ({
        ...current,
        [key]: {
          promotionId:
            result.discountEntryId,
          promotionType: 'COUPON',
          promotionCode:
            result.code,
          originalAmount,
          discountAmount: Number(
            result.discountAmount || 0,
          ),
          finalAmount: Number(
            result.finalAmount,
          ),
        },
      }),
    );

    Toast.show({
      type: 'success',
      text1: 'Offer Applied',
      text2: `${result.code} applied successfully.`,
      position: 'bottom',
    });
  } catch (error: any) {
    Toast.show({
      type: 'error',
      text1: 'Offer Not Applied',
      text2:
        error?.response?.data?.message ||
        'This offer could not be applied.',
      position: 'bottom',
    });
  } finally {
    setApplyingCouponId(null);
  }
};

const confirmPromotionReplacement = (
  currentCode: string,
  newCode: string,
): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Replace Promotion?',
      `${currentCode} is currently applied. Replace it with ${newCode}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Replace',
          onPress: () => resolve(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      },
    );
  });
};

const handleApplyDiscountCode = async (
  vendor: any,
  pkg: any,
) => {
  const vendorId = String(
    vendor?.vendor?._id || '',
  );

  const packageId = String(
    pkg?.packageId ||
      pkg?._id ||
      '',
  );

    if (!vendorId || !packageId) {
    console.log('Apply blocked, ids missing:', { vendorId, packageId });
    Alert.alert('Cannot apply code', 'Package information is missing.');
    return;
  }

  const key = getPromotionKey(
    vendorId,
    packageId,
  );

  const code =
    discountCodes[key]?.trim();

  if (!code) {
    Toast.show({
      type: 'info',
      text1: 'Enter Discount Code',
      text2:
        'Please enter a discount code first.',
      position: 'bottom',
    });

    return;
  }

  const originalAmount =
  getPackageAmount(
    vendor,
    pkg,
  );

  
const currentPromotion =
  appliedPromotions[key];

  if (
  currentPromotion?.promotionCode === code
) {
  Toast.show({
    type: 'info',
    text1: 'Already Applied',
    text2: `${code} is already applied.`,
    position: 'bottom',
  });

  return;
}

if (
  currentPromotion &&
  currentPromotion.promotionCode !== code
) {
  const shouldReplace =
    await confirmPromotionReplacement(
      currentPromotion.promotionCode,
      code,
    );

  if (!shouldReplace) {
    return;
  }
}

try {
    setApplyingDiscountCodeKey(key);

    const user = await getUserData();

    const response = await axios.post(
      `https://eventify-hub.onrender.com/vendor/growth/discount/coupon/validate?vendorId=${vendorId}`,
      {
        code,
        orderAmount: originalAmount,
        clientId: user?._id,
        packageId,
      },
    );

    const result = response.data;

    setAppliedPromotions(
      (current) => ({
        ...current,
        [key]: {
          promotionId:
            result.discountEntryId,
          promotionType:
            'DISCOUNT_CODE',
          promotionCode:
            result.code,
          originalAmount,
          discountAmount: Number(
            result.discountAmount || 0,
          ),
          finalAmount: Number(
            result.finalAmount,
          ),
        },
      }),
    );

    Toast.show({
      type: 'success',
      text1: 'Discount Code Applied',
      text2: `${result.code} applied successfully.`,
      position: 'bottom',
    });
  } catch (error: any) {
       const status = error?.response?.status;
    const backendMessage = error?.response?.data?.message;

    const isInvalidCode = status === 404;

        console.log('Apply code error:', status, backendMessage);

    Alert.alert(
      isInvalidCode ? 'Invalid Code' : 'Code Not Applied',
      isInvalidCode
        ? 'This discount code is invalid. Please check and try again.'
        : backendMessage ||
            'This discount code could not be applied.',
    );
  } finally {
    setApplyingDiscountCodeKey(null);
  }
};
  // -----------------------------------------
  // Checkout
  // -----------------------------------------

  const handleCheckout = async () => {
    if (placingOrder) return;

    try {
      const user = await getUserData();

      if (!user?._id) {
        Toast.show({
          type: 'error',
          text1: 'Organizer ID Missing',
          text2: 'Please login again.',
          position: 'bottom',
        });
        return;
      }

      if (!cartData?.vendors?.length) {
        Toast.show({
          type: 'error',
          text1: 'Empty Cart',
          text2: 'Your cart is empty. Please add items to proceed.',
          position: 'bottom',
        });
        return;
      }

      const eventDetailsRaw = await getSecureData('eventDetails');
      const eventDetails = eventDetailsRaw ? JSON.parse(eventDetailsRaw) : null;

  const services = cartData.vendors.flatMap(
  (vendor: any) =>
    vendor.packages.map((pkg: any) => {
      const vendorId = String(
        vendor?.vendor?._id || '',
      );

      const packageId = String(
        pkg?.packageId ||
          pkg?._id ||
          '',
      );

      const promotion =
        appliedPromotions[
          getPromotionKey(
            vendorId,
            packageId,
          )
        ];

      return {
        vendorId: vendor.vendor._id,
        serviceName: pkg.packageName,
        price: Number(pkg.price),
        packageId: pkg.packageId,

        promotion: promotion
          ? {
              promotionId:
                promotion.promotionId,
              promotionType:
                promotion.promotionType,
              promotionCode:
                promotion.promotionCode,
            }
          : undefined,

        durationMinutes: Number(
          pkg.durationMinutes ||
            eventDetails?.durationMinutes ||
            60,
        ),

        quantity: Math.max(
          1,
          Number(pkg.quantity || 1),
        ),

        requiredServiceWindow:
          pkg.requiredServiceWindow,
      };
    }),
);

      setPlacingOrder(true);

    const response = await postPlaceOrder({
      organizerId: user._id,

      eventDate: eventDetails?.eventDate,
      eventTime: eventDetails?.eventTime || '18:00',

      durationMinutes: Number(
        eventDetails?.durationMinutes || 60,
      ),

      eventCityId: eventDetails?.eventCityId,
      eventAddress: eventDetails?.eventAddress,

      services,

      guests: eventDetails?.guests,
      eventName: eventDetails?.eventName,
      eventType: eventDetails?.eventType,
    });

      if (response) {
        Toast.show({
          type: 'success',
          text1: 'Order Placed',
          text2: 'Your order has been successfully placed!',
          position: 'bottom',
        });

        await deleteSecureData('cartData');
        await deleteSecureData('eventDetails');

        router.push('/OrderSummary');
      }
   } catch (error: any) {
  console.error('Error placing order:', error);
  Toast.show({
    type: 'error',
    text1: 'Booking Failed',
    text2: error?.message || 'Failed to place order. Please try again.',
    position: 'bottom',
  });
} finally {
      setPlacingOrder(false);
    }
  };

  // -----------------------------------------
  // Loading
  // -----------------------------------------

  if (!cartData) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons name="receipt-outline" size={30} color={PRIMARY} />
        </View>
        <Text style={styles.loadingText}>Loading your order...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Review Order</Text>
          <Text style={styles.headerSubtitle}>
            {vendorCount} vendor{vendorCount !== 1 ? 's' : ''} · {packageCount} package
            {packageCount !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.headerIconBtn} />
      </View>

      {/* Stepper */}
      <View style={styles.stepperCard}>
        <View style={styles.stepperRow}>
          {STEPS.map((label, index) => {
            const done = index < CURRENT_STEP;
            const active = index === CURRENT_STEP;

            return (
              <React.Fragment key={label}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepDot, (done || active) && styles.stepDotActive]}>
                    {done ? (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                    {label}
                  </Text>
                </View>

                {index < STEPS.length - 1 && (
                  <View style={[styles.stepConnector, done && styles.stepConnectorActive]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {vendorCount === 0 ? (
          /* Empty state */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cart-outline" size={48} color={PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>Nothing to review yet</Text>
            <Text style={styles.emptyDescription}>
              Add vendors and packages to your cart before reviewing your order.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="search-outline" size={18} color="#FFFFFF" />
              <Text style={styles.browseButtonText}>Browse Vendors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Confirm your order details</Text>
            <Text style={styles.sectionSubtitle}>
              Double-check services and pricing before you book.
            </Text>

            {cartData.vendors.map((vendor: any, vendorIndex: number) => {
              const vendorName = vendor?.vendor?.name || vendor?.vendor?.brandName || 'Vendor';
              const packages = vendor?.packages || [];

              return (
                <View key={`${vendorIndex}-${vendorName}`} style={styles.vendorCard}>
                  <View style={styles.vendorHeader}>
                    <View style={styles.vendorIcon}>
                      <Ionicons name="storefront-outline" size={21} color={PRIMARY} />
                    </View>

                    <View style={styles.vendorInfo}>
                      <Text style={styles.vendorLabel}>VENDOR</Text>
                      <Text style={styles.vendorName} numberOfLines={1}>
                        {vendorName}
                      </Text>
                    </View>

                    <View style={styles.packageCountBadge}>
                      <Text style={styles.packageCountText}>
                        {packages.length} {packages.length === 1 ? 'Package' : 'Packages'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.vendorDivider} />

                  {packages.map((pkg: any, packageIndex: number) => {
                    const isCatering =
                      cateringCategory?._id &&
                      vendor?.vendor?.buisnessCategory === cateringCategory._id;

                    const packagePrice = Number(pkg?.price || 0);
                    const finalPrice = isCatering ? packagePrice * Number(guests || 0) : packagePrice;

                    const vendorId = String(
                    vendor?.vendor?._id || '',
                  );

                  const packageId = String(
                    pkg?.packageId ||
                      pkg?._id ||
                      '',
                  );

                  const promotionKey =
                    getPromotionKey(
                      vendorId,
                      packageId,
                    );

                  const availableCoupons =
                    publicCoupons[promotionKey] || [];

                  const appliedPromotion =
                    appliedPromotions[promotionKey];
                    return (
                      <View
                        key={`${packageIndex}-${pkg?.packageName || 'package'}`}
                        style={styles.packageCard}
                      >
                        <View style={styles.packageIcon}>
                          <Ionicons name="cube-outline" size={20} color={PRIMARY} />
                        </View>

                        <View style={styles.packageInfo}>
                          <Text style={styles.packageName} numberOfLines={2}>
                            {pkg?.packageName}
                          </Text>

                          {isCatering && (
                            <View style={styles.guestTag}>
                              <Ionicons name="people-outline" size={12} color={GOLD} />
                              <Text style={styles.guestTagText}>{guests} guests</Text>
                            </View>
                          )}

                          <Text style={styles.packagePrice}>Rs. {formatCurrency(finalPrice)}</Text>
                          {availableCoupons.length > 0 && (
                          <View style={styles.availableOffers}>
                            <Text style={styles.availableOffersTitle}>
                              Available Offers
                            </Text>

                            {availableCoupons.map(
                              (coupon: any) => {
                                const discountLabel =
                                  coupon.discountType ===
                                  'PERCENTAGE'
                                    ? `${Number(
                                        coupon.discountValue ||
                                          0,
                                      )}% OFF`
                                    : `Rs. ${formatCurrency(
                                        Number(
                                          coupon.discountValue ||
                                            0,
                                        ),
                                      )} OFF`;

                                const isApplied =
                                  appliedPromotion?.promotionId ===
                                  String(coupon._id);

                                return (
                                  <View
                                    key={String(coupon._id)}
                                    style={styles.offerCard}
                                  >
                                    <View
                                      style={
                                        styles.offerContent
                                      }
                                    >
                                      <Text
                                        style={
                                          styles.offerDiscount
                                        }
                                      >
                                        🎟 {discountLabel}
                                      </Text>

                                      <Text
                                        style={
                                          styles.offerCode
                                        }
                                      >
                                        {coupon.code}
                                      </Text>

                                      {Number(
                                        coupon.minimumOrderAmount,
                                      ) > 0 && (
                                        <Text
                                          style={
                                            styles.offerDetail
                                          }
                                        >
                                          Min Rs.{' '}
                                          {formatCurrency(
                                            Number(
                                              coupon.minimumOrderAmount,
                                            ),
                                          )}
                                        </Text>
                                      )}

                                      {Number(
                                        coupon.maximumDiscountAmount,
                                      ) > 0 && (
                                        <Text
                                          style={
                                            styles.offerDetail
                                          }
                                        >
                                          Max Rs.{' '}
                                          {formatCurrency(
                                            Number(
                                              coupon.maximumDiscountAmount,
                                            ),
                                          )}
                                        </Text>
                                      )}
                                    </View>

                                    <TouchableOpacity
                                      style={[
                                        styles.applyOfferButton,
                                        isApplied &&
                                          styles.appliedOfferButton,
                                      ]}
                                      disabled={
                                        isApplied ||
                                        applyingCouponId ===
                                          String(coupon._id)
                                      }
                                      onPress={() =>
                                        handleApplyPublicCoupon(
                                          vendor,
                                          pkg,
                                          coupon,
                                        )
                                      }
                                    >
                                      {applyingCouponId ===
                                      String(coupon._id) ? (
                                        <ActivityIndicator
                                          size="small"
                                          color="#FFFFFF"
                                        />
                                      ) : (
                                        <Text
                                          style={
                                            styles.applyOfferText
                                          }
                                        >
                                          {isApplied
                                            ? 'Applied'
                                            : 'Apply'}
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                );
                              },
                            )}

                            {appliedPromotion && (
                              <View
                                style={
                                  styles.appliedPromotionResult
                                }
                              >
                                <Text
                                  style={
                                    styles.appliedPromotionText
                                  }
                                >
                                  Original: Rs.{' '}
                                  {formatCurrency(
                                    appliedPromotion.originalAmount,
                                  )}
                                </Text>

                                <Text
                                  style={
                                    styles.appliedPromotionDiscount
                                  }
                                >
                                  Discount: - Rs.{' '}
                                  {formatCurrency(
                                    appliedPromotion.discountAmount,
                                  )}
                                </Text>

                                <Text
                                  style={
                                    styles.appliedPromotionFinal
                                  }
                                >
                                  Final: Rs.{' '}
                                  {formatCurrency(
                                    appliedPromotion.finalAmount,
                                  )}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                        <View style={styles.discountCodeSection}>
                        <Text style={styles.discountCodeTitle}>
                          Have a discount code?
                        </Text>

                        <View style={styles.discountCodeRow}>
                          <TextInput
                            style={styles.discountCodeInput}
                            placeholder="Enter code"
                            placeholderTextColor={MUTED}
                            autoCapitalize="characters"
                            value={
                              discountCodes[promotionKey] || ''
                            }
                            onChangeText={(value) =>
                              setDiscountCodes(
                                (current) => ({
                                  ...current,
                                  [promotionKey]: value,
                                }),
                              )
                            }
                            editable={
                              applyingDiscountCodeKey !==
                              promotionKey
                            }
                          />

                          <TouchableOpacity
                            style={
                              styles.discountCodeApplyButton
                            }
                            disabled={
                              applyingDiscountCodeKey ===
                              promotionKey
                            }
                            onPress={() =>
                              handleApplyDiscountCode(
                                vendor,
                                pkg,
                              )
                            }
                          >
                            {applyingDiscountCodeKey ===
                            promotionKey ? (
                              <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                              />
                            ) : (
                              <Text
                                style={
                                  styles.discountCodeApplyText
                                }
                              >
                                Apply
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Price summary */}
            <View style={styles.priceSummaryCard}>
              <View style={styles.priceSummaryHeader}>
                <View style={styles.priceSummaryIcon}>
                  <Ionicons name="receipt-outline" size={20} color={PRIMARY} />
                </View>
                <Text style={styles.priceSummaryTitle}>Price Summary</Text>
              </View>

              <View style={styles.priceRow}>
  <Text style={styles.priceLabel}>
    Package Total
  </Text>

  <Text style={styles.priceValue}>
    Rs. {formatCurrency(totalAmount)}
  </Text>
</View>

{Object.values(appliedPromotions).map(
  (promotion: any) => (
    <View
      key={promotion.promotionId}
      style={styles.priceRow}
    >
      <Text style={styles.priceLabel}>
        Discount ({promotion.promotionCode})
      </Text>

      <Text style={styles.discountValue}>
        - Rs.{' '}
        {formatCurrency(
          Number(
            promotion.discountAmount || 0,
          ),
        )}
      </Text>
    </View>
  ),
)}

              <View style={styles.priceDivider} />

              <View style={styles.totalRow}>
                <View>
                 <Text style={styles.totalLabel}>Final</Text>
                  <Text style={styles.totalSubLabel}>Payable at checkout</Text>
                </View>
              <Text style={styles.totalAmount}>
  Rs. {formatCurrency(finalTotal)}
</Text>
              </View>
            </View>

            <View style={styles.secureNote}>
              <View style={styles.secureIcon}>
                <Ionicons name="shield-checkmark-outline" size={17} color="#278A4B" />
              </View>
              <View style={styles.secureTextContainer}>
                <Text style={styles.secureTitle}>Secure Checkout</Text>
                <Text style={styles.secureDescription}>
                  Vendors are notified only after you confirm this order.
                </Text>
              </View>
            </View>

            <View style={{ height: 130 }} />
          </>
        )}
      </ScrollView>

      {/* Sticky footer */}
      {vendorCount > 0 && (
        <View style={styles.bottomContainer}>
          <View style={styles.bottomAmountRow}>
            <View>
              <Text style={styles.bottomAmountLabel}>Total Payable</Text>
              <Text style={styles.bottomAmountSubLabel}>
              {packageCount} item
              {packageCount !== 1 ? 's' : ''}
              {totalPromotionDiscount > 0
                ? ' · offer applied'
                : ''}
            </Text>
            </View>
            <Text style={styles.bottomAmount}>
  Rs. {formatCurrency(finalTotal)}
</Text>
          </View>

          <TouchableOpacity
            style={[styles.bookButton, placingOrder && styles.bookButtonDisabled]}
            onPress={handleCheckout}
            disabled={placingOrder}
            activeOpacity={0.85}
          >
            {placingOrder ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.bookButtonText}>Confirm & Book Now</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default OrderReviewScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },

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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  loadingText: { fontSize: 14, color: MUTED, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

  stepperCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { alignItems: 'center', width: 56 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { backgroundColor: PRIMARY },
  stepDotText: { fontSize: 11, fontWeight: '700', color: '#999999' },
  stepDotTextActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 10, color: '#999999', marginTop: 5, fontWeight: '600' },
  stepLabelActive: { color: PRIMARY, fontWeight: '800' },
  stepConnector: { flex: 1, height: 2, backgroundColor: '#EFEFEF', marginBottom: 16 },
  stepConnectorActive: { backgroundColor: PRIMARY },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  sectionSubtitle: { fontSize: 12, color: MUTED, marginTop: 4, marginBottom: 16, lineHeight: 17 },

  vendorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  vendorHeader: { flexDirection: 'row', alignItems: 'center' },
  vendorIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorInfo: { flex: 1, marginLeft: 11 },
  vendorLabel: { fontSize: 9, color: GOLD, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  vendorName: { fontSize: 15, fontWeight: '800', color: TEXT },
  packageCountBadge: { backgroundColor: GOLD_LIGHT, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  packageCountText: { fontSize: 9, color: '#92721E', fontWeight: '800' },
  vendorDivider: { height: 1, backgroundColor: '#F3E8EE', marginVertical: 12 },

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
  packageInfo: { flex: 1, marginLeft: 10 },
  packageName: { fontSize: 13, fontWeight: '700', color: TEXT },
  packagePrice: { fontSize: 13, fontWeight: '800', color: PRIMARY, marginTop: 4 },
  availableOffers: {
  marginTop: 10,
},

availableOffersTitle: {
  fontSize: 11,
  fontWeight: '800',
  color: TEXT,
  marginBottom: 6,
},

offerCard: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: GOLD_LIGHT,
  borderRadius: 10,
  padding: 9,
  marginBottom: 6,
},

offerContent: {
  flex: 1,
  paddingRight: 8,
},

offerDiscount: {
  fontSize: 12,
  fontWeight: '800',
  color: PRIMARY,
},

offerCode: {
  fontSize: 11,
  fontWeight: '800',
  color: TEXT,
  marginTop: 2,
},

offerDetail: {
  fontSize: 9.5,
  color: MUTED,
  marginTop: 2,
},

applyOfferButton: {
  minWidth: 58,
  backgroundColor: PRIMARY,
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 9,
  alignItems: 'center',
},

appliedOfferButton: {
  backgroundColor: '#278A4B',
},

applyOfferText: {
  fontSize: 10,
  fontWeight: '800',
  color: '#FFFFFF',
},

appliedPromotionResult: {
  backgroundColor: '#F1FAF4',
  borderRadius: 10,
  padding: 9,
  marginTop: 4,
},

appliedPromotionText: {
  fontSize: 10,
  color: MUTED,
},

appliedPromotionDiscount: {
  fontSize: 10,
  fontWeight: '700',
  color: DISCOUNT_RED,
  marginTop: 2,
},

appliedPromotionFinal: {
  fontSize: 11,
  fontWeight: '800',
  color: '#278A4B',
  marginTop: 2,
},

discountCodeSection: {
  marginTop: 10,
},

discountCodeTitle: {
  fontSize: 11,
  fontWeight: '800',
  color: TEXT,
  marginBottom: 6,
},

discountCodeRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
},

discountCodeInput: {
  flex: 1,
  height: 38,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 9,
  paddingHorizontal: 10,
  fontSize: 11,
  fontWeight: '700',
  color: TEXT,
},

discountCodeApplyButton: {
  height: 38,
  minWidth: 62,
  paddingHorizontal: 12,
  borderRadius: 9,
  backgroundColor: PRIMARY,
  justifyContent: 'center',
  alignItems: 'center',
},

discountCodeApplyText: {
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: '800',
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
  guestTagText: { fontSize: 9, fontWeight: '700', color: '#92721E', marginLeft: 3 },

  priceSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  priceSummaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  priceSummaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceSummaryTitle: { fontSize: 15, fontWeight: '800', color: TEXT, marginLeft: 10 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  discountLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountBadge: { backgroundColor: '#FDECEF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  discountBadgeText: { fontSize: 9, fontWeight: '800', color: DISCOUNT_RED },
  priceLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },
  priceValue: { fontSize: 13, color: TEXT, fontWeight: '700' },
  discountValue: { fontSize: 13, color: DISCOUNT_RED, fontWeight: '800' },
  priceDivider: { height: 1, backgroundColor: '#F0E5EB', marginVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  totalLabel: { fontSize: 14, fontWeight: '800', color: TEXT },
  totalSubLabel: { fontSize: 10, color: MUTED, marginTop: 3 },
  totalAmount: { fontSize: 19, fontWeight: '900', color: PRIMARY },

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
  secureTextContainer: { marginLeft: 9, flex: 1 },
  secureTitle: { fontSize: 11, fontWeight: '800', color: '#278A4B' },
  secureDescription: { fontSize: 9, color: '#6E8B76', marginTop: 2 },

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
  emptyTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
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
    gap: 7,
  },
  browseButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  bottomAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bottomAmountLabel: { fontSize: 12, fontWeight: '700', color: MUTED },
  bottomAmountSubLabel: { fontSize: 9, color: '#A59AA1', marginTop: 2 },
  bottomAmount: { fontSize: 20, fontWeight: '900', color: PRIMARY },

  bookButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    elevation: 3,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  bookButtonDisabled: { opacity: 0.7 },
  bookButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});