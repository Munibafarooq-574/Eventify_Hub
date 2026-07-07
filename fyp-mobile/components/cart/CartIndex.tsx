import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

interface CartItem {
    id: string;
    packageName: string;
    price: number;
}

const CartScreen: React.FC = () => {
    const router = useRouter();

    // 🔁 Replace with your actual cart state from global store or props
    const [cartItems, setCartItems] = useState<CartItem[]>([
        { id: '1', packageName: 'Basic Photography', price: 15000 },
        { id: '2', packageName: 'Premium Photography', price: 25000 },
    ]);

    const total = cartItems.reduce((sum, item) => sum + item.price, 0);

    const handleProceed = () => {
        Alert.alert('Proceeding', 'You clicked proceed');
        // router.push('/checkout') or custom logic
    };

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Your Cart</Text>

            <FlatList
                data={cartItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.cartItem}>
                        <Text style={styles.packageName}>{item.packageName}</Text>
                        <Text style={styles.packagePrice}>Rs. {item.price}/-</Text>
                    </View>
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Your cart is empty.</Text>
                }
            />

            <View style={styles.summary}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalPrice}>Rs. {total}/-</Text>
            </View>

            <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
                <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
        </View>
    );
};

export default CartScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8EAF2',
        padding: 20,
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    cartItem: {
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    packageName: {
        fontSize: 16,
        fontWeight: '500',
    },
    packagePrice: {
        fontSize: 16,
        color: '#7B2869',
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#999',
    },
    summary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 12,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7B2869',
    },
    proceedButton: {
        backgroundColor: '#7B2869',
        paddingVertical: 14,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center',
    },
    proceedButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
