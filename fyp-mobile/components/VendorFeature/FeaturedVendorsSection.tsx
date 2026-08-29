
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
        console.error('[Featured Vendors] Failed to load:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (vendors.length === 0) {
    return null;
  }

  const handleVendorPress = (vendor: FeaturedVendorPublicEntry) => {
    router.push({
      pathname: '/vendorprofiledetails',
      params: {
        id: vendor.vendorId,
      },
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        ⭐ Featured Vendors
      </Text>

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
            {vendor.coverImage ? (
              <Image
                source={{ uri: vendor.coverImage }}
                style={styles.image}
              />
            ) : (
              <View
                style={[
                  styles.image,
                  styles.imagePlaceholder,
                ]}
              />
            )}

            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                ⭐ Featured
              </Text>
            </View>

            <Text
              style={styles.vendorName}
              numberOfLines={1}
            >
              {vendor.vendorName}
            </Text>

            {/* Rating */}
            {vendor.rating !== null && vendor.rating !== undefined && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingText}>
                  {Number(vendor.rating).toFixed(1)}
                </Text>
              </View>
            )}

            {/* Location */}
            {vendor.city && (
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text
                  style={styles.vendorMeta}
                  numberOfLines={1}
                >
                 {vendor.city}
                </Text>
              </View>
            )}
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

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    paddingHorizontal: 16,
  },

  row: {
    paddingHorizontal: 16,
    gap: 12,
  },

  card: {
    width: 150,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    paddingBottom: 8,
  },

  image: {
    width: '100%',
    height: 90,
  },

  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
  },

  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.badge,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
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

  ratingStar: {
    fontSize: 13,
    color: COLORS.rating,
    marginRight: 3,
  },

  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginHorizontal: 8,
  },

  locationIcon: {
    fontSize: 11,
    marginRight: 3,
  },

  vendorMeta: {
    flex: 1,
    fontSize: 11,
    color: COLORS.muted,
  },
});
