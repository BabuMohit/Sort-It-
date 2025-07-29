import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeDirection } from '../types';

const { width: screenWidth } = Dimensions.get('window');

interface SwipeUndoBarProps {
  visible: boolean;
  swipeAction: SwipeDirection | null;
  photoName: string;
  onUndo: () => void;
  onTimeout: () => void;
  timeout?: number;
}

export const SwipeUndoBar: React.FC<SwipeUndoBarProps> = ({
  visible,
  swipeAction,
  photoName,
  onUndo,
  onTimeout,
  timeout = 5000,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible && swipeAction) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Start progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: timeout,
        useNativeDriver: false,
      }).start();

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        onTimeout();
        hideBar();
      }, timeout);
    } else {
      hideBar();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, swipeAction, timeout]);

  const hideBar = () => {
    Animated.spring(slideAnim, {
      toValue: -100,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleUndo = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onUndo();
    hideBar();
  };

  const getActionText = () => {
    if (!swipeAction) return '';
    
    switch (swipeAction.action) {
      case 'move':
        return `Moved "${photoName}" to ${swipeAction.albumId || 'album'}`;
      case 'copy':
        return `Copied "${photoName}" to ${swipeAction.albumId || 'album'}`;
      case 'delete':
        return `Deleted "${photoName}"`;
      default:
        return `Action performed on "${photoName}"`;
    }
  };

  const getActionColor = () => {
    if (!swipeAction) return '#4CAF50';
    
    switch (swipeAction.action) {
      case 'delete':
        return '#F44336';
      case 'move':
        return '#2196F3';
      case 'copy':
        return '#FF9800';
      default:
        return '#4CAF50';
    }
  };

  if (!visible || !swipeAction) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 20,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: getActionColor() }]}>
        <View style={styles.content}>
          <Text style={styles.actionText} numberOfLines={1}>
            {getActionText()}
          </Text>
          <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
            <Text style={styles.undoText}>UNDO</Text>
          </TouchableOpacity>
        </View>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  bar: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 16,
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  undoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});