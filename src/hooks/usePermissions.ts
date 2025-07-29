import { useState, useEffect, useCallback } from 'react';
import { androidPermissionService } from '../services';

interface PermissionState {
  granted: boolean;
  loading: boolean;
  error: string | null;
}

export const usePermissions = () => {
  const [permissionState, setPermissionState] = useState<PermissionState>({
    granted: false,
    loading: true,
    error: null,
  });

  const checkPermissions = useCallback(async () => {
    try {
      setPermissionState(prev => ({ ...prev, loading: true, error: null }));
      const status = await androidPermissionService.checkPermissionStatus();
      setPermissionState({
        granted: status.granted,
        loading: false,
        error: null,
      });
      return status.granted;
    } catch (error) {
      setPermissionState({
        granted: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Permission check failed',
      });
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      setPermissionState(prev => ({ ...prev, loading: true, error: null }));
      const granted = await androidPermissionService.requestAllPermissions();
      setPermissionState({
        granted,
        loading: false,
        error: null,
      });
      return granted;
    } catch (error) {
      setPermissionState({
        granted: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Permission request failed',
      });
      return false;
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    ...permissionState,
    checkPermissions,
    requestPermissions,
  };
};