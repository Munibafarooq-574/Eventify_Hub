import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const ContactUsScreen: React.FC = () => {
    const router = useRouter();

    // TODO: Replace the numbers/email below with EventifyHub's official
    // contact details before publishing this screen.
    const contactMethods = [
        {
            icon: 'call-outline' as const,
            label: 'Call Us',
            value: '+92 300 1122334', // TODO: add your official number
            subvalue: 'Mon - Sat, 9:00 AM - 8:00 PM',
            action: () => Linking.openURL('tel:+923001122334'),
            actionLabel: 'Call',
        },
        {
            icon: 'call-outline' as const,
            label: 'Alternate Line',
            value: '+92 345 9988776', // TODO: add your official number
            subvalue: 'For urgent vendor support',
            action: () => Linking.openURL('tel:+923459988776'),
            actionLabel: 'Call',
        },
        {
            icon: 'mail-outline' as const,
            label: 'Email Us',
            value: 'eventifyhub574@gmail.com',
            subvalue: 'We usually reply within 24 hours',
            action: () => Linking.openURL('mailto:eventifyhub574@gmail.com'),
            actionLabel: 'Email',
        },
        {
            icon: 'logo-whatsapp' as const,
            label: 'WhatsApp Support',
            value: '+92 312 6655443', // TODO: add your official number
            subvalue: 'Chat with our support team',
            action: () => Linking.openURL('https://wa.me/923126655443'),
            actionLabel: 'Chat',
        },
    ];

    const helpLinks = [
        {
            icon: 'help-circle-outline' as const,
            title: 'FAQs',
            desc: 'Find quick answers to common questions',
            // Navigates to the vendor FAQ screen
            action: () => router.push('/vendorfaqs'),
        },
        {
            icon: 'time-outline' as const,
            title: 'Support Hours',
            desc: 'Mon - Sat · 9:00 AM to 8:00 PM (PKT)',
            action: () => {},
        },
    ];

    // Social links: replace the '#' url below with EventifyHub's real
    // profile links (Facebook page, Instagram handle, LinkedIn page, etc.)
    const socials = [
        { icon: 'logo-facebook' as const, name: 'Facebook', url: '#' },
        { icon: 'logo-instagram' as const, name: 'Instagram', url: '#' },
        { icon: 'logo-linkedin' as const, name: 'LinkedIn', url: '#' },
    ];

    const handleSocialPress = () => {
        // Once official social links are ready, replace this with:
        // Linking.openURL(social.url)
        Alert.alert('Coming Soon', 'This link will be available soon.');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerIconWrapper}>
                    <Ionicons name="chatbox-ellipses-outline" size={30} color="#FFFFFF" />
                </View>
                <Text style={styles.title}>Contact Us</Text>
                <Text style={styles.subtitle}>
                    We're here to help — reach out anytime and the EventifyHub
                    team will get back to you
                </Text>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Contact Methods */}
                {contactMethods.map((item, index) => (
                    <View key={index} style={styles.card}>
                        <View style={styles.cardIconWrapper}>
                            <Ionicons name={item.icon} size={22} color="#780C60" />
                        </View>
                        <View style={styles.cardTextWrapper}>
                            <Text style={styles.cardLabel}>{item.label}</Text>
                            <Text style={styles.cardValue}>{item.value}</Text>
                            <Text style={styles.cardSubvalue}>{item.subvalue}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={item.action}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.actionButtonText}>{item.actionLabel}</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Help Section */}
                <Text style={styles.sectionTitle}>More Ways We Can Help</Text>
                <View style={styles.helpGroup}>
                    {helpLinks.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.helpRow,
                                index !== helpLinks.length - 1 && styles.helpRowBorder,
                            ]}
                            activeOpacity={0.7}
                            onPress={item.action}
                        >
                            <View style={styles.helpIconWrapper}>
                                <Ionicons name={item.icon} size={20} color="#780C60" />
                            </View>
                            <View style={styles.helpTextWrapper}>
                                <Text style={styles.helpTitle}>{item.title}</Text>
                                <Text style={styles.helpDesc}>{item.desc}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#B98BAA" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Social Media */}
                <Text style={styles.sectionTitle}>Follow EventifyHub</Text>
                <View style={styles.socialRow}>
                    {socials.map((social, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.socialButton}
                            activeOpacity={0.8}
                            onPress={handleSocialPress}
                        >
                            <Ionicons name={social.icon} size={22} color="#780C60" />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
};

export default ContactUsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
    },
    header: {
        paddingTop: 55,
        paddingBottom: 26,
        paddingHorizontal: 24,
        backgroundColor: '#780C60',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    backButton: {
        position: 'absolute',
        top: 55,
        left: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    headerIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13.5,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        lineHeight: 19,
        paddingHorizontal: 10,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingTop: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#F0DCE8',
        shadowColor: '#780C60',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    cardIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F3E1EC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardTextWrapper: {
        flex: 1,
    },
    cardLabel: {
        fontSize: 12,
        color: '#B98BAA',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    cardValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#3A2A35',
        marginBottom: 2,
    },
    cardSubvalue: {
        fontSize: 12.5,
        color: '#8A8188',
    },
    actionButton: {
        backgroundColor: '#780C60',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginLeft: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#780C60',
        marginTop: 10,
        marginBottom: 12,
    },
    helpGroup: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F0DCE8',
        marginBottom: 24,
        overflow: 'hidden',
    },
    helpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    helpRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F0DCE8',
    },
    helpIconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#F3E1EC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    helpTextWrapper: {
        flex: 1,
    },
    helpTitle: {
        fontSize: 14.5,
        fontWeight: '600',
        color: '#3A2A35',
        marginBottom: 2,
    },
    helpDesc: {
        fontSize: 12.5,
        color: '#8A8188',
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    socialButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F0DCE8',
        shadowColor: '#780C60',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
});