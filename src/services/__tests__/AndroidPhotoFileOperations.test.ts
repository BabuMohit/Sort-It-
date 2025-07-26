/**
 * Comprehensive Unit Tests for AndroidPhotoFileOperations
 * Tests all photo file operations including move, copy, delete, and album creation
 * These tests are CRITICAL for production readiness
 */

// Mock the dependencies first
jest.mock('expo-media-library', () => ({
  getAssetInfoAsync: jest.fn(),
  getAlbumAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
  addAssetsToAlbumAsync: jest.fn(),
  removeAssetsFromAlbumAsync: jest.fn(),
  deleteAssetsAsync: jest.fn(),
  createAlbumAsync: jest.fn(),
  getAssetsAsync: jest.fn()
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  getFreeDiskStorageAsync: jest.fn(),
  getTotalDiskCapacityAsync: jest.fn(),
  documentDirectory: '/mock/documents/'
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  },
  Platform: {
    OS: 'android',
    Version: 30
  }
}));

import { AndroidPhotoFileOperations } from '../AndroidPhotoFileOperations';
import { MobileErrorType } from '../../types';

// Get the mocked modules
const mockMediaLibrary = require('expo-media-library');
const mockFileSystem = require('expo-file-system');
const mockAlert = require('react-native').Alert;

