import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import getActiveCities, { ActiveCity } from '@/services/getActiveCities';
import { emptyVendorFilters, loadVendorFilters, saveVendorFilters, SORT_OPTIONS, VendorSearchPreferences } from '@/services/vendorSearchPreferences';

const PRIMARY = '#7A0C5E';
const POLICY_OPTIONS = [ ['REFUNDABLE', 'Refundable'], ['PARTIALLY REFUNDABLE', 'Partially refundable'], ['NON-REFUNDABLE', 'Non-refundable'] ];
const RATING_OPTIONS = [ ['5', '5 ★'], ['4', '4–<5 ★'], ['3', '3–<4 ★'], ['2', '2–<3 ★'], ['1', '1–<2 ★'], ['unrated', 'Not rated'] ];
export default function MakeUpFilterIndex() {
  const params = useLocalSearchParams();
  const eventCityId = String(Array.isArray(params.eventCityId) ? params.eventCityId[0] : params.eventCityId || '');
  const [filters, setFilters] = useState<VendorSearchPreferences>(emptyVendorFilters);
  const [cities, setCities] = useState<ActiveCity[]>([]);
  const [cityQuery, setCityQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cityError, setCityError] = useState(false);
  const [saving, setSaving] = useState(false);
  async function loadCities() {
    setCityError(false);
    try { setCities(await getActiveCities()); }
    catch { setCityError(true); }
  }
  useEffect(() => {
    let active = true;
    loadVendorFilters().then(value => { if (active) setFilters(value); })
      .catch(() => Alert.alert('Could not load filters', 'Please reopen filters and try again.'))
      .finally(() => { if (active) setLoading(false); });
    loadCities();
    return () => { active = false; };
  }, []);
  function toggle(key: 'cityIds' | 'staffOptions' | 'policies' | 'ratingBands', value: string) {
    setFilters(current => ({ ...current, [key]: current[key].includes(value)
      ? current[key].filter(item => item !== value) : [...current[key], value] }));
  }
  function chips(options: readonly (readonly string[])[], key: 'staffOptions' | 'policies' | 'ratingBands') {
    return <View style={styles.chips}>{options.map(([value, label]) => {
      const selected = filters[key].includes(value);
      return <TouchableOpacity key={value} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggle(key, value)} style={[styles.chip, selected && styles.selectedChip]}>
        {selected && <Ionicons name="checkmark" size={15} color={PRIMARY} />}
        <Text style={[styles.chipText, selected && styles.selectedText]}>{label}</Text>
      </TouchableOpacity>;
    })}</View>;
  }
  async function apply() {
    try {
      setSaving(true);
      const labels = { ...filters.cityLabels };
      cities.forEach(city => { labels[city._id] = [city.name, city.stateProvinceCode, city.countryCode].filter(Boolean).join(', '); });
      await saveVendorFilters({ ...filters, cityLabels: labels });
      router.back();
    } catch { Alert.alert('Could not save filters', 'Please try again.'); }
    finally { setSaving(false); }
  }
  const selectedCount = (eventCityId ? 0 : filters.cityIds.length) + filters.staffOptions.length + filters.policies.length + filters.ratingBands.length;
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={23} color={PRIMARY} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.title}>Filters & sort</Text><Text style={styles.muted}>Find vendors that fit your needs</Text></View>
    </View>
    {loading ? <ActivityIndicator color={PRIMARY} style={{ flex: 1 }} /> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>City</Text>
        <Text style={styles.help}>{eventCityId ? 'Results stay in your event city. Change the event location to search elsewhere.' : 'Choose one or more cities where you need service.'}</Text>
        {eventCityId ? <View style={styles.locked}><Ionicons name="lock-closed-outline" size={16} color={PRIMARY} /><Text style={styles.selectedText}>{cities.find(city => city._id === eventCityId)?.name || 'Event city'}</Text></View> : <>
          <TextInput accessibilityLabel="Search cities" placeholder="Search cities" value={cityQuery} onChangeText={setCityQuery} style={styles.search} placeholderTextColor="#958596" />
          {cityError ? <TouchableOpacity onPress={loadCities}><Text style={styles.selectedText}>Could not load cities. Tap to retry.</Text></TouchableOpacity> : <View style={styles.chips}>{cities.filter(city => `${city.name} ${city.stateProvinceName} ${city.countryName}`.toLowerCase().includes(cityQuery.toLowerCase())).map(city => {
            const selected = filters.cityIds.includes(city._id);
            return <TouchableOpacity key={city._id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggle('cityIds', city._id)} style={[styles.chip, selected && styles.selectedChip]}>
              {selected && <Ionicons name="checkmark" size={15} color={PRIMARY} />}
              <Text style={[styles.chipText, selected && styles.selectedText]}>{[city.name, city.stateProvinceCode, city.countryCode].filter(Boolean).join(', ')}</Text>
            </TouchableOpacity>;
          })}</View>}
          {!cityError && !cities.length && <Text style={styles.muted}>No cities available.</Text>}
        </>}
      </View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Rating</Text><Text style={styles.help}>Select rating bands. No selection includes all ratings.</Text>{chips(RATING_OPTIONS, 'ratingBands')}</View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Staff</Text><Text style={styles.help}>Match any selected staff option.</Text>{chips([['MALE', 'Male'], ['FEMALE', 'Female']], 'staffOptions')}</View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Cancellation policy</Text><Text style={styles.help}>Choose the policies you are comfortable with.</Text>{chips(POLICY_OPTIONS, 'policies')}</View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Sort by</Text>{SORT_OPTIONS.map(([value,label]) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: filters.sort === value }} onPress={() => setFilters(current => ({ ...current, sort: value }))} style={styles.sortRow}>
        <Text style={[styles.chipText, filters.sort === value && styles.selectedText]}>{label}</Text><Ionicons name={filters.sort === value ? 'radio-button-on' : 'radio-button-off'} color={filters.sort === value ? PRIMARY : '#B5A6B3'} size={21} />
      </TouchableOpacity>)}</View>
    </ScrollView>}
    <View style={styles.footer}>
      <TouchableOpacity disabled={loading || saving} onPress={() => setFilters(emptyVendorFilters())} style={styles.clear}><Text style={styles.selectedText}>Clear all</Text></TouchableOpacity>
      <TouchableOpacity disabled={loading || saving} onPress={apply} style={styles.apply}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.applyText}>Apply filters{selectedCount ? ` (${selectedCount})` : ''}</Text>}</TouchableOpacity>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF5FA' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 18 },
  back: { padding: 10, borderRadius: 24, backgroundColor: 'white' },
  title: { fontSize: 23, fontWeight: '800', color: '#32132D' },
  muted: { color: '#897486', fontSize: 13, marginTop: 4 },
  content: { paddingHorizontal: 18, paddingBottom: 24, gap: 14 },
  section: { backgroundColor: 'white', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#F0E3ED' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#32132D', marginBottom: 6 },
  help: { fontSize: 12, color: '#897486', lineHeight: 18, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 22, borderWidth: 1, borderColor: '#EADFE8', backgroundColor: '#FFFCFE' },
  selectedChip: { backgroundColor: '#F6E7F2', borderColor: PRIMARY },
  chipText: { color: '#61515E', fontSize: 13 },
  selectedText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },
  search: { backgroundColor: '#FAF5F9', borderRadius: 12, padding: 12, color: '#32132D', marginBottom: 14 },
  locked: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8 },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#F0E3ED' },
  footer: { flexDirection: 'row', gap: 12, padding: 18, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#F0E3ED' },
  clear: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  apply: { flex: 1, backgroundColor: PRIMARY, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  applyText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
