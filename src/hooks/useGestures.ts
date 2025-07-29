import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

interface GestureConfig {
  hapticEnabled: boolean;
  minimumDistance: number;
  minimumVelocity: number;
}

export const useGestures = (config: GestureConfig = {
  hapticEnabled: true,
  minimumDistance: 100,
  minimumVelocity: 500,
}) => {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!config.hapticEnabled) return;
    
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
  }, [config.hapticEnabled]);

  const detectSwipeDirection = useCallback((
    translationX: number,
    translationY: number,
    velocityX: number,
    velocityY: number
  ) => {
    const absX = Math.abs(translationX);
    const absY = Math.abs(translationY);
    const absVelX = Math.abs(velocityX);
    const absVelY = Math.abs(velocityY);

    // Check if gesture meets minimum thresholds
    const meetsDistance = Math.max(absX, absY) > config.minimumDistance;
    const meetsVelocity = Math.max(absVelX, absVelY) > config.minimumVelocity;

    if (!meetsDistance && !meetsVelocity) {
      return null;
    }

    // Determine primary direction
    if (absX > absY) {
      return translationX > 0 ? 'right' : 'left';
    } else {
      return translationY > 0 ? 'down' : 'up';
    }
  }, [config.minimumDistance, config.minimumVelocity]);

  return {
    triggerHaptic,
    detectSwipeDirection,
  };
};