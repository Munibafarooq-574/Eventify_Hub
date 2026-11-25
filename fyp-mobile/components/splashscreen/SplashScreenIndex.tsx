import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { restoreStartupSession } from '@/store';

const routes = {
    onboarding: '/sandwich1',
    login: '/login',
    organizer: '/dashboard',
    vendor: '/vendordashboard',
} as const;

const bubbles = [
    { x: .06, y: .12, size: 66, color: '#D884AE' },
    { x: .69, y: .14, size: 98, color: '#9D4684' },
    { x: .19, y: .32, size: 38, color: '#C08552' },
    { x: .77, y: .40, size: 55, color: '#DF9BC4' },
    { x: .08, y: .67, size: 106, color: '#AC548F' },
    { x: .67, y: .74, size: 74, color: '#E5A7CB' },
    { x: .38, y: .88, size: 43, color: '#C08552' },
];

export default function SplashScreen() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const float = useRef(new Animated.Value(0)).current;
    const logo = useRef(new Animated.Value(0)).current;
    const [attempt, setAttempt] = useState(0);
    const [showRetry, setShowRetry] = useState(false);

    useEffect(() => {
        const animation = Animated.timing(logo, { toValue: 1, duration: 550, useNativeDriver: true });
        const drift = Animated.loop(Animated.sequence([
            Animated.timing(float, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(float, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]));
        animation.start();
        drift.start();
        return () => {
            animation.stop();
            drift.stop();
        };
    }, [float, logo]);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12_000);
        let logoTimer: ReturnType<typeof setTimeout> | undefined;
        const logoDelay = new Promise<void>(resolve => { logoTimer = setTimeout(resolve, 1850); });

        void Promise.all([restoreStartupSession(controller.signal), logoDelay]).then(([result]) => {
            clearTimeout(timeout);
            if (!active || result === 'cancelled') return;
            if (result === 'retry') {
                setShowRetry(true);
                return;
            }
            router.replace(routes[result]);
        });
        return () => {
            active = false;
            clearTimeout(timeout);
            clearTimeout(logoTimer);
            controller.abort();
        };
    }, [attempt, router]);

    return (
        <LinearGradient colors={['#FFDEE9', '#FFFFFF']} style={styles.container}>
            <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
                {bubbles.map(({ x, y, size, color }, index) => (
                    <Animated.View key={x} style={[styles.bubble, {
                        left: width * x,
                        top: height * y,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                        transform: [{ translateY: float.interpolate({
                            inputRange: [0, 1], outputRange: [28, index % 2 ? -34 : -54],
                        }) }],
                    }]} />
                ))}
            </View>
            <Animated.Image
                source={require('@/assets/images/splash.png')}
                resizeMode="contain"
                accessibilityLabel="Eventify Hub"
                style={[styles.logo, { opacity: logo, transform: [{ scale: logo.interpolate({
                    inputRange: [0, 1], outputRange: [0.85, 1],
                }) }] }]}
            />
            {showRetry ? (
                <>
                    <Text accessibilityRole="alert" style={styles.message}>
                        Could not verify your session. Check your connection and try again.
                    </Text>
                    <Pressable accessibilityRole="button" style={styles.retry} onPress={() => {
                        setShowRetry(false);
                        setAttempt(value => value + 1);
                    }}>
                        <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                </>
            ) : <ActivityIndicator color="#7B2869" accessibilityLabel="Starting Eventify Hub" />}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' },
    bubble: { position: 'absolute', opacity: 0.22 },
    logo: { width: 200, height: 200, marginBottom: 20 },
    message: { textAlign: 'center', color: '#4A1436', marginBottom: 14 },
    retry: { backgroundColor: '#7B2869', borderRadius: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
    retryText: { color: '#FFFFFF', fontWeight: '700' },
});
