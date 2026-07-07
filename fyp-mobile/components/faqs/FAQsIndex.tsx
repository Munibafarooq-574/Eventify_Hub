
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
            question: 'What is Eventify Hub?',
            answer:
                'Eventify Hub is a mobile app designed to simplify event planning by connecting you with reliable vendors and offering AI-powered event package recommendations tailored to your preferences and budget.',
        },
        {
            question: 'How do I create an event package?',
            answer:
                'Creating an event package is easy! Just provide details like your event type, budget, and service preferences, and our AI will generate a customized package for you. You can also edit the package by swapping vendors or services.',
        },
        {
            question: 'Can I customize my event package?',
            answer:
                'Yes! Eventify Hub allows you to fully customize your package. You can change vendors, adjust services, and view updated prices in real-time.',
        },
        {
            question: 'How do I communicate with vendors?',
            answer:
                'You can use the integrated chat feature in the app to directly communicate with vendors, ask questions, or finalize details.',
        },
        {
            question: 'Are the vendors verified?',
            answer:
                'Yes, all vendors on Eventify Hub go through a strict verification process to ensure quality and reliability.',
        },
        {
            question: 'How does payment work?',
            answer:
                'Payments are processed securely through the app. You’ll receive a breakdown of costs before confirming any service.',
        },
        {
            question: 'Can I cancel or modify my bookings?',
            answer:
                'Yes, you can modify or cancel bookings based on the vendor\'s cancellation policy. Details will be provided at the time of booking.',
        },
        {
            question: 'What types of events can I plan with Eventify Hub?',
            answer:
                'Eventify Hub supports all types of events, including weddings, birthdays, corporate events, and private gatherings.',
        },
        {
            question: 'Is there customer support available?',
            answer:
                'Yes! Our customer support team is available to assist you with any queries. You can contact us through the app or via email at support@eventifyhub.com.',
        },
        {
            question: 'How do I get started?',
            answer:
                'Simply download the Eventify Hub app, sign up, and start exploring vendors or creating your custom event package today!',
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
