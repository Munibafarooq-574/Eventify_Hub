// fyp-mobile/components/VendorFeature/FeaturedPackagesSection.tsx

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

import { getActiveFeaturedPackages } from '../../services/getActiveFeaturedPackages';
import { FeaturedPackagePublicEntry } from '../../types/promotion.types';

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

  useEffect(() => {
    let cancelled = false;

    getActiveFeaturedPackages(10)
      .then((result) => {
        if (!cancelled) {
          setPackages(result);
        }
      })
      .catch((error) => {
        console.error(
          '[Featured Packages] Failed to load:',
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (packages.length === 0) {
    return null;
  }

  const handlePackagePress = (
    pkg: FeaturedPackagePublicEntry,
  ) => {
    router.push({
      pathname: '/vendorprofiledetails',
      params: {
        id: pkg.vendorId,
        packageId: pkg.packageId,
      },
    });
  };

  return (
    <View style={styles.section}>
      {/* ---------- Section Heading ---------- */}
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleIcon}>
          <Ionicons
            name="cube"
            size={18}
            color="#7D0C72"
          />
        </View>

        <Text style={styles.sectionTitle}>
          Featured Packages
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.promotionId}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => handlePackagePress(pkg)}
          >
            {/* ---------- Package Image ---------- */}
            {pkg.coverImage ? (
              <Image
                source={{ uri: pkg.coverImage }}
                style={styles.image}
              />
            ) : (
              <View
                style={[
                  styles.image,
                  styles.imagePlaceholder,
                ]}
              >
                <View style={styles.packageIconCircle}>
                  <Ionicons
                    name="cube-outline"
                    size={34}
                    color={COLORS.icon}
                  />
                </View>
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

            {/* ---------- Package Name ---------- */}
            <Text
              style={styles.packageName}
              numberOfLines={2}
            >
              {pkg.packageName}
            </Text>

            {/* ---------- Vendor Name ---------- */}
            <Text
              style={styles.vendorName}
              numberOfLines={1}
            >
              {pkg.vendorName}
            </Text>

            {/* ---------- Price ---------- */}
            <Text style={styles.price}>
              Rs. {Number(pkg.price || 0).toLocaleString()}
            </Text>

            {/* ---------- Rating ---------- */}
            <Text style={styles.rating}>
              {pkg.rating !== null
                ? `${Number(pkg.rating).toFixed(1)} (${pkg.totalReviews})`
                : 'No reviews yet'}
            </Text>

            {/* ---------- Orders ---------- */}
            <Text style={styles.orders}>
              {pkg.orderCount > 0
                ? `${pkg.orderCount} orders`
                : 'No orders yet'}
            </Text>
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