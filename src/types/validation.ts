// Validation functions for mobile data models

import {
  Photo,
  Album,
  SwipeConfiguration,
  GestureConfig,
  MobileAppState,
  DeviceInfo,
  MobilePermissions,
  PhotoMetadata,
  ExifData,
  StorageInfo,
  AlbumAction,
  SwipeDirection,
  MobileAppError,
  MobileErrorType
} from './index';

// Photo validation functions
export function validatePhoto(photo: any): photo is Photo {
  if (!photo || typeof photo !== 'object') {
    return false;
  }

  const requiredFields = [
    'id', 'uri', 'filename', 'width', 'height', 
    'creationTime', 'modificationTime', 'mediaType',
    'thumbnailUri', 'size', 'mimeType', 'orientation',
    'isFromCamera', 'androidMediaStoreId'
  ];

  for (const field of requiredFields) {
    if (!(field in photo)) {
      return false;
    }
  }

  // Type validations
  if (typeof photo.id !== 'string' || photo.id.length === 0) return false;
  if (typeof photo.uri !== 'string' || photo.uri.length === 0) return false;
  if (typeof photo.filename !== 'string' || photo.filename.length === 0) return false;
  if (typeof photo.width !== 'number' || photo.width <= 0) return false;
  if (typeof photo.height !== 'number' || photo.height <= 0) return false;
  if (typeof photo.creationTime !== 'number' || photo.creationTime < 0) return false;
  if (typeof photo.modificationTime !== 'number' || photo.modificationTime < 0) return false;
  if (!['photo', 'video'].includes(photo.mediaType)) return false;
  if (typeof photo.size !== 'number' || photo.size < 0) return false;
  if (typeof photo.orientation !== 'number') return false;
  if (typeof photo.isFromCamera !== 'boolean') return false;
  if (typeof photo.androidMediaStoreId !== 'string') return false;

  // Optional fields validation
  if (photo.albumId && typeof photo.albumId !== 'string') return false;
  if (photo.location && !validateLocation(photo.location)) return false;
  if (photo.metadata && !validatePhotoMetadata(photo.metadata)) return false;
  if (photo.exifData && !validateExifData(photo.exifData)) return false;

  return true;
}

export function validatePhotoMetadata(metadata: any): metadata is PhotoMetadata {
  if (!metadata || typeof metadata !== 'object') return false;
  
  if (typeof metadata.dateAdded !== 'number' || metadata.dateAdded < 0) return false;
  if (typeof metadata.dateModified !== 'number' || metadata.dateModified < 0) return false;
  if (typeof metadata.displayName !== 'string' || metadata.displayName.length === 0) return false;
  
  // Optional fields
  if (metadata.dateTaken && (typeof metadata.dateTaken !== 'number' || metadata.dateTaken < 0)) return false;
  if (metadata.duration && (typeof metadata.duration !== 'number' || metadata.duration < 0)) return false;
  
  return true;
}

export function validateExifData(exifData: any): exifData is ExifData {
  if (!exifData || typeof exifData !== 'object') return false;
  
  // All EXIF fields are optional, but if present, must be correct type
  if (exifData.iso && (typeof exifData.iso !== 'number' || exifData.iso < 0)) return false;
  if (exifData.gpsLatitude && typeof exifData.gpsLatitude !== 'number') return false;
  if (exifData.gpsLongitude && typeof exifData.gpsLongitude !== 'number') return false;
  if (exifData.gpsAltitude && typeof exifData.gpsAltitude !== 'number') return false;
  
  return true;
}

function validateLocation(location: any): boolean {
  if (!location || typeof location !== 'object') return false;
  if (typeof location.latitude !== 'number') return false;
  if (typeof location.longitude !== 'number') return false;
  if (location.latitude < -90 || location.latitude > 90) return false;
  if (location.longitude < -180 || location.longitude > 180) return false;
  return true;
}

