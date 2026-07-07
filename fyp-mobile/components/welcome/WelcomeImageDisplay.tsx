import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface WelcomeImageDisplayProps {
  imageUri: string;
}

const WelcomeImageDisplay: React.FC<WelcomeImageDisplayProps> = ({ imageUri }) => {
  return (
    <View style={styles.logoContainer}>
      <Image
        resizeMode="contain"
        source={{ uri: imageUri }}
        style={styles.logoImage}
        accessibilityLabel="Company Logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    borderRadius: 60,
    display: 'flex',
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: 480,
    width: '100%',
    paddingTop: 150,
    paddingBottom: 246,
    flexDirection: 'column',
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  logoImage: {
    position: 'relative',
    display: 'flex',
    width: '100%',
    aspectRatio: 0.87,
  },
});

export default WelcomeImageDisplay;

