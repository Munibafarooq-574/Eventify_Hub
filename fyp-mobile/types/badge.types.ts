
// fyp-mobile/types/badge.types.ts
//
// Mirrors fyp-backend/src/vendor/growth/badges/badge.types.ts

export enum BadgeKey {
  TOP_RATED = 'topRated',
  FAST_RESPONSE = 'fastResponse',
  POPULAR = 'popular',
  FEATURED = 'featured',
  PREMIUM = 'premium',
}

export interface VendorBadge {
  key: BadgeKey;
  label: string;
  emoji: string;
  earned: boolean;
  howToEarn: string;
}

export interface VendorBadgeSummary {
  vendorId: string;
  earnedBadges: VendorBadge[];
  hasBadges: boolean;
}

