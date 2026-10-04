import getAllCategories from '@/services/getAllCategories';
import { saveSecureData } from '@/store';
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
  _id: string;
  name: string;
  image: string;
  description: string;

  normalizedName?: string;

  businessDetailsType?:
    | "PHOTOGRAPHY"
    | "CATERING"
    | "VENUE"
    | "MAKEUP"
    | "CAKE"
    | "MEHNDI"
    | "SOUND"
    | "GENERIC";

  isActive?: boolean;
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

    // Show categories alphabetically (A → Z) by name.
    const sortedResponse = [...response].sort((a: ICategory, b: ICategory) =>
      a.name.localeCompare(b.name)
    );

    await saveSecureData("categories", JSON.stringify(sortedResponse));
    setCategories(sortedResponse);
  }
  return (
    <View style={styles.container}>
            <View style={styles.hdrRow}>
        <View style={styles.hdrLeft}>
          <View style={styles.hdrAccent} />
          <Text style={styles.hdrTitle}>Vendor Categories</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => { router.push("/vendorcategories") }}>
          <Text style={styles.hdrViewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
        renderItem={({ item }) => <CategoryItem key={item._id} item={item} />}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
    hdrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hdrLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hdrAccent: {
    width: 5,
    height: 24,
    borderRadius: 3,
    backgroundColor: '#6B1E4F',
    marginRight: 10,
  },
  hdrTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B1B26',
    letterSpacing: 0.3,
  },
  hdrViewAll: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B1E4F',
    paddingRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingHorizontal: 16,
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
    paddingRight: 16,
  },
  categoryItem: {
    alignItems: 'center',
    width: 78,
    marginRight: 14,
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