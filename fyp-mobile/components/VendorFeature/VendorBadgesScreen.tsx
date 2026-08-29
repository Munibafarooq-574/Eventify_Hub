// fyp-mobile/components/VendorFeature/VendorBadgesScreen.tsx

// Vendor's own view of all 5 badges.
// Badges are calculated automatically by the backend.
// Nothing is claimable or editable by the vendor.
//
// TODO — UI-only redesign, no service/data changes:
//   - `badge.emoji` (from the API) is no longer rendered directly. Instead
//     we pick a lucide-react-native icon based on `badge.key`, so badges
//     render as flat, theme-colored icons instead of the phone's emoji
//     font. The heuristic in `getBadgeIcon` below covers the badge keys
//     mentioned in the product spec (top rated / fast response / rising /
//     most booked / verified) with a sensible fallback (Award) for any
//     other key — nothing about the actual badge data changes.
//   - Uses react-native-safe-area-context for the header (already a peer
//     dependency of expo-router, so it should already be installed).
//     npm install lucide-react-native react-native-svg

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';

import { getVendorBadges } from '../../services/getVendorBadges';
import { VendorBadge } from '../../types/badge.types';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already (e.g. src/theme/colors.ts).
// Brand color (used only for header + earned accents, as requested):
const tintColorLight = '#7D0C72';
const tintColorDark = '#7D0C72';

const COLORS = {
  primary: tintColorLight,
  primaryDark: '#57084F',
  primaryLight: '#F8E9F6',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#ECE7EA',
  background: '#FAF7F9',
  card: '#FFFFFF',
  locked: '#9CA3AF',
  lockedBg: '#F3F4F6',
};


export default function VendorBadgesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  const Header = () => (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 40,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronLeft
          size={22}
          color="#FFFFFF"
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>
          Promotional Badges
        </Text>

        <Text style={styles.headerSubtitle}>
          Earned automatically from your performance
        </Text>
      </View>

      {/* Empty space keeps the title perfectly centered */}
      <View style={styles.headerIconBtnPlaceholder} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressCard}>
          <View style={styles.progressTextWrap}>
            <Text style={styles.progressCount}>
              {earnedCount}
              <Text style={styles.progressCountTotal}> / {badges.length}</Text>
            </Text>
            <Text style={styles.progressLabel}>badges earned</Text>
          </View>
          <Text style={styles.progressNote}>
            Calculated automatically from your real performance — badges can't be claimed manually.
          </Text>
        </View>

        {badges.map((badge) => {
          
          return (
            <View key={badge.key} style={[styles.card, badge.earned && styles.cardEarned]}>
              <View style={styles.badgeRow}>
                <View
  style={[
    styles.badgeIconBadge,
    badge.earned
      ? styles.badgeIconBadgeEarned
      : styles.badgeIconBadgeLocked,
  ]}
>
  <Text
    style={[
      styles.badgeEmoji,
      !badge.earned && styles.badgeEmojiLocked,
    ]}
  >
    {badge.emoji}
  </Text>
</View>

                <View style={styles.badgeInfo}>
                  <Text style={[styles.badgeLabel, !badge.earned && styles.badgeLabelLocked]}>{badge.label}</Text>
                  <Text style={styles.badgeExplainer}>{badge.howToEarn}</Text>
                </View>

                {badge.earned ? (
                  <View style={styles.earnedTag}>
                    <CheckCircle2 size={12} color={COLORS.primary} strokeWidth={2.5} />
                    <Text style={styles.earnedTagText}>Earned</Text>
                  </View>
                ) : (
                  <Lock size={15} color={COLORS.locked} strokeWidth={2} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 18,
  },

  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerIconBtnPlaceholder: {
    width: 40,
    height: 40,
  },

  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textAlign: 'center',
  },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  progressCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  progressTextWrap: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  progressCount: { fontSize: 26, fontWeight: '800', color: COLORS.primaryDark },
  progressCountTotal: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark, opacity: 0.6 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: COLORS.primaryDark, marginLeft: 8 },
  progressNote: { fontSize: 12, color: COLORS.primaryDark, opacity: 0.75, lineHeight: 16.5 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    opacity: 0.7,
  },
  cardEarned: {
    opacity: 1,
    borderColor: COLORS.primary,
  },

  badgeRow: { flexDirection: 'row', alignItems: 'center' },

badgeIconBadge: {
  width: 52,
  height: 52,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 13,
},
badgeEmoji: {
  fontSize: 26,
},

badgeEmojiLocked: {
  opacity: 0.45,
},
  badgeIconBadgeEarned: { backgroundColor: COLORS.primaryLight },
  badgeIconBadgeLocked: { backgroundColor: COLORS.lockedBg },

  badgeInfo: { flex: 1 },
  badgeLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  badgeLabelLocked: { color: COLORS.muted },
  badgeExplainer: { fontSize: 12.5, color: COLORS.muted, marginTop: 2 },

  earnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  earnedTagText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});