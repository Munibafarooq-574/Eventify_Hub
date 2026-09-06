// fyp-mobile/components/orderreview/OrderReviewIndex.tsx
import postPlaceOrder from '@/services/postPlaceOrder';
import { deleteSecureData, getSecureData, getUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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

const DISCOUNT_PERCENT = 10;

const OrderReviewScreen = () => {
  const [cartData, setCartData] = useState<any>(null);
  const [cateringCategory, setCateringCategory] = useState<any>(null);
  const [guests, setGuests] = useState<number>(0);
  const [placingOrder, setPlacingOrder] = useState(false);

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

        totalAmount += isCatering
          ? Number(pkg?.price || 0) * Number(guests || 0)
          : Number(pkg?.price || 0);
      });
    });

    return totalAmount;
  };

  const totalAmount = calculateTotalAmount();
  const discount = (totalAmount * DISCOUNT_PERCENT) / 100;
  const discountedTotal = totalAmount - discount;

  const vendorCount = cartData?.vendors?.length || 0;
  const packageCount =
    cartData?.vendors?.reduce(
      (total: number, vendor: any) => total + (vendor?.packages?.length || 0),
      0,
    ) || 0;

  const formatCurrency = (amount: number) => Math.round(amount).toLocaleString('en-PK');

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

      const services = cartData.vendors.flatMap((vendor: any) =>
        vendor.packages.map((pkg: any) => ({
          vendorId: vendor.vendor._id,
          serviceName: pkg.packageName,
          price: pkg.price,
        })),
      );

      setPlacingOrder(true);

      const response = await postPlaceOrder({
        organizerId: user._id,
        eventDate: eventDetails?.eventDate,
        eventTime: eventDetails?.eventTime || '18:00',
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
    } catch (error) {
      console.error('Error placing order:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to place order. Please try again.',
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
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>Rs. {formatCurrency(totalAmount)}</Text>
              </View>

              <View style={styles.priceRow}>
                <View style={styles.discountLabelRow}>
                  <Text style={styles.priceLabel}>Eventify Hub Discount</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>{DISCOUNT_PERCENT}% OFF</Text>
                  </View>
                </View>
                <Text style={styles.discountValue}>- Rs. {formatCurrency(discount)}</Text>
              </View>

              <View style={styles.priceDivider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalSubLabel}>Payable at checkout</Text>
                </View>
                <Text style={styles.totalAmount}>Rs. {formatCurrency(discountedTotal)}</Text>
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
                {packageCount} item{packageCount !== 1 ? 's' : ''} · {DISCOUNT_PERCENT}% discount applied
              </Text>
            </View>
            <Text style={styles.bottomAmount}>Rs. {formatCurrency(discountedTotal)}</Text>
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