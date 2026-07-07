
import getAllCategories from '@/services/getAllCategories';
import { saveSecureData } from '@/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ICategory } from '../dashboard/CategoryGrid';


const CustomizeYourOwnIndex = () => {
    const [categories, setCategories] = useState<ICategory[]>([]);
    const { selectedServices } = useLocalSearchParams();
    const selectedServicesArray: string[] = JSON.parse(selectedServices as string || '[]');

    const router = useRouter(); // Use the Expo Router hook for navigation

    useEffect(() => {
        getCategories();
    }, []);

    // const getCategories = async () => {
    //     const response = await getAllCategories();
    //     setCategories(response);
    // };
    const getCategories = async () => {
        const response = await getAllCategories();
        const filtered = response.filter((cat: ICategory) =>
            selectedServicesArray.includes(cat.name)

        );


        setCategories(filtered);
    };




    const renderItem = ({ item }: { item: (typeof categories)[0] }) => (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={async () => {
          await saveSecureData("categoryId", item._id);
          router.push("/categoryvendorlisting");
        }}
        testID={`category-item-${item._id}`} // ✅ Touchable for interaction
      >
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <View style={styles.itemTextContainer}>
          <Text
            style={styles.itemTitle}
            testID={`category-name-${item.name}`} // ✅ For name match
          >
            {item.name}
          </Text>
          <Text
            style={styles.itemDescription}
            testID={`category-desc-${item._id}`} // ✅ For description match
          >
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <Text style={styles.header}>Vendor Categories</Text>

            {/* Search Input */}
            <TextInput style={styles.searchInput} placeholder="Search vendor categories" placeholderTextColor="#aaa" />

            {/* Vendor List */}
            <FlatList
                data={categories}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        paddingHorizontal: 16,
        paddingTop: 70,
    },
    backButton: {
        position: 'absolute',
        top: 10,
        left: 16,
        zIndex: 10,
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
        paddingTop: 70,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
        textAlign: 'center',
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingLeft: 40,
    },
    listContainer: {
        paddingBottom: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    itemImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
    },
    itemTextContainer: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    itemDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
});

export default CustomizeYourOwnIndex;
