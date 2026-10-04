import { getPublicDashboardCoupons } from '@/services/getPublicDashboardCoupons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/* Apni screen ka background color yahan likho (ticket notches isi color ke hain) */
const PAGE_BG = '#FDF0F7';

const CARD_WIDTH = 290;
const CARD_GAP = 12;
const LEFT_WIDTH = 100;
const STEP = CARD_WIDTH + CARD_GAP;

const AUTO_SCROLL_MS = 5000; 
const HOME_LIMIT = 10; 
const ALL_LIMIT = 300; 

const getValidTill = (coupon: any) =>
  coupon.endDate
    ? new Date(coupon.endDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })
    : '';

const getVendorName = (coupon: any) => {
  const v = coupon.vendorId;

  if (!v || typeof v === 'string') return '';

  return (
    v.brandName ||
    v.businessName ||
    v.name ||
    ''
  );
};

const getVendorCategory = (coupon: any) => {
  const v = coupon.vendorId;

  if (!v || typeof v === 'string') return '';

  return v.categoryName || '';
};

const getVendorLocation = (coupon: any) => {
  const v = coupon.vendorId;

  if (!v || typeof v === 'string') return '';

  return v.city || '';
};

/* ---------- Single coupon card ---------- */
type CouponCardProps = {
  coupon: any;
  fullWidth?: boolean;
  onBeforeNavigate?: () => void;
};

const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  fullWidth = false,
  onBeforeNavigate,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isPercentage = coupon.discountType === 'percentage';
  const validTill = getValidTill(coupon);
  const vendorName = getVendorName(coupon);
const vendorCategory = getVendorCategory(coupon);
const vendorLocation = getVendorLocation(coupon);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(String(coupon.code));
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }

  const openVendor = () => {
  if (!coupon.vendorId) return;

  const vendorId =
    typeof coupon.vendorId === 'string'
      ? coupon.vendorId
      : coupon.vendorId._id;

  if (!vendorId) return;

  onBeforeNavigate?.();

  router.push({
    pathname: '/vendorprofiledetails',
    params: {
      id: vendorId,
    },
  });
};

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={openVendor}
      style={[styles.card, fullWidth && styles.cardFull]}
    >
      {/* Left: discount */}
      <View style={styles.left}>
        {isPercentage ? (
          <Text style={styles.discountBig}>{coupon.discountValue}%</Text>
        ) : (
          <>
            <Text style={styles.discountRs}>Rs.</Text>
            <Text style={styles.discountBig}>{coupon.discountValue}</Text>
          </>
        )}
        <Text style={styles.discountOff}>OFF</Text>
      </View>

      {/* Ticket cut: dashed line + notches */}
      <View style={styles.dividerWrap}>
        <View style={styles.dashedClip}>
          <View style={styles.dashedLine} />
        </View>
      </View>
      <View style={[styles.notch, styles.notchTop]} />
      <View style={[styles.notch, styles.notchBottom]} />

      {/* Right: details */}
      <View style={styles.right}>
        <View>
  {!!vendorName && (
    <Text
      style={styles.vendor}
      numberOfLines={1}
    >
      {vendorName}
    </Text>
  )}

  {(vendorCategory || vendorLocation) && (
    <Text
      style={styles.vendorMeta}
      numberOfLines={1}
    >
      {[vendorCategory, vendorLocation]
        .filter(Boolean)
        .join(' • ')}
    </Text>
  )}
</View>

