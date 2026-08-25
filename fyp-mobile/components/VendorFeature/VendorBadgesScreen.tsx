// fyp-mobile/components/VendorFeature/VendorBadgesScreen.tsx

// Vendor's own view of all 5 badges.
// Badges are calculated automatically by the backend.
// Nothing is claimable or editable by the vendor.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useLocalSearchParams } from 'expo-router';

import { getVendorBadges } from '../../services/getVendorBadges';
import { VendorBadge } from '../../types/badge.types';

const COLORS = {
  primary: '#7C3AED',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#FAFAFA',
  card: '#FFFFFF',
  earnedBg: '#F3E8FF',
};

export default function VendorBadgesScreen() {
  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const [badges, setBadges] = useState<VendorBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!vendorIdValue) {
      setError('Missing vendorId');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const data = await getVendorBadges(vendorIdValue);

      setBadges(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  }, [vendorIdValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.screenTitle}>
        🏆 Promotional Badges
      </Text>

      <Text style={styles.subtitle}>
        You've earned {earnedCount} of {badges.length} badges.
        Badges are calculated automatically from your real
        performance — they can't be claimed manually.
      </Text>

      {badges.map((badge) => (
        <View
          key={badge.key}
          style={[
            styles.card,
            badge.earned && styles.cardEarned,
          ]}
        >
          <View style={styles.badgeRow}>
            <Text style={styles.badgeEmoji}>
              {badge.emoji}
            </Text>

            <View style={styles.badgeInfo}>
              <Text style={styles.badgeLabel}>
                {badge.label}
              </Text>

              <Text style={styles.badgeExplainer}>
                {badge.howToEarn}
              </Text>
            </View>

            {badge.earned && (
              <View style={styles.earnedTag}>
                <Text style={styles.earnedTagText}>
                  Earned
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  errorText: {
    color: COLORS.muted,
    marginBottom: 12,
  },

  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 16,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    opacity: 0.6,
  },

  cardEarned: {
    opacity: 1,
    borderColor: COLORS.primary,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  badgeEmoji: {
    fontSize: 26,
    marginRight: 12,
  },

  badgeInfo: {
    flex: 1,
  },

  badgeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  badgeExplainer: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 2,
  },

  earnedTag: {
    backgroundColor: COLORS.earnedBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  earnedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
});