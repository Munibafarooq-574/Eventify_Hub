import getAllCategories from '@/services/getAllCategories';
import { saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLORS = {
  primary: '#6B1E4F',
  primaryDark: '#4A1436',
  accent: '#D4A657',
  bg: '#FDF2F8',
  card: '#FFFFFF',
  textDark: '#2B1B26',
  textMuted: '#8B7688',
  border: '#F3DCE8',
};

export interface ICategory {
  _id: string
  createdAt: string
  description: string
  image: string
  name: string
}

const CategoryItem: React.FC<{ item: ICategory }> = ({ item }) => (
  <View style={styles.categoryItem}>
    <TouchableOpacity
      style={styles.categoryTouchable}
      accessibilityRole="button"
      activeOpacity={0.75}
      onPress={async () => {
        await saveSecureData("categoryId", item._id);
        await saveSecureData("categoryName", item.name); // Save category name
        router.push("/categoryvendorlisting");
      }}>
      <View style={styles.categoryIconWrap}>
        <Image
          resizeMode="contain"
          source={{ uri: item.image }}
          style={styles.categoryIcon}
        />
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
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
        <View>
          <Text style={styles.title}>Vendor Categories</Text>
          <View style={styles.titleAccent} />
        </View>
        <TouchableOpacity
          style={styles.seeAllButton}
          activeOpacity={0.7}
          onPress={() => { router.push("/vendorcategories") }}>
          <Text style={styles.seeAll}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
        renderItem={({ item, index }) => <CategoryItem key={item._id} item={item} />}
        keyExtractor={(item) => item._id}
        numColumns={4}
        columnWrapperStyle={styles.row}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  titleAccent: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 6,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 2,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  categoryItem: {
    alignItems: 'center',
    width: '23%',
  },
  categoryTouchable: {
    alignItems: 'center',
  },
  categoryIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryIcon: {
    width: 34,
    height: 34,
  },
  categoryName: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },
});

export default CategoryGrid;