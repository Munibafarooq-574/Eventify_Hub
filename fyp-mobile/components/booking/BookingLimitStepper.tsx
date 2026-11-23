import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export default function BookingLimitStepper({ value, onChange, disabled }: Props) {
  const renderButton = (step: -1 | 1, label: string, symbol: string) => {
    const next = value + step;
    const unavailable = Boolean(disabled || next < 1 || !Number.isSafeInteger(next));
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: unavailable }}
        disabled={unavailable}
        onPress={() => onChange(next)}
        style={[styles.button, unavailable && styles.disabled]}
      >
        <Text style={styles.buttonText}>{symbol}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <Text style={styles.title}>Maximum bookings at the same time</Text>
      <Text style={styles.subtitle}>How many bookings can your team handle at once?</Text>
      <View style={styles.controls}>
        {renderButton(-1, 'Decrease maximum bookings', '−')}
        <Text accessibilityLiveRegion="polite" style={styles.title}>{value}</Text>
        {renderButton(1, 'Increase maximum bookings', '+')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: '#201620' },
  subtitle: { marginTop: 4, color: '#685A66' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  button: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8E9F0' },
  disabled: { opacity: 0.45 },
  buttonText: { fontSize: 22, color: '#780C60' },
});
