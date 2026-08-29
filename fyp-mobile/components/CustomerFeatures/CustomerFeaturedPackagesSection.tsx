// fyp-mobile/components/CustomerFeatures/FeaturedPackagesSection.tsx
//
// Same drop-in pattern as FeaturedVendorsSection.tsx:
//
//   import { FeaturedPackagesSection } from '../../components/FeaturedPackagesSection';
//   ...
//   <FeaturedPackagesSection navigation={navigation} />
//
// Renders nothing if no package is currently featured.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { getActiveFeaturedPackages } from '../../services/getActiveFeaturedPackages';
import { FeaturedPackagePublicEntry } from '../../types/promotion.types';

const COLORS = {
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  card: '#FFFFFF',
  primary: '#7C3AED',
  badge: '#FEF3C7',
  badgeText: '#92400E',
};

const VENDOR_PROFILE_ROUTE = 'VendorProfileDetailsScreen'; // adjust if your route name differs

export function FeaturedPackagesSection({ navigation }: { navigation: any }) {
  const [packages, setPackages] = useState<FeaturedPackagePublicEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    getActiveFeaturedPackages(10)
      .then((result) => {
        if (!cancelled) setPackages(result);
      })
      .catch(() => {
        // Non-critical section — fail silently rather than breaking the home screen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (packages.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📦 Featured Packages</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.promotionId}
            style={styles.card}
            onPress={() => navigation.navigate(VENDOR_PROFILE_ROUTE, { vendorId: pkg.vendorId, packageId: pkg.packageId })}
          >
            {pkg.coverImage ? (
              <Image source={{ uri: pkg.coverImage }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⭐ Featured</Text>
            </View>
            <Text style={styles.packageName} numberOfLines={1}>
              {pkg.packageName}
            </Text>
            <Text style={styles.vendorName} numberOfLines={1}>
              {pkg.vendorName}
            </Text>
            <Text style={styles.price}>Rs. {pkg.price.toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, paddingHorizontal: 16 },
  row: { paddingHorizontal: 16, gap: 12 },
  card: { width: 160, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  image: { width: '100%', height: 90 },
  imagePlaceholder: { backgroundColor: '#F3F4F6' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.badge, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', color: COLORS.badgeText },
  packageName: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 8, marginHorizontal: 8 },
  vendorName: { fontSize: 11, color: COLORS.muted, marginTop: 2, marginHorizontal: 8 },
  price: { fontSize: 12.5, fontWeight: '700', color: COLORS.primary, marginTop: 4, marginHorizontal: 8, marginBottom: 8 },
});