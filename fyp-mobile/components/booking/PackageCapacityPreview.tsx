import { Text, View } from 'react-native';
import type { PackagePricing } from '@/utils/packagePricing';
import { packagePreviewStyles as styles } from './packagePreviewStyles';

const unitLabels = {
  PERSON: 'People',
  GROUP: 'Groups',
  VEHICLE: 'Vehicles',
  TEAM: 'Teams',
  SETUP: 'Setups',
};

export default function PackageCapacityPreview({ pkg }: { pkg: PackagePricing }) {
  const { capacityUnit, maxPeoplePerBooking, maxUnitsPerBooking, availableParallelUnits } = pkg;
  if (!capacityUnit) return null;

  const limits = [
    {
      label: 'Maximum people per booking',
      value: capacityUnit === 'PERSON' || capacityUnit === 'GROUP' ? maxPeoplePerBooking : undefined,
    },
    { label: 'Maximum units per booking', value: maxUnitsPerBooking },
    { label: 'Available teams / resources at once', value: availableParallelUnits },
  ];

  return (
    <View style={styles.previewDurationSection}>
      <Text accessibilityRole="header" style={styles.previewSectionTitle}>Service Capacity</Text>
      <View style={styles.previewDurationRow}>
        <Text style={styles.previewDurationText}>Capacity unit</Text>
        <Text style={styles.previewDurationPrice}>{unitLabels[capacityUnit]}</Text>
      </View>
      {limits
        .filter(({ value }) => value != null && Number.isSafeInteger(value) && value > 0)
        .map(({ label, value }) => (
          <View key={label} style={styles.previewDurationRow}>
            <Text style={styles.previewDurationText}>{label}</Text>
            <Text style={styles.previewDurationPrice}>{value}</Text>
          </View>
        ))}
    </View>
  );
}
