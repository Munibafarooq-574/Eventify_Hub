import { saveSecureData } from '@/store';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

export default function SelectRoleScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };
  const [selectedRole, setSelectedRole] = useState('');

  const handleConfirm = async () => {
    console.log('Selected Role:', selectedRole);
    await saveSecureData("role", selectedRole);
  };

  function handleOrganiserConfirm() {
    // throw new Error('Function not implemented.');
  }

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Select Your Role</Text>

      {/* Role Picker */}
      <Text style={styles.label}>Join As</Text>
      <TouchableOpacity style={styles.selectButton} onPress={toggleModal}>
        <Text style={styles.buttonText}>
          {selectedRole ? selectedRole : "Select"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide" // Slide animation
        transparent={false} // Ensure it's full-screen
      >
        <View style={styles.modalContainer}>
          <Picker
            testID="picker" // Add this testID
            selectedValue={selectedRole}
            onValueChange={(itemValue) => {
              setSelectedRole(itemValue);
              toggleModal();
            }}
            mode="dialog"
            style={styles.picker}
          >
            <Picker.Item label="Select" value="" />
            <Picker.Item label="Vendor" value="Vendor" />
            <Picker.Item label="Organizer" value="Organizer" />
          </Picker>
        </View>
      </Modal>

      {/* Confirm Button */}
      <TouchableOpacity
        testID="confirm-button" // Add this testID
        style={styles.confirmButton}
        onPress={() => {
          if (selectedRole === "Vendor") {
            handleConfirm();
            router.push("/bussinessselection");
          } else if (selectedRole === "Organizer") {
            handleConfirm();
            router.push("/signup");
          } else {
            alert("Please select a valid role!"); // Fallback if something goes wrong
          }
        }}
        disabled={!selectedRole} // Disable button if no role is selected
      >
        <Text style={styles.confirmButtonText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7ECF5', // Light pink background
    paddingHorizontal: 20,
    paddingTop: 150,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 30,
    marginTop: 50
  },
  confirmButton: {
    backgroundColor: '#780C60', // Dark purple color
    width: '80%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 40,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectButton: {
    width: '80%',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    width: '80%',
    height: 200,
  },
});


