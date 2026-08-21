/*import postGenerateAiPackage from '@/services/postGenerateAiPackage';
import { getSecureData, saveSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const AIPackageScreen: React.FC = () => {
    const [stage, setStage] = useState(0);
    const [proceed, setProceed] = useState<boolean>(false);
    const messages = [
        "Please hold on a moment...",
        "Analyzing data requirements...",
        "Selecting optimal AI components...",
        "Finalizing your package...",
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStage((prevStage) => (prevStage < messages.length - 1 ? prevStage + 1 : prevStage));
        }, 2000); // 2 seconds per stage
        const run = async () => {
            const eventDetailsObj = JSON.parse(await getSecureData("eventDetails") || "");
            const response = await postGenerateAiPackage({ eventDate: eventDetailsObj.eventDate || new Date(), eventName: eventDetailsObj.eventName, services: eventDetailsObj.selectedServices, guests: parseInt(eventDetailsObj.guests), budget: parseInt(eventDetailsObj.budget) })
            console.log("AI Response", response);
            await saveSecureData("aiPackage", JSON.stringify(response));
            setProceed(true);
        };
        run();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Navigate to the next screen after the last stage
        if (stage === messages.length - 1 && proceed) {
            setTimeout(() => {
                router.push("/AIPackage"); // Navigate to the next screen
            }, 1000); // Delay before navigation
        }
    }, [stage, proceed]);

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Generating Your AI Package</Text>
            <Image
                source={require('@/assets/images/GetStarted.png')} // Replace with your actual image path
                style={styles.image}
            />
            <Text style={styles.subheading}>Generating the Best AI Package for You...</Text>
            <Text style={styles.message}>{messages[stage]}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        //paddingTop: 70,
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 20,
        textAlign: 'center',
    },
    subheading: {
        fontSize: 16,
        color: '#000',
        textAlign: 'center',
        marginBottom: 10,
    },
    message: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#333',
        textAlign: 'center',
        marginTop: 10,
    },
    image: {
        width: 200,
        height: 200,
        marginBottom: 20,
    },
});

export default AIPackageScreen; */


