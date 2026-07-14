import getVendorById from '@/services/getVendorById';
import { getSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ReviewScreen = () => {
  const [isModalVisible, setModalVisible] = useState(false);
  //const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  useEffect(() => {
    const fetchVendorData = async () => {
      const user = JSON.parse(await getSecureData("user") || "");
      console.log(user);
      try {
        const vendor = await getVendorById(user._id);
        console.log(vendor);
        setVendorData(vendor);
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          testID="loading-indicator" //add test id 
          size="large"
          color="#780C60"
        />
      </View>
    );
  }

  if (!vendorData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load vendor data.</Text>
      </View>
    );
  }

 const businessDetails = vendorData.BusinessDetails;

const staff = Array.isArray(businessDetails?.staffGender)
  ? businessDetails.staffGender
  : Array.isArray(businessDetails?.staff)
  ? businessDetails.staff
  : [];

  console.log(vendorData.contactDetails.brandLogo, "abc");
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrap}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <View style={styles.titleUnderline} />
        <Text style={styles.sectionSubtitle}>
          Take a final look at your profile before it goes live
        </Text>
      </View>

      {/* Personal Details */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBadge}>
            <Text style={styles.cardIconText}>👤</Text>
          </View>
          <Text style={styles.cardTitle}>Personal Details</Text>
        </View>
        <View style={styles.row}>
          <Image
            testID="vendor-image" // ✅ Add this testID
            source={{
              uri: vendorData && vendorData.contactDetails
                ? vendorData.contactDetails.brandLogo
                : "https://example.com/avatar.jpg"
            }}
            style={styles.avatar}
          />
          <View style={styles.personalInfo}>
            <Text style={styles.name}>{vendorData.name}</Text>
            <View style={styles.infoLine}>
              <Text style={styles.infoIcon}>✉️</Text>
              <Text style={styles.email}>{vendorData.email}</Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.infoIcon}>📞</Text>
              <Text style={styles.phone}>
                {vendorData.contactDetails.contactNumber}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Business Details */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBadge}>
            <Text style={styles.cardIconText}>🏢</Text>
          </View>
          <Text style={styles.cardTitle}>Business Details</Text>
        </View>

        <Text style={styles.brandName}>{vendorData.contactDetails.brandName}</Text>

        {vendorData?.contactDetails?.businessType ? (
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>
              {vendorData.contactDetails.businessType}
            </Text>
          </View>
        ) : null}

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Staff</Text>
            <Text style={styles.detailValue}>
           {staff.length > 0 ? staff.join(", ") : "N/A"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>City</Text>
            <Text style={styles.detailValue}>
              {vendorData.contactDetails.city}
            </Text>
          </View>

          {businessDetails?.experience ? (
            <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Experience</Text>
           <Text style={styles.detailValue}>
            {businessDetails.experience}
            </Text>
           </View>
          ) : null}

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Packages Offered</Text>
            <Text style={styles.detailValue}>
              {vendorData?.packages?.length || 0}
            </Text>
          </View>
        </View>

         {businessDetails?.description ? (
  <View style={{ marginTop: 10 }}>
    <Text style={styles.detailLabel}>Description</Text>

    <Text style={styles.businessDescription}>
      {businessDetails.description}
    </Text>
  </View>
) : null}
      </View>

      {/* Pricing */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBadge}>
            <Text style={styles.cardIconText}>💰</Text>
          </View>
          <Text style={styles.cardTitle}>Pricing</Text>
        </View>
        <View testID="pricing-table" style={styles.table}>

          {/* ✅ Add testID */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeader, styles.flex1]}>
              Package Name
            </Text>
            <Text style={[styles.tableHeader, styles.flex1]}>Price</Text>
            <Text style={[styles.tableHeader, styles.flex3]}>Services</Text>
          </View>
          {vendorData.packages.map((pkg: any, idx: number) => (
            <View
              style={[
                styles.tableRow,
                idx % 2 === 1 ? styles.tableRowAlt : null,
              ]}
              key={pkg._id}
            >
              <Text style={[styles.tableCell, styles.flex1]}>
                {pkg.packageName}
              </Text>
              <Text style={[styles.tableCell, styles.flex1, styles.price]}>
                {pkg.price}
              </Text>
              <Text style={[styles.tableCell, styles.flex3]}>
                {pkg.services}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Location */}
      {/* Location */}
<View style={styles.card}>
  <View style={styles.cardHeaderRow}>
    <View style={styles.cardIconBadge}>
      <Text style={styles.cardIconText}>📍</Text>
    </View>
    <Text style={styles.cardTitle}>Location</Text>
  </View>

  <View style={styles.locationBox}>

    {/* City */}
    <View style={styles.locationItem}>
      <Text style={styles.locationHeading}>City</Text>
      <Text style={styles.locationValue}>
        {vendorData.contactDetails.city}
      </Text>
    </View>

    {/* City Covered */}
    {businessDetails?.cityCovered ? (
      <View style={styles.locationItem}>
        <Text style={styles.locationHeading}>City Covered</Text>
        <Text style={styles.locationValue}>
          {Array.isArray(businessDetails.cityCovered)
            ? businessDetails.cityCovered.join(", ")
            : businessDetails.cityCovered}
        </Text>
      </View>
    ) : null}

    {/* Official Address */}
    {vendorData?.contactDetails?.officialAddress ? (
      <View style={styles.locationItem}>
        <Text style={styles.locationHeading}>Official Address</Text>
        <Text style={styles.locationValue}>
          {vendorData.contactDetails.officialAddress}
        </Text>
      </View>
    ) : null}

    {/* Google Maps */}
    {vendorData?.contactDetails?.officialGoogleLink ? (
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() =>
          Linking.openURL(
            vendorData.contactDetails.officialGoogleLink
          )
        }
      >
        <Text style={styles.mapButtonText}>
          📍 Open in Google Maps
        </Text>
      </TouchableOpacity>
    ) : null}
  </View>
</View>

      {/* Photos */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBadge}>
            <Text style={styles.cardIconText}>📷</Text>
          </View>
          <Text style={styles.cardTitle}>Photos</Text>
        </View>
        <ScrollView
          testID="photo-list" //add test id
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoContainer}
        >
          {vendorData.images.map((image: string, index: number) => (
            <Image
              key={index}
              testID="vendor-image" // ✅ Add this testID
              source={{
                uri: `${image}`,
              }}
              style={styles.photo}
            />
          ))}
        </ScrollView>
      </View>
      {/* Enlarged Image Modal
            <Modal
                visible={isModalVisible}
                transparent={true}
                onRequestClose={closeModal}
                animationType="fade"
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.enlargedImage}
                                resizeMode="contain"
                            />
                        )}
                        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal> */}

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          testID="back-button" //add test id
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="save-button" //add test id
          style={styles.saveButton}
          onPress={() => openModal()}
        >
          <Text style={styles.saveButtonText}>Save & Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Save Confirmation Modal */}
      <Modal
        testID="modal-container" // ✅ Add testID
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIconText}>✓</Text>
            </View>
            <Text style={styles.modalMessage}>
              Thank you for creating your profile. It is currently under
              review and we will notify you once it is published.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                testID="okay-button" // ✅ Add testID
                style={styles.confirmButton}
                onPress={() => {
                  closeModal();
                  router.push("/vendordashboard");
                }}
              >
                <Text style={styles.confirmButtonText}>Okay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="cancel-button" // ✅ Add testID
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const PLUM = '#780C60';
const PLUM_DARK = '#4E0740';
const GOLD = '#C9A227';
const BG = '#FDF4F8';
const CARD_BORDER = '#F1DCE9';
const TEXT_DARK = '#2B1B26';
const TEXT_MUTED = '#8A7A85';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    padding: 16,
    paddingTop: 70,
  },

  // Header
  headerWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: PLUM_DARK,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleUnderline: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: PLUM_DARK,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6E3EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardIconText: {
    fontSize: 15,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    borderWidth: 2,
    borderColor: GOLD,
  },
  personalInfo: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  email: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  phone: {
    fontSize: 13,
    color: TEXT_MUTED,
  },

  // Business details
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: PLUM_DARK,
    marginBottom: 8,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F6E3EF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: PLUM,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
    paddingRight: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  businessDescription: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 19,
    marginTop: 6,
    fontStyle: 'italic',
  },

  city: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },

  // Pricing table
  table: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowAlt: {
    backgroundColor: '#FCF6FA',
  },
  tableHeader: {
    fontSize: 13,
    fontWeight: '700',
    padding: 10,
    backgroundColor: PLUM,
    color: '#fff',
  },
  tableCell: {
    fontSize: 12,
    padding: 10,
    color: TEXT_DARK,
  },
  flex1: {
    flex: 1,
  },
  flex3: {
    flex: 3,
  },
  price: {
    color: '#C0392B',
    fontWeight: '800',
  },

  // Location
  locationBox: {
  backgroundColor: "#FCF6FA",
  borderRadius: 14,
  padding: 16,
  borderWidth: 1,
  borderColor: CARD_BORDER,
},

