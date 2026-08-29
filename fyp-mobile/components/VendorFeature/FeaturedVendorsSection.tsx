// fyp-mobile/components/VendotFeature/FeaturedVendorsSection.tsx
//
// Self-contained, drop-in component for your HomeScreen — fetches
// currently-active Featured Vendor campaigns and renders a horizontal
// scroll of cards. I don't have HomeScreen.tsx's contents, so instead of
// guessing at its layout, this is designed to be pasted in as one line:
//
//   import { FeaturedVendorsSection } from '../../components/FeaturedVendorsSection';
//   ...
//   <FeaturedVendorsSection navigation={navigation} />
//
// Renders nothing (no layout shift) if no vendor is currently featured.
// Assumes a 'VendorProfileDetailsScreen' route taking a `vendorId` param
// — adjust the route name below if yours differs.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { getActiveFeaturedVendors } from '../../services/getActiveFeaturedVendors';
import { FeaturedVendorPublicEntry } from '../../types/promotion.types';

const COLORS = {
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  card: '#FFFFFF',
  badge: '#FEF3C7',
  badgeText: '#92400E',
};

const VENDOR_PROFILE_ROUTE = 'VendorProfileDetailsScreen'; // adjust if your route name differs

export function FeaturedVendorsSection({ navigation }: { navigation: any }) {
  const [vendors, setVendors] = useState<FeaturedVendorPublicEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    getActiveFeaturedVendors(10)
      .then((result) => {
        if (!cancelled) setVendors(result);
      })
      .catch(() => {
        // Non-critical section — fail silently rather than breaking the home screen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (vendors.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>⭐ Featured Vendors</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {vendors.map((vendor) => (
          <TouchableOpacity
            key={vendor.promotionId}
            style={styles.card}
            onPress={() => navigation.navigate(VENDOR_PROFILE_ROUTE, { vendorId: vendor.vendorId })}
          >
            {vendor.coverImage ? (
              <Image source={{ uri: vendor.coverImage }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⭐ Featured</Text>
            </View>
            <Text style={styles.vendorName} numberOfLines={1}>
              {vendor.vendorName}
            </Text>
            {vendor.businessCategoryName && (
              <Text style={styles.vendorMeta} numberOfLines={1}>
                {vendor.businessCategoryName}
                {vendor.city ? ` · ${vendor.city}` : ''}
              </Text>
            )}
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
  card: { width: 150, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  image: { width: '100%', height: 90 },
  imagePlaceholder: { backgroundColor: '#F3F4F6' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.badge, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', color: COLORS.badgeText },
  vendorName: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 8, marginHorizontal: 8 },
  vendorMeta: { fontSize: 11, color: COLORS.muted, marginTop: 2, marginHorizontal: 8, marginBottom: 8 },
});