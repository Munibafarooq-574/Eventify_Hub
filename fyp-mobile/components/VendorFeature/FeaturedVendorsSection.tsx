// fyp-mobile/components/VendorFeature/FeaturedVendorsSection.tsx

import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getActiveFeaturedVendors } from '../../services/getActiveFeaturedVendors';
import { FeaturedVendorPublicEntry } from '../../types/promotion.types';

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

  useEffect(() => {
    let cancelled = false;

    getActiveFeaturedVendors(10)
      .then((result) => {
        if (!cancelled) {
          setVendors(result);
        }
      })
      .catch((error) => {
        console.error(
          '[Featured Vendors] Failed to load:',
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (vendors.length === 0) {
    return null;
  }

  const handleVendorPress = (
    vendor: FeaturedVendorPublicEntry,
  ) => {
    router.push({
      pathname: '/vendorprofiledetails',
      params: {
        id: vendor.vendorId,
      },
    });
  };

  return (
    <View style={styles.section}>
      {/* ---------- Section Heading ---------- */}
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleIcon}>
          <Ionicons
            name="star"
            size={18}
            color="#F59E0B"
          />
        </View>

        <Text style={styles.sectionTitle}>
          Featured Vendors
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {vendors.map((vendor) => (
          <TouchableOpacity
            key={vendor.promotionId}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => handleVendorPress(vendor)}
          >
            {/* ---------- Vendor Image ---------- */}
            {vendor.brandLogo ? (
          <Image
            source={{ uri: vendor.brandLogo }}
            style={styles.image}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
            ]}
          >
            <Ionicons
              name="storefront-outline"
              size={34}
              color="#9CA3AF"
            />
          </View>
        )}

            {/* ---------- Featured Badge ---------- */}
            <View style={styles.badge}>
              <Ionicons
                name="star"
                size={11}
                color={COLORS.badgeText}
              />

              <Text style={styles.badgeText}>
                Featured
              </Text>
            </View>

            {/* ---------- Vendor Name ---------- */}
            <Text
              style={styles.vendorName}
              numberOfLines={1}
            >
              {vendor.vendorName}
            </Text>

            {/* ---------- Rating ---------- */}
            <View style={styles.ratingRow}>
              <Ionicons
                name={
                  vendor.rating !== null &&
                  vendor.rating !== undefined
                    ? 'star'
                    : 'star-outline'
                }
                size={13}
                color={COLORS.rating}
              />

              <Text style={styles.ratingText}>
                {vendor.rating !== null &&
                vendor.rating !== undefined
                  ? Number(vendor.rating).toFixed(1)
                  : 'No reviews yet'}
              </Text>
            </View>

            {/* ---------- Orders ---------- */}
            <View style={styles.ordersRow}>
              <Ionicons
                name="receipt-outline"
                size={12}
                color={COLORS.muted}
              />

              <Text
                style={styles.vendorMeta}
                numberOfLines={1}
              >
                {vendor.customerCount > 0
                  ? `${vendor.customerCount} orders`
                  : 'No orders yet'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginVertical: 12,
  },

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
    paddingHorizontal: 16,
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