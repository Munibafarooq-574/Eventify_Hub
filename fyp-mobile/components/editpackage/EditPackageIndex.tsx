import updatePackage from '@/services/updatePackage';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, KeyboardAvoidingView,
  Platform, TextInput, TouchableOpacity, View ,Keyboard } from 'react-native';
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

const PRIMARY = '#7B2869';
const PRIMARY_LIGHT = '#9F4F8E';
const PRIMARY_SOFT = '#F3E4EF';
const BG = '#FAF6F9';
const CARD = '#FFFFFF';
const TEXT_DARK = '#221A20';
const TEXT_MUTED = '#8A7C86';
const BORDER = '#EFE0EB';
const DANGER = '#D9534F';

const PackageScreen = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [packageDetails, setPackageDetails] = useState<any>(null);

  const { packageId } = useLocalSearchParams();
  const [servicesInputHeight, setServicesInputHeight] = useState(140);

  const [editableName, setEditableName] = useState('');
  const [editablePrice, setEditablePrice] = useState('');
  const [editableServices, setEditableServices] = useState('');

  useEffect(() => {
  const show = Keyboard.addListener('keyboardDidShow', () => {
    setKeyboardVisible(true);
  });

  const hide = Keyboard.addListener('keyboardDidHide', () => {
    setKeyboardVisible(false);
  });

  return () => {
    show.remove();
    hide.remove();
  };
}, []);

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
     <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={20}
>
  <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>Editing package</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{editableName || 'Package'}</Text>
        </View>
  
      </View>

    <ScrollView
  style={{ flex: 1 }}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.scrollContent}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="interactive"
> 
        {/* Summary banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconWrap}>
            <Ionicons name="pricetag-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Current price</Text>
            <Text style={styles.summaryPrice}>
              Rs. {editablePrice || '0'}/-
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deletePill}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color={DANGER} />
            <Text style={styles.deletePillText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Package Name */}
        <View style={styles.card}>
          <View style={styles.fieldHeader}>
            <View style={styles.fieldIconWrap}>
              <Ionicons name="bookmark-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={styles.sectionHeader}>Package Name</Text>
          </View>
          <TextInput
            style={styles.input}
            value={editableName}
            onChangeText={setEditableName}
            placeholder="Enter package name"
            placeholderTextColor={TEXT_MUTED}
          />
        </View>

        {/* Price */}
        <View style={styles.card}>
          <View style={styles.fieldHeader}>
            <View style={styles.fieldIconWrap}>
              <Ionicons name="cash-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={styles.sectionHeader}>Price</Text>
          </View>
          <View style={styles.priceInputWrap}>
            <Text style={styles.priceInputPrefix}>Rs.</Text>
            <TextInput
              style={styles.priceInput}
              value={editablePrice}
              onChangeText={setEditablePrice}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={TEXT_MUTED}
            />
          </View>
        </View>

        {/* Services */}
        <View style={styles.card}>
          <View style={styles.fieldHeader}>
            <View style={styles.fieldIconWrap}>
              <Ionicons name="list-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={styles.sectionHeader}>Services</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea, { height: servicesInputHeight, textAlignVertical: 'top' }]}
            value={editableServices}
            onChangeText={setEditableServices}
            multiline
            onContentSizeChange={(e) =>
              setServicesInputHeight(e.nativeEvent.contentSize.height < 140 ? 140 : e.nativeEvent.contentSize.height)
            }
            placeholder="Describe what's included in this package"
            placeholderTextColor={TEXT_MUTED}
          />
        </View>
<View style={{ height: keyboardVisible ? 20 : 120 }} />
      </ScrollView>

      {/* Save Button */}
      {!keyboardVisible && (
  <TouchableOpacity
    style={styles.saveButton}
    onPress={updatePackageDetails}
    activeOpacity={0.85}
  >
    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
    <Text style={styles.saveButtonText}>Save Changes</Text>
  </TouchableOpacity>
)}

      {/* Bottom Navigation */}
      {!keyboardVisible && <BottomNavigationFinal />}

      {/* Delete Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="alert-circle-outline" size={30} color={DANGER} />
            </View>
            <Text style={styles.modalTitle}>Delete this package?</Text>
            <Text style={styles.modalMessage}>
              This action can't be undone. Clients will no longer be able to book this package.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelLogout} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmLogout} activeOpacity={0.8}>
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: 55 },

  header: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingBottom: 12,
},
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
 headerTitleWrap: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 38, // back button ki width ke barabar
},
  headerEyebrow: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerTitle: {
    color: TEXT_DARK,
    fontSize: 18,
    fontWeight: '800',
  },

  scrollContent: {
  flexGrow: 1,
  padding: 16,
  paddingBottom: 220,
},

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  summaryPrice: {
    fontSize: 19,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
  },
  deletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  deletePillText: {
    color: DANGER,
    fontSize: 12,
    fontWeight: '700',
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    color: TEXT_DARK,
    fontSize: 14,
    fontWeight: '700',
  },

  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: BG,
    color: TEXT_DARK,
  },
  textArea: {
    lineHeight: 20,
  },

  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: BG,
    paddingHorizontal: 14,
  },
  priceInputPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT_DARK,
  },

  saveButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: PRIMARY,
  padding: 15,
  borderRadius: 14,
  marginHorizontal: 16,
  marginBottom: 100,
},
  saveButtonText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(34,26,32,0.55)' },
  modalContent: { width: '84%', backgroundColor: CARD, padding: 24, borderRadius: 20, alignItems: 'center' },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8, color: TEXT_DARK },
  modalMessage: { fontSize: 13, textAlign: 'center', marginBottom: 22, color: TEXT_MUTED, lineHeight: 19 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: PRIMARY_SOFT, alignItems: 'center' },
  confirmButton: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: DANGER, alignItems: 'center' },
  cancelButtonText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default PackageScreen;