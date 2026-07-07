import React from 'react';
import { View, StyleSheet, ScrollView, Text, Image, TouchableOpacity } from 'react-native';
import Header from './Header';
//import SearchBar from './SearchBar';
import CategoryGrid from './CategoryGrid';
import VenueList from './VenueList';
import BottomNavigationFinal from './BottomNavigationFinal';


const DashboardIndex: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView>
        <Header />
        <View style={styles.content}>
          <CategoryGrid />
          <VenueList />
        </View>
      </ScrollView>
      <BottomNavigationFinal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8E9F0',
    paddingTop: 50
  },
  content: {
    padding: 24,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationIcon: {
    width: 24,
    height: 24,
    marginRight: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#000000',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1D',
  },
  planEventButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 26,
    marginBottom: 20,
  },
  planEventIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  planEventText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DashboardIndex;
