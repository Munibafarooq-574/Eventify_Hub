
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';

const FAQScreen: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const faqData = [
        {
            question: 'How do I register as a vendor on Eventify Hub?',
            answer:
                'To register as a vendor, simply download the Eventify Hub app, choose the “Vendor” registration option, and provide the required business details. Once submitted, our team will review and verify your profile.',
        },
        {
            question: 'Is there a verification process for vendors?',
            answer:
                'Yes, all vendors go through a verification process to ensure credibility. You’ll need to provide valid business documentation and portfolio samples during registration.',
        },
        {
            question: 'How do I receive bookings?',
            answer:
                'Once your profile is live, users can view your services and send booking requests. You will receive a notification and can accept or decline the request based on your availability.',
        },
        {
            question: 'Can I customize my service offerings?',
            answer:
                'Absolutely! You can add, remove, or update your services and pricing anytime through your vendor dashboard in the app.',
        },
        {
            question: 'How does payment work for vendors?',
            answer:
                'Payments are handled securely through the platform. Once a user confirms a booking, funds are held securely and released to your account after service completion based on our payment policy.',
        },
        {
            question: 'Can I communicate with clients directly?',
            answer:
                'Yes! You can use the in-app chat feature to discuss details with clients, share availability, and answer any questions they may have.',
        },
        {
            question: 'Can I decline a booking request?',
            answer:
                'Yes, if you are unavailable or unable to fulfill a request, you can decline it. However, consistent rejections without reason may affect your vendor rating.',
        },
        {
            question: 'How do I manage my calendar and availability?',
            answer:
                'Your vendor dashboard allows you to set your availability and manage your booking calendar, helping you avoid overbooking or scheduling conflicts.',
        },
        {
            question: 'Is there support available for vendors?',
            answer:
                'Yes, we have a dedicated vendor support team. You can contact us anytime via the support chat in the app or email us at vendor-support@eventifyhub.com.',
        },
        {
            question: 'Are there any fees for vendors?',
            answer:
                'There are no upfront fees. Eventify Hub charges a small service fee per successful booking to help maintain the platform and provide ongoing support.',
        },
    ];




    const toggleCollapse = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButtonContainer}
                >
                    <Text style={styles.backButton}>{'<'} Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Frequently Asked Questions</Text>
            </View>
            <ScrollView style={styles.content}>
                {faqData.map((faq, index) => (
                    <View key={index} style={styles.faqItem}>
                        <TouchableOpacity
                            style={styles.questionContainer}
                            onPress={() => toggleCollapse(index)}
                        >
                            <Text style={styles.question}>{faq.question}</Text>
                            <Text style={styles.icon}>
                                {activeIndex === index ? '-' : '+'}
                            </Text>
                        </TouchableOpacity>
                        {activeIndex === index && (
                            <Text style={styles.answer}>{faq.answer}</Text>
                        )}
                    </View>
                ))}
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
    faqItem: {
        marginBottom: 20,
        backgroundColor: '#FFF', // White background for each FAQ
        borderRadius: 8,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    questionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    question: {
        fontSize: 16,
        fontWeight: '600',
        color: '#780C60',
    },
    icon: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#5C246E', // Purple text
    },
    answer: {
        fontSize: 14,
        color: '#333333',
        marginTop: 10,
        lineHeight: 20,
    },
});

export default FAQScreen;
