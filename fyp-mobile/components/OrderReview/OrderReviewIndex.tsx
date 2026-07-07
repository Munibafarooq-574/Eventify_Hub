import postPlaceOrder from '@/services/postPlaceOrder';
import { deleteSecureData, getSecureData } from '@/store'; // Assuming you have this function to get data from local storage
import { router } from 'expo-router';
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message"; // Import Toast

const MyOrdersScreen = () => {
    const [cartData, setCartData] = useState<any>(null);
    const [totalAmount, setTotalAmount] = useState<number>();
    const [discount, setDiscount] = useState<number>();
    const [discountedTotal, setDiscountedTotal] = useState<number>();
    const [cateringCategory, setCateringCategory] = useState<any>();
    const [guests, setGuests] = useState<number>(0);

    useEffect(() => {
        const fetchCartData = async () => {
            try {
                const storedCart = await getSecureData('cartData');
                const eventDetails = JSON.parse(await getSecureData("eventDetails") || "");
                setGuests(parseInt(eventDetails.guests.toString()));
                const categories = JSON.parse(await getSecureData("categories") || "");
                const cateringCategory = categories.find((x: any) => x.name.toLowerCase() === "caterings");
                setCateringCategory(cateringCategory);
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

    useEffect(() => {
        if (cartData && cartData.vendors.length > 0) {
            const totalAmount = calculateTotalAmount();
            setTotalAmount(totalAmount);
            const discount = (totalAmount * 10) / 100;
            setDiscount(discount);
            const discountedTotal = totalAmount - discount;
            setDiscountedTotal(discountedTotal);
        }
    }, [cartData])

    // Calculate total amount
    const calculateTotalAmount = () => {
        let totalAmount = 0;
        cartData.vendors.forEach((vendor: any) => {
            vendor.packages.forEach((pkg: any) => {
                if (cateringCategory._id === vendor.vendor.buisnessCategory) {
                    totalAmount += (guests * pkg.price);
                } else {
                    totalAmount += pkg.price;
                }
            });
        });
        return totalAmount;
    };

    // Handle Proceed to Checkout
    const handleCheckout = async () => {
        try {
            const storedCart = await getSecureData('cartData');
            const cart = JSON.parse(storedCart || "");

            if (cart.vendors.length === 0) {
                Toast.show({
                    type: 'error',
                    text1: 'Empty Cart',
                    text2: 'Your cart is empty. Please add items to proceed.',
                    position: 'bottom',
                });
                return;
            }
            const eventDetails = JSON.parse(await getSecureData("eventDetails") || "");
            const user = JSON.parse(await getSecureData("user") || "");
            const eventDate = eventDetails?.eventDate; // Replace with your actual selected date
            const eventTime = '18:00'; // Replace with your actual selected time
            const organizerId = user?._id
            const guests = eventDetails?.guests;
            const eventName = eventDetails?.eventName;
            const services = cart.vendors.flatMap((vendor: any) =>
                vendor.packages.map((pkg: any) => ({
                    vendorId: vendor.vendor._id,
                    serviceName: pkg.packageName,
                    price: pkg.price,
                }))
            );
            console.log({ organizerId, eventDate, eventTime, services, guests, eventName });
            const response = await postPlaceOrder({ organizerId, eventDate, eventTime, services, guests, eventName });
            if (response) {
                Toast.show({
                    type: 'success',
                    text1: 'Order Placed',
                    text2: 'Your order has been successfully placed!',
                    position: 'bottom',
                });
                // Optionally, clear the cart after order is placed
                // saveSecureData('cartData', JSON.stringify({ vendors: [] }));
                await deleteSecureData("cartData");
                await deleteSecureData("eventDetails");
                router.push("/OrderSummary");
            } else {
                throw new Error('Failed to place order');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to place order. Please try again.',
                position: 'bottom',
            });
        }
    };

    if (!cartData) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading cart data...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Orders</Text>
                <View style={styles.progress}>
                    <View style={[styles.progressStep, styles.completedStep]} />
                    <View style={[styles.progressConnector]} />
                    <View style={styles.progressStep} />
                    <View style={[styles.progressConnector]} />
                    <View style={styles.progressStep} />
                </View>
            </View>

            {cartData.vendors.length === 0 ? (
                <View style={styles.emptyCartContainer}>
                    <Text style={styles.emptyCartText}>Your cart is empty</Text>
                </View>
            ) : (
                cartData.vendors.map((vendor: any, vendorIndex: number) => (
                    <View key={vendorIndex} style={styles.card}>
                        <Image source={{ uri: vendor.vendor.coverImage }} style={styles.cardImage} />
                        <View style={styles.cardContent}>
                            <Text style={styles.name}>{vendor.vendor.name}</Text>
                            {vendor.packages.map((pkg: any, packageIndex: number) => (
                                <View key={packageIndex} style={styles.packageContainer}>
                                    <Text style={styles.packageName}>{pkg.packageName}</Text>
                                    <Text style={styles.packagePrice}>Rs. {cateringCategory && cateringCategory._id === vendor.vendor.buisnessCategory ? (pkg.price * guests).toLocaleString() : pkg.price.toLocaleString()}/-</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ))
            )}

            <View style={styles.divider} />

            <View style={styles.summary}>
                <Text style={styles.summaryText}>Total Amount</Text>
                <Text style={styles.summaryPrice}>Rs.{totalAmount?.toLocaleString()}/-</Text>
            </View>
            <View style={styles.summary}>
                <Text style={styles.summaryText}>Eventify Hub Discount 10%</Text>
                <Text style={styles.discountPrice}>
                    -Rs.{discount?.toLocaleString()}/-
                </Text>
            </View>
            <View style={styles.summary}>
                <Text style={styles.summaryText}>New Total Amount</Text>
                <Text style={styles.summaryPrice}>Rs.{discountedTotal?.toLocaleString()}/-</Text>
            </View>

            <TouchableOpacity
                style={styles.bookButton}
                onPress={handleCheckout}
            >
                <Text style={styles.bookButtonText}>Book Now</Text>
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
        alignItems: "center",
        marginBottom: 30,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#000",
        marginBottom: 15,
    },
    progress: {
        flexDirection: "row",
        alignItems: "center",
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
    card: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    cardImage: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10,
    },
    cardContent: {
        flex: 1,
        justifyContent: "space-between",
    },
    name: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    packageContainer: {
        marginTop: 10,
    },
    packageName: {
        fontSize: 16,
        color: '#7A7A7A',
    },
    packagePrice: {
        fontSize: 16,
        color: '#7B2869', // Dark purple color
        fontWeight: "bold",
    },
    divider: {
        height: 1,
        backgroundColor: "#E0E0E0",
        marginVertical: 20,
    },
    summary: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    summaryText: {
        fontSize: 14,
        color: "#333",
        fontWeight: "bold",
    },
    summaryPrice: {
        fontSize: 16,
        color: '#780C60', // Dark purple color
        fontWeight: "bold",
    },
    discountPrice: {
        fontSize: 16,
        color: "#FF0000",
        fontWeight: "bold",
    },
    bookButton: {
        backgroundColor: '#780C60', // Dark purple color
        borderRadius: 5,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 20,
    },
    bookButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCartContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    emptyCartText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7A7A7A',
    },
});

export default MyOrdersScreen;
