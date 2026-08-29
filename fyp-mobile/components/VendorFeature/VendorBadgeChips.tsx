import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getEarnedVendorBadges } from '../../services/getEarnedVendorBadges';
import { VendorBadge } from '../../types/badge.types';

const tintColorLight = '#7D0C72';

const COLORS = {
  chipBg: '#F8E9F6',
  chipText: tintColorLight,
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
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  if (badges.length === 0) return null;

  return (
    <View style={styles.row}>
      {badges.map((badge) => (
        <View key={badge.key} style={styles.chip}>
          <Text style={styles.chipEmoji}>{badge.emoji}</Text>
          <Text style={styles.chipText}>{badge.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.chipBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  chipEmoji: {
    fontSize: 15,
  },

  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.chipText,
  },
});