import postGenerateAiPackage from '@/services/postGenerateAiPackage';
import { getSecureData, saveSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const AIPackageScreen: React.FC = () => {
    const [stage, setStage] = useState(0);
    const [proceed, setProceed] = useState<boolean>(false);

    const pulseAnimation = useRef(new Animated.Value(1)).current;
    const rotateAnimation = useRef(new Animated.Value(0)).current;

    const messages = [
        'Please hold on a moment...',
        'Analyzing data requirements...',
        'Selecting optimal AI components...',
        'Finalizing your package...',
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStage((prevStage) =>
                prevStage < messages.length - 1
                    ? prevStage + 1
                    : prevStage
            );
        }, 2000);

        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnimation, {
                    toValue: 1.08,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnimation, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        const rotateLoop = Animated.loop(
            Animated.timing(rotateAnimation, {
                toValue: 1,
                duration: 3500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        pulseLoop.start();
        rotateLoop.start();

        const run = async () => {
            const eventDetailsObj = JSON.parse(
                (await getSecureData('eventDetails')) || ''
            );

            const response = await postGenerateAiPackage({
                eventDate: eventDetailsObj.eventDate || new Date(),
                eventName: eventDetailsObj.eventName,
                services: eventDetailsObj.selectedServices,
                guests: parseInt(eventDetailsObj.guests),
                budget: parseInt(eventDetailsObj.budget),
            });

            console.log('AI Response', response);

            await saveSecureData('aiPackage', JSON.stringify(response));
            setProceed(true);
        };

        run();

        return () => {
            clearInterval(interval);
            pulseLoop.stop();
            rotateLoop.stop();
        };
    }, []);

    useEffect(() => {
        let navigationTimeout: ReturnType<typeof setTimeout>;

        // Navigation logic remains unchanged
        if (stage === messages.length - 1 && proceed) {
            navigationTimeout = setTimeout(() => {
                router.push('/AIPackage');
            }, 1000);
        }

        return () => {
            if (navigationTimeout) {
                clearTimeout(navigationTimeout);
            }
        };
    }, [stage, proceed]);

    const progressPercentage = ((stage + 1) / messages.length) * 100;

    const progressWidth = `${progressPercentage}%`;

    const rotate = rotateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="#F8E9F0"
            />

            <View style={styles.container}>
                <View style={styles.topBadge}>
                    <View style={styles.badgeDot} />
                    <Text style={styles.badgeText}>AI PACKAGE BUILDER</Text>
                </View>

                <Text style={styles.heading}>
                    Creating Your Perfect
                    <Text style={styles.headingHighlight}> Event Package</Text>
                </Text>

                <Text style={styles.description}>
                    We are preparing a personalized package based on your event
                    requirements.
                </Text>

                <Animated.View
                    style={[
                        styles.imageWrapper,
                        {
                            transform: [
                                { scale: pulseAnimation },
                                { rotate },
                            ],
                        },
                    ]}
                >
                    <View style={styles.glowCircle}>
                        <Image
                            source={require('@/assets/images/GetStarted.png')}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    </View>
                </Animated.View>

                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <View>
                            <Text style={styles.statusTitle}>
                                Generating your AI package
                            </Text>
                            <Text style={styles.statusSubtitle}>
                                This may take a few moments
                            </Text>
                        </View>

                        <ActivityIndicator
                            size="small"
                            color="#C94F83"
                        />
                    </View>

                    <View style={styles.progressBackground}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: progressWidth as any },
                            ]}
                        />
                    </View>

                    <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                            Step {stage + 1} of {messages.length}
                        </Text>

                        <Text style={styles.progressText}>
                            {Math.round(progressPercentage)}%
                        </Text>
                    </View>
                </View>

                <View style={styles.messageContainer}>
                    <Text style={styles.message}>{messages[stage]}</Text>
                </View>

                <View style={styles.stepsContainer}>
                    {messages.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.stepDot,
                                index <= stage && styles.activeStepDot,
                            ]}
                        />
                    ))}
                </View>

                <Text style={styles.footerText}>
                    Please keep this screen open while we work our magic.
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8E9F0',
    },

    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingTop: 28,
    },

    topBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 30,
        marginBottom: 20,
        shadowColor: '#B54676',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },

    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 8,
        backgroundColor: '#C94F83',
        marginRight: 8,
    },

    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#C94F83',
    },

    heading: {
        fontSize: 26,
        lineHeight: 34,
        fontWeight: '800',
        color: '#282027',
        textAlign: 'center',
        marginBottom: 10,
    },

    headingHighlight: {
        color: '#C94F83',
    },

    description: {
        maxWidth: 310,
        fontSize: 14,
        lineHeight: 21,
        color: '#75656D',
        textAlign: 'center',
        marginBottom: 24,
    },

    imageWrapper: {
        marginBottom: 22,
    },

    glowCircle: {
        width: 190,
        height: 190,
        borderRadius: 100,
        backgroundColor: '#FCEFF5',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#C94F83',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.18,
        shadowRadius: 22,
        elevation: 8,
    },

    image: {
        width: 145,
        height: 145,
    },

    statusCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        shadowColor: '#9E4168',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 5,
    },

    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },

    statusTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#30262B',
        marginBottom: 5,
    },

    statusSubtitle: {
        fontSize: 12,
        color: '#95858D',
    },

    progressBackground: {
        width: '100%',
        height: 8,
        borderRadius: 10,
        backgroundColor: '#F3DDE8',
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        borderRadius: 10,
        backgroundColor: '#C94F83',
    },

    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 9,
    },

    progressText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9B637A',
    },

    messageContainer: {
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
    },

    message: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#66545D',
        textAlign: 'center',
    },

    stepsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 20,
    },

    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 8,
        backgroundColor: '#E6C9D6',
        marginHorizontal: 5,
    },

    activeStepDot: {
        width: 24,
        backgroundColor: '#C94F83',
    },

    footerText: {
        position: 'absolute',
        bottom: 20,
        paddingHorizontal: 25,
        fontSize: 11,
        color: '#9B8790',
        textAlign: 'center',
    },
});

export default AIPackageScreen;