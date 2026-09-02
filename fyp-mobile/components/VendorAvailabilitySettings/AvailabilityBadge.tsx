//fyp-mobile/components/VendorAvailabilitySettings/AvailabilityBadge.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function AvailabilityBadge({
  available,
  reason,
}: {
  available?: boolean;
  reason?: string;
}) {
  if (available === undefined) return null; // no check run yet (e.g. no date selected)

  return (
    <View style={[styles.pill, available ? styles.available : styles.unavailable]}>
      <Ionicons
        name={available ? 'checkmark-circle' : 'close-circle'}
        size={13}
        color={available ? '#28a745' : '#dc3545'}
      />
      <Text style={[styles.text, { color: available ? '#28a745' : '#dc3545' }]}>
        {available ? 'Available for selected time' : reason || 'Unavailable'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 6,
  },
  available: { backgroundColor: '#E6F7EA' },
  unavailable: { backgroundColor: '#FDEAEC' },
  text: { fontSize: 11, fontWeight: '700' },
});