//fyp-mobile/components/faqs/FAQsIndex.tsx
//(organized and styled FAQ screen for the Eventify Hub app — Organizer)
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
                'Eventify Hub is a mobile app that makes event planning easier by connecting organizers with vendors and providing AI-powered event package recommendations based on their event needs and budget.',
        },
        {
            question: 'How do I create an event as an Organizer?',
            answer:
                'After signing in as an Organizer, provide your event details, select the services you need, and add the required vendors or package options for your event.',
        },
        {
            question: 'How does the AI event package recommendation work?',
            answer:
                'The AI uses information such as your event type, budget, preferences, and required services to recommend a suitable event package for your event.',
        },
        {
            question: 'What are vendor packages?',
            answer:
                'Vendor packages are predefined service offerings created by vendors. They can include specific services, pricing, and other details to help you choose the right option for your event.',
        },
        {
            question: 'How can I view and choose a vendor package?',
            answer:
                "Open the vendor's profile and go to the Packages section. You can review the available packages, their services and pricing, and select the option that best matches your event requirements.",
        },
        {
            question: 'How do I find the right vendor for my event?',
            answer:
                'You can explore vendors based on their services, features, packages, pricing, ratings, reviews, badges, and profile information to find one that suits your event.',
        },
        {
            question: "What information can I see on a vendor's profile?",
            answer:
                'A vendor profile can include the business name, profile image or logo, location, services, features, packages, pricing, ratings, reviews, badges, and other available business information.',
        },
        {
            question: 'What are vendor features?',
            answer:
                'Vendor features highlight important services, capabilities, or business offerings provided by a vendor. They help organizers understand what a vendor can offer before booking.',
        },
        {
            question: 'What are vendor badges?',
            answer:
                "Vendor badges are indicators displayed on vendor profiles to highlight specific achievements, performance, experience, or other qualifying aspects of the vendor.",
        },
        {
            question: 'How can vendor badges help me choose a vendor?',
            answer:
                'Badges provide an additional way to evaluate vendors. You can consider them along with ratings, reviews, packages, pricing, services, and other profile information when choosing a vendor.',
        },
        {
            question: 'Are vendor badges the same as vendor ratings?',
            answer:
                'No. Ratings are based on customer feedback, while badges represent specific achievements or qualifications based on the Eventify Hub badge system.',
        },
        {
            question: 'How do I view vendor ratings and reviews?',
            answer:
                "Open the vendor's profile and go to the Reviews section to view available ratings, written reviews, and media reviews.",
        },
        {
            question: 'How do I communicate with vendors?',
            answer:
                'You can use the built-in chat feature to communicate directly with vendors, ask questions, discuss requirements, and finalize event details.',
        },
        {
            question: 'Can I send images, videos, or files to a vendor through chat?',
            answer:
                'Yes. The chat feature supports sharing media and files, allowing you to send references, requirements, and other event-related information to vendors.',
        },
        {
            question: 'How do I book a vendor for my event?',
            answer:
                'Select the vendor and required service or package, provide the necessary event information, review the booking details, and confirm the booking.',
        },
        {
            question: 'Can I book multiple vendors for one event?',
            answer:
                "Yes. You can book multiple vendors for the same event, such as caterers, photographers, decorators, and other service providers. Each vendor's booking is managed separately.",
        },
        {
            question: 'How can I track my vendor booking status?',
            answer:
                'You can check your event or booking details to see the current status of each vendor. Vendor statuses are tracked separately and may include pending, accepted/processing, completed, rejected, or cancelled.',
        },
        {
            question: 'How do I manage my events?',
            answer:
                'From the My Events section, you can view your created events, check individual vendor booking statuses, communicate with vendors, and manage your available event options.',
        },
        {
            question: 'How do I get started?',
            answer:
                'Simply create your Organizer account, complete your profile, and start exploring vendors, packages, and services. You can then create an event and begin planning according to your requirements and budget.',
        },
        {
            question: 'What types of events can I plan with Eventify Hub?',
            answer:
                'Eventify Hub can be used to plan different types of events, including weddings, birthdays, corporate events, parties, private gatherings, and other special occasions.',
        },
        {
            question: 'Can I cancel or modify my booking?',
            answer:
                "Yes, you may be able to cancel or modify a booking depending on the vendor's cancellation and modification policy. Always check the booking details and applicable terms before making changes.",
        },
        {
            question: 'Are the vendors verified?',
            answer:
                'Vendors on Eventify Hub go through the platform\'s verification process to help organizers find reliable and trustworthy service providers. You can also review their profiles, ratings, reviews, packages, features, and badges before booking.',
        },
        {
            question: 'Can I customize my event package?',
            answer:
                'Yes. You can customize your event package according to your requirements and budget by selecting or changing available vendors, services, and packages.',
        },
        {
            question: 'How are event package prices calculated?',
            answer:
                'Package pricing is based on the selected vendors, services, and packages. The total estimated cost can change when you modify your selections.',
        },
        {
            question: 'Can I see the total estimated cost before booking?',
            answer:
                'Yes. You can review the available pricing and estimated total based on your selected vendors, services, or packages before confirming your booking.',
        },
        {
            question: 'Can I update my Organizer profile?',
            answer:
                'Yes. You can edit the available information in your Organizer profile, including your profile picture and personal details, and save the updated information.',
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
                        Everything you need to know about planning events on Eventify Hub
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