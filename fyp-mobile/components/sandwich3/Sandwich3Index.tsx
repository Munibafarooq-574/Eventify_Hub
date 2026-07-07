import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const Sandwich3Index = () => {
  const sandwich3Image = Asset.fromModule(require('@/assets/images/sandwich3.png')).uri;
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: sandwich3Image }}
        style={styles.image}
      />

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          "ENJOY EVERY MOMENT WITH EXPERT <Text style={styles.highlight}>EVENT PLANNERS!</Text>"
        </Text>
        <Text style={styles.description}>
          Let top event planners handle the details, so you can focus on enjoying your special day.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => { router.push("/intro") }}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8E9F0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  image: {
    width: '80%',
    height: '40%',
    resizeMode: 'contain',
  },
  textContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  highlight: {
    color: '#E15A45', // Highlight color for "FINGERTIPS!"
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#8A2BE2', // Active dot color
  },
  button: {
    backgroundColor: '#780C60', // Dark purple color
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: "100%"
  },
  buttonText: {
    color: '#FFFFFF', // White text color
    fontSize: 18,
    fontWeight: '600',
  },
});

export default Sandwich3Index;