
// fyp-mobile/components/vendorprofiledetails/VendorBadgesSection.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { getVendorBadges } from '../../services/getVendorBadges';
import { VendorBadge } from '../../types/badge.types';

const COLORS = {
  primary: '#7D0C72',
  primaryLight: '#F8E9F6',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#ECE7EA',
};

export default function VendorBadgesSection({
  vendorId,
}: {
  vendorId: string;
}) {
  const [badges, setBadges] = useState<VendorBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!vendorId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getVendorBadges(vendorId)
      .then((data) => {
        if (!cancelled) {
          setBadges(data || []);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Failed to load vendor badges:', e);
          setError(e?.message || 'Failed to load badges');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
        />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <Text style={styles.errorText}>
        Badges unavailable right now.
      </Text>
    );
  }

  // Only earned badges are shown.
  const earnedBadges = badges.filter(
    (badge) => badge.earned === true
  );

  // If no badges are earned, show nothing.
  if (earnedBadges.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>
        Badges ({earnedBadges.length})
      </Text>

      <View style={styles.badgesContainer}>
        {earnedBadges.map((badge) => (
          <View
            key={badge.key}
            style={styles.badgeItem}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.badgeEmoji}>
                {badge.emoji}
              </Text>
            </View>

            <Text style={styles.label}>
              {badge.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 8,
  },

  loadingRow: {
    paddingVertical: 8,
    alignItems: 'center',
  },

  errorText: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },

  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    marginRight: 6,
  },

  badgeEmoji: {
    fontSize: 17,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
});

