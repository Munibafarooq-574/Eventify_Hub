import { router } from 'expo-router';
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';

const TermsOfServiceScreen: React.FC = () => {
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
                <Text style={styles.title}>Terms of Service</Text>
            </View>
            {/* Terms Content */}
            <ScrollView style={styles.content}>
                <Text style={styles.sectionTitle}>Introduction</Text>
                <Text style={styles.paragraph}>
                    Welcome to Eventify Hub! By using our app, you agree to comply with and be bound by the following terms of service. Please read them carefully.
                </Text>

                <Text style={styles.sectionTitle}>User Responsibilities</Text>
                <Text style={styles.paragraph}>
                    1. You agree to provide accurate information when creating an account or booking services.
                    {"\n"}2. You are responsible for safeguarding your account credentials.
                    {"\n"}3. Any misuse of the platform or violation of these terms may result in suspension or termination of your account.
                </Text>

                <Text style={styles.sectionTitle}>Vendor Policies</Text>
                <Text style={styles.paragraph}>
                    Vendors on Eventify Hub are independent contractors and are solely responsible for the services they provide. Eventify Hub acts as an intermediary platform and is not liable for disputes between users and vendors.
                </Text>

                <Text style={styles.sectionTitle}>Payments</Text>
                <Text style={styles.paragraph}>
                    All payments are processed securely through our platform. Refunds and cancellations are subject to the vendor’s policy, which will be displayed during booking.
                </Text>

                <Text style={styles.sectionTitle}>Limitation of Liability</Text>
                <Text style={styles.paragraph}>
                    Eventify Hub is not liable for any direct, indirect, incidental, or consequential damages resulting from the use of our platform.
                </Text>

                <Text style={styles.sectionTitle}>Termination</Text>
                <Text style={styles.paragraph}>
                    We reserve the right to terminate your access to the platform for violations of these terms or misuse of our services.
                </Text>

                <Text style={styles.sectionTitle}>Changes to Terms</Text>
                <Text style={styles.paragraph}>
                    Eventify Hub reserves the right to update or modify these terms at any time. Continued use of the platform after changes implies your acceptance of the revised terms.
                </Text>

                <Text style={styles.sectionTitle}>Contact Us</Text>
                <Text style={styles.paragraph}>
                    If you have any questions about these terms, please contact us at support@eventifyhub.com.
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

export default TermsOfServiceScreen;
