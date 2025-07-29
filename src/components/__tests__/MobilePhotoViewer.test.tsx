import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MobilePhotoViewer } from '../MobilePhotoViewer';
import { SwipeDirection } from '../../types';
import { Photo } from '../../types';

// Mock all the complex dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  const Text = require('react-native').Text;
  const Image = require('react-native').Image;
  
  return {
    default: {
      View,
      Text,
      Image,
      useSharedValue: () => ({ value: 0 }),
      useAnimatedStyle: () => ({}),
      useAnimatedGestureHandler: () => ({}),
      withSpring: (value: any) => value,
      withTiming: (value: any, config?: any, callback?: any) => {
        if (callback) callback();
        return value;
      },
      runOnJS: (fn: any) => fn,
      interpolate: (value: any) => value,
      Extrapolate: { CLAMP: 'clamp' },
    },
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    useAnimatedGestureHandler: () => ({}),
    withSpring: (value: any) => value,
    withTiming: (value: any, config?: any, callback?: any) => {
      if (callback) callback();
      return value;
    },
    runOnJS: (fn: any) => fn,
    interpolate: (value: any) => value,
    Extrapolate: { CLAMP: 'clamp' },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    State: {},
  };
});

const mockPhotos: Photo[] = [
  {
    id: '1',
    uri: 'file://test1.jpg',
    filename: 'test1.jpg',
    width: 1920,
    height: 1080,
    creationTime: Date.now(),
    modificationTime: Date.now(),
    mediaType: 'photo',
    thumbnailUri: 'file://thumb1.jpg',
    size: 1024000,
    mimeType: 'image/jpeg',
    orientation: 0,
    isFromCamera: true,
    androidMediaStoreId: '1',
  },
  {
    id: '2',
    uri: 'file://test2.mp4',
    filename: 'test2.mp4',
    width: 1920,
    height: 1080,
    creationTime: Date.now(),
    modificationTime: Date.now(),
    mediaType: 'video',
    thumbnailUri: 'file://thumb2.jpg',
    size: 5024000,
    mimeType: 'video/mp4',
    orientation: 0,
    isFromCamera: true,
    androidMediaStoreId: '2',
  },
];

describe('MobilePhotoViewer', () => {
  const defaultProps = {
    photos: mockPhotos,
    currentIndex: 0,
    onSwipe: jest.fn(),
    onPhotoChange: jest.fn(),
    onClose: jest.fn(),
    screenDimensions: { width: 375, height: 812 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with photo', () => {
    const { getByText } = render(<MobilePhotoViewer {...defaultProps} />);
    
    expect(getByText('test1.jpg')).toBeTruthy();
    expect(getByText('1 of 2')).toBeTruthy();
  });

  it('renders video placeholder for video files', () => {
    const { getByText } = render(
      <MobilePhotoViewer {...defaultProps} currentIndex={1} />
    );
    
    expect(getByText('Video Player')).toBeTruthy();
    expect(getByText('Native Android controls will be implemented')).toBeTruthy();
  });

  it('shows controls by default', () => {
    const { getByText } = render(<MobilePhotoViewer {...defaultProps} />);
    
    expect(getByText('✕')).toBeTruthy();
    expect(getByText('⟲')).toBeTruthy();
    expect(getByText('Pinch • Pan • Rotate • Swipe')).toBeTruthy();
  });

  it('hides controls when showControls is false', () => {
    const { queryByText } = render(
      <MobilePhotoViewer {...defaultProps} showControls={false} />
    );
    
    expect(queryByText('✕')).toBeFalsy();
    expect(queryByText('⟲')).toBeFalsy();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByText } = render(<MobilePhotoViewer {...defaultProps} />);
    
    fireEvent.press(getByText('✕'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onToggleControls when photo is tapped', () => {
    const onToggleControls = jest.fn();
    const { getByTestId } = render(
      <MobilePhotoViewer {...defaultProps} onToggleControls={onToggleControls} />
    );
    
    // Note: In actual implementation, we'd need to add testID to the TouchableOpacity
    // For now, this test structure shows the intended behavior
  });

  it('calls onPhotoChange when navigating', () => {
    const { getByText } = render(<MobilePhotoViewer {...defaultProps} />);
    
    fireEvent.press(getByText('›'));
    expect(defaultProps.onPhotoChange).toHaveBeenCalledWith(1);
  });

  it('disables navigation buttons at boundaries', () => {
    const { getByText } = render(<MobilePhotoViewer {...defaultProps} />);
    
    const prevButton = getByText('‹');
    expect(prevButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('handles empty photo array gracefully', () => {
    const { getByText } = render(
      <MobilePhotoViewer {...defaultProps} photos={[]} />
    );
    
    expect(getByText('Photo not found')).toBeTruthy();
  });

  it('applies custom gesture configuration', () => {
    const customGestureConfig = {
      minimumSwipeDistance: 150,
      minimumSwipeVelocity: 800,
      hapticFeedbackEnabled: false,
      animationDuration: 500,
    };

    const { getByText } = render(
      <MobilePhotoViewer {...defaultProps} gestureConfig={customGestureConfig} />
    );
    
    expect(getByText('test1.jpg')).toBeTruthy();
    // Gesture config is applied internally, hard to test without integration tests
  });

  it('updates local index when currentIndex prop changes', () => {
    const { rerender, getByText } = render(
      <MobilePhotoViewer {...defaultProps} currentIndex={0} />
    );
    
    expect(getByText('1 of 2')).toBeTruthy();
    
    rerender(<MobilePhotoViewer {...defaultProps} currentIndex={1} />);
    expect(getByText('2 of 2')).toBeTruthy();
  });
});

describe('SwipeDirection detection', () => {
  // These would be integration tests that test the actual gesture handling
  // For unit tests, we focus on the component structure and prop handling
  
  it('should detect horizontal swipes', () => {
    // This would test the detectSwipeDirection function
    // Implementation would require exposing the function or testing through gestures
  });

  it('should detect vertical swipes', () => {
    // This would test vertical swipe detection
  });

  it('should respect minimum distance and velocity thresholds', () => {
    // This would test gesture thresholds
  });
});