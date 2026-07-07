import { router } from "expo-router";
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
} from "react-native";

const ConfirmationScreen = () => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            {/* Confirmation Header */}
            <Text style={styles.title}>Confirmed</Text>

            {/* Check Icon */}
            <View style={styles.iconContainer}>
                <View style={styles.circle}>
                    <Text style={styles.checkIcon}>✔</Text> {/* Tick will now be white */}
                </View>
            </View>

            {/* Payment Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment Detail</Text>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Order No.</Text>
                    <Text style={styles.cardValue}>1485156215495612</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Total</Text>
                    <Text style={styles.cardValue}>Rs. 449,181.00</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Date & Time</Text>
                    <Text style={styles.cardValue}>05.11.2023 - 21:29:10</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Payment Method</Text>
                    <Text style={styles.cardValue}>Easypaisa</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Name</Text>
                    <Text style={styles.cardValue}>MIDHAT RIZVI</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Email</Text>
                    <Text style={styles.cardValue}>midhat12@gmail.com</Text>
                </View>
            </View>

            {/* Receipt Message */}
            <Text style={styles.receiptText}>A receipt will be sent directly to the email</Text>

            {/* Buttons */}
            <TouchableOpacity style={styles.reviewButton} onPress={() => console.log("Review Order")}>
                <Text style={styles.reviewText}>Review</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={() => router.push('/dashboard')}>
                <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#F8E9F0',
        alignItems: "center",
        padding: 20,
        paddingTop: 70,
    },
    backButton: {
        position: "absolute",
        top: 30,
        left: 20,
    },
    backArrow: {
        fontSize: 20,
        color: "#780C60",
        paddingTop: 70,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#000",
        marginTop: 60,
    },
    iconContainer: {
        marginVertical: 30,
    },
    circle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#780C60",
        justifyContent: "center",
        alignItems: "center",
    },
    checkIcon: {
        fontSize: 40,
        color: "#ffffff",
    },
    card: {
        width: "90%",
        backgroundColor: "#FFF",
        borderRadius: 10,
        padding: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 15,
    },
    cardRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    cardLabel: {
        fontSize: 14,
        color: "#555",
    },
    cardValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
    },
    receiptText: {
        fontSize: 14,
        color: "#555",
        marginBottom: 20,
        textAlign: "center",
    },
    reviewButton: {
        backgroundColor: "#780C60",
        borderRadius: 5,
        paddingVertical: 15,
        alignItems: "center",
        width: "90%",
        marginBottom: 10,
    },
    reviewText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    doneButton: {
        backgroundColor: "#FFF",
        borderRadius: 5,
        paddingVertical: 15,
        alignItems: "center",
        width: "90%",
        borderWidth: 1,
        borderColor: "#780C60",
    },
    doneText: {
        color: "#780C60",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default ConfirmationScreen;
