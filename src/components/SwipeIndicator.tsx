import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { SwipeDirection } from '../types';

interface SwipeIndicatorProps {
  direction: 'left' | 'right' | 'up' | 'down';
  progress: Animated.SharedValue<number>;
  opacity: Animated.SharedValue<number>;
}

export const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({
  direction,
  progress,
  opacity,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      progress.value,
      [0, 0.5, 1],
      [0.8, 1.1, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity: opacity.value,
      transform: [{ scale }],
    };
  });

  const getIndicatorConfig = () => {
    switch (direction) {
      case 'left':
        return {
          icon: '←',
          text: 'Archive',
          color: '#FF9800',
          position: styles.leftIndicator,
        };
      case 'right':
        return {
          icon: '→',
          text: 'Keep',
          color: '#4CAF50',
          position: styles.rightIndicator,
        };
      case 'up':
        return {
          icon: '↑',
          text: 'Move to Album',
          color: '#2196F3',
          position: styles.upIndicator,
        };
      case 'down':
        return {
          icon: '↓',
          text: 'Delete',
          color: '#F44336',
          position: styles.downIndicator,
        };
      default:
        return {
          icon: '•',
          text: 'Action',
          color: '#9E9E9E',
          position: styles.centerIndicator,
        };
    }
  };

  const config = getIndicatorConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        config.position,
        { backgroundColor: config.color },
        animatedStyle,
      ]}
    >
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={styles.text}>{config.text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  leftIndicator: {
    left: 40,
    top: '50%',
    marginTop: -30,
  },
  rightIndicator: {
    right: 40,
    top: '50%',
    marginTop: -30,
  },
  upIndicator: {
    top: 100,
    left: '50%',
    marginLeft: -50,
  },
  downIndicator: {
    bottom: 100,
    left: '50%',
    marginLeft: -50,
  },
  centerIndicator: {
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -50,
  },
  icon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});