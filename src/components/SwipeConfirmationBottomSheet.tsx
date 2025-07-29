import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Photo, SwipeDirection, AlbumAction } from '../types';
import { materialColors } from '../theme/materialDesign';

const { height: screenHeight } = Dimensions.get('window');

interface SwipeConfirmationBottomSheetProps {
  visible: boolean;
  photo: Photo | null;
  swipeDirection: SwipeDirection | null;
  swipeAction: AlbumAction | null;
  onConfirm: () => void;
  onCancel: () => void;
  hapticFeedbackEnabled?: boolean;
}

export const SwipeConfirmationBottomSheet: React.FC<SwipeConfirmationBottomSheetProps> = ({
  visible,
  photo,
  swipeDirection,
  swipeAction,
  onConfirm,
  onCancel,
  hapticFeedbackEnabled = true,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Handle Android back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onCancel();
        return true;
      });

      return () => backHandler.remove();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: screenHeight,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [visible]);

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (hapticFeedbackEnabled) {
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
  };

  const handleConfirm = () => {
    triggerHaptic('medium');
    onConfirm();
  };

  const handleCancel = () => {
    triggerHaptic('light');
    onCancel();
  };

  const getActionDetails = () => {
    if (!swipeAction || !photo) return { title: '', description: '', color: materialColors.blue[500] };

    switch (swipeAction.type) {
      case 'delete':
        return {
          title: 'Delete Photo',
          description: `Are you sure you want to delete "${photo.filename}"? This action cannot be undone.`,
          color: materialColors.red[500],
          icon: '🗑️',
        };
      case 'move':
        return {
          title: 'Move Photo',
          description: `Move "${photo.filename}" to ${swipeAction.albumName || 'selected album'}?`,
          color: materialColors.blue[500],
          icon: '📁',
        };
      case 'copy':
        return {
          title: 'Copy Photo',
          description: `Copy "${photo.filename}" to ${swipeAction.albumName || 'selected album'}?`,
          color: materialColors.orange[500],
          icon: '📋',
        };
      default:
        return {
          title: 'Confirm Action',
          description: `Perform action on "${photo.filename}"?`,
          color: materialColors.blue[500],
          icon: '❓',
        };
    }
  };

  const getSwipeDirectionInfo = () => {
    if (!swipeDirection) return { direction: '', color: materialColors.blue[500] };

    const directionMap = {
      left: { direction: 'Left', color: materialColors.orange[500], arrow: '←' },
      right: { direction: 'Right', color: materialColors.green[500], arrow: '→' },
      up: { direction: 'Up', color: materialColors.blue[500], arrow: '↑' },
      down: { direction: 'Down', color: materialColors.red[500], arrow: '↓' },
    };

    return directionMap[swipeDirection.type] || { direction: '', color: materialColors.blue[500], arrow: '' };
  };

  if (!visible || !photo || !swipeAction) {
    return null;
  }

  const actionDetails = getActionDetails();
  const swipeInfo = getSwipeDirectionInfo();
  const isDestructive = swipeAction.type === 'delete';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={handleCancel}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.swipeIndicator, { backgroundColor: swipeInfo.color }]}>
              <Text style={styles.swipeArrow}>{swipeInfo.arrow}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{actionDetails.title}</Text>
              <Text style={styles.swipeDirectionText}>
                Swipe {swipeInfo.direction} Action
              </Text>
            </View>
            <Text style={styles.actionIcon}>{actionDetails.icon}</Text>
          </View>

          {/* Photo Info */}
          <View style={styles.photoInfo}>
            <View style={styles.photoThumbnail}>
              {photo.thumbnailUri ? (
                <Text style={styles.photoPlaceholder}>📷</Text>
              ) : (
                <Text style={styles.photoPlaceholder}>📷</Text>
              )}
            </View>
            <View style={styles.photoDetails}>
              <Text style={styles.photoName} numberOfLines={1}>
                {photo.filename}
              </Text>
              <Text style={styles.photoMeta}>
                {photo.mediaType === 'video' ? 'Video' : 'Photo'} • {Math.round(photo.size / 1024)}KB
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>{actionDetails.description}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: actionDetails.color },
                isDestructive && styles.destructiveButton,
              ]}
              onPress={handleConfirm}
            >
              <Text style={[
                styles.confirmButtonText,
                isDestructive && styles.destructiveButtonText,
              ]}>
                {swipeAction.type === 'delete' ? 'Delete' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Additional Info for Destructive Actions */}
          {isDestructive && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                This action will permanently delete the photo from your device.
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  swipeIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  swipeArrow: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  swipeDirectionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  actionIcon: {
    fontSize: 24,
  },
  photoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  photoThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  photoPlaceholder: {
    fontSize: 20,
  },
  photoDetails: {
    flex: 1,
  },
  photoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  photoMeta: {
    fontSize: 14,
    color: '#666666',
  },
  description: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButton: {
    backgroundColor: materialColors.blue[500],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  destructiveButton: {
    backgroundColor: materialColors.red[500],
  },
  destructiveButtonText: {
    color: '#ffffff',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: materialColors.red[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: materialColors.red[700],
    fontWeight: '500',
  },
});