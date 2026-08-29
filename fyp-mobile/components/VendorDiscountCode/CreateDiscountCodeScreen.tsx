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

import { createVendorDiscountCode } from '../../services/createVendorDiscountCode';
import { searchOrganizers, Organizer } from '../../services/searchOrganizers';

import {
  DiscountAudience,
  DiscountKind,
} from '../../types/discount.types';

import { useRouter, useLocalSearchParams } from 'expo-router';

const COLORS = {
  primary: '#7C3AED',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#FAFAFA',
  card: '#FFFFFF',
};

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

  const vendorIdValue = Array.isArray(vendorId)
    ? vendorId[0]
    : vendorId;

  const [code, setCode] = useState('');

  const [discountType, setDiscountType] =
    useState<DiscountKind>(DiscountKind.PERCENTAGE);

  const [discountValue, setDiscountValue] = useState('');
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('');
  const [maximumDiscountAmount, setMaximumDiscountAmount] =
    useState('');

  const [startDate, setStartDate] = useState(todayPlus(0));
  const [endDate, setEndDate] = useState(todayPlus(30));
  const [usageLimit, setUsageLimit] = useState('50');

  // -----------------------------
  // Audience
  // -----------------------------

  const [audience, setAudience] = useState<DiscountAudience>(
    DiscountAudience.ALL,
  );

  const [selectedOrganizerIds, setSelectedOrganizerIds] =
    useState<string[]>([]);

  // -----------------------------
  // Organizer search
  // -----------------------------

  const [organizerSearch, setOrganizerSearch] = useState('');
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] =
    useState(false);

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

        const results = await searchOrganizers(
          organizerSearch.trim(),
        );

        if (!cancelled) {
          setOrganizers(results);
        }
      } catch (error) {
        if (!cancelled) {
          console.log(
            'Failed to load organizers:',
            error,
          );
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

  const handleAudienceChange = (
    newAudience: DiscountAudience,
  ) => {
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
      Alert.alert(
        'Missing code',
        'Enter a discount code, e.g. WEDDING15',
      );
      return;
    }

    if (code.trim().length < 3 || code.trim().length > 20) {
      Alert.alert(
        'Invalid code',
        'Discount code must be between 3 and 20 characters.',
      );
      return;
    }

    // -----------------------------
    // Discount validation
    // -----------------------------

    const discountValueNum = parseFloat(discountValue);

    if (!discountValueNum || discountValueNum <= 0) {
      Alert.alert(
        'Invalid discount',
        'Enter a discount value greater than 0.',
      );
      return;
    }

    if (
      discountType === DiscountKind.PERCENTAGE &&
      discountValueNum > 100
    ) {
      Alert.alert(
        'Invalid discount',
        'Percentage discount cannot exceed 100%.',
      );
      return;
    }

    // -----------------------------
    // Optional amount validation
    // -----------------------------

    if (minimumOrderAmount) {
      const minimumAmount = parseFloat(minimumOrderAmount);

      if (isNaN(minimumAmount) || minimumAmount < 0) {
        Alert.alert(
          'Invalid minimum order',
          'Enter a valid minimum order amount.',
        );
        return;
      }
    }

    if (
      discountType === DiscountKind.PERCENTAGE &&
      maximumDiscountAmount
    ) {
      const maximumAmount = parseFloat(
        maximumDiscountAmount,
      );

      if (isNaN(maximumAmount) || maximumAmount < 0) {
        Alert.alert(
          'Invalid maximum discount',
          'Enter a valid maximum discount amount.',
        );
        return;
      }
    }

    // -----------------------------
    // Usage limit validation
    // -----------------------------

    const usageLimitNum = parseInt(usageLimit, 10);

    if (!usageLimitNum || usageLimitNum <= 0) {
      Alert.alert(
        'Invalid usage limit',
        'Enter how many times this discount code can be used.',
      );
      return;
    }

    if (usageLimitNum > 100000) {
      Alert.alert(
        'Invalid usage limit',
        'Usage limit cannot exceed 100,000.',
      );
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

    if (
      audience === DiscountAudience.SELECTED_ORGANIZERS &&
      selectedOrganizerIds.length === 0
    ) {
      Alert.alert(
        'Select organizers',
        'Please select at least one organizer for this discount code.',
      );
      return;
    }

    // -----------------------------
    // Date validation
    // -----------------------------

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      isNaN(start.getTime()) ||
      isNaN(end.getTime())
    ) {
      Alert.alert(
        'Invalid date',
        'Please enter valid dates in YYYY-MM-DD format.',
      );
      return;
    }

    if (end <= start) {
      Alert.alert(
        'Invalid date range',
        'Expiry date must be after start date.',
      );
      return;
    }

    // -----------------------------
    // Payload
    // -----------------------------

    const payload = {
      code: code.trim().toUpperCase(),

      discountType,

      discountValue: discountValueNum,

      minimumOrderAmount: minimumOrderAmount
        ? parseFloat(minimumOrderAmount)
        : undefined,

      maximumDiscountAmount:
        discountType === DiscountKind.PERCENTAGE &&
        maximumDiscountAmount
          ? parseFloat(maximumDiscountAmount)
          : undefined,

      startDate: start.toISOString(),

      endDate: end.toISOString(),

      usageLimit: usageLimitNum,

      audience,

      selectedOrganizerIds:
        audience === DiscountAudience.SELECTED_ORGANIZERS
          ? selectedOrganizerIds
          : [],
    };

    // -----------------------------
    // Create discount code
    // -----------------------------

    try {
      setSubmitting(true);

      await createVendorDiscountCode(
        vendorIdValue,
        payload,
      );

      Alert.alert(
        'Success',
        'Discount code created successfully.',
        [
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
        ],
      );
    } catch (e: any) {
      Alert.alert(
        'Could not create discount code',
        e?.message || 'Something went wrong.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>
        Create Discount Code
      </Text>

      {/* ================================
          Discount Code
      ================================= */}

      <Field label="Discount Code">
        <TextInput
          style={styles.input}
          placeholder="WEDDING15"
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
          maxLength={20}
        />
      </Field>

      {/* ================================
          Discount Type
      ================================= */}

      <Field label="Discount Type">
        <View style={styles.typeRow}>
          {[
            DiscountKind.PERCENTAGE,
            DiscountKind.FIXED,
          ].map((kind) => (
            <TouchableOpacity
              key={kind}
              style={[
                styles.typeChip,
                discountType === kind &&
                  styles.typeChipSelected,
              ]}
              onPress={() => setDiscountType(kind)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  discountType === kind &&
                    styles.typeChipTextSelected,
                ]}
              >
                {kind === DiscountKind.PERCENTAGE
                  ? 'Percentage (%)'
                  : 'Fixed Amount (Rs.)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      {/* ================================
          Discount Value
      ================================= */}

      <Field
        label={
          discountType === DiscountKind.PERCENTAGE
            ? 'Discount (%)'
            : 'Discount Amount (Rs.)'
        }
      >
        <TextInput
          style={styles.input}
          placeholder={
            discountType === DiscountKind.PERCENTAGE
              ? 'e.g. 15'
              : 'e.g. 5000'
          }
          keyboardType="numeric"
          value={discountValue}
          onChangeText={setDiscountValue}
        />
      </Field>

      {/* ================================
          Minimum Order
      ================================= */}

      <Field label="Minimum Order Amount (Rs.) — optional">
        <TextInput
          style={styles.input}
          placeholder="e.g. 75000"
          keyboardType="numeric"
          value={minimumOrderAmount}
          onChangeText={setMinimumOrderAmount}
        />
      </Field>

      {/* ================================
          Maximum Discount
      ================================= */}

      {discountType === DiscountKind.PERCENTAGE && (
        <Field label="Maximum Discount (Rs.) — optional">
          <TextInput
            style={styles.input}
            placeholder="e.g. 10000"
            keyboardType="numeric"
            value={maximumDiscountAmount}
            onChangeText={setMaximumDiscountAmount}
          />
        </Field>
      )}

      {/* ================================
          Start Date
      ================================= */}

      <Field label="Start Date (YYYY-MM-DD)">
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-08-29"
        />
      </Field>

      {/* ================================
          Expiry Date
      ================================= */}

      <Field label="Expiry Date (YYYY-MM-DD)">
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-09-28"
        />
      </Field>

      {/* ================================
          Usage Limit
      ================================= */}

      <Field label="Usage Limit">
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={usageLimit}
          onChangeText={setUsageLimit}
        />
      </Field>

      {/* ================================
          Target Audience
      ================================= */}

      <Field label="Target Audience">
        <View style={styles.audienceContainer}>
          {[
            {
              value: DiscountAudience.ALL,
              title: 'Everyone',
              description:
                'Available to all eligible organizers',
            },
            {
              value: DiscountAudience.NEW_ORGANIZERS,
              title: 'New Organizers',
              description:
                'For organizers making their first booking',
            },
            {
              value: DiscountAudience.SELECTED_ORGANIZERS,
              title: 'Selected Organizers',
              description:
                'Only selected organizers can use this code',
            },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.audienceOption,
                audience === option.value &&
                  styles.audienceOptionSelected,
              ]}
              onPress={() =>
                handleAudienceChange(option.value)
              }
            >
              <View
                style={[
                  styles.radio,
                  audience === option.value &&
                    styles.radioSelected,
                ]}
              />

              <View
                style={styles.audienceTextContainer}
              >
                <Text
                  style={[
                    styles.audienceTitle,
                    audience === option.value &&
                      styles.audienceTitleSelected,
                  ]}
                >
                  {option.title}
                </Text>

                <Text
                  style={styles.audienceDescription}
                >
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      {/* ================================
          Organizer Search & Selection
      ================================= */}

      {audience ===
        DiscountAudience.SELECTED_ORGANIZERS && (
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
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                />

                <Text style={styles.loadingText}>
                  Loading organizers...
                </Text>
              </View>
            ) : organizers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {organizerSearch.trim()
                    ? 'No organizers found.'
                    : 'No organizers available.'}
                </Text>
              </View>
            ) : (
              organizers.map((organizer) => {
                const organizerId = organizer._id;

                const selected =
                  selectedOrganizerIds.includes(
                    organizerId,
                  );

                return (
                  <TouchableOpacity
                    key={organizerId}
                    style={styles.organizerRow}
                    onPress={() =>
                      toggleOrganizer(organizerId)
                    }
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selected &&
                          styles.checkboxSelected,
                      ]}
                    >
                      {selected && (
                        <Text
                          style={styles.checkmark}
                        >
                          ✓
                        </Text>
                      )}
                    </View>

                    <View
                      style={
                        styles.organizerInfo
                      }
                    >
                      <Text
                        style={
                          styles.organizerName
                        }
                      >
                        {organizer.name ||
                          'Unnamed Organizer'}
                      </Text>

                      {!!organizer.email && (
                        <Text
                          style={
                            styles.organizerEmail
                          }
                        >
                          {organizer.email}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <Text style={styles.selectedCount}>
            {selectedOrganizerIds.length} organizer
            {selectedOrganizerIds.length === 1
              ? ''
              : 's'} selected
          </Text>
        </Field>
      )}

      {/* ================================
          Submit
      ================================= */}

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator
            color="#fff"
            size="small"
          />
        ) : (
          <Text style={styles.submitButtonText}>
            Create Discount Code
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ==========================================
   Reusable Field
========================================== */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      {children}
    </View>
  );
}

/* ==========================================
   Styles
========================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 18,
  },

  field: {
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },

  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: COLORS.text,
  },

  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },

  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },

  typeChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  typeChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.text,
  },

  typeChipTextSelected: {
    color: '#fff',
  },

  /* ================================
     Audience
  ================================= */

  audienceContainer: {
    gap: 10,
  },

  audienceOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 13,
  },

  audienceOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5F3FF',
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    marginTop: 1,
  },

  radioSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  audienceTextContainer: {
    flex: 1,
  },

  audienceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },

  audienceTitleSelected: {
    color: COLORS.primary,
  },

  audienceDescription: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
  },

  /* ================================
     Organizers
  ================================= */

  organizerList: {
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
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
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  checkmark: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  organizerInfo: {
    flex: 1,
  },

  organizerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  organizerEmail: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },

  selectedCount: {
    marginTop: 7,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },

  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 7,
    fontSize: 12,
    color: COLORS.muted,
  },

  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 12.5,
    color: COLORS.muted,
  },

  /* ================================
     Submit
  ================================= */

  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },

  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});