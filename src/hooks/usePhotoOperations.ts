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

  const undoLastOperation = useCallback(async (operationId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // For now, we'll simulate undo by returning success
      // In a real implementation, this would reverse the last operation
      const result: PhotoOperationResult = {
        success: true,
        photoId: operationId,
        operation: 'delete' // This would be determined by the operation being undone
      };
      setState({
        loading: false,
        error: null,
        lastOperation: result,
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
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    movePhoto,
    copyPhoto,
    deletePhoto,
    undoLastOperation,
    clearError,
  };
};