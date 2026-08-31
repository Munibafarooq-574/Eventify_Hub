// fyp-mobile/components/vendorprofiledetails/VendorBadgesSection.tsx — NEW FILE
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getVendorBadges } from '../../services/getVendorBadges';
import { VendorBadge } from '../../types/badge.types';

const COLORS = {
  primary: '#7D0C72',
  primaryLight: '#F8E9F6',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#ECE7EA',
  locked: '#9CA3AF',
  lockedBg: '#F3F4F6',
};

export default function VendorBadgesSection({ vendorId }: { vendorId: string }) {
  const [badges, setBadges] = useState<VendorBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!vendorId) { setLoading(false); return; }

    getVendorBadges(vendorId)
      .then((data) => { if (!cancelled) setBadges(data); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Failed to load badges'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [vendorId]);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return <Text style={styles.errorText}>Badges unavailable right now.</Text>;
  }

  const earnedCount = badges.filter((b) => b.earned).length;

  if (badges.length === 0) {
    return null; // no badge system configured — don't show an empty section
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Badges ({earnedCount}/{badges.length})</Text>
      {badges.map((badge) => (
        <View key={badge.key} style={[styles.row, badge.earned && styles.rowEarned]}>
          <View style={[styles.iconWrap, badge.earned ? styles.iconEarned : styles.iconLocked]}>
            <Text style={{ fontSize: 20, opacity: badge.earned ? 1 : 0.4 }}>{badge.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, !badge.earned && styles.labelLocked]}>{badge.label}</Text>
            <Text style={styles.howTo}>{badge.howToEarn}</Text>
          </View>
          {badge.earned && <Text style={styles.earnedTag}>Earned</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  loadingRow: { paddingVertical: 12, alignItems: 'center' },
  errorText: { fontSize: 12.5, color: COLORS.muted },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginBottom: 8, opacity: 0.75,
  },
  rowEarned: { opacity: 1, borderColor: COLORS.primary },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  iconEarned: { backgroundColor: COLORS.primaryLight },
  iconLocked: { backgroundColor: COLORS.lockedBg },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  labelLocked: { color: COLORS.muted },
  howTo: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  earnedTag: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});