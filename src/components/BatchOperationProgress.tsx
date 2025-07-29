import React, { useEffect, useRef, useState } from 'react';
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
import { materialColors } from '../theme/materialDesign';

const { width: screenWidth } = Dimensions.get('window');

export interface BatchOperation {
  id: string;
  type: 'move' | 'copy' | 'delete';
  photoId: string;
  photoName: string;
  targetAlbumId?: string;
  targetAlbumName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

interface BatchOperationProgressProps {
  visible: boolean;
  operations: BatchOperation[];
  currentOperationIndex: number;
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  onCancel: () => void;
  onComplete: () => void;
  onRetryFailed?: () => void;
  hapticFeedbackEnabled?: boolean;
}

export const BatchOperationProgress: React.FC<BatchOperationProgressProps> = ({
  visible,
  operations,
  currentOperationIndex,
  totalOperations,
  completedOperations,
  failedOperations,
  onCancel,
  onComplete,
  onRetryFailed,
  hapticFeedbackEnabled = true,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [showDetails, setShowDetails] = useState(false);

  const isCompleted = currentOperationIndex >= totalOperations;
  const isProcessing = currentOperationIndex < totalOperations && visible;
  const progress = totalOperations > 0 ? completedOperations / totalOperations : 0;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Handle Android back button during processing
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isProcessing) {
          // Prevent back during processing, show cancel confirmation
          handleCancelPress();
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    } else {
      // Hide animation
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible, isProcessing]);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

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

  const handleCancelPress = () => {
    if (isCompleted) {
      triggerHaptic('light');
      onComplete();
      return;
    }

    triggerHaptic('medium');
    // Show confirmation for cancelling ongoing operations
    if (isProcessing) {
      // For now, directly cancel - in a real app you might want a confirmation dialog
      onCancel();
    }
  };

  const handleRetryFailed = () => {
    if (onRetryFailed) {
      triggerHaptic('medium');
      onRetryFailed();
    }
  };

  const handleToggleDetails = () => {
    triggerHaptic('light');
    setShowDetails(!showDetails);
  };

  const getCurrentOperation = () => {
    return operations[currentOperationIndex] || null;
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'move': return '📁';
      case 'copy': return '📋';
      case 'delete': return '🗑️';
      default: return '📷';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'processing': return '⏳';
      case 'cancelled': return '⏹️';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return materialColors.green[500];
      case 'failed': return materialColors.red[500];
      case 'processing': return materialColors.blue[500];
      case 'cancelled': return materialColors.orange[500];
      default: return materialColors.grey[500];
    }
  };

  const renderOperationItem = (operation: BatchOperation, index: number) => (
    <View key={operation.id} style={styles.operationItem}>
      <Text style={styles.operationIcon}>{getOperationIcon(operation.type)}</Text>
      <View style={styles.operationDetails}>
        <Text style={styles.operationName} numberOfLines={1}>
          {operation.photoName}
        </Text>
        <Text style={styles.operationDescription}>
          {operation.type === 'delete' 
            ? 'Delete photo'
            : `${operation.type} to ${operation.targetAlbumName || 'album'}`
          }
        </Text>
      </View>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(operation.status) }]}>
        <Text style={styles.statusIcon}>{getStatusIcon(operation.status)}</Text>
      </View>
    </View>
  );

  if (!visible) {
    return null;
  }

  const currentOp = getCurrentOperation();

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
      <View style={styles.progressCard}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>
              {isCompleted ? 'Operations Complete' : 'Processing Photos'}
            </Text>
            <Text style={styles.subtitle}>
              {isCompleted 
                ? `${completedOperations} completed, ${failedOperations} failed`
                : `${completedOperations} of ${totalOperations} completed`
              }
            </Text>
          </View>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={handleToggleDetails}
          >
            <Text style={styles.toggleIcon}>
              {showDetails ? '▼' : '▲'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: failedOperations > 0 
                    ? materialColors.orange[500] 
                    : materialColors.blue[500],
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        {/* Current Operation */}
        {isProcessing && currentOp && (
          <View style={styles.currentOperation}>
            <Text style={styles.currentOperationIcon}>
              {getOperationIcon(currentOp.type)}
            </Text>
            <View style={styles.currentOperationDetails}>
              <Text style={styles.currentOperationName} numberOfLines={1}>
                {currentOp.photoName}
              </Text>
              <Text style={styles.currentOperationDescription}>
                {currentOp.type === 'delete' 
                  ? 'Deleting photo...'
                  : `${currentOp.type === 'move' ? 'Moving' : 'Copying'} to ${currentOp.targetAlbumName || 'album'}...`
                }
              </Text>
            </View>
            <View style={styles.processingIndicator}>
              <Text style={styles.processingIcon}>⏳</Text>
            </View>
          </View>
        )}

        {/* Details List */}
        {showDetails && (
          <View style={styles.detailsList}>
            <Text style={styles.detailsTitle}>Operation Details</Text>
            <View style={styles.operationsList}>
              {operations.slice(0, 10).map(renderOperationItem)}
              {operations.length > 10 && (
                <Text style={styles.moreOperationsText}>
                  ... and {operations.length - 10} more operations
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isCompleted ? (
            <>
              {failedOperations > 0 && onRetryFailed && (
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={handleRetryFailed}
                >
                  <Text style={styles.retryButtonText}>Retry Failed</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.doneButton]}
                onPress={handleCancelPress}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancelPress}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
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
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 12,
    color: '#666666',
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    minWidth: 40,
    textAlign: 'right',
  },
  currentOperation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  currentOperationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  currentOperationDetails: {
    flex: 1,
  },
  currentOperationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  currentOperationDescription: {
    fontSize: 14,
    color: '#666666',
  },
  processingIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIcon: {
    fontSize: 16,
  },
  detailsList: {
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  operationsList: {
    maxHeight: 200,
  },
  operationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  operationIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  operationDetails: {
    flex: 1,
  },
  operationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  operationDescription: {
    fontSize: 12,
    color: '#666666',
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 10,
  },
  moreOperationsText: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: materialColors.red[50],
    borderWidth: 1,
    borderColor: materialColors.red[200],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: materialColors.red[600],
  },
  retryButton: {
    backgroundColor: materialColors.orange[50],
    borderWidth: 1,
    borderColor: materialColors.orange[200],
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: materialColors.orange[600],
  },
  doneButton: {
    backgroundColor: materialColors.green[500],
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});