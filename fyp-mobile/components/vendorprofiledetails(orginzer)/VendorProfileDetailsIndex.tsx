// Organizer side detail section
// fyp-mobile/components/vendorprofiledetails/VendorProfileDetailsIndex.tsx

import getVendorReviews from '@/services/getAllReviewsForVendor';
import getVendorReviewSummary from '@/services/getVendorReviewSummary';
import postVendorReview from '@/services/postVendorReview';
import { uploadMultipleImages } from '@/services/uploadMultipleImages';
import {
  getUserData,
  saveSecureData,
  getSecureData,
} from '@/store';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useGlobalSearchParams } from 'expo-router';
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import * as ImagePicker from 'expo-image-picker';
import ReviewCard from '@/components/Review/ReviewCard';
import MediaViewerModal from '@/components/Review/MediaViewerModal';
import VendorBadgesSection from './VendorBadgesSection';
import getVendorAvailability, {
  VendorAvailabilityResponse,
} from '@/services/getVendorAvailability';
import checkVendorsAvailability from '@/services/checkVendorsAvailability';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
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
  ReviewSummary,
} from '@/types/review';
import Toast from 'react-native-toast-message';

const PRIMARY = '#7B2869';
const PRIMARY_LIGHT = '#9F4F8E';
const PRIMARY_SOFT = '#F3E4EF';
const BG = '#FAF6F9';
const CARD = '#FFFFFF';
const TEXT_DARK = '#221A20';
const TEXT_MUTED = '#8A7C86';
const BORDER = '#EFE0EB';

const sortLabels: Record<ReviewSort, string> = {
  recent: 'Most Recent',
  highest: 'Highest Rating',
  lowest: 'Lowest Rating',
};

const DAY_CODES = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
];

const formatEventDate = (
  date?: string | string[],
) => {
  const value = Array.isArray(date)
    ? date[0]
    : date;

  if (!value) return 'N/A';

  const parsed = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatTimeDisplay = (
  time?: string,
) => {
  if (!time) return '--';

  const [hours, minutes] = time
    .split(':')
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  const period =
    hours >= 12 ? 'PM' : 'AM';

  const displayHour =
    hours % 12 || 12;

  return `${String(
    displayHour,
  ).padStart(
    2,
    '0',
  )}:${String(
    minutes,
  ).padStart(
    2,
    '0',
  )} ${period}`;
};

const formatBookingNotice = (
  minutes?: number,
) => {
  if (
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    return 'No minimum notice';
  }

  if (
    minutes >= 1440 &&
    minutes % 1440 === 0
  ) {
    const days = minutes / 1440;

    return `Book at least ${days} ${
      days === 1 ? 'day' : 'days'
    } before your event`;
  }

  if (minutes >= 60) {
    const hours = minutes / 60;

    return `Book at least ${
      hours % 1 === 0
        ? hours
        : hours.toFixed(1)
    } ${
      hours === 1 ? 'hour' : 'hours'
    } before your event`;
  }

  return `Book at least ${minutes} minutes before your event`;
};

const getBookingNoticeMinutes = (
  availability: VendorAvailabilityResponse | null,
  date?: string | string[],
) => {
  if (!availability) {
    return null;
  }

  const dateValue = Array.isArray(date)
    ? date[0]
    : date;

  // 1. First check selected day's custom notice
  if (dateValue) {
    const parsedDate = new Date(
      `${dateValue}T00:00:00`,
    );

    if (!Number.isNaN(parsedDate.getTime())) {
      const dayCode =
        DAY_CODES[parsedDate.getDay()];

      const dayConfig =
        availability.daySlots?.find(
          (item) => item.day === dayCode,
        );

      if (
        Array.isArray(
          dayConfig?.advanceNoticeOptionsMinutes,
        ) &&
        dayConfig.advanceNoticeOptionsMinutes.length > 0
      ) {
        return Math.min(
          ...dayConfig.advanceNoticeOptionsMinutes,
        );
      }
    }
  }

  // 2. Then check vendor-wide advance notice options
  if (
    Array.isArray(
      availability.advanceNoticeOptionsMinutes,
    ) &&
    availability.advanceNoticeOptionsMinutes.length > 0
  ) {
    return Math.min(
      ...availability.advanceNoticeOptionsMinutes,
    );
  }

  // 3. Fallback to minimumAdvanceMinutes
  if (
    typeof availability.minimumAdvanceMinutes ===
      'number' &&
    availability.minimumAdvanceMinutes > 0
  ) {
    return availability.minimumAdvanceMinutes;
  }

  return null;
};
const getRelevantVendorSlots = (
  availability: VendorAvailabilityResponse | null,
  date?: string | string[],
) => {
  if (!availability || !date) {
    return [];
  }

  const dateValue = Array.isArray(date)
    ? date[0]
    : date;

  if (!dateValue) {
    return [];
  }

  const parsedDate = new Date(
    `${dateValue}T00:00:00`,
  );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return [];
  }

  const dayCode =
    DAY_CODES[
      parsedDate.getDay()
    ];

  const dayConfig =
    availability.daySlots?.find(
      (item) =>
        item.day === dayCode,
    );

  if (dayConfig) {
    if (!dayConfig.enabled) {
      return [];
    }

    return Array.isArray(
      dayConfig.slots,
    )
      ? dayConfig.slots
      : [];
  }

  if (
    availability.workingHoursStart &&
    availability.workingHoursEnd
  ) {
    return [
      {
        start:
          availability.workingHoursStart,
        end:
          availability.workingHoursEnd,
      },
    ];
  }

  return [];
};

