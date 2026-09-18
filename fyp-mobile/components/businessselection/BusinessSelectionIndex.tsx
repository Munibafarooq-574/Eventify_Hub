import getAllCategories from '@/services/getAllCategories';
import { saveSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import { ICategory } from '../dashboard/CategoryGrid';
import { Asset } from '@/__mocks__/expo-asset';

// Enable smooth LayoutAnimation transitions on Android
if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Any description longer than this will make the card expand to a
// full-width row when opened, instead of squeezing into a half card.
const LONG_DESCRIPTION_THRESHOLD = 65;

const BusinessSelectionIndex: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [flippedCard, setFlippedCard] = useState<string | null>(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
    const [selectedBusinessDetailsType, setSelectedBusinessDetailsType] = useState<string | null>(null);
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
    const [categoriesError, setCategoriesError] = useState<boolean>(false);
    const image = require('@/assets/images/GetStarted.png');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        getCategories();

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 900,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 900,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
        ]).start();
    }, []);

    const getCategories = async () => {
        setIsLoadingCategories(true);
        setCategoriesError(false);
        try {
            const response = await getAllCategories();
            console.log('Categories Response:', response);
            setCategories(response);
        } catch (error) {
            console.log('Category Error:', error);
            setCategoriesError(true);
        } finally {
            setIsLoadingCategories(false);
        }
    };

    const handleCardPress = (category: ICategory) => {
        // Animate the height/width change smoothly instead of an abrupt jump
        LayoutAnimation.configureNext(LayoutAnimation.create(
            250,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity
        ));

        setSelectedCategory(category._id);
        setSelectedCategoryName(category.name);
        setSelectedBusinessDetailsType(category.businessDetailsType || 'GENERIC');

        setFlippedCard((prev) => (prev === category._id ? null : category._id));
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        Build Your{'\n'}
                        <Text style={styles.titleHighlight}>Dream Business</Text>
                    </Text>

                    <Text style={styles.subtitle}>
                        Select the category that best describes your business and
                        start connecting with thousands of customers through
                        <Text style={{ fontWeight: 'bold' }}> Eventify Hub.</Text>
                    </Text>
                </View>

                <View style={styles.logoWrapper}>
                    <Image source={image} style={styles.logo} />
                </View>
            </Animated.View>

            {/* Loading state while categories are being fetched */}
            {isLoadingCategories && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#780C60" />
                    <Text style={styles.loadingText}>Loading categories...</Text>
                </View>
            )}

            {/* Error state if fetch failed */}
            {!isLoadingCategories && categoriesError && (
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>
                        Couldn't load categories. Please try again.
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={getCategories}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isLoadingCategories && !categoriesError && (
                <View style={styles.gridContainer}>
                    {categories.map((category, index) => {
                        const isSelected = selectedCategory === category._id;
                        const isOpen = flippedCard === category._id;
                        const isLongDescription =
                            (category.description?.length ?? 0) > LONG_DESCRIPTION_THRESHOLD;
                        const isFullWidth = isOpen && isLongDescription;

                        return (
                            <Animated.View
                                key={category._id}
                                style={[
                                    styles.cardOuter,
                                    { width: isFullWidth ? '100%' : '48%' },
                                    {
                                        opacity: fadeAnim,
                                        transform: [
                                            {
                                                translateY: slideAnim.interpolate({
                                                    inputRange: [0, 40],
                                                    outputRange: [0, 40 + index * 3],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    style={[
                                        styles.card,
                                        isSelected && styles.selectedCard,
                                    ]}
                                    onPress={() => handleCardPress(category)}
                                >
                                    {isSelected && (
                                        <View style={styles.checkBadge}>
                                            <Text style={styles.checkBadgeText}>✓</Text>
                                        </View>
                                    )}

                                    <View
                                        style={[
                                            styles.iconWrapper,
                                            isSelected && styles.iconWrapperSelected,
                                        ]}
                                    >
                                        <Image
                                            source={{ uri: category.image }}
                                            style={styles.icon}
                                            resizeMode="contain"
                                        />
                                    </View>

                                    <View style={styles.cardBody}>
                                        <Text
                                            style={[
                                                styles.cardText,
                                                isSelected && styles.selectedCardText,
                                            ]}
                                            numberOfLines={isOpen ? undefined : 2}
                                        >
                                            {category.name}
                                        </Text>

                                        {!!category.description && (
                                            <Text
                                                style={[
                                                    styles.expandHint,
                                                    isSelected && styles.expandHintSelected,
                                                ]}
                                            >
                                                {isOpen ? '▲ Hide details' : '▼ View details'}
                                            </Text>
                                        )}

                                        {isOpen && !!category.description && (
                                            <Text
                                                style={[
                                                    styles.description,
                                                    isSelected && styles.descriptionSelected,
                                                ]}
                                            >
                                                {category.description}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>
            )}

            {/* Category not found */}
            <TouchableOpacity
                style={styles.otherCategoryButton}
                activeOpacity={0.85}
                onPress={() => router.push('/categoryrequest' as any)}
            >
                <Text style={styles.otherCategoryTitle}>
                    Can't find your business category?
                </Text>
                <Text style={styles.otherCategoryText}>
                    My category isn't listed →
                </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.push('/intro')}
                >
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        !selectedCategory && styles.disabledNextButton,
                    ]}
                    disabled={!selectedCategory}
                    onPress={async () => {
                        if (selectedCategory && selectedCategoryName) {
                            await saveSecureData('categoryId', selectedCategory);
                            await saveSecureData('categoryName', selectedCategoryName);
                            await saveSecureData(
                                'businessDetailsType',
                                selectedBusinessDetailsType || 'GENERIC'
                            );
                            router.push('/signup');
                        }
                    }}
                >
                    <Text style={styles.nextText}>Continue →</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.loginText}>
                Already a Member?{' '}
                <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={styles.loginLink}>Log in</Text>
                </TouchableOpacity>
            </Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#fceefc',
        paddingTop: 70,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 28,
        elevation: 6,
        shadowColor: '#780C60',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },

    textContainer: {
        flex: 1,
    },

    title: {
        fontSize: 30,
        fontWeight: '900',
        color: '#3c003c',
        lineHeight: 40,
    },

    titleHighlight: {
        color: '#780C60',
        fontSize: 34,
    },

    subtitle: {
        marginTop: 15,
        fontSize: 15,
        lineHeight: 24,
        color: '#666',
    },

    logoWrapper: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FCE8F8',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        elevation: 5,
    },

    logo: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
    },

    // ------- LOADING / ERROR -------
    loadingContainer: {
        width: '100%',
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },

    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#780C60',
        fontWeight: '600',
    },

    errorText: {
        fontSize: 14,
        color: '#a33',
        textAlign: 'center',
        marginBottom: 14,
    },

    retryButton: {
        backgroundColor: '#780C60',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },

    retryText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },

    // ------- GRID -------
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },

    cardOuter: {
        marginBottom: 18,
    },

    card: {
        width: '100%',
        minHeight: 190,
        backgroundColor: '#FFF',
        borderRadius: 24,
        alignItems: 'center',
        paddingBottom: 16,
        borderWidth: 1.5,
        borderColor: '#F3C8E8',
        elevation: 5,
        shadowColor: '#780C60',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        overflow: 'hidden',
    },

    selectedCard: {
        backgroundColor: '#780C60',
        borderColor: '#780C60',
    },

    checkBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        elevation: 6,
    },

    checkBadgeText: {
        color: '#780C60',
        fontWeight: '900',
        fontSize: 13,
    },

    // Icon block: fixed square so every card image sits the same way,
    // regardless of the source image's real aspect ratio.
    iconWrapper: {
        width: '100%',
        height: 110,
        backgroundColor: '#FCE8F8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },

    iconWrapperSelected: {
        backgroundColor: 'rgba(255,255,255,0.14)',
    },

    icon: {
        width: 68,
        height: 68,
    },

    cardBody: {
        width: '100%',
        paddingHorizontal: 14,
        alignItems: 'center',
    },

    cardText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#3c003c',
        textAlign: 'center',
    },

    selectedCardText: {
        color: '#fff',
    },

    expandHint: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '700',
        color: '#A6529A',
        textAlign: 'center',
    },

    expandHintSelected: {
        color: 'rgba(255,255,255,0.8)',
    },

    description: {
        marginTop: 10,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
        color: '#4a1a44',
        width: '100%',
        flexWrap: 'wrap',
    },

    descriptionSelected: {
        color: '#fdeafc',
    },

    // ------- OTHER SECTIONS (unchanged look, polished slightly) -------
    otherCategoryButton: {
        width: '100%',
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#E8C5E3',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        marginBottom: 10,
        elevation: 3,
        shadowColor: '#780C60',
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },

    otherCategoryTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
        textAlign: 'center',
    },

    otherCategoryText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#780C60',
        textAlign: 'center',
    },

    footer: {
        flexDirection: 'row',
        marginTop: 15,
    },

    cancelButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#780C60',
        borderRadius: 18,
        paddingVertical: 16,
        alignItems: 'center',
        marginRight: 8,
    },

    cancelText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#780C60',
    },

    nextButton: {
        flex: 1,
        backgroundColor: '#780C60',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        elevation: 5,
    },

    disabledNextButton: {
        backgroundColor: '#D8A6D3',
    },

    nextText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
    },

    loginText: {
        marginTop: 35,
        textAlign: 'center',
        color: '#780C60',
        fontSize: 15,
    },

    loginLink: {
        fontWeight: '800',
        color: '#780C60',
        textDecorationLine: 'underline',
    },
});

export default BusinessSelectionIndex;