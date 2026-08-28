//orgainzer side detail section 

//fyp-mobile/components/vendorprofiledetails/VendorProfileDetailsIndex.tsx
import getVendorReviews from '@/services/getAllReviewsForVendor';
import postVendorReview from '@/services/postVendorReview';
import { uploadMultipleImages } from '@/services/uploadMultipleImages';
import { getUserData, saveSecureData,getSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useGlobalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import ReviewCard from '@/components/Review/ReviewCard';
import MediaViewerModal from '@/components/Review/MediaViewerModal';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Review,
  ReviewFilter,
  ReviewMedia,
  ReviewSort,
} from "@/types/review";
import Toast from 'react-native-toast-message';


const VendorDetailsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Details' | 'Packages' | 'Reviews'>('Details');
  const [activePackage, setActivePackage] = useState<number | null>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<'Eventify' | 'Google'>('Eventify');
  const [vendorData, setVendorData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { id } = useGlobalSearchParams();

  const [rating, setRating] = useState<number | null>(null);

const [newReview, setNewReview] = useState('');
const scrollViewRef = useRef<ScrollView>(null);


const [selectedMedia, setSelectedMedia] = useState<ReviewMedia[]>([]);
const [uploadingMedia, setUploadingMedia] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [viewerVisible, setViewerVisible] = useState(false);
const [viewerMedia, setViewerMedia] = useState<ReviewMedia[]>([]);
const [viewerIndex, setViewerIndex] = useState(0);

const handlePickMedia = async () => {

    const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
        alert('Permission to access media library is required.');
        return;
    }

    const result =
        await ImagePicker.launchImageLibraryAsync({

            mediaTypes: ['images', 'videos'],

            allowsMultipleSelection: true,

            quality: 0.7,
        });

    if (result.canceled || !result.assets?.length) {
        return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);

    try {

      const user = await getUserData();

if (!user) {
    throw new Error('User data not found');
}

const userId = user?._id;

if (!userId) {
    throw new Error('User ID missing');
}

        const uploadAssets = result.assets.map(
            (asset, index) => {

                const isVideo = asset.type === 'video';

                let extension = isVideo
                    ? 'mp4'
                    : 'jpg';

                if (asset.fileName) {

                    const parts =
                        asset.fileName.split('.');

                    if (parts.length > 1) {

                        extension =
                            parts[
                                parts.length - 1
                            ].toLowerCase();
                    }
                }

                const mimeType =
                    asset.mimeType ||
                    (
                        isVideo
                            ? 'video/mp4'
                            : 'image/jpeg'
                    );

                return {

                    uri: asset.uri,

                    name:
                        asset.fileName ||
                        `${isVideo ? 'video' : 'photo'}_${Date.now()}_${index}.${extension}`,

                    type: mimeType,
                };
            },
        );

        console.log(
            'Uploading media:',
            uploadAssets.map((item) => ({
                name: item.name,
                type: item.type,
            })),
        );

        const uploadedUrls = await uploadMultipleImages(
  userId,
  uploadAssets,
  (progress) => {
    setUploadProgress(progress);
  },
);

        const uploadedMedia: ReviewMedia[] =
            uploadedUrls.map(
                (url, index) => ({

                    type:
                        result.assets[index]?.type === 'video'
                            ? 'video'
                            : 'image',

                    url,

                    thumbnailUrl:
                        result.assets[index]?.type === 'video'
                            ? undefined
                            : url,
                }),
            );

        setSelectedMedia((prev) => [
            ...prev,
            ...uploadedMedia,
        ]);

    } catch (error: any) {

        console.error(
            'Error uploading media:',
            error?.response?.data ||
            error?.message ||
            error,
        );

        alert(
            error?.response?.data?.message ||
            'Failed to upload media. Please try again.',
        );

    } finally {
  setUploadingMedia(false);

  // Keep 100% visible briefly before resetting
  setUploadProgress(100);

  setTimeout(() => {
    setUploadProgress(0);
  }, 500);
}
};



