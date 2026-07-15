
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function TermsOfServiceScreen() {
  const sections = [
  {
    icon: 'book-outline',
    title: 'Introduction',
    body:
      'Welcome to EventifyHub! By using our application, you agree to comply with and be bound by these Terms of Service. Please read them carefully before accessing or using any feature of our platform.',
  },

  {
    icon: 'shield-checkmark-outline',
    title: 'Acceptance of Terms',
    body:
      'By accessing or using EventifyHub, you acknowledge that you have read, understood, and agreed to these Terms of Service. If you do not agree with any part of these terms, please discontinue use of the platform.',
  },

  {
    icon: 'person-outline',
    title: 'User Responsibilities',
    body:
      '• Provide accurate and up-to-date information while creating an account or booking services.\n\n' +
      '• Maintain the confidentiality of your login credentials.\n\n' +
      '• You are responsible for all activities performed through your account.\n\n' +
      '• Do not misuse, abuse, or attempt to harm the platform or other users.\n\n' +
      '• Violation of these terms may result in account suspension or permanent termination.',
  },

  {
    icon: 'business-outline',
    title: 'Vendor Policies',
    body:
      'All vendors listed on EventifyHub operate independently and are solely responsible for the quality, availability, pricing, and execution of their services. EventifyHub acts only as a marketplace connecting customers with vendors and is not responsible for disputes between either party.',
  },

  {
    icon: 'card-outline',
    title: 'Payments',
    body:
      'Payments made through EventifyHub are processed securely. Down payments, cancellations, refunds, and remaining balances are governed by each vendor’s individual policies, which are displayed before confirming a booking.',
  },

  {
    icon: 'refresh-circle-outline',
    title: 'Refund & Cancellation',
    body:
      'Refund requests are handled according to the cancellation policy selected by each vendor. EventifyHub does not guarantee refunds unless specified by the vendor.',
  },

  {
    icon: 'calendar-outline',
    title: 'Bookings',
    body:
      'Customers are responsible for verifying booking details before confirming reservations. Vendors must honor confirmed bookings unless exceptional circumstances arise.',
  },

  {
    icon: 'lock-closed-outline',
    title: 'Privacy & Data Protection',
    body:
      'We value your privacy. Personal information is collected only to improve our services and facilitate bookings. Your data is protected according to our Privacy Policy.',
  },

  {
    icon: 'warning-outline',
    title: 'Prohibited Activities',
    body:
      'The following activities are strictly prohibited:\n\n' +
      '• Fraudulent bookings\n' +
      '• Fake vendor profiles\n' +
      '• Uploading offensive content\n' +
      '• Harassment of users or vendors\n' +
      '• Unauthorized access to accounts\n' +
      '• Any illegal activity through the platform',
  },

  {
    icon: 'document-text-outline',
    title: 'Intellectual Property',
    body:
      'All logos, designs, graphics, text, trademarks, and content available on EventifyHub remain the exclusive property of EventifyHub unless otherwise stated.',
  },

  {
    icon: 'alert-circle-outline',
    title: 'Limitation of Liability',
    body:
      'EventifyHub shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use of our platform or services provided by independent vendors.',
  },

  {
    icon: 'close-circle-outline',
    title: 'Termination',
    body:
      'We reserve the right to suspend or permanently terminate accounts involved in fraudulent activities, policy violations, abusive behavior, or misuse of the platform.',
  },

  {
    icon: 'sync-outline',
    title: 'Changes to Terms',
    body:
      'EventifyHub reserves the right to modify these Terms of Service at any time. Updated terms become effective immediately after publication. Continued use of the platform constitutes acceptance of the revised terms.',
  },

  {
    icon: 'globe-outline',
    title: 'Governing Law',
    body:
      'These Terms of Service shall be governed by the laws of Pakistan. Any disputes shall be resolved under the applicable courts and legal authorities of Pakistan.',
  },

  {
    icon: 'mail-outline',
    title: 'Contact Us',
    body:
      'If you have any questions regarding these Terms of Service, feel free to contact us.\n\nEmail: eventifyhub574@gmail.com\nPhone: +92 312 6655443\nSupport Hours: Monday – Saturday (9:00 AM – 8:00 PM PKT)',
  },
];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerIcon}>
          <Ionicons name="document-text-outline" size={32} color="#fff" />
        </View>

        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>
          Please read these terms carefully before using EventifyHub.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((s, i) => (
          <View key={i} style={styles.card}>
            <Ionicons name={s.icon as any} size={26} color="#780C60" />
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>EventifyHub</Text>
          <Text style={styles.footerText}>Making Every Event Memorable</Text>
          <Text style={styles.footerCopy}>© 2026 EventifyHub. All Rights Reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
 container:{flex:1,backgroundColor:"#F8E9F0"},
 header:{backgroundColor:"#780C60",paddingTop:55,paddingBottom:28,paddingHorizontal:20,borderBottomLeftRadius:28,borderBottomRightRadius:28,alignItems:"center"},
 back:{position:"absolute",top:55,left:20,width:40,height:40,borderRadius:20,backgroundColor:"rgba(255,255,255,.15)",justifyContent:"center",alignItems:"center"},
 headerIcon:{width:64,height:64,borderRadius:32,backgroundColor:"rgba(255,255,255,.15)",justifyContent:"center",alignItems:"center",marginBottom:12},
 title:{fontSize:26,fontWeight:"700",color:"#fff"},
 subtitle:{color:"#eee",textAlign:"center",marginTop:8},
 content:{padding:18},
 card:{backgroundColor:"#fff",borderRadius:16,padding:16,marginBottom:14},
 cardTitle:{fontSize:18,fontWeight:"700",color:"#780C60",marginTop:8},
 cardBody:{fontSize:14,lineHeight:22,color:"#444",marginTop:6},
 footer:{marginTop:20,alignItems:"center",paddingVertical:30},
 footerTitle:{fontSize:20,fontWeight:"700",color:"#780C60"},
 footerText:{marginTop:6,color:"#666"},
 footerCopy:{marginTop:12,fontSize:12,color:"#999"}
});
