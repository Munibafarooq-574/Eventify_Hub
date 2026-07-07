import { deleteSecureData, getSecureData, saveSecureData } from "@/store"; // Import the function to fetch secure data
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const AIPackageScreen = () => {
    const [aiPackage, setAiPackage] = useState<any>(null);

    useEffect(() => {
        const fetchPackageData = async () => {
            try {
                const data = await getSecureData("aiPackage") || "";
                const parsedData = JSON.parse(data);
                setAiPackage(parsedData); // Store the parsed data
            } catch (error) {
                console.error("Error fetching AI package data:", error);
            }
        };

        fetchPackageData();
    }, []);

    const handleAddToCart = async (pkg: any) => {
        try {
            // Step 1: Get the existing cart data (if any)
            const existingCartData = await getSecureData('cartData');
            let cart = existingCartData ? JSON.parse(existingCartData) : { vendors: [] };
            // console.log("cart.vendors", cart.vendors, "vendorData", vendorData)
            // Step 2: Check if the vendor already exists in the cart
            const vendorIndex = cart.vendors.findIndex((vendor: any) => vendor.vendor._id === pkg.vendorId);
            // If the vendor exists, we need to update the selected package
            if (vendorIndex !== -1) {
                // Update the selected package for the existing vendor
                cart.vendors[vendorIndex].packages.push(pkg); // Add package to this vendor's list
            } else {
                // If the vendor doesn't exist in the cart, create a new vendor entry
                const vendorPackageData = {
                    vendor: { _id: pkg.vendorId, name: pkg.vendorName },
                    packages: [pkg],    // Saving the selected package data
                };
                cart.vendors.push(vendorPackageData); // Add new vendor with package
            }

            // Step 3: Save the updated cart data back
            await saveSecureData('cartData', JSON.stringify(cart));
        } catch (error) {
            console.error('Error handling add to cart:', error);
        }
    };

    const proceed = async () => {
        for (let index = 0; index < aiPackage.packages.length; index++) {
            await handleAddToCart(aiPackage.packages[index]);
        }
    }

    if (!aiPackage) {
        return <Text>Loading...</Text>; // Show loading text while data is being fetched
    }

    const renderItem = ({ item }: { item: typeof aiPackage.packages[0] }) => (
        <View style={styles.card}>
            <Image source={require("@/assets/images/GetStarted.png")} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <Text style={styles.category}>{item.packageName}</Text>
                <Text style={styles.name}>{item.vendorName}</Text>
                <Text style={styles.price}>Rs.{item.price}/head</Text>
                <Text style={styles.services}>{item.services}</Text>
            </View>
            <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsText}>View Details</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your AI Package Is Ready</Text>
            <Text style={styles.subtitle}>
                Tailored to your preferences and budget.{"\n"}Review and customize your package below.
            </Text>
            <Text style={styles.note}>Prices will update as you make changes.</Text>

            <FlatList
                data={aiPackage.packages}
                keyExtractor={(item) => item.vendorId}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContainer}
            />

            <View style={styles.summary}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>Rs.{aiPackage.totalCost}/-</Text>
                <Text style={styles.budget}>Your Budget: Rs.{aiPackage.budget}/-</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.startOverButton}
                    onPress={() => router.push('/EventDetailsForm')}
                >
                    <Text style={styles.startOverText}>Start Over</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.proceedButton}
                    onPress={async () => {
                        await deleteSecureData("cartData");
                        await proceed();
                        router.push('/OrderReview')
                    }}
                >
                    <Text style={styles.proceedText}>Proceed To Pay</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.discount}>
                Enjoy a <Text style={styles.bold}>10% discount</Text> when you complete your booking with Eventify Hub today!
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        padding: 20,
        paddingTop: 50,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        textAlign: "center",
        color: "#555",
    },
    note: {
        fontSize: 14,
        textAlign: "center",
        color: "#999",
        marginBottom: 20,
    },
    listContainer: {
        paddingBottom: 20,
    },
    row: {
        justifyContent: "space-between",
        marginBottom: 10,
    },
    card: {
        backgroundColor: "#FFF",
        borderRadius: 10,
        flex: 1,
        marginHorizontal: 5,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        overflow: "hidden",
        paddingBottom: 6,
    },
    cardImage: {
        width: "100%",
        height: 90,
    },
    cardContent: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    category: {
        fontSize: 14,
        color: "#7A7A7A",
        fontWeight: "bold",
    },
    name: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginTop: 5,
    },
    price: {
        fontSize: 14,
        color: "#555",
        marginTop: 2,
    },
    services: {
        fontSize: 12,
        color: "#999",
        marginTop: 5,
        marginBottom: 5,
    },
    detailsButton: {
        backgroundColor: "#E6E6E6",
        borderRadius: 5,
        paddingVertical: 5,
        paddingHorizontal: 10,
        alignSelf: "center",
        marginTop: 5,
    },
    detailsText: {
        fontSize: 12,
        color: "#333",
    },
    summary: {
        alignItems: "center",
        marginBottom: 20,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: "bold",
    },
    totalValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#E53935",
    },
    budget: {
        fontSize: 16,
        color: "#555",
        marginTop: 5,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    startOverButton: {
        backgroundColor: "#E6E6E6",
        borderRadius: 5,
        padding: 15,
        flex: 1,
        marginRight: 10,
    },
    startOverText: {
        textAlign: "center",
        color: "#333",
    },
    proceedButton: {
        backgroundColor: "#E53935",
        borderRadius: 5,
        padding: 15,
        flex: 1,
        marginLeft: 10,
    },
    proceedText: {
        textAlign: "center",
        color: "#FFF",
    },
    discount: {
        fontSize: 14,
        textAlign: "center",
        color: "#555",
    },
    bold: {
        fontWeight: "bold",
        color: "#E53935",
    },
});

export default AIPackageScreen;
