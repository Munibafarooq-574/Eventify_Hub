import { getPublicDashboardCoupons } from '@/services/getPublicDashboardCoupons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

const PAGE_BG = '#FDF0F7';

/* Ticket colors */
const TICKET_BG = '#F8D7E6';
const INK = '#1A1A1A';
const PLUM = '#6B1E4F'; // brand color

const STUB_BG = '#6B1E4F';
const STUB_PERCENT = '#FFFFFF';
const STUB_OFF = '#D4A85A';
const STUB_BAR = '#F6E3EE';

const CARD_HEIGHT = 156;
const CARD_GAP = 10;
const LEFT_WIDTH = 80;
const PEEK = 36;

const AUTO_SCROLL_MS = 5000;
const HOME_LIMIT = 10;
const ALL_LIMIT = 300;

const BARCODE_PATTERN = [
  3, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2,
];
const DASH_COUNT = 16;

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
  return v.brandName || v.businessName || v.name || '';
};

const getVendorCategory = (coupon: any) => {
  const v = coupon.vendorId;
  if (!v || typeof v === 'string') return '';
  return v.categoryName || '';
};

/* Vendor jin jin cities mein service deta hai wo sab nikalta hai */
const getServiceCities = (coupon: any): string[] => {
  const v = coupon.vendorId;

  if (!v || typeof v === 'string') {
    return [];
  }

  const raw = v.serviceLocationCityIds || [];

  if (!Array.isArray(raw)) {
    return [];
  }

  const names = raw
    .map((city: any) => {
      if (city && typeof city === 'object') {
        return city?.name || city?.cityName || '';
      }
      return '';
    })
    .map((name: string) => String(name).trim())
    .filter(Boolean);

  const seen = new Set<string>();

  return names.filter((name: string) => {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Single coupon card ---------- */
type CouponCardProps = {
  coupon: any;
  width?: number;
  fullWidth?: boolean;
  onBeforeNavigate?: () => void;
};

const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  width,
  fullWidth = false,
  onBeforeNavigate,
}) => {
  const isPercentage = coupon.discountType === 'percentage';
  const validTill = getValidTill(coupon);
  const vendorName = getVendorName(coupon);
  const vendorCategory = getVendorCategory(coupon);

  // Saari cities show hongi
  const cities = getServiceCities(coupon).map(capitalize);
  const cityText = cities.join(', ');

  const discountLabel = isPercentage
    ? `${coupon.discountValue}%`
    : `Rs.${coupon.discountValue}`;

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
      params: { id: vendorId },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={openVendor}
      style={[styles.card, fullWidth ? styles.cardFull : { width }]}
    >
      {/* Left stub: vertical discount text (left) + barcode (right) */}
      <View style={styles.left}>
        <View style={styles.rotatedWrap}>
          <Text style={styles.rotatedText} numberOfLines={1}>
            {discountLabel} <Text style={styles.rotatedOff}>OFF</Text>
          </Text>
        </View>

        <View style={styles.barcode}>
          {BARCODE_PATTERN.map((h, i) => (
            <View key={i} style={[styles.bar, { height: h }]} />
          ))}
        </View>
      </View>

      {/* Ticket cut: dark dashed line + notches */}
      <View style={styles.dividerWrap}>
        {Array.from({ length: DASH_COUNT }).map((_, i) => (
          <View key={i} style={styles.dash} />
        ))}
      </View>
      <View style={[styles.notch, styles.notchTop]} />
      <View style={[styles.notch, styles.notchBottom]} />

      {/* Right: details */}
      <View style={styles.right}>
        {/* Top block: vendor, line, category, cities */}
        <View style={styles.infoBlock}>
          {!!vendorName && (
            <Text style={styles.vendor} numberOfLines={1}>
              {vendorName}
            </Text>
          )}
          <View style={styles.titleLine} />

          {!!vendorCategory && (
            <Text style={styles.vendorMeta} numberOfLines={1}>
              {vendorCategory}
            </Text>
          )}

          {!!cityText && (
            <View style={styles.serviceCitiesRow}>
              <Text style={styles.serviceCitiesLabel} numberOfLines={1}>
                Service Cities
              </Text>
              <Text style={styles.cities} numberOfLines={2}>
                {cityText}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom row: code + validity */}
        <View style={styles.bottomRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} numberOfLines={1}>
              {coupon.code}
            </Text>
          </View>
          <Text style={styles.validity} numberOfLines={1}>
            {validTill ? `Till ${validTill}` : 'Limited time'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ---------- Main component ---------- */
const PublicCouponOffers: React.FC = () => {
  const { width: winW } = useWindowDimensions();

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [sectionW, setSectionW] = useState(winW - 40);

  const [modalVisible, setModalVisible] = useState(false);
  const [allCoupons, setAllCoupons] = useState<any[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  const listRef = useRef<FlatList<any>>(null);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bleed = Math.max(0, (winW - sectionW) / 2);
  const cardWidth = Math.round(sectionW - PEEK);
  const STEP = cardWidth + CARD_GAP;
  const padRight = Math.max(bleed, winW - cardWidth - bleed);

  const handleSectionLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - sectionW) > 0.5) setSectionW(w);
  };

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
  }, [coupons.length, stopAutoScroll, STEP]);

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
    <View style={styles.section} onLayout={handleSectionLayout}>
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

      <FlatList
        ref={listRef}
        data={coupons}
        keyExtractor={(item, index) => String(item._id ?? index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        snapToAlignment="start"
        decelerationRate="fast"
        style={{ marginHorizontal: -bleed }}
        contentContainerStyle={[
          styles.listContent,
          { paddingLeft: bleed, paddingRight: padRight },
        ]}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        onScrollBeginDrag={stopAutoScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => (
          <CouponCard coupon={item} width={cardWidth} />
        )}
      />

      {/* View All modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSide} />

            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>All Offers</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.modalSubtitle}>
                {allLoading
                  ? 'Loading deals...'
                  : `${allCoupons.length} deals available`}
              </Text>
            </View>

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
              <ActivityIndicator size="large" color={PLUM} />
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
    marginTop: 24,
    marginBottom: 14,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAccent: {
    width: 5,
    height: 24,
    borderRadius: 3,
    backgroundColor: PLUM,
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
    color: PLUM,
    paddingRight: 8,
  },

  // vertical padding: notches clip na hon
  listContent: {
    paddingVertical: 12,
  },

  /* Card (poora ticket ek color) */
  card: {
    height: CARD_HEIGHT,
    flexDirection: 'row',
    backgroundColor: TICKET_BG,
    borderRadius: 14,
    overflow: 'visible',
    elevation: 2,
    shadowColor: PLUM,
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardFull: {
    width: '100%',
  },

  /* Left stub */
  left: {
    width: LEFT_WIDTH,
    backgroundColor: STUB_BG,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
    paddingRight: 8,
  },
  barcode: {
    width: 26,
    height: 108,
    marginLeft: 6,
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: STUB_BAR,
    marginBottom: 1.5,
  },
  rotatedWrap: {
    width: 30,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatedText: {
    width: 110,
    height: 30,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 30,
    fontSize: 18,
    fontWeight: '900',
    color: STUB_PERCENT,
    letterSpacing: 1,
    transform: [{ rotate: '-90deg' }],
  },
  rotatedOff: {
    color: STUB_OFF,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* Ticket cut: dark dashed line */
  dividerWrap: {
    width: 2,
    marginVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dash: {
    width: 1.5,
    height: 4,
    backgroundColor: INK,
    borderRadius: 1,
  },
  notch: {
    position: 'absolute',
    left: LEFT_WIDTH - 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PAGE_BG,
  },
  notchTop: {
    top: -7,
  },
  notchBottom: {
    bottom: -7,
  },

  /* Right (details) */
  right: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 12,
    justifyContent: 'space-between',
  },
  infoBlock: {
    flexShrink: 1,
  },
  vendor: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: INK,
    letterSpacing: 0.2,
  },
  titleLine: {
    height: 1.5,
    backgroundColor: INK,
    marginTop: 4,
    marginBottom: 6,
    width: '100%',
    opacity: 0.85,
  },
  vendorMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#3A2A35',
  },
  serviceCitiesRow: {
    marginTop: 4,
  },
  serviceCitiesLabel: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
    color: '#8B7688',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  cities: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#3A2A35',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  codeBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: INK,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: PLUM,
    letterSpacing: 1,
  },
  validity: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3A2A35',
    marginLeft: 8,
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
    shadowColor: PLUM,
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
    color: PLUM,
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
    color: PLUM,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 14,
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