import React from "react";
import {View,Text,StyleSheet,ScrollView,TouchableOpacity} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {router} from "expo-router";

const sections = [
  {
    icon: "information-circle-outline",
    title: "Introduction",
    body:
      "At EventifyHub, we are committed to protecting your privacy and safeguarding your personal information. This Privacy Policy explains how we collect, use, store, and protect your data while you use our platform.",
  },

  {
    icon: "person-outline",
    title: "Information We Collect",
    body:
      "• Personal Information: Name, email address, phone number, and address provided during account registration or booking.\n\n" +
      "• Event Details: Information related to your events, including preferences, budget, selected vendors, dates, and booking history.\n\n" +
      "• Device Information: IP address, device type, operating system, browser information, and app usage statistics for analytics and performance improvements.",
  },

  {
    icon: "analytics-outline",
    title: "How We Use Your Information",
    body:
      "• To connect you with vendors and manage your bookings.\n\n" +
      "• To provide AI-powered recommendations based on your preferences.\n\n" +
      "• To improve our platform using analytics and user feedback.\n\n" +
      "• To communicate booking updates, promotions, service announcements, and important notifications.\n\n" +
      "• To maintain platform security and prevent fraudulent activities.",
  },

  {
    icon: "share-social-outline",
    title: "Sharing Your Information",
    body:
      "We only share your information with vendors you choose to work with and trusted third-party services that are necessary for payment processing, authentication, or platform functionality. We never sell or rent your personal information to advertisers or marketing companies.",
  },

  {
    icon: "lock-closed-outline",
    title: "Data Security",
    body:
      "We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. Although we continuously improve our security practices, no online platform can guarantee complete security. We encourage you to protect your account credentials and never share your password.",
  },

  {
    icon: "shield-checkmark-outline",
    title: "Your Rights",
    body:
      "You have the right to:\n\n" +
      "• Access your personal information.\n\n" +
      "• Update or correct inaccurate information.\n\n" +
      "• Request deletion of your account and personal data.\n\n" +
      "• Opt out of promotional emails and marketing communications.\n\n" +
      "• Request details regarding how your information is processed.",
  },

  {
    icon: "globe-outline",
    title: "Cookies & Analytics",
    body:
      "EventifyHub may use cookies, analytics tools, and similar technologies to improve user experience, monitor application performance, remember preferences, and analyze usage patterns. These technologies help us continuously enhance our services.",
  },

  {
    icon: "phone-portrait-outline",
    title: "Third-Party Services",
    body:
      "Our platform may integrate with trusted third-party services such as payment gateways, maps, authentication providers, and analytics platforms. These services have their own privacy policies, and we encourage users to review them before using those services.",
  },

  {
    icon: "refresh-outline",
    title: "Changes to This Privacy Policy",
    body:
      "EventifyHub reserves the right to update or modify this Privacy Policy whenever necessary. Significant changes will be communicated through app notifications or email. Continued use of the platform after updates indicates acceptance of the revised policy.",
  },

  {
    icon: "mail-outline",
    title: "Contact Us",
    body:
      "If you have any questions regarding this Privacy Policy or how we handle your personal information, please contact us.\n\n" +
      "📧 Email: eventifyhub574@gmail.com\n\n" +
      "📞 Phone: +92 312 6655443\n\n" +
      "🕘 Support Hours: Monday – Saturday (9:00 AM – 8:00 PM PKT)",
  },
];
export default function PrivacyPolicyScreen(){
return <View style={s.c}>
<View style={s.h}>
<TouchableOpacity onPress={()=>router.back()} style={s.b}><Ionicons name="arrow-back" size={22} color="#fff"/></TouchableOpacity>
<View style={s.ic}><Ionicons name="shield-checkmark-outline" size={32} color="#fff"/></View>
<Text style={s.t}>Privacy Policy</Text>
<Text style={s.st}>Your privacy matters. Learn how EventifyHub collects, uses and protects your information.</Text>
</View>
<ScrollView contentContainerStyle={s.content}>
{sections.map((x,i)=><View key={i} style={s.card}>
<Ionicons name={x.icon as any} size={24} color="#780C60"/>
<Text style={s.ct}>{x.title}</Text>
<Text style={s.cb}>{x.body}</Text>
</View>)}
<View style={s.footer}>
<Text style={s.ft}>EventifyHub</Text>
<Text style={s.fs}>Making Every Event Memorable</Text>
<Text style={s.fc}>© 2026 EventifyHub • All Rights Reserved</Text>
</View>
</ScrollView>
</View>
}
const s=StyleSheet.create({
c:{flex:1,backgroundColor:"#F8E9F0"},
h:{backgroundColor:"#780C60",paddingTop:55,paddingBottom:28,paddingHorizontal:20,alignItems:"center",borderBottomLeftRadius:28,borderBottomRightRadius:28},
b:{position:"absolute",left:20,top:55,width:40,height:40,borderRadius:20,backgroundColor:"rgba(255,255,255,.15)",justifyContent:"center",alignItems:"center"},
ic:{width:64,height:64,borderRadius:32,backgroundColor:"rgba(255,255,255,.15)",justifyContent:"center",alignItems:"center",marginBottom:10},
t:{fontSize:26,fontWeight:"700",color:"#fff"},
st:{color:"#eee",textAlign:"center",marginTop:8,lineHeight:20},
content:{padding:18},
card:{backgroundColor:"#fff",borderRadius:16,padding:16,marginBottom:14},
ct:{fontSize:18,fontWeight:"700",color:"#780C60",marginTop:8},
cb:{fontSize:14,lineHeight:22,color:"#444",marginTop:6},
footer:{paddingVertical:30,alignItems:"center"},
ft:{fontSize:20,fontWeight:"700",color:"#780C60"},
fs:{color:"#666",marginTop:4},
fc:{marginTop:10,fontSize:12,color:"#999"}
});
