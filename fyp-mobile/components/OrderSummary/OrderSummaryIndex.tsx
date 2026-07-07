import { getSecureData } from '@/store'; // Assuming you have this function to get data from local storage
import * as FileSystem from 'expo-file-system'; // For saving files in file manager
import * as Print from 'expo-print'; // Import the Print API
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message"; // Import Toast

const SummaryScreen = () => {
    const [cartData, setCartData] = useState<any>(null);

    useEffect(() => {
        const fetchCartData = async () => {
            try {
                const storedCart = await getSecureData('cartData');
                if (storedCart) {
                    setCartData(JSON.parse(storedCart));
                } else {
                    setCartData({ vendors: [] });
                }
            } catch (error) {
                console.error("Error fetching cart data:", error);
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: "Failed to load cart data. Please try again.",
                    position: "bottom",
                });
            }
        };

        fetchCartData();
    }, []);

    // Calculate the total amount from cart data
    const calculateTotalAmount = () => {
        let totalAmount = 0;
        cartData?.vendors?.forEach((vendor: any) => {
            vendor.packages.forEach((pkg: any) => {
                totalAmount += pkg.price;
            });
        });
        return totalAmount;
    };

    const totalAmount = calculateTotalAmount();
    const discount = (totalAmount * 10) / 100;
    const discountedTotal = totalAmount - discount;

    // Handle saving the receipt as a PDF to file manager
    const handleSaveReceipt = async () => {
        if (!cartData || cartData.vendors.length === 0) {
            Toast.show({
                type: "error",
                text1: "Empty Cart",
                text2: "Your cart is empty. Please add items to proceed.",
                position: "bottom",
            });
            return;
        }

        try {
            // Create HTML content for the receipt
            const htmlContent = `
                <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; }
                            .header { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
                            .vendor { font-size: 18px; font-weight: bold; margin-top: 20px; }
                            .package { font-size: 14px; color: #7A7A7A; }
                            .total { font-size: 16px; font-weight: bold; }
                            .discount { font-size: 14px; color: #FF0000; }
                            .final-total { font-size: 18px; font-weight: bold; color: #780C60; }
                        </style>
                    </head>
                    <body>
                        <div class="header">Receipt Summary</div>
                        ${cartData.vendors.map((vendor: any) => `
                            <div class="vendor">${vendor.vendor.name}</div>
                            ${vendor.packages.map((pkg: any) => `
                                <div class="package">${pkg.packageName} - Rs.${pkg.price}/-</div>
                            `).join('')}
                        `).join('')}
                        <div class="total">Total Amount: Rs. ${totalAmount}</div>
                        <div class="discount">Discount: Rs. ${discount}</div>
                        <div class="final-total">Final Amount: Rs. ${discountedTotal}</div>
                    </body>
                </html>
            `;

            // Generate PDF from HTML
            const { uri } = await Print.printToFileAsync({ html: htmlContent });

            // Define the path where the PDF will be saved
            const pdfPath = `${FileSystem.documentDirectory}receipt.pdf`;

            // Move the generated PDF to the specified path
            await FileSystem.moveAsync({
                from: uri,
                to: pdfPath,
            });

            // Notify the user
            Toast.show({
                type: "success",
                text1: "Receipt Saved",
                text2: "Your receipt has been saved successfully as a PDF.",
                position: "bottom",
            });

            // Optionally, show the file URI or alert the user
            Alert.alert("Receipt Saved", `The receipt has been saved to: ${pdfPath}`);

        } catch (error) {
            console.error("Error saving receipt:", error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to save the receipt. Please try again.",
                position: "bottom",
            });
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Summary</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progress}>
                <View style={[styles.progressStep, styles.completedStep]} />
                <View style={styles.progressConnector} />
                <View style={[styles.progressStep, styles.completedStep]} />
                <View style={styles.progressConnector} />
                <View style={styles.progressStep} />
            </View>

            {/* Centered Vendor Message Section */}
            <View style={styles.vendorMessageBox}>
                <Text style={styles.vendorMessageText}>
                    ✅ Thank you! The vendor will call you shortly, and payment will be made directly to the vendor.
                </Text>
            </View>

            {/* Receipt Section */}
            <View style={styles.receiptContainer}>
                {/* <Text style={styles.receiptText}>Receipt Details</Text>
                {cartData?.vendors?.map((vendor: any, vendorIndex: number) => (
                    <View key={vendorIndex}>
                        <Text style={styles.vendorName}>{vendor.vendor.name}</Text>
                        {vendor.packages.map((pkg: any, packageIndex: number) => (
                            <Text key={packageIndex} style={styles.packageDetails}>
                                {pkg.packageName} - Rs.{pkg.price}/-
                            </Text>
                        ))}
                    </View>
                ))}

                <Text style={styles.totalText}>Total Amount: Rs. {totalAmount}</Text>
                <Text style={styles.discountText}>Discount: Rs. {discount}</Text>
                <Text style={styles.discountedTotalText}>Final Amount: Rs. {discountedTotal}</Text> */}
            </View>

            {/* Button Section */}
            <View>
                {/* Save Receipt Button */}
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveReceipt}
                >
                    <Text style={styles.saveButtonText}>Save Receipt</Text>
                </TouchableOpacity>

                {/* Go to Dashboard Button */}
                <TouchableOpacity
                    style={styles.dashboardButton}
                    onPress={() => router.push('/dashboard')} // Replace with your actual dashboard route
                >
                    <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1, // Ensures the content stretches to fill the screen
        backgroundColor: "#FCEFF8",
        paddingHorizontal: 20,
        paddingTop: 70,
        justifyContent: 'space-between', // Makes sure the buttons stay at the bottom
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
        marginBottom: 20,
    },
    progressStep: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: "#E0E0E0",
    },
    completedStep: {
        backgroundColor: '#780C60', // Dark purple color
    },
    progressConnector: {
        height: 2,
        flex: 1,
        backgroundColor: '#780C60', // Dark purple color
    },
    vendorMessageBox: {
        backgroundColor: '#E8F5E9', // light green background
        padding: 15,
        borderRadius: 8,
        marginBottom: 30,
        alignItems: 'center',
    },
    vendorMessageText: {
        color: '#2E7D32', // dark green text
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: '#780C60', // dark purple
        borderRadius: 5,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    dashboardButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#780C60', // dark purple border
        borderRadius: 5,
        paddingVertical: 12,
        alignItems: 'center',
    },
    dashboardButtonText: {
        color: '#780C60',
        fontSize: 16,
        fontWeight: 'bold',
    },
    receiptContainer: {
        padding: 20,
        // backgroundColor: '#FFF',
        borderRadius: 10,
        marginBottom: 30,
    },
    receiptText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    vendorName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    packageDetails: {
        fontSize: 14,
        color: '#7A7A7A',
    },
    totalText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    discountText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF0000',
    },
    discountedTotalText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#780C60',
    },
});

export default SummaryScreen;
