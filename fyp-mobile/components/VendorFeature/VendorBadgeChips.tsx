// fyp-mobile/components/VendorFeature/VendorBadgeChips.tsx
// Self-contained, drop-in component: fetches this vendor's EARNED badges
// and renders a compact chip row. Designed to be pasted into your
// existing VendorProfileDetailsScreen.tsx and vendor card components
// without needing to plumb badge data through their existing props —
// I don't have those files' contents, so I couldn't safely edit them
// directly. Usage:
//
//   import { VendorBadgeChips } from '../../components/VendorBadgeChips';
//   ...
//   <VendorBadgeChips vendorId={vendor._id} />
//
// Renders nothing (no layout shift) if the vendor has no badges yet.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getEarnedVendorBadges } from '../../services/getEarnedVendorBadges';
import { VendorBadge } from '../../types/badge.types';

const COLORS = {
  chipBg: '#F3E8FF',
  chipText: '#6D28D9',
};

export function VendorBadgeChips({ vendorId }: { vendorId: string }) {
  const [badges, setBadges] = useState<VendorBadge[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!vendorId) return;
    getEarnedVendorBadges(vendorId)
      .then((result) => {
        if (!cancelled) setBadges(result);
      })
      .catch(() => {
        // Badges are a nice-to-have on a profile — fail silently rather
        // than showing an error on someone else's screen.
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  if (badges.length === 0) return null;

  return (
    <View style={styles.row}>
      {badges.map((badge) => (
        <View key={badge.key} style={styles.chip}>
          <Text style={styles.chipText}>
            {badge.emoji} {badge.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: COLORS.chipBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.chipText },
});