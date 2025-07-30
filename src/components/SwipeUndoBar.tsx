import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { PhotoOperationResult } from '../types';

export interface SwipeUndoBarProps {
  lastOperation: PhotoOperationResult | null;
  onUndo: () => void;
  visible: boolean;
  duration?: number;
}

export const SwipeUndoBar: React.FC<SwipeUndoBarProps> = ({
  lastOperation,
  onUndo,
  visible,
  duration = 5000,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [timeLeft, setTimeLeft] = useState(duration / 1000);

  useEffect(() => {
    if (visible && lastOperation) {
      setTimeLeft(duration / 1000);
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Countdown timer
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Fade out
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, lastOperation, duration, fadeAnim]);

  if (!visible || !lastOperation) {
    return null;
  }

  const getOperationText = () => {
    switch (lastOperation.operation) {
      case 'move':
        return `Moved photo to ${lastOperation.targetAlbumId || 'album'}`;
      case 'copy':
        return `Copied photo to ${lastOperation.targetAlbumId || 'album'}`;
      case 'delete':
        return 'Photo deleted';
      default:
        return 'Operation completed';
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <Text style={styles.operationText}>{getOperationText()}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.undoButton} onPress={onUndo}>
            <Text style={styles.undoText}>UNDO</Text>
          </TouchableOpacity>
          <Text style={styles.timer}>{timeLeft}s</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#323232',
    borderRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  operationText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
  },
  undoText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timer: {
    color: '#999',
    fontSize: 12,
    minWidth: 25,
    textAlign: 'center',
  },
});