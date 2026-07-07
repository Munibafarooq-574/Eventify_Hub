
import updatePackage from '@/services/updatePackage';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

const PackageScreen = () => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [packageDetails, setPackageDetails] = useState<any>(null);

  const { packageId } = useLocalSearchParams();
  const [servicesInputHeight, setServicesInputHeight] = useState(200);

  const [editableName, setEditableName] = useState('');
  const [editablePrice, setEditablePrice] = useState('');
  const [editableServices, setEditableServices] = useState('');

  useEffect(() => {
    if (packageId) {
      fetchPackageDetails(packageId as string);
    }
  }, [packageId]);

  const fetchPackageDetails = async (id: string) => {
    try {
      const user = JSON.parse((await getSecureData('user')) || '');
      if (!user || !user.packages) throw 'User or packages not found';
      const pkg = user.packages.find((x: any) => x._id === id);
      setPackageDetails(pkg);
    } catch (error) {
      console.error('Error fetching package details:', error);
    }
  };

  useEffect(() => {
    if (packageDetails) {
      setEditableName(packageDetails.packageName || '');
      setEditablePrice(packageDetails.price?.toString() || '');
      setEditableServices(packageDetails.services || '');
    }
  }, [packageDetails]);

  const updatePackageDetails = async () => {
    if (!packageId) return;

    try {
      const updatedData = {
        packageName: editableName,
        price: Number(editablePrice),
        services: editableServices,
      };

      const updatedPackage = await updatePackage(packageId as string, updatedData);
      setPackageDetails(updatedPackage);

      const user = JSON.parse((await getSecureData('user')) || '');
      if (!user || !user.packages) throw 'User or packages not found';
      const pkgIndex = user.packages.findIndex((x: any) => x._id === packageId);

      user.packages[pkgIndex] = updatedPackage;

      saveSecureData("user", JSON.stringify(user));

      alert('Package updated successfully!');
      router.push({
        pathname: '/vendorpackages',
        params: { packageId: packageId },
      });
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update package');
    }
  };


  const confirmLogout = () => {
    setModalVisible(false);
    console.log('Deleting Package...');
    router.push('/vendordashboard');
  };

  const cancelLogout = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editableName || ''}</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Editable Package Details */}
      <View style={styles.content}>
        <Text style={styles.sectionHeader}>Package Name</Text>
        <TextInput
          style={styles.input}
          value={editableName}
          onChangeText={setEditableName}
          placeholder="Enter package name"
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionHeader}>Price</Text>
        <TextInput
          style={styles.input}
          value={editablePrice}
          onChangeText={setEditablePrice}
          keyboardType="numeric"
          placeholder="Enter price"
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionHeader}>Services</Text>

        <TextInput
          style={[styles.input, { height: servicesInputHeight, textAlignVertical: 'top' }]}
          value={editableServices}
          onChangeText={setEditableServices}
          multiline
          onContentSizeChange={(e) =>
            setServicesInputHeight(e.nativeEvent.contentSize.height < 200 ? 200 : e.nativeEvent.contentSize.height)
          }
          placeholder="Describe services"
          placeholderTextColor="#999"
        />

      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={updatePackageDetails}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>


      {/* Bottom Navigation */}
      <BottomNavigationFinal />

      {/* Delete Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Delete</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this package?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelLogout}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmLogout}>
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8E9F0', paddingTop: 70 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerTitle: { color: '#000', fontSize: 24, fontWeight: 'bold' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 10, paddingHorizontal: 20 },
  deleteButton: { backgroundColor: '#D9534F', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginRight: 10 },
  deleteText: { color: '#fff', fontWeight: 'bold' },
  content: { padding: 20 },
  sectionHeader: { color: '#000', fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#000',
    marginTop: 5,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#780C60',
    padding: 15,
    borderRadius: 10,
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    elevation: 10,
    zIndex: 999,
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalMessage: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cancelButton: { flex: 1, marginRight: 10, padding: 10, borderRadius: 5, backgroundColor: '#E0E0E0', alignItems: 'center' },
  confirmButton: { flex: 1, marginLeft: 10, padding: 10, borderRadius: 5, backgroundColor: '#D9534F', alignItems: 'center' },
  cancelButtonText: { color: '#000' },
  confirmButtonText: { color: '#fff' },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 80,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  iconContainer: { backgroundColor: '#780C60', width: 30, height: 30, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  iconImage: { width: 37, height: 37, marginBottom: 5 },
  navText: { fontSize: 10, color: '#000000' },
  homeButton: { transform: [{ translateY: -10 }] },
  homeButtonIconContainer: { backgroundColor: '#780C60', width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
});

export default PackageScreen;
