
// import React, { useEffect, useRef, useState } from 'react';
// import {
//     View,
//     StyleSheet,
//     Animated,
//     Dimensions,
//     Easing,
//     Image,
// } from 'react-native';
// import { useRouter } from 'expo-router';

// const { width, height } = Dimensions.get('window'); // Screen dimensions

// const SplashScreen: React.FC = () => {
//     const router = useRouter(); // Initialize router

//     const bubbleOpacity = useRef(new Animated.Value(0.7)).current; // For bubble fading
//     const logoOpacity = useRef(new Animated.Value(1)).current; // Logo fades when bubbles disappear

//     // Animation values for bubbles
//     const bubbleAnimations = Array.from({ length: 10 }).map(() =>
//         useRef(new Animated.Value(0)).current
//     );

//     useEffect(() => {
//         const animateBubble = (animation: Animated.Value, delay: number) => {
//             Animated.loop(
//                 Animated.sequence([
//                     Animated.timing(animation, {
//                         toValue: 1,
//                         duration: 3000,
//                         delay,
//                         easing: Easing.inOut(Easing.sin),
//                         useNativeDriver: true,
//                     }),
//                     Animated.timing(animation, {
//                         toValue: 0,
//                         duration: 3000,
//                         easing: Easing.inOut(Easing.sin),
//                         useNativeDriver: true,
//                     }),
//                 ])
//             ).start();
//         };

//         // Start animations for all bubbles
//         bubbleAnimations.forEach((animation, index) => {
//             animateBubble(animation, index * 400);
//         });

//         // Timer to fade out bubbles and logo after 5 seconds
//         const hideBubblesTimer = setTimeout(() => {
//             Animated.timing(bubbleOpacity, {
//                 toValue: 0,
//                 duration: 1000,
//                 useNativeDriver: true,
//             }).start();

//             Animated.timing(logoOpacity, {
//                 toValue: 1,
//                 duration: 1000,
//                 useNativeDriver: true,
//             }).start();
//         }, 5000);

//         // Navigate to the next screen after 8 seconds
//         const navigateTimer = setTimeout(() => {
//             router.push('/sandwich1'); // Navigate to the next screen
//         }, 8000);

//         return () => {
//             clearTimeout(hideBubblesTimer);
//             clearTimeout(navigateTimer);
//         };
//     }, [router, bubbleAnimations, bubbleOpacity, logoOpacity]);

//     // Render bubbles with animated styles
//     const renderBubbles = () => {
//         return bubbleAnimations.map((animation, index) => {
//             const translateY = animation.interpolate({
//                 inputRange: [0, 1],
//                 outputRange: [height, -150], // Moves bubbles upwards
//             });

//             const translateX = animation.interpolate({
//                 inputRange: [0, 1],
//                 outputRange: [Math.random() * width, Math.random() * width], // Random horizontal movement
//             });

//             const scale = animation.interpolate({
//                 inputRange: [0, 1],
//                 outputRange: [1, 1.5], // Pulse effect
//             });

//             const bubbleSize = Math.random() * 120 + 100; // Random bubble size

//             return (
//                 <Animated.View
//                     key={index}
//                     style={[
//                         styles.bubble,
//                         {
//                             width: bubbleSize,
//                             height: bubbleSize,
//                             backgroundColor: index % 2 === 0 ? '#7B2869' : '#C08552', // Alternate colors
//                             transform: [{ translateY }, { translateX }, { scale }],
//                             opacity: bubbleOpacity, // Animate bubble opacity
//                         },
//                     ]}
//                 />
//             );
//         });
//     };

//     return (
//         <View style={styles.container}>
//             {/* Logo behind bubbles */}
//             <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
//                 <Image
//                     resizeMode="contain"
//                     source={{
//                         uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/ee8619c3ba7069ac2ac92e880c53f6a08b69c1a800aaf83f5653c512dd5631a5?apiKey=0a92af3bc6e24da3a9ef8b1ae693931a&',
//                     }}
//                     style={styles.logoImage}
//                     accessibilityLabel="Company Logo"
//                 />
//             </Animated.View>

