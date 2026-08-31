//fyp-backend/src/vendor/growth/badges/badge.types.ts

export enum BadgeKey {
  TOP_RATED = 'topRated',
  FAST_RESPONSE = 'fastResponse',
  POPULAR = 'popular',
  FEATURED = 'featured',
  PREMIUM = 'premium',
}

export interface BadgeDefinition {
  key: BadgeKey;
  label: string;
  emoji: string;
  // Short explanation shown to the vendor so they understand what to do
  // to earn it — never editable/claimable by them directly.
  howToEarn: string;
}

export const BADGE_DEFINITIONS: Record<BadgeKey, BadgeDefinition> = {
  [BadgeKey.TOP_RATED]: {
    key: BadgeKey.TOP_RATED,
    label: 'Top Rated',
    emoji: '🏆',
    howToEarn: 'Maintain a high average rating across enough reviews.',
  },
  [BadgeKey.FAST_RESPONSE]: {
    key: BadgeKey.FAST_RESPONSE,
    label: 'Fast Response',
    emoji: '⚡',
    howToEarn: 'Reply to customer messages quickly, on average.',
  },
  [BadgeKey.POPULAR]: {
    key: BadgeKey.POPULAR,
    label: 'Popular',
    emoji: '🔥',
    howToEarn: 'Serve enough distinct customers over time.',
  },
  [BadgeKey.FEATURED]: {
    key: BadgeKey.FEATURED,
    label: 'Featured',
    emoji: '⭐',
    howToEarn: 'Have an active Featured Vendor campaign (Growth/Premium).',
  },
  [BadgeKey.PREMIUM]: {
    key: BadgeKey.PREMIUM,
    label: 'Premium',
    emoji: '💎',
    howToEarn: 'Be subscribed to the Premium plan.',
  },
};

export interface VendorBadgeResult {
  key: BadgeKey;
  label: string;
  emoji: string;
  earned: boolean;
  howToEarn: string;
}

//add new
export interface VendorBadgeSummary {
  vendorId: string;
  earnedBadges: VendorBadgeResult[];
  hasBadges: boolean;
}