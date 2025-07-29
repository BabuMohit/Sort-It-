import React, { useState, useRef } from 'react';
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
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Photo } from '../types';
import { NavigationProps } from '../navigation/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PhotoViewerScreenProps extends NavigationProps {
  route: {
    params: {
      photos: Photo[];
      currentIndex: number;
      albumId?: string;
    };
  };
}

export const PhotoViewerScreen: React.FC<PhotoViewerScreenProps> = ({
  navigation,
  route,
}) => {
  const { photos, currentIndex: initialIndex, albumId } = route.params;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);

  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const photoTranslateX = useSharedValue(0);

  // Refs
  const pinchRef = useRef();
  const panRef = useRef();

  const currentPhoto = photos[currentIndex];

  const resetTransform = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetTransform();
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetTransform();
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share functionality will be implemented in a future update.');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Delete functionality will be implemented in photo operations task
            Alert.alert('Delete', 'Delete functionality will be implemented in a future update.');
          },
        },
      ]
    );
  };

  // Pinch gesture handler
  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(setShowControls)(false);
    },
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(event.scale, 3));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 2.5) {
        scale.value = withSpring(2.5);
      }
      runOnJS(setShowControls)(true);
    },
  });

  // Pan gesture handler
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(setShowControls)(false);
    },
    onActive: (event) => {
      if (scale.value > 1) {
        // Pan when zoomed in
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      } else {
        // Horizontal swipe for navigation
        photoTranslateX.value = event.translationX;
      }
    },
    onEnd: (event) => {
      if (scale.value > 1) {
        // Reset pan when zoomed
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        // Handle swipe navigation
        const threshold = screenWidth * 0.3;
        if (Math.abs(event.translationX) > threshold) {
          if (event.translationX > 0) {
            runOnJS(goToPrevious)();
          } else {
            runOnJS(goToNext)();
          }
        }
        photoTranslateX.value = withSpring(0);
      }
      runOnJS(setShowControls)(true);
    },
  });

  // Animated styles
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: photoTranslateX.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {showControls && (
        <SafeAreaView style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleClose}>
            <Text style={styles.controlButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.photoInfo}>
            <Text style={styles.photoTitle}>{currentPhoto.filename}</Text>
            <Text style={styles.photoCounter}>
              {currentIndex + 1} of {photos.length}
            </Text>
          </View>
          <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
            <Text style={styles.controlButtonText}>⤴</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      <Animated.View style={[styles.photoContainer, animatedContainerStyle]}>
        <PinchGestureHandler
          ref={pinchRef}
          onGestureEvent={pinchGestureHandler}
          simultaneousHandlers={panRef}
        >
          <Animated.View style={styles.gestureContainer}>
            <PanGestureHandler
              ref={panRef}
              onGestureEvent={panGestureHandler}
              simultaneousHandlers={pinchRef}
            >
              <Animated.View style={styles.gestureContainer}>
                <TouchableOpacity
                  style={styles.photoTouchable}
                  onPress={toggleControls}
                  activeOpacity={1}
                >
                  <Animated.Image
                    source={{ uri: currentPhoto.uri }}
                    style={[styles.photo, animatedImageStyle]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>

      {showControls && (
        <SafeAreaView style={styles.bottomControls}>
          <View style={styles.navigationControls}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={goToPrevious}
              disabled={currentIndex === 0}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                <Text style={styles.actionButtonText}>🗑</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[
                styles.navButton,
                currentIndex === photos.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={goToNext}
              disabled={currentIndex === photos.length - 1}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  actionButtonText: {
    fontSize: 20,
  },
});