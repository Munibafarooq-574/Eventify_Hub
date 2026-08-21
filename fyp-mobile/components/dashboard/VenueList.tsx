import getPopularVendors, { TopVendor } from '@/services/getPopularVendors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

// Reusable component
const ItemList: React.FC<{
  title: string;
  data: TopVendor[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}> = ({ title, data, loading, error, onRetry }) => (
  <View style={styles.container}>
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.titleAccent} />
    </View>

    {loading ? (
      <View style={styles.stateBox}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.stateText}>Loading popular vendors...</Text>
      </View>
    ) : error ? (
      <View style={styles.stateBox}>
        <Ionicons name="cloud-offline-outline" size={26} color={COLORS.textMuted} />
        <Text style={styles.stateText}>Couldn't load vendors right now.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    ) : data.length === 0 ? (
      <View style={styles.stateBox}>
        <Ionicons name="storefront-outline" size={26} color={COLORS.textMuted} />
        <Text style={styles.stateText}>No popular vendors to show yet.</Text>
      </View>
    ) : (
      <FlatList
        data={data}
        renderItem={({ item }) => <ItemCard item={item} />}
        keyExtractor={(item) => item.vendor._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 6 }}
      />
    )}
  </View>
);

const ItemCard: React.FC<{ item: TopVendor }> = ({ item }) => (
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.85}
    onPress={() => {
      router.push(`/vendorprofiledetails?id=${item.vendorId}`);
    }}
  >
    <View style={styles.imageWrap}>
      <Image
        resizeMode="cover"
        source={{ uri: item.vendor.coverImage }}
        style={styles.image}
      />
      <View style={styles.ratingBadge}>
        <Ionicons name="star" size={11} color={COLORS.accent} />
        <Text style={styles.ratingBadgeText}>{item.averageRating}</Text>
      </View>
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.name} numberOfLines={1}>
        {item.vendor.name}
      </Text>
      <View style={styles.infoContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={12} color={COLORS.textMuted} />
        <Text style={styles.location}> {item.totalReviews} reviews</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const App: React.FC = () => {
  const [vendors, setVendors] = useState<TopVendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getPopularVendors(5);
      // Handles whatever the backend returns: array, null, or empty.
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching popular vendors:', err);
      setError(true);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return (
    <View>
      <ItemList
        title="Popular Vendors"
        data={vendors}
        loading={loading}
        error={error}
        onRetry={fetchVendors}
      />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  headerRow: {
    marginBottom: 12,
    alignSelf: 'flex-start',
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
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    width: 160,
    marginRight: 14,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 105,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(43,27,38,0.85)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  cardBody: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  price: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  capacity: {
    fontSize: 10,
    color: '#444',
  },
});

export default App;