const removeSelectedMedia = (index: number) => {
  setSelectedMedia((prev) =>
    prev.filter((_, i) => i !== index)
  );
};
const openMediaViewer = (review: Review, index: number) => {
  if (!review.media || review.media.length === 0) {
    return;
  }

  setViewerMedia(review.media);
  setViewerIndex(index);
  setViewerVisible(true);
};
const [reviews, setReviews] = useState<Review[]>([]);
const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
const [loadingMore, setLoadingMore] = useState<boolean>(false);
const [reviewsError, setReviewsError] = useState<string | null>(null);

const [activeFilter, setActiveFilter] =
  useState<ReviewFilter['rating'] | 'all' | 'withMedia'>('all');

const [activeSort, setActiveSort] =
  useState<ReviewSort>('recent');

const [reviewsPage, setReviewsPage] = useState<number>(1);
const [hasMoreReviews, setHasMoreReviews] = useState<boolean>(true);

const REVIEWS_LIMIT = 20;

const fetchReviews = async (
  page: number = 1,
  append: boolean = false
) => {
  if (!vendorData?._id) {
    return;
  }

  if (append) {
    setLoadingMore(true);
  } else {
    setReviewsLoading(true);
  }

  setReviewsError(null);

  try {
    console.log('Fetching reviews for vendor:', vendorData._id);

   const data = await getVendorReviews({
  vendorId: vendorData._id,
  page,
  limit: REVIEWS_LIMIT,
  rating:
    typeof activeFilter === 'number'
      ? activeFilter
      : undefined,
  withMedia:
    activeFilter === 'withMedia',
  sort: activeSort,
});

    console.log('reviews response:', data);

    const newReviews: Review[] = data.reviews || [];

    if (append) {
      setReviews(prev => [...prev, ...newReviews]);
    } else {
      setReviews(newReviews);
    }

    setReviewsPage(page);

    setHasMoreReviews(
      newReviews.length === REVIEWS_LIMIT
    );
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    console.error('Status:', error?.response?.status);
    console.error('Backend error:', error?.response?.data);

    setReviewsError(
      'Something went wrong loading reviews. Please try again.'
    );
  } finally {
    if (append) {
      setLoadingMore(false);
    } else {
      setReviewsLoading(false);
    }
  }
};
  useEffect(() => {
  if (vendorData?._id) {
    setReviewsPage(1);
    setHasMoreReviews(true);

    fetchReviews(1, false);
  }
}, [vendorData?._id, activeFilter, activeSort]);

const loadMoreReviews = async () => {
  if (
    reviewsLoading ||
    loadingMore ||
    !hasMoreReviews
  ) {
    return;
  }

  await fetchReviews(reviewsPage + 1, true);
};
const handleFilterChange = (
  filter: ReviewFilter['rating'] | 'all' | 'withMedia'
) => {
  setActiveFilter(filter);
  setReviewsPage(1);
  setHasMoreReviews(true);
};

