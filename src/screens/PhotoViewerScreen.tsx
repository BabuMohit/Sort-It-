import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Text,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Photo, SwipeDirection, PhotoOperationResult, SwipeConfiguration, AlbumAction } from '../types';
import { NavigationProps } from '../navigation/types';
import { MobilePhotoViewer } from '../components/MobilePhotoViewer';
import { SwipeUndoBar } from '../components/SwipeUndoBar';
import { SwipeConfirmationBottomSheet } from '../components/SwipeConfirmationBottomSheet';
import { BatchOperationProgress, BatchOperation } from '../components/BatchOperationProgress';
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
  
  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingSwipe, setPendingSwipe] = useState<{
    direction: SwipeDirection;
    photo: Photo;
    action: AlbumAction;
  } | null>(null);
  
  // Batch operation state
  const [showBatchProgress, setShowBatchProgress] = useState(false);
  const [batchOperations, setBatchOperations] = useState<BatchOperation[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [completedBatchOps, setCompletedBatchOps] = useState(0);
  const [failedBatchOps, setFailedBatchOps] = useState(0);
  const batchCancelledRef = useRef(false);
  
  const { movePhoto, copyPhoto, deletePhoto, undoLastOperation } = usePhotoOperations();
  const { swipeConfig, settings } = useMobileAppStore();

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showConfirmation) {
          setShowConfirmation(false);
          setPendingSwipe(null);
          return true;
        }
        if (showBatchProgress && currentBatchIndex < batchOperations.length) {
          // Show cancel confirmation for ongoing batch operations
          Alert.alert(
            'Cancel Operations',
            'Are you sure you want to cancel the ongoing operations?',
            [
              { text: 'Continue', style: 'cancel' },
              { 
                text: 'Cancel', 
                style: 'destructive',
                onPress: () => {
                  batchCancelledRef.current = true;
                  setShowBatchProgress(false);
                }
              }
            ]
          );
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [showConfirmation, showBatchProgress, currentBatchIndex, batchOperations.length])
  );

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

  const handleSwipe = async (direction: SwipeDirection, photo: Photo) => {
    try {
      // Get the configured action for this swipe direction
      const swipeAction = swipeConfig[direction.type as keyof SwipeConfiguration] as AlbumAction;
      
      if (!swipeAction || typeof swipeAction !== 'object' || !('type' in swipeAction)) {
        Alert.alert('Error', 'No action configured for this swipe direction');
        return;
      }

      // Show confirmation dialog for actions that require confirmation
      if (swipeAction.confirmationRequired) {
        setPendingSwipe({ direction, photo, action: swipeAction });
        setShowConfirmation(true);
        return;
      }

      // Perform action immediately if no confirmation required
      await performSwipeAction(direction, photo, swipeAction);
    } catch (error) {
      console.error('Swipe action failed:', error);
      Alert.alert('Error', 'Failed to perform action. Please try again.');
    }
  };

  const performSwipeAction = async (direction: SwipeDirection, photo: Photo, swipeAction: AlbumAction) => {
    let result: PhotoOperationResult | null = null;

    switch (swipeAction.type) {
      case 'move':
        if (swipeAction.albumId) {
          result = await movePhoto(photo.id, swipeAction.albumId);
        }
        break;
      case 'copy':
        if (swipeAction.albumId) {
          result = await copyPhoto(photo.id, swipeAction.albumId);
        }
        break;
      case 'delete':
        result = await deletePhoto(photo.id);
        break;
    }

    if (result && result.success) {
      setLastOperationId(result.photoId || Date.now().toString());
      setLastSwipeAction(direction);
      setShowUndoBar(true);
    }
  };

  const handleUndo = async () => {
    if (lastOperationId) {
      try {
        await undoLastOperation(lastOperationId);
        setShowUndoBar(false);
        setLastSwipeAction(null);
        setLastOperationId(null);
      } catch (error) {
        console.error('Undo failed:', error);
        Alert.alert('Error', 'Failed to undo action');
      }
    }
  };

  const handleUndoTimeout = () => {
    setShowUndoBar(false);
    setLastSwipeAction(null);
    setLastOperationId(null);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleToggleControls = () => {
    setShowControls(!showControls);
  };

  const handleConfirmSwipe = async () => {
    if (!pendingSwipe) return;
    
    setShowConfirmation(false);
    const { direction, photo, action } = pendingSwipe;
    setPendingSwipe(null);
    
    await performSwipeAction(direction, photo, action);
  };

  const handleCancelSwipe = () => {
    setShowConfirmation(false);
    setPendingSwipe(null);
  };

  const processBatchOperations = async (operations: BatchOperation[]) => {
    setBatchOperations(operations);
    setCurrentBatchIndex(0);
    setCompletedBatchOps(0);
    setFailedBatchOps(0);
    setShowBatchProgress(true);
    batchCancelledRef.current = false;

    for (let i = 0; i < operations.length; i++) {
      if (batchCancelledRef.current) {
        // Mark remaining operations as cancelled
        setBatchOperations(prev => prev.map((op, index) => 
          index >= i ? { ...op, status: 'cancelled' } : op
        ));
        break;
      }

      setCurrentBatchIndex(i);
      const operation = operations[i];
      
      // Update operation status to processing
      setBatchOperations(prev => prev.map((op, index) => 
        index === i ? { ...op, status: 'processing' } : op
      ));

      try {
        let result: PhotoOperationResult | null = null;

        switch (operation.type) {
          case 'move':
            if (operation.targetAlbumId) {
              result = await movePhoto(operation.photoId, operation.targetAlbumId);
            }
            break;
          case 'copy':
            if (operation.targetAlbumId) {
              result = await copyPhoto(operation.photoId, operation.targetAlbumId);
            }
            break;
          case 'delete':
            result = await deletePhoto(operation.photoId);
            break;
        }

        if (result?.success) {
          setBatchOperations(prev => prev.map((op, index) => 
            index === i ? { ...op, status: 'completed' } : op
          ));
          setCompletedBatchOps(prev => prev + 1);
        } else {
          setBatchOperations(prev => prev.map((op, index) => 
            index === i ? { 
              ...op, 
              status: 'failed', 
              error: result?.error?.message || 'Operation failed' 
            } : op
          ));
          setFailedBatchOps(prev => prev + 1);
        }
      } catch (error) {
        setBatchOperations(prev => prev.map((op, index) => 
          index === i ? { 
            ...op, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } : op
        ));
        setFailedBatchOps(prev => prev + 1);
      }

      // Small delay between operations to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setCurrentBatchIndex(operations.length);
  };

  const handleCancelBatch = () => {
    batchCancelledRef.current = true;
    setShowBatchProgress(false);
  };

  const handleCompleteBatch = () => {
    setShowBatchProgress(false);
    setBatchOperations([]);
  };

  const handleRetryFailedBatch = async () => {
    const failedOps = batchOperations.filter(op => op.status === 'failed');
    if (failedOps.length > 0) {
      const retryOps = failedOps.map(op => ({ ...op, status: 'pending' as const }));
      await processBatchOperations(retryOps);
    }
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
      
      <SwipeUndoBar
        visible={showUndoBar}
        swipeAction={lastSwipeAction}
        photoName={photos[currentIndex]?.filename || 'Unknown'}
        onUndo={handleUndo}
        onTimeout={handleUndoTimeout}
        timeout={settings.undoTimeout}
      />

      <SwipeConfirmationBottomSheet
        visible={showConfirmation}
        photo={pendingSwipe?.photo || null}
        swipeDirection={pendingSwipe?.direction || null}
        swipeAction={pendingSwipe?.action || null}
        onConfirm={handleConfirmSwipe}
        onCancel={handleCancelSwipe}
        hapticFeedbackEnabled={settings.hapticFeedback}
      />

      <BatchOperationProgress
        visible={showBatchProgress}
        operations={batchOperations}
        currentOperationIndex={currentBatchIndex}
        totalOperations={batchOperations.length}
        completedOperations={completedBatchOps}
        failedOperations={failedBatchOps}
        onCancel={handleCancelBatch}
        onComplete={handleCompleteBatch}
        onRetryFailed={handleRetryFailedBatch}
        hapticFeedbackEnabled={settings.hapticFeedback}
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