//fyp-mobile/components/Review/ReviewCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review, ReviewMedia } from '@/types/review';

interface ReviewCardProps {
  review: Review;
  onMediaPress?: (media: ReviewMedia, index: number) => void;
  footer?: React.ReactNode; // Phase 10 will pass a Reply button/section here for the vendor screen
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, onMediaPress, footer }) => {
  const reviewerName = review.userId?.name || review.reviewerName || 'Anonymous';

  return (
    <View style={styles.card} testID="review-card">
      <View style={styles.headerRow}>
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>
            {reviewerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewerName}>{reviewerName}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={review.rating >= star ? 'star' : 'star-outline'}
            size={15}
            color="#FFD700"
          />
        ))}
      </View>

      <Text style={styles.reviewText}>{review.reviewText}</Text>

      {review.media && review.media.length > 0 && (
        <View style={styles.mediaRow} testID="review-media-row">
          {review.media.map((item, index) => (
            <TouchableOpacity
              key={index}
              testID={`review-media-${item.type}-${index}`}
              onPress={() => onMediaPress?.(item, index)}
              style={styles.mediaThumbWrapper}
            >
              <Image
                source={{ uri: item.thumbnailUrl || item.url }}
                style={styles.mediaThumb}
                onError={() => {}} // broken media handled by fallback below via ImageWithFallback if needed
              />
              {item.type === 'video' && (
                <View style={styles.videoPlayOverlay}>
                  <Ionicons name="play-circle" size={28} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {review.vendorReply && (
        <View style={styles.vendorReplyBox} testID="vendor-reply-box">
          <Text style={styles.vendorReplyLabel}>Vendor Response</Text>
          <Text style={styles.vendorReplyText}>{review.vendorReply.text}</Text>
        </View>
      )}

      {footer}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7B2869',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewDate: {
    fontSize: 11,
    color: '#7A7A7A',
    marginTop: 1,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 10,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  mediaThumbWrapper: {
    marginRight: 8,
    marginBottom: 8,
  },
  mediaThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
  },
  vendorReplyBox: {
    backgroundColor: '#F8EAF2',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#7B2869',
  },
  vendorReplyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7B2869',
    marginBottom: 3,
  },
  vendorReplyText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
});

export default ReviewCard;