describe('AndroidPhotoFileOperations', () => {
  let service: AndroidPhotoFileOperations;

  beforeEach(() => {
    service = new AndroidPhotoFileOperations();
    jest.clearAllMocks();
    
    // Default mock implementations
    mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(1000000000); // 1GB
    mockFileSystem.getTotalDiskCapacityAsync.mockResolvedValue(10000000000); // 10GB
  });

  describe('Basic instantiation', () => {
    it('should create AndroidPhotoFileOperations instance', () => {
      expect(service).toBeInstanceOf(AndroidPhotoFileOperations);
    });

    it('should have all required methods', () => {
      expect(typeof service.movePhotoAndroid).toBe('function');
      expect(typeof service.copyPhotoAndroid).toBe('function');
      expect(typeof service.deletePhotoAndroid).toBe('function');
      expect(typeof service.createAlbumAndroid).toBe('function');
      expect(typeof service.updateMediaStore).toBe('function');
      expect(typeof service.processBatchOperations).toBe('function');
    });
  });

  describe('movePhotoAndroid - CRITICAL for photo organization', () => {
    const mockAsset = {
      id: 'photo123',
      filename: 'test.jpg',
      uri: 'file://test.jpg',
      mediaType: 'photo',
      width: 1920,
      height: 1080,
      creationTime: Date.now(),
      modificationTime: Date.now(),
      duration: 0
    };

    const mockTargetAlbum = {
      id: 'album456',
      title: 'Target Album',
      assetCount: 5
    };

    const mockOriginalAlbum = {
      id: 'album789',
      title: 'Original Album',
      assetCount: 10,
      isDefault: false
    };

    it('should move photo successfully', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockTargetAlbum);
      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([mockOriginalAlbum, mockTargetAlbum]);
      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [mockAsset],
        endCursor: '',
        hasNextPage: false,
        totalCount: 1
      });
      mockMediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(undefined);
      mockMediaLibrary.removeAssetsFromAlbumAsync.mockResolvedValue(undefined);

      const result = await service.movePhotoAndroid('photo123', 'album456');

      expect(result.success).toBe(true);
      expect(result.photoId).toBe('photo123');
      expect(result.operation).toBe('move');
      expect(result.targetAlbumId).toBe('album456');
      expect(result.undoAction).toBeDefined();
      expect(mockMediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalledWith([mockAsset], mockTargetAlbum, false);
      expect(mockMediaLibrary.removeAssetsFromAlbumAsync).toHaveBeenCalledWith([mockAsset], mockOriginalAlbum);
    });

    it('should handle photo not found error', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(null);

      const result = await service.movePhotoAndroid('nonexistent', 'album456');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Photo not found');
      expect(result.error?.details.code).toBe('PHOTO_NOT_FOUND');
    });

    it('should handle target album not found error', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(null);

      const result = await service.movePhotoAndroid('photo123', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Target album not found');
      expect(result.error?.details.code).toBe('ALBUM_NOT_FOUND');
    });

    it('should not remove from default album', async () => {
      const defaultAlbum = { ...mockOriginalAlbum, title: 'Camera' }; // Use Camera as default album
      
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockTargetAlbum);
      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([defaultAlbum, mockTargetAlbum]);
      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [mockAsset],
        endCursor: '',
        hasNextPage: false,
        totalCount: 1
      });

      const result = await service.movePhotoAndroid('photo123', 'album456');

      expect(result.success).toBe(true);
      expect(mockMediaLibrary.removeAssetsFromAlbumAsync).not.toHaveBeenCalled();
    });
  });

  describe('copyPhotoAndroid - CRITICAL for photo backup', () => {
    const mockAsset = {
      id: 'photo123',
      filename: 'test.jpg',
      uri: 'file://test.jpg',
      mediaType: 'photo',
      width: 1920,
      height: 1080,
      creationTime: Date.now(),
      modificationTime: Date.now(),
      duration: 0
    };

    const mockTargetAlbum = {
      id: 'album456',
      title: 'Target Album',
      assetCount: 5
    };

    it('should copy photo successfully', async () => {
      const copiedAsset = { ...mockAsset, id: 'photo456' };
      
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockTargetAlbum);
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1000000, // 1MB
        isDirectory: false,
        modificationTime: Date.now(),
        uri: 'file://test.jpg'
      });
      mockMediaLibrary.addAssetsToAlbumAsync.mockResolvedValue([copiedAsset]);

      const result = await service.copyPhotoAndroid('photo123', 'album456');

      expect(result.success).toBe(true);
      expect(result.photoId).toBe('photo123');
      expect(result.operation).toBe('copy');
      expect(result.targetAlbumId).toBe('album456');
      expect(result.undoAction).toBeDefined();
      expect(mockMediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalledWith([mockAsset], mockTargetAlbum, true);
    });

    it('should handle insufficient storage error - CRITICAL for user experience', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockTargetAlbum);
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 2000000000, // 2GB (larger than available space)
        isDirectory: false,
        modificationTime: Date.now(),
        uri: 'file://test.jpg'
      });
      mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(1000000000); // 1GB available

      const result = await service.copyPhotoAndroid('photo123', 'album456');

      expect(result.success).toBe(false);
      expect(result.error?.details.code).toBe('STORAGE_FULL');
      expect(result.error?.recoverable).toBe(false);
    });
  });

  describe('deletePhotoAndroid - CRITICAL for data management', () => {
    const mockAsset = {
      id: 'photo123',
      filename: 'test.jpg',
      uri: 'file://test.jpg',
      mediaType: 'photo',
      width: 1920,
      height: 1080,
      creationTime: Date.now(),
      modificationTime: Date.now(),
      duration: 0
    };

    it('should delete photo successfully with confirmation', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockAlert.alert.mockImplementation((title: any, message: any, buttons: any) => {
        // Simulate user confirming deletion
        if (buttons && buttons[1]) {
          buttons[1].onPress();
        }
      });
      mockMediaLibrary.deleteAssetsAsync.mockResolvedValue(undefined);

      const result = await service.deletePhotoAndroid('photo123');

      expect(result.success).toBe(true);
      expect(result.photoId).toBe('photo123');
      expect(result.operation).toBe('delete');
      expect(mockAlert.alert).toHaveBeenCalled();
      expect(mockMediaLibrary.deleteAssetsAsync).toHaveBeenCalledWith([mockAsset]);
    });

    it('should handle user cancellation - CRITICAL for preventing accidental deletion', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockAlert.alert.mockImplementation((title: any, message: any, buttons: any) => {
        // Simulate user cancelling deletion
        if (buttons && buttons[0]) {
          buttons[0].onPress();
        }
      });

      const result = await service.deletePhotoAndroid('photo123');

      expect(result.success).toBe(false);
      expect(result.error?.details.code).toBe('USER_CANCELLED');
      expect(mockMediaLibrary.deleteAssetsAsync).not.toHaveBeenCalled();
    });
  });

  describe('createAlbumAndroid - CRITICAL for organization', () => {
    const mockCreatedAlbum = {
      id: 'album123',
      title: 'New Album',
      assetCount: 0
    };

    it('should create album successfully', async () => {
      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([]);
      mockMediaLibrary.createAlbumAsync.mockResolvedValue(mockCreatedAlbum);

      const result = await service.createAlbumAndroid({
        name: 'New Album',
        type: 'user'
      });

      expect(result.id).toBe('album123');
      expect(result.title).toBe('New Album');
      expect(result.type).toBe('user');
      expect(result.isDefault).toBe(false);
      expect(result.permissions.canWrite).toBe(true);
      expect(mockMediaLibrary.createAlbumAsync).toHaveBeenCalledWith('New Album');
    });

    it('should handle empty album name - CRITICAL validation', async () => {
      await expect(service.createAlbumAndroid({ name: '' }))
        .rejects
        .toMatchObject({
          details: { code: 'INVALID_NAME' }
        });
    });

    it('should handle duplicate album name - CRITICAL for data integrity', async () => {
      const existingAlbum = {
        id: 'existing123',
        title: 'Existing Album',
        assetCount: 5
      };
      
      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([existingAlbum]);

      await expect(service.createAlbumAndroid({ name: 'Existing Album' }))
        .rejects
        .toMatchObject({
          details: { code: 'ALBUM_EXISTS' }
        });
    });
  });

  describe('processBatchOperations - CRITICAL for performance', () => {
    const mockAsset = {
      id: 'photo123',
      filename: 'test.jpg',
      uri: 'file://test.jpg',
      mediaType: 'photo',
      width: 1920,
      height: 1080,
      creationTime: Date.now(),
      modificationTime: Date.now(),
      duration: 0
    };

    const mockAlbum = {
      id: 'album456',
      title: 'Target Album',
      assetCount: 5
    };

    it('should process batch operations successfully', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockAlbum);
      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([mockAlbum]);
      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [],
        endCursor: '',
        hasNextPage: false,
        totalCount: 0
      });
      mockMediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(undefined);

      const operations = [
        { type: 'move' as const, photoId: 'photo123', targetAlbumId: 'album456' }
      ];

      const result = await service.processBatchOperations(operations);

      expect(result.totalOperations).toBe(1);
      expect(result.successfulOperations).toBe(1);
      expect(result.failedOperations).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    });

    it('should handle mixed success and failure in batch - CRITICAL for reliability', async () => {
      // First operation succeeds
      mockMediaLibrary.getAssetInfoAsync
        .mockResolvedValueOnce(mockAsset)
        .mockResolvedValueOnce(null); // Second operation fails
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockAlbum);
      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([mockAlbum]);
      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [],
        endCursor: '',
        hasNextPage: false,
        totalCount: 0
      });
      mockMediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(undefined);

      const operations = [
        { type: 'move' as const, photoId: 'photo123', targetAlbumId: 'album456' },
        { type: 'move' as const, photoId: 'nonexistent', targetAlbumId: 'album456' }
      ];

      const result = await service.processBatchOperations(operations);

      expect(result.totalOperations).toBe(2);
      expect(result.successfulOperations).toBe(1);
      expect(result.failedOperations).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('updateMediaStore - CRITICAL for system compatibility', () => {
    it('should trigger MediaStore update', async () => {
      // Mock console.log to verify the call
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.updateMediaStore();

      expect(consoleSpy).toHaveBeenCalledWith('Triggering MediaStore scan...');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error handling - CRITICAL for production stability', () => {
    it('should create proper error objects with recovery information', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(null);

      const result = await service.movePhotoAndroid('nonexistent', 'album456');

      expect(result.error).toMatchObject({
        type: MobileErrorType.MEDIA_STORE_ERROR,
        message: 'Photo not found',
        recoverable: true,
        userAction: 'Refresh the photo library and try again'
      });
    });

    it('should handle storage full errors as non-recoverable', async () => {
      const mockAsset = {
        id: 'photo123',
        filename: 'test.jpg',
        uri: 'file://test.jpg',
        mediaType: 'photo',
        width: 1920,
        height: 1080,
        creationTime: Date.now(),
        modificationTime: Date.now(),
        duration: 0
      };

      const mockAlbum = {
        id: 'album456',
        title: 'Target Album',
        assetCount: 5
      };

      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset);
      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockAlbum);
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 2000000000, // 2GB
        isDirectory: false,
        modificationTime: Date.now(),
        uri: 'file://test.jpg'
      });
      mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(1000000000); // 1GB available

      const result = await service.copyPhotoAndroid('photo123', 'album456');

      expect(result.error?.recoverable).toBe(false);
      expect(result.error?.userAction).toBe('Free up storage space and try again');
    });
  });
});