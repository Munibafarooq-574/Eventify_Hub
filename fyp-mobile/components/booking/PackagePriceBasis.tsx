import React from 'react';
import { Text } from 'react-native';
import { PackagePricing, pricingLabel } from '@/utils/packagePricing';

export default function PackagePriceBasis({ pkg, legacyPerPerson = false }: {
  pkg: PackagePricing; legacyPerPerson?: boolean;
}) {
  return <Text style={{ fontSize: 10, lineHeight: 14, fontWeight: '400' }}>
    {'\n'}{pricingLabel(pkg, legacyPerPerson)}
  </Text>;
}
