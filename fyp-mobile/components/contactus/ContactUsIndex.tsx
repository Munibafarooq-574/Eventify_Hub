
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const ContactUsScreen: React.FC = () => {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 🔙 Back Button */}
      <TouchableOpacity onPress={router.back} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Contact Us</Text>

      <View style={styles.section}>
        <Text style={styles.heading}>Phone Numbers</Text>
        <Text style={styles.text}>📞 +92 333 1283810</Text>
        <Text style={styles.text}>📞 +92 300 1234567</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Office Address</Text>
        <Text style={styles.text}>🏢 Office #42, Software Tech Park</Text>
        <Text style={styles.text}>📍 Islamabad, Pakistan</Text>
      </View>
    </ScrollView>
  );
};

export default ContactUsScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8E9F0',
    padding: 20,
    paddingTop: 100,
    // justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
    zIndex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#780C60',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#444',
    marginBottom: 6,
  },
});
