import { useState, useCallback } from 'react';
import { androidPhotoFileOperations } from '../services';
import { PhotoOperationResult } from '../types';

interface PhotoOperationsState {
  loading: boolean;
  error: string | null;
  lastOperation: PhotoOperationResult | null;
}

export const usePhotoOperations = () => {
  const [state, setState] = useState<PhotoOperationsState>({
    loading: false,
    error: null,
    lastOperation: null,
  });

  const movePhoto = useCallback(async (photoId: string, targetAlbumId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await androidPhotoFileOperations.movePhotoAndroid(photoId, targetAlbumId);
      setState({
        loading: false,
        error: result.success ? null : result.error?.message || 'Move failed',
        lastOperation: result,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Move operation failed';
      setState({
        loading: false,
        error: errorMessage,
        lastOperation: null,
      });
      throw error;
    }
  }, []);

  const copyPhoto = useCallback(async (photoId: string, targetAlbumId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await androidPhotoFileOperations.copyPhotoAndroid(photoId, targetAlbumId);
      setState({
        loading: false,
        error: result.success ? null : result.error?.message || 'Copy failed',
        lastOperation: result,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Copy operation failed';
      setState({
        loading: false,
        error: errorMessage,
        lastOperation: null,
      });
      throw error;
    }
  }, []);

  const deletePhoto = useCallback(async (photoId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await androidPhotoFileOperations.deletePhotoAndroid(photoId);
      setState({
        loading: false,
        error: result.success ? null : result.error?.message || 'Delete failed',
        lastOperation: result,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete operation failed';
      setState({
        loading: false,
        error: errorMessage,
        lastOperation: null,
      });
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const undoLastOperation = useCallback(async () => {
    if (!state.lastOperation || !state.lastOperation.success) {
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { lastOperation } = state;
      let result: PhotoOperationResult;

      switch (lastOperation.operation) {
        case 'move':
          // Move back to original location
          result = await androidPhotoFileOperations.movePhotoAndroid(
            lastOperation.photoId,
            lastOperation.originalAlbumId || 'camera'
          );
          break;
        case 'copy':
          // Delete the copied photo
          result = await androidPhotoFileOperations.deletePhotoAndroid(lastOperation.photoId);
          break;
        case 'delete':
          // Cannot undo delete - would need to restore from trash
          result = {
            success: false,
            operation: 'undo',
            photoId: lastOperation.photoId,
            error: { 
              type: 'OPERATION_FAILED' as any,
              message: 'Cannot undo delete operation', 
              code: 'UNDO_DELETE_UNSUPPORTED',
              recoverable: false
            }
          };
          break;
        default:
          result = {
            success: false,
            operation: 'undo',
            photoId: lastOperation.photoId,
            error: { 
              type: 'OPERATION_FAILED' as any,
              message: 'Unknown operation type', 
              code: 'UNKNOWN_OPERATION',
              recoverable: false
            }
          };
      }

      setState({
        loading: false,
        error: result.success ? null : result.error?.message || 'Undo failed',
        lastOperation: null, // Clear the last operation after undo attempt
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Undo operation failed';
      setState({
        loading: false,
        error: errorMessage,
        lastOperation: null,
      });
      throw error;
    }
  }, [state.lastOperation]);

  return {
    ...state,
    movePhoto,
    copyPhoto,
    deletePhoto,
    clearError,
    undoLastOperation,
  };
};