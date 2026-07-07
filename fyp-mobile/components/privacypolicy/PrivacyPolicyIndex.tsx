import { router } from 'expo-router';
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';

const PrivacyPolicyScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.push('/account')}
                    style={styles.backButtonContainer}
                >
                    <Text style={styles.backButton}>{'<'} Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Privacy Policy</Text>
            </View>
            {/* Privacy Policy Content */}
            <ScrollView style={styles.content}>
                <Text style={styles.sectionTitle}>Introduction</Text>
                <Text style={styles.paragraph}>
                    At Eventify Hub, we are committed to protecting your privacy and safeguarding your personal information. This privacy policy outlines how we collect, use, and store your data.
                </Text>

                <Text style={styles.sectionTitle}>Information We Collect</Text>
                <Text style={styles.paragraph}>
                    1. **Personal Information**: Name, email, phone number, and address that you provide during account creation or booking.
                    {"\n"}2. **Event Details**: Information related to your event, including preferences, budget, and selected vendors.
                    {"\n"}3. **Device Information**: IP address, device type, and usage patterns for app analytics and performance monitoring.
                </Text>

                <Text style={styles.sectionTitle}>How We Use Your Information</Text>
                <Text style={styles.paragraph}>
                    - To connect you with vendors and manage your bookings.
                    {"\n"}- To provide AI-powered recommendations tailored to your preferences.
                    {"\n"}- To improve our platform through user feedback and analytics.
                    {"\n"}- To communicate updates, promotions, or changes to our services.
                </Text>

                <Text style={styles.sectionTitle}>Sharing Your Information</Text>
                <Text style={styles.paragraph}>
                    We only share your data with vendors you choose to work with and third-party services required to process payments. Your data is never sold or shared for advertising purposes.
                </Text>

                <Text style={styles.sectionTitle}>Data Security</Text>
                <Text style={styles.paragraph}>
                    We implement strict security measures to protect your personal information. However, no online system is 100% secure, and we encourage you to safeguard your account credentials.
                </Text>

                <Text style={styles.sectionTitle}>Your Rights</Text>
                <Text style={styles.paragraph}>
                    - Access, update, or delete your personal data by contacting support@eventifyhub.com.
                    {"\n"}- Opt-out of marketing communications at any time.
                    {"\n"}- Request a copy of your data or details of how it's used.
                </Text>

                <Text style={styles.sectionTitle}>Changes to This Policy</Text>
                <Text style={styles.paragraph}>
                    Eventify Hub reserves the right to update this privacy policy at any time. We will notify you of significant changes through email or app notifications.
                </Text>

                <Text style={styles.sectionTitle}>Contact Us</Text>
                <Text style={styles.paragraph}>
                    If you have any questions about our privacy practices, please contact us at support@eventifyhub.com.
                </Text>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButtonContainer: {
        padding: 10,
        marginRight: 10,
    },
    backButton: {
        fontSize: 16,
        color: '#780C60',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        flex: 1,
        textAlign: 'center',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#780C60',
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 14,
        color: '#333333',
        marginBottom: 20,
        lineHeight: 22,
    },
});

export default PrivacyPolicyScreen;
