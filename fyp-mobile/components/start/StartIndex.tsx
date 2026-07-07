import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window'); // Screen dimensions

const SplashScreen: React.FC = () => {
    useEffect(() => {
        setTimeout(() => {
            router.push("/sandwich1");
        }, 1000)
    }, []);
    return (
        <View style={styles.container}>
            <Image
                source={{
                    uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/ee8619c3ba7069ac2ac92e880c53f6a08b69c1a800aaf83f5653c512dd5631a5?apiKey=0a92af3bc6e24da3a9ef8b1ae693931a&',
                }}
                style={styles.fullscreenImage}
                resizeMode="contain" // Ensure the aspect ratio is maintained
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff', // Optional background color
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: width, // Full width of the screen
        height: height, // Full height of the screen
    },
});

export default SplashScreen;
