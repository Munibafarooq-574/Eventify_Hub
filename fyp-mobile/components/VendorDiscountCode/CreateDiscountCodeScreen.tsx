// fyp-mobile/components/vendorCoupons/CreateDiscountCodeScreen.tsx
//
// TODO — UI-only redesign, no service/data or validation logic changes:
//   - Adds the standard back-button + centered title/subtitle header,
//     replacing the plain in-scroll screen title.
//   - Uses react-native-safe-area-context for the header (already a peer
//     dependency of expo-router, so it should already be installed).
//     npm install lucide-react-native react-native-svg

import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';

import { createVendorDiscountCode } from '../../services/createVendorDiscountCode';
import { searchOrganizers, Organizer } from '../../services/searchOrganizers';

import { DiscountAudience, DiscountKind } from '../../types/discount.types';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already (e.g. src/theme/colors.ts).
// Brand color (used only for header + primary controls, as requested):
const tintColorLight = '#7D0C72';
const tintColorDark = '#7D0C72';

const COLORS = {
  primary: tintColorLight,
  primaryLight: '#F8E9F6',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#ECE7EA',
  background: '#FAF7F9',
  card: '#FFFFFF',
};

const HEADER_SIDE_WIDTH = 36;

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CreateDiscountCodeScreen() {
  const router = useRouter();

  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const [code, setCode] = useState('');

  const [discountType, setDiscountType] = useState<DiscountKind>(DiscountKind.PERCENTAGE);

  const [discountValue, setDiscountValue] = useState('');
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('');
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState('');

  const [startDate, setStartDate] = useState(todayPlus(0));
  const [endDate, setEndDate] = useState(todayPlus(30));
  const [usageLimit, setUsageLimit] = useState('50');

  // -----------------------------
  // Audience
  // -----------------------------

  const [audience, setAudience] = useState<DiscountAudience>(DiscountAudience.ALL);

  const [selectedOrganizerIds, setSelectedOrganizerIds] = useState<string[]>([]);

  // -----------------------------
  // Organizer search
  // -----------------------------

  const [organizerSearch, setOrganizerSearch] = useState('');
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Search organizers when Selected Organizers is enabled.
  useEffect(() => {
    if (audience !== DiscountAudience.SELECTED_ORGANIZERS) {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setLoadingOrganizers(true);

        const results = await searchOrganizers(organizerSearch.trim());

        if (!cancelled) {
          setOrganizers(results);
        }
      } catch (error) {
        if (!cancelled) {
          console.log('Failed to load organizers:', error);
          setOrganizers([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingOrganizers(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [audience, organizerSearch]);

  const toggleOrganizer = (organizerId: string) => {
    setSelectedOrganizerIds((current) => {
      if (current.includes(organizerId)) {
        return current.filter((id) => id !== organizerId);
      }

      return [...current, organizerId];
    });
  };

  const handleAudienceChange = (newAudience: DiscountAudience) => {
    setAudience(newAudience);

    if (newAudience !== DiscountAudience.SELECTED_ORGANIZERS) {
      setSelectedOrganizerIds([]);
      setOrganizerSearch('');
      setOrganizers([]);
    }
  };

  const handleSubmit = async () => {
    // -----------------------------
    // Code validation
    // -----------------------------

    if (!code.trim()) {
      Alert.alert('Missing code', 'Enter a discount code, e.g. WEDDING15');
      return;
    }

    if (code.trim().length < 3 || code.trim().length > 20) {
      Alert.alert('Invalid code', 'Discount code must be between 3 and 20 characters.');
      return;
    }

    // -----------------------------
    // Discount validation
    // -----------------------------

    const discountValueNum = parseFloat(discountValue);

    if (!discountValueNum || discountValueNum <= 0) {
      Alert.alert('Invalid discount', 'Enter a discount value greater than 0.');
      return;
    }

    if (discountType === DiscountKind.PERCENTAGE && discountValueNum > 100) {
      Alert.alert('Invalid discount', 'Percentage discount cannot exceed 100%.');
      return;
    }

    // -----------------------------
    // Optional amount validation
    // -----------------------------

    if (minimumOrderAmount) {
      const minimumAmount = parseFloat(minimumOrderAmount);

      if (isNaN(minimumAmount) || minimumAmount < 0) {
        Alert.alert('Invalid minimum order', 'Enter a valid minimum order amount.');
        return;
      }
    }

    if (discountType === DiscountKind.PERCENTAGE && maximumDiscountAmount) {
      const maximumAmount = parseFloat(maximumDiscountAmount);

      if (isNaN(maximumAmount) || maximumAmount < 0) {
        Alert.alert('Invalid maximum discount', 'Enter a valid maximum discount amount.');
        return;
      }
    }

    // -----------------------------
    // Usage limit validation
    // -----------------------------

    const usageLimitNum = parseInt(usageLimit, 10);

    if (!usageLimitNum || usageLimitNum <= 0) {
      Alert.alert('Invalid usage limit', 'Enter how many times this discount code can be used.');
      return;
    }

    if (usageLimitNum > 100000) {
      Alert.alert('Invalid usage limit', 'Usage limit cannot exceed 100,000.');
      return;
    }

    // -----------------------------
    // Vendor validation
    // -----------------------------

    if (!vendorIdValue) {
      Alert.alert('Error', 'Missing vendor ID.');
      return;
    }

    // -----------------------------
    // Audience validation
    // -----------------------------

    if (audience === DiscountAudience.SELECTED_ORGANIZERS && selectedOrganizerIds.length === 0) {
      Alert.alert('Select organizers', 'Please select at least one organizer for this discount code.');
      return;
    }

    // -----------------------------
    // Date validation
    // -----------------------------

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert('Invalid date', 'Please enter valid dates in YYYY-MM-DD format.');
      return;
    }

    if (end <= start) {
      Alert.alert('Invalid date range', 'Expiry date must be after start date.');
      return;
    }

    // -----------------------------
    // Payload
    // -----------------------------

    const payload = {
      code: code.trim().toUpperCase(),

      discountType,

      discountValue: discountValueNum,

      minimumOrderAmount: minimumOrderAmount ? parseFloat(minimumOrderAmount) : undefined,

      maximumDiscountAmount: discountType === DiscountKind.PERCENTAGE && maximumDiscountAmount ? parseFloat(maximumDiscountAmount) : undefined,

      startDate: start.toISOString(),

      endDate: end.toISOString(),

      usageLimit: usageLimitNum,

      audience,

      selectedOrganizerIds: audience === DiscountAudience.SELECTED_ORGANIZERS ? selectedOrganizerIds : [],
    };

    // -----------------------------
    // Create discount code
    // -----------------------------

    try {
      setSubmitting(true);

      await createVendorDiscountCode(vendorIdValue, payload);

      Alert.alert('Success', 'Discount code created successfully.', [
        {
          text: 'OK',
          onPress: () => {
            router.replace({
              pathname: '/couponsscreen',
              params: {
                vendorId: vendorIdValue,
                initialTab: 'discountCode',
                refresh: Date.now().toString(),
              },
            });
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Could not create discount code', e?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  // Standard screen header: back button (left) — title + subtitle (center)
  // — empty placeholder (right) so the title stays visually centered. Sits
  // inside a top-only SafeAreaView so it clears the status bar everywhere.
  const Header = () => (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Create Discount Code
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Set up a targeted promotion
          </Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ================================
            Discount Code
        ================================= */}

        <Field label="Discount Code">
          <TextInput style={styles.input} placeholder="WEDDING15" autoCapitalize="characters" value={code} onChangeText={setCode} maxLength={20} />
        </Field>

        {/* ================================
            Discount Type
        ================================= */}

        <Field label="Discount Type">
          <View style={styles.typeRow}>
            {[DiscountKind.PERCENTAGE, DiscountKind.FIXED].map((kind) => (
              <TouchableOpacity
                key={kind}
                style={[styles.typeChip, discountType === kind && styles.typeChipSelected]}
                onPress={() => setDiscountType(kind)}
              >
                <Text style={[styles.typeChipText, discountType === kind && styles.typeChipTextSelected]}>
                  {kind === DiscountKind.PERCENTAGE ? 'Percentage (%)' : 'Fixed Amount (Rs.)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* ================================
            Discount Value
        ================================= */}

        <Field label={discountType === DiscountKind.PERCENTAGE ? 'Discount (%)' : 'Discount Amount (Rs.)'}>
          <TextInput
            style={styles.input}
            placeholder={discountType === DiscountKind.PERCENTAGE ? 'e.g. 15' : 'e.g. 5000'}
            keyboardType="numeric"
            value={discountValue}
            onChangeText={setDiscountValue}
          />
        </Field>

        {/* ================================
            Minimum Order
        ================================= */}

        <Field label="Minimum Order Amount (Rs.) — optional">
          <TextInput style={styles.input} placeholder="e.g. 75000" keyboardType="numeric" value={minimumOrderAmount} onChangeText={setMinimumOrderAmount} />
        </Field>

        {/* ================================
            Maximum Discount
        ================================= */}

        {discountType === DiscountKind.PERCENTAGE && (
          <Field label="Maximum Discount (Rs.) — optional">
            <TextInput style={styles.input} placeholder="e.g. 10000" keyboardType="numeric" value={maximumDiscountAmount} onChangeText={setMaximumDiscountAmount} />
          </Field>
        )}

        {/* ================================
            Start Date
        ================================= */}

        <Field label="Start Date (YYYY-MM-DD)">
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-08-29" />
        </Field>

        {/* ================================
            Expiry Date
        ================================= */}

        <Field label="Expiry Date (YYYY-MM-DD)">
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-09-28" />
        </Field>

        {/* ================================
            Usage Limit
        ================================= */}

        <Field label="Usage Limit">
          <TextInput style={styles.input} keyboardType="numeric" value={usageLimit} onChangeText={setUsageLimit} />
        </Field>

        {/* ================================
            Target Audience
        ================================= */}

        <Field label="Target Audience">
          <View style={styles.audienceContainer}>
            {[
              { value: DiscountAudience.ALL, title: 'Everyone', description: 'Available to all eligible organizers' },
              { value: DiscountAudience.NEW_ORGANIZERS, title: 'New Organizers', description: 'For organizers making their first booking' },
              { value: DiscountAudience.SELECTED_ORGANIZERS, title: 'Selected Organizers', description: 'Only selected organizers can use this code' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.audienceOption, audience === option.value && styles.audienceOptionSelected]}
                onPress={() => handleAudienceChange(option.value)}
              >
                <View style={[styles.radio, audience === option.value && styles.radioSelected]}>
                  {audience === option.value && <View style={styles.radioDot} />}
                </View>

                <View style={styles.audienceTextContainer}>
                  <Text style={[styles.audienceTitle, audience === option.value && styles.audienceTitleSelected]}>{option.title}</Text>

                  <Text style={styles.audienceDescription}>{option.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* ================================
            Organizer Search & Selection
        ================================= */}

        {audience === DiscountAudience.SELECTED_ORGANIZERS && (
          <Field label="Select Organizers">
            <TextInput
              style={styles.input}
              placeholder="Search organizers by name or email"
              value={organizerSearch}
              onChangeText={setOrganizerSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.organizerList}>
              {loadingOrganizers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />

                  <Text style={styles.loadingText}>Loading organizers...</Text>
                </View>
              ) : organizers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{organizerSearch.trim() ? 'No organizers found.' : 'No organizers available.'}</Text>
                </View>
              ) : (
                organizers.map((organizer) => {
                  const organizerId = organizer._id;

                  const selected = selectedOrganizerIds.includes(organizerId);

                  return (
                    <TouchableOpacity key={organizerId} style={styles.organizerRow} onPress={() => toggleOrganizer(organizerId)}>
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected && <Check size={13} color="#fff" strokeWidth={3} />}
                      </View>

                      <View style={styles.organizerInfo}>
                        <Text style={styles.organizerName}>{organizer.name || 'Unnamed Organizer'}</Text>

                        {!!organizer.email && <Text style={styles.organizerEmail}>{organizer.email}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <Text style={styles.selectedCount}>
              {selectedOrganizerIds.length} organizer{selectedOrganizerIds.length === 1 ? '' : 's'} selected
            </Text>
          </Field>
        )}

        {/* ================================
            Submit
        ================================= */}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Create Discount Code</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ==========================================
   Reusable Field
========================================== */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      {children}
    </View>
  );
}

/* ==========================================
   Styles
========================================== */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  safeArea: { backgroundColor: COLORS.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  backButton: {
    width: HEADER_SIDE_WIDTH,
    height: HEADER_SIDE_WIDTH,
    borderRadius: HEADER_SIDE_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16.5, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  headerRightPlaceholder: { width: HEADER_SIDE_WIDTH, height: HEADER_SIDE_WIDTH },

  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },

  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: COLORS.text,
  },

  typeRow: { flexDirection: 'row', gap: 8 },

  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },

  typeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  typeChipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.text },

  typeChipTextSelected: { color: '#fff' },

  /* ================================
     Audience
  ================================= */

  audienceContainer: { gap: 10 },

  audienceOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 13,
  },

  audienceOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  audienceTextContainer: { flex: 1 },

  audienceTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },

  audienceTitleSelected: { color: COLORS.primary },

  audienceDescription: { fontSize: 12, color: COLORS.muted, lineHeight: 17 },

  /* ================================
     Organizers
  ================================= */

  organizerList: {
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },

  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  organizerInfo: { flex: 1 },

  organizerName: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  organizerEmail: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  selectedCount: { marginTop: 7, fontSize: 12, color: COLORS.muted, fontWeight: '500' },

  loadingContainer: { padding: 20, alignItems: 'center', justifyContent: 'center' },

  loadingText: { marginTop: 7, fontSize: 12, color: COLORS.muted },

  emptyContainer: { padding: 20, alignItems: 'center' },

  emptyText: { fontSize: 12.5, color: COLORS.muted },

  /* ================================
     Submit
  ================================= */

  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },

  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
}); 