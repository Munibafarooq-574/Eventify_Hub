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
                'To register as a vendor, simply download the Eventify Hub app, choose the "Vendor" registration option, and provide the required business details. Once submitted, our team will review and verify your profile.',
        },
        {
            question: 'Is there a verification process for vendors?',
            answer:
                'Yes, all vendors go through a verification process to ensure credibility. You\'ll need to provide valid business documentation and portfolio samples during registration.',
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
        {
            question: 'Can I cancel a booking after accepting it?',
            answer:
                'Yes, but cancellations should be avoided where possible. Frequent last-minute cancellations may lower your vendor rating and visibility in search results.',
        },
        {
            question: 'How are vendor ratings calculated?',
            answer:
                'Ratings are based on client reviews, response time, booking completion rate, and overall service quality. Higher ratings improve your ranking on the platform.',
        },
        {
            question: 'Can I upload photos and videos of my past work?',
            answer:
                'Yes, your vendor profile supports a media portfolio. Adding high-quality photos and videos helps clients trust your work and increases booking chances.',
        },
        {
            question: 'What happens if a client doesn\'t show up or cancels last minute?',
            answer:
                'You can report the incident through the app. Depending on our policy, you may be eligible for a partial fee or protection against repeated no-shows.',
        },
        {
            question: 'Can I offer multiple service categories under one account?',
            answer:
                'Yes, you can list multiple services or categories under a single vendor account, as long as each service is verified and clearly described.',
        },
        {
            question: 'How do I withdraw my earnings?',
            answer:
                'You can withdraw your earnings directly to your linked bank account or mobile wallet from the Earnings section of your vendor dashboard.',
        },
        {
            question: 'Is my personal and business data safe?',
            answer:
                'Yes, we use industry-standard encryption and security practices to protect your data. Your information is never shared without your consent.',
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
                    activeOpacity={0.7}
                >
                    <Text style={styles.backButtonIcon}>{'‹'}</Text>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headerTextWrapper}>
                    <Text style={styles.title}>Frequently Asked Questions</Text>
                    <Text style={styles.subtitle}>
                        Everything you need to know about being an Eventify Hub vendor
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {faqData.map((faq, index) => {
                    const isActive = activeIndex === index;
                    return (
                        <View
                            key={index}
                            style={[styles.faqItem, isActive && styles.faqItemActive]}
                        >
                            <TouchableOpacity
                                style={styles.questionContainer}
                                onPress={() => toggleCollapse(index)}
                                activeOpacity={0.75}
                            >
                                <Text
                                    style={[
                                        styles.question,
                                        isActive && styles.questionActive,
                                    ]}
                                >
                                    {faq.question}
                                </Text>
                                <View
                                    style={[
                                        styles.iconWrapper,
                                        isActive && styles.iconWrapperActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.icon,
                                            isActive && styles.iconActive,
                                        ]}
                                    >
                                        {isActive ? '−' : '+'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            {isActive && (
                                <View style={styles.answerWrapper}>
                                    <Text style={styles.answer}>{faq.answer}</Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
    },
    header: {
        paddingTop: 55,
        paddingBottom: 22,
        paddingHorizontal: 20,
        backgroundColor: '#780C60',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    backButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginBottom: 16,
    },
    backButtonIcon: {
        fontSize: 20,
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginRight: 2,
    },
    backButtonText: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    headerTextWrapper: {
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 20,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingTop: 24,
    },
    faqItem: {
        marginBottom: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#780C60',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0DCE8',
    },
    faqItemActive: {
        borderColor: '#780C60',
        shadowOpacity: 0.15,
    },
    questionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    question: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#3A2A35',
        marginRight: 12,
        lineHeight: 21,
    },
    questionActive: {
        color: '#780C60',
    },
    iconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F3E1EC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapperActive: {
        backgroundColor: '#780C60',
    },
    icon: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#780C60',
    },
    iconActive: {
        color: '#FFFFFF',
    },
    answerWrapper: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0DCE8',
    },
    answer: {
        fontSize: 14,
        color: '#5C5560',
        lineHeight: 21,
    },
});

export default FAQScreen;