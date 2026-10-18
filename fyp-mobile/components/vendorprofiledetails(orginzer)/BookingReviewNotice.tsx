import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = { kind: 'profile' | 'packages'; onViewDetails: () => void };

export default function BookingReviewNotice({ kind, onViewDetails }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="information-circle-outline" size={21} color="#7B2869" accessible={false} />
      <View style={styles.content}>
        <Text style={styles.title}>Before you book</Text>
        <Text style={styles.message}>
          {kind === 'profile'
            ? 'Before booking, review the vendor’s details, service areas and cancellation policy.'
            : 'Please review what’s included, service timing, pricing and cancellation terms before selecting a package.'}
        </Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="View vendor details" onPress={onViewDetails} style={styles.button}>
          <Text style={styles.buttonText}>View details</Text>
          <Ionicons name="arrow-forward" size={16} color="#7B2869" accessible={false} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginVertical: 12, backgroundColor: '#F8F0F6', borderColor: '#E8D5E3', borderWidth: 1, borderRadius: 14 },
  content: { flex: 1, minWidth: 0 },
  title: { color: '#5E2452', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  message: { color: '#63535F', fontSize: 13, lineHeight: 20 },
  button: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 44, paddingVertical: 10, paddingRight: 12 },
  buttonText: { color: '#7B2869', fontSize: 13, fontWeight: '700' },
});