<Text style={styles.useCodeLabel}>USE CODE</Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeText} numberOfLines={1}>
            {coupon.code}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.validity} numberOfLines={1}>
            {validTill ? `Till ${validTill}` : 'Limited time'}
          </Text>

          <TouchableOpacity
            onPress={handleCopy}
            activeOpacity={0.8}
            style={[styles.copyBtn, copied && styles.copyBtnDone]}
          >
            <Text style={[styles.copyText, copied && styles.copyTextDone]}>
              {copied ? 'Copied ✓' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ---------- Main component ---------- */
const PublicCouponOffers: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View All modal
  const [modalVisible, setModalVisible] = useState(false);
  const [allCoupons, setAllCoupons] = useState<any[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  // Auto scroll
  const listRef = useRef<FlatList<any>>(null);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const result = await getPublicDashboardCoupons(HOME_LIMIT);
        setCoupons(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error('Failed to load public coupons:', error);
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    };

    loadCoupons();
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    if (coupons.length < 2) return;

    intervalRef.current = setInterval(() => {
      const next =
        indexRef.current + 1 >= coupons.length ? 0 : indexRef.current + 1;
      indexRef.current = next;
      listRef.current?.scrollToOffset({
        offset: next * STEP,
        animated: true,
      });
    }, AUTO_SCROLL_MS);
  }, [coupons.length, stopAutoScroll]);

  // Coupons aate hi auto scroll start, modal khula ho to pause
  useEffect(() => {
    if (modalVisible) {
      stopAutoScroll();
      return;
    }
    startAutoScroll();
    return stopAutoScroll;
  }, [modalVisible, startAutoScroll, stopAutoScroll]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    indexRef.current = Math.max(
      0,
      Math.min(coupons.length - 1, Math.round(x / STEP)),
    );
    if (!modalVisible) startAutoScroll();
  };

  const openViewAll = async () => {
    setModalVisible(true);
    setAllLoading(true);
    try {
      const result = await getPublicDashboardCoupons(ALL_LIMIT);
      setAllCoupons(Array.isArray(result) ? result : coupons);
    } catch (error) {
      console.error('Failed to load all coupons:', error);
      setAllCoupons(coupons);
    } finally {
      setAllLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  if (coupons.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAccent} />
          <Text style={styles.sectionTitle}>Special Offers</Text>
        </View>

        <TouchableOpacity onPress={openViewAll} activeOpacity={0.7}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal auto-scrolling coupon carousel */}
      <FlatList
        ref={listRef}
        data={coupons}
        keyExtractor={(item, index) => String(item._id ?? index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        onScrollBeginDrag={stopAutoScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => <CouponCard coupon={item} />}
      />

      {/* View All modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
       <View style={styles.modalContainer}>
  <View style={styles.modalHeader}>
    {/* Left spacer: title ko exact center rakhne ke liye */}
    <View style={styles.headerSide} />

    {/* Center title */}
    <View style={styles.modalTitleWrap}>
      <Text style={styles.modalTitle}>All Offers</Text>
      <View style={styles.titleUnderline} />
      <Text style={styles.modalSubtitle}>
        {allLoading
          ? 'Loading deals...'
          : `${allCoupons.length} deals available`}
      </Text>
    </View>

    {/* Right close button */}
    <View style={[styles.headerSide, styles.headerSideRight]}>
      <TouchableOpacity
        onPress={() => setModalVisible(false)}
        activeOpacity={0.7}
        style={styles.closeBtn}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>

          {allLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#6B1E4F" />
            </View>
          ) : (
            <FlatList
              data={allCoupons}
              keyExtractor={(item, index) => String(item._id ?? index)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
              ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No offers available</Text>
              }
              renderItem={({ item }) => (
                <CouponCard
                  coupon={item}
                  fullWidth
                  onBeforeNavigate={() => setModalVisible(false)}
                />
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    marginBottom: 8,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAccent: {
    width: 5,
    height: 24,
    borderRadius: 3,
    backgroundColor: '#6B1E4F',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B1B26',
    letterSpacing: 0.3,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B1E4F',
    paddingRight: 8,
  },

  listContent: {
    paddingRight: 8,
    paddingVertical: 4,
  },

  /* Card */
  card: {
    width: CARD_WIDTH,
    height: 132,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3DCE8',
    overflow: 'visible',
    elevation: 2,
    shadowColor: '#6B1E4F',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardFull: {
    width: '100%',
  },

  /* Left (discount) */
  left: {
    width: LEFT_WIDTH,
    backgroundColor: '#6B1E4F',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  discountRs: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E9C7DA',
  },
  discountBig: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 34,
  },
  discountOff: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D4A85A',
    letterSpacing: 2,
    marginTop: 2,
  },

  /* Ticket cut */
  dividerWrap: {
    width: 1,
    justifyContent: 'center',
  },
  dashedClip: {
    height: '78%',
    width: 1,
    overflow: 'hidden',
  },
  dashedLine: {
    width: 2,
    height: '100%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5C4D6',
  },
  notch: {
    position: 'absolute',
    left: LEFT_WIDTH - 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PAGE_BG,
    borderWidth: 1,
    borderColor: '#F3DCE8',
  },
  notchTop: {
    top: -9,
  },
  notchBottom: {
    bottom: -9,
  },

  /* Right (details) */
  right: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  vendor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B1B26',
  },

  vendorMeta: {
  fontSize: 10.5,
  color: '#8B7688',
  marginTop: 2,
},
  useCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B7688',
    letterSpacing: 1,
  },
  codeBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#6B1E4F',
    backgroundColor: '#FBF2F8',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B1E4F',
    letterSpacing: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validity: {
    fontSize: 12,
    color: '#8B7688',
    flex: 1,
    marginRight: 8,
  },
  copyBtn: {
    backgroundColor: '#6B1E4F',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  copyBtnDone: {
    backgroundColor: '#E6F4EA',
  },
  copyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  copyTextDone: {
    color: '#1E7B3A',
  },

  loadingContainer: {
    paddingVertical: 20,
  },

  /* View All modal */
  modalContainer: {
    flex: 1,
    backgroundColor: PAGE_BG,
    paddingTop:
      Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8,
  },
   modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3DCE8',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: '#6B1E4F',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  headerSide: {
    width: 44,
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  modalTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6B1E4F',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  titleUnderline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4A85A',
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#8B7688',
    marginTop: 4,
    textAlign: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBF2F8',
    borderWidth: 1,
    borderColor: '#F3DCE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B1E4F',
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8B7688',
    marginTop: 40,
    fontSize: 14,
  },
});

export default PublicCouponOffers;