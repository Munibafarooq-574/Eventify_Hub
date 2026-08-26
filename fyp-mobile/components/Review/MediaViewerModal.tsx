// fyp-mobile/components/Review/MediaViewerModal.tsx

import React, { useEffect, useState } from 'react';
import { Modal, View, Image, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { ReviewMedia } from '@/types/review';

interface MediaViewerModalProps {
  visible: boolean;
  media: ReviewMedia[];
  initialIndex: number;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ visible, media, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const current = media[currentIndex];
  const isVideo = current?.type === 'video';

  // Player is created once; source is swapped via player.replace() when currentIndex changes,
  // since useVideoPlayer's source argument isn't meant to be reactive across re-renders.
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (isVideo && current?.url) {
      player.replace({ uri: current.url });
      player.play();
    } else {
      player.pause();
    }
    // reset image state whenever we switch items (harmless no-op for video items)
    setImageLoading(true);
    setImageFailed(false);
  }, [current?.url, isVideo]);

  const goNext = () => {
    if (currentIndex < media.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (!current) return null;

  const videoLoading = isVideo && (status === 'loading' || status === 'idle');
  const videoFailed = isVideo && status === 'error';
  const loading = isVideo ? videoLoading : imageLoading;
  const failed = isVideo ? videoFailed : imageFailed;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} testID="media-viewer-modal">
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} testID="media-viewer-close">
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {media.length > 1 && (
          <Text style={styles.counter}>{currentIndex + 1} / {media.length}</Text>
        )}

        <View style={styles.mediaContainer}>
          {loading && !failed && (
            <ActivityIndicator size="large" color="#fff" style={StyleSheet.absoluteFill} testID="media-viewer-loading" />
          )}

          {failed ? (
            <View style={styles.brokenMediaBox} testID="media-viewer-broken">
              <Ionicons name="image-outline" size={48} color="#999" />
              <Text style={styles.brokenMediaText}>Unable to load media</Text>
            </View>
          ) : isVideo ? (
            <VideoView
              style={styles.fullVideo}
              player={player}
              nativeControls
              allowsFullscreen
              contentFit="contain"
              testID="media-viewer-video"
            />
          ) : (
            <Image
              source={{ uri: current.url }}
              style={styles.fullImage}
              resizeMode="contain"
              onLoadEnd={() => setImageLoading(false)}
              onError={() => { setImageLoading(false); setImageFailed(true); }}
            />
          )}
        </View>

        {media.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity style={[styles.navArrow, { left: 12 }]} onPress={goPrev} testID="media-viewer-prev">
                <Ionicons name="chevron-back" size={32} color="#fff" />
              </TouchableOpacity>
            )}
            {currentIndex < media.length - 1 && (
              <TouchableOpacity style={[styles.navArrow, { right: 12 }]} onPress={goNext} testID="media-viewer-next">
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  counter: { position: 'absolute', top: 54, alignSelf: 'center', color: '#fff', fontSize: 13, zIndex: 10 },
  mediaContainer: { width: width, height: '80%', alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '100%' },
  fullVideo: { width: '100%', height: '100%' },
  brokenMediaBox: { alignItems: 'center', justifyContent: 'center' },
  brokenMediaText: { color: '#999', marginTop: 8, fontSize: 13 },
  navArrow: { position: 'absolute', top: '50%', marginTop: -16, padding: 8, zIndex: 10 },
});

export default MediaViewerModal;