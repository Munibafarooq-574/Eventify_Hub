import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import getActiveCities, { ActiveCity } from '@/services/getActiveCities';
import { growthApi } from '@/services/growthApiClient';
import { createBookingDraftStore, getUserData, saveSecureData, saveUserData } from '@/store';

type Location = { countryCode: string | null; cityId: string | null };

export default function MarketplaceLocation() {
  const [draft] = useState(createBookingDraftStore);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
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

  const cityOnly = mode === "city" && !!current?.countryCode;
  const switching = current?.countryCode !== country;
  const countryName = country === 'US' ? 'United States' : 'Pakistan';
  const title = cityOnly ? 'Browsing City' : 'Marketplace Location';
  const countryCities = cities.filter(city => city.countryCode === country);
  const saveDisabled = saving || (!!cityId && !countryCities.some(city => city._id === cityId));

  function cityOption(id: string, name: string) {
    const selected = cityId === id;
    return (
      <TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{ selected, disabled: saving }}
        disabled={saving} onPress={() => setCityId(id)} style={[styles.option, selected && styles.selected]}>
        <Ionicons name={id ? 'location-outline' : 'globe-outline'} size={20} color={PRIMARY} />
        <Text style={styles.optionText}>{name}</Text>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={selected ? PRIMARY : '#9B8795'} />
      </TouchableOpacity>
    );
  }

  async function save() {
    setSaving(true);
    try {
      const location = await growthApi.patch<Location>('/auth/marketplace-location', { countryCode: country, cityId: cityId || null });
      if (!draft.isCurrent()) return;
      if (switching) {
        await createBookingDraftStore().delete('eventDetails');
      }
      const user = await getUserData();
      if (!draft.isCurrent()) return;
      if (user) {
        const updated = { ...user, clientCityId: location.cityId, marketplaceCountryCode: location.countryCode };
        await Promise.all([saveUserData(updated), saveSecureData('user', JSON.stringify(updated))]);
      }
      if (cityOnly && router.canGoBack()) router.back();
      else router.replace('/dashboard');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save your marketplace.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: !!current?.countryCode }} />
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {!!current?.countryCode && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
              style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')}>
              <Ionicons name="arrow-back" size={24} color={PRIMARY} />
            </TouchableOpacity>
          )}
        </View>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.heading}>{cityOnly ? `Browse ${countryName}` : 'Choose your marketplace'}</Text>
          <Text style={styles.description}>{cityOnly
            ? 'Choose a city to see local vendors first, or browse all cities in your marketplace.'
            : 'Your country determines where you can browse and book. Your browsing city is optional.'}</Text>
        </View>
        {!!error && (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => { setError(''); setRetry(value => value + 1); }}>
              <Text style={styles.retry}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
        {!current && !error && <ActivityIndicator color={PRIMARY} />}
        {current && (
          <>
            {!cityOnly && (
              <View style={styles.card}>
                <Text style={styles.heading}>Country</Text>
                <View style={styles.countries}>
                  {[['PK', 'Pakistan'], ['US', 'United States']].map(([code, name]) => (
                    <TouchableOpacity key={code} accessibilityRole="button" accessibilityState={{ selected: country === code, disabled: saving }}
                      disabled={saving} onPress={() => {
                        if (country === code) return;
                        setCountry(code);
                        setCityId('');
                        setCities([]);
                        setError('');
                      }} style={[styles.country, country === code && styles.selected]}>
                      <Text style={styles.countryText}>{country === code ? '✓ ' : ''}{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.heading}>Browsing city</Text>
              {cityOption('', 'All cities')}
              {countryCities.map(city => cityOption(city._id, city.name))}
            </View>
          </>
        )}
      </ScrollView>
      {current && (
        <View style={styles.footer}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: saveDisabled, busy: saving }}
            disabled={saveDisabled} onPress={() => {
              if (switching) {
                Alert.alert('Change marketplace?', 'Your current cart and event draft will be cleared. Your booking history stays available.', [
                  { text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: () => void save() },
                ]);
              } else {
                void save();
              }
            }} style={[styles.save, saveDisabled && styles.disabled]}>
            {saving && <ActivityIndicator color="#FFF" />}
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save location'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const PRIMARY = '#780C60';
const INK = '#2A1F27';
const BORDER = '#F0DCE7';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBF1F7' },
  header: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', minHeight: 60 },
  headerSide: { width: 44 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3E4EF' },
  title: { flex: 1, textAlign: 'center', color: INK, fontSize: 21, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: '#FFF', borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  heading: { color: INK, fontSize: 17, fontWeight: '800' },
  description: { color: '#695561', fontSize: 14, lineHeight: 21 },
  countries: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  country: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderColor: BORDER, borderWidth: 1, borderRadius: 12 },
  countryText: { color: INK, fontWeight: '600' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, padding: 12, borderColor: BORDER, borderWidth: 1, borderRadius: 12 },
  selected: { borderColor: PRIMARY, backgroundColor: '#F8EAF2' },
  optionText: { flex: 1, color: INK, fontSize: 15, fontWeight: '600' },
  error: { color: '#A42636', fontSize: 14 },
  retry: { color: PRIMARY, fontWeight: '700', paddingVertical: 8 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: BORDER },
  save: { minHeight: 50, padding: 12, borderRadius: 14, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
