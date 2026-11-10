import React from 'react';
import { Text } from 'react-native';
import { PackagePricing, pricingTitle } from '@/utils/packagePricing';

export default function PackagePricingLabel({ pkg, legacyPerPerson = false }: {
  pkg: PackagePricing; legacyPerPerson?: boolean;
}) {
  return <Text style={{ color: '#780C60', fontSize: 11, lineHeight: 16, fontWeight: '400', marginTop: 4, flexShrink: 1 }}>
    {pricingTitle(pkg, legacyPerPerson)}
  </Text>;
}
