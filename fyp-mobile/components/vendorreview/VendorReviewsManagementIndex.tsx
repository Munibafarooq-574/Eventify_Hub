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

const ReplyInput: React.FC<{ value: string; onChangeText: (t: string) => void; testID: string }> = ({
  value,
  onChangeText,
  testID,
}) => (
  <TextInput
    testID={testID}
    placeholder="Thank you for your feedback..."
    multiline
    value={value}
    onChangeText={onChangeText}
    style={styles.replyTextInput}
    maxLength={1000}
  />
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
          onMediaPress={(media, index) => openMediaViewer(review, index)}
          footer={
            review.vendorReply ? null : replyingTo === review._id ? (
              <View style={styles.replyBox} testID={`reply-box-${review._id}`}>
                <Text style={styles.replyBoxLabel}>Reply to review</Text>
                <ReplyInput value={replyText} onChangeText={setReplyText} testID={`reply-input-${review._id}`} />
                {replyError && (
                  <Text style={styles.replyErrorText} testID={`reply-error-${review._id}`}>
                    {replyError}
                  </Text>
                )}
                <View style={styles.replyActionsRow}>
                  <TouchableOpacity
                    testID={`reply-cancel-${review._id}`}
                    style={styles.replyCancelButton}
                    onPress={cancelReply}
                    disabled={submittingReply}
                  >
                    <Text style={styles.replyCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`reply-submit-${review._id}`}
                    style={styles.replySubmitButton}
                    onPress={() => submitReply(review._id)}
                    disabled={submittingReply}
                  >
                    {submittingReply ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.replySubmitText}>Reply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                testID={`reply-trigger-${review._id}`}
                style={styles.replyTriggerButton}
                onPress={() => startReply(review._id)}
              >
                <Text style={styles.replyTriggerText}>Reply</Text>
              </TouchableOpacity>
            )
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
  replyTriggerButton: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#F8EAF2' },
  replyTriggerText: { color: '#7B2869', fontWeight: 'bold', fontSize: 12 },
  replyBox: { marginTop: 8, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  replyBoxLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  replyTextInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, minHeight: 60, backgroundColor: '#fff', textAlignVertical: 'top', fontSize: 13 },
  replyErrorText: { color: '#C0392B', fontSize: 11, marginTop: 4 },
  replyActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  replyCancelButton: { paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  replyCancelText: { color: '#7A7A7A', fontSize: 13, fontWeight: '600' },
  replySubmitButton: { backgroundColor: '#7B2869', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, minWidth: 60, alignItems: 'center' },
  replySubmitText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});

export default VendorReviewsManagementIndex;