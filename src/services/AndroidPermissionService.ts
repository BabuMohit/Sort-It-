import * as MediaLibrary from 'expo-media-library';
import * as Permissions from 'expo-permissions';
import { Linking, Alert, Platform } from 'react-native';
import { AndroidPermissionService, PermissionStatus, MobileAppError, MobileErrorType } from '../types';

/**
 * Android Permission Service Implementation
 * Handles all permission-related operations for Android MediaStore and storage access
 * Following Android best practices for runtime permissions
 */
export class AndroidPermissionServiceImpl implements AndroidPermissionService {
  private permissionCache: Map<string, PermissionStatus> = new Map();
  private rationaleShown: Set<string> = new Set();

  /**
   * Request media library permissions for accessing photos and videos
   * Includes both read and write permissions for MediaStore
   */
  async requestMediaLibraryPermissions(): Promise<boolean> {
    try {
      // Check if we should show rationale first
      const shouldShowRationale = await this.shouldShowPermissionRationale('mediaLibrary');
      
      if (shouldShowRationale && !this.rationaleShown.has('mediaLibrary')) {
        await this.showPermissionRationale(
          'Media Library Access',
          'Sort It! needs access to your photos and videos to organize them into albums. This allows you to view, move, and manage your media files.',
          'mediaLibrary'
        );
      }

      // Request the actual permission
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      
      const permissionStatus: PermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined'
      };

      // Cache the result
      this.permissionCache.set('mediaLibrary', permissionStatus);

      if (!permissionStatus.granted && !canAskAgain) {
        // Permission permanently denied, show settings dialog
        await this.showSettingsDialog(
          'Permission Required',
          'Media library access is required for Sort It! to function. Please enable it in Settings.'
        );
      }

      return permissionStatus.granted;
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      throw this.createPermissionError(
        'Failed to request media library permissions',
        error,
        'MEDIA_LIBRARY_REQUEST_FAILED'
      );
    }
  }

  /**
   * Request storage permissions for file system operations
   * Handles both legacy and scoped storage permissions
   */
  async requestStoragePermissions(): Promise<boolean> {
    try {
      // For Android 10+ (API 29+), we primarily use MediaStore
      // For older versions, we need explicit storage permissions
      if (Platform.OS !== 'android') {
        return true; // Not applicable for non-Android platforms
      }

      const shouldShowRationale = await this.shouldShowPermissionRationale('storage');
      
      if (shouldShowRationale && !this.rationaleShown.has('storage')) {
        await this.showPermissionRationale(
          'Storage Access',
          'Sort It! needs storage access to create albums and organize your photos efficiently. This ensures your photo organization is saved properly.',
          'storage'
        );
      }

      // Request storage permissions using Expo Permissions
      const { status, canAskAgain } = await Permissions.askAsync(Permissions.MEDIA_LIBRARY);
      
      const permissionStatus: PermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined'
      };

      this.permissionCache.set('storage', permissionStatus);

      if (!permissionStatus.granted && !canAskAgain) {
        await this.showSettingsDialog(
          'Storage Permission Required',
          'Storage access is required to organize your photos. Please enable it in Settings.'
        );
      }

      return permissionStatus.granted;
    } catch (error) {
      console.error('Error requesting storage permissions:', error);
      throw this.createPermissionError(
        'Failed to request storage permissions',
        error,
        'STORAGE_REQUEST_FAILED'
      );
    }
  }

  /**
   * Check current permission status without requesting
   * Returns cached status if available, otherwise checks system
   */
  async checkPermissionStatus(): Promise<PermissionStatus> {
    try {
      // Check media library permission status
      const mediaLibraryStatus = await MediaLibrary.getPermissionsAsync();
      
      const permissionStatus: PermissionStatus = {
        granted: mediaLibraryStatus.status === 'granted',
        canAskAgain: mediaLibraryStatus.canAskAgain,
        status: mediaLibraryStatus.status as 'granted' | 'denied' | 'undetermined'
      };

      // Update cache
      this.permissionCache.set('mediaLibrary', permissionStatus);

      return permissionStatus;
    } catch (error) {
      console.error('Error checking permission status:', error);
      throw this.createPermissionError(
        'Failed to check permission status',
        error,
        'PERMISSION_CHECK_FAILED'
      );
    }
  }

  /**
   * Open device settings for the app
   * Allows users to manually grant permissions
   */
  async openAppSettings(): Promise<void> {
    try {
      const canOpen = await Linking.canOpenURL('app-settings:');
      if (canOpen) {
        await Linking.openURL('app-settings:');
      } else {
        // Fallback to general settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening app settings:', error);
      throw this.createPermissionError(
        'Failed to open app settings',
        error,
        'SETTINGS_OPEN_FAILED'
      );
    }
  }

  /**
   * Check if we should show permission rationale
   * Based on Android best practices for permission requests
   */
  async shouldShowPermissionRationale(permission: string): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      // Check if permission was previously denied
      const cachedStatus = this.permissionCache.get(permission);
      if (cachedStatus && cachedStatus.status === 'denied' && cachedStatus.canAskAgain) {
        return true;
      }

      // For media library, check if we should show rationale
      if (permission === 'mediaLibrary') {
        const status = await MediaLibrary.getPermissionsAsync();
        return status.status === 'denied' && status.canAskAgain;
      }

      return false;
    } catch (error) {
      console.error('Error checking permission rationale:', error);
      return false;
    }
  }

  /**
   * Show permission rationale dialog with clear explanation
   * Follows Material Design guidelines for permission requests
   */
  private async showPermissionRationale(
    title: string,
    message: string,
    permissionType: string
  ): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              this.rationaleShown.add(permissionType);
              resolve();
            }
          },
          {
            text: 'Continue',
            style: 'default',
            onPress: () => {
              this.rationaleShown.add(permissionType);
              resolve();
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Show settings dialog when permission is permanently denied
   * Provides clear path to enable permissions manually
   */
  private async showSettingsDialog(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve()
          },
          {
            text: 'Open Settings',
            style: 'default',
            onPress: async () => {
              try {
                await this.openAppSettings();
              } catch (error) {
                console.error('Error opening settings from dialog:', error);
              }
              resolve();
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Create standardized permission error
   */
  private createPermissionError(
    message: string,
    originalError: any,
    code: string
  ): MobileAppError {
    return {
      type: MobileErrorType.PERMISSION_DENIED,
      message,
      details: {
        originalError,
        code,
        platform: Platform.OS,
        timestamp: Date.now()
      },
      recoverable: true,
      userAction: 'Please grant the required permissions in Settings',
      androidErrorCode: originalError?.code || -1
    };
  }

  /**
   * Clear permission cache (useful for testing or reset scenarios)
   */
  clearPermissionCache(): void {
    this.permissionCache.clear();
    this.rationaleShown.clear();
  }

  /**
   * Get all cached permission statuses
   */
  getCachedPermissions(): Map<string, PermissionStatus> {
    return new Map(this.permissionCache);
  }

  /**
   * Check if all required permissions are granted
   */
  async areAllPermissionsGranted(): Promise<boolean> {
    try {
      const mediaLibraryGranted = await this.requestMediaLibraryPermissions();
      const storageGranted = await this.requestStoragePermissions();
      
      return mediaLibraryGranted && storageGranted;
    } catch (error) {
      console.error('Error checking all permissions:', error);
      return false;
    }
  }

  /**
   * Request all required permissions in sequence
   * Returns true only if all permissions are granted
   */
  async requestAllPermissions(): Promise<boolean> {
    try {
      const results = await Promise.allSettled([
        this.requestMediaLibraryPermissions(),
        this.requestStoragePermissions()
      ]);

      const allGranted = results.every(
        result => result.status === 'fulfilled' && result.value === true
      );

      return allGranted;
    } catch (error) {
      console.error('Error requesting all permissions:', error);
      return false;
    }
  }
}

// Export singleton instance
export const androidPermissionService = new AndroidPermissionServiceImpl();