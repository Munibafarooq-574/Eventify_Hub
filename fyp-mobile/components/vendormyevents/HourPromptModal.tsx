//fyp-mobile/components/vendormyevents/HourPromptModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const PRIMARY = '#780C60';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  onCancel: () => void;
  onSubmit: (hours: number) => void;
};

const HourPromptModal = ({
  visible,
  title,
  message,
  onCancel,
  onSubmit,
}: Props) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setValue('');
      setError('');
    }
  }, [visible]);

  const handleSubmit = () => {
    const hours = parseFloat(value.trim());
    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Please enter a valid number of hours.');
      return;
    }
    onSubmit(hours);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 3 (for 3 hours)"
            value={value}
            onChangeText={(t) => {
              setValue(t);
              setError('');
            }}
            autoFocus
          />
          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleSubmit}>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default HourPromptModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20 },
  title: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  message: { fontSize: 12, color: '#777', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E3D3DD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  error: { color: '#C0392B', fontSize: 11, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
  },
  cancelText: { color: '#666', fontWeight: '700' },
  addBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: PRIMARY,
  },
  addText: { color: '#FFF', fontWeight: '800' },
});