import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import getAllCategories from '@/services/getAllCategories';
import { ICategory } from '../dashboard/CategoryGrid';
import { saveSecureData } from '@/store';

const PRIMARY = '#7A0C5E';
const PRIMARY_LIGHT = '#F3DCEB';
const BG = '#FBEFF6';
const TEXT_DARK = '#2B1B26';
const TEXT_MUTED = '#8A6F80';

const VendorCategoriesIndex = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = async () => {
    try {
      setLoading(true);
      const response = await getAllCategories();
      setCategories(response || []);
    } catch (e) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const handlePress = async (item: ICategory) => {
    await saveSecureData('categoryId', item._id);
    await saveSecureData('categoryName', item.name);
    router.push('/categoryvendorlisting');
  };

  const renderItem = ({ item }: { item: ICategory }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => handlePress(item)}
    >
      <View style={styles.cardAccent} />
      <View style={styles.imageRing}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={18} color={PRIMARY} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.emptyText}>Loading categories...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="search-outline" size={32} color={PRIMARY} />
        </View>
        <Text style={styles.emptyTitle}>No categories found</Text>
        <Text style={styles.emptyText}>
          Try a different keyword to find the right vendors.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* Header */}
      <View style={styles.headerWrap}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerIconCircle}>
          <Ionicons name="grid-outline" size={28} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>Vendor Categories</Text>
        <Text style={styles.headerSubtitle}>
          Explore services and find the perfect vendors for your event
        </Text>
      </View>

      {/* Search bar overlapping header */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={20}
          color={PRIMARY}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vendor categories"
          placeholderTextColor="#B79BAA"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#B79BAA" />
          </TouchableOpacity>
        )}
      </View>

      {/* Count */}
      {!loading && filteredCategories.length > 0 && (
        <Text style={styles.countText}>
          {filteredCategories.length}{' '}
          {filteredCategories.length === 1 ? 'category' : 'categories'} available
        </Text>
      )}

      <FlatList
        data={filteredCategories}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Header */
  headerWrap: {
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 60,
    paddingBottom: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 60,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -26,
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: PRIMARY,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_DARK,
    paddingVertical: 0,
  },
  countText: {
    marginHorizontal: 24,
    marginTop: 18,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY,
    letterSpacing: 0.3,
  },

  /* List */
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: PRIMARY,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  imageRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginLeft: 6,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  itemDescription: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 18,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  /* Empty / loading */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 70,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
});

export default VendorCategoriesIndex;