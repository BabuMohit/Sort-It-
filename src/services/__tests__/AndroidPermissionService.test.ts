/**
 * Unit tests for AndroidPermissionService
 * Tests the permission handling logic for Android MediaStore access
 */

// Mock the dependencies
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn()
}));

jest.mock('expo-permissions', () => ({
  askAsync: jest.fn(),
  MEDIA_LIBRARY: 'mediaLibrary'
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
    openSettings: jest.fn()
  },
  Platform: {
    OS: 'android'
  }
}));

import { AndroidPermissionServiceImpl } from '../AndroidPermissionService';
import { MobileErrorType } from '../../types';
import * as MediaLibrary from 'expo-media-library';
import * as Permissions from 'expo-permissions';
import { Alert, Linking, Platform } from 'react-native';

const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;
const mockPermissions = Permissions as jest.Mocked<typeof Permissions>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;
const mockLinking = Linking as jest.Mocked<typeof Linking>;

describe('AndroidPermissionService', () => {
  let service: AndroidPermissionServiceImpl;

  beforeEach(() => {
    service = new AndroidPermissionServiceImpl();
    jest.clearAllMocks();
    
    // Reset Platform.OS to android for each test
    (Platform as any).OS = 'android';
  });

  describe('requestMediaLibraryPermissions', () => {
    it('should request media library permissions successfully', async () => {
      // Mock successful permission request
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      const result = await service.requestMediaLibraryPermissions();

      expect(result).toBe(true);
      expect(mockMediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle permission denial with ability to ask again', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'denied' as any as any,
        canAskAgain: true,
        granted: false,
        expires: 'never'
      });

      const result = await service.requestMediaLibraryPermissions();

      expect(result).toBe(false);
      expect(mockMediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should show settings dialog when permission is permanently denied', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'denied' as any as any,
        canAskAgain: false,
        granted: false,
        expires: 'never'
      });

      // Mock Alert.alert to simulate user interaction
      mockAlert.alert.mockImplementation((_title, _message, buttons) => {
        // Simulate user pressing "Open Settings"
        if (buttons && buttons[1]) {
          buttons[1].onPress?.();
        }
      });

      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockResolvedValue(undefined);

      const result = await service.requestMediaLibraryPermissions();

      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalled();
    });

    it('should show rationale dialog when appropriate', async () => {
      // First call - permission denied but can ask again
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'denied' as any as any,
        canAskAgain: true,
        granted: false,
        expires: 'never'
      });

      // Second call - user grants permission
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      // Mock Alert.alert for rationale
      mockAlert.alert.mockImplementation((_title, _message, buttons) => {
        if (buttons && buttons[1]) {
          buttons[1].onPress?.();
        }
      });

      const result = await service.requestMediaLibraryPermissions();

      expect(result).toBe(true);
      expect(mockAlert.alert).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Permission request failed');
      mockMediaLibrary.requestPermissionsAsync.mockRejectedValue(error);

      await expect(service.requestMediaLibraryPermissions()).rejects.toMatchObject({
        type: MobileErrorType.PERMISSION_DENIED,
        message: 'Failed to request media library permissions',
        recoverable: true
      });
    });
  });

  describe('requestStoragePermissions', () => {
    it('should request storage permissions successfully', async () => {
      mockPermissions.askAsync.mockResolvedValue({
        status: 'granted' as any as any,
        canAskAgain: true,
        granted: true,
        expires: 'never',
        permissions: {}
      });

      const result = await service.requestStoragePermissions();

      expect(result).toBe(true);
      expect(mockPermissions.askAsync).toHaveBeenCalledWith(Permissions.MEDIA_LIBRARY);
    });

    it('should return true for non-Android platforms', async () => {
      (Platform as any).OS = 'ios';

      const result = await service.requestStoragePermissions();

      expect(result).toBe(true);
      expect(mockPermissions.askAsync).not.toHaveBeenCalled();
    });

    it('should handle storage permission denial', async () => {
      mockPermissions.askAsync.mockResolvedValue({
        status: 'denied' as any as any,
        canAskAgain: false,
        granted: false,
        expires: 'never',
        permissions: {}
      });

      mockAlert.alert.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[0]) {
          buttons[0].onPress?.();
        }
      });

      const result = await service.requestStoragePermissions();

      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalled();
    });
  });

  describe('checkPermissionStatus', () => {
    it('should check permission status without requesting', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      const status = await service.checkPermissionStatus();

      expect(status).toEqual({
        granted: true,
        canAskAgain: true,
        status: 'granted' as any
      });
      expect(mockMediaLibrary.getPermissionsAsync).toHaveBeenCalled();
      expect(mockMediaLibrary.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should handle errors when checking status', async () => {
      const error = new Error('Status check failed');
      mockMediaLibrary.getPermissionsAsync.mockRejectedValue(error);

      await expect(service.checkPermissionStatus()).rejects.toMatchObject({
        type: MobileErrorType.PERMISSION_DENIED,
        message: 'Failed to check permission status'
      });
    });
  });

  describe('openAppSettings', () => {
    it('should open app settings when available', async () => {
      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockResolvedValue(true);

      await service.openAppSettings();

      expect(mockLinking.canOpenURL).toHaveBeenCalledWith('app-settings:');
      expect(mockLinking.openURL).toHaveBeenCalledWith('app-settings:');
    });

    it('should fallback to general settings when app settings unavailable', async () => {
      mockLinking.canOpenURL.mockResolvedValue(false);
      mockLinking.openSettings.mockResolvedValue();

      await service.openAppSettings();

      expect(mockLinking.canOpenURL).toHaveBeenCalledWith('app-settings:');
      expect(mockLinking.openSettings).toHaveBeenCalled();
    });

    it('should handle errors when opening settings', async () => {
      const error = new Error('Cannot open settings');
      mockLinking.canOpenURL.mockRejectedValue(error);

      await expect(service.openAppSettings()).rejects.toMatchObject({
        type: MobileErrorType.PERMISSION_DENIED,
        message: 'Failed to open app settings'
      });
    });
  });

  describe('shouldShowPermissionRationale', () => {
    it('should return false for non-Android platforms', async () => {
      (Platform as any).OS = 'ios';

      const result = await service.shouldShowPermissionRationale('mediaLibrary');

      expect(result).toBe(false);
    });

    it('should return true when permission was denied but can ask again', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'denied' as any as any,
        canAskAgain: true,
        granted: false,
        expires: 'never'
      });

      const result = await service.shouldShowPermissionRationale('mediaLibrary');

      expect(result).toBe(true);
    });

    it('should return false when permission is granted', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      const result = await service.shouldShowPermissionRationale('mediaLibrary');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockMediaLibrary.getPermissionsAsync.mockRejectedValue(new Error('Check failed'));

      const result = await service.shouldShowPermissionRationale('mediaLibrary');

      expect(result).toBe(false);
    });
  });

  describe('areAllPermissionsGranted', () => {
    it('should return true when all permissions are granted', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      mockPermissions.askAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never', permissions: {}
      });

      const result = await service.areAllPermissionsGranted();

      expect(result).toBe(true);
    });

    it('should return false when any permission is denied', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      mockPermissions.askAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: true,
        granted: false,
        expires: 'never', permissions: {}
      });

      const result = await service.areAllPermissionsGranted();

      expect(result).toBe(false);
    });
  });

  describe('requestAllPermissions', () => {
    it('should request all permissions and return true if all granted', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      mockPermissions.askAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never', permissions: {}
      });

      const result = await service.requestAllPermissions();

      expect(result).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      mockPermissions.askAsync.mockRejectedValue(new Error('Storage permission failed'));

      const result = await service.requestAllPermissions();

      expect(result).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should cache permission results', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      await service.checkPermissionStatus();
      const cachedPermissions = service.getCachedPermissions();

      expect(cachedPermissions.has('mediaLibrary')).toBe(true);
      expect(cachedPermissions.get('mediaLibrary')).toEqual({
        granted: true,
        canAskAgain: true,
        status: 'granted' as any
      });
    });

    it('should clear cache when requested', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      await service.checkPermissionStatus();
      expect(service.getCachedPermissions().size).toBeGreaterThan(0);

      service.clearPermissionCache();
      expect(service.getCachedPermissions().size).toBe(0);
    });
  });
});