import getAllCategories from '@/services/getAllCategories';
import { saveSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ICategory {
  _id: string
  createdAt: string
  description: string
  image: string
  name: string
}

const CategoryItem: React.FC<{ item: ICategory }> = ({ item }) => (
  <View style={styles.categoryItem}>
    <TouchableOpacity style={styles.categoryIcon} accessibilityRole="button"
      onPress={async () => {
        await saveSecureData("categoryId", item._id);
        await saveSecureData("categoryName", item.name); // Save category name
        router.push("/categoryvendorlisting");
      }}>
      <Image
        resizeMode="contain"
        source={{ uri: item.image }}
        style={styles.categoryIcon}
      />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  </View>
);

const CategoryGrid: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  useEffect(() => {
    getCategories();
  }, []);
  const getCategories = async () => {
    const response = await getAllCategories();
    await saveSecureData("categories", JSON.stringify(response));
    setCategories(response);
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendor Categories</Text>
        <TouchableOpacity
          onPress={() => { router.push("/vendorcategories") }}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
        renderItem={({ item, index }) => <CategoryItem key={item._id} item={item} />}
        keyExtractor={(item) => item._id}
        numColumns={4}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: '#F8E9F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  // title: {
  //   fontSize: 18,
  //   fontWeight: '500',
  //   color: '#000000',
  // },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingRight: 15,
  },
  seeAll: {
    fontSize: 15,
    color: '#000000',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryIcon: {
    width: 65,
    height: 65,
    borderRadius: 50,
    marginBottom: 7,
  },
  categoryName: {
    fontSize: 9.8,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
});

export default CategoryGrid;