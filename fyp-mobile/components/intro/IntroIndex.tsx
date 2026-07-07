import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const IntroIndex: React.FC = () => {
  const image = Asset.fromModule(require('@/assets/images/GetStarted.png')).uri;
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: image }}
        style={styles.logo}
      />

      <Text style={styles.title}>Welcome to Eventify Hub</Text>
      <Text style={styles.description}>
        Create an account with us and experience seamless event planning.
      </Text>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.createAccountButton} onPress={() => { router.push("/selectrole") }}>
          <Text style={styles.createAccountButtonText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => { router.push("/login") }}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7ECF5', // Light pink background
    paddingHorizontal: 20,
    position: "relative",
    paddingVertical: 40,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
  },
  createAccountButton: {
    backgroundColor: '#780C60', // Dark purple color
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  createAccountButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#780C60',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#780C60',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 30,
    position: 'absolute',
    bottom: 60,
    width: '100%',
  }
});

export default IntroIndex;