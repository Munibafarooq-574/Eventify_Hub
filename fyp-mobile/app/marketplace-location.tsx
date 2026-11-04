import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, router } from 'expo-router';
import getActiveCities, { ActiveCity } from '@/services/getActiveCities';
import { growthApi } from '@/services/growthApiClient';
import { deleteSecureData, getUserData, saveSecureData, saveUserData } from '@/store';

type Location = { countryCode: string | null; cityId: string | null };

export default function MarketplaceLocation() {
  const [current, setCurrent] = useState<Location>();
  const [country, setCountry] = useState('PK');
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<ActiveCity[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    growthApi.get<Location>('/auth/marketplace-location').then(location => {
      if (!active) return;
      setCurrent(location);
      setCountry(location.countryCode || 'PK');
      setCityId(location.cityId || '');
    }).catch(() => { if (active) setError('Could not load your marketplace. Please try again.'); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (!current) return;
    let active = true;
    getActiveCities(country).then(result => {
      if (active) setCities(result);
    }).catch(() => { if (active) setError('Could not load cities. Please try again.'); });
    return () => { active = false; };
  }, [country, current, retry]);

  const switching = current?.countryCode !== country;

  async function save() {
    setSaving(true);
    try {
      const location = await growthApi.patch<Location>('/auth/marketplace-location', { cityId });
      if (switching) {
        await Promise.all([deleteSecureData('cartData'), deleteSecureData('eventDetails')]);
      }
      const user = await getUserData();
      if (user) {
        const updated = { ...user, clientCityId: location.cityId, marketplaceCountryCode: location.countryCode };
        await Promise.all([saveUserData(updated), saveSecureData('user', JSON.stringify(updated))]);
      }
      router.replace('/dashboard');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save your marketplace.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Marketplace location', gestureEnabled: !!current?.countryCode }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 23, fontWeight: '700' }}>Choose your country and city</Text>
        <Text>Your country determines where you can browse and book. Your city helps us show nearby vendors.</Text>
        {!!error && <Text accessibilityRole="alert">{error}</Text>}
        {!!error && <TouchableOpacity onPress={() => { setError(''); setRetry(value => value + 1); }}><Text>Try again</Text></TouchableOpacity>}
        {!current && !error && <ActivityIndicator />}
        {current && <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[['PK', 'Pakistan'], ['US', 'United States']].map(([code, name]) => (
              <TouchableOpacity key={code} accessibilityRole="button" accessibilityState={{ selected: country === code }}
                disabled={saving} onPress={() => {
                  if (country === code) return;
                  setCountry(code);
                  setCityId('');
                  setCities([]);
                  setError('');
                }} style={{ padding: 12, borderWidth: 1, borderColor: country === code ? '#780C60' : '#DDD', borderRadius: 8 }}>
                <Text>{country === code ? '✓ ' : ''}{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontWeight: '700' }}>City</Text>
          {cities.filter(city => city.countryCode === country).map(city => (
            <TouchableOpacity key={city._id} accessibilityRole="button" accessibilityState={{ selected: cityId === city._id }}
              disabled={saving} onPress={() => setCityId(city._id)} style={{ padding: 12 }}>
              <Text>{cityId === city._id ? '✓ ' : ''}{city.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity accessibilityRole="button" disabled={saving || !cities.some(city => city._id === cityId && city.countryCode === country)}
            onPress={() => {
              if (switching) {
                Alert.alert('Change marketplace?', 'Your current cart and event draft will be cleared. Your booking history stays available.', [
                  { text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: () => void save() },
                ]);
              } else {
                void save();
              }
            }} style={{ padding: 14, borderRadius: 8, backgroundColor: '#780C60', opacity: !cityId || saving ? 0.5 : 1 }}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save location'}</Text>
          </TouchableOpacity>
        </>}
      </ScrollView>
    </>
  );
}
