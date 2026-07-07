import Login from '@/services/login';
import { saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const [isDisabled, setIsDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const google = Asset.fromModule(require('@/assets/images/google-icon.png')).uri;
  const facebook = Asset.fromModule(require('@/assets/images/facebook-icon.png')).uri;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (email.length > 0 && password.length > 0) {
      setIsDisabled(false);
    } else {
      setIsDisabled(true);
    }
  }, [email, password])

  const handleGoogleLogin = () => {
    console.log('Google Login pressed!');
  };

  const handleFacebookLogin = () => {
    console.log('Facebook Login pressed!');
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setIsDisabled(true);
      const response = await Login(email, password);
      saveSecureData("token", response.token);
      saveSecureData("user", JSON.stringify(response.user));
      console.log(response.user.role)
      setIsLoading(false);
      reset();
      if (response.user.role === "Vendor") {
        router.push("/vendordashboard"); //next screen
      } else {
        router.push("/dashboard"); //next screen

      }

    } catch (e: any) {
      console.log(e);
      setIsLoading(false);
      setIsDisabled(false);
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: e,
      });
    }
  };

  const reset = async () => {
    setEmail("");
    setPassword("");
  }

  const handleForgotPassword = () => {
    console.log('Forgot Password pressed!');
  };
  const image = Asset.fromModule(require('@/assets/images/GetStarted.png')).uri;
  return (
    <View style={styles.container}>
      <Toast />
      <TouchableOpacity style={styles.backButton} onPress={() => { router.back() }}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Image
        source={{ uri: image }}
        style={styles.logo}
      />

      {/* <TouchableOpacity style={styles.socialButton1} onPress={handleGoogleLogin}>
        <Image
          source={{ uri: google }}
          style={styles.socialIcon}
        />
        <Text style={styles.socialButtonText}>Login with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.socialButton2} onPress={handleFacebookLogin}>
        <Image
          source={{ uri: facebook }}
          style={styles.socialIcon}
        />
        <Text style={styles.socialButtonText}>Login with Facebook</Text>
      </TouchableOpacity> */}

      {/* <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>OR</Text>
        <View style={styles.separatorLine} />
      </View> */}

      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter e-mail"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {/* <TouchableOpacity>
          <Text style={styles.eyeIcon}>👁️</Text>
        </TouchableOpacity> */}
      </View>

      <TouchableOpacity
        style={[styles.loginButton, isDisabled && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isDisabled}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Your Password</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7ECF5', // Light pink background
    paddingHorizontal: 40,
    paddingTop: 200,
  },
  socialButton1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    paddingVertical: 15,
    marginBottom: 15,
    backgroundColor: '#FFF',
    marginTop: 100
  },
  socialButton2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    paddingVertical: 15,
    marginBottom: 15,
    backgroundColor: '#FFF',
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  socialButtonText: {
    fontSize: 16,
    color: '#333',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CCC',
  },
  separatorText: {
    marginHorizontal: 10,
    fontSize: 14,
    color: '#999',
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#FFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
    color: '#999',
    paddingHorizontal: 10,
  },
  // logo: {
  //   width: 100,
  //   height: 100,
  //   resizeMode: 'contain',
  //   marginBottom: 20,
  // },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 20,
    alignSelf: 'center', // <-- Add this line
  },
  
  loginButton: {
    backgroundColor: '#780C60', // Dark purple color
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#780C60',
  },
  backButton: {
    position: 'absolute',
    top: 100,
    left: 20,
    zIndex: 0,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9', // Lighter color for disabled state
    opacity: 0.6, // Make it appear dimmed
  },
});

