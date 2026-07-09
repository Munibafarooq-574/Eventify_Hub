import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const IntroIndex: React.FC = () => {

  const image = Asset.fromModule(
    require('@/assets/images/GetStarted.png')
  ).uri;

  // Logo Animation
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Title Animation
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(25)).current;

  // Button Animation
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslate = useRef(new Animated.Value(40)).current;

  // Bubble Animation
  const bubble1 = useRef(new Animated.Value(0)).current;
  const bubble2 = useRef(new Animated.Value(0)).current;
  const bubble3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {

    Animated.parallel([

      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),

      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),

      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 900,
        delay: 300,
        useNativeDriver: true,
      }),

      Animated.timing(titleTranslate, {
        toValue: 0,
        duration: 900,
        delay: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 1000,
        delay: 700,
        useNativeDriver: true,
      }),

      Animated.timing(buttonTranslate, {
        toValue: 0,
        duration: 1000,
        delay: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bubble1, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(bubble1, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bubble2, {
          toValue: 1,
          duration: 4500,
          useNativeDriver: true,
        }),
        Animated.timing(bubble2, {
          toValue: 0,
          duration: 4500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bubble3, {
          toValue: 1,
          duration: 5500,
          useNativeDriver: true,
        }),
        Animated.timing(bubble3, {
          toValue: 0,
          duration: 5500,
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, []);

  return (

    <View style={styles.container}>

      {/* Bubble 1 */}

      <Animated.View
        style={[
          styles.bubble1,
          {
            transform: [
              {
                translateY: bubble1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -18],
                }),
              },
            ],
          },
        ]}
      />

      {/* Bubble 2 */}

      <Animated.View
        style={[
          styles.bubble2,
          {
            transform: [
              {
                translateY: bubble2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 20],
                }),
              },
            ],
          },
        ]}
      />

      {/* Bubble 3 */}

      <Animated.View
        style={[
          styles.bubble3,
          {
            transform: [
              {
                translateX: bubble3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 18],
                }),
              },
            ],
          },
        ]}
      />

      {/* Logo Glow */}

      <View style={styles.logoGlow} />

      {/* Logo */}

      <Animated.Image
        source={{ uri: image }}
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [
              {
                scale: logoScale,
              },
            ],
          },
        ]}
      />

      {/* Title */}

      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [
            {
              translateY: titleTranslate,
            },
          ],
          marginBottom: 45,
        }}
      >

        <Text style={styles.title}>
          Welcome to Eventify Hub
        </Text>

        <Text style={styles.description}>
          Create an account with us and experience seamless event planning.
        </Text>

      </Animated.View>

      {/* Buttons */}

      <Animated.View
        style={{
          opacity: buttonOpacity,
          transform: [
            {
              translateY: buttonTranslate,
            },
          ],
          width: '100%',
          paddingHorizontal: 25,
        }}
      >

        <TouchableOpacity
          style={styles.createAccountButton}
          onPress={() => router.push('/selectrole')}
        >
          <Text style={styles.createAccountButtonText}>
            Create Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>
            Login
          </Text>
        </TouchableOpacity>

      </Animated.View>

    </View>

  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7ECF5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
    overflow: 'hidden',
  },

  // ==========================
  // Floating Bubbles
  // ==========================

  bubble1: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(120,12,96,0.08)',
    top: 70,
    right: 30,
  },

  bubble2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(225,90,69,0.10)',
    bottom: 150,
    left: 25,
  },

  bubble3: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(120,12,96,0.12)',
    top: 210,
    left: 45,
  },

  // ==========================
  // Logo Glow
  // ==========================

  logoGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(120,12,96,0.10)',
    top: 150,
  },

  // ==========================
  // Logo
  // ==========================

  logo: {
    width: 135,
    height: 135,
    resizeMode: 'contain',
    marginBottom: 35,
  },

  // ==========================
  // Title
  // ==========================

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#780C60',
    textAlign: 'center',
    marginBottom: 12,
  },

  // ==========================
  // Description
  // ==========================

  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 25,
    paddingHorizontal: 25,
    marginTop: 8,
  },

  // ==========================
  // Create Account Button
  // ==========================

  createAccountButton: {
    width: '100%',
    backgroundColor: '#780C60',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 18,

    shadowColor: '#780C60',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  createAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // ==========================
  // Login Button
  // ==========================

  loginButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#780C60',
    backgroundColor: '#FFFFFF',
  },

  loginButtonText: {
    color: '#780C60',
    fontSize: 17,
    fontWeight: '700',
  },
});
export default IntroIndex;