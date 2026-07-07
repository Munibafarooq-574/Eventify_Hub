import { router } from "expo-router";
import React from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const JazzCashPaymentScreen = () => {
    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>JazzCash</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progress}>
                <View style={[styles.progressStep, styles.completedStep]} />
                <View style={styles.progressConnector} />
                <View style={[styles.progressStep, styles.completedStep]} />
                <View style={styles.progressConnector} />
                <View style={[styles.progressStep, styles.completedStep]} />
            </View>

            {/* JazzCash Logo and Instructions */}
            <View style={styles.logoContainer}>
                <Image
                    source={require("@/assets/images/jazzcash.png")} // Replace with your JazzCash logo path
                    style={styles.logo}
                />
                <Text style={styles.description}>
                    Pay with your JazzCash Account.{"\n"}Please make sure you have enough
                    balance in your account.
                </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
                <Text style={styles.instructionHeading}>● FOR JAZZ/WARID</Text>
                <Text style={styles.instructionText}>
                    → Unlock your phone and you will receive a MPIN Input Prompt.
                </Text>
                <Text style={styles.instructionHeading}>● FOR OTHER NETWORKS</Text>
                <Text style={styles.instructionText}>
                    → Log-in to your JazzCash App and enter your MPIN.
                </Text>
                <Text style={styles.note}>
                    Note: Ensure your JazzCash account is Active and has sufficient
                    balance.
                </Text>
            </View>

            {/* Account Number Input */}
            <TextInput
                style={styles.input}
                placeholder="JazzCash Account Number"
                keyboardType="numeric"
            />

            {/* Convenience Note */}
            <Text style={styles.convenienceNote}>
                We will save this account for your convenience. If required, you can
                remove the account in the "Payment Options" section in the "Account"
                Menu.
            </Text>

            {/* Subtotal and Total */}
            <View style={styles.summaryContainer}>
                <View style={styles.row}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>Rs.449,181/-</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.summaryLabel}>Total Amount</Text>
                    <Text style={styles.summaryValueBold}>Rs.449,181/-</Text>
                </View>
            </View>

            {/* Pay Now Button */}
            <TouchableOpacity style={styles.payNowButton}
                onPress={() => {
                    router.push("/paymentconfirmation");
                }}>
                <Text style={styles.payNowText}>Pay Now</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        paddingHorizontal: 20,
        paddingTop: 70,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    backArrow: {
        fontSize: 18,
        color: '#780C60', // Dark purple color
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#000",
    },
    progress: {
        flexDirection: "row",
        alignItems: "center",
    },
    progressStep: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: "#780C60",
    },
    completedStep: {
        backgroundColor: '#780C60', // Dark purple color
    },
    progressConnector: {
        height: 2,
        flex: 1,
        backgroundColor: '#780C60', // Dark purple color
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    logo: {
        width: 100,
        height: 50,
        marginBottom: 10,
    },
    description: {
        fontSize: 14,
        textAlign: "center",
        color: "#555",
    },
    instructionsContainer: {
        marginBottom: 20,
    },
    instructionHeading: {
        fontSize: 14,
        fontWeight: "bold",
        color: '#780C60', // Dark purple color
        marginBottom: 5,
    },
    instructionText: {
        fontSize: 14,
        color: "#555",
        marginBottom: 10,
    },
    note: {
        fontSize: 12,
        color: "#999",
        marginBottom: 20,
    },
    input: {
        backgroundColor: "#FFF",
        borderRadius: 5,
        padding: 15,
        fontSize: 14,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    convenienceNote: {
        fontSize: 12,
        color: "#555",
        textAlign: "center",
        marginBottom: 20,
    },
    summaryContainer: {
        borderTopWidth: 1,
        borderTopColor: "#DDD",
        paddingTop: 20,
        marginBottom: 20,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: "#555",
    },
    summaryValue: {
        fontSize: 14,
        color: "#333",
    },
    summaryValueBold: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#8A2BE2",
    },
    payNowButton: {
        backgroundColor: '#780C60', // Dark purple color
        borderRadius: 5,
        paddingVertical: 15,
        alignItems: "center",
    },
    payNowText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default JazzCashPaymentScreen;