// Album validation functions
export function validateAlbum(album: any): album is Album {
  if (!album || typeof album !== 'object') return false;

  const requiredFields = [
    'id', 'title', 'assetCount', 'type', 'isDefault',
    'createdAt', 'updatedAt', 'storagePath', 'isOnSdCard',
    'storageUsage', 'storageInfo', 'permissions', 'syncStatus'
  ];

  for (const field of requiredFields) {
    if (!(field in album)) return false;
  }

  if (typeof album.id !== 'string' || album.id.length === 0) return false;
  if (typeof album.title !== 'string' || album.title.length === 0) return false;
  if (typeof album.assetCount !== 'number' || album.assetCount < 0) return false;
  if (!['user', 'system', 'android_default'].includes(album.type)) return false;
  if (typeof album.isDefault !== 'boolean') return false;
  if (typeof album.createdAt !== 'number' || album.createdAt < 0) return false;
  if (typeof album.updatedAt !== 'number' || album.updatedAt < 0) return false;
  if (typeof album.storagePath !== 'string' || album.storagePath.length === 0) return false;
  if (typeof album.isOnSdCard !== 'boolean') return false;
  if (typeof album.storageUsage !== 'number' || album.storageUsage < 0) return false;

  if (!validateStorageInfo(album.storageInfo)) return false;
  if (!validateAlbumPermissions(album.permissions)) return false;
  if (!validateAlbumSyncStatus(album.syncStatus)) return false;

  return true;
}

export function validateStorageInfo(storageInfo: any): storageInfo is StorageInfo {
  if (!storageInfo || typeof storageInfo !== 'object') return false;

  const requiredFields = [
    'totalSpace', 'availableSpace', 'usedSpace', 'photoStorageUsage',
    'cacheSize', 'isLowStorage', 'sdCardAvailable', 'storageType',
    'isRemovable', 'isEmulated'
  ];

  for (const field of requiredFields) {
    if (!(field in storageInfo)) return false;
  }

  if (typeof storageInfo.totalSpace !== 'number' || storageInfo.totalSpace < 0) return false;
  if (typeof storageInfo.availableSpace !== 'number' || storageInfo.availableSpace < 0) return false;
  if (typeof storageInfo.usedSpace !== 'number' || storageInfo.usedSpace < 0) return false;
  if (typeof storageInfo.photoStorageUsage !== 'number' || storageInfo.photoStorageUsage < 0) return false;
  if (typeof storageInfo.cacheSize !== 'number' || storageInfo.cacheSize < 0) return false;
  if (typeof storageInfo.isLowStorage !== 'boolean') return false;
  if (typeof storageInfo.sdCardAvailable !== 'boolean') return false;
  if (!['internal', 'external', 'sd_card'].includes(storageInfo.storageType)) return false;
  if (typeof storageInfo.isRemovable !== 'boolean') return false;
  if (typeof storageInfo.isEmulated !== 'boolean') return false;

  return true;
}

function validateAlbumPermissions(permissions: any): boolean {
  if (!permissions || typeof permissions !== 'object') return false;
  
  const requiredFields = ['canRead', 'canWrite', 'canDelete', 'canCreateSubfolders', 'requiresElevatedPermissions'];
  for (const field of requiredFields) {
    if (typeof permissions[field] !== 'boolean') return false;
  }
  
  return true;
}

function validateAlbumSyncStatus(syncStatus: any): boolean {
  if (!syncStatus || typeof syncStatus !== 'object') return false;
  
  if (typeof syncStatus.lastSyncTime !== 'number' || syncStatus.lastSyncTime < 0) return false;
  if (typeof syncStatus.isSyncing !== 'boolean') return false;
  if (!Array.isArray(syncStatus.syncErrors)) return false;
  if (typeof syncStatus.needsRescan !== 'boolean') return false;
  
  return true;
}

// Swipe configuration validation functions
export function validateSwipeConfiguration(config: any): config is SwipeConfiguration {
  if (!config || typeof config !== 'object') return false;

  const requiredFields = ['left', 'right', 'up', 'down', 'gestureSettings', 'isConfigured', 'lastModified', 'version'];
  for (const field of requiredFields) {
    if (!(field in config)) return false;
  }

  if (!validateAlbumAction(config.left)) return false;
  if (!validateAlbumAction(config.right)) return false;
  if (!validateAlbumAction(config.up)) return false;
  if (!validateAlbumAction(config.down)) return false;
  if (!validateGestureConfig(config.gestureSettings)) return false;
  if (typeof config.isConfigured !== 'boolean') return false;
  if (typeof config.lastModified !== 'number' || config.lastModified < 0) return false;
  if (typeof config.version !== 'number' || config.version < 1) return false;

  return true;
}

export function validateAlbumAction(action: any): action is AlbumAction {
  if (!action || typeof action !== 'object') return false;

  if (!['move', 'copy', 'delete'].includes(action.type)) return false;
  if (action.albumId && typeof action.albumId !== 'string') return false;
  if (action.albumName && typeof action.albumName !== 'string') return false;
  if (typeof action.confirmationRequired !== 'boolean') return false;
  if (typeof action.undoTimeout !== 'number' || action.undoTimeout < 0) return false;
  if (typeof action.hapticFeedback !== 'boolean') return false;

  return true;
}

