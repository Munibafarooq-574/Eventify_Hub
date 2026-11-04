import { getUserData, saveUserData } from '@/store';
import { ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { growthApi } from '@/services/growthApiClient';
import { usePullToRefresh } from "@/components/refresh/usePullToRefresh";
import { DashboardRefreshContext } from "./DashboardRefreshContext";
//fyp-mobile/components/dashboard/DashboardIndex.tsx
//client Dashboard Screen

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import Header from './Header';
import CategoryGrid from './CategoryGrid';
import VenueList from './VenueList';
import BottomNavigationFinal from './BottomNavigationFinal';
import { FeaturedVendorsSection } from './FeaturedVendorsSection';
import { FeaturedPackagesSection } from './FeaturedPackagesSection';
import SponsoredForYou from './SponsoredForYou';
import PublicCouponOffers from './PublicCouponOffers';
import RecommendedForYourEvent from './RecommendedForYourEvent';

const COLORS = {
  bg: '#FDF2F8',
};

const DashboardIndex: React.FC = () => {
  const [locationStatus, setLocationStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [marketplaceKey, setMarketplaceKey] = useState('');
  const [locationRetry, setLocationRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    growthApi.get<{ countryCode: string | null; cityId: string | null }>('/auth/marketplace-location').then(async location => {
      if (!active) return;
      if (!location.cityId) {
        setLocationStatus('loading');
        router.push('/marketplace-location');
        return;
      }
      const user = await getUserData();
      if (!active) return;
      if (user && (user.clientCityId !== location.cityId || user.marketplaceCountryCode !== location.countryCode)) {
        await saveUserData({ ...user, clientCityId: location.cityId, marketplaceCountryCode: location.countryCode });
      }
      if (!active) return;
      setMarketplaceKey(`${location.countryCode}|${location.cityId}`);
      setLocationStatus('ready');
    }).catch(() => { if (active) setLocationStatus('error'); });
    return () => { active = false; };
  }, [locationRetry]));

  const [sections] = useState(() => new Set<() => Promise<unknown>>());
  const { refreshControl } = usePullToRefresh(
    () => Promise.allSettled(Array.from(sections, reload => reload())),
  );

  if (locationStatus !== 'ready') {
    return <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      {locationStatus === 'loading' ? <ActivityIndicator /> : (
        <TouchableOpacity accessibilityRole="button" onPress={() => setLocationRetry(value => value + 1)}>
          <Text>Could not load your marketplace. Tap to try again.</Text>
        </TouchableOpacity>
      )}
    </View>;
  }

  return (
    <DashboardRefreshContext.Provider key={marketplaceKey} value={sections}>
      <View style={styles.container}>
        <ScrollView
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Header />
          <View style={styles.content}>
            <CategoryGrid />

            <PublicCouponOffers />

            <SponsoredForYou />

            <RecommendedForYourEvent />

            <FeaturedVendorsSection />

            <FeaturedPackagesSection />

            <VenueList />
          </View>
        </ScrollView>
        <BottomNavigationFinal />
      </View>
    </DashboardRefreshContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 50,
  },
  scrollContent: {
    paddingBottom: 110, // keeps content clear of the floating bottom nav
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
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