import Register from '@/services/register';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function SignupScreen() {
  const [isDisabled, setIsDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const google = Asset.fromModule(require('@/assets/images/google-icon.png')).uri;
  const facebook = Asset.fromModule(require('@/assets/images/facebook-icon.png')).uri;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('');
  const [buisnessCategory, setBuisnessCategory] = useState<string>('');

  useEffect(() => {
    getRole();
    getSelectedCategory();
  }, []);

  useEffect(() => {
    if (name && email && password && phone) {
      setIsDisabled(false);
    } else {
      setIsDisabled(true);
    }
  }, [name, email, password, phone]);

  const getRole = async () => {
    const roleData = await getSecureData("role");
    console.log("Role Data", roleData);
    setRole(roleData || "");
  }

  const getSelectedCategory = async () => {
    const categoryId = await getSecureData("buisness");
    console.log(categoryId);
    setBuisnessCategory(categoryId || "");
  }

  const handleGoogleLogin = () => {
    console.log('Google Login pressed!');
  };

  const handleFacebookLogin = () => {
    console.log('Facebook Login pressed!');
  };

  const handleRegister = async () => {
    try {
      console.log('Register pressed!');
      setIsLoading(true);
      setIsDisabled(true);
      console.log(email, password, name, phone, role, buisnessCategory);
      const response = await Register(email, password, name, role, buisnessCategory, phone);
      saveSecureData("token", response.token);
      saveSecureData("user", JSON.stringify(response.user));
      setIsLoading(false);
      reset();
      console.log()
      if (response.user.role === "Vendor") {
        router.push("/vendorcontactdetails"); //next screen
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
    setName("");
    setPhone(""); // new
  }
  const image = Asset.fromModule(require('@/assets/images/GetStarted.png')).uri;
  return (
    <ScrollView 
    contentContainerStyle={styles.container}
    keyboardShouldPersistTaps="handled"
  >
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
        <Text style={styles.socialButtonText}>SignUp with Google</Text>
      </TouchableOpacity> */}

      {/* <TouchableOpacity style={styles.socialButton2} onPress={handleFacebookLogin}>
        <Image
          source={{ uri: facebook }}
          style={styles.socialIcon}
        />
        <Text style={styles.socialButtonText}>SignUp with Facebook</Text>
      </TouchableOpacity> */}

      {/* <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>OR</Text>
        <View style={styles.separatorLine} />
      </View> */}

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter name"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
        keyboardType="default"
        autoCapitalize="none"
      />
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
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter phone number"
        placeholderTextColor="#999"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
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
      </View>
      <Text style={styles.termsText}>By creating your account, you agree to the <Text style={styles.highlight}>Terms of Service</Text> and <Text style={styles.highlight}>Privacy Policy</Text></Text>

      <TouchableOpacity
        style={[styles.registerButton, isDisabled && styles.disabledButton]}
        onPress={handleRegister}
        disabled={isDisabled}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.registerButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8E9F0',
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
  registerButton: {
    backgroundColor: '#780C60', // Dark purple color
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 120,
    left: 20,
    zIndex: 10,
  },
  highlight: {
    color: '#E15A45', // Highlight color for "FINGERTIPS!"
  },
  disabledButton: {
    backgroundColor: '#A9A9A9', // Lighter color for disabled state
    opacity: 0.6, // Make it appear dimmed
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 20,
    alignSelf: 'center', // <-- Add this line
  },
});

