
import getVendorById from '@/services/getVendorById';
import { getSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  console.log(vendorData.contactDetails.brandLogo, "abc");
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Reviews</Text>

      {/* Personal Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Details</Text>
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
          <View>
            <Text style={styles.name}>{vendorData.name}</Text>
            <Text style={styles.email}>{vendorData.email}</Text>
            <Text style={styles.phone}>
              {vendorData.contactDetails.contactNumber}
            </Text>
          </View>
        </View>
      </View>

      {/* Business Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business Details</Text>
        {/* <View style={styles.row}> */}
        <Text style={styles.name}>{vendorData.contactDetails.brandName}</Text>
        <Text style={styles.subTitle}>
          Staff: {vendorData?.photographerBusinessDetails?.staff || "N/A"}
        </Text>
        <Text style={styles.city}>
          City: {vendorData.contactDetails.city}
        </Text>
        {/* </View> */}
      </View>

      {/* Pricing */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pricing</Text>
        <View testID="pricing-table" style={styles.table}>
          {" "}
          {/* ✅ Add testID */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeader, styles.flex1]}>
              Package Name
            </Text>
            <Text style={[styles.tableHeader, styles.flex1]}>Price</Text>
            <Text style={[styles.tableHeader, styles.flex3]}>Services</Text>
          </View>
          {vendorData.packages.map((pkg: any) => (
            <View style={styles.tableRow} key={pkg._id}>
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location</Text>
        <Text style={styles.link}>{vendorData.contactDetails.city}</Text>
        {/* <Image
                    source={{ uri: 'https://via.placeholder.com/300x200.png' }}
                    style={styles.map}
                /> */}
      </View>

      {/* Photos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Photos</Text>
        <ScrollView
          testID="photo-list" //add test id
          horizontal
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8E9F0',
    padding: 16,
    paddingTop: 70,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  // Add the rest of your styles here
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Aligns items to the start of the cross-axis
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#555',
  },
  phone: {
    fontSize: 14,
    color: '#555',
  },
  subTitle: {
    fontSize: 14,
    color: '#555',
  },
  city: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  table: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    padding: 8,
    backgroundColor: '#F1F1F1',
  },
  tableCell: {
    fontSize: 12,
    padding: 8,
    color: '#000',
  },
  flex1: {
    flex: 1,
  },
  flex3: {
    flex: 3,
  },
  price: {
    color: '#E74C3C',
    fontWeight: 'bold',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#780C60',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#780C60',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#780C60',
    borderRadius: 10,
    paddingVertical: 12,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // modalContent: {
  //     width: '80%',
  //     backgroundColor: '#fff',
  //     padding: 20,
  //     borderRadius: 10,
  //     alignItems: 'center',
  // },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    marginRight: 5,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#780C60',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    marginLeft: 5,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#E1BEE7',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
  },
  cancelButtonText: {
    color: '#000',
  },
  photoContainer: {
    flexDirection: 'row',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  enlargedImage: {
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#780C60',
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
