//fyp-mobile/components/ComingSoonNotice/ComingSoonNotice.tsx
//
// Temporary placeholder so VendorGrowthScreen's menu items don't crash the
// navigator before Phases 3-7 (Featured Vendor, Coupons, etc.) are built.
// Delete this screen once all real feature screens exist, and point each
// menu item in VendorGrowthScreen.tsx at its real route instead.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ComingSoonNotice({ navigation, route }: { navigation: any; route: any }) {
  const feature = route?.params?.feature || 'This feature';

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚧</Text>
      <Text style={styles.title}>{feature}</Text>
      <Text style={styles.subtitle}>This is coming in a later update.</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  subtitle: { fontSize: 13.5, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  button: { marginTop: 20, backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
});