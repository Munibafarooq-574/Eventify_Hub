
import getVendorReviews from '@/services/getAllReviewsForVendor';
import postVendorReview from '@/services/postVendorReview';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useGlobalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Toast from 'react-native-toast-message';


const PhotographerDetailsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Details' | 'Packages' | 'Reviews'>('Details');
  const [activePackage, setActivePackage] = useState<number | null>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<'Eventify' | 'Google'>('Eventify');
  const [vendorData, setVendorData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { id } = useGlobalSearchParams();

  const [rating, setRating] = useState<number | null>(null);

  const [newReview, setNewReview] = useState('');

  const handleSubmitReview = async () => {
    if (!newReview.trim()) {
      alert('Please write something before submitting.')
      return;
    }

    if (!rating) {
      alert('Please select a rating from 1 to 5.')
    }

    try {
      const user = await getSecureData('user');
      const userId = JSON.parse(user || "")?.['_id'];
      if (!userId) throw new Error('User ID missing');

      await postVendorReview(userId, {
        vendorId: vendorData._id,
        reviewText: newReview,
        rating: rating || 0,
        reviewerName: JSON.parse(user || "")?.['name']
      });

      alert('success')

      setNewReview('');
      setRating(null);
      await getVendorReviews(vendorData._id);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.')
    }
  };

  const [reviews, setReviews] = useState<any[]>([]);

  const fetchReviews = async () => {
    try {
      const data = await getVendorReviews(vendorData._id);
      console.log("reviews", data);
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  // ✅ Call fetchReviews after vendorData loads
  useEffect(() => {
    if (vendorData?._id) {
      fetchReviews();
    }
  }, [vendorData]);


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
        const response = await axios.get(`http://13.233.214.252:3000/vendor?userId=${id}`);
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
    <ScrollView style={styles.container}>
      <Toast />
      {/* Header
         Add test Id */}
      {/* <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Photographer Details</Text>
      </View> */}


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

      {/* Tab Content*/}

      {/* {activeTab === 'Details' && (
                <View style={styles.detailsContainer}>
                    <Text style={styles.name}>{vendorData.name}</Text>
                    <Text style={styles.address}>{vendorData.contactDetails.officialAddress}</Text>
                    <Text style={styles.price}>Starting Price: Rs.{vendorData.photographerBusinessDetails.minimumPrice}/-</Text>


                    <Text style={styles.perHead}>Per head</Text>

                    <Text style={styles.sectionTitle}>Details</Text>

                    <Text style={styles.detailLabel}>Staff</Text>
                    <Text style={styles.detailValue}>{vendorData.photographerBusinessDetails.staff}</Text>

                    <Text style={styles.detailLabel}>Cancellation Policy</Text>
                    <Text style={styles.detailValue}>{vendorData.photographerBusinessDetails.covidRefundPolicy}</Text>

                    <Text style={styles.detailLabel}>Cities Covered</Text>
                    <Text style={styles.detailValue}>{vendorData.photographerBusinessDetails.cityCovered}</Text>

                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{vendorData.photographerBusinessDetails.description}</Text>
                </View>
            )} */}
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
            {/* <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.photosScroll}
                        >
                            {/* Replace with dynamic images */}
            {/* <Image source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/ee8619c3ba7069ac2ac92e880c53f6a08b69c1a800aaf83f5653c512dd5631a5?apiKey=0a92af3bc6e24da3a9ef8b1ae693931a&' }} style={styles.photo} />
                            <Image source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/ee8619c3ba7069ac2ac92e880c53f6a08b69c1a800aaf83f5653c512dd5631a5?apiKey=0a92af3bc6e24da3a9ef8b1ae693931a&' }} style={styles.photo} />
                            <Image source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/ee8619c3ba7069ac2ac92e880c53f6a08b69c1a800aaf83f5653c512dd5631a5?apiKey=0a92af3bc6e24da3a9ef8b1ae693931a&' }} style={styles.photo} />
                            <Image source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/ee8619c3ba7069ac2ac92e880c53f6a08b69c1a800aaf83f5653c512dd5631a5?apiKey=0a92af3bc6e24da3a9ef8b1ae693931a&' }} style={styles.photo} />
                        </ScrollView> */}
            {/*add test id*/}
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

          {/* <Calendar
            testID="calendar-component"
            onDayPress={(day: { dateString: string }) =>
              console.log("Selected day:", day.dateString)
            }
            minDate={new Date().toISOString().split("T")[0]} // Disables past dates
            markedDates={{
              "2024-12-03": { selected: true, selectedColor: "#7B2869" },
            }}
            theme={{
              selectedDayBackgroundColor: "#7B2869",
              todayTextColor: "#7B2869",
            }}
          /> */}
        </>
      )}

      {/* {activeTab === 'Reviews' && (
                <View style={styles.tabContent}>
                    <Text>Reviews Tab Content (Static for now)</Text>
                </View>
            )} */}
      {activeTab === "Reviews" && (
        <View style={styles.tabContent}>
          {/* Tab Navigation for Reviews 
             add test id  */}

          {/* Eventify Reviews */}
          {activeReviewTab === "Eventify" && (
            <View>
              {reviews.map((review, index) => (
                <View key={index} style={styles.eventifyReview}>
                  <Text style={styles.reviewerName}>{review.reviewerName || 'Anonymous'}</Text>
                  <Text style={styles.reviewDate}>{new Date(review.createdAt).toDateString()}</Text>
                  <Text style={styles.reviewText}>{review.reviewText}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={review.rating >= star ? 'star' : 'star-outline'}
                        size={16}
                        color="#FFD700"
                      />
                    ))}
                  </View>
                </View>
              ))}

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
                  style={styles.reviewInput}
                />
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

        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8EAF2',
    paddingTop: 50,
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
  // detailsContainer: {
  //     padding: 16,
  // },
  // name: {
  //     fontSize: 20,
  //     fontWeight: 'bold',
  // },
  address: {
    fontSize: 14,
    color: '#7A7A7A',
    marginVertical: 8,
  },
  // price: {
  //     fontSize: 18,
  //     fontWeight: 'bold',
  //     color: '#000',
  // },
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  // sectionTitle: {
  //     fontSize: 18,
  //     fontWeight: 'bold',
  //     marginBottom: 8,
  // },
  tabContent: {
    padding: 16,
  },
  detailItem: {
    fontSize: 14,
    marginBottom: 8,
  },
  // detailLabel: {
  //     fontWeight: 'bold',
  // },
  // detailsContainer: {
  //     padding: 16,
  //     //  backgroundColor: '#FDF6FA', // Light background color
  // },
  // sectionTitle: {
  //     fontSize: 18,
  //     fontWeight: 'bold',
  //     marginBottom: 12,
  //     color: '#000',
  // },
  // detailLabel: {
  //     fontSize: 14,
  //     fontWeight: 'bold',
  //     marginTop: 8,
  //     color: '#333',
  // },
  // detailValue: {
  //     fontSize: 14,
  //     marginTop: 4,
  //     marginBottom: 8,
  //     color: '#555',
  // },
  // perHead: {
  //     fontSize: 14,
  //     color: '#7A7A7A',
  // },
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

export default PhotographerDetailsScreen;
