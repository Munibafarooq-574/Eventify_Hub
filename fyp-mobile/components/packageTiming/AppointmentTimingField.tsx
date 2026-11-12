import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { APPOINTMENT_TIMING_LABELS, isValidDuringEventDuration, type AppointmentTiming } from '@/utils/appointmentTiming';

export default function AppointmentTimingField({ value, onChange, duringDuration, onDuringDurationChange }: {
  value: AppointmentTiming;
  onChange: (timing: AppointmentTiming) => void;
  duringDuration: string;
  onDuringDurationChange: (minutes: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>When can clients book this service?</Text>
      <View style={styles.options}>
        {(Object.keys(APPOINTMENT_TIMING_LABELS) as AppointmentTiming[]).map(timing => (
          <TouchableOpacity
            key={timing}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === timing }}
            style={[styles.option, value === timing && styles.selected]}
            onPress={() => onChange(timing)}
          >
            <Text style={styles.label}>{APPOINTMENT_TIMING_LABELS[timing]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {value === 'BOTH' && (
        <>
          <Text style={styles.label}>During-event duration in minutes (optional)</Text>
          <TextInput
            accessibilityLabel="During-event duration in minutes"
            keyboardType="number-pad"
            onChangeText={text => onDuringDurationChange(text.replace(/[^0-9]/g, ''))}
            placeholder="Same as time needed per booking"
            placeholderTextColor="#77717A"
            style={styles.input}
            value={duringDuration}
          />
          {!!duringDuration && !isValidDuringEventDuration(Number(duringDuration)) && (
            <Text style={styles.error}>Enter a positive number of minutes.</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, gap: 8 },
  label: { color: '#45203D', fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5D8E2', borderRadius: 12 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#E5D8E2', borderRadius: 12, paddingHorizontal: 12, color: '#45203D' },
  error: { color: '#B42318' },
  selected: { backgroundColor: '#F5EAF2', borderColor: '#7B2869' },
});
