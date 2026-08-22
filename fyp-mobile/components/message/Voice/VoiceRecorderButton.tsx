//fyp-mobile/components/message/Voice/VoiceRecorderButton.tsx
import React, { useEffect, useRef, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";

const PRIMARY = "#780C60";

type Props = {
  onSend: (uri: string, durationMs: number) => void;
  disabled?: boolean;
};

const formatTimer = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const VoiceRecorderButton: React.FC<Props> = ({ onSend, disabled }) => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Permission needed",
          "Microphone access is required to record voice notes."
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      startTimeRef.current = Date.now();
      setElapsedMs(0);
      setIsRecording(true);

      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 200);
    } catch (error) {
      console.error("VOICE RECORD START ERROR:", error);
      Alert.alert("Recording error", "Could not start recording. Please try again.");
    }
  };

  const stopAndSend = async () => {
    if (!isRecording) return;
    try {
      if (tickRef.current) clearInterval(tickRef.current);
      const durationMs = Date.now() - startTimeRef.current;
      setIsRecording(false);

      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        Alert.alert("Recording error", "Could not save the recording.");
        return;
      }

      if (durationMs < 800) {
        // bohot chhota tap — WhatsApp ki tarah ignore kar dein
        return;
      }

      onSend(uri, durationMs);
    } catch (error) {
      console.error("VOICE RECORD STOP ERROR:", error);
      Alert.alert("Recording error", "Could not save the recording.");
    }
  };

  const cancelRecording = async () => {
    try {
      if (tickRef.current) clearInterval(tickRef.current);
      setIsRecording(false);
      await recorder.stop();
    } catch (error) {
      console.log("Cancel recording error (non-fatal):", error);
    }
  };

  if (isRecording) {
    return (
      <View style={styles.recordingRow}>
        <TouchableOpacity onPress={cancelRecording} style={styles.cancelBtn}>
          <Ionicons name="trash-outline" size={20} color="#B3261E" />
        </TouchableOpacity>

        <View style={styles.timerPill}>
          <View style={styles.recDot} />
          <Text style={styles.timerText}>{formatTimer(elapsedMs)}</Text>
        </View>

        <TouchableOpacity onPress={stopAndSend} style={styles.sendRecordBtn}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.micButton}
      onPress={startRecording}
      disabled={disabled}
    >
      <Ionicons name="mic" size={20} color={PRIMARY} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F0F4",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#E6D4E6",
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F0F4",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 6,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E53935",
    marginRight: 6,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  sendRecordBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default VoiceRecorderButton;