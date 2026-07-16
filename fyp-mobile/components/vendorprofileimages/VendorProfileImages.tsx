import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#780C60';

/* ------------------------------------------------------------------ */
/* Zoomable full-screen image (pinch to zoom + double-tap to zoom)     */
/* Built with core React Native APIs only — no extra dependencies      */
/* ------------------------------------------------------------------ */
const ZoomableImage: React.FC<{ uri: string }> = ({ uri }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const lastDistance = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  const getDistance = (touches: any[]) => {
    const [a, b] = touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const resetZoom = () => {
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 6 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 6 }),
    ]).start();
  };

  const zoomIn = () => {
    lastScale.current = 2.5;
    Animated.spring(scale, { toValue: 2.5, useNativeDriver: true, friction: 6 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        lastDistance.current = null;
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // Pinch to zoom
          const distance = getDistance(touches);
          if (lastDistance.current != null) {
            const delta = distance / lastDistance.current;
            let newScale = lastScale.current * delta;
            newScale = Math.max(1, Math.min(newScale, 4));
            scale.setValue(newScale);
          }
        } else if (touches.length === 1 && lastScale.current > 1) {
          // Pan while zoomed in
          translateX.setValue(lastTranslateX.current + gestureState.dx);
          translateY.setValue(lastTranslateY.current + gestureState.dy);
        }
      },

      onPanResponderRelease: (evt) => {
        if (evt.nativeEvent.touches.length === 0) {
          scale.stopAnimation((value) => {
            const clamped = Math.max(1, Math.min(value, 4));
            lastScale.current = clamped;
            if (clamped === 1) {
              resetZoom();
            } else {
              Animated.spring(scale, { toValue: clamped, useNativeDriver: true, friction: 6 }).start();
            }
          });

          translateX.stopAnimation((value) => {
            lastTranslateX.current = value;
          });
          translateY.stopAnimation((value) => {
            lastTranslateY.current = value;
          });
        }

        lastDistance.current = null;

        // Double-tap detection
        const now = Date.now();
        if (now - lastTap.current < 280) {
          if (lastScale.current > 1) {
            resetZoom();
          } else {
            zoomIn();
          }
        }
        lastTap.current = now;
      },
    })
  ).current;

  return (
    <View style={styles.zoomableContainer} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri }}
        style={[
          styles.zoomableImage,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Main Screen                                                        */
/* ------------------------------------------------------------------ */
const PhotosScreen: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { vendorId } = useLocalSearchParams();
  console.log("📸 Received vendorId:", vendorId);
  const [vendorData, setVendorData] = useState<any>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`https://eventify-hub.onrender.com/vendor?userId=${vendorId}`);
      setImages(response.data.images.map((image: string) => `${image}`));

    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const openViewer = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const showPrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const showNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.imageContainer}
      activeOpacity={0.85}
      onPress={() => openViewer(index)}
    >
      <Image source={{ uri: item }} style={styles.image} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Photos</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{images.length}</Text>
        </View>
      </View>

      {images.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="image-outline" size={30} color={PRIMARY} />
          </View>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptyText}>
            Photos added to this profile will show up here.
          </Text>
        </View>
      ) : (
        <>
          {/* Horizontal Preview */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="albums-outline" size={16} color={PRIMARY} />
              <Text style={styles.cardTitle}>Preview</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoContainer}
              contentContainerStyle={{ paddingRight: 6 }}
            >
              {images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.85}
                  onPress={() => openViewer(index)}
                >
                  <Image source={{ uri: image }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Grid of Photos */}
          <FlatList
            data={images}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            numColumns={2}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Full-screen zoomable viewer */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>

          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.modalCounter}>
              {images.length > 0 ? `${selectedIndex + 1} / ${images.length}` : ''}
            </Text>

            <View style={styles.modalCloseButtonPlaceholder} />
          </View>

          {images.length > 0 && (
            <ZoomableImage key={selectedIndex} uri={images[selectedIndex]} />
          )}

          {images.length > 1 && (
            <View style={styles.modalNavRow} pointerEvents="box-none">
              <TouchableOpacity
                onPress={showPrev}
                style={styles.modalNavButton}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={showNext}
                style={styles.modalNavButton}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.modalHint}>Pinch or double-tap to zoom</Text>

        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5FB',
    paddingTop: 70,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF5FB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#8A7A85',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#3D1633',
  },
  countBadge: {
    backgroundColor: '#F3D9EC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },

  // Empty state

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 60,
  },
  emptyIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F3D9EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3D1633',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13.5,
    color: '#8A7A85',
    textAlign: 'center',
    lineHeight: 19,
  },

  // Grid

  grid: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  imageContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',

    shadowColor: PRIMARY,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },

  // Preview card

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 14,

    borderWidth: 1,
    borderColor: '#F1D5E8',

    shadowColor: PRIMARY,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3D1633',
    marginLeft: 8,
  },
  photoContainer: {
    flexDirection: 'row',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 14,
    marginRight: 10,
  },

  // Full-screen viewer modal

  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(15, 5, 12, 0.96)',
    justifyContent: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  modalCounter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalNavRow: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  modalNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomableContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomableImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
});

export default PhotosScreen;