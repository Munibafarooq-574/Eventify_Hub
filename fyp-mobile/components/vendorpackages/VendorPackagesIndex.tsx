import deletePackage from '@/services/deletePackage';
import { getSecureData, saveSecureData, getUserData, saveUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons'; // For icons
import { useRoute } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PackageScreen = () => {
    const [isModalVisible, setModalVisible] = useState(false);
    const [packageDetails, setPackageDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const route = useRoute();

    const params = route.params as
        | { packageId?: string }
        | undefined;

    const packageId = params?.packageId;

    useEffect(() => {
        console.log("packageId", packageId);
        if (packageId) {
            fetchPackageDetails(packageId);
        } else {
            setLoading(false);
        }
    }, [packageId]);

    // Helper: reads user object from whichever storage actually has it
    const readUser = async (): Promise<any | null> => {
        try {
            const userRaw = await getSecureData("user");
            if (userRaw) {
                return JSON.parse(userRaw);
            }
        } catch (err) {
            console.error("Failed to parse user from getSecureData:", err);
        }

        try {
            const userObj = await getUserData(); // already parsed by store/index.ts
            if (userObj) {
                return userObj;
            }
        } catch (err) {
            console.error("Failed to read user from getUserData:", err);
        }

        return null;
    };

    // Helper: writes user object back to whichever storage it came from
    const writeUser = async (user: any) => {
        const userRaw = await getSecureData("user");
        if (userRaw) {
            await saveSecureData('user', JSON.stringify(user));
        } else {
            await saveUserData(user);
        }
    };

    const fetchPackageDetails = async (packageId: string) => {
        setLoading(true);
        try {
            const user = await readUser();
            if (!user) {
                console.error('User not found in any storage');
                setPackageDetails(null);
                return;
            }

            if (!user.packages || !Array.isArray(user.packages)) {
                console.error('User has no packages array');
                setPackageDetails(null);
                return;
            }

            const packageObj = user.packages.find((x: any) => x._id === packageId);
            if (!packageObj) {
                console.error('Package not found for id:', packageId);
            }
            setPackageDetails(packageObj || null);
        } catch (error) {
            console.error('Error fetching package details:', error);
            setPackageDetails(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log("packageDetails updated:", packageDetails);
    }, [packageDetails]);

    const confirmLogout = async () => {
        if (!packageId) {
            console.error('Package ID is missing');
            setModalVisible(false);
            return;
        }

        setModalVisible(false);
        console.log('Deleting Package...');

        try {
            await deletePackage(packageId);

            const user = await readUser();
            if (!user || !user.packages) {
                console.error('User or packages not found');
                return;
            }

            user.packages = user.packages.filter((pkg: any) => pkg._id !== packageId);

            await writeUser(user);

            router.push('/vendordashboard'); // Redirect after confirming delete
        } catch (error) {
            console.error('Error deleting package:', error);
        }
    };

    const cancelLogout = () => {
        setModalVisible(false);
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            // No previous screen in the stack (e.g. deep link or replaced route)
            router.replace('/vendordashboard');
        }
    };

    if (!packageId) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Text>No package selected.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.headerIconButton}
                    activeOpacity={0.75}
                >
                    <Ionicons name="arrow-back" size={22} color="#780C60" />
                </TouchableOpacity>

                <Text style={styles.headerTitle} numberOfLines={1}>
                    {packageDetails ? packageDetails.packageName : "Package"}
                </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => setModalVisible(true)} // Open modal on delete
                    activeOpacity={0.85}
                >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() =>
                        router.replace({
                            pathname: '/editpackage',
                            params: { packageId: packageDetails?._id },
                        })
                    }
                    activeOpacity={0.85}
                >
                    <Ionicons name="pencil-outline" size={16} color="#780C60" />
                    <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingBox}>
                        <Text style={styles.sectionText}>Loading package details...</Text>
                    </View>
                ) : packageDetails ? (
                    <View style={styles.card}>

                        <View style={styles.priceHero}>
                            <Text style={styles.priceHeroLabel}>Package Price</Text>
                            <Text style={styles.priceHeroValue}>
                                Rs. {packageDetails.price || 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconCircle}>
                                <Ionicons name="pricetag-outline" size={16} color="#780C60" />
                            </View>
                            <View style={styles.infoTextWrapper}>
                                <Text style={styles.sectionHeader}>Package Name</Text>
                                <Text style={styles.sectionText}>{packageDetails.packageName}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconCircle}>
                                <Ionicons name="list-outline" size={16} color="#780C60" />
                            </View>
                            <View style={styles.infoTextWrapper}>
                                <Text style={styles.sectionHeader}>Services</Text>
                                <Text style={styles.sectionText}>{packageDetails.services || 'N/A'}</Text>
                            </View>
                        </View>

                    </View>
                ) : (
                    <View style={styles.loadingBox}>
                        <Text style={styles.sectionText}>Package not found.</Text>
                    </View>
                )}
            </View>

            {/* Delete Confirmation Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={cancelLogout}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>

                        <View style={styles.modalIconCircle}>
                            <Ionicons name="trash-outline" size={26} color="#D9534F" />
                        </View>

                        <Text style={styles.modalTitle}>Confirm Delete</Text>
                        <Text style={styles.modalMessage}>
                            Are you sure you want to delete this package? This action cannot be undone.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={cancelLogout}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={confirmLogout}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.confirmButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF5FB',
        paddingTop: 70,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',

        shadowColor: '#780C60',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    headerTitle: {
        color: '#3D1633',
        fontSize: 20,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginVertical: 16,
        paddingHorizontal: 20,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D9534F',
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 30,
        marginRight: 10,

        shadowColor: '#D9534F',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3D9EC',
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#E9C1DE',
    },
    deleteText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
        marginLeft: 6,
    },
    editText: {
        color: '#780C60',
        fontWeight: '700',
        fontSize: 13,
        marginLeft: 6,
    },
    content: {
        padding: 20,
        paddingTop: 0,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1D5E8',

        shadowColor: '#780C60',
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5,
    },
    priceHero: {
        backgroundColor: '#780C60',
        borderRadius: 18,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 18,

        shadowColor: '#780C60',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 6,
    },
    priceHeroLabel: {
        color: '#EAC8DE',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    priceHeroValue: {
        color: '#fff',
        fontSize: 30,
        fontWeight: '800',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    infoIconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F9E7F3',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    infoTextWrapper: {
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3E4EE',
        marginVertical: 14,
    },
    sectionHeader: {
        color: '#8A7A85',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    sectionText: {
        color: '#2E2130',
        fontSize: 15,
        lineHeight: 21,
        fontWeight: '500',
    },
    loadingBox: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1D5E8',
    },
    priceText: {
        color: '#000',
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(61, 22, 51, 0.5)',
    },
    modalContent: {
        width: '82%',
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 22,
        alignItems: 'center',
    },
    modalIconCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FBEAEA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#3D1633',
        marginBottom: 8,
    },
    modalMessage: {
        fontSize: 13.5,
        color: '#7A6874',
        textAlign: 'center',
        marginBottom: 22,
        lineHeight: 19,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        marginRight: 10,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#F2EEF1',
        alignItems: 'center',
    },
    confirmButton: {
        flex: 1,
        marginLeft: 10,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#D9534F',
        alignItems: 'center',

        shadowColor: '#D9534F',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    cancelButtonText: {
        color: '#3D1633',
        fontWeight: '700',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    

});

export default PackageScreen;