import getAllCategories from '@/services/getAllCategories';
import { saveSecureData } from '@/store';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ICategory } from '../dashboard/CategoryGrid';

const BusinessSelectionIndex: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Track selected category
    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null); // Track selected category
    const [categories, setCategories] = useState<ICategory[]>([]);
    const image = Asset.fromModule(require('@/assets/images/GetStarted.png')).uri;

    useEffect(() => {
        getCategories();
    }, []);

    const getCategories = async () => {
        const response = await getAllCategories();
        setCategories(response);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Join Eventify Hub</Text>
                    <Text style={styles.subtitle}>What is your line of business?</Text>
                </View>
                <Image source={{ uri: image }} style={styles.logo} />
            </View>

            <View style={styles.gridContainer}>
                {categories.map((category) => (
                    <TouchableOpacity
                        key={category._id}
                        style={[
                            styles.card,
                            selectedCategory === category._id && styles.selectedCard, // Highlight selected card
                        ]}
                        onPress={() => { setSelectedCategory(category._id); setSelectedCategoryName(category.name) }} // Update selected category
                    >
                        <Image style={styles.icon} source={{ uri: category.image }} />
                        <Text style={styles.cardText}>{category.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.push('/intro')} // Navigate to intro screen
                >
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        !selectedCategory && styles.disabledNextButton, // Disable button if no category selected
                    ]}
                    onPress={async () => {
                        if (selectedCategory && selectedCategoryName) {
                            await saveSecureData("buisness", selectedCategory.toString());
                            await saveSecureData("buisnessName", selectedCategoryName);
                            router.push('/signup'); // Navigate to the signup screen
                        }
                    }}
                    disabled={!selectedCategory} // Disable if no category selected
                >
                    <Text style={styles.nextText}>Next</Text>
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
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingTop: 50,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3c003c',
    },
    subtitle: {
        fontSize: 16,
        color: '#3c003c',
        marginTop: 8,
    },
    logo: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        marginTop: 10,
        marginLeft: 10,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '45%',
        backgroundColor: '#F8E9F0',
        borderWidth: 2,
        borderColor: '#780C60',
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
        alignItems: 'center',
    },
    selectedCard: {
        backgroundColor: '#D3A6C5',
        borderColor: '#3c003c',
    },
    icon: {
        marginBottom: 10,
        width: 20,
        height: 20
    },
    cardText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3c003c',
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        marginRight: 10,
        padding: 12,
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#8b008b',
    },
    cancelText: {
        fontSize: 16,
        color: '#8b008b',
    },
    nextButton: {
        flex: 1,
        marginLeft: 10,
        padding: 12,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#780C60',
    },
    disabledNextButton: {
        backgroundColor: '#d8a6d3',
    },
    nextText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    loginText: {
        marginTop: 20,
        textAlign: 'center',
        color: '#780C60',
    },
    loginLink: {
        fontWeight: 'bold',
        color: '#8b008b',
        textDecorationLine: 'underline',
    },
});

export default BusinessSelectionIndex;
