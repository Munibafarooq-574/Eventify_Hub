import { router } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const CreditCardPaymentScreen = () => {
    const [rememberCard, setRememberCard] = useState(false);
    const [sendReceipt, setSendReceipt] = useState(false);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Credit /Debit Card</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progress}>
                <View style={[styles.progressStep, styles.completedStep]} />
                <View style={styles.progressConnector} />
                <View style={[styles.progressStep, styles.completedStep]} />
                <View style={styles.progressConnector} />
                <View style={[styles.progressStep, styles.completedStep]} />
            </View>

            {/* Payment Method */}
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.methodCard}>
                <Image
                    source={require("@/assets/images/mastercard.png")} // Replace with your card image path
                    style={styles.methodIcon}
                />
            </View>

            {/* Cardholder Name */}
            <Text style={styles.label}>Cardholder Name</Text>
            <View style={styles.inputContainer}>
                <Image
                    source={require("@/assets/images/mastercard.png")} // Replace with your user icon path
                    style={styles.icon}
                />
                <TextInput placeholder="Cardholder Name" style={styles.input} />
            </View>

            {/* Card Number */}
            <Text style={styles.label}>Cardnumber</Text>
            <View style={styles.inputContainer}>
                <Image
                    source={require("@/assets/images/mastercard.png")} // Replace with your card icon path
                    style={styles.icon}
                />
                <TextInput placeholder="Card Number" style={styles.input} keyboardType="numeric" />
            </View>

            {/* Expiry and CVV */}
            <View style={styles.row}>
                <View style={styles.inputContainerSmall}>
                    <Image
                        source={require("@/assets/images/mastercard.png")} // Replace with your calendar icon path
                        style={styles.icon}
                    />
                    <TextInput placeholder="MM/YY" style={styles.input} />
                </View>
                <View style={styles.inputContainerSmall}>
                    <Image
                        source={require("@/assets/images/mastercard.png")} // Replace with your lock icon path
                        style={styles.icon}
                    />
                    <TextInput placeholder="CVV" style={styles.input} keyboardType="numeric" />
                </View>
            </View>

            {/* Remember Card Switch */}
            <View style={styles.switchRow}>
                <Switch
                    value={rememberCard}
                    onValueChange={(value) => setRememberCard(value)}
                    trackColor={{ false: "#DDD", true: "#780C60" }}
                    thumbColor={rememberCard ? "#fffx" : "#FFF"}
                />
                <Text style={styles.switchText}>Remember this card</Text>
            </View>

            {/* Send Receipt Switch */}
            <View style={styles.switchRow}>
                <Switch
                    value={sendReceipt}
                    onValueChange={(value) => setSendReceipt(value)}
                    trackColor={{ false: "#DDD", true: "#780C60" }}
                    thumbColor={sendReceipt ? "#fff" : "#FFF"}
                />
                <Text style={styles.switchText}>Send receipt to my email</Text>
            </View>

            {/* Amount Payable */}
            <View style={styles.divider} />
            <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Amount Payable</Text>
                <Text style={styles.amountValue}>Rs.449,181/-</Text>
            </View>

            {/* Pay Now Button */}
            <TouchableOpacity style={styles.payNowButton}
                onPress={() => {
                    router.push("/paymentconfirmation");
                }}
            >
                <Text style={styles.payNowText}>Pay Now</Text>
            </TouchableOpacity>
        </View>
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
        color: "#780C60",
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#555",
        marginBottom: 10,
    },
    methodCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    methodIcon: {
        width: 40,
        height: 40,
    },
    label: {
        fontSize: 14,
        color: "#555",
        marginBottom: 5,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    inputContainerSmall: {
        flex: 0.48,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: 5,
        padding: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    icon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 15,
    },
    switchText: {
        marginLeft: 10,
        fontSize: 14,
        color: "#555",
    },
    divider: {
        height: 1,
        backgroundColor: "#DDD",
        marginVertical: 20,
    },
    amountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    amountLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    amountValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: '#780C60', // Dark purple color
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

export default CreditCardPaymentScreen;
