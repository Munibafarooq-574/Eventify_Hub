import {
    deleteSecureData,
    getSecureData,
    saveSecureData,
} from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const AIPackageScreen = () => {
    const [aiPackage, setAiPackage] = useState<any>(null);

    useEffect(() => {
        const fetchPackageData = async () => {
            try {
                const data = (await getSecureData('aiPackage')) || '';
                const parsedData = JSON.parse(data);
                setAiPackage(parsedData);
            } catch (error) {
                console.error('Error fetching AI package data:', error);
            }
        };

        fetchPackageData();
    }, []);

    const handleAddToCart = async (pkg: any) => {
        try {
            const existingCartData = await getSecureData('cartData');

            let cart = existingCartData
                ? JSON.parse(existingCartData)
                : { vendors: [] };

            const vendorIndex = cart.vendors.findIndex(
                (vendor: any) => vendor.vendor._id === pkg.vendorId
            );

            if (vendorIndex !== -1) {
                cart.vendors[vendorIndex].packages.push(pkg);
            } else {
                const vendorPackageData = {
                    vendor: {
                        _id: pkg.vendorId,
                        name: pkg.vendorName,
                    },
                    packages: [pkg],
                };

                cart.vendors.push(vendorPackageData);
            }

            await saveSecureData('cartData', JSON.stringify(cart));
        } catch (error) {
            console.error('Error handling add to cart:', error);
        }
    };

    const proceed = async () => {
        for (let index = 0; index < aiPackage.packages.length; index++) {
            await handleAddToCart(aiPackage.packages[index]);
        }
    };

    if (!aiPackage) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <StatusBar
                    barStyle="dark-content"
                    backgroundColor="#F8E9F0"
                />

                <View style={styles.loadingCircle}>
                    <ActivityIndicator size="large" color="#C94F83" />
                </View>

                <Text style={styles.loadingTitle}>
                    Preparing your package
                </Text>

                <Text style={styles.loadingSubtitle}>
                    Please wait while we load your personalized recommendations.
                </Text>
            </SafeAreaView>
        );
    }

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.imageWrapper}>
                <Image
                    source={require('@/assets/images/GetStarted.png')}
                    style={styles.cardImage}
                    resizeMode="contain"
                />

                <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>AI PICK</Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.category} numberOfLines={1}>
                    {item.packageName}
                </Text>

                <Text style={styles.name} numberOfLines={1}>
                    {item.vendorName}
                </Text>

                <View style={styles.priceRow}>
                    <Text style={styles.price}>Rs. {item.price}</Text>
                    <Text style={styles.perHead}>/head</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.servicesLabel}>Included services</Text>

                <Text style={styles.services} numberOfLines={3}>
                    {item.services}
                </Text>

                <TouchableOpacity
                    style={styles.detailsButton}
                    activeOpacity={0.8}
                >
                    <Text style={styles.detailsText}>View Details</Text>
                    <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="#F8E9F0"
            />

            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.successIcon}>
                        <Text style={styles.checkIcon}>✓</Text>
                    </View>

                    <View style={styles.headerTextContainer}>
                        <Text style={styles.smallHeading}>ALL SET FOR YOU</Text>

                        <Text style={styles.title}>
                            Your AI Package Is Ready
                        </Text>
                    </View>
                </View>

                <Text style={styles.subtitle}>
                    We created a personalized package based on your preferences,
                    guest count and budget.
                </Text>

                <View style={styles.noteBox}>
                    <Text style={styles.noteIcon}>✦</Text>
                    <Text style={styles.note}>
                        You can review and customize these recommendations before
                        checkout.
                    </Text>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recommended for you</Text>

                    <View style={styles.packageCount}>
                        <Text style={styles.packageCountText}>
                            {aiPackage.packages?.length || 0} packages
                        </Text>
                    </View>
                </View>

                <FlatList
                    data={aiPackage.packages}
                    keyExtractor={(item, index) =>
                        `${item.vendorId}-${index}`
                    }
                    renderItem={renderItem}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                />

                <View style={styles.bottomSection}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryTopRow}>
                            <View>
                                <Text style={styles.totalLabel}>
                                    Estimated total
                                </Text>

                                <Text style={styles.budgetText}>
                                    Your budget: Rs. {aiPackage.budget}/-
                                </Text>
                            </View>

                            <Text style={styles.totalValue}>
                                Rs. {aiPackage.totalCost}/-
                            </Text>
                        </View>

                        <View style={styles.summaryDivider} />

                        <View style={styles.discountRow}>
                            <View style={styles.discountIcon}>
                                <Text style={styles.discountIconText}>%</Text>
                            </View>

                            <Text style={styles.discountText}>
                                Enjoy a{' '}
                                <Text style={styles.discountBold}>
                                    10% discount
                                </Text>{' '}
                                when you complete your booking today.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.startOverButton}
                            activeOpacity={0.8}
                            onPress={() =>
                                router.push('/EventDetailsForm')
                            }
                        >
                            <Text style={styles.startOverText}>
                                Start Over
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.proceedButton}
                            activeOpacity={0.85}
                            onPress={async () => {
                                await deleteSecureData('cartData');
                                await proceed();
                                router.push('/OrderReview');
                            }}
                        >
                            <Text style={styles.proceedText}>
                                Proceed to Pay
                            </Text>

                            <Text style={styles.proceedArrow}>→</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8E9F0',
    },

    container: {
        flex: 1,
        paddingHorizontal: 18,
        paddingTop: 22,
    },

    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8E9F0',
        paddingHorizontal: 35,
    },

    loadingCircle: {
        width: 82,
        height: 82,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        marginBottom: 20,
        shadowColor: '#C94F83',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 5,
    },

    loadingTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#30262B',
        marginBottom: 8,
    },

    loadingSubtitle: {
        fontSize: 13,
        lineHeight: 20,
        color: '#806F78',
        textAlign: 'center',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    successIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C94F83',
        marginRight: 12,
        shadowColor: '#C94F83',
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },

    checkIcon: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '800',
    },

    headerTextContainer: {
        flex: 1,
    },

    smallHeading: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#C94F83',
        marginBottom: 3,
    },

    title: {
        fontSize: 23,
        fontWeight: '800',
        color: '#282027',
    },

    subtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: '#75656D',
        marginBottom: 14,
    },

    noteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7FA',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F5D9E5',
    },

    noteIcon: {
        fontSize: 17,
        color: '#C94F83',
        marginRight: 8,
    },

    note: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
        color: '#795F6B',
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#30262B',
    },

    packageCount: {
        backgroundColor: '#F1D5E2',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },

    packageCountText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A4426D',
    },

    listContainer: {
        paddingBottom: 14,
    },

    row: {
        justifyContent: 'space-between',
        marginBottom: 14,
    },

    card: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        marginHorizontal: 4,
        overflow: 'hidden',
        shadowColor: '#8D526C',
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.11,
        shadowRadius: 10,
        elevation: 4,
    },

    imageWrapper: {
        height: 105,
        backgroundColor: '#FCEFF5',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },

    cardImage: {
        width: 95,
        height: 95,
    },

    recommendedBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#C94F83',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 4,
    },

    recommendedText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.6,
    },

    cardContent: {
        padding: 11,
    },

    category: {
        fontSize: 11,
        fontWeight: '700',
        color: '#B04A76',
        marginBottom: 4,
    },

    name: {
        fontSize: 15,
        fontWeight: '800',
        color: '#30262B',
        marginBottom: 8,
    },

    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },

    price: {
        fontSize: 16,
        fontWeight: '800',
        color: '#C94F83',
    },

    perHead: {
        fontSize: 10,
        color: '#947D87',
        marginLeft: 3,
    },

    divider: {
        height: 1,
        backgroundColor: '#F2E5EA',
        marginVertical: 9,
    },

    servicesLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6D5963',
        marginBottom: 4,
    },

    services: {
        minHeight: 42,
        fontSize: 11,
        lineHeight: 16,
        color: '#95858D',
    },

    detailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3F7',
        borderRadius: 9,
        paddingVertical: 8,
        marginTop: 10,
    },

    detailsText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#B04473',
    },

    arrow: {
        fontSize: 17,
        lineHeight: 16,
        color: '#B04473',
        marginLeft: 4,
    },

    bottomSection: {
        paddingTop: 3,
        paddingBottom: 10,
    },

    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 17,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#8D526C',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },

    summaryTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    totalLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4D3D45',
        marginBottom: 4,
    },

    budgetText: {
        fontSize: 11,
        color: '#95858D',
    },

    totalValue: {
        fontSize: 21,
        fontWeight: '800',
        color: '#C94F83',
    },

    summaryDivider: {
        height: 1,
        backgroundColor: '#F1E3E9',
        marginVertical: 11,
    },

    discountRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    discountIcon: {
        width: 25,
        height: 25,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FCE3ED',
        marginRight: 8,
    },

    discountIconText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#C94F83',
    },

    discountText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 16,
        color: '#75656D',
    },

    discountBold: {
        fontWeight: '800',
        color: '#C94F83',
    },

    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    startOverButton: {
        flex: 0.85,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E7BBD0',
        marginRight: 8,
    },

    startOverText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8C526B',
    },

    proceedButton: {
        flex: 1.25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 14,
        backgroundColor: '#C94F83',
        marginLeft: 8,
        shadowColor: '#C94F83',
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },

    proceedText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    proceedArrow: {
        fontSize: 19,
        color: '#FFFFFF',
        marginLeft: 8,
    },
});

export default AIPackageScreen;