//             {/* Bubbles in front of the logo */}
//             {renderBubbles()}
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#ffffff', // Background color
//         overflow: 'hidden', // Hide bubbles outside the screen
//     },
//     bubble: {
//         position: 'absolute',
//         borderRadius: 100, // Perfect circle
//         opacity: 0.5, // Semi-transparent bubbles
//     },
//     logoContainer: {
//         borderRadius: 60,
//         display: 'flex',
//         marginLeft: 'auto',
//         marginRight: 'auto',
//         maxWidth: 480,
//         width: '100%',
//         paddingTop: 150,
//         paddingBottom: 246,
//         flexDirection: 'column',
//         overflow: 'hidden',
//         alignItems: 'stretch',
//     },
//     logoImage: {
//         position: 'relative',
//         display: 'flex',
//         width: '100%',
//         aspectRatio: 0.87,
//     },
// });

// export default SplashScreen;
import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
    const router = useRouter();

    // Animation values
    const bubbleOpacity = useRef(new Animated.Value(0.7)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current; // Start with opacity 0
    const logoScale = useRef(new Animated.Value(0.5)).current; // Start smaller

    const bubbleAnimations = Array.from({ length: 12 }).map(() =>
        useRef(new Animated.Value(0)).current
    );

    useEffect(() => {
        // Function to animate bubbles
        const animateBubble = (animation: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animation, {
                        toValue: 1,
                        duration: 4000,
                        delay,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(animation, {
                        toValue: 0,
                        duration: 4000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        // Start bubble animations
        bubbleAnimations.forEach((animation, index) => {
            animateBubble(animation, index * 300);
        });

        // Animate bubble opacity out and logo fade-in with scale-up
        const hideBubblesTimer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(bubbleOpacity, {
                    toValue: 0, // Fade out bubbles
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1, // Fade in logo
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(logoScale, {
                    toValue: 1.2, // Scale up the logo
                    duration: 1500,
                    easing: Easing.out(Easing.exp),
                    useNativeDriver: true,
                }),
            ]).start();
        }, 5000);

        // Navigate to the next screen after 8 seconds
        const navigateTimer = setTimeout(() => {
            router.push('/sandwich1');
        }, 8000);

        return () => {
            clearTimeout(hideBubblesTimer);
            clearTimeout(navigateTimer);
        };
    }, [router, bubbleAnimations, bubbleOpacity, logoScale, logoOpacity]);

    // Function to render bubbles
    const renderBubbles = () => {
        return bubbleAnimations.map((animation, index) => {
            const translateY = animation.interpolate({
                inputRange: [0, 1],
                outputRange: [height, -200],
            });

            const translateX = animation.interpolate({
                inputRange: [0, 1],
                outputRange: [
                    Math.random() * width,
                    Math.random() * width - 100,
                ],
            });

            const scale = animation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 2],
            });

            const bubbleSize = Math.random() * 100 + 80;

            return (
                <Animated.View
                    key={index}
                    style={[
                        styles.bubble,
                        {
                            width: bubbleSize,
                            height: bubbleSize,
                            backgroundColor:
                                index % 3 === 0 ? '#FFDEE9' : index % 2 === 0 ? '#7B2869' : '#C08552', // Alternate colors
                            transform: [{ translateY }, { translateX }, { scale }],
                            opacity: bubbleOpacity,
                        },
                    ]}
                />
            );
        });
    };

    return (
        <LinearGradient
            colors={['#FFDEE9', '#FFFFFF']} // Gradient background
            style={styles.container}
        >
            {/* Logo with scale and fade-in animation */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    { opacity: logoOpacity, transform: [{ scale: logoScale }] },
                ]}
            >
                <Image
                    resizeMode="contain"
                    source={{
                        uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/ee8619c3ba7069ac2ac92e880c53f6a08b69c1a800aaf83f5653c512dd5631a5?apiKey=0a92af3bc6e24da3a9ef8b1ae693931a&',
                    }}
                    style={styles.logoImage}
                    accessibilityLabel="Company Logo"
                />
            </Animated.View>

            {/* Animated bubbles */}
            {renderBubbles()}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff', // Background color
        overflow: 'hidden', // Hide bubbles outside the screen
    },
    bubble: {
        position: 'absolute',
        borderRadius: 100, // Perfect circle
        opacity: 0.5, // Semi-transparent bubbles
    },
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

export default SplashScreen;
