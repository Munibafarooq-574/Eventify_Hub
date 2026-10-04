// fyp-mobile/components/VendorFeature/FeaturedPackagesSection.tsx

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

import { getActiveFeaturedPackages } from '../../services/getActiveFeaturedPackages';
import { FeaturedPackagePublicEntry } from '../../types/promotion.types';
import getMarketplaceEventContext from '../../services/getMarketplaceEventContext';

const PAGE_BG = '#FDF0F7';
const ALL_LIMIT = 50;
const COLORS = {
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  card: '#FFFFFF',
  badge: '#FEF3C7',
  badgeText: '#92400E',
  price: '#059669',
  icon: '#9CA3AF',
  iconBackground: '#F3F4F6',
};

export function FeaturedPackagesSection() {
  const router = useRouter();

  const [packages, setPackages] = useState<
    FeaturedPackagePublicEntry[]
  >([]);

 const [modalVisible, setModalVisible] = useState(false);
  const [allPackages, setAllPackages] = useState<
    FeaturedPackagePublicEntry[]
  >([]);
  const [allLoading, setAllLoading] = useState(false);

 useEffect(() => {
  let cancelled = false;

  const loadFeaturedPackages =
  async () => {
    try {
      const {
        discoveryCityId,
        categoryIds,
        eventDate,
        startTime,
        durationMinutes,
        hasAvailabilityContext,
      } =
        await getMarketplaceEventContext();

      const featured =
        await getActiveFeaturedPackages({
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

      setPackages(featured);
    } catch (error) {
      console.error(
        '[Featured Packages] Failed to load:',
        error,
      );

      if (!cancelled) {
        setPackages([]);
      }
    }
  };

  void loadFeaturedPackages();

  return () => {
    cancelled = true;
  };
}, []);

  if (packages.length === 0) {
    return null;
  }

  const handlePackagePress = (
    pkg: FeaturedPackagePublicEntry,
    fromModal: boolean = false,
  ) => {
    if (fromModal) setModalVisible(false);

    router.push({
      pathname: '/vendorprofiledetails',
      params: {
        id: pkg.vendorId,
        packageId: pkg.packageId,
        openTab: 'Packages',
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

      const result = await getActiveFeaturedPackages({
        limit: ALL_LIMIT,
        eventCityId: discoveryCityId,
        categoryIds,
        eventDate: hasAvailabilityContext ? eventDate : undefined,
        startTime: hasAvailabilityContext ? startTime : undefined,
        durationMinutes: hasAvailabilityContext ? durationMinutes : undefined,
      });

      setAllPackages(Array.isArray(result) ? result : packages);
    } catch (error) {
      console.error('[Featured Packages] View all failed:', error);
      setAllPackages(packages);
    } finally {
      setAllLoading(false);
    }
  };

  const renderPackageCard = (
    pkg: FeaturedPackagePublicEntry,
    fullWidth: boolean,
  ) => (
    <TouchableOpacity
      key={pkg.promotionId}
      style={[styles.card, fullWidth && styles.cardFull]}
      activeOpacity={0.85}
      onPress={() => handlePackagePress(pkg, fullWidth)}
    >
      {pkg.coverImage ? (
        <Image source={{ uri: pkg.coverImage }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <View style={styles.packageIconCircle}>
            <Ionicons name="cube-outline" size={34} color={COLORS.icon} />
          </View>
        </View>
      )}

      <View style={styles.badge}>
        <Ionicons name="star" size={11} color={COLORS.badgeText} />
        <Text style={styles.badgeText}>Featured</Text>
      </View>

      <Text style={styles.packageName} numberOfLines={2}>
        {pkg.packageName}
      </Text>

      <Text style={styles.vendorName} numberOfLines={1}>
        {pkg.vendorName}
      </Text>

      <Text style={styles.price}>
        Rs. {Number(pkg.price || 0).toLocaleString()}
      </Text>

      <Text style={styles.rating}>
        {pkg.rating !== null
          ? `${Number(pkg.rating).toFixed(1)} (${pkg.totalReviews})`
          : 'No reviews yet'}
      </Text>

      <Text style={styles.orders}>
        {pkg.orderCount > 0 ? `${pkg.orderCount} orders` : 'No orders yet'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.section}>
      <View style={styles.hdrRow}>
        <View style={styles.hdrLeft}>
          <View style={styles.hdrAccent} />
          <Text style={styles.hdrTitle}>Featured Packages</Text>
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
        {packages.map((pkg) => renderPackageCard(pkg, false))}
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
              <Text style={styles.mTitle}>Featured Packages</Text>
              <View style={styles.mUnderline} />
              <Text style={styles.mSubtitle}>
                {allLoading
                  ? 'Loading packages...'
                  : `${allPackages.length} packages available`}
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
              data={allPackages}
              keyExtractor={(item) => item.promotionId}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mList}
              ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
              ListEmptyComponent={
                <Text style={styles.mEmpty}>No packages available</Text>
              }
              renderItem={({ item }) => renderPackageCard(item, true)}
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
    height: 160,
  },

  imagePlaceholder: {
    backgroundColor: COLORS.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },

  packageIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
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

  packageName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginHorizontal: 8,
  },

  vendorName: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
    marginHorizontal: 8,
  },

  price: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.price,
    marginTop: 5,
    marginHorizontal: 8,
  },

  rating: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
    marginHorizontal: 8,
  },

  orders: {
    fontSize: 11,
    color: COLORS.muted,
    marginHorizontal: 8,
  },
});