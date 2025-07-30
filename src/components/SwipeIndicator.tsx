import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

export interface SwipeIndicatorProps {
  translateX: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  screenWidth: number;
  screenHeight: number;
}

export const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({
  translateX,
  translateY,
  screenWidth,
  screenHeight,
}) => {
  const leftIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, screenWidth * 0.3],
      [0, 1],
      Extrapolate.CLAMP
    );
    return {
      opacity,
    };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-screenWidth * 0.3, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity,
    };
  });

  const upIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, screenHeight * 0.3],
      [0, 1],
      Extrapolate.CLAMP
    );
    return {
      opacity,
    };
  });

  const downIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-screenHeight * 0.3, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, styles.leftIndicator, leftIndicatorStyle]}>
        <Text style={styles.indicatorText}>Archive</Text>
      </Animated.View>
      
      <Animated.View style={[styles.indicator, styles.rightIndicator, rightIndicatorStyle]}>
        <Text style={styles.indicatorText}>Keep</Text>
      </Animated.View>
      
      <Animated.View style={[styles.indicator, styles.upIndicator, upIndicatorStyle]}>
        <Text style={styles.indicatorText}>Move to Album</Text>
      </Animated.View>
      
      <Animated.View style={[styles.indicator, styles.downIndicator, downIndicatorStyle]}>
        <Text style={styles.indicatorText}>Delete</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  indicator: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  leftIndicator: {
    left: 20,
    top: '50%',
    transform: [{ translateY: -20 }],
  },
  rightIndicator: {
    right: 20,
    top: '50%',
    transform: [{ translateY: -20 }],
  },
  upIndicator: {
    top: 100,
    left: '50%',
    transform: [{ translateX: -60 }],
  },
  downIndicator: {
    bottom: 100,
    left: '50%',
    transform: [{ translateX: -30 }],
  },
  indicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});