export function validateGestureConfig(config: any): config is GestureConfig {
  if (!config || typeof config !== 'object') return false;

  const requiredFields = [
    'minimumSwipeDistance', 'minimumSwipeVelocity', 'hapticFeedbackEnabled',
    'animationDuration', 'touchSensitivity', 'gestureDeadZone',
    'simultaneousGesturesEnabled', 'longPressDelay', 'doubleTapDelay',
    'pinchToZoomEnabled', 'rotationGesturesEnabled', 'edgeSwipeEnabled',
    'conflictResolution'
  ];

  for (const field of requiredFields) {
    if (!(field in config)) return false;
  }

  if (typeof config.minimumSwipeDistance !== 'number' || config.minimumSwipeDistance < 0) return false;
  if (typeof config.minimumSwipeVelocity !== 'number' || config.minimumSwipeVelocity < 0) return false;
  if (typeof config.hapticFeedbackEnabled !== 'boolean') return false;
  if (typeof config.animationDuration !== 'number' || config.animationDuration < 0) return false;
  if (typeof config.touchSensitivity !== 'number' || config.touchSensitivity < 0) return false;
  if (typeof config.gestureDeadZone !== 'number' || config.gestureDeadZone < 0) return false;
  if (typeof config.simultaneousGesturesEnabled !== 'boolean') return false;
  if (typeof config.longPressDelay !== 'number' || config.longPressDelay < 0) return false;
  if (typeof config.doubleTapDelay !== 'number' || config.doubleTapDelay < 0) return false;
  if (typeof config.pinchToZoomEnabled !== 'boolean') return false;
  if (typeof config.rotationGesturesEnabled !== 'boolean') return false;
  if (typeof config.edgeSwipeEnabled !== 'boolean') return false;
  if (!['swipe', 'scroll', 'zoom'].includes(config.conflictResolution)) return false;

  return true;
}

// SwipeDirection validation
export function validateSwipeDirection(direction: any): direction is SwipeDirection {
  if (!direction || typeof direction !== 'object') return false;

  if (!['left', 'right', 'up', 'down'].includes(direction.type)) return false;
  if (!['move', 'copy', 'delete'].includes(direction.action)) return false;
  if (typeof direction.velocity !== 'number') return false;
  if (typeof direction.distance !== 'number' || direction.distance < 0) return false;
  if (typeof direction.timestamp !== 'number' || direction.timestamp < 0) return false;
  
  if (!direction.startPosition || typeof direction.startPosition !== 'object') return false;
  if (typeof direction.startPosition.x !== 'number' || typeof direction.startPosition.y !== 'number') return false;
  
  if (!direction.endPosition || typeof direction.endPosition !== 'object') return false;
  if (typeof direction.endPosition.x !== 'number' || typeof direction.endPosition.y !== 'number') return false;

  return true;
}

// Device info validation
export function validateDeviceInfo(deviceInfo: any): deviceInfo is DeviceInfo {
  if (!deviceInfo || typeof deviceInfo !== 'object') return false;

  const requiredFields = [
    'screenWidth', 'screenHeight', 'pixelDensity', 'androidVersion',
    'androidApiLevel', 'availableStorage', 'totalStorage', 'deviceModel',
    'deviceManufacturer', 'isTablet', 'hasNotch', 'safeAreaInsets',
    'supportedOrientations', 'hasHapticFeedback', 'isLowPowerMode',
    'networkType', 'storageInfo'
  ];

  for (const field of requiredFields) {
    if (!(field in deviceInfo)) return false;
  }

  if (typeof deviceInfo.screenWidth !== 'number' || deviceInfo.screenWidth <= 0) return false;
  if (typeof deviceInfo.screenHeight !== 'number' || deviceInfo.screenHeight <= 0) return false;
  if (typeof deviceInfo.pixelDensity !== 'number' || deviceInfo.pixelDensity <= 0) return false;
  if (typeof deviceInfo.androidVersion !== 'number' || deviceInfo.androidVersion < 5) return false;
  if (typeof deviceInfo.androidApiLevel !== 'number' || deviceInfo.androidApiLevel < 21) return false;
  if (typeof deviceInfo.availableStorage !== 'number' || deviceInfo.availableStorage < 0) return false;
  if (typeof deviceInfo.totalStorage !== 'number' || deviceInfo.totalStorage <= 0) return false;
  if (typeof deviceInfo.deviceModel !== 'string' || deviceInfo.deviceModel.length === 0) return false;
  if (typeof deviceInfo.deviceManufacturer !== 'string' || deviceInfo.deviceManufacturer.length === 0) return false;
  if (typeof deviceInfo.isTablet !== 'boolean') return false;
  if (typeof deviceInfo.hasNotch !== 'boolean') return false;
  if (typeof deviceInfo.hasHapticFeedback !== 'boolean') return false;
  if (typeof deviceInfo.isLowPowerMode !== 'boolean') return false;
  if (!['wifi', 'cellular', 'none'].includes(deviceInfo.networkType)) return false;

  if (!validateStorageInfo(deviceInfo.storageInfo)) return false;
  if (!validateSafeAreaInsets(deviceInfo.safeAreaInsets)) return false;
  if (!validateSupportedOrientations(deviceInfo.supportedOrientations)) return false;

  return true;
}

