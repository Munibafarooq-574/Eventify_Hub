//fyp-mobile/components/VendorFeature/FeaturedPackagesSection.tsx
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
};

export function FeaturedPackagesSection() {
  const router = useRouter();

  const [packages, setPackages] = useState<FeaturedPackagePublicEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    getActiveFeaturedPackages(10)
      .then((result) => {
        if (!cancelled) {
          setPackages(result);
        }
      })
      .catch((error) => {
        console.error('[Featured Packages] Failed to load:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (packages.length === 0) {
    return null;
  }

  const handlePackagePress = (pkg: FeaturedPackagePublicEntry) => {
  router.push({
    pathname: '/vendorprofiledetails',
    params: {
      id: pkg.vendorId,
    },
  });
};

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📦 Featured Packages</Text>

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
            {pkg.coverImage ? (
              <Image
                source={{ uri: pkg.coverImage }}
                style={styles.image}
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.placeholderText}>📦</Text>
              </View>
            )}

            <View style={styles.badge}>
              <Text style={styles.badgeText}>⭐ Featured</Text>
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
    height: 90,
  },

  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 30,
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
});