locationItem: {
  marginBottom: 16,
},

locationHeading: {
  fontSize: 11,
  textTransform: "uppercase",
  color: TEXT_MUTED,
  letterSpacing: 1,
  marginBottom: 4,
},

locationValue: {
  fontSize: 15,
  color: TEXT_DARK,
  fontWeight: "700",
},

mapButton: {
  marginTop: 8,
  backgroundColor: PLUM,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
},

mapButtonText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
},
  locationCity: {
    fontSize: 15,
    fontWeight: '800',
    color: PLUM_DARK,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  link: {
    fontSize: 14,
    color: '#6A1B9A',
    marginBottom: 8,
  },
  map: {
    height: 200,
    borderRadius: 10,
    marginTop: 8,
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: PLUM,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    marginRight: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: PLUM,
  },
  saveButton: {
    flex: 1,
    backgroundColor: PLUM,
    borderRadius: 12,
    paddingVertical: 14,
    marginLeft: 10,
    alignItems: 'center',
    shadowColor: PLUM_DARK,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(43, 27, 38, 0.6)',
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F6E3EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIconText: {
    fontSize: 26,
    color: PLUM,
    fontWeight: '800',
  },
  modalMessage: {
    fontSize: 15,
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 21,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    marginRight: 5,
    padding: 12,
    borderRadius: 10,
    backgroundColor: PLUM,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    marginLeft: 5,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F1DCE9',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  cancelButtonText: {
    color: PLUM_DARK,
    fontWeight: '700',
  },

  // Photos
  photoContainer: {
    flexDirection: 'row',
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  enlargedImage: {
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: PLUM,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ReviewScreen;