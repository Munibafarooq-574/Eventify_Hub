import { useDashboardStack } from '@/utils/useDashboardStack';
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
    Image,
    Text,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { restoreStartupSession } from '@/store';

const routes = { onboarding: '/sandwich1', login: '/login', organizer: '/dashboard', vendor: '/vendordashboard' } as const;

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
    const router = useRouter();
    const resetDashboard = useDashboardStack();

    // Animation values
    const bubbleOpacity = useRef(new Animated.Value(0.7)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current; // Start with opacity 0
    const logoScale = useRef(new Animated.Value(0.8)).current; // Start smaller

    const [bubbleAnimations] = useState(() => Array.from({ length: 12 }, () => new Animated.Value(0)));
    const [attempt, setAttempt] = useState(0);
    const [showRetry, setShowRetry] = useState(false);

    useEffect(() => {
        // Function to animate bubbles
        const animateBubble = (animation: Animated.Value, delay: number) => {
            const loop = Animated.loop(
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
            );
            loop.start();
            return loop;
        };

        // Start bubble animations
        const loops = bubbleAnimations.map((animation, index) => animateBubble(animation, index * 300));

        // Animate bubble opacity out and logo fade-in with scale-up
        const hideBubblesTimer = setTimeout(() => {
            Animated.parallel([
            Animated.timing(bubbleOpacity, {
             toValue: 0,
            duration: 1000,
            useNativeDriver: true,
            }),
        Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        }),
         Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
         }),
    ]).start();
        }, 2000);

        
        return () => {
            clearTimeout(hideBubblesTimer);
            loops.forEach(loop => loop.stop());
            bubbleOpacity.stopAnimation();
            logoOpacity.stopAnimation();
            logoScale.stopAnimation();
        };
    }, [bubbleAnimations, bubbleOpacity, logoScale, logoOpacity]);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const deadline = new Promise<'retry'>(resolve => {
            timeout = setTimeout(() => {
                resolve('retry');
                controller.abort();
            }, 20_000);
        });
        let animationTimer: ReturnType<typeof setTimeout> | undefined;
        const animationDelay = new Promise<void>(resolve => {
            animationTimer = setTimeout(resolve, attempt === 0 ? 4000 : 0);
        });

        const session = Promise.race([restoreStartupSession(controller.signal), deadline])
            .finally(() => clearTimeout(timeout));

        void Promise.all([session, animationDelay]).then(([result]) => {
            if (!active) return;
            if (result === 'retry' || result === 'cancelled') {
                setShowRetry(true);
                return;
            }
            const route = routes[result];
            if (route === '/dashboard' || route === '/vendordashboard') {
                if (!resetDashboard(route)) setShowRetry(true);
            } else {
                router.replace(route);
            }
        }).catch(() => {
            if (active) setShowRetry(true);
        });

        return () => {
            active = false;
            clearTimeout(timeout);
            clearTimeout(animationTimer);
            controller.abort();
        };
    }, [attempt, resetDashboard, router]);

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

                <Animated.View style={{
                marginTop: 25,
                 opacity: logoOpacity,
                     }} >
                {showRetry ? (
                    <Pressable accessibilityRole="button" onPress={() => {
                        setShowRetry(false);
                        setAttempt(value => value + 1);
                    }} style={{ padding: 12 }}>
                        <Text style={{ color: '#7B2869', fontWeight: '700' }}>Could not verify session. Try again</Text>
                    </Pressable>
                ) : <ActivityIndicator size="large" color="#7B2869" />}
            </Animated.View>
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
        alignItems: 'center',
        justifyContent: 'center',

    },
    logoImage: {
        position: 'relative',
        display: 'flex',
        width: '100%',
        aspectRatio: 0.87,
    },
    title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#7B2869',
    marginTop: 20,
    textAlign: 'center',
    },

    subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    },
});

export default SplashScreen;