function validateSafeAreaInsets(insets: any): boolean {
  if (!insets || typeof insets !== 'object') return false;
  const requiredFields = ['top', 'bottom', 'left', 'right'];
  for (const field of requiredFields) {
    if (typeof insets[field] !== 'number' || insets[field] < 0) return false;
  }
  return true;
}

function validateSupportedOrientations(orientations: any): boolean {
  if (!Array.isArray(orientations) || orientations.length === 0) return false;
  return orientations.every(orientation => ['portrait', 'landscape'].includes(orientation));
}

// Mobile permissions validation
export function validateMobilePermissions(permissions: any): permissions is MobilePermissions {
  if (!permissions || typeof permissions !== 'object') return false;

  const requiredBooleanFields = [
    'mediaLibrary', 'storage', 'camera', 'location', 'notifications',
    'writeExternalStorage', 'readExternalStorage', 'manageExternalStorage',
    'accessMediaLocation'
  ];

  for (const field of requiredBooleanFields) {
    if (typeof permissions[field] !== 'boolean') return false;
  }

  if (typeof permissions.lastPermissionCheck !== 'number' || permissions.lastPermissionCheck < 0) return false;
  if (!permissions.permissionRationale || typeof permissions.permissionRationale !== 'object') return false;

  return true;
}

// Error validation
export function validateMobileAppError(error: any): error is MobileAppError {
  if (!error || typeof error !== 'object') return false;

  const validErrorTypes = Object.values(MobileErrorType);
  if (!validErrorTypes.includes(error.type)) return false;
  if (typeof error.message !== 'string' || error.message.length === 0) return false;
  if (typeof error.recoverable !== 'boolean') return false;

  if (error.userAction && typeof error.userAction !== 'string') return false;
  if (error.androidErrorCode && typeof error.androidErrorCode !== 'number') return false;

  return true;
}

// Utility functions for creating default/empty objects
export function createDefaultPhoto(): Partial<Photo> {
  return {
    mediaType: 'photo',
    orientation: 0,
    isFromCamera: false,
    size: 0,
    creationTime: Date.now(),
    modificationTime: Date.now()
  };
}

export function createDefaultAlbum(): Partial<Album> {
  return {
    assetCount: 0,
    type: 'user',
    isDefault: false,
    isOnSdCard: false,
    storageUsage: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function createDefaultSwipeConfiguration(): SwipeConfiguration {
  return {
    left: {
      type: 'move',
      confirmationRequired: false,
      undoTimeout: 5000,
      hapticFeedback: true
    },
    right: {
      type: 'move',
      confirmationRequired: false,
      undoTimeout: 5000,
      hapticFeedback: true
    },
    up: {
      type: 'move',
      confirmationRequired: false,
      undoTimeout: 5000,
      hapticFeedback: true
    },
    down: {
      type: 'delete',
      confirmationRequired: true,
      undoTimeout: 5000,
      hapticFeedback: true
    },
    gestureSettings: createDefaultGestureConfig(),
    isConfigured: false,
    lastModified: Date.now(),
    version: 1
  };
}

export function createDefaultGestureConfig(): GestureConfig {
  return {
    minimumSwipeDistance: 50,
    minimumSwipeVelocity: 300,
    hapticFeedbackEnabled: true,
    animationDuration: 300,
    touchSensitivity: 1.0,
    gestureDeadZone: 20,
    simultaneousGesturesEnabled: false,
    longPressDelay: 500,
    doubleTapDelay: 300,
    pinchToZoomEnabled: true,
    rotationGesturesEnabled: false,
    edgeSwipeEnabled: true,
    conflictResolution: 'swipe'
  };
}