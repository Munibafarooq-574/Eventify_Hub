import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { currencyOf, currencySymbol } from '@/utils/currency';
import { pricingUnit } from '@/utils/packagePricing';
import type { SponsoredCampaign } from '@/services/getSponsoredCampaigns';

type Props = {
  campaign: SponsoredCampaign;
  onPress: () => void;
  style?: ViewStyle;
};

/**
 * The same campaign creative is used by dashboard and View All.
 * POSTER = untouched image with contain sizing; AUTO = photographic hero and
 * readable information panel. Neither mode changes campaign pricing or analytics.
 */
export default function SponsoredPosterCard({ campaign, onPress, style }: Props) {
  const isPoster = campaign.displayMode === 'POSTER';
  const image = campaign.image || campaign.package?.images?.[0];
  const price = Number(campaign.package?.price || 0);
  const money = `${currencySymbol(currencyOf(campaign))} ${price.toLocaleString(
    currencyOf(campaign) === 'USD' ? 'en-US' : 'en-PK',
    { maximumFractionDigits: 2 },
  )}`;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Sponsored: ${campaign.title}. View offer`}
    >
      {isPoster ? (
        <View style={styles.posterFrame}>
          {image ? (
            <Image source={{ uri: image }} style={styles.posterImage} resizeMode="contain" />
          ) : <View style={styles.imageMissing}><Ionicons name="image-outline" size={26} color="#8A7383" /></View>}
        </View>
      ) : (
        <View style={styles.photoFrame}>
          {image ? (
            <Image source={{ uri: image }} style={styles.photoImage} resizeMode="cover" />
          ) : <View style={styles.imageMissing}><Ionicons name="image-outline" size={26} color="#8A7383" /></View>}
        </View>
      )}

      <View style={[styles.info, isPoster && styles.posterInfo]}>
        <View style={styles.labelRow}>
          <View style={styles.sponsoredPill}>
            <Text style={styles.sponsoredText}>Sponsored</Text>
          </View>
          {!isPoster && !!campaign.offerLabel && (
            <Text style={styles.offerText} numberOfLines={1}>{campaign.offerLabel}</Text>
          )}
        </View>
        {!isPoster && (
          <>
            <Text style={styles.brand} numberOfLines={1}>{campaign.brandName || campaign.vendorName}</Text>
            <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
            <Text style={styles.package} numberOfLines={1}>{campaign.package?.packageName || 'Featured package'}</Text>
          </>
        )}
        <View style={styles.footer}>
          {!isPoster ? (
            <Text style={styles.price} numberOfLines={1}>
              {price > 0 ? money : 'View package'}
              {price > 0 && <Text style={styles.unit}> {pricingUnit(campaign.package || {})}</Text>}
            </Text>
          ) : <Text style={styles.posterBrand} numberOfLines={1}>{campaign.brandName || campaign.vendorName}</Text>}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View Offer</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300, borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#FFFDFB', borderColor: '#EADCE5', borderWidth: 1,
  },
  photoFrame: { height: 160, backgroundColor: '#F3E8EF' },
  photoImage: { width: '100%', height: '100%' },
  posterFrame: { height: 340, backgroundColor: '#F7F0E9' },
  posterImage: { width: '100%', height: '100%' },
  imageMissing: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  info: { paddingHorizontal: 13, paddingTop: 9, paddingBottom: 12 },
  posterInfo: { paddingTop: 10, paddingBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sponsoredPill: { backgroundColor: '#F4E6EF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  sponsoredText: { color: '#6B1E4F', fontSize: 10, fontWeight: '700' },
  offerText: { flex: 1, textAlign: 'right', color: '#7D0C72', fontSize: 10, fontWeight: '700' },
  brand: { marginTop: 5, color: '#806B78', fontSize: 11, fontWeight: '600' },
  title: { color: '#2A1B25', fontSize: 15, lineHeight: 19, fontWeight: '800', marginTop: 2 },
  package: { color: '#756772', fontSize: 11, marginTop: 2 },
  footer: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  price: { color: '#672052', fontSize: 16, fontWeight: '800', flex: 1 },
  unit: { color: '#756772', fontSize: 10, fontWeight: '500' },
  posterBrand: { color: '#35252F', fontSize: 12, fontWeight: '700', flex: 1 },
  cta: { flexDirection: 'row', gap: 5, backgroundColor: '#7D0C72', borderRadius: 20, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 },
  ctaText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
