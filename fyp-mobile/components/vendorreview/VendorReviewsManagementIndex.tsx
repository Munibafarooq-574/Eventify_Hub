import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getSecureData } from '@/store';
import getVendorReviews from '@/services/getAllReviewsForVendor';
import getVendorReviewSummary from '@/services/getVendorReviewSummary';
import replyToReview from '@/services/replyToReview';
import ReviewCard from '@/components/Review/ReviewCard';
import MediaViewerModal from '@/components/Review/MediaViewerModal';
import { Review, ReviewFilter, ReviewMedia, ReviewSort, ReviewSummary } from '@/types/review';

type MediaFilterOption = 'all' | 'withMedia' | 1 | 2 | 3 | 4 | 5;

const sortLabels: Record<ReviewSort, string> = {
  recent: 'Most Recent',
  highest: 'Highest Rating',
  lowest: 'Lowest Rating',
};

const ReplyInput: React.FC<{
  value: string;
  onChangeText: (t: string) => void;
  testID: string;
}> = ({ value, onChangeText, testID }) => (
  <View>
    <TextInput
      testID={testID}
      placeholder="Write your response to this review..."
      placeholderTextColor="#A89AA3"
      multiline
      value={value}
      onChangeText={onChangeText}
      style={styles.replyTextInput}
      maxLength={1000}
      textAlignVertical="top"
    />

    <Text style={styles.characterCount}>
      {value.length}/1000
    </Text>
  </View>
);

const SortModal: React.FC<{
  visible: boolean;
  activeSort: ReviewSort;
  onSelect: (s: ReviewSort) => void;
  onClose: () => void;
}> = ({ visible, activeSort, onSelect, onClose }) => (
  <Modal
    transparent
    animationType="fade"
    visible={visible}
    onRequestClose={onClose}
    testID="vendor-sort-modal"
  >
    <TouchableOpacity
      style={styles.sortModalBackdrop}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.sortModalContent}>
        {(Object.keys(sortLabels) as ReviewSort[]).map((option) => (
          <TouchableOpacity
            key={option}
            testID={`vendor-sort-option-${option}`}
            style={styles.sortOptionRow}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.sortOptionText,
                activeSort === option && styles.sortOptionTextActive,
              ]}
            >
              {sortLabels[option]}
            </Text>

            {activeSort === option && (
              <Ionicons
                name="checkmark"
                size={18}
                color="#7B2869"
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

const VendorReviewsManagementIndex: React.FC = () => {
  const [vendorId, setVendorId] = useState<string | null>(null);

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [activeFilter, setActiveFilter] = useState<MediaFilterOption>('all');
  const [activeSort, setActiveSort] = useState<ReviewSort>('recent');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<ReviewMedia[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchRequestId = useRef(0);

  useEffect(() => {
    const loadVendorId = async () => {
      const user = JSON.parse((await getSecureData('user')) || '{}');
      if (user?._id) setVendorId(user._id);
    };
    loadVendorId();
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!vendorId) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await getVendorReviewSummary(vendorId);
      setSummary(data);
    } catch (error) {
      console.error('Error fetching review summary:', error);
      setSummaryError('Unable to load ratings summary.');
    } finally {
      setSummaryLoading(false);
    }
  }, [vendorId]);

  const buildFilter = (pageNum: number): ReviewFilter => {
    const filter: ReviewFilter = { vendorId: vendorId!, sort: activeSort, page: pageNum, limit: 20 };
    if (activeFilter === 'withMedia') filter.withMedia = true;
    else if (typeof activeFilter === 'number') filter.rating = activeFilter;
    return filter;
  };

  const fetchReviews = useCallback(
    async (resetList: boolean = true) => {
      if (!vendorId) return;
      const requestId = ++fetchRequestId.current;
      if (resetList) setReviewsLoading(true);
      else setLoadingMore(true);
      setReviewsError(null);

      try {
        const pageNum = resetList ? 1 : page + 1;
        const data = await getVendorReviews(buildFilter(pageNum));

        if (requestId !== fetchRequestId.current) return; // stale response

        setReviews((prev) => (resetList ? data.reviews : [...prev, ...data.reviews]));
        setPage(data.page);
        setHasMore(data.hasMore);
      } catch (error) {
        if (requestId !== fetchRequestId.current) return;
        console.error('Error fetching vendor reviews:', error);
        setReviewsError('Something went wrong loading reviews. Please try again.');
      } finally {
        if (requestId === fetchRequestId.current) {
          setReviewsLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [vendorId, activeFilter, activeSort, page]
  );

  useEffect(() => {
    if (vendorId) fetchSummary();
  }, [vendorId, fetchSummary]);

  useEffect(() => {
    if (vendorId) fetchReviews(true);
  }, [vendorId, activeFilter, activeSort]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) fetchReviews(false);
  };

  const openMediaViewer = (review: Review, index: number) => {
    setViewerMedia(review.media);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const startReply = (reviewId: string) => {
    setReplyingTo(reviewId);
    setReplyText('');
    setReplyError(null);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
    setReplyError(null);
  };

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      setReplyError('Reply cannot be empty.');
      return;
    }
    setSubmittingReply(true);
    setReplyError(null);
    try {
      const result = await replyToReview(reviewId, { text: replyText.trim() });
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, vendorReply: result.vendorReply } : r))
      );
      setReplyingTo(null);
      setReplyText('');
    } catch (error: any) {
      console.error('Error submitting reply:', error);
      const status = error?.response?.status;
      if (status === 403) {
        setReplyError('You are not authorized to reply to this review.');
      } else if (status === 404) {
        setReplyError('This review no longer exists.');
      } else {
        setReplyError('Failed to submit reply. Please try again.');
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  if (!vendorId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7B2869" testID="vendor-id-loading" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reviews & Ratings</Text>
        <View style={{ width: 40 }} />
      </View>

      {summaryLoading ? (
        <View style={styles.summaryLoadingBox}>
          <ActivityIndicator size="small" color="#7B2869" />
        </View>
      ) : summaryError ? (
        <View style={styles.errorStateBox} testID="summary-error-state">
          <Text style={styles.errorStateText}>{summaryError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSummary} testID="retry-summary-button">
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : summary ? (
        <View style={styles.summaryCard} testID="vendor-summary-card">
          <Text style={styles.summaryLabel}>Average Rating</Text>
          <View style={styles.summaryTopRow}>
            <Text style={styles.averageRatingText}>
              {summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : '0.0'}
            </Text>
            <View style={{ flexDirection: 'row', marginLeft: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={summary.averageRating >= star ? 'star' : 'star-outline'}
                  size={16}
                  color="#FFD700"
                />
              ))}
            </View>
          </View>
          <Text style={styles.summaryLabel}>Total Reviews</Text>
          <Text testID="vendor-total-reviews" style={styles.totalReviewsText}>{summary.totalReviews}</Text>
        </View>
      ) : null}

      {!summaryLoading && !summaryError && summary?.totalReviews === 0 && (
        <View style={styles.emptyStateBox} testID="vendor-no-reviews">
          <Text style={styles.emptyStateTitle}>No reviews yet</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll} testID="vendor-filter-chips">
        {([
          { key: 'all', label: 'All' },
          { key: 5, label: '5 Star' },
          { key: 4, label: '4 Star' },
          { key: 3, label: '3 Star' },
          { key: 2, label: '2 Star' },
          { key: 1, label: '1 Star' },
          { key: 'withMedia', label: 'With Images/Videos' },
        ] as { key: MediaFilterOption; label: string }[]).map((chip) => (
          <TouchableOpacity
            key={String(chip.key)}
            testID={`vendor-filter-chip-${chip.key}`}
            style={[styles.filterChip, activeFilter === chip.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(chip.key)}
          >
            <Text style={[styles.filterChipText, activeFilter === chip.key && styles.filterChipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity testID="vendor-sort-trigger" style={styles.sortByRow} onPress={() => setSortModalVisible(true)}>
        <Text style={styles.sortByLabel}>Sort By: <Text style={styles.sortByValue}>{sortLabels[activeSort]}</Text></Text>
        <Ionicons name="chevron-down" size={16} color="#7A7A7A" />
      </TouchableOpacity>

      {reviewsLoading && (
        <View style={styles.reviewsLoadingBox} testID="vendor-reviews-loading">
          <ActivityIndicator size="small" color="#7B2869" />
        </View>
      )}

      {reviewsError && !reviewsLoading && (
        <View style={styles.errorStateBox} testID="reviews-error-state">
          <Ionicons name="cloud-offline-outline" size={28} color="#C0392B" />
          <Text style={styles.errorStateText}>{reviewsError}</Text>
          <TouchableOpacity testID="retry-reviews-button" style={styles.retryButton} onPress={() => fetchReviews(true)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!reviewsLoading && !reviewsError && reviews.length === 0 && summary && summary.totalReviews > 0 && (
        <View style={styles.emptyStateBox} testID="vendor-no-filtered-reviews">
          <Text style={styles.emptyStateTitle}>
            {activeFilter === 'withMedia' ? 'No reviews with images or videos yet.' : 'No reviews found'}
          </Text>
          {activeFilter !== 'withMedia' && (
            <Text style={styles.emptyStateSubtitle}>There are no reviews matching this filter.</Text>
          )}
        </View>
      )}

      {reviews.map((review) => (
  <ReviewCard
    key={review._id}
    review={review}
    onMediaPress={(media, index) =>
      openMediaViewer(review, index)
    }
    footer={
      !review.vendorReply ? (
        <TouchableOpacity
          testID={`reply-trigger-${review._id}`}
          style={styles.replyTriggerButton}
          onPress={() => startReply(review._id)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubble-outline"
            size={15}
            color="#7B2869"
          />

          <Text style={styles.replyTriggerText}>
            Reply to Review
          </Text>
        </TouchableOpacity>
      ) : null
    }
  />
))}

      {!reviewsLoading && reviews.length > 0 && hasMore && (
        <TouchableOpacity
          testID="vendor-load-more"
          style={styles.loadMoreButton}
          onPress={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? <ActivityIndicator size="small" color="#7B2869" /> : <Text style={styles.loadMoreButtonText}>Load More</Text>}
        </TouchableOpacity>
      )}

      <SortModal
        visible={sortModalVisible}
        activeSort={activeSort}
        onSelect={(s) => { setActiveSort(s); setSortModalVisible(false); }}
        onClose={() => setSortModalVisible(false)}
      />

      <Modal
  visible={replyingTo !== null}
  transparent
  animationType="fade"
  onRequestClose={cancelReply}
  testID="vendor-reply-modal"
>
  <View style={styles.replyModalOverlay}>
    <View style={styles.replyModalContent}>

      {/* Header */}
      <View style={styles.replyModalHeader}>
        <View style={styles.replyModalTitleRow}>
          <View style={styles.replyModalIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#7B2869"
            />
          </View>

          <View>
            <Text style={styles.replyModalTitle}>
              Reply to Review
            </Text>

            <Text style={styles.replyModalSubtitle}>
              Respond professionally to your customer
            </Text>
          </View>
        </View>

        <TouchableOpacity
          testID="reply-modal-close"
          onPress={cancelReply}
          disabled={submittingReply}
          style={styles.replyCloseButton}
        >
          <Ionicons
            name="close"
            size={22}
            color="#7A7A7A"
          />
        </TouchableOpacity>
      </View>

      {/* Input */}
      <View style={styles.replyInputSection}>
        <Text style={styles.replyInputLabel}>
          Your Response
        </Text>

        <ReplyInput
          value={replyText}
          onChangeText={setReplyText}
          testID="reply-input"
        />
      </View>

      {/* Error */}
      {replyError && (
        <View
          style={styles.replyErrorBox}
          testID="reply-error"
        >
          <Ionicons
            name="alert-circle-outline"
            size={17}
            color="#C0392B"
          />

          <Text style={styles.replyErrorText}>
            {replyError}
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.replyModalActions}>

        <TouchableOpacity
          testID="reply-cancel"
          style={styles.replyCancelButton}
          onPress={cancelReply}
          disabled={submittingReply}
          activeOpacity={0.8}
        >
          <Text style={styles.replyCancelText}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="reply-submit"
          style={[
            styles.replySubmitButton,
            submittingReply && styles.replySubmitButtonDisabled,
          ]}
          onPress={() => {
            if (replyingTo) {
              submitReply(replyingTo);
            }
          }}
          disabled={submittingReply}
          activeOpacity={0.8}
        >
          {submittingReply ? (
            <ActivityIndicator
              size="small"
              color="#fff"
            />
          ) : (
            <>
              <Ionicons
                name="send"
                size={15}
                color="#fff"
              />

              <Text style={styles.replySubmitText}>
                Send Reply
              </Text>
            </>
          )}
        </TouchableOpacity>

      </View>

    </View>
  </View>
</Modal>

      <MediaViewerModal
        visible={viewerVisible}
        media={viewerMedia}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8EAF2', paddingTop: 50 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  backText: { fontSize: 16, color: '#780C60' },
  title: { fontSize: 18, fontWeight: 'bold' },
  summaryLoadingBox: { paddingVertical: 24, alignItems: 'center' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  summaryLabel: { fontSize: 12, color: '#7A7A7A', marginTop: 8 },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center' },
  averageRatingText: { fontSize: 24, fontWeight: 'bold', color: '#7B2869' },
  totalReviewsText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  emptyStateBox: { padding: 24, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 12 },
  emptyStateTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  emptyStateSubtitle: { fontSize: 12, color: '#7A7A7A', marginTop: 4, textAlign: 'center' },
  errorStateBox: { padding: 20, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 12 },
  errorStateText: { fontSize: 13, color: '#7A7A7A', textAlign: 'center', marginTop: 8, marginBottom: 10 },
  retryButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#7B2869' },
  retryButtonText: { color: '#7B2869', fontWeight: 'bold', fontSize: 13 },
  filterChipsScroll: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#fff', marginRight: 8 },
  filterChipActive: { backgroundColor: '#7B2869', borderColor: '#7B2869' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#7A7A7A' },
  filterChipTextActive: { color: '#fff' },
  sortByRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
  sortByLabel: { fontSize: 13, color: '#7A7A7A', marginRight: 4 },
  sortByValue: { color: '#7B2869', fontWeight: 'bold' },
  sortModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sortModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingVertical: 8, paddingHorizontal: 16 },
  sortOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sortOptionText: { fontSize: 15, color: '#333' },
  sortOptionTextActive: { color: '#7B2869', fontWeight: 'bold' },
  reviewsLoadingBox: { paddingVertical: 20, alignItems: 'center' },
  loadMoreButton: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: '#7B2869', marginVertical: 16, minWidth: 120, alignItems: 'center' },
  loadMoreButtonText: { color: '#7B2869', fontWeight: 'bold', fontSize: 13 },
 replyTriggerButton: {
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 6,
  paddingVertical: 9,
  paddingHorizontal: 15,
  borderRadius: 20,
  backgroundColor: '#F8EAF2',
  borderWidth: 1,
  borderColor: '#E8CADD',
},

replyTriggerText: {
  color: '#7B2869',
  fontWeight: '700',
  fontSize: 12,
  marginLeft: 6,
},

/* Reply Modal */

replyModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(43, 27, 38, 0.55)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
},

replyModalContent: {
  width: '100%',
  backgroundColor: '#fff',
  borderRadius: 18,
  padding: 20,
  elevation: 8,
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 15,
  shadowOffset: {
    width: 0,
    height: 6,
  },
},

replyModalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 20,
},

replyModalTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},

replyModalIcon: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: '#F8EAF2',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 11,
},

replyModalTitle: {
  fontSize: 17,
  fontWeight: '800',
  color: '#2B1B26',
},

replyModalSubtitle: {
  fontSize: 11,
  color: '#8A7A85',
  marginTop: 3,
},

replyCloseButton: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#F7F3F5',
  justifyContent: 'center',
  alignItems: 'center',
},

replyInputSection: {
  marginBottom: 10,
},

replyInputLabel: {
  fontSize: 12,
  fontWeight: '700',
  color: '#2B1B26',
  marginBottom: 7,
},

replyTextInput: {
  borderWidth: 1,
  borderColor: '#E2D6DE',
  borderRadius: 12,
  paddingHorizontal: 13,
  paddingTop: 12,
  paddingBottom: 10,
  minHeight: 120,
  backgroundColor: '#FCFAFB',
  fontSize: 14,
  color: '#2B1B26',
  textAlignVertical: 'top',
},

characterCount: {
  fontSize: 10,
  color: '#9A8D96',
  textAlign: 'right',
  marginTop: 5,
},

replyErrorBox: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FDEDEC',
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
  marginTop: 5,
},

replyErrorText: {
  color: '#C0392B',
  fontSize: 11,
  marginLeft: 6,
  flex: 1,
},

replyModalActions: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  marginTop: 18,
},

replyCancelButton: {
  paddingVertical: 11,
  paddingHorizontal: 18,
  borderRadius: 10,
  marginRight: 8,
  backgroundColor: '#F5F1F3',
},

replyCancelText: {
  color: '#6F626B',
  fontSize: 13,
  fontWeight: '700',
},

replySubmitButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#7B2869',
  paddingVertical: 11,
  paddingHorizontal: 18,
  borderRadius: 10,
  minWidth: 110,
},

replySubmitButtonDisabled: {
  opacity: 0.7,
},

replySubmitText: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '700',
  marginLeft: 6,
},
});

export default VendorReviewsManagementIndex;