
import getPopularVendors, { TopVendor } from '@/services/getPopularVendors';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


// Reusable component
const ItemList: React.FC<{ title: string; data: TopVendor[] }> = ({ title, data }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <FlatList
      data={data}
      renderItem={({ item }) => <ItemCard item={item} />}
      keyExtractor={(item) => item.vendor._id}
      horizontal
      showsHorizontalScrollIndicator={false}
    />
  </View>
);

const ItemCard: React.FC<{ item: TopVendor }> = ({ item }) => (
  <TouchableOpacity key={item.vendorId} style={styles.card} onPress={() => { router.push(`/vendorprofiledetails?id=${item.vendorId}`) }}>
    <Image
      resizeMode="cover"
      source={{ uri: item.vendor.coverImage }}
      style={styles.image}
    />
    <Text style={styles.name}>{item.vendor.name}</Text>
    <View style={styles.infoContainer}>
      <Text style={styles.location}>Total Reviews:{item.totalReviews}</Text>
      <Text style={styles.price}>Rating: {item.averageRating}</Text>
    </View>
    {/* <Text style={styles.capacity}>Packages: {item.vendor.}</Text> */}
  </TouchableOpacity>
);

const App: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  useEffect(() => {
    const fetch = async () => {
      const vendors = await getPopularVendors(5);
      console.log(vendors);
      setVendors(vendors);
    }
    fetch();
  }, []);

  return (
    <View>
      <ItemList title="Popular Vendors" data={vendors} />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#F8E9F0',

  },
  // title: {
  //   fontSize: 18,
  //   fontWeight: '500',
  //   color: '#000',
  //   marginBottom: 10,
  //   alignSelf: 'flex-start',
  //   paddingRight: 15,
  // },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingRight: 25,
    marginRight: 20,
  },
  card: {
    width: 150,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  infoContainer: {
    marginBottom: 5,
  },
  location: {
    fontSize: 12,
    color: '#666',
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
function setData(data: any) {
  throw new Error('Function not implemented.');
}

function getTopVendors(arg0: number) {
  throw new Error('Function not implemented.');
}