const VendorDetailsScreen: React.FC =
  () => {
    const {
      id,
      packageId,
      openTab,
      eventDate,
      startTime,
      endTime,
      durationMinutes,
      bookingMode,
    } = useGlobalSearchParams();

    const [activeTab, setActiveTab] =
      useState<
        'Details' | 'Packages' | 'Reviews'
      >('Details');

    const [activePackage, setActivePackage] =
      useState<string | null>(null);

    const [vendorData, setVendorData] =
      useState<any>(null);

    const [loading, setLoading] =
      useState<boolean>(true);

    const [rating, setRating] =
      useState<number | null>(null);

    const [newReview, setNewReview] =
      useState('');

    const scrollViewRef =
      useRef<ScrollView>(null);

    const [selectedMedia, setSelectedMedia] =
      useState<ReviewMedia[]>([]);

    const [uploadingMedia, setUploadingMedia] =
      useState(false);

    const [uploadProgress, setUploadProgress] =
      useState(0);

    const [viewerVisible, setViewerVisible] =
      useState(false);

    const [viewerMedia, setViewerMedia] =
      useState<ReviewMedia[]>([]);

    const [viewerIndex, setViewerIndex] =
      useState(0);

    const [reviewSummary, setReviewSummary] =
      useState<ReviewSummary | null>(null);

    const [summaryLoading, setSummaryLoading] =
      useState<boolean>(true);

    const [reviews, setReviews] =
      useState<Review[]>([]);

    const [reviewsLoading, setReviewsLoading] =
      useState<boolean>(false);

    const [loadingMore, setLoadingMore] =
      useState<boolean>(false);

    const [reviewsError, setReviewsError] =
      useState<string | null>(null);

    const [activeFilter, setActiveFilter] =
      useState<
        ReviewFilter['rating'] |
        'all' |
        'withMedia'
      >('all');

    const [activeSort, setActiveSort] =
      useState<ReviewSort>('recent');

    const [sortModalVisible, setSortModalVisible] =
      useState(false);

    const [reviewsPage, setReviewsPage] =
      useState<number>(1);

    const [hasMoreReviews, setHasMoreReviews] =
      useState<boolean>(true);

    const [vendorAvailability, setVendorAvailability] =
      useState<VendorAvailabilityResponse | null>(
        null,
      );

    const [availabilityCheck, setAvailabilityCheck] =
      useState<{
        available: boolean;
        reason?: string;
      } | null>(null);

    const [availabilityLoading, setAvailabilityLoading] =
      useState(false);

    const isEventMode =
      bookingMode === 'event' &&
      !!eventDate &&
      !!startTime &&
      Number(durationMinutes) > 0;

    const isBrowseMode =
      bookingMode === 'browse' ||
      !isEventMode;

    const fetchVendorAvailability = async () => {
      if (!vendorData?._id) {
        return;
      }

      setAvailabilityLoading(true);

      try {
        const availability =
          await getVendorAvailability(
            vendorData._id,
          );

        setVendorAvailability(
          availability,
        );

        if (isEventMode) {
          const checkResult =
            await checkVendorsAvailability({
              vendorIds: [
                vendorData._id,
              ],
              eventDate: String(
                Array.isArray(eventDate)
                  ? eventDate[0]
                  : eventDate,
              ),
              startTime: String(
                Array.isArray(startTime)
                  ? startTime[0]
                  : startTime,
              ),
              durationMinutes: Number(
                durationMinutes,
              ),
            });

          setAvailabilityCheck(
            checkResult?.[0] ?? null,
          );
        } else {
          setAvailabilityCheck(null);
        }
      } catch (error) {
        console.error(
          'Availability error:',
          error,
        );

        if (isEventMode) {
          setAvailabilityCheck({
            available: false,
            reason:
              'Unable to verify vendor availability.',
          });
        }
      } finally {
        setAvailabilityLoading(false);
      }
    };

    useEffect(() => {
      if (vendorData?._id) {
        fetchVendorAvailability();
      }
    }, [
      vendorData?._id,
      eventDate,
      startTime,
      durationMinutes,
      bookingMode,
    ]);

    const getWeeklyVendorSlots = (
      availability: VendorAvailabilityResponse | null,
    ) => {
      if (!availability) {
        return [];
      }

      if (
        Array.isArray(
          availability.daySlots,
        ) &&
        availability.daySlots.length > 0
      ) {
        return availability.daySlots
          .filter(
            (day) => day.enabled,
          )
          .flatMap(
            (day) =>
              (
                day.slots || []
              ).map((slot) => ({
                day: day.day,
                start: slot.start,
                end: slot.end,
              })),
          );
      }

      if (
        availability.workingHoursStart &&
        availability.workingHoursEnd
      ) {
        return [
          {
            day: 'ALL',
            start:
              availability.workingHoursStart,
            end:
              availability.workingHoursEnd,
          },
        ];
      }

      return [];
    };

    const weeklyVendorSlots =
      getWeeklyVendorSlots(
        vendorAvailability,
      );

    const REVIEWS_LIMIT = 20;

    // ---------------------------------------------------------
    // Package handling
    // ---------------------------------------------------------

    useEffect(() => {
      if (
        typeof packageId === 'string' &&
        packageId
      ) {
        setActiveTab('Packages');
        setActivePackage(
          packageId,
        );
      } else if (
        typeof openTab === 'string' &&
        openTab === 'Packages'
      ) {
        setActiveTab('Packages');
      }
    }, [
      packageId,
      openTab,
    ]);

    const getSelectedPackage = () => {
      if (
        !vendorData?.packages?.length
      ) {
        return null;
      }

      if (activePackage) {
        const selected =
          vendorData.packages.find(
            (pkg: any) =>
              String(pkg._id) ===
              String(activePackage),
          );

        if (selected) {
          return selected;
        }
      }

      return vendorData.packages[0];
    };

    const handlePackageSelect = (
      packageIdValue: string,
    ) => {
      setActivePackage(
        packageIdValue,
      );
    };

    // ---------------------------------------------------------
    // Reviews
    // ---------------------------------------------------------

    const openMediaViewer = (
      review: Review,
      index: number,
    ) => {
      if (
        !review.media ||
        review.media.length === 0
      ) {
        return;
      }

      setViewerMedia(
        review.media,
      );
      setViewerIndex(index);
      setViewerVisible(true);
    };

    const handlePickMedia =
      async () => {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          alert(
            'Permission to access media library is required.',
          );
          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: [
                'images',
                'videos',
              ],
              allowsMultipleSelection: true,
              quality: 0.7,
            },
          );

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        setUploadingMedia(true);
        setUploadProgress(0);

        try {
          const user =
            await getUserData();

          if (!user) {
            throw new Error(
              'User data not found',
            );
          }

          const userId =
            user?._id;

          if (!userId) {
            throw new Error(
              'User ID missing',
            );
          }

          const uploadAssets =
            result.assets.map(
              (
                asset,
                index,
              ) => {
                const isVideo =
                  asset.type ===
                  'video';

                let extension =
                  isVideo
                    ? 'mp4'
                    : 'jpg';

                if (
                  asset.fileName
                ) {
                  const parts =
                    asset.fileName.split(
                      '.',
                    );

                  if (
                    parts.length >
                    1
                  ) {
                    extension =
                      parts[
                        parts.length -
                          1
                      ].toLowerCase();
                  }
                }

                const mimeType =
                  asset.mimeType ||
                  (isVideo
                    ? 'video/mp4'
                    : 'image/jpeg');

                return {
                  uri: asset.uri,
                  name:
                    asset.fileName ||
                    `${
                      isVideo
                        ? 'video'
                        : 'photo'
                    }_${Date.now()}_${index}.${extension}`,
                  type: mimeType,
                };
              },
            );

          const uploadedUrls =
            await uploadMultipleImages(
              userId,
              uploadAssets,
              (progress) => {
                setUploadProgress(
                  progress,
                );
              },
            );

          const uploadedMedia:
            ReviewMedia[] =
            uploadedUrls.map(
              (
                url,
                index,
              ) => ({
                type:
                  result.assets[
                    index
                  ]?.type ===
                  'video'
                    ? 'video'
                    : 'image',
                url,
                thumbnailUrl:
                  result.assets[
                    index
                  ]?.type ===
                  'video'
                    ? undefined
                    : url,
              }),
            );

          setSelectedMedia(
            (prev) => [
              ...prev,
              ...uploadedMedia,
            ],
          );
        } catch (error: any) {
          console.error(
            'Error uploading media:',
            error?.response
              ?.data ||
              error?.message ||
              error,
          );

          alert(
            error?.response
              ?.data?.message ||
              'Failed to upload media. Please try again.',
          );
        } finally {
          setUploadingMedia(
            false,
          );
          setUploadProgress(
            100,
          );

          setTimeout(() => {
            setUploadProgress(0);
          }, 500);
        }
      };

    const removeSelectedMedia = (
      index: number,
    ) => {
      setSelectedMedia(
        (prev) =>
          prev.filter(
            (_, i) =>
              i !== index,
          ),
      );
    };

    const fetchReviewSummary =
      async () => {
        if (!vendorData?._id) {
          return;
        }

        setSummaryLoading(true);

        try {
          const data =
            await getVendorReviewSummary(
              vendorData._id,
            );

          setReviewSummary(
            data,
          );
        } catch (error) {
          console.error(
            'Error fetching review summary:',
            error,
          );
        } finally {
          setSummaryLoading(
            false,
          );
        }
      };

    const fetchReviews = async (
      page: number = 1,
      append: boolean = false,
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
        const data =
          await getVendorReviews({
            vendorId:
              vendorData._id,
            page,
            limit:
              REVIEWS_LIMIT,
            rating:
              typeof activeFilter ===
              'number'
                ? activeFilter
                : undefined,
            withMedia:
              activeFilter ===
              'withMedia',
            sort: activeSort,
          });

        const newReviews:
          Review[] =
          data.reviews || [];

        if (append) {
          setReviews(
            (prev) => [
              ...prev,
              ...newReviews,
            ],
          );
        } else {
          setReviews(
            newReviews,
          );
        }

        setReviewsPage(
          page,
        );

        setHasMoreReviews(
          newReviews.length ===
            REVIEWS_LIMIT,
        );
      } catch (error) {
        console.error(
          'Error fetching reviews:',
          error,
        );

        setReviewsError(
          'Something went wrong loading reviews. Please try again.',
        );
      } finally {
        if (append) {
          setLoadingMore(
            false,
          );
        } else {
          setReviewsLoading(
            false,
          );
        }
      }
    };

    useEffect(() => {
      if (vendorData?._id) {
        fetchReviewSummary();
      }
    }, [
      vendorData?._id,
    ]);

    useEffect(() => {
      if (vendorData?._id) {
        setReviewsPage(1);
        setHasMoreReviews(true);

        fetchReviews(
          1,
          false,
        );
      }
    }, [
      vendorData?._id,
      activeFilter,
      activeSort,
    ]);

    const loadMoreReviews =
      async () => {
        if (
          reviewsLoading ||
          loadingMore ||
          !hasMoreReviews
        ) {
          return;
        }

        await fetchReviews(
          reviewsPage + 1,
          true,
        );
      };

    const handleFilterChange = (
      filter:
        | ReviewFilter['rating']
        | 'all'
        | 'withMedia',
    ) => {
      setActiveFilter(
        filter,
      );
      setReviewsPage(1);
      setHasMoreReviews(true);
    };

    const handleSubmitReview =
      async () => {
        try {
          const user =
            await getUserData();

          if (!user) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2:
                'User data not found.',
            });
            return;
          }

          const userId =
            user?._id;

          if (!userId) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2:
                'User ID not found.',
            });
            return;
          }

          if (!vendorData?._id) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2:
                'Vendor ID not found.',
            });
            return;
          }

          if (!rating) {
            Toast.show({
              type: 'error',
              text1:
                'Rating Required',
              text2:
                'Please select a rating.',
            });
            return;
          }

          if (
            !newReview.trim()
          ) {
            Toast.show({
              type: 'error',
              text1:
                'Review Required',
              text2:
                'Please write a review.',
            });
            return;
          }

          await postVendorReview(
            userId,
            {
              vendorId:
                vendorData._id,
              reviewText:
                newReview,
              rating,
              reviewerName:
                user?.name,
              media:
                selectedMedia,
            },
          );

          Toast.show({
            type: 'success',
            text1:
              'Review Submitted',
            text2:
              'Your review has been submitted successfully.',
          });

          setNewReview('');
          setRating(null);
          setSelectedMedia([]);
          setReviewsPage(1);
          setHasMoreReviews(
            true,
          );

          await fetchReviews(
            1,
            false,
          );

          await fetchReviewSummary();
        } catch (error) {
          console.error(
            'Error submitting review:',
            error,
          );

          Toast.show({
            type: 'error',
            text1: 'Error',
            text2:
              'Failed to submit review. Please try again.',
          });
        }
      };

    // ---------------------------------------------------------
    // Cart
    // ---------------------------------------------------------

    const handleAddToCart =
      async (pkg: any) => {
        // Normal browse mode:
        // Add to Cart should never be available.
        if (!isEventMode) {
          Toast.show({
            type: 'info',
            text1:
              'Event Required',
            text2:
              'Please create/select an event before adding a vendor package to cart.',
            position:
              'bottom',
          });

          return;
        }

        // Event mode:
        // Vendor must be available for the selected event.
        if (
          !availabilityCheck?.available
        ) {
          Toast.show({
            type: 'error',
            text1:
              'Vendor Not Available',
            text2:
              availabilityCheck?.reason ||
              'This vendor is not available for the selected event time.',
            position:
              'bottom',
          });

          return;
        }

        try {
          const existingCartData =
            await getSecureData(
              'cartData',
            );

          let cart =
            existingCartData
              ? JSON.parse(
                  existingCartData,
                )
              : {
                  vendors: [],
                };

          if (
            !Array.isArray(
              cart.vendors,
            )
          ) {
            cart.vendors = [];
          }

          const vendorIndex =
            cart.vendors.findIndex(
              (vendor: any) =>
                vendor.vendor?._id ===
                vendorData?._id,
            );

          if (
            vendorIndex !==
            -1
          ) {
            const packageExists =
              cart.vendors[
                vendorIndex
              ].packages?.some(
                (
                  existingPkg: any,
                ) =>
                  String(
                    existingPkg._id,
                  ) ===
                  String(
                    pkg._id,
                  ),
              );

            if (
              !packageExists
            ) {
              if (
                !Array.isArray(
                  cart.vendors[
                    vendorIndex
                  ].packages,
                )
              ) {
                cart.vendors[
                  vendorIndex
                ].packages =
                  [];
              }

              cart.vendors[
                vendorIndex
              ].packages.push(
                pkg,
              );
            }
          } else {
            cart.vendors.push(
              {
                vendor:
                  vendorData,
                packages: [pkg],
              },
            );
          }

          await saveSecureData(
            'cartData',
            JSON.stringify(
              cart,
            ),
          );

          Toast.show({
            type: 'success',
            text1:
              'Added to Cart',
            text2: `${pkg.packageName} has been added to your cart!`,
            position:
              'bottom',
          });
        } catch (error) {
          console.error(
            'Error handling add to cart:',
            error,
          );

          Toast.show({
            type: 'error',
            text1: 'Error',
            text2:
              'Failed to add to cart. Please try again.',
            position:
              'bottom',
          });
        }
      };

    // ---------------------------------------------------------
    // Fetch Vendor
    // ---------------------------------------------------------

    useEffect(() => {
      const fetchVendorDetails =
        async () => {
          try {
            const vendorId =
              Array.isArray(id)
                ? id[0]
                : id;

            if (!vendorId) {
              return;
            }

            const response =
              await axios.get(
                `https://eventify-hub.onrender.com/vendor?userId=${vendorId}`,
              );

            const vendor =
              response.data;

            setVendorData(
              vendor,
            );

            const routePackageId =
              typeof packageId ===
                'string' &&
              packageId
                ? packageId
                : null;

            const firstPackageId =
              vendor?.packages?.[0]
                ?._id ||
              null;

            const validRoutePackage =
              routePackageId &&
              vendor?.packages?.some(
                (pkg: any) =>
                  String(
                    pkg._id,
                  ) ===
                  String(
                    routePackageId,
                  ),
              )
                ? routePackageId
                : firstPackageId;

            setActivePackage(
              validRoutePackage,
            );
          } catch (error) {
            console.error(
              'Error fetching vendor data:',
              error,
            );
          } finally {
            setLoading(false);
          }
        };

      if (id) {
        fetchVendorDetails();
      }
    }, [
      id,
      packageId,
    ]);

    if (loading) {
      return (
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            testID="loading-indicator"
            size="large"
            color={PRIMARY}
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading vendor
            details...
          </Text>
        </View>
      );
    }

    if (!vendorData) {
      return (
        <View
          testID="error-message"
          style={
            styles.errorContainer
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color="#D64545"
            style={{
              marginBottom: 10,
            }}
          />

          <Text
            style={
              styles.errorText
            }
          >
            Failed to load vendor
            details. Please try
            again.
          </Text>
        </View>
      );
    }

    const businessDetails =
      vendorData?.photographerBusinessDetails ||
      vendorData?.salonBusinessDetails ||
      vendorData?.venueBusinessDetails ||
      vendorData?.cateringBusinessDetails ||
      vendorData?.cakeBusinessDetails ||
      vendorData?.mehndiBusinessDetails ||
      vendorData?.soundBusinessDetails ||
      vendorData?.BusinessDetails;

    const category =
      vendorData?.photographerBusinessDetails
        ? 'photographer'
        : vendorData?.salonBusinessDetails
        ? 'salon'
        : vendorData?.venueBusinessDetails
        ? 'venue'
        : vendorData?.cateringBusinessDetails
        ? 'catering'
        : vendorData?.cakeBusinessDetails
        ? 'cake'
        : vendorData?.mehndiBusinessDetails
        ? 'mehndi'
        : vendorData?.soundBusinessDetails
        ? 'sound'
        : '';

    const selectedPackage =
      getSelectedPackage();

    const relevantVendorSlots =
      getRelevantVendorSlots(
        vendorAvailability,
        eventDate,
      );

    const eventDateDisplay =
      formatEventDate(
        eventDate,
      );

    const eventStartTime =
      Array.isArray(startTime)
        ? startTime[0]
        : startTime;

    const eventEndTime =
      Array.isArray(endTime)
        ? endTime[0]
        : endTime;

    const hasEventTiming =
      isEventMode;

    return (
      <KeyboardAvoidingView
        style={
          styles.keyboardContainer
        }
        behavior="padding"
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? 0
            : 0
        }
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <Toast />

          {/* ------------------------------------------------ */}
          {/* Cover */}
          {/* ------------------------------------------------ */}

          <View
            style={
              styles.coverWrapper
            }
          >
            <Image
              testID="vendor-cover-image"
              source={{
                uri:
                  vendorData?.coverImage
                    ? `${vendorData.coverImage}`
                    : 'https://via.placeholder.com/600x300',
              }}
              style={
                styles.coverImage
              }
            />

            <View
              style={
                styles.coverOverlay
              }
            />

            <View
              style={
                styles.header
              }
            >
              <TouchableOpacity
                testID="back-button"
                onPress={() =>
                  router.back()
                }
                style={
                  styles.backIconButton
                }
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <Text
                style={styles.title}
                numberOfLines={1}
              >
                {vendorData.name}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  router.push(
                    '/cartmanagement' as never,
                  )
                }
                style={
                  styles.cartIconButton
                }
                activeOpacity={0.7}
              >
                <Ionicons
                  name="cart-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ------------------------------------------------ */}
          {/* Tabs */}
          {/* ------------------------------------------------ */}

          <View
            style={
              styles.tabContainer
            }
          >
            {[
              'Details',
              'Packages',
              'Reviews',
            ].map((tab) => (
              <TouchableOpacity
                key={tab}
                testID={
                  tab ===
                  'Details'
                    ? 'tab-details'
                    : tab ===
                      'Packages'
                    ? 'tab-packages'
                    : 'tab-reviews'
                }
                style={[
                  styles.tab,
                  activeTab ===
                    tab &&
                    styles.activeTab,
                ]}
                onPress={() =>
                  setActiveTab(
                    tab as
                      | 'Details'
                      | 'Packages'
                      | 'Reviews',
                  )
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab ===
                      tab &&
                      styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ================================================= */}
          {/* DETAILS */}
          {/* ================================================= */}

          {activeTab ===
            'Details' && (
            <View
              style={
                styles.detailsContainer
              }
            >
              <View
                style={
                  styles.card
                }
              >
                <View
                  style={
                    styles.rowContainer
                  }
                >
                  <Text
                    testID="vendor-name"
                    style={
                      styles.name
                    }
                  >
                    {vendorData.name}
                  </Text>

                  <View
                    style={
                      styles.priceBadge
                    }
                  >
                    <Text
                      testID="vendor-price"
                      style={
                        styles.price
                      }
                    >
                      Rs.{' '}
                      {businessDetails?.minimumPrice ??
                        'N/A'}
                      /-
                    </Text>

                    <Text
                      style={
                        styles.perHead
                      }
                    >
                      Starting price
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.addressRow
                  }
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={
                      TEXT_MUTED
                    }
                  />

                  <Text
                    testID="vendor-address"
                    style={
                      styles.address
                    }
                  >
                    {vendorData
                      ?.contactDetails
                      ?.officialAddress ||
                      'N/A'}
                  </Text>
                </View>
              </View>

              <VendorBadgesSection
                vendorId={
                  vendorData._id
                }
              />

              <View
                style={[
                  styles.card,
                  styles.photosSection,
                ]}
              >
                <View
                  style={
                    styles.sectionTitleRow
                  }
                >
                  <View
                    style={
                      styles.sectionTitleWithIcon
                    }
                  >
                    <View
                      style={
                        styles.sectionIconCircle
                      }
                    >
                      <Ionicons
                        name="images-outline"
                        size={16}
                        color={
                          PRIMARY
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Photos
                    </Text>

                    {vendorData
                      .images
                      ?.length >
                      0 && (
                      <View
                        style={
                          styles.photoCountBadge
                        }
                      >
                        <Text
                          style={
                            styles.photoCountText
                          }
                        >
                          {
                            vendorData
                              .images
                              .length
                          }
                        </Text>
                      </View>
                    )}
                  </View>

                  {vendorData
                    .images
                    ?.length >
                    0 && (
                    <TouchableOpacity
                      testID="see-all-photos"
                      onPress={() =>
                        router.push(
                          {
                            pathname:
                              '/vendorprofileimages',
                            params: {
                              vendorId:
                                vendorData._id,
                            },
                          },
                        )
                      }
                      activeOpacity={0.7}
                      style={
                        styles.seeAllButton
                      }
                    >
                      <Text
                        style={
                          styles.seeAllLink
                        }
                      >
                        See All
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={
                          PRIMARY
                        }
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {vendorData
                  .images
                  ?.length >
                0 ? (
                  <ScrollView
                    testID="scroll-view"
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    style={
                      styles.photoContainer
                    }
                    contentContainerStyle={
                      styles.photoContainerContent
                    }
                  >
                    {vendorData.images.map(
                      (
                        image: string,
                        index: number,
                      ) => (
                        <TouchableOpacity
                          key={
                            index
                          }
                          activeOpacity={
                            0.85
                          }
                          onPress={() =>
                            router.push(
                              {
                                pathname:
                                  '/vendorprofileimages',
                                params: {
                                  vendorId:
                                    vendorData._id,
                                },
                              },
                            )
                          }
                          style={
                            styles.photoWrapper
                          }
                        >
                          <Image
                            source={{
                              uri: `${image}`,
                            }}
                            style={
                              styles.photo
                            }
                          />
                        </TouchableOpacity>
                      ),
                    )}
                  </ScrollView>
                ) : (
                  <View
                    style={
                      styles.noPhotosBox
                    }
                  >
                    <Ionicons
                      name="image-outline"
                      size={26}
                      color="#C9A9BE"
                    />

                    <Text
                      style={
                        styles.noPhotosText
                      }
                    >
                      No photos added
                      yet
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={
                  styles.card
                }
              >
                <View
                  style={
                    styles.detailsHeader
                  }
                >
                  <View
                    style={
                      styles.sectionTitleWithIcon
                    }
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={
                        PRIMARY
                      }
                    />

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Details
                    </Text>
                  </View>
                </View>

                {category ===
                  'cake' && (
                  <>
                    <Field
                      label="Cake Types"
                      value={businessDetails?.cakeTypes?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Delivery Options"
                      value={businessDetails?.deliveryOptions?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Delivery To Home"
                      value={
                        businessDetails?.deliveryToHome
                          ? 'YES'
                          : 'NO'
                      }
                    />

                    <Field
                      label="Expertise"
                      value={
                        businessDetails?.expertise
                      }
                    />

                    <Field
                      label="City Covered"
                      value={
                        businessDetails?.cityCovered
                      }
                    />
                  </>
                )}

                {category ===
                  'catering' && (
                  <>
                    <Field
                      label="Expertise"
                      value={businessDetails?.expertise?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Staff"
                      value={businessDetails?.staff?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="City Covered"
                      value={
                        businessDetails?.cityCovered
                      }
                    />

                    <Field
                      label="Travels To Client Home"
                      value={
                        businessDetails?.travelsToClientHome
                          ? 'YES'
                          : 'NO'
                      }
                    />

                    <Field
                      label="Services Provided"
                      value={[
                        businessDetails?.provideFoodTesting &&
                          'Food Testing',
                        businessDetails?.provideDecoration &&
                          'Decoration',
                        businessDetails?.provideSoundSystem &&
                          'Sound System',
                        businessDetails?.provideSeatingArrangement &&
                          'Seating',
                        businessDetails?.provideWaiters &&
                          'Waiters',
                        businessDetails?.provideCutleryAndPlates &&
                          'Cutlery & Plates',
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          ', ',
                        )}
                    />
                  </>
                )}

                {category ===
                  'mehndi' && (
                  <>
                    <Field
                      label="Mehndi Type"
                      value={businessDetails?.mehndiType?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Staff Gender"
                      value={businessDetails?.staffGender?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="City Covered"
                      value={
                        businessDetails?.cityCovered
                      }
                    />

                    <Field
                      label="Travels To Client Home"
                      value={
                        businessDetails?.travelsToClientHome
                          ? 'YES'
                          : 'NO'
                      }
                    />
                  </>
                )}

                {category ===
                  'photographer' && (
                  <>
                    <Field
                      label="Photography Types"
                      value={businessDetails?.photographyTypes?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Equipment"
                      value={businessDetails?.equipment?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Editing Services"
                      value={businessDetails?.editingServices?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Photo Style"
                      value={businessDetails?.photoStyle?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Staff Gender"
                      value={businessDetails?.staffGender?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Delivery Time"
                      value={
                        businessDetails?.deliveryTime
                      }
                    />

                    <Field
                      label="City Covered"
                      value={
                        businessDetails?.cityCovered
                      }
                    />

                    <Field
                      label="Cancellation Policy"
                      value={
                        businessDetails?.covidRefundPolicy
                      }
                    />
                  </>
                )}

                {category ===
                  'salon' && (
                  <>
                    <Field
                      label="Type"
                      value={
                        businessDetails?.staffType
                      }
                    />

                    <Field
                      label="Expertise"
                      value={
                        businessDetails?.expertise
                      }
                    />

                    <Field
                      label="Staff Gender"
                      value={businessDetails?.staffGender?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="City Covered"
                      value={
                        businessDetails?.cityCovered
                      }
                    />

                    <Field
                      label="Travels To Client Home"
                      value={
                        businessDetails?.travelsToClientHome
                          ? 'YES'
                          : 'NO'
                      }
                    />
                  </>
                )}

                {category ===
                  'sound' && (
                  <>
                    <Field
                      label="Sound/DJ Type"
                      value={businessDetails?.soundType?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Equipment Provided"
                      value={businessDetails?.equipmentProvided?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Staff Gender"
                      value={businessDetails?.staffGender?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="City Covered"
                      value={
                        businessDetails?.cityCovered
                      }
                    />

                    <Field
                      label="Travels To Client Home"
                      value={
                        businessDetails?.travelsToClientHome
                          ? 'YES'
                          : 'NO'
                      }
                    />
                  </>
                )}

                {category ===
                  'venue' && (
                  <>
                    <Field
                      label="Venue Type"
                      value={businessDetails?.typeOfVenue?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Expertise"
                      value={
                        businessDetails?.expertise
                      }
                    />

                    <Field
                      label="Amenities"
                      value={
                        businessDetails?.amenities
                      }
                    />

                    <Field
                      label="Max People Capacity"
                      value={businessDetails?.maximumPeopleCapacity?.toString()}
                    />

                    <Field
                      label="Catering"
                      value={businessDetails?.catering?.join(
                        ', ',
                      )}
                    />

                    <Field
                      label="Parking"
                      value={
                        businessDetails?.parking
                          ? 'YES'
                          : 'NO'
                      }
                    />

                    <Field
                      label="Staff"
                      value={
                        businessDetails?.staff
                      }
                    />
                  </>
                )}

                {category !==
                  'photographer' && (
                  <Field
                    label="Cancellation Policy"
                    value={
                      businessDetails?.cancellationPolicy
                    }
                  />
                )}

                <Field
                  label="Down Payment"
                  value={
                    businessDetails?.downPaymentType
                      ? `${businessDetails.downPaymentType} - ${
                          businessDetails.downPayment ??
                          'N/A'
                        }`
                      : undefined
                  }
                />

                <Field
                  label="COVID Compliant"
                  value={
                    businessDetails?.covidCompliant
                  }
                />

                <Field
                  label="Description"
                  value={
                    businessDetails?.description
                  }
                />

                <Field
                  label="Additional Notes"
                  value={
                    businessDetails?.additionalInfo
                  }
                  isLast
                />
              </View>
            </View>
          )}

          {/* ================================================= */}
          {/* PACKAGES */}
          {/* ================================================= */}

          {activeTab ===
            'Packages' && (
            <View
              style={
                styles.detailsContainer
              }
            >
              {/* ================================================= */}
              {/* NORMAL BROWSE MODE - GENERAL AVAILABILITY */}
              {/* ================================================= */}

              {isBrowseMode && (
                <View
                  style={
                    styles.generalAvailabilityCard
                  }
                >
                  <View
                    style={
                      styles.generalAvailabilityHeader
                    }
                  >
                    <View
                      style={
                        styles.generalAvailabilityIcon
                      }
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={
                          PRIMARY
                        }
                      />
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.generalAvailabilityTitle
                        }
                      >
                        Vendor Availability
                      </Text>

                      <Text
                        style={
                          styles.generalAvailabilitySubtitle
                        }
                      >
                        Regular working
                        slots
                      </Text>
                    </View>

                    {availabilityLoading && (
                      <ActivityIndicator
                        size="small"
                        color={
                          PRIMARY
                        }
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.availabilityDivider
                    }
                  />

                  {availabilityLoading ? (
                    <View
                      style={
                        styles.generalLoadingBox
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color={
                          PRIMARY
                        }
                      />

                      <Text
                        style={
                          styles.generalLoadingText
                        }
                      >
                        Loading
                        availability...
                      </Text>
                    </View>
                  ) : weeklyVendorSlots.length >
                    0 ? (
                    <>
                      <Text
                        style={
                          styles.generalSectionLabel
                        }
                      >
                        Available
                        Slots
                      </Text>

                      <View
                        style={
                          styles.weeklySlotList
                        }
                      >
                        {weeklyVendorSlots.map(
                          (
                            slot,
                            index,
                          ) => (
                            <View
                              key={`${slot.day}-${slot.start}-${slot.end}-${index}`}
                              style={
                                styles.weeklySlotRow
                              }
                            >
                              <View
                                style={
                                  styles.weeklySlotDay
                                }
                              >
                                <Text
                                  style={
                                    styles.weeklySlotDayText
                                  }
                                >
                                  {slot.day ===
                                  'ALL'
                                    ? 'Daily'
                                    : slot.day}
                                </Text>
                              </View>

                              <View
                                style={
                                  styles.weeklySlotTime
                                }
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={15}
                                  color={
                                    PRIMARY
                                  }
                                />

                                <Text
                                  style={
                                    styles.weeklySlotTimeText
                                  }
                                >
                                  {formatTimeDisplay(
                                    slot.start,
                                  )}{' '}
                                  -{' '}
                                  {formatTimeDisplay(
                                    slot.end,
                                  )}
                                </Text>
                              </View>
                            </View>
                          ),
                        )}
                      </View>
                    </>
                  ) : (
                    <View
                      style={
                        styles.noGeneralAvailability
                      }
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color="#C0392B"
                      />

                      <Text
                        style={
                          styles.noGeneralAvailabilityText
                        }
                      >
                        Vendor has not
                        configured
                        working hours
                        yet.
                      </Text>
                    </View>
                  )}

         {/* Booking Notes */}
<View style={styles.bookingNotesBox}>
  <View style={styles.bookingNotesHeader}>
    <Ionicons
      name="information-circle-outline"
      size={17}
      color={PRIMARY}
    />

    <Text style={styles.bookingNotesTitle}>
      Booking Notes
    </Text>
  </View>

  {getBookingNoticeMinutes(
    vendorAvailability,
    eventDate,
  ) !== null ? (
    <Text style={styles.bookingNote}>
      • {formatBookingNotice(
        getBookingNoticeMinutes(
          vendorAvailability,
          eventDate,
        ) ?? undefined,
      )}
    </Text>
  ) : (
    <Text style={styles.bookingNote}>
      • No minimum advance booking notice specified.
    </Text>
  )}
</View>
                </View>
              )}

              {/* ================================================= */}
              {/* EVENT MODE - EVENT AVAILABILITY */}
              {/* ================================================= */}

              {hasEventTiming && (
                <View
                  style={
                    styles.availabilityCard
                  }
                >
                  <View
                    style={
                      styles.availabilityHeader
                    }
                  >
                    <View
                      style={
                        styles.availabilityHeaderLeft
                      }
                    >
                      <View
                        style={
                          styles.availabilityIconWrap
                        }
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={
                            PRIMARY
                          }
                        />
                      </View>

                      <View>
                        <Text
                          style={
                            styles.availabilityTitle
                          }
                        >
                          Vendor
                          Availability
                        </Text>

                        <Text
                          style={
                            styles.availabilitySubtitle
                          }
                        >
                          Based on
                          your selected
                          event
                        </Text>
                      </View>
                    </View>

                    {availabilityLoading && (
                      <ActivityIndicator
                        size="small"
                        color={
                          PRIMARY
                        }
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.availabilityDivider
                    }
                  />

                  {/* Event Date */}
                  <View
                    style={
                      styles.availabilityInfoRow
                    }
                  >
                    <View
                      style={
                        styles.availabilityLabelRow
                      }
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={
                          TEXT_MUTED
                        }
                      />

                      <Text
                        style={
                          styles.availabilityLabel
                        }
                      >
                        Event Date
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.availabilityValue
                      }
                    >
                      {eventDateDisplay}
                    </Text>
                  </View>

                  {/* Event Time */}
                  <View
                    style={
                      styles.availabilityInfoRow
                    }
                  >
                    <View
                      style={
                        styles.availabilityLabelRow
                      }
                    >
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color={
                          TEXT_MUTED
                        }
                      />

                      <Text
                        style={
                          styles.availabilityLabel
                        }
                      >
                        Event Time
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.availabilityValue
                      }
                    >
                      {formatTimeDisplay(
                        eventStartTime,
                      )}{' '}
                      -{' '}
                      {formatTimeDisplay(
                        eventEndTime,
                      )}
                    </Text>
                  </View>

                  {/* Vendor Slots */}
                  <View
                    style={
                      styles.vendorSlotsSection
                    }
                  >
                    <View
                      style={
                        styles.availabilityLabelRow
                      }
                    >
                      <Ionicons
                        name="business-outline"
                        size={15}
                        color={
                          TEXT_MUTED
                        }
                      />

                      <Text
                        style={
                          styles.availabilityLabel
                        }
                      >
                        Vendor
                        Availability
                      </Text>
                    </View>

                    {relevantVendorSlots.length >
                    0 ? (
                      <View
                        style={
                          styles.vendorSlotsList
                        }
                      >
                        {relevantVendorSlots.map(
                          (
                            slot,
                            index,
                          ) => (
                            <View
                              key={`${slot.start}-${slot.end}-${index}`}
                              style={
                                styles.vendorSlotChip
                              }
                            >
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color={
                                  PRIMARY
                                }
                              />

                              <Text
                                style={
                                  styles.vendorSlotText
                                }
                              >
                                {formatTimeDisplay(
                                  slot.start,
                                )}{' '}
                                -{' '}
                                {formatTimeDisplay(
                                  slot.end,
                                )}
                              </Text>
                            </View>
                          ),
                        )}
                      </View>
                    ) : (
                      <View
                        style={
                          styles.noVendorSlotBox
                        }
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={17}
                          color="#C0392B"
                        />

                        <Text
                          style={
                            styles.noVendorSlotText
                          }
                        >
                          Vendor is
                          not available
                          on this day.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Match Status */}
                  {!availabilityLoading && (
                    <View
                      style={
                        availabilityCheck?.available
                          ? styles.availableStatus
                          : styles.unavailableStatus
                      }
                    >
                      <Ionicons
                        name={
                          availabilityCheck?.available
                            ? 'checkmark-circle'
                            : 'close-circle'
                        }
                        size={20}
                        color={
                          availabilityCheck?.available
                            ? '#2E9D63'
                            : '#C0392B'
                        }
                      />

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={
                            availabilityCheck?.available
                              ? styles.availableStatusText
                              : styles.unavailableStatusText
                          }
                        >
                          {availabilityCheck?.available
                            ? 'Perfect Match'
                            : 'Not Available'}
                        </Text>

                        <Text
                          style={
                            styles.availabilityStatusSubtext
                          }
                        >
                          {availabilityCheck?.available
                            ? 'This vendor can cover your selected event time.'
                            : availabilityCheck?.reason ||
                              'This vendor cannot cover your selected event time.'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Packages title */}
              <Text
                style={
                  styles.packagesSectionTitle
                }
              >
                Available Packages
              </Text>

              {!vendorData?.packages ||
              vendorData
                .packages
                .length === 0 ? (
                <View
                  style={
                    styles.noPackagesBox
                  }
                >
                  <Ionicons
                    name="cube-outline"
                    size={36}
                    color="#C9A9BE"
                  />

                  <Text
                    style={
                      styles.noPackagesTitle
                    }
                  >
                    No Packages
                    Available
                  </Text>

                  <Text
                    style={
                      styles.noPackagesText
                    }
                  >
                    This vendor
                    has not added
                    any packages
                    yet.
                  </Text>
                </View>
              ) : (
                <>
                  {/* ----------------------------------------- */}
                  {/* Package Selector */}
                  {/* ----------------------------------------- */}

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    style={
                      styles.packageTabContainer
                    }
                    contentContainerStyle={{
                      paddingRight: 8,
                    }}
                  >
                    {vendorData.packages.map(
                      (
                        pkg: any,
                      ) => {
                        const isActive =
                          String(
                            activePackage,
                          ) ===
                          String(
                            pkg._id,
                          );

                        return (
                          <TouchableOpacity
                            key={
                              pkg._id
                            }
                            style={[
                              styles.packageCard,
                              isActive &&
                                styles.activePackageCard,
                            ]}
                            onPress={() =>
                              handlePackageSelect(
                                pkg._id,
                              )
                            }
                            activeOpacity={
                              0.85
                            }
                          >
                            <View
                              style={[
                                styles.packageCardIconWrap,
                                isActive &&
                                  styles.packageCardIconWrapActive,
                              ]}
                            >
                              <Ionicons
                                name="gift-outline"
                                size={18}
                                color={
                                  isActive
                                    ? '#FFFFFF'
                                    : PRIMARY
                                }
                              />
                            </View>

                            <Text
                              style={[
                                styles.packageCardName,
                                isActive &&
                                  styles.packageCardNameActive,
                              ]}
                              numberOfLines={
                                2
                              }
                            >
                              {pkg.packageName ||
                                'Package'}
                            </Text>

                            <Text
                              style={[
                                styles.packageCardPrice,
                                isActive &&
                                  styles.packageCardPriceActive,
                              ]}
                            >
                              Rs.{' '}
                              {Number(
                                pkg.price ||
                                  0,
                              ).toLocaleString()}
                            </Text>

                            {isActive && (
                              <View
                                style={
                                  styles.activeDot
                                }
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={10}
                                  color="#FFFFFF"
                                />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </ScrollView>

                  {/* ----------------------------------------- */}
                  {/* Selected Package */}
                  {/* ----------------------------------------- */}

                  {selectedPackage && (
                    <View
                      style={[
                        styles.card,
                        styles.packageDetailsCreative,
                      ]}
                    >
                      {/* Header */}

                      <View
                        style={
                          styles.packageDetailsHeader
                        }
                      >
                        <View
                          style={
                            styles.packageDetailsHeaderLeft
                          }
                        >
                          <View
                            style={
                              styles.packageBadgeIcon
                            }
                          >
                            <Ionicons
                              name="gift-outline"
                              size={20}
                              color="#FFFFFF"
                            />
                          </View>

                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={
                                styles.packageDetailsName
                              }
                            >
                              {
                                selectedPackage.packageName
                              }
                            </Text>

                            <Text
                              style={
                                styles.packageDetailsTag
                              }
                            >
                              Vendor
                              Package
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={
                          styles.packageDivider
                        }
                      />

                      {/* Package Images */}

                      {Array.isArray(
                        selectedPackage.images,
                      ) &&
                        selectedPackage
                          .images
                          .length >
                          0 && (
                          <View
                            style={
                              styles.packageImagesSection
                            }
                          >
                            <View
                              style={
                                styles.sectionTitleWithIcon
                              }
                            >
                              <Ionicons
                                name="images-outline"
                                size={16}
                                color={
                                  PRIMARY
                                }
                              />

                              <Text
                                style={
                                  styles.servicesLabel
                                }
                              >
                                Package
                                Images
                              </Text>
                            </View>

                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={
                                false
                              }
                              contentContainerStyle={
                                styles.packageImagesRow
                              }
                            >
                              {selectedPackage.images.map(
                                (
                                  image: string,
                                  index: number,
                                ) => (
                                  <Image
                                    key={`${image}-${index}`}
                                    source={{
                                      uri: image,
                                    }}
                                    style={
                                      styles.packageDetailImage
                                    }
                                    resizeMode="cover"
                                  />
                                ),
                              )}
                            </ScrollView>
                          </View>
                        )}

                      {/* Description */}

                      <View
                        style={
                          styles.packageInfoSection
                        }
                      >
                        <View
                          style={
                            styles.sectionTitleWithIcon
                          }
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={16}
                            color={
                              PRIMARY
                            }
                          />

                          <Text
                            style={
                              styles.servicesLabel
                            }
                          >
                            Description
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.packageDetailItem
                          }
                        >
                          {selectedPackage.description?.trim()
                            ? selectedPackage.description
                            : 'No description provided.'}
                        </Text>
                      </View>

                      {/* Services */}

                      <View
                        style={
                          styles.packageInfoSection
                        }
                      >
                        <View
                          style={
                            styles.sectionTitleWithIcon
                          }
                        >
                          <Ionicons
                            name="list-outline"
                            size={16}
                            color={
                              PRIMARY
                            }
                          />

                          <Text
                            style={
                              styles.servicesLabel
                            }
                          >
                            What's
                            Included
                          </Text>
                        </View>

                        <Text
                          testID="package-services"
                          style={
                            styles.packageDetailItem
                          }
                        >
                          {selectedPackage.services ||
                            'N/A'}
                        </Text>
                      </View>

                      {/* Fixed Duration */}

                      <View
                        style={
                          styles.packageInfoSection
                        }
                      >
                        <View
                          style={
                            styles.sectionTitleWithIcon
                          }
                        >
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color={
                              PRIMARY
                            }
                          />

                          <Text
                            style={
                              styles.servicesLabel
                            }
                          >
                            Fixed
                            Duration
                            Options
                          </Text>
                        </View>

                        {Array.isArray(
                          selectedPackage.durations,
                        ) &&
                        selectedPackage
                          .durations
                          .length >
                          0 ? (
                          <View
                            style={
                              styles.durationList
                            }
                          >
                            {selectedPackage.durations.map(
                              (
                                duration: any,
                                index: number,
                              ) => {
                                const isDays =
                                  duration.unit ===
                                  'DAYS';

                                const unit =
                                  isDays
                                    ? 'day'
                                    : 'hour';

                                const displayUnit =
                                  Number(
                                    duration.value,
                                  ) ===
                                  1
                                    ? unit
                                    : `${unit}s`;

                                return (
                                  <View
                                    key={`${selectedPackage._id}-duration-${index}`}
                                    style={
                                      styles.durationCard
                                    }
                                  >
                                    <View
                                      style={
                                        styles.durationLeft
                                      }
                                    >
                                      <View
                                        style={
                                          styles.durationIcon
                                        }
                                      >
                                        <Ionicons
                                          name={
                                            isDays
                                              ? 'calendar-outline'
                                              : 'time-outline'
                                          }
                                          size={16}
                                          color={
                                            PRIMARY
                                          }
                                        />
                                      </View>

                                      <View>
                                        <Text
                                          style={
                                            styles.durationValue
                                          }
                                        >
                                          {
                                            duration.value
                                          }{' '}
                                          {
                                            displayUnit
                                          }
                                        </Text>

                                        <Text
                                          style={
                                            styles.durationType
                                          }
                                        >
                                          Fixed
                                          duration
                                        </Text>
                                      </View>
                                    </View>

                                    <Text
                                      style={
                                        styles.durationPrice
                                      }
                                    >
                                      Rs.{' '}
                                      {Number(
                                        duration.price ||
                                          0,
                                      ).toLocaleString()}
                                    </Text>
                                  </View>
                                );
                              },
                            )}
                          </View>
                        ) : (
                          <Text
                            style={
                              styles.noDurationText
                            }
                          >
                            No fixed
                            durations
                            available.
                          </Text>
                        )}
                      </View>

                      {/* Custom Duration */}

                      <View
                        style={
                          styles.packageInfoSection
                        }
                      >
                        <View
                          style={
                            styles.sectionTitleWithIcon
                          }
                        >
                          <Ionicons
                            name="options-outline"
                            size={16}
                            color={
                              PRIMARY
                            }
                          />

                          <Text
                            style={
                              styles.servicesLabel
                            }
                          >
                            Custom
                            Duration
                          </Text>
                        </View>

                        {selectedPackage.allowCustomDuration ? (
                          <View
                            style={
                              styles.customDurationBox
                            }
                          >
                            <View
                              style={
                                styles.customDurationHeader
                              }
                            >
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color="#2E9D63"
                              />

                              <Text
                                style={
                                  styles.customDurationTitle
                                }
                              >
                                Custom
                                Duration
                                Available
                              </Text>
                            </View>

                            <Text
                              style={
                                styles.customDurationText
                              }
                            >
                              Rate: Rs.{' '}
                              {Number(
                                selectedPackage.customDurationRate ||
                                  0,
                              ).toLocaleString()}
                              /
                              {selectedPackage.customDurationUnit ===
                              'DAYS'
                                ? 'day'
                                : 'hour'}
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={
                              styles.customDurationDisabled
                            }
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={20}
                              color="#999"
                            />

                            <Text
                              style={
                                styles.customDurationDisabledText
                              }
                            >
                              Custom
                              duration is
                              not
                              available
                              for this
                              package.
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Price + Cart */}

                      <View
                        style={
                          styles.packagePriceFooter
                        }
                      >
                        <View>
                          <Text
                            style={
                              styles.priceFooterLabel
                            }
                          >
                            Starting
                            Price
                          </Text>

                          <Text
                            testID="package-price"
                            style={
                              styles.priceText
                            }
                          >
                            Rs.{' '}
                            {Number(
                              selectedPackage.price ||
                                0,
                            ).toLocaleString()}
                            /-
                          </Text>
                        </View>

                        {isEventMode &&
                          (
                            availabilityCheck?.available
                          ) && (
                            <TouchableOpacity
                              testID={`add-to-cart-${selectedPackage._id}`}
                              style={
                                styles.cartButton
                              }
                              onPress={() =>
                                handleAddToCart(
                                  selectedPackage,
                                )
                              }
                              activeOpacity={
                                0.85
                              }
                            >
                              <Ionicons
                                name="cart-outline"
                                size={14}
                                color="#FFFFFF"
                              />

                              <Text
                                style={
                                  styles.cartButtonText
                                }
                              >
                                Add to Cart
                              </Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* ================================================= */}
          {/* REVIEWS */}
          {/* ================================================= */}

          {activeTab ===
            'Reviews' && (
            <View
              style={
                styles.tabContent
              }
            >
              {summaryLoading ? (
                <View
                  style={
                    styles.summaryLoadingBox
                  }
                >
                  <ActivityIndicator
                    testID="summary-loading-indicator"
                    size="small"
                    color={
                      PRIMARY
                    }
                  />
                </View>
              ) : reviewSummary ? (
                <View
                  testID="review-summary-card"
                  style={
                    styles.summaryCard
                  }
                >
                  <Text
                    style={
                      styles.summaryHeading
                    }
                  >
                    Ratings &
                    Reviews (
                    {
                      reviewSummary.totalReviews
                    }
                    )
                  </Text>

                  <View
                    style={
                      styles.summaryTopRow
                    }
                  >
                    <Text
                      testID="average-rating-value"
                      style={
                        styles.averageRatingText
                      }
                    >
                      {reviewSummary.totalReviews >
                      0
                        ? reviewSummary.averageRating.toFixed(
                            1,
                          )
                        : '0.0'}
                    </Text>

                    <View
                      style={{
                        flexDirection:
                          'row',
                        marginLeft: 8,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map(
                        (star) => (
                          <Ionicons
                            key={
                              star
                            }
                            name={
                              reviewSummary.averageRating >=
                              star
                                ? 'star'
                                : reviewSummary.averageRating >=
                                  star -
                                    0.5
                                ? 'star-half'
                                : 'star-outline'
                            }
                            size={18}
                            color="#FFD700"
                          />
                        ),
                      )}
                    </View>
                  </View>

                  {reviewSummary.totalReviews >
                    0 && (
                    <View
                      style={
                        styles.breakdownContainer
                      }
                    >
                      {(
                        [
                          5,
                          4,
                          3,
                          2,
                          1,
                        ] as const
                      ).map(
                        (
                          star,
                        ) => {
                          const count =
                            reviewSummary
                              .ratingBreakdown[
                              star
                            ];

                          const pct =
                            reviewSummary.totalReviews >
                            0
                              ? (count /
                                  reviewSummary.totalReviews) *
                                100
                              : 0;

                          return (
                            <View
                              key={
                                star
                              }
                              style={
                                styles.breakdownRow
                              }
                              testID={`breakdown-row-${star}`}
                            >
                              <Text
                                style={
                                  styles.breakdownStarLabel
                                }
                              >
                                {star}{' '}
                                ★
                              </Text>

                              <View
                                style={
                                  styles.breakdownBarTrack
                                }
                              >
                                <View
                                  style={[
                                    styles.breakdownBarFill,
                                    {
                                      width: `${pct}%`,
                                    },
                                  ]}
                                />
                              </View>

                              <Text
                                style={
                                  styles.breakdownCount
                                }
                              >
                                {
                                  count
                                }
                              </Text>
                            </View>
                          );
                        },
                      )}
                    </View>
                  )}
                </View>
              ) : null}

              {/* Filters */}

              <View
                style={
                  styles.reviewControls
                }
              >
                <Text
                  style={
                    styles.reviewControlTitle
                  }
                >
                  Filter Reviews
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.filterRow
                  }
                  testID="review-filter-chips"
                >
                  {[
                    {
                      label:
                        'All',
                      value:
                        'all',
                    },
                    {
                      label:
                        'With Media',
                      value:
                        'withMedia',
                    },
                    {
                      label:
                        '5 Stars',
                      value: 5,
                    },
                    {
                      label:
                        '4 Stars',
                      value: 4,
                    },
                    {
                      label:
                        '3 Stars',
                      value: 3,
                    },
                    {
                      label:
                        '2 Stars',
                      value: 2,
                    },
                    {
                      label:
                        '1 Star',
                      value: 1,
                    },
                  ].map(
                    (
                      option,
                    ) => (
                      <TouchableOpacity
                        key={String(
                          option.value,
                        )}
                        testID={`filter-chip-${option.value}`}
                        style={[
                          styles.filterChip,
                          activeFilter ===
                            option.value &&
                            styles.filterChipActive,
                        ]}
                        onPress={() =>
                          handleFilterChange(
                            option.value as any,
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            activeFilter ===
                              option.value &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          {
                            option.label
                          }
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </ScrollView>

                <TouchableOpacity
                  testID="sort-by-trigger"
                  style={
                    styles.sortByRow
                  }
                  onPress={() =>
                    setSortModalVisible(
                      true,
                    )
                  }
                >
                  <Text
                    style={
                      styles.sortByLabel
                    }
                  >
                    Sort By:{' '}
                    <Text
                      style={
                        styles.sortByValue
                      }
                    >
                      {
                        sortLabels[
                          activeSort
                        ]
                      }
                    </Text>
                  </Text>

                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color="#7A7A7A"
                  />
                </TouchableOpacity>
              </View>

              <Modal
                testID="sort-modal"
                transparent
                animationType="fade"
                visible={
                  sortModalVisible
                }
                onRequestClose={() =>
                  setSortModalVisible(
                    false,
                  )
                }
              >
                <TouchableOpacity
                  style={
                    styles.sortModalBackdrop
                  }
                  activeOpacity={1}
                  onPress={() =>
                    setSortModalVisible(
                      false,
                    )
                  }
                >
                  <View
                    style={
                      styles.sortModalContent
                    }
                  >
                    {(
                      Object.keys(
                        sortLabels,
                      ) as ReviewSort[]
                    ).map(
                      (
                        option,
                      ) => (
                        <TouchableOpacity
                          key={
                            option
                          }
                          testID={`sort-option-${option}`}
                          style={
                            styles.sortOptionRow
                          }
                          onPress={() => {
                            setActiveSort(
                              option,
                            );
                            setReviewsPage(
                              1,
                            );
                            setHasMoreReviews(
                              true,
                            );
                            setSortModalVisible(
                              false,
                            );
                          }}
                        >
                          <Text
                            style={[
                              styles.sortOptionText,
                              activeSort ===
                                option &&
                                styles.sortOptionTextActive,
                            ]}
                          >
                            {
                              sortLabels[
                                option
                              ]
                            }
                          </Text>

                          {activeSort ===
                            option && (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color={
                                PRIMARY
                              }
                            />
                          )}
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </TouchableOpacity>
              </Modal>

              {reviewsLoading && (
                <View
                  style={
                    styles.loadingReviewsBox
                  }
                  testID="reviews-loading-state"
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      PRIMARY
                    }
                  />

                  <Text
                    style={
                      styles.loadingReviewsText
                    }
                  >
                    Loading
                    reviews...
                  </Text>
                </View>
              )}

              {reviewsError &&
                !reviewsLoading && (
                  <View
                    style={
                      styles.errorStateBox
                    }
                    testID="reviews-error-state"
                  >
                    <Ionicons
                      name="cloud-offline-outline"
                      size={28}
                      color="#C0392B"
                    />

                    <Text
                      style={
                        styles.errorStateText
                      }
                    >
                      {
                        reviewsError
                      }
                    </Text>

                    <TouchableOpacity
                      testID="retry-reviews-button"
                      style={
                        styles.retryButton
                      }
                      onPress={() =>
                        fetchReviews(
                          1,
                          false,
                        )
                      }
                    >
                      <Text
                        style={
                          styles.retryButtonText
                        }
                      >
                        Retry
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              {!reviewsLoading &&
                !reviewsError &&
                reviews.length ===
                  0 && (
                  <View
                    style={
                      styles.emptyStateBox
                    }
                    testID="no-reviews-empty-state"
                  >
                    <Text
                      style={
                        styles.emptyStateTitle
                      }
                    >
                      No reviews
                      yet.
                    </Text>

                    <Text
                      style={
                        styles.emptyStateSubtitle
                      }
                    >
                      Be the first
                      to review
                      this vendor.
                    </Text>
                  </View>
                )}

              {!reviewsLoading &&
                !reviewsError &&
                reviews.map(
                  (review) => (
                    <ReviewCard
                      key={
                        review._id
                      }
                      review={
                        review
                      }
                      onMediaPress={(
                        _,
                        index,
                      ) =>
                        openMediaViewer(
                          review,
                          index,
                        )
                      }
                    />
                  ),
                )}

              {!reviewsLoading &&
                !reviewsError &&
                reviews.length >
                  0 &&
                !hasMoreReviews && (
                  <Text
                    style={
                      styles.noMoreReviewsText
                    }
                  >
                    You have reached
                    the end of the
                    reviews.
                  </Text>
                )}

              {!reviewsLoading &&
                !reviewsError &&
                reviews.length >
                  0 &&
                hasMoreReviews && (
                  <TouchableOpacity
                    testID="load-more-reviews-button"
                    style={
                      styles.loadMoreButton
                    }
                    onPress={
                      loadMoreReviews
                    }
                    disabled={
                      loadingMore
                    }
                  >
                    {loadingMore ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={
                            PRIMARY
                          }
                        />

                        <Text
                          style={
                            styles.loadMoreButtonText
                          }
                        >
                          Loading
                          more...
                        </Text>
                      </>
                    ) : (
                      <Text
                        style={
                          styles.loadMoreButtonText
                        }
                      >
                        Load More
                        Reviews
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

              {/* Add Review */}

              <View
                style={
                  styles.addReviewContainer
                }
              >
                <Text
                  style={{
                    fontWeight:
                      'bold',
                    marginBottom: 6,
                  }}
                >
                  Rate this
                  vendor:
                </Text>

                <View
                  style={{
                    flexDirection:
                      'row',
                    marginBottom: 12,
                  }}
                >
                  {[1, 2, 3, 4, 5].map(
                    (star) => (
                      <TouchableOpacity
                        key={
                          star
                        }
                        onPress={() =>
                          setRating(
                            star,
                          )
                        }
                      >
                        <Ionicons
                          name={
                            rating &&
                            rating >=
                              star
                              ? 'star'
                              : 'star-outline'
                          }
                          size={28}
                          color="#FFD700"
                          style={{
                            marginRight: 6,
                          }}
                          testID={`rating-star-${star}`}
                        />
                      </TouchableOpacity>
                    ),
                  )}
                </View>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Write a
                  Review
                </Text>

                <TextInput
                  testID="review-input"
                  placeholder="Write your review here..."
                  multiline
                  value={
                    newReview
                  }
                  onChangeText={
                    setNewReview
                  }
                  onFocus={() => {
                    setTimeout(
                      () => {
                        scrollViewRef.current?.scrollToEnd(
                          {
                            animated: true,
                          },
                        );
                      },
                      300,
                    );
                  }}
                  style={
                    styles.reviewInput
                  }
                />

                <Text
                  style={
                    styles.mediaLabel
                  }
                >
                  Add Photos
                  (optional)
                </Text>

                <TouchableOpacity
                  testID="pick-media-button"
                  style={[
                    styles.pickMediaButton,
                    uploadingMedia &&
                      styles.uploadingMediaButton,
                  ]}
                  onPress={
                    handlePickMedia
                  }
                  disabled={
                    uploadingMedia
                  }
                >
                  {uploadingMedia ? (
                    <View
                      style={
                        styles.uploadProgressContainer
                      }
                    >
                      <View
                        style={
                          styles.uploadProgressHeader
                        }
                      >
                        <View
                          style={
                            styles.uploadProgressTitleRow
                          }
                        >
                          <ActivityIndicator
                            size="small"
                            color={
                              PRIMARY
                            }
                            testID="media-upload-loading"
                          />

                          <Text
                            style={
                              styles.uploadProgressText
                            }
                          >
                            Uploading
                            media...
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.uploadPercentage
                          }
                        >
                          {
                            uploadProgress
                          }
                          %
                        </Text>
                      </View>

                      <View
                        style={
                          styles.progressBarBackground
                        }
                      >
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
                        color={
                          PRIMARY
                        }
                      />

                      <Text
                        style={
                          styles.pickMediaButtonText
                        }
                      >
                        Upload
                        Photos /
                        Videos
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {selectedMedia.length >
                  0 && (
                  <View
                    style={
                      styles.selectedMediaRow
                    }
                    testID="selected-media-preview"
                  >
                    {selectedMedia.map(
                      (
                        item,
                        index,
                      ) => (
                        <View
                          key={`${item.url}-${index}`}
                          style={
                            styles.selectedMediaThumbWrapper
                          }
                        >
                          <Image
                            source={{
                              uri: item.url,
                            }}
                            style={
                              styles.selectedMediaThumb
                            }
                          />

                          <TouchableOpacity
                            testID={`remove-media-${index}`}
                            style={
                              styles.removeMediaButton
                            }
                            onPress={() =>
                              removeSelectedMedia(
                                index,
                              )
                            }
                          >
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#C0392B"
                            />
                          </TouchableOpacity>
                        </View>
                      ),
                    )}
                  </View>
                )}

                <TouchableOpacity
                  testID="submit-review-button"
                  onPress={
                    handleSubmitReview
                  }
                  style={
                    styles.submitButton
                  }
                >
                  <Text
                    style={
                      styles.submitButtonText
                    }
                  >
                    Submit
                    Review
                  </Text>
                </TouchableOpacity>
              </View>

              <MediaViewerModal
                visible={
                  viewerVisible
                }
                media={
                  viewerMedia
                }
                initialIndex={
                  viewerIndex
                }
                onClose={() =>
                  setViewerVisible(
                    false,
                  )
                }
              />
            </View>
          )}

          <View
            style={{
              height: 24,
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

// ---------------------------------------------------------
// Field helper
// ---------------------------------------------------------

const Field: React.FC<{
  label: string;
  value?: string | null;
  isLast?: boolean;
}> = ({
  label,
  value,
  isLast,
}) => (
  <>
    <View
      style={
        styles.divider
      }
    />

    <View
      style={
        styles.detailBlock
      }
    >
      <Text
        style={
          styles.detailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailValue
        }
      >
        {value &&
        value.length > 0
          ? value
          : 'N/A'}
      </Text>
    </View>

    {isLast && (
      <View
        style={{
          height: 2,
        }}
      />
    )}
  </>
);

// ---------------------------------------------------------
// Styles
// ---------------------------------------------------------

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
    backgroundColor: BG,
  },

  coverWrapper: {
    width: '100%',
    height: 230,
    position: 'relative',
    backgroundColor: '#000',
  },

  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor:
      'rgba(0,0,0,0.28)',
  },

  header: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  backIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
    marginHorizontal: 8,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginTop: -22,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
    zIndex: 5,
  },

  tab: {
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
  },

  activeTab: {
    backgroundColor: PRIMARY_SOFT,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MUTED,
  },

  activeTabText: {
    color: PRIMARY,
    fontWeight: '700',
  },

  detailsContainer: {
    padding: 16,
    gap: 14,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
    borderWidth: 1,
    borderColor: BORDER,
  },

  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems:
      'flex-start',
  },

  priceBadge: {
    backgroundColor:
      PRIMARY_SOFT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems:
      'flex-end',
  },

  name: {
    fontSize: 21,
    fontWeight: '800',
    color: TEXT_DARK,
    flex: 1,
    marginRight: 10,
  },

  price: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
  },

  perHead: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },

  address: {
    fontSize: 13,
    color: TEXT_MUTED,
    flex: 1,
  },

  photosSection: {
    paddingBottom: 12,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor:
      '#F3D9EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  photoCountBadge: {
    backgroundColor:
      '#F3D9EC',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },

  photoCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY,
  },

  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  seeAllLink: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '700',
  },

  photoContainer: {
    flexDirection: 'row',
  },

  photoContainerContent: {
    paddingVertical: 4,
    paddingRight: 8,
  },

  photoWrapper: {
    marginRight: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  photo: {
    width: 104,
    height: 104,
    borderRadius: 12,
    backgroundColor:
      '#EEE',
  },

  noPhotosBox: {
    alignItems: 'center',
    justifyContent:
      'center',
    paddingVertical: 28,
    backgroundColor:
      '#FBF6FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor:
      '#F1D5E8',
    borderStyle: 'dashed',
  },

  noPhotosText: {
    fontSize: 13,
    color: '#8A7A85',
    marginTop: 8,
    fontWeight: '600',
  },

  detailsHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  detailBlock: {
    paddingVertical: 8,
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  detailValue: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 19,
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
  },

  /* =============================== */
  /* GENERAL VENDOR AVAILABILITY */
  /* =============================== */

  generalAvailabilityCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  generalAvailabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  generalAvailabilityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  generalAvailabilityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  generalAvailabilitySubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  generalLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  generalLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: TEXT_MUTED,
  },

  generalSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_MUTED,
    marginBottom: 8,
  },

  weeklySlotList: {
    gap: 8,
  },

  weeklySlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      '#FBF7FA',
    borderWidth: 1,
    borderColor:
      '#F0DDE9',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },

  weeklySlotDay: {
    width: 48,
  },

  weeklySlotDayText: {
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY,
  },

  weeklySlotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  weeklySlotTimeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  noGeneralAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      '#FFF5F4',
    borderWidth: 1,
    borderColor:
      '#F2D2CF',
    borderRadius: 12,
    padding: 10,
  },

  noGeneralAvailabilityText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    color: '#C0392B',
    fontWeight: '600',
  },

  bookingNotesBox: {
    marginTop: 14,
    backgroundColor:
      '#FAF6F9',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },

  bookingNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  bookingNotesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_DARK,
    marginLeft: 6,
  },

  bookingNote: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginTop: 3,
  },

  /* =============================== */
  /* EVENT AVAILABILITY */
  /* =============================== */

  availabilityCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  availabilityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  availabilityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor:
      PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  availabilityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  availabilitySubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  availabilityDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 13,
  },

  availabilityInfoRow: {
    marginBottom: 12,
  },

  availabilityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  availabilityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
  },

  availabilityValue: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
    marginTop: 5,
    marginLeft: 21,
  },

  vendorSlotsSection: {
    marginTop: 2,
  },

  vendorSlotsList: {
    marginTop: 8,
    gap: 8,
  },

  vendorSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      '#FBF7FA',
    borderWidth: 1,
    borderColor:
      '#F0DDE9',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },

  vendorSlotText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    marginLeft: 7,
  },

  noVendorSlotBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor:
      '#FFF5F4',
    borderWidth: 1,
    borderColor:
      '#F2D2CF',
    borderRadius: 12,
    padding: 10,
  },

  noVendorSlotText: {
    flex: 1,
    fontSize: 12,
    color: '#C0392B',
    fontWeight: '600',
    marginLeft: 7,
  },

  availableStatus: {
    flexDirection: 'row',
    alignItems:
      'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor:
      '#F4FBF6',
    borderWidth: 1,
    borderColor:
      '#D8EBDD',
    borderRadius: 13,
  },

  unavailableStatus: {
    flexDirection: 'row',
    alignItems:
      'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor:
      '#FFF5F4',
    borderWidth: 1,
    borderColor:
      '#F2D2CF',
    borderRadius: 13,
  },

  availableStatusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E6E4B',
    marginLeft: 8,
  },

  unavailableStatusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C0392B',
    marginLeft: 8,
  },

  availabilityStatusSubtext: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    lineHeight: 17,
    marginTop: 3,
    marginLeft: 8,
  },

  /* Package */

  packagesSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 10,
  },

  packageTabContainer: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  packageCard: {
    width: 140,
    minHeight: 122,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    position: 'relative',
  },

  activePackageCard: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  packageCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor:
      PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  packageCardIconWrapActive: {
    backgroundColor:
      'rgba(255,255,255,0.2)',
  },

  packageCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },

  packageCardNameActive: {
    color: '#FFFFFF',
  },

  packageCardPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },

  packageCardPriceActive: {
    color:
      'rgba(255,255,255,0.85)',
  },

  activeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor:
      'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  packageDetailsCreative: {
    marginTop: 4,
    padding: 0,
    overflow: 'hidden',
  },

  packageDetailsHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    padding: 16,
  },

  packageDetailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  packageBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  packageDetailsName: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  packageDetailsTag: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  packageDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 16,
  },

  packageImagesSection: {
    padding: 16,
    paddingBottom: 6,
  },

  packageImagesRow: {
    paddingTop: 10,
    paddingRight: 8,
  },

  packageDetailImage: {
    width: 150,
    height: 105,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor:
      '#F3E8F0',
  },

  packageInfoSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  servicesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  packageDetailItem: {
    fontSize: 13,
    marginTop: 6,
    marginBottom: 6,
    color: TEXT_MUTED,
    lineHeight: 19,
  },

  durationList: {
    marginTop: 10,
    gap: 8,
  },

  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    backgroundColor:
      '#FBF7FA',
    borderWidth: 1,
    borderColor:
      '#F0DDE9',
    borderRadius: 14,
    padding: 11,
  },

  durationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  durationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  durationValue: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  durationType: {
    fontSize: 10.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  durationPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
    marginLeft: 8,
  },

  noDurationText: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    marginTop: 8,
  },

  customDurationBox: {
    marginTop: 8,
    backgroundColor:
      '#F4FBF6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      '#D8EBDD',
    padding: 12,
  },

  customDurationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  customDurationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E6E4B',
    marginLeft: 8,
  },

  customDurationText: {
    fontSize: 12.5,
    color: '#587364',
    marginTop: 7,
    marginLeft: 28,
  },

  customDurationDisabled: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      '#F8F5F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      '#E8E0E5',
    padding: 12,
  },

  customDurationDisabledText: {
    flex: 1,
    fontSize: 12.5,
    color: TEXT_MUTED,
    marginLeft: 8,
    lineHeight: 18,
  },

  packagePriceFooter: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    backgroundColor:
      PRIMARY_SOFT,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  priceFooterLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 2,
  },

  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY,
  },

  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: PRIMARY,
    borderRadius: 20,
  },

  cartButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  noPackagesBox: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  noPackagesTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  noPackagesText: {
    marginTop: 5,
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },

  /* General */

  loadingContainer: {
    flex: 1,
    justifyContent:
      'center',
    alignItems: 'center',
    backgroundColor: BG,
    gap: 10,
  },

  loadingText: {
    color: TEXT_MUTED,
    fontSize: 13,
  },

  errorContainer: {
    flex: 1,
    justifyContent:
      'center',
    alignItems: 'center',
    backgroundColor: BG,
    padding: 24,
  },

  errorText: {
    fontSize: 15,
    color: '#D64545',
    textAlign: 'center',
    fontWeight: '600',
  },

  /* Reviews */

  tabContent: {
    padding: 16,
  },

  summaryLoadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  summaryHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },

  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  averageRatingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PRIMARY,
  },

  breakdownContainer: {
    marginTop: 4,
  },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  breakdownStarLabel: {
    width: 32,
    fontSize: 12,
    color: '#7A7A7A',
  },

  breakdownBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor:
      '#E0E0E0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },

  breakdownBarFill: {
    height: '100%',
    backgroundColor:
      '#FFC107',
    borderRadius: 4,
  },

  breakdownCount: {
    width: 28,
    fontSize: 12,
    color: '#7A7A7A',
    textAlign: 'right',
  },

  reviewControls: {
    marginBottom: 8,
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
    borderColor: '#E0E0E0',
    backgroundColor:
      '#FFFFFF',
    marginRight: 8,
  },

  filterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  sortByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'flex-end',
    paddingVertical: 10,
    marginBottom: 8,
  },

  sortByLabel: {
    fontSize: 13,
    color: '#7A7A7A',
    marginRight: 4,
  },

  sortByValue: {
    color: PRIMARY,
    fontWeight: 'bold',
  },

  sortModalBackdrop: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.4)',
    justifyContent:
      'flex-end',
  },

  sortModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  sortOptionRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      '#F0F0F0',
  },

  sortOptionText: {
    fontSize: 15,
    color: '#333',
  },

  sortOptionTextActive: {
    color: PRIMARY,
    fontWeight: 'bold',
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
    borderColor: PRIMARY,
  },

  retryButtonText: {
    color: PRIMARY,
    fontWeight: 'bold',
    fontSize: 13,
  },

  noMoreReviewsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginVertical: 16,
  },

  loadMoreButton: {
    minHeight: 42,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: 'center',
    marginVertical: 16,
  },

  loadMoreButtonText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
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
    borderColor: PRIMARY,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 10,
  },

  uploadingMediaButton: {
    paddingVertical: 12,
  },

  pickMediaButtonText: {
    color: PRIMARY,
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 13,
  },

  uploadProgressContainer: {
    width: '100%',
  },

  uploadProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
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
    color: PRIMARY,
  },

  uploadPercentage: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY,
  },

  progressBarBackground: {
    width: '100%',
    height: 7,
    backgroundColor:
      '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 4,
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
    backgroundColor:
      '#E0E0E0',
  },

  removeMediaButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor:
      '#FFFFFF',
    borderRadius: 10,
  },

  reviewInput: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    marginBottom: 12,
    backgroundColor:
      '#FAFAFA',
    textAlignVertical:
      'top',
  },

  submitButton: {
    backgroundColor: PRIMARY,
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