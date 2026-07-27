import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import postAddPackages from '@/services/postAddPackages';
import updatePackage from '@/services/updatePackage';
import { getSecureData } from '@/store';

export default function VendorPackagesScreen() {
    const { packageId } = useLocalSearchParams();
    const isEditMode = !!packageId;

    const [packageName, setPackageName] = useState('');
    const [price, setPrice] = useState('');
    const [services, setServices] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            // ✅ Same pattern as onboarding PackagesScreen — get user object, then _id
            const userData = JSON.parse((await getSecureData('user')) || '{}');
            const userId: string | undefined = userData?._id;

            if (!userId) {
                Alert.alert('Error', 'Could not find logged-in vendor. Please log in again.');
                setLoading(false);
                return;
            }

            if (isEditMode) {
                await updatePackage(packageId as string, {
                    packageName,
                    price: Number(price),
                    services,
                });
            } else {
                await postAddPackages(userId, {
                    packages: [
                        {
                            packageName,
                            price: Number(price),
                            services,
                        },
                    ],
                });
            }
            router.back();
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not save package. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.heading}>
                {isEditMode ? 'Edit Package' : 'Add New Package'}
            </Text>

            <Text style={styles.label}>Package Name</Text>
            <TextInput
                style={styles.input}
                value={packageName}
                onChangeText={setPackageName}
                placeholder="e.g. Simple Birthday Package"
            />

            <Text style={styles.label}>Price (Rs.)</Text>
            <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="e.g. 2500"
            />

            <Text style={styles.label}>What's Included</Text>
            <TextInput
                style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                value={services}
                onChangeText={setServices}
                multiline
                placeholder="Describe what's included in this package..."
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Package'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#FAF6F9' },
    heading: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: '#221A20' },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 6, color: '#221A20' },
    input: {
        borderWidth: 1,
        borderColor: '#EFE0EB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    saveButton: {
        backgroundColor: '#7B2869',
        borderRadius: 24,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});