//fyp-mobile/components/message/Voice/VoiceMessageBubble.tsx
import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

type Props = {
  uri: string;
  durationMs?: number;
  isSender: boolean;
};

const formatDuration = (ms?: number) => {
  if (!ms) return "0:00";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const VoiceMessageBubble: React.FC<Props> = ({ uri, durationMs, isSender }) => {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const togglePlay = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= status.duration) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const totalMs = status.duration ? status.duration * 1000 : durationMs || 0;
  const progress = totalMs > 0 ? Math.min(status.currentTime * 1000 / totalMs, 1) : 0;
  const remainingMs = status.playing || status.currentTime > 0
    ? Math.max(totalMs - status.currentTime * 1000, 0)
    : totalMs;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={18}
          color={isSender ? "#FFFFFF" : "#780C60"}
        />
      </TouchableOpacity>

      <View style={styles.trackWrap}>
        <View
          style={[
            styles.trackBg,
            { backgroundColor: isSender ? "rgba(255,255,255,0.3)" : "rgba(120,12,96,0.15)" },
          ]}
        >
          <View
            style={[
              styles.trackFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: isSender ? "#FFFFFF" : "#780C60",
              },
            ]}
          />
        </View>
        <Text style={[styles.durationText, isSender && styles.durationTextOnDark]}>
          {formatDuration(remainingMs)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 180,
    paddingVertical: 4,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  trackWrap: {
    flex: 1,
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  durationText: {
    fontSize: 11,
    color: "#9E9E9E",
    marginTop: 4,
  },
  durationTextOnDark: {
    color: "rgba(255,255,255,0.75)",
  },
});

export default VoiceMessageBubble;