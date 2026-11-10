import { packageAmount, pricingLabel, pricingMethod } from '@/utils/packagePricing';
import { usePullToRefresh } from "@/components/refresh/usePullToRefresh";
import { checkReviewPackageAvailability } from "@/services/checkReviewPackageAvailability";
import { getVendorPackagesList } from "@/services/getVendorPackagesList";
import { API_BASE_URL } from "@/services/apiConfig";
import { resolvePackagePrice } from "@/utils/resolvePackagePrice";
import DeliveryDetails from '@/components/booking/DeliveryDetails';
import { deliveryFee } from '@/utils/deliveryBooking';
import { clearExpiredReplacementCart } from '@/services/clearExpiredReplacementCart';
import { reportMarketplaceLoadError } from '@/services/reportMarketplaceLoadError';
// fyp-mobile/components/orderreview/OrderReviewIndex.tsx
import postPlaceOrder from '@/services/postPlaceOrder';
import axios from 'axios';
import { createBookingDraftStore, getSecureData, getUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { cancelCartReminder, scheduleCartReminder } from '@/services/cartReminder';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
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
import getActiveCities from '@/services/getActiveCities';

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
const OFFLINE_NOTICE = "No internet connection. Reconnect and pull down to refresh.";

function isConnectionError(error: unknown) {
  return (axios.isAxiosError(error) && !error.response) ||
    (error instanceof TypeError && /network|fetch/i.test(error.message)) ||
    (error instanceof Error && /connection interrupted/i.test(error.message));
}

function getCartPromotions(cart: any): Record<string, any> {
  const entries = (cart?.vendors || []).flatMap((vendor: any) =>
    (vendor.packages || []).map((pkg: any) => {
      const key = `${vendor.vendor?._id}:${pkg.packageId || pkg._id}`;
      return [key, cart.appliedPromotions?.[key]];
    }),
  );
  return Object.fromEntries(entries.filter(([, promotion]: any[]) => !!promotion));
}

function countPackageUnits(packages: { quantity?: number }[]) {
  return packages.reduce((total, pkg) => total + Math.max(1, Number(pkg.quantity || 1)), 0);
}

const OrderReviewScreen = () => {
  const [draft] = useState(createBookingDraftStore);
  const [cartData, setCartData] = useState<any>(null);
  const [cateringCategory, setCateringCategory] = useState<any>(null);
  const [guests, setGuests] = useState<number>(0);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [refreshNotice, setRefreshNotice] = useState('');
  const connectivityRequest = useRef(0);
  const checkoutLock = useRef(false);
  const promotionWriteLock = useRef(false);
  const loadedDraft = useRef<{ cart: string | null; event: string | null; revision?: number } | null>(null);
  const bookingSubmitted = useRef(false);
  const replacementDeadlinePassed = /replacement.*only.*before.*event.*starts/i.test(checkoutError);

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

  const [eventDetails, setEventDetails] =
  useState<any>(null);

  const eventId = cartData?.vendors?.length ? eventDetails?.eventId : undefined;
  useFocusEffect(useCallback(() => {
    if (!eventId) return;
    const remind = async () => {
      if (checkoutLock.current || bookingSubmitted.current) return;
      const user = await getUserData();
      if (!user?._id) return;
      await scheduleCartReminder(user._id, eventId, async () => {
        if (!draft.isCurrent()) return false;
        const reminderDraft = createBookingDraftStore();
        const [cart, event, currentUser] = await Promise.all([
          reminderDraft.get('cartData'), reminderDraft.get('eventDetails'), getUserData(),
        ]);
        return !checkoutLock.current && !bookingSubmitted.current && currentUser?._id === user._id &&
          JSON.parse(event || '{}')?.eventId === eventId && !!JSON.parse(cart || '{}')?.vendors?.length;
      });
    };
    const schedule = () => { void remind().catch(error => reportMarketplaceLoadError('Cart reminder unavailable', error)); };
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') schedule();
    });
    return () => { subscription.remove(); schedule(); };
  }, [eventId]));

const [eventCityName, setEventCityName] =
  useState('');

const [eventExpanded, setEventExpanded] =
  useState(false);

const [expandedVendors, setExpandedVendors] =
  useState<Record<string, boolean>>({});

  const [categoryOptions, setCategoryOptions] =
  useState<any[]>([]);

const [cityOptions, setCityOptions] =
  useState<any[]>([]);

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const [storedCart, eventDetailsRaw] = await Promise.all([
          draft.get('cartData'), draft.get('eventDetails'),
        ]);
        loadedDraft.current = { cart: storedCart, event: eventDetailsRaw, revision: draft.getRevision() };

const savedEventDetails =
  eventDetailsRaw
    ? JSON.parse(eventDetailsRaw)
    : null;

setEventDetails(savedEventDetails);

setGuests(
  savedEventDetails?.guests
    ? parseInt(
        savedEventDetails.guests.toString(),
        10,
      )
    : 0,
);

try {
  const activeCities =
    await getActiveCities();

  const safeCities =
    Array.isArray(activeCities)
      ? activeCities
      : [];

  setCityOptions(safeCities);

  const selectedCity =
    savedEventDetails?.eventCityId
      ? safeCities.find(
          (city: any) =>
            String(city?._id) ===
            String(
              savedEventDetails.eventCityId,
            ),
        )
      : undefined;

  setEventCityName(
    selectedCity?.name || '',
  );
} catch (error) {
  if (isConnectionError(error) && connectivityRequest.current === 0) setRefreshNotice(OFFLINE_NOTICE);
  reportMarketplaceLoadError('Could not load review cities:', error);

  setCityOptions([]);
  setEventCityName('');
}

        const categoriesRaw = await getSecureData('categories');
        const categories = categoriesRaw ? JSON.parse(categoriesRaw) : [];
        setCategoryOptions(
  Array.isArray(categories)
    ? categories
    : [],
);
        const catering = categories.find(
          (x: any) => x?.name?.toLowerCase() === 'caterings',
        );
        setCateringCategory(catering || null);

        const cart = storedCart ? JSON.parse(storedCart) : { vendors: [] };
        setCartData(cart);
        setAppliedPromotions(getCartPromotions(cart));
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

      totalAmount += deliveryFee(pkg, quantity, Number(guests || 0), !!isCatering).totalFee;
      totalAmount += packageAmount(pkg, Number(guests || 0), !!isCatering);
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
      (total: number, vendor: any) => total + countPackageUnits(vendor?.packages || []),
      0,
    ) || 0;

  const formatCurrency = (amount: number) => Math.round(amount).toLocaleString('en-PK');

  const toggleVendorDetails = (
  vendorId: string,
) => {
  setExpandedVendors((current) => ({
    ...current,
    [vendorId]: !current[vendorId],
  }));
};

const formatEventDate = (
  value?: string,
) => {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
};

const formatDuration = (
  
  minutes?: number,
) => {
  const total =
    Number(minutes || 0);

  if (!total) return 'N/A';

  const hours = Math.floor(
    total / 60,
  );

  const mins = total % 60;

  if (hours && mins) {
    return `${hours} hr ${mins} min`;
  }

  if (hours) {
    return `${hours} hr`;
  }

  return `${mins} min`;
};

const formatEventTime = (
  value?: string,
) => {
  if (!value) return 'N/A';

  const [hourPart, minutePart] =
    String(value).split(':');

  const hour = Number(hourPart);
  const minute = Number(
    minutePart || 0,
  );

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return value;
  }

  const period =
    hour >= 12 ? 'PM' : 'AM';

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${String(
    minute,
  ).padStart(2, '0')} ${period}`;
};


const getVendorCategoryName = (
  vendorData: any,
  vendorCartData?: any,
) => {
  const category =
    vendorData?.buisnessCategory ||
    vendorCartData?.buisnessCategory;

  if (
    category &&
    typeof category === 'object'
  ) {
    return (
      category?.name ||
      category?.categoryName ||
      'N/A'
    );
  }

  const categoryId =
    typeof category === 'string'
      ? category
      : category?._id;

  if (categoryId) {
    const matchedCategory =
      categoryOptions.find(
        (item: any) =>
          String(item?._id) ===
          String(categoryId),
      );

    if (matchedCategory?.name) {
      return matchedCategory.name;
    }
  }

  return (
    vendorData?.categoryName ||
    vendorCartData?.categoryName ||
    vendorData?.businessCategoryName ||
    vendorCartData?.businessCategoryName ||
    'N/A'
  );
};

const getVendorServiceCities = (
  vendorData: any,
  vendorCartData?: any,
) => {
  const rawServiceCities =
    vendorData?.serviceLocationCityIds ||
    vendorCartData?.serviceLocationCityIds ||
    [];

  if (!Array.isArray(rawServiceCities)) {
    return 'N/A';
  }

  const names =
    rawServiceCities
      .map((city: any) => {
        if (
          city &&
          typeof city === 'object' &&
          city?.name
        ) {
          return city.name;
        }

        const cityId =
          typeof city === 'string'
            ? city
            : city?._id;

        if (!cityId) {
          return null;
        }

        const matchedCity =
          cityOptions.find(
            (option: any) =>
              String(option?._id) ===
              String(cityId),
          );

        return matchedCity?.name || null;
      })
      .filter(Boolean);

  return names.length > 0
    ? names.join(', ')
    : 'N/A';
};

const getResolvedServiceWindow = (
  pkg: any,
) => {
  const bookingType = String(
    pkg?.bookingType ||
      'DURATION_BASED',
  ).toUpperCase();

  const eventDate =
    eventDetails?.eventDate;

  const eventStartTime =
    eventDetails?.startTime;

  const eventEndTime =
    eventDetails?.endTime;

  if (
    !eventDate ||
    !eventStartTime
  ) {
    return null;
  }

  const dateOnly =
    String(eventDate).split('T')[0];

  const eventStart =
    new Date(
      `${dateOnly}T${eventStartTime}:00`,
    );

  if (
    Number.isNaN(
      eventStart.getTime(),
    )
  ) {
    return null;
  }

  // ---------------------------------
  // DURATION_BASED
  // actual event start -> event end
  // ---------------------------------
  if (
    bookingType ===
    'DURATION_BASED'
  ) {
    if (!eventEndTime) {
      return null;
    }

    const eventEnd =
      new Date(
        `${dateOnly}T${eventEndTime}:00`,
      );

    if (
      Number.isNaN(
        eventEnd.getTime(),
      )
    ) {
      return null;
    }

    return {
      startDateTime:
        eventStart.toISOString(),

      endDateTime:
        eventEnd.toISOString(),
    };
  }

  // Appointments and setup bookings must use the exact client-selected interval.
  // Never silently replace it with the event start time.
  if (bookingType === 'TIME_SLOT_BASED' || bookingType === 'SETUP_BASED' || (bookingType === 'DELIVERY_BASED' && pkg.deliveryFeeType)) {
    const chosen = pkg?.requiredServiceWindow;
    if (!chosen?.startDateTime || !chosen?.endDateTime) return null;
    const start = new Date(chosen.startDateTime);
    const end = new Date(chosen.endDateTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
        end.getTime() <= start.getTime()) return null;
    return { startDateTime: start.toISOString(), endDateTime: end.toISOString() };
  }

  // ---------------------------------
  // DELIVERY
  // event start + configured offsets
  // ---------------------------------
  if (bookingType === 'DELIVERY_BASED') {
    const startOffset =
      Number(
        pkg?.serviceWindowStartOffsetMinutes,
      );

    const endOffset =
      Number(
        pkg?.serviceWindowEndOffsetMinutes,
      );

   if (
  !Number.isFinite(
    startOffset,
  ) ||
  !Number.isFinite(
    endOffset,
  ) ||
  startOffset >=
    endOffset
) {
  return null;
}

    const start =
      new Date(
        eventStart.getTime() +
          startOffset *
            60 *
            1000,
      );

    const end =
      new Date(
        eventStart.getTime() +
          endOffset *
            60 *
            1000,
      );

    return {
      startDateTime:
        start.toISOString(),

      endDateTime:
        end.toISOString(),
    };
  }

  return null;
};

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

  return deliveryFee(pkg, quantity, Number(guests || 0), !!isCatering).totalFee + packageAmount(pkg, Number(guests || 0), !!isCatering);
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
    reportMarketplaceLoadError(
      'Public coupons unavailable:',
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

const savePromotion = async (key: string, promotion: any | null) => {
  if (promotionWriteLock.current || checkoutLock.current || !draft.isCurrent()) {
    throw new Error('Please wait for your current cart update to finish.');
  }
  promotionWriteLock.current = true;
  try {
    const current = loadedDraft.current;
    if (!current?.cart) throw new Error('Open My Cart and try again.');
    const cart = JSON.parse(current.cart);
    const promotions = getCartPromotions(cart);
    if (promotion) promotions[key] = promotion;
    else delete promotions[key];
    const updated = JSON.stringify({ ...cart, appliedPromotions: promotions });
    // The bound store writes against the revision read by this screen.
    await draft.save('cartData', updated, current.revision);
    if (!draft.isCurrent()) return;
    loadedDraft.current = { ...current, cart: updated, revision: draft.getRevision() };
    setAppliedPromotions(promotions);
  } finally {
    promotionWriteLock.current = false;
  }
};

const handleApplyPublicCoupon = async (
  vendor: any,
  pkg: any,
  coupon: any,
) => {
  if (refreshing || applyingCouponId || applyingDiscountCodeKey || checkoutLock.current) return;
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

  const minimumOrderAmount =
  Number(coupon?.minimumOrderAmount || 0);

if (
  minimumOrderAmount > 0 &&
  originalAmount < minimumOrderAmount
) {
  Alert.alert(
    'Offer Requirements Not Met',
    `Minimum order amount for this offer is Rs. ${formatCurrency(
      minimumOrderAmount,
    )}. Your package total is Rs. ${formatCurrency(
      originalAmount,
    )}.`,
    [{ text: 'OK' }],
  );

  return;
}

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

    await savePromotion(key, {
      promotionId: result.discountEntryId,
      promotionType: 'COUPON',
      promotionCode: result.code,
      originalAmount,
      discountAmount: Number(result.discountAmount || 0),
      finalAmount: Number(result.finalAmount),
    });

    Toast.show({
      type: 'success',
      text1: 'Offer Applied',
      text2: `${result.code} applied successfully.`,
      position: 'bottom',
    });
  } catch (error: any) {
  const rawMessage =
  error?.response?.data?.message;

const backendMessage =
  typeof rawMessage === 'string'
    ? rawMessage
    : typeof rawMessage?.message === 'string'
      ? rawMessage.message
      : error instanceof Error ? error.message : 'This offer could not be applied.';

Alert.alert(
  'Offer Requirements Not Met',
  backendMessage,
  [{ text: 'OK' }],
);
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

const handleRemovePromotion = async (promotionKey: string) => {
  if (refreshing || applyingCouponId || applyingDiscountCodeKey || checkoutLock.current) return;
  try {
    await savePromotion(promotionKey, null);
    setDiscountCodes(current => ({ ...current, [promotionKey]: '' }));
    Toast.show({ type: 'info', text1: 'Discount Removed', position: 'bottom' });
  } catch (error) {
    Alert.alert('Unable to remove discount', error instanceof Error ? error.message : 'Please try again.');
  }
};

const handleApplyDiscountCode = async (
  vendor: any,
  pkg: any,
) => {
  if (refreshing || applyingCouponId || applyingDiscountCodeKey || checkoutLock.current) return;
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

    await savePromotion(key, {
      promotionId: result.discountEntryId,
      promotionType: 'DISCOUNT_CODE',
      promotionCode: result.code,
      originalAmount,
      discountAmount: Number(result.discountAmount || 0),
      finalAmount: Number(result.finalAmount),
    });

    setDiscountCodes((current) => ({
  ...current,
  [key]: '',
}));

    Toast.show({
      type: 'success',
      text1: 'Discount Code Applied',
      text2: `${result.code} applied successfully.`,
      position: 'bottom',
    });
  } catch (error: any) {
      const status =
  error?.response?.status;

const rawMessage =
  error?.response?.data?.message;

const backendMessage =
  typeof rawMessage === 'string'
    ? rawMessage
    : typeof rawMessage?.message === 'string'
      ? rawMessage.message
      : error instanceof Error ? error.message : undefined;

const isInvalidCode =
  status === 404;

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

  useEffect(() => {
    const checkConnection = async () => {
      const request = ++connectivityRequest.current;
      try {
        await getActiveCities();
      } catch (error) {
        if (request === connectivityRequest.current && isConnectionError(error)) {
          setRefreshNotice(OFFLINE_NOTICE);
        }
      }
    };
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void checkConnection();
    });
    const focus = Platform.OS === 'android'
      ? AppState.addEventListener('focus', checkConnection)
      : undefined;
    return () => {
      connectivityRequest.current++;
      subscription.remove();
      focus?.remove();
    };
  }, []);

  const { refreshing, refreshControl } = usePullToRefresh(async () => {
    if (checkoutLock.current || promotionWriteLock.current || applyingCouponId || applyingDiscountCodeKey) return;
    ++connectivityRequest.current;

    try {
      const vendors: any[] = cartData?.vendors || [];
      if (!vendors.length) {
        await getActiveCities();
        setRefreshNotice('');
        return;
      }

      const eventDate = String(eventDetails?.eventDate || '').split('T')[0];
      const eventStartTime = eventDetails?.startTime || eventDetails?.eventTime;
      const eventDurationMinutes = Number(eventDetails?.durationMinutes);
      const eventCityId = eventDetails?.eventCityId;
      if (!eventDate || !eventStartTime || !eventCityId || !(eventDurationMinutes > 0)) {
        setRefreshNotice('Your event details are incomplete. Go back and check the event details.');
        return;
      }

      const [serverCartRaw, serverEventRaw] = await Promise.all([
        draft.get('cartData'), draft.get('eventDetails'),
      ]);
      const saved = loadedDraft.current;
      const serverCart = serverCartRaw ? JSON.parse(serverCartRaw) : null;
      if (!serverCart || !saved?.cart || saved.event !== serverEventRaw ||
          JSON.stringify(JSON.parse(saved.cart).vendors) !== JSON.stringify(serverCart.vendors)) {
        setRefreshNotice('Your cart changed on another device. Open My Cart to review it.');
        return;
      }
      loadedDraft.current = { cart: serverCartRaw, event: serverEventRaw, revision: draft.getRevision() };
      const promotions = getCartPromotions(serverCart);
      setAppliedPromotions(promotions);
      const results = await Promise.all(vendors.map(async vendor => {
        const vendorId = String(vendor.vendor?._id || '');
        const latestPackages = await getVendorPackagesList(vendorId);

        const packages = await Promise.all((vendor.packages || []).map(async (pkg: any) => {
          const packageId = String(pkg.packageId || pkg._id || '');
          const latest = latestPackages.find(item => String(item._id) === packageId);
          const bookingType = pkg.bookingType || 'DURATION_BASED';
          if (!latest || (latest.bookingType || 'DURATION_BASED') !== bookingType ||
              (bookingType === 'DELIVERY_BASED' && !!latest.deliveryFeeType !== !!pkg.deliveryFeeType)) {
            return { pkg, notice: `${pkg.packageName} has changed. Choose a package again in your cart.` };
          }

          const selectedDuration = Number(pkg.durationMinutes || eventDurationMinutes);
          const price = bookingType === 'DURATION_BASED'
            ? resolvePackagePrice(latest, selectedDuration).price
            : Number(latest.price);
          if (price === null || !Number.isFinite(price) || price <= 0) {
            return { pkg, notice: `${pkg.packageName} no longer offers the selected price or duration.` };
          }

          const selectedWindow = bookingType === 'DURATION_BASED' ||
            (bookingType === 'DELIVERY_BASED' && !latest.deliveryFeeType)
            ? undefined : getResolvedServiceWindow(pkg) ?? undefined;
          const available = bookingType === 'DELIVERY_BASED' && latest.deliveryFeeType && !selectedWindow
            ? false
            : await checkReviewPackageAvailability({
                vendorId, packageId, eventDate, eventStartTime, eventCityId,
                eventDurationMinutes: bookingType === 'DURATION_BASED' ? selectedDuration : eventDurationMinutes,
                bookingType, window: selectedWindow, deliveryTimeZone: pkg.deliveryTimeZone,
                replacementMode: !!eventDetails?.replacementVendorOrderId,
              });
          const updated = {
            ...pkg,
            price,
            pricingMethod: latest.pricingMethod ?? pkg.pricingMethod,
            groupSize: latest.groupSize,
            ...(bookingType === 'DELIVERY_BASED' && latest.deliveryFeeType
              ? { deliveryFeeType: latest.deliveryFeeType, deliveryFee: latest.deliveryFee }
              : {}),
          };

          const key = getPromotionKey(vendorId, packageId);
          const promotion = promotions[key];
          const originalAmount = getPackageAmount(vendor, updated);
          if (promotion && originalAmount !== promotion.originalAmount) {
            const user = await getUserData();
            try {
              const { data } = await axios.post(
                `${API_BASE_URL}/vendor/growth/discount/coupon/validate?vendorId=${encodeURIComponent(vendorId)}`,
                { code: promotion.promotionCode, orderAmount: originalAmount, clientId: user?._id, packageId },
              );
              promotions[key] = {
                ...promotion,
                promotionId: data.discountEntryId,
                originalAmount,
                discountAmount: Number(data.discountAmount || 0),
                finalAmount: Number(data.finalAmount),
              };
            } catch (error) {
              if (!axios.isAxiosError(error) || ![400, 404, 409, 422].includes(error.response?.status || 0)) throw error;
              return { pkg, notice: `The offer on ${pkg.packageName} could not be applied to the latest price. Remove the offer and refresh.` };
            }
          }
          return {
            pkg: updated,
            notice: available ? '' : `The selected time for ${pkg.packageName} is no longer available. Go back to choose another time.`,
          };
        }));
        return {
          vendor: { ...vendor, packages: packages.map(result => result.pkg) },
          notice: packages.find(result => result.notice)?.notice,
        };
      }));

      setCartData({ ...cartData, vendors: results.map(result => result.vendor) });
      setAppliedPromotions(promotions);
      const notice = results.find(result => result.notice)?.notice || '';
      setRefreshNotice(notice);
      if (!notice && !replacementDeadlinePassed) setCheckoutError('');
    } catch (error) {
      reportMarketplaceLoadError('Could not refresh Review Order:', error);
      setRefreshNotice(isConnectionError(error)
        ? OFFLINE_NOTICE
        : 'Unable to check the latest price and availability. Pull down to try again.');
    }
  });

  const handleCheckout = async () => {
    if (checkoutLock.current || promotionWriteLock.current || applyingCouponId || applyingDiscountCodeKey || bookingSubmitted.current || refreshing || refreshNotice) return;
    checkoutLock.current = true;
    setCheckoutError('');
    setPlacingOrder(true);
    let submittedEvent: any = null;

    try {
      const session = await draft.getSession();

      if (!session) throw new Error('Your session is unavailable. Please sign in again.');
      if (!cartData?.vendors?.length) throw new Error('Your cart is empty. Please add a package before booking.');
      if (cartData.vendors.some((vendor: any) =>
        vendor.packages?.some((pkg: any) => pkg.bookingType === 'CUSTOM')
      )) throw new Error('Remove the package with a retired booking type from your cart before booking.');


      const [eventDetailsRaw, latestCartRaw] = await Promise.all([
        draft.get('eventDetails'), draft.get('cartData'),
      ]);
      const eventDetails = eventDetailsRaw ? JSON.parse(eventDetailsRaw) : null;
      if (!latestCartRaw || loadedDraft.current?.cart !== latestCartRaw || loadedDraft.current?.event !== eventDetailsRaw) {
        throw Object.assign(new Error('Your cart changed or was booked on another device.'), { checkoutConflict: 'BOOKING_DRAFT_CHANGED' });
      }
      submittedEvent = eventDetails;

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
        expectedPricingMethod: pricingMethod(pkg, !!(cateringCategory?._id && vendor.vendor?.buisnessCategory === cateringCategory._id) || pkg.categoryName?.toLowerCase().includes('catering')),
        expectedGroupSize: pkg.groupSize,
        personCount: pricingMethod(pkg, !!(cateringCategory?._id && vendor.vendor?.buisnessCategory === cateringCategory._id) || pkg.categoryName?.toLowerCase().includes('catering')) === 'PER_PERSON' ? Number(pkg.personCount ?? guests) : undefined,
        expectedPackageAmount: packageAmount(pkg, Number(guests), !!(cateringCategory?._id && vendor.vendor?.buisnessCategory === cateringCategory._id) || pkg.categoryName?.toLowerCase().includes('catering')),
        deliveryStartDateTime: pkg.deliveryStartDateTime,
        expectedDeliveryFee: pkg.deliveryFeeType ? deliveryFee(pkg,Number(pkg.quantity || 1),Number(guests || 0),!!(cateringCategory?._id && vendor?.vendor?.buisnessCategory === cateringCategory._id)).totalFee : undefined,
        packageId:
          pkg.packageId ||
          pkg._id,

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
          String(pkg?.bookingType || '').toUpperCase() === 'SETUP_BASED'
            ? pkg.requiredServiceDurationMinutes
            : (pkg.durationMinutes || eventDetails?.durationMinutes || 60),
        ),

        quantity: Math.max(
          1,
          Number(pkg.quantity || 1),
        ),

        requiredServiceWindow:
  getResolvedServiceWindow(pkg),
      };
    }),
);

    if (!draft.isCurrent() || !eventDetails) throw new Error("Your session or event draft is unavailable.");
    const response = await postPlaceOrder({
      organizerId: session.userId,
      bookingDraftRevision: draft.getRevision(),
      eventId: eventDetails?.eventId,

      eventDate: eventDetails?.eventDate,
      eventTime:
        eventDetails?.startTime ||
        eventDetails?.eventTime ||
        '18:00',

      durationMinutes: Number(
        eventDetails?.durationMinutes || 60,
      ),

      eventCityId: eventDetails?.eventCityId,
      eventAddress: eventDetails?.eventAddress,

      selectedCategoryIds:
        Array.isArray(
          eventDetails?.selectedCategoryIds,
        )
          ? eventDetails.selectedCategoryIds
          : [],

      services,

      guests: eventDetails?.guests,
      eventName: eventDetails?.eventName,
      eventType: eventDetails?.eventType,
      replacementRescheduleRequestId:
        eventDetails?.replacementRescheduleRequestId,
      replacementVendorOrderId: eventDetails?.replacementVendorOrderId,
    }, session.token);
    if (!draft.isCurrent()) return;

      if (!response) throw new Error('Booking confirmation was not received. Refresh My Events before trying again.');
      if (response) {
        bookingSubmitted.current = true;
        Toast.show({
          type: 'success',
          text1: 'Order Placed',
          text2: 'Your order has been successfully placed!',
          position: 'bottom',
        });

        await cancelCartReminder();
        if (!draft.isCurrent()) return;

        const chatVendors = new Map<string, { id: string; name: string; avatar: string }>();
        for (const { vendor, vendorName } of cartData.vendors) {
          const id = String(vendor._id);
          chatVendors.set(id, {
            id,
            name: vendor.contactDetails?.brandName || vendor.brandName || vendorName || vendor.name || 'Vendor',
            avatar: vendor.contactDetails?.brandLogo || '',
          });
        }
        router.replace({
          pathname: '/OrderSummary',
          params: { chatVendors: JSON.stringify([...chatVendors.values()]) },
        });
      }
   } catch (error: any) {
  if (!draft.isCurrent()) return;
  reportMarketplaceLoadError('Booking checkout unavailable', error);
  if (isConnectionError(error)) {
    setRefreshNotice(OFFLINE_NOTICE);
    return;
  }
  const message = error?.message || 'Failed to place order. Please try again.';
  if (error?.checkoutConflict === 'EVENT_ALREADY_BOOKED' || error?.checkoutConflict === 'BOOKING_DRAFT_CHANGED') {
    const alreadyBooked = error.checkoutConflict === 'EVENT_ALREADY_BOOKED';
    setCheckoutError(message);
    Alert.alert(alreadyBooked ? 'Already booked' : 'Cart updated', message, [
      ...(!alreadyBooked ? [{ text: 'My Cart', onPress: () => router.replace('/cartmanagement') }] : []),
      { text: 'My Events', onPress: () => router.replace('/myevents') },
    ]);
    return;
  }
  if (submittedEvent?.replacementVendorOrderId && /replacement.*only.*before.*event.*starts/i.test(message)) {
    try {
      await clearExpiredReplacementCart(draft, cartData, submittedEvent);
    } catch {
      const cleanupMessage = `${message} Cart cleanup could not finish. Please remove the expired package from My Cart.`;
      setCheckoutError(cleanupMessage);
      Alert.alert('Booking not submitted', cleanupMessage);
      return;
    }
  }
  setCheckoutError(message);
  Alert.alert('Booking not submitted', message);
} finally {
      checkoutLock.current = false;
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
        refreshControl={refreshControl}
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
                 <View style={styles.eventReviewCard}>
  <TouchableOpacity
    style={styles.eventReviewHeader}
    onPress={() =>
      setEventExpanded(
        (current) => !current,
      )
    }
    activeOpacity={0.8}
  >
    <View style={styles.eventReviewTitleRow}>
      <View style={styles.eventReviewIcon}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={PRIMARY}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.eventReviewLabel}>
          EVENT DETAILS
        </Text>

        <Text
          style={styles.eventReviewTitle}
          numberOfLines={1}
        >
          {eventDetails?.eventName ||
            'Your Event'}
        </Text>
      </View>
    </View>

    <Ionicons
      name={
        eventExpanded
          ? 'chevron-up'
          : 'chevron-down'
      }
      size={20}
      color={PRIMARY}
    />
  </TouchableOpacity>

  {eventExpanded && (
    <View style={styles.eventExpandedBody}>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          Event Name
        </Text>
        <Text style={styles.detailValue}>
          {eventDetails?.eventName ||
            'N/A'}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          Event Type
        </Text>
        <Text style={styles.detailValue}>
          {eventDetails?.eventType ||
            'N/A'}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          Date
        </Text>
        <Text style={styles.detailValue}>
          {formatEventDate(
            eventDetails?.eventDate,
          )}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          Start Time
        </Text>
        <Text style={styles.detailValue}>
          {formatEventTime(
  eventDetails?.startTime,
)}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          End Time
        </Text>
        <Text style={styles.detailValue}>
          {formatEventTime(
            eventDetails?.endTime,
          )}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          Duration
        </Text>
        <Text style={styles.detailValue}>
          {formatDuration(
            eventDetails?.durationMinutes,
          )}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          Guests
        </Text>
        <Text style={styles.detailValue}>
          {eventDetails?.guests ??
            'N/A'}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          City
        </Text>
        <Text style={styles.detailValue}>
          {eventCityName || 'N/A'}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          Event Address
        </Text>
        <Text
          style={styles.detailValue}
          numberOfLines={3}
        >
          {eventDetails?.eventAddress ||
            'N/A'}
        </Text>
      </View>

      <View style={styles.detailColumn}>
        <Text style={styles.detailLabel}>
          Services
        </Text>

        <Text style={styles.detailValueLeft}>
          {Array.isArray(
            eventDetails?.selectedServices,
          ) &&
          eventDetails.selectedServices
            .length > 0
            ? eventDetails.selectedServices.join(
                ', ',
              )
            : 'N/A'}
        </Text>
      </View>
    </View>
  )}
</View>
            


            {cartData.vendors.map((vendor: any, vendorIndex: number) => {
              const vendorData =
  vendor?.vendor || {};

const vendorName =
  vendorData?.contactDetails
    ?.brandName ||
  vendorData?.brandName ||
  vendor?.vendorName ||
  vendorData?.name ||
  'Vendor';

const vendorAccountName =
  vendorData?.name || 'N/A';

const vendorId =
  String(
    vendorData?._id ||
      vendor?.vendorId ||
      '',
  );

const vendorExpanded =
  !!expandedVendors[vendorId];

const vendorCategory =
  getVendorCategoryName(
    vendorData,
    vendor,
  );

const vendorPhone =
  vendorData?.contactDetails
    ?.contactNumber ||
  vendorData?.phone_number ||
  'N/A';

const vendorSecondaryPhone =
  vendorData?.contactDetails
    ?.contactNumberSecondary ||
  '';
const vendorServiceCities =
  getVendorServiceCities(
    vendorData,
    vendor,
  );

const vendorOfficeAddress =
  vendorData?.contactDetails
    ?.officialAddress ||
  vendorData?.businessAddress ||
  vendorData?.address ||
  'N/A';

const packages =
  vendor?.packages || [];
const vendorPackageCount = countPackageUnits(packages);

 const vendorServiceWindows =
  packages
    .map((pkg: any) => {
      const bookingType =
        String(
          pkg?.bookingType ||
            'DURATION_BASED',
        ).toUpperCase();

      let window =
        getResolvedServiceWindow(pkg);

      // ---------------------------------
      // DELIVERY_BASED display fallback
      // Scheduled delivery = event start + delivery offset
      // This is DISPLAY ONLY.
      // Checkout/backend validation stays unchanged.
      // ---------------------------------
      if (
        bookingType ===
          'DELIVERY_BASED' &&
        !window
      ) {
        const eventDate =
          eventDetails?.eventDate;

        const eventStartTime =
          eventDetails?.startTime;

        const deliveryOffset =
          Number(
            pkg?.serviceWindowStartOffsetMinutes,
          );

        if (
          eventDate &&
          eventStartTime &&
          Number.isFinite(deliveryOffset)
        ) {
          const dateOnly =
            String(eventDate).split('T')[0];

          const eventStart =
            new Date(
              `${dateOnly}T${eventStartTime}:00`,
            );

          if (
            !Number.isNaN(
              eventStart.getTime(),
            )
          ) {
            const deliveredAt =
              new Date(
                eventStart.getTime() +
                  deliveryOffset *
                    60 *
                    1000,
              );

            window = {
              startDateTime:
                deliveredAt.toISOString(),

              // Display fallback only.
              endDateTime:
                deliveredAt.toISOString(),
            };
          }
        }
      }

      if (!window) {
        return null;
      }

      const start =
        window?.startDateTime
          ? new Date(
              window.startDateTime,
            )
          : null;

      const end =
        window?.endDateTime
          ? new Date(
              window.endDateTime,
            )
          : null;

      if (
        !start ||
        Number.isNaN(start.getTime())
      ) {
        return null;
      }

      const startDate =
        start.toLocaleDateString(
          'en-GB',
          {
            timeZone: pkg.deliveryTimeZone || 'Asia/Karachi',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          },
        );

      const startTime =
        start.toLocaleTimeString(
          'en-US',
          {
            timeZone: pkg.deliveryTimeZone || 'Asia/Karachi',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          },
        );

      const endTime =
        end &&
        !Number.isNaN(end.getTime())
          ? end.toLocaleTimeString(
              'en-US',
              {
                timeZone: pkg.deliveryTimeZone || 'Asia/Karachi',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              },
            )
          : null;

      let title =
        'Required Service Window';

      let label =
        endTime
          ? `${startDate} • ${startTime} - ${endTime}`
          : `${startDate} • ${startTime}`;

       if (
  bookingType ===
  'DELIVERY_BASED'
) {
  title = 'Scheduled Delivery';

  label =
    `${startDate} • ${startTime}`;
} else if (
        bookingType ===
        'SETUP_BASED'
      ) {
        title = 'Setup Window';
      } else if (
        bookingType ===
        'TIME_SLOT_BASED'
      ) {
        title = 'Appointment Time';
      } else if (
        bookingType ===
        'DURATION_BASED'
      ) {
        title = 'Service Window';
      }

      return {
        packageName:
          pkg?.packageName ||
          'Package',
        title,
        label,
      };
    })
    .filter(Boolean);

   return (
 <View key={`${vendorIndex}-${vendorName}`} style={styles.vendorCard}>
  <TouchableOpacity
  style={styles.vendorHeader}
  onPress={() =>
    toggleVendorDetails(vendorId)
  }
  activeOpacity={0.8}
>
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

  <View style={styles.vendorHeaderRight}>
    <View
      style={styles.packageCountBadge}
    >
      <Text
        style={styles.packageCountText}
      >
        {vendorPackageCount}{' '}
        {vendorPackageCount === 1
          ? 'Package'
          : 'Packages'}
      </Text>
    </View>

    <Ionicons
      name={
        vendorExpanded
          ? 'chevron-up'
          : 'chevron-down'
      }
      size={19}
      color={PRIMARY}
      style={{ marginLeft: 8 }}
    />
  </View>
</TouchableOpacity>

{vendorExpanded && (
  <View style={styles.vendorExpandedBody}>
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        Brand Name
      </Text>

      <Text style={styles.detailValue}>
        {vendorName}
      </Text>
    </View>

    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        Vendor Name
      </Text>

      <Text style={styles.detailValue}>
        {vendorAccountName}
      </Text>
    </View>

    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        Category
      </Text>

      <Text style={styles.detailValue}>
        {vendorCategory}
      </Text>
    </View>

    <View style={styles.detailRow}>
  <Text style={styles.detailLabel}>
    Service Cities
  </Text>

  <Text
    style={styles.detailValue}
    numberOfLines={3}
  >
    {vendorServiceCities}
  </Text>
</View>

    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        Phone
      </Text>

      <Text style={styles.detailValue}>
        {vendorPhone}
      </Text>
    </View>

    {!!vendorSecondaryPhone && (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          Alternate Phone
        </Text>

        <Text style={styles.detailValue}>
          {vendorSecondaryPhone}
        </Text>
      </View>
    )}

    <View style={styles.detailColumn}>
      <Text style={styles.detailLabel}>
        Official Office Address
      </Text>
      <Text style={styles.detailValueLeft}>
        {vendorOfficeAddress}
      </Text>
    </View>
    {vendorServiceWindows.length > 0 && (
  <View style={styles.detailColumn}>
    <Text style={styles.detailLabel}>
  Service Schedule
</Text>

    <View
      style={
        styles.serviceWindowContainer
      }
    >
      {vendorServiceWindows.map(
        (
          item: any,
          index: number,
        ) => (
          <View
            key={`${item.packageName}-${index}`}
            style={
              styles.serviceWindowItem
            }
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={PRIMARY}
            />

            <View
              style={
                styles.serviceWindowTextWrap
              }
            >
              <Text
              style={
                styles.serviceWindowPackage
              }
            >
              {packages.length > 1 ? `${item.packageName} · ${item.title}` : item.title}
            </Text>

            <Text
              style={
                styles.serviceWindowValue
              }
            >
              {item.label}
            </Text>
            </View>
          </View>
        ),
      )}
    </View>
  </View>
)}
  </View>
)}

                  <View style={styles.vendorDivider} />

                  {packages.map((pkg: any, packageIndex: number) => {
                    const isCatering =
                      cateringCategory?._id &&
                      vendor?.vendor?.buisnessCategory === cateringCategory._id;

                    const quantity = Math.max(1, Number(pkg.quantity || 1));
                    const finalPrice = getPackageAmount(vendor, pkg);

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

                          {pricingMethod(pkg, !!isCatering) === 'PER_PERSON' && (
                            <View style={styles.guestTag}>
                              <Ionicons name="people-outline" size={12} color={GOLD} />
                              <Text style={styles.guestTagText}>{pkg.personCount ?? guests} people</Text>
                            </View>
                          )}

                          <Text style={styles.guestTagText}>Quantity: {quantity} · {pricingLabel(pkg, !!isCatering)}</Text>
                          {pricingMethod(pkg, !!isCatering) === 'PER_PERSON' && <Text style={styles.guestTagText}>People: {pkg.personCount ?? guests}</Text>}
                          {pricingMethod(pkg, !!isCatering) === 'GROUP' && <Text style={styles.guestTagText}>People included: {Number(pkg.groupSize) * quantity}</Text>}
                          <Text style={styles.packagePrice}>Rs. {formatCurrency(finalPrice)}</Text>
                          <DeliveryDetails pkg={pkg} quantity={quantity} guests={Number(guests || 0)} isCatering={!!isCatering} />
                          {String(
  pkg?.bookingType || 'DURATION_BASED',
).toUpperCase() !== 'DELIVERY_BASED' && (
  <View style={styles.packageMetaRow}>
    <Ionicons
      name="time-outline"
      size={12}
      color={MUTED}
    />

    <Text style={styles.packageMetaText}>
      {(String(pkg?.bookingType || '').toUpperCase() === 'TIME_SLOT_BASED' ||
        String(pkg?.bookingType || '').toUpperCase() === 'SETUP_BASED')
        ? formatDuration(Number(pkg?.requiredServiceDurationMinutes || 0))
        : formatDuration(
            Number(
              pkg?.durationMinutes ||
                eventDetails?.durationMinutes ||
                0,
            ),
          )}
    </Text>
  </View>
)}

{!!pkg?.requiredServiceWindow && (
  <View style={styles.packageMetaRow}>
    <Ionicons
      name="calendar-outline"
      size={12}
      color={MUTED}
    />

    <Text style={styles.packageMetaText}>
      Service window confirmed
    </Text>
  </View>
)}
                          {availableCoupons.length > 0 && (
                          <View style={styles.availableOffers}>
                            <Text style={styles.availableOffersTitle}>
                              Available Offers
                            </Text>

                            {availableCoupons.map(
                              (coupon: any) => {
                                const discountLabel =
                                  String(
                                coupon.discountType,
                              ).toLowerCase() === 'percentage'
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
                        {appliedPromotion?.promotionType ===
  'DISCOUNT_CODE' && (
  <View style={styles.appliedCodeChip}>
    <View style={styles.appliedCodeLeft}>
      <View style={styles.appliedCodeCheck}>
        <Ionicons
          name="checkmark"
          size={13}
          color="#FFFFFF"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={styles.appliedCodeText}
          numberOfLines={1}
        >
          {appliedPromotion.promotionCode} Applied
        </Text>

        <Text style={styles.appliedCodeSaving}>
          You saved Rs.{' '}
          {formatCurrency(
            Number(
              appliedPromotion.discountAmount ||
                0,
            ),
          )}
        </Text>
      </View>
    </View>

    <TouchableOpacity
      style={styles.removeCodeButton}
      onPress={() =>
        handleRemovePromotion(
          promotionKey,
        )
      }
      activeOpacity={0.7}
    >
      <Ionicons
        name="close"
        size={18}
        color="#C44D5C"
      />
    </TouchableOpacity>
  </View>
)}
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

          {refreshNotice ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.refreshNotice}>
              <Text style={styles.refreshNoticeText}>{refreshNotice}</Text>
            </View>
          ) : null}

          {checkoutError ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ backgroundColor: '#FDEBEC', padding: 12, borderRadius: 12, marginBottom: 10 }}>
              <Text style={{ color: '#9B2335', fontWeight: '700', marginBottom: 4 }}>Booking not submitted</Text>
              <Text style={{ color: '#74202C', lineHeight: 20 }}>{checkoutError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.bookButton, (placingOrder || refreshing || (!!refreshNotice && !replacementDeadlinePassed)) && styles.bookButtonDisabled]}
            onPress={replacementDeadlinePassed ? () => router.replace('/myevents') : handleCheckout}
            disabled={placingOrder || !!applyingCouponId || !!applyingDiscountCodeKey || refreshing || (!!refreshNotice && !replacementDeadlinePassed)}
            activeOpacity={0.85}
          >
            {placingOrder ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.bookButtonText}>{replacementDeadlinePassed ? 'Back to My Events' : 'Confirm & Book Now'}</Text>
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
  refreshNotice: { backgroundColor: '#FDEBEC', padding: 12, borderRadius: 12, marginBottom: 10 },
  refreshNoticeText: { color: '#74202C', lineHeight: 20 },

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
  vendorHeaderRight: {
  flexDirection: 'row',
  alignItems: 'center',
},

vendorExpandedBody: {
  marginTop: 12,
  backgroundColor: '#FCF8FA',
  borderRadius: 12,
  padding: 12,
  borderWidth: 1,
  borderColor: BORDER,
},

eventReviewCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 18,
  padding: 14,
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

eventReviewHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

eventReviewTitleRow: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
},

eventReviewIcon: {
  width: 44,
  height: 44,
  borderRadius: 13,
  backgroundColor: PRIMARY_LIGHT,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 11,
},

eventReviewLabel: {
  fontSize: 9,
  color: GOLD,
  fontWeight: '800',
  letterSpacing: 1,
},

eventReviewTitle: {
  fontSize: 15,
  fontWeight: '800',
  color: TEXT,
  marginTop: 2,
},

eventExpandedBody: {
  marginTop: 14,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: '#F3E8EE',
},

detailRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 9,
  gap: 12,
},

detailColumn: {
  marginBottom: 9,
},

detailLabel: {
  fontSize: 10.5,
  fontWeight: '700',
  color: MUTED,
},

detailValue: {
  flex: 1,
  fontSize: 11,
  fontWeight: '700',
  color: TEXT,
  textAlign: 'right',
},

detailValueLeft: {
  fontSize: 11,
  fontWeight: '700',
  color: TEXT,
  marginTop: 4,
  lineHeight: 16,
},

serviceWindowContainer: {
  marginTop: 6,
  gap: 8,
},

serviceWindowItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  paddingVertical: 8,
  paddingHorizontal: 9,
  borderWidth: 1,
  borderColor: '#F0DCE7',
},

serviceWindowTextWrap: {
  flex: 1,
  marginLeft: 7,
},

serviceWindowPackage: {
  fontSize: 10.5,
  fontWeight: '800',
  color: TEXT,
},

serviceWindowValue: {
  fontSize: 10.5,
  color: GOLD,
  fontWeight: '700',
  marginTop: 3,
},

packageMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 4,
},

packageMetaText: {
  fontSize: 9.5,
  color: MUTED,
  marginLeft: 4,
},
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
appliedCodeChip: {
  marginTop: 9,
  backgroundColor: '#F1FAF4',
  borderWidth: 1,
  borderColor: '#D4EEDC',
  borderRadius: 10,
  paddingVertical: 9,
  paddingLeft: 10,
  paddingRight: 7,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

appliedCodeLeft: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
},

appliedCodeCheck: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#278A4B',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 8,
},

appliedCodeText: {
  fontSize: 11,
  fontWeight: '800',
  color: '#278A4B',
},

appliedCodeSaving: {
  fontSize: 9.5,
  color: '#6E8B76',
  marginTop: 2,
},

removeCodeButton: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: '#FFF0F2',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
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