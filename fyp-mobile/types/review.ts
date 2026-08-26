//fyp-mobile/types/review.ts
export type ReviewMediaType = 'image' | 'video';

export interface ReviewMedia {
  type: ReviewMediaType;
  url: string;
  thumbnailUrl?: string;
}

export interface VendorReply {
  text: string;
  repliedAt: string; // ISO date string over the wire
}

export interface ReviewUser {
  _id: string;
  name: string;
}

export interface Review {
  _id: string;
  userId: ReviewUser;
  vendorId: string;
  reviewText: string;
  reviewerName?: string;
  rating: number;
  media: ReviewMedia[];
  vendorReply?: VendorReply;
  createdAt: string;
  updatedAt: string;
}

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  reviewsWithMedia: number;
  ratingBreakdown: RatingBreakdown;
}

export interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ReviewListResponse extends ReviewPagination {
  reviews: Review[];
}

export type ReviewSort = 'recent' | 'highest' | 'lowest';

export interface ReviewFilter {
  vendorId: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  withMedia?: boolean;
  sort?: ReviewSort;
  page?: number;
  limit?: number;
}

export interface CreateReviewPayload {
  vendorId: string;
  reviewText: string;
  rating: number;
  media?: ReviewMedia[];
}

export interface ReplyToReviewPayload {
  text: string;
}

export interface ReplyToReviewResponse {
  reviewId: string;
  vendorReply: VendorReply;
}