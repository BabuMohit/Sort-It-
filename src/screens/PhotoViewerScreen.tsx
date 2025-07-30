import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Text,
} from 'react-native';
import { Photo } from '../types';
import { NavigationProps } from '../navigation/types';
import { MobilePhotoViewer, SwipeDirection } from '../components/MobilePhotoViewer';
import { SwipeUndoBar } from '../components/SwipeUndoBar';
import { usePhotoOperations } from '../hooks/usePhotoOperations';
import { useMobileAppStore } from '../store/mobileAppStore';

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
  const [showUndoBar, setShowUndoBar] = useState(false);
  const [lastSwipeAction, setLastSwipeAction] = useState<SwipeDirection | null>(null);
  const [lastOperationId, setLastOperationId] = useState<string | null>(null);
  
  const { movePhoto, copyPhoto, deletePhoto, undoLastOperation } = usePhotoOperations();
  const { swipeConfig, settings } = useMobileAppStore();

  // Safety check - if no photos, navigate back
  if (!photos || photos.length === 0) {
    React.useEffect(() => {
      console.warn('PhotoViewerScreen: No photos available, navigating back');
      navigation.goBack();
    }, []);
    
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No photos found</Text>
      </View>
    );
  }

  const handlePhotoChange = (index: number) => {
    setCurrentIndex(index);
  };

  const handleSwipe = (direction: SwipeDirection, photo: Photo) => {
    // For now, show alert - will be implemented in task 8.3
    Alert.alert(
      'Swipe Action',
      `Swiped ${direction.type} on ${photo.filename}\nAction: ${direction.action}\nVelocity: ${direction.velocity.toFixed(0)}\nDistance: ${direction.distance.toFixed(0)}`,
      [{ text: 'OK' }]
    );
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleToggleControls = () => {
    setShowControls(!showControls);
  };

  return (
    <View style={styles.container}>
      <MobilePhotoViewer
        photos={photos}
        currentIndex={currentIndex}
        onSwipe={handleSwipe}
        onPhotoChange={handlePhotoChange}
        onClose={handleClose}
        screenDimensions={{
          width: screenWidth,
          height: screenHeight,
        }}
        showControls={showControls}
        onToggleControls={handleToggleControls}
      />
    </View>
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
});