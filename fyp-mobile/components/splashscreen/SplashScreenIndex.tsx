import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { restoreStartupSession } from '@/store';

const routes = {
    onboarding: '/sandwich1',
    login: '/login',
    organizer: '/dashboard',
    vendor: '/vendordashboard',
} as const;

export default function SplashScreen() {
    const router = useRouter();
    const logo = useRef(new Animated.Value(0)).current;
    const [attempt, setAttempt] = useState(0);
    const [showRetry, setShowRetry] = useState(false);

    useEffect(() => {
        const animation = Animated.timing(logo, { toValue: 1, duration: 550, useNativeDriver: true });
        animation.start();
        return () => animation.stop();
    }, [logo]);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12_000);
        let logoTimer: ReturnType<typeof setTimeout> | undefined;
        const logoDelay = new Promise<void>(resolve => { logoTimer = setTimeout(resolve, 600); });

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
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    logo: { width: 200, height: 200, marginBottom: 20 },
    message: { textAlign: 'center', color: '#4A1436', marginBottom: 14 },
    retry: { backgroundColor: '#7B2869', borderRadius: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
    retryText: { color: '#FFFFFF', fontWeight: '700' },
});
