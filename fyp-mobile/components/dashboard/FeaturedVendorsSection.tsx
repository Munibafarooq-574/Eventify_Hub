// fyp-mobile/components/VendorFeature/FeaturedVendorsSection.tsx

import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import getMarketplaceEventContext from '../../services/getMarketplaceEventContext';
import { getActiveFeaturedVendors } from '../../services/getActiveFeaturedVendors';
import { FeaturedVendorPublicEntry } from '../../types/promotion.types';

const PAGE_BG = '#FDF0F7';
const ALL_LIMIT = 50;
const COLORS = {
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  card: '#FFFFFF',
  badge: '#FEF3C7',
  badgeText: '#92400E',
  rating: '#F59E0B',
};

export function FeaturedVendorsSection() {
  const router = useRouter();

  const [vendors, setVendors] = useState<FeaturedVendorPublicEntry[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
  const [allVendors, setAllVendors] = useState<FeaturedVendorPublicEntry[]>([]);
  const [allLoading, setAllLoading] = useState(false);

useEffect(() => {
  let cancelled = false;

  const loadFeaturedVendors = async () => {
    try {
  const {
  discoveryCityId,
  categoryIds,
  eventDate,
  startTime,
  durationMinutes,
  hasAvailabilityContext,
} = await getMarketplaceEventContext();

const featured =
  await getActiveFeaturedVendors({
    limit: 5,
    eventCityId:
      discoveryCityId,
    categoryIds,
    eventDate:
      hasAvailabilityContext
        ? eventDate
        : undefined,
    startTime:
      hasAvailabilityContext
        ? startTime
        : undefined,
    durationMinutes:
      hasAvailabilityContext
        ? durationMinutes
        : undefined,
  });
if (cancelled) {
  return;
}

setVendors(featured);

    } catch (error) {
      console.error(
        '[Featured Vendors] Failed to load:',
        error,
      );

      if (!cancelled) {
        setVendors([]);
      }
    }
  };

  void loadFeaturedVendors();

  return () => {
    cancelled = true;
  };
}, []);
   if (vendors.length === 0) {
    return null;
  }

  const handleVendorPress = (
    vendor: FeaturedVendorPublicEntry,
    fromModal: boolean = false,
  ) => {
    if (fromModal) setModalVisible(false);

    router.push({
      pathname: '/vendorprofiledetails',
      params: {
        id: vendor.vendorId,
      },
    });
  };

  const openViewAll = async () => {
    setModalVisible(true);
    setAllLoading(true);

    try {
      const {
        discoveryCityId,
        categoryIds,
        eventDate,
        startTime,
        durationMinutes,
        hasAvailabilityContext,
      } = await getMarketplaceEventContext();

      const result = await getActiveFeaturedVendors({
        limit: ALL_LIMIT,
        eventCityId: discoveryCityId,
        categoryIds,
        eventDate: hasAvailabilityContext ? eventDate : undefined,
        startTime: hasAvailabilityContext ? startTime : undefined,
        durationMinutes: hasAvailabilityContext ? durationMinutes : undefined,
      });

      setAllVendors(Array.isArray(result) ? result : vendors);
    } catch (error) {
      console.error('[Featured Vendors] View all failed:', error);
      setAllVendors(vendors);
    } finally {
      setAllLoading(false);
    }
  };

  const renderVendorCard = (
    vendor: FeaturedVendorPublicEntry,
    fullWidth: boolean,
  ) => (
    <TouchableOpacity
      key={vendor.promotionId}
      style={[styles.card, fullWidth && styles.cardFull]}
      activeOpacity={0.85}
      onPress={() => handleVendorPress(vendor, fullWidth)}
    >
      {vendor.brandLogo ? (
        <Image source={{ uri: vendor.brandLogo }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="storefront-outline" size={34} color="#9CA3AF" />
        </View>
      )}

      <View style={styles.badge}>
        <Ionicons name="star" size={11} color={COLORS.badgeText} />
        <Text style={styles.badgeText}>Featured</Text>
      </View>

      <Text style={styles.vendorName} numberOfLines={1}>
        {vendor.vendorName}
      </Text>

      <View style={styles.ratingRow}>
        <Ionicons
          name={
            vendor.rating !== null && vendor.rating !== undefined
              ? 'star'
              : 'star-outline'
          }
          size={13}
          color={COLORS.rating}
        />
        <Text style={styles.ratingText}>
          {vendor.rating !== null && vendor.rating !== undefined
            ? Number(vendor.rating).toFixed(1)
            : 'No reviews yet'}
        </Text>
      </View>

      <View style={styles.ordersRow}>
        <Ionicons name="receipt-outline" size={12} color={COLORS.muted} />
        <Text style={styles.vendorMeta} numberOfLines={1}>
          {vendor.customerCount > 0
            ? `${vendor.customerCount} orders`
            : 'No orders yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.section}>
      <View style={styles.hdrRow}>
        <View style={styles.hdrLeft}>
          <View style={styles.hdrAccent} />
          <Text style={styles.hdrTitle}>Featured Vendors</Text>
        </View>

        <TouchableOpacity activeOpacity={0.7} onPress={openViewAll}>
          <Text style={styles.hdrViewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {vendors.map((vendor) => renderVendorCard(vendor, false))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.mContainer}>
          <View style={styles.mHeader}>
            <View style={styles.mSide} />

            <View style={styles.mTitleWrap}>
              <Text style={styles.mTitle}>Featured Vendors</Text>
              <View style={styles.mUnderline} />
              <Text style={styles.mSubtitle}>
                {allLoading
                  ? 'Loading vendors...'
                  : `${allVendors.length} vendors available`}
              </Text>
            </View>

            <View style={[styles.mSide, styles.mSideRight]}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
                style={styles.mClose}
              >
                <Text style={styles.mCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {allLoading ? (
            <View style={styles.mLoading}>
              <ActivityIndicator size="large" color="#6B1E4F" />
            </View>
          ) : (
            <FlatList
              data={allVendors}
              keyExtractor={(item) => item.promotionId}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mList}
              ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
              ListEmptyComponent={
                <Text style={styles.mEmpty}>No vendors available</Text>
              }
              renderItem={({ item }) => renderVendorCard(item, true)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginVertical: 12,
  },

    hdrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hdrLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hdrAccent: {
    width: 5,
    height: 24,
    borderRadius: 3,
    backgroundColor: '#6B1E4F',
    marginRight: 10,
  },
  hdrTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B1B26',
    letterSpacing: 0.3,
  },
  hdrViewAll: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B1E4F',
    paddingRight: 8,
  },

    mContainer: {
    flex: 1,
    backgroundColor: PAGE_BG,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8,
  },
  mHeader: {
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
  mSide: { width: 44 },
  mSideRight: { alignItems: 'flex-end' },
  mTitleWrap: { flex: 1, alignItems: 'center' },
  mTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6B1E4F',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  mUnderline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4A85A',
    marginTop: 4,
  },
  mSubtitle: {
    fontSize: 12,
    color: '#8B7688',
    marginTop: 4,
    textAlign: 'center',
  },
  mClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBF2F8',
    borderWidth: 1,
    borderColor: '#F3DCE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mCloseText: { fontSize: 16, fontWeight: '700', color: '#6B1E4F' },
  mList: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 },
  mLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mEmpty: { textAlign: 'center', color: '#8B7688', marginTop: 40, fontSize: 14 },
  cardFull: { width: '100%', marginRight: 0 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  sectionTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  row: {
    gap: 12,
  },

  card: {
    width: 170,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    paddingBottom: 10,
  },

  image: {
    width: '100%',
    height: 170,
  },

  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.badge,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.badgeText,
  },

  vendorName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginHorizontal: 8,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginHorizontal: 8,
  },

  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },

  ordersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginHorizontal: 8,
  },

  vendorMeta: {
    flex: 1,
    fontSize: 11,
    color: COLORS.muted,
    marginLeft: 4,
  },
});