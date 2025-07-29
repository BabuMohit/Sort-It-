import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Photo, SwipeDirection } from '../types';
import { SwipeIndicator } from './SwipeIndicator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');



export interface GestureConfig {
  minimumSwipeDistance: number;
  minimumSwipeVelocity: number;
  hapticFeedbackEnabled: boolean;
  animationDuration: number;
}

interface MobilePhotoViewerProps {
  photos: Photo[];
  currentIndex: number;
  onSwipe: (direction: SwipeDirection, photo: Photo) => void;
  onPhotoChange: (index: number) => void;
  onClose: () => void;
  screenDimensions: {
    width: number;
    height: number;
  };
  gestureConfig?: GestureConfig;
  showControls?: boolean;
  onToggleControls?: () => void;
}

const defaultGestureConfig: GestureConfig = {
  minimumSwipeDistance: 100,
  minimumSwipeVelocity: 500,
  hapticFeedbackEnabled: true,
  animationDuration: 300,
};

export const MobilePhotoViewer: React.FC<MobilePhotoViewerProps> = ({
  photos,
  currentIndex,
  onSwipe,
  onPhotoChange,
  onClose,
  screenDimensions,
  gestureConfig = defaultGestureConfig,
  showControls = true,
  onToggleControls,
}) => {
  const [localCurrentIndex, setLocalCurrentIndex] = useState(currentIndex);
  
  // Animation values for zoom, pan, and rotation
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  
  // Animation values for photo navigation
  const photoTranslateX = useSharedValue(0);
  const photoOpacity = useSharedValue(1);
  
  // Swipe feedback values
  const swipeIndicatorOpacity = useSharedValue(0);
  const swipeIndicatorScale = useSharedValue(0.8);
  
  // Gesture refs
  const pinchRef = useRef<any>(null);
  const panRef = useRef<any>(null);
  const rotationRef = useRef<any>(null);

  const currentPhoto = photos[localCurrentIndex];

  // Update local index when prop changes
  useEffect(() => {
    setLocalCurrentIndex(currentIndex);
  }, [currentIndex]);

  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (gestureConfig.hapticFeedbackEnabled) {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    }
  }, [gestureConfig.hapticFeedbackEnabled]);

  const resetTransform = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    rotation.value = withSpring(0, { damping: 20, stiffness: 300 });
  }, []);

  const goToPrevious = useCallback(() => {
    if (localCurrentIndex > 0) {
      const newIndex = localCurrentIndex - 1;
      setLocalCurrentIndex(newIndex);
      onPhotoChange(newIndex);
      resetTransform();
      triggerHapticFeedback('light');
    }
  }, [localCurrentIndex, onPhotoChange, resetTransform, triggerHapticFeedback]);

  const goToNext = useCallback(() => {
    if (localCurrentIndex < photos.length - 1) {
      const newIndex = localCurrentIndex + 1;
      setLocalCurrentIndex(newIndex);
      onPhotoChange(newIndex);
      resetTransform();
      triggerHapticFeedback('light');
    }
  }, [localCurrentIndex, photos.length, onPhotoChange, resetTransform, triggerHapticFeedback]);

  const handleSwipeAction = useCallback((direction: SwipeDirection) => {
    triggerHapticFeedback('medium');
    onSwipe(direction, currentPhoto);
    
    // Show swipe feedback animation
    swipeIndicatorOpacity.value = withTiming(1, { duration: 200 }, () => {
      swipeIndicatorOpacity.value = withTiming(0, { duration: 800 });
    });
    swipeIndicatorScale.value = withSpring(1.2, { damping: 15 });
  }, [currentPhoto, onSwipe, triggerHapticFeedback]);

  const detectSwipeDirection = useCallback((translationX: number, translationY: number, velocityX: number, velocityY: number): SwipeDirection | null => {
    const absX = Math.abs(translationX);
    const absY = Math.abs(translationY);
    const absVelX = Math.abs(velocityX);
    const absVelY = Math.abs(velocityY);

    // Check if gesture meets minimum thresholds
    const meetsDistanceThreshold = Math.max(absX, absY) > gestureConfig.minimumSwipeDistance;
    const meetsVelocityThreshold = Math.max(absVelX, absVelY) > gestureConfig.minimumSwipeVelocity;

    if (!meetsDistanceThreshold && !meetsVelocityThreshold) {
      return null;
    }

    const timestamp = Date.now();
    const startPosition = { x: 0, y: 0 }; // Would be set from gesture start
    const endPosition = { x: translationX, y: translationY };

    // Determine primary direction
    if (absX > absY) {
      // Horizontal swipe
      if (translationX > 0) {
        return {
          type: 'right',
          action: 'move',
          velocity: velocityX,
          distance: translationX,
          timestamp,
          startPosition,
          endPosition,
        };
      } else {
        return {
          type: 'left',
          action: 'move',
          velocity: velocityX,
          distance: Math.abs(translationX),
          timestamp,
          startPosition,
          endPosition,
        };
      }
    } else {
      // Vertical swipe
      if (translationY > 0) {
        return {
          type: 'down',
          action: 'delete',
          velocity: velocityY,
          distance: translationY,
          timestamp,
          startPosition,
          endPosition,
        };
      } else {
        return {
          type: 'up',
          action: 'move',
          velocity: velocityY,
          distance: Math.abs(translationY),
          timestamp,
          startPosition,
          endPosition,
        };
      }
    }
  }, [gestureConfig]);

  const toggleControls = useCallback(() => {
    if (onToggleControls) {
      onToggleControls();
    }
    triggerHapticFeedback('light');
  }, [onToggleControls, triggerHapticFeedback]);

  // Pinch gesture handler for zoom
  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(triggerHapticFeedback)('light');
    },
    onActive: (event: any) => {
      scale.value = Math.max(0.5, Math.min(event.scale || 1, 4));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        runOnJS(triggerHapticFeedback)('medium');
      }
    },
  });

  // Rotation gesture handler
  const rotationGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(triggerHapticFeedback)('light');
    },
    onActive: (event: any) => {
      rotation.value = event.rotation || 0;
    },
    onEnd: () => {
      // Snap to nearest 90-degree increment
      const snapAngle = Math.round(rotation.value / (Math.PI / 2)) * (Math.PI / 2);
      rotation.value = withSpring(snapAngle);
      if (Math.abs(rotation.value - snapAngle) > 0.1) {
        runOnJS(triggerHapticFeedback)('medium');
      }
    },
  });

  // Pan gesture handler for pan and swipe
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      photoOpacity.value = 1;
    },
    onActive: (event) => {
      if (scale.value > 1.1) {
        // Pan when zoomed in
        translateX.value = event.translationX / scale.value;
        translateY.value = event.translationY / scale.value;
      } else {
        // Handle swipe gestures when not zoomed
        photoTranslateX.value = event.translationX;
        
        // Provide visual feedback for potential swipe
        const progress = Math.abs(event.translationX) / screenWidth;
        photoOpacity.value = Math.max(0.3, 1 - progress * 0.7);
        
        // Show swipe indicator based on direction and distance
        if (Math.abs(event.translationX) > gestureConfig.minimumSwipeDistance * 0.5) {
          swipeIndicatorOpacity.value = Math.min(1, progress * 2);
        }
      }
    },
    onEnd: (event) => {
      if (scale.value > 1.1) {
        // Reset pan when zoomed
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        // Handle swipe or navigation
        const swipeDirection = detectSwipeDirection(
          event.translationX,
          event.translationY,
          event.velocityX,
          event.velocityY
        );

        if (swipeDirection) {
          runOnJS(handleSwipeAction)(swipeDirection);
        } else {
          // Check for navigation swipe
          const navigationThreshold = screenWidth * 0.25;
          if (Math.abs(event.translationX) > navigationThreshold) {
            if (event.translationX > 0) {
              runOnJS(goToPrevious)();
            } else {
              runOnJS(goToNext)();
            }
          }
        }
        
        // Reset photo position and opacity
        photoTranslateX.value = withSpring(0);
        photoOpacity.value = withSpring(1);
        swipeIndicatorOpacity.value = withTiming(0);
      }
    },
  });

  // Animated styles
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: photoTranslateX.value }],
    opacity: photoOpacity.value,
  }));

  const swipeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: swipeIndicatorOpacity.value,
    transform: [{ scale: swipeIndicatorScale.value }],
  }));

  if (!currentPhoto) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Photo not found</Text>
      </View>
    );
  }

  const renderPhotoContent = () => {
    if (currentPhoto.mediaType === 'video') {
      // Enhanced video placeholder with better UX
      return (
        <View style={styles.videoPlaceholder}>
          <View style={styles.videoIcon}>
            <Text style={styles.videoPlayIcon}>▶</Text>
          </View>
          <Text style={styles.videoText}>Video</Text>
          <Text style={styles.videoSubtext}>
            {currentPhoto.filename}
          </Text>
          <Text style={styles.videoDuration}>
            Duration: {Math.floor(((currentPhoto as any).duration || 0) / 1000)}s
          </Text>
          <TouchableOpacity 
            style={styles.videoPlayButton}
            onPress={() => {
              Alert.alert(
                'Video Playback',
                'Native Android video controls will be implemented in a future update.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.videoPlayButtonText}>Play Video</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Animated.Image
        source={{ uri: currentPhoto.uri }}
        style={[styles.photo, animatedImageStyle]}
        resizeMode="contain"
      />
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />
      
      {/* Top Controls */}
      {showControls && (
        <SafeAreaView style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={onClose}>
            <Text style={styles.controlButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.photoInfo}>
            <Text style={styles.photoTitle} numberOfLines={1}>{currentPhoto.filename}</Text>
            <Text style={styles.photoCounter}>
              {localCurrentIndex + 1} of {photos.length}
            </Text>
          </View>
          <TouchableOpacity style={styles.controlButton} onPress={() => resetTransform()}>
            <Text style={styles.controlButtonText}>⟲</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Main Photo Container */}
      <Animated.View style={[styles.photoContainer, animatedContainerStyle]}>
        <PinchGestureHandler
          ref={pinchRef}
          onGestureEvent={pinchGestureHandler}
          simultaneousHandlers={[panRef, rotationRef]}
        >
          <Animated.View style={styles.gestureContainer}>
            <RotationGestureHandler
              ref={rotationRef}
              onGestureEvent={rotationGestureHandler}
              simultaneousHandlers={[pinchRef, panRef]}
            >
              <Animated.View style={styles.gestureContainer}>
                <PanGestureHandler
                  ref={panRef}
                  onGestureEvent={panGestureHandler}
                  simultaneousHandlers={[pinchRef, rotationRef]}
                >
                  <Animated.View style={styles.gestureContainer}>
                    <TouchableOpacity
                      style={styles.photoTouchable}
                      onPress={toggleControls}
                      activeOpacity={1}
                    >
                      {renderPhotoContent()}
                    </TouchableOpacity>
                  </Animated.View>
                </PanGestureHandler>
              </Animated.View>
            </RotationGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>

      {/* Swipe Indicators */}
      <SwipeIndicator
        direction="left"
        progress={swipeIndicatorScale}
        opacity={swipeIndicatorOpacity}
      />
      <SwipeIndicator
        direction="right"
        progress={swipeIndicatorScale}
        opacity={swipeIndicatorOpacity}
      />
      <SwipeIndicator
        direction="up"
        progress={swipeIndicatorScale}
        opacity={swipeIndicatorOpacity}
      />
      <SwipeIndicator
        direction="down"
        progress={swipeIndicatorScale}
        opacity={swipeIndicatorOpacity}
      />

      {/* Bottom Controls */}
      {showControls && (
        <SafeAreaView style={styles.bottomControls}>
          <View style={styles.navigationControls}>
            <TouchableOpacity
              style={[
                styles.navButton,
                localCurrentIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={goToPrevious}
              disabled={localCurrentIndex === 0}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            
            <View style={styles.gestureHints}>
              <Text style={styles.hintText}>Pinch • Pan • Rotate • Swipe</Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.navButton,
                localCurrentIndex === photos.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={goToNext}
              disabled={localCurrentIndex === photos.length - 1}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  photoInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  photoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoCounter: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 2,
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  videoPlaceholder: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  videoPlayIcon: {
    color: '#ffffff',
    fontSize: 32,
    marginLeft: 4,
  },
  videoText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  videoSubtext: {
    color: '#cccccc',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  videoDuration: {
    color: '#aaaaaa',
    fontSize: 12,
    marginBottom: 16,
  },
  videoPlayButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  videoPlayButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
  },
  swipeIndicatorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  gestureHints: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  hintText: {
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
  },
});