const handleSortChange = (sort: ReviewSort) => {
  setActiveSort(sort);
  setReviewsPage(1);
  setHasMoreReviews(true);
};
const handleSubmitReview = async () => {
  try {
    const user = await getUserData();

    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'User data not found.',
      });
      return;
    }

    const userId = user?._id;

    if (!userId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'User ID not found.',
      });
      return;
    }

    if (!vendorData?._id) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Vendor ID not found.',
      });
      return;
    }

    if (!rating) {
      Toast.show({
        type: 'error',
        text1: 'Rating Required',
        text2: 'Please select a rating.',
      });
      return;
    }

    if (!newReview.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Review Required',
        text2: 'Please write a review.',
      });
      return;
    }

    await postVendorReview(userId, {
      vendorId: vendorData._id,
      reviewText: newReview,
      rating: rating,
      reviewerName: user?.name,
      media: selectedMedia,
    });

    Toast.show({
      type: 'success',
      text1: 'Review Submitted',
      text2: 'Your review has been submitted successfully.',
    });

    setNewReview('');
    setRating(null);
    setSelectedMedia([]);
    setReviewsPage(1);
    setHasMoreReviews(true);

    await fetchReviews(1, false);

  } catch (error) {
    console.error('Error submitting review:', error);

    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to submit review. Please try again.',
    });
  }
};

  const handleAddToCart = async (pkg: any) => {
    try {
      // Step 1: Get the existing cart data (if any)
      const existingCartData = await getSecureData('cartData');
      let cart = existingCartData ? JSON.parse(existingCartData) : { vendors: [] };
      // console.log("cart.vendors", cart.vendors, "vendorData", vendorData)
      console.log("vendorData", vendorData._id)
      // Step 2: Check if the vendor already exists in the cart
      const vendorIndex = cart.vendors.findIndex((vendor: any) => vendor.vendor._id === vendorData._id);
      console.log("existingCartData", existingCartData)
      // If the vendor exists, we need to update the selected package
      if (vendorIndex !== -1) {
        // Update the selected package for the existing vendor
        cart.vendors[vendorIndex].packages.push(pkg); // Add package to this vendor's list
      } else {
        // If the vendor doesn't exist in the cart, create a new vendor entry
        const vendorPackageData = {
          vendor: vendorData, // Saving all vendor data
          packages: [pkg],    // Saving the selected package data
        };
        cart.vendors.push(vendorPackageData); // Add new vendor with package
      }

      // Step 3: Save the updated cart data back
      await saveSecureData('cartData', JSON.stringify(cart));

      // Step 4: Show a success toast message
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: `${pkg.packageName} has been added to your cart!`,
        position: 'bottom',
      });
    } catch (error) {
      console.error('Error handling add to cart:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add to cart. Please try again.',
        position: 'bottom',
      });
    }
  };
  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        const response = await axios.get(`https://eventify-hub.onrender.com/vendor?userId=${id}`);
        setVendorData(response.data);
        setActivePackage(response.data.packages?.[0]?._id || null); // Set the first package as active by default
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      } finally {
        setLoading(false);
      }
    };
    console.log("id", id);
    if (id) {
      fetchVendorDetails();
    }

  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          testID="loading-indicator" //add test id
          size="large"
          color="#7B2869"
        />
        <Text>Loading vendor details...</Text>
      </View>
    );
  }
  // add test id 
  if (!vendorData) {
    return (
      <View testID="error-message" style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Failed to load vendor details. Please try again.
        </Text>
      </View>
    );
  }

  return (
  <KeyboardAvoidingView
    style={styles.keyboardContainer}
    behavior="padding"
    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
  >
    <ScrollView
     ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={
        Platform.OS === 'ios' ? 'interactive' : 'on-drag'
      }
      showsVerticalScrollIndicator={false}
    >
      <Toast />
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity testID="back-button" onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>{vendorData.name}</Text>

        {/* Cart Icon */}
        <TouchableOpacity
          onPress={() => router.push('/cartmanagment')}
          style={styles.cartIconButton}
        >
          <Ionicons name="cart-outline" size={24} color="#7B2869" />
        </TouchableOpacity>
      </View>
      {/* Cover Image */}
      <Image
        testID="vendor-cover-image" // ✅ Added testID
        source={{
          uri: vendorData?.coverImage
            ? `${vendorData.coverImage}`
            : "https://via.placeholder.com/200",
        }}
        style={styles.mainImage}
      />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {["Details", "Packages", "Reviews"].map((tab) => (
          <TouchableOpacity
            key={tab}
            testID={
              tab === "Details"
                ? "tab-details"
                : tab === "Packages"
                  ? "tab-packages"
                  : "tab-reviews"
            } // ✅ Add testID here
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() =>
              setActiveTab(tab as "Details" | "Packages" | "Reviews")
            }
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === "Details" && (
        <View style={styles.detailsContainer}>
          {/* Top Row: Name and Price 
             add test id */}
          <View style={styles.rowContainer}>
            <Text testID="vendor-name" style={styles.name}>
              {vendorData.name}
            </Text>
            <View style={styles.priceContainer}>
              <Text testID="vendor-price" style={styles.price}>
                Starting Price: Rs.
                {vendorData?.BusinessDetails?.minimumPrice || "N/A"}/-
              </Text>
              <Text style={styles.perHead}>Per head</Text>
            </View>
          </View>
          {/*add test id */}
          <Text testID="vendor-address" style={styles.address}>
            {vendorData.contactDetails.officialAddress}
          </Text>

          {/* Photos Section */}
          <View style={styles.photosSection}>
            <TouchableOpacity
              onPress={() => router.push("/vendorprofileimages")}
            >
              <Text style={styles.sectionTitle}>Photos</Text>
            </TouchableOpacity>
            <ScrollView
              testID="scroll-view"
              horizontal
              style={styles.photoContainer}
            >
              {vendorData.images.map((image: string, index: number) => (
                <Image
                  key={index}
                  source={{
                    uri: `${image}`,
                  }}
                  style={styles.photo}
                />
              ))}
            </ScrollView>
          </View>

          {/* Additional Details Section */}

          {/* Details Section */}
          <Text style={styles.sectionTitle}>Details</Text>

          <Text style={styles.detailLabel}>Staff</Text>
          <Text style={styles.detailValue}>
            {vendorData?.BusinessDetails?.staff || "N/A"}
          </Text>

          <Text style={styles.detailLabel}>Cancellation Policy</Text>
          <Text style={styles.detailValue}>
            {vendorData?.BusinessDetails?.covidRefundPolicy || "N/A"}
          </Text>

          <Text style={styles.detailLabel}>Cities Covered</Text>
          <Text style={styles.detailValue}>
            {vendorData?.BusinessDetails?.cityCovered || "N/A"}
          </Text>

          <Text style={styles.detailLabel}>Description</Text>
          <Text style={styles.detailValue}>
            {vendorData?.BusinessDetails?.description || "N/A"}
          </Text>
        </View>
      )}

      {activeTab === "Packages" && (
        <>
          <View style={styles.packageTabContainer}>
            {vendorData.packages.map((pkg: any) => (
              <TouchableOpacity
                key={pkg._id}
                style={[
                  styles.packageTab,
                  activePackage === pkg._id && styles.activePackageTab,
                ]}
                onPress={() => setActivePackage(pkg._id)}
              >
                <Text
                  style={[
                    styles.packageTabText,
                    activePackage === pkg._id && styles.activePackageTabText,
                  ]}
                >
                  {pkg.packageName}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.packageTab}
              onPress={() => setActivePackage(null)} // deselect packages
            >
              <Text style={styles.packageTabText}>📩 Contact for custom packages</Text>
            </TouchableOpacity>
          </View>

          {/* Package Details */}
          {vendorData.packages
            .filter((pkg: any) => pkg._id === activePackage)
            .map((pkg: any) => (
              <View key={pkg._id} style={styles.packageDetails}>
                <Text style={styles.sectionTitle}>Services</Text>
                <Text
                  testID="package-services"
                  style={styles.packageDetailItem}
                >
                  {pkg.services}
                </Text>
                <Text testID="package-price" style={styles.priceText}>
                  Price: Rs.{pkg.price}/-
                </Text>
                <TouchableOpacity
                  testID={`add-to-cart-${pkg._id}`}
                  style={styles.cartButton}
                  onPress={() => handleAddToCart(pkg)}
                >
                  <Text style={styles.cartButtonText}>Add to Cart</Text>
                </TouchableOpacity>

              </View>
            ))}

      
        </>
      )}
      {activeTab === "Reviews" && (
        <View style={styles.tabContent}>

          {/* Eventify Reviews */}
          <View style={styles.reviewControls}>

  <Text style={styles.reviewControlTitle}>
    Filter Reviews
  </Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterRow}
  >
  {([
  { label: 'All', value: 'all' },
  { label: 'With Media', value: 'withMedia' },
  { label: '5 Stars', value: 5 },
  { label: '4 Stars', value: 4 },
  { label: '3 Stars', value: 3 },
  { label: '2 Stars', value: 2 },
  { label: '1 Star', value: 1 },
] as Array<{
  label: string;
  value: ReviewFilter['rating'] | 'all' | 'withMedia';
}>).map(option => (
      <TouchableOpacity
        key={String(option.value)}
        style={[
          styles.filterChip,
          activeFilter === option.value &&
            styles.activeFilterChip,
        ]}
        onPress={() =>
          handleFilterChange(option.value)
        }
      >
        <Text
          style={[
            styles.filterChipText,
            activeFilter === option.value &&
              styles.activeFilterChipText,
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

  <Text style={styles.reviewControlTitle}>
    Sort Reviews
  </Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterRow}
  >
    {[
      { label: 'Recent', value: 'recent' },
      { label: 'Highest Rating', value: 'highest' },
      { label: 'Lowest Rating', value: 'lowest' },
    ].map(option => (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.filterChip,
          activeSort === option.value &&
            styles.activeFilterChip,
        ]}
        onPress={() =>
          handleSortChange(
            option.value as ReviewSort
          )
        }
      >
        <Text
          style={[
            styles.filterChipText,
            activeSort === option.value &&
              styles.activeFilterChipText,
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

</View>
          {activeReviewTab === "Eventify" && (
  <View>
    {reviewsLoading && (
      <View style={styles.loadingReviewsBox} testID="reviews-loading-state">
        <ActivityIndicator size="small" color="#7B2869" />
        <Text style={styles.loadingReviewsText}>
          Loading reviews...
        </Text>
      </View>
    )}

    {reviewsError && !reviewsLoading && (
      <View style={styles.errorStateBox} testID="reviews-error-state">
        <Ionicons
          name="cloud-offline-outline"
          size={28}
          color="#C0392B"
        />

        <Text style={styles.errorStateText}>
          {reviewsError}
        </Text>

        <TouchableOpacity
          testID="retry-reviews-button"
          style={styles.retryButton}
          onPress={() => fetchReviews(1, false)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )}

    {!reviewsLoading &&
      !reviewsError &&
      reviews.length === 0 && (
        <View
          style={styles.emptyStateBox}
          testID="no-reviews-empty-state"
        >
          <Text style={styles.emptyStateTitle}>
            No reviews yet.
          </Text>

          <Text style={styles.emptyStateSubtitle}>
            Be the first to review this vendor.
          </Text>
        </View>
      )}

    {!reviewsLoading &&
  !reviewsError &&
  reviews.map((review) => (
    <ReviewCard
      key={review._id}
      review={review}
      onMediaPress={(_, index) =>
        openMediaViewer(review, index)
      }
    />
  ))}
  {!reviewsLoading &&
  !reviewsError &&
  reviews.length > 0 &&
  !hasMoreReviews && (
    <Text style={styles.noMoreReviewsText}>
      You have reached the end of the reviews.
    </Text>
  )}
  {!reviewsLoading &&
  !reviewsError &&
  reviews.length > 0 &&
  hasMoreReviews && (
    <TouchableOpacity
      testID="load-more-reviews-button"
      style={styles.loadMoreButton}
      onPress={loadMoreReviews}
      disabled={loadingMore}
    >
      {loadingMore ? (
        <>
          <ActivityIndicator
            size="small"
            color="#7B2869"
          />
          <Text style={styles.loadMoreButtonText}>
            Loading more...
          </Text>
        </>
      ) : (
        <Text style={styles.loadMoreButtonText}>
          Load More Reviews
        </Text>
      )}
    </TouchableOpacity>
  )}

              {/* Add Review Form */}
              <View style={styles.addReviewContainer}>
                <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Rate this vendor:</Text>
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <Ionicons
                        name={rating && rating >= star ? 'star' : 'star-outline'}
                        size={28}
                        color="#FFD700"
                        style={{ marginRight: 6 }}
                        testID={`rating-star-${star}`}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Write a Review</Text>
                 <TextInput
                  testID="review-input"
                  placeholder="Write your review here..."
                  multiline
                  value={newReview}
                  onChangeText={setNewReview}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({
                        animated: true,
                      });
                    }, 300);
                  }}
                  style={styles.reviewInput}
                />
                <Text style={styles.mediaLabel}>
  Add Photos (optional)
</Text>

<TouchableOpacity
  testID="pick-media-button"
  style={[
    styles.pickMediaButton,
    uploadingMedia && styles.uploadingMediaButton,
  ]}
  onPress={handlePickMedia}
  disabled={uploadingMedia}
>
  {uploadingMedia ? (
    <View style={styles.uploadProgressContainer}>
      <View style={styles.uploadProgressHeader}>
        <View style={styles.uploadProgressTitleRow}>
          <ActivityIndicator
            size="small"
            color="#7B2869"
            testID="media-upload-loading"
          />

          <Text style={styles.uploadProgressText}>
            Uploading media...
          </Text>
        </View>

        <Text style={styles.uploadPercentage}>
          {uploadProgress}%
        </Text>
      </View>

      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${uploadProgress}%`,
            },
          ]}
        />
      </View>
    </View>
  ) : (
    <>
      <Ionicons
        name="images-outline"
        size={20}
        color="#7B2869"
      />

      <Text style={styles.pickMediaButtonText}>
        Upload Photos / Videos
      </Text>
    </>
  )}
</TouchableOpacity>

{selectedMedia.length > 0 && (
  <View
    style={styles.selectedMediaRow}
    testID="selected-media-preview"
  >
    {selectedMedia.map((item, index) => (
      <View
        key={`${item.url}-${index}`}
        style={styles.selectedMediaThumbWrapper}
      >
        <Image
          source={{ uri: item.url }}
          style={styles.selectedMediaThumb}
        />

        <TouchableOpacity
          testID={`remove-media-${index}`}
          style={styles.removeMediaButton}
          onPress={() => removeSelectedMedia(index)}
        >
          <Ionicons
            name="close-circle"
            size={20}
            color="#C0392B"
          />
        </TouchableOpacity>
      </View>
    ))}
  </View>
)}
                <TouchableOpacity
                  testID="submit-review-button"
                  onPress={handleSubmitReview}
                  style={styles.submitButton}
                >
                  <Text style={styles.submitButtonText}>Submit Review</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
            <MediaViewerModal
            visible={viewerVisible}
            media={viewerMedia}
            initialIndex={viewerIndex}
            onClose={() => setViewerVisible(false)}
          />
        </View>
      )}
    </ScrollView>
    
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
  flex: 1,
},

scrollContent: {
  flexGrow: 1,
  paddingBottom: 40,
},
  container: {
  flex: 1,
  backgroundColor: '#F8EAF2',
},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backText: {
    fontSize: 16,
    color: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  mainImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    paddingVertical: 8,
    flex: 1,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#7B2869',
  },
  tabText: {
    fontSize: 16,
    color: '#7A7A7A',
  },
  activeTabText: {
    color: '#7B2869',
    fontWeight: 'bold',
  },
 
  address: {
    fontSize: 14,
    color: '#7A7A7A',
    marginVertical: 8,
  },

  description: {
    fontSize: 14,
    marginVertical: 8,
  },
  staff: {
    fontSize: 14,
    marginVertical: 8,
  },
  packageTabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  packageTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8EAF2',
  },
  activePackageTab: {
    backgroundColor: '#9F4F8E',
    borderColor: '#7B2869',
  },
  packageTabText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7A7A7A',
    textAlign: 'center',
  },
  activePackageTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  packageDetails: {
    padding: 16,
  },
  packageDetailItem: {
    fontSize: 14,
    marginVertical: 2,
    color: '#7A7A7A',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7B2869',
    textAlign: 'right',
    marginVertical: 8,
  },
  contactButton: {
    backgroundColor: '#7B2869',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingReviewsBox: {
  padding: 20,
  alignItems: 'center',
},

loadingReviewsText: {
  marginTop: 8,
  fontSize: 13,
  color: '#7A7A7A',
},

emptyStateBox: {
  padding: 20,
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: 12,
  marginBottom: 16,
},

emptyStateTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: '#333',
  textAlign: 'center',
},

emptyStateSubtitle: {
  fontSize: 13,
  color: '#7A7A7A',
  textAlign: 'center',
  marginTop: 6,
},

errorStateBox: {
  padding: 20,
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: 12,
  marginBottom: 16,
},

errorStateText: {
  fontSize: 13,
  color: '#7A7A7A',
  textAlign: 'center',
  marginTop: 8,
  marginBottom: 10,
},

retryButton: {
  paddingVertical: 8,
  paddingHorizontal: 20,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#7B2869',
},

retryButtonText: {
  color: '#7B2869',
  fontWeight: 'bold',
  fontSize: 13,
},
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },

  tabContent: {
    padding: 16,
  },
  detailItem: {
    fontSize: 14,
    marginBottom: 8,
  },

  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  perHead: {
    fontSize: 14,
    color: '#7A7A7A',
    marginTop: 2,
  },
  detailsContainer: {
    padding: 16,
    //  backgroundColor: '#FDF6FA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: '#333',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#777',
    marginBottom: 4,
  },
  photosSection: {
    padding: 16,
  },

  photosScroll: {
    flexDirection: 'row',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  uploadingMediaButton: {
  paddingVertical: 12,
},

uploadProgressContainer: {
  width: '100%',
},

uploadProgressHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},

uploadProgressTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},

uploadProgressText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#7B2869',
},

uploadPercentage: {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#7B2869',
},

progressBarBackground: {
  width: '100%',
  height: 7,
  backgroundColor: '#E8E8E8',
  borderRadius: 4,
  overflow: 'hidden',
},

progressBarFill: {
  height: '100%',
  backgroundColor: '#7B2869',
  borderRadius: 4,
},
  reviewTabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  reviewTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeReviewTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#7B2869',
  },
  reviewTabText: {
    fontSize: 16,
    color: '#7A7A7A',
  },
  activeReviewTabText: {
    color: '#7B2869',
    fontWeight: 'bold',
  },
  eventifyReview: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#7A7A7A',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#000',
  },
  reviewControls: {
  marginBottom: 16,
},

reviewControlTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#333',
  marginBottom: 8,
  marginTop: 4,
},

filterRow: {
  paddingBottom: 8,
  paddingRight: 8,
},

filterChip: {
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#D8D8D8',
  backgroundColor: '#FFFFFF',
  marginRight: 8,
},

activeFilterChip: {
  backgroundColor: '#7B2869',
  borderColor: '#7B2869',
},

filterChipText: {
  fontSize: 12,
  color: '#666',
  fontWeight: '500',
},

activeFilterChipText: {
  color: '#FFFFFF',
  fontWeight: '600',
},

loadMoreButton: {
  minHeight: 42,
  paddingHorizontal: 20,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: '#7B2869',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  alignSelf: 'center',
  marginVertical: 16,
},

loadMoreButtonText: {
  color: '#7B2869',
  fontSize: 13,
  fontWeight: '600',
  marginLeft: 8,
},

noMoreReviewsText: {
  textAlign: 'center',
  fontSize: 12,
  color: '#999',
  marginVertical: 16,
},
  showMoreButton: {
    backgroundColor: '#E0E0E0',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginVertical: 8,
  },
  showMoreButtonText: {
    fontSize: 14,
    color: '#7B2869',
    fontWeight: 'bold',
  },
  googleReviewStats: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reviewNote: {
    fontSize: 12,
    color: '#7A7A7A',
    marginBottom: 8,
  },
  ratingsBreakdown: {
    marginVertical: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#7A7A7A',
    flex: 1,
  },
  ratingBar: {
    flex: 4,
    height: 8,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  filledRatingBar: {
    height: '100%',
    backgroundColor: '#FFC107',
  },
  ratingCount: {
    fontSize: 12,
    color: '#7A7A7A',
    flex: 1,
  },
  googleReview: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  photoContainer: {
    flexDirection: 'row',
  },
  cartButton: {
    marginTop: 8,
    alignSelf: 'flex-end', // Makes button width fit content
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#7B2869',
    borderRadius: 20, // pill shape
  },
  cartButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartIconContainer: {
    position: 'absolute',
    right: -40, // adjust as needed
    padding: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartIconButton: {
    padding: 4,
  },
  addReviewContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  mediaLabel: {
  fontWeight: 'bold',
  marginTop: 4,
  marginBottom: 6,
  color: '#333',
},

pickMediaButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#7B2869',
  borderStyle: 'dashed',
  borderRadius: 8,
  paddingVertical: 12,
  marginBottom: 10,
},

pickMediaButtonText: {
  color: '#7B2869',
  fontWeight: '600',
  marginLeft: 6,
  fontSize: 13,
},

selectedMediaRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginBottom: 10,
},

selectedMediaThumbWrapper: {
  marginRight: 8,
  marginBottom: 8,
  position: 'relative',
},

selectedMediaThumb: {
  width: 60,
  height: 60,
  borderRadius: 6,
  backgroundColor: '#E0E0E0',
},

removeMediaButton: {
  position: 'absolute',
  top: -6,
  right: -6,
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
},
  reviewInput: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#7B2869',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },


});

export default VendorDetailsScreen;
