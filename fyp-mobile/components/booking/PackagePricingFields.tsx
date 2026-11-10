import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { PackagePricing, PricingMethod, PRICING_OPTIONS, pricingFieldsError } from '@/utils/packagePricing';

export default function PackagePricingFields({ value, allowed, onChange }: {
  value: PackagePricing; allowed: PricingMethod[]; onChange: (value: PackagePricing) => void;
}) {
  return <View style={{ marginVertical: 12, gap: 10 }}>
    <Text style={{ color: '#45203D', fontSize: 16, fontWeight: '700' }}>Pricing Method</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {PRICING_OPTIONS.filter(option => allowed.includes(option.value)).map(option => (
        <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{ checked: value.pricingMethod === option.value }}
          onPress={() => onChange({ ...value, pricingMethod: option.value, groupSize: option.value === 'GROUP' ? value.groupSize : null })}
          style={{ padding: 12, borderWidth: 1, borderRadius: 12, borderColor: '#780C60', backgroundColor: value.pricingMethod === option.value ? '#F0DCEC' : '#FFF' }}>
          <Text style={{ color: '#45203D' }}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
    <Text style={{ color: '#695561' }}>{value.pricingMethod === 'PER_PERSON'
      ? 'Enter the rate for one person. The client chooses the number of people in the cart.'
      : value.pricingMethod === 'GROUP' ? 'Enter the total price for one group and how many people it serves.'
      : 'Enter the price for one complete package.'}</Text>
    {value.pricingMethod === 'GROUP' && <>
      <Text style={{ color: '#45203D', fontWeight: '600' }}>People included per group</Text>
      <TextInput accessibilityLabel="People included per group" keyboardType="number-pad"
        value={value.groupSize == null ? '' : String(value.groupSize)} placeholder="e.g. 10" placeholderTextColor="#8A7F87"
        onChangeText={text => onChange({ ...value, groupSize: text ? Number(text.replace(/[^0-9]/g, '')) : undefined })}
        style={{ borderWidth: 1, borderColor: '#EBD7E5', borderRadius: 10, padding: 12, color: '#222' }} />
      {!!pricingFieldsError(value) && <Text style={{ color: '#B42318' }}>{pricingFieldsError(value)}</Text>}
    </>}
  </View>;
}
