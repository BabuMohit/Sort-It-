/**
 * Unit tests for AndroidPhotoService
 * Tests photo operations and MediaStore integration
 */

// Mock the dependencies
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
  getAlbumAsync: jest.fn(),
  createAlbumAsync: jest.fn(),
  addAssetsToAlbumAsync: jest.fn(),
  deleteAssetsAsync: jest.fn()
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  getTotalDiskCapacityAsync: jest.fn(),
  getFreeDiskStorageAsync: jest.fn(),
  getInfoAsync: jest.fn()
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android'
  }
}));

import { AndroidPhotoServiceImpl } from '../AndroidPhotoService';
import { MobileErrorType } from '../../types';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('AndroidPhotoService', () => {
  let service: AndroidPhotoServiceImpl;

  beforeEach(() => {
    service = new AndroidPhotoServiceImpl();
    jest.clearAllMocks();
    
    // Default mock implementations
    mockFileSystem.getTotalDiskCapacityAsync.mockResolvedValue(1000000000); // 1GB
    mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(500000000); // 500MB
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false, uri: "", isDirectory: false });
  });

  describe('getAllPhotos', () => {
    it('should request permissions before fetching photos', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [],
        endCursor: '',
        hasNextPage: false,
        totalCount: 0
      });

      await service.getAllPhotos();

      expect(mockMediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should throw permission error when permission denied', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: true,
        granted: false,
        expires: 'never'
      });

      await expect(service.getAllPhotos()).rejects.toMatchObject({
        type: MobileErrorType.PERMISSION_DENIED,
        message: 'Media library permission denied'
      });
    });

    it('should fetch and convert photo assets', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      const mockAsset = {
        id: 'asset1',
        filename: 'IMG_001.jpg',
        uri: 'file://photo1.jpg',
        mediaType: 'photo' as const,
        width: 1920,
        height: 1080, creationTime: 1640995200000, modificationTime: 1640995200000,
        albumId: 'album1'
      , duration: 0, };

      mockMediaLibrary.getAssetsAsync
        .mockResolvedValueOnce({
          assets: [mockAsset],
          endCursor: '',
          hasNextPage: false,
          totalCount: 1
        })
        .mockResolvedValueOnce({
          assets: [],
          endCursor: '',
          hasNextPage: false,
          totalCount: 0
        });

      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue({
        id: "test",
        filename: "test.jpg",
        uri: "file://test.jpg",
        mediaType: "photo",
        width: 1920,
        height: 1080,
        creationTime: 1640995200000,
        modificationTime: Date.now(),
        duration: 0,
        localUri: 'file://local/photo1.jpg',
        location: { latitude: 40.7128, longitude: -74.0060 },
        orientation: 0,
        exif: {}
      } as any);

      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, uri: "", size: 2048000, isDirectory: false, modificationTime: Date.now() });

      const photos = await service.getAllPhotos();

      expect(photos).toHaveLength(1);
      expect(photos[0]).toMatchObject({
        id: 'photo_asset1',
        filename: 'IMG_001.jpg',
        uri: 'file://photo1.jpg',
        mediaType: 'photo',
        width: 1920,
        height: 1080,
        androidMediaStoreId: 'asset1',
        isFromCamera: true
      });
    });

    it('should handle pagination when fetching assets', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      const mockAsset1 = {
        id: 'asset1',
        filename: 'photo1.jpg',
        uri: 'file://photo1.jpg',
        mediaType: 'photo' as const,
        width: 1920,
        height: 1080, creationTime: 1640995200000, modificationTime: 1640995200000
      , duration: 0, };

      const mockAsset2 = {
        id: 'asset2',
        filename: 'photo2.jpg',
        uri: 'file://photo2.jpg',
        mediaType: 'photo' as const,
        width: 1920,
        height: 1080, creationTime: 1640995200000, modificationTime: 1640995300000
      , duration: 0, };

      // Mock paginated responses
      mockMediaLibrary.getAssetsAsync
        .mockResolvedValueOnce({
          assets: [mockAsset1],
          endCursor: 'cursor1',
          hasNextPage: true,
          totalCount: 2
        })
        .mockResolvedValueOnce({
          assets: [mockAsset2],
          endCursor: 'cursor2',
          hasNextPage: false,
          totalCount: 2
        })
        .mockResolvedValueOnce({
          assets: [],
          endCursor: '',
          hasNextPage: false,
          totalCount: 0
        });

      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue({ 
        id: "test", 
        filename: "test.jpg", 
        uri: "file://test.jpg", 
        mediaType: "photo", 
        width: 1920, 
        height: 1080, 
        creationTime: 1640995200000, 
        modificationTime: Date.now(), 
        duration: 0, 
        localUri: 'file://local/photo.jpg',
        orientation: 0,
        location: undefined,
        exif: {}
      } as any);

      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, uri: "", size: 1024000, isDirectory: false, modificationTime: Date.now() });

      const photos = await service.getAllPhotos();

      expect(photos).toHaveLength(2);
      expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(3); // 2 for photos, 1 for videos
    });
  });

  describe('getAndroidAlbums', () => {
    it('should fetch and convert albums', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      const mockAlbum = {
        id: 'album1',
        title: 'Camera',
        assetCount: 10,
        startTime: 0,
        endTime: 0
      };

      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([mockAlbum]);

      const albums = await service.getAndroidAlbums();

      expect(albums).toHaveLength(1);
      expect(albums[0]).toMatchObject({
        id: 'album_album1',
        title: 'Camera',
        assetCount: 10,
        type: 'system',
        isDefault: true,
        androidBucketId: 'album1'
      });
    });

    it('should sort albums with system albums first', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      const mockAlbums = [
        { id: "album1", title: "My Photos", assetCount: 5, startTime: 0, endTime: 0 } as any,
        { id: "album2", title: "Camera", assetCount: 10, startTime: 0, endTime: 0 } as any,
        { id: "album3", title: "Screenshots", assetCount: 3, startTime: 0, endTime: 0 } as any
      ];

      mockMediaLibrary.getAlbumsAsync.mockResolvedValue(mockAlbums);

      const albums = await service.getAndroidAlbums();

      expect(albums).toHaveLength(3);
      expect(albums[0].title).toBe('Camera');
      expect(albums[1].title).toBe('Screenshots');
      expect(albums[2].title).toBe('My Photos');
    });
  });

  describe('movePhotoAndroid', () => {
    it('should move photo to target album', async () => {
      // Setup cache with photo and album
      const mockPhoto = {
        id: 'photo1',
        androidMediaStoreId: 'asset1',
        albumId: 'album1',
        mediaType: 'photo' as const,
        filename: 'test.jpg',
        uri: 'file://test.jpg',
        width: 1920,
        height: 1080,
        creationTime: Date.now(),
        modificationTime: Date.now(),
        thumbnailUri: 'file://thumb.jpg',
        size: 1024000,
        mimeType: 'image/jpeg',
        orientation: 0,
        isFromCamera: false
      };

      const mockTargetAlbum = {
        id: 'album2',
        title: 'Target Album',
        assetCount: 0,
        type: 'user' as const,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        storagePath: '/storage/Pictures/Target Album',
        isOnSdCard: false,
        storageUsage: 0,
        storageInfo: {} as any,
        permissions: {} as any,
        syncStatus: {} as any
      };

      // Mock service cache
      (service as any).photoCache.set('photo1', mockPhoto);
      (service as any).albumCache.set('album2', mockTargetAlbum);

      const mockAsset = {
        id: 'asset1',
        filename: 'test.jpg',
        uri: 'file://test.jpg',
        mediaType: 'photo' as const,
        width: 1920,
        height: 1080,
        creationTime: Date.now(),
        modificationTime: Date.now()
      , duration: 0, };

      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [mockAsset],
        endCursor: '',
        hasNextPage: false,
        totalCount: 1
      });

      const mockTargetMediaAlbum = {
        id: 'media_album2',
        title: 'Target Album',
        assetCount: 0,
        startTime: 0,
        endTime: 0
      };

      mockMediaLibrary.getAlbumAsync.mockResolvedValue(mockTargetMediaAlbum);
      mockMediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(true);

      await service.movePhotoAndroid('photo1', 'album2');

      expect(mockMediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalledWith(
        [mockAsset],
        mockTargetMediaAlbum,
        false
      );
    });

    it('should throw error when photo not found', async () => {
      await expect(service.movePhotoAndroid('nonexistent', 'album1'))
        .rejects.toMatchObject({
          type: MobileErrorType.FILE_NOT_FOUND,
          message: 'Photo not found'
        });
    });

    it('should throw error when target album not found', async () => {
      const mockPhoto = {
        id: 'photo1',
        androidMediaStoreId: 'asset1'
      };

      (service as any).photoCache.set('photo1', mockPhoto);

      await expect(service.movePhotoAndroid('photo1', 'nonexistent'))
        .rejects.toMatchObject({
          type: MobileErrorType.FILE_NOT_FOUND,
          message: 'Target album not found'
        });
    });
  });

  describe('deletePhotoAndroid', () => {
    it('should delete photo from MediaStore', async () => {
      const mockPhoto = {
        id: 'photo1',
        androidMediaStoreId: 'asset1',
        mediaType: 'photo' as const
      };

      (service as any).photoCache.set('photo1', mockPhoto);

      const mockAsset = {
        id: 'asset1',
        filename: 'test.jpg',
        uri: 'file://test.jpg',
        mediaType: 'photo' as const,
        width: 1920,
        height: 1080,
        creationTime: Date.now(),
        modificationTime: Date.now()
      , duration: 0, };

      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [mockAsset],
        endCursor: '',
        hasNextPage: false,
        totalCount: 1
      });

      mockMediaLibrary.deleteAssetsAsync.mockResolvedValue(true);

      await service.deletePhotoAndroid('photo1');

      expect(mockMediaLibrary.deleteAssetsAsync).toHaveBeenCalledWith([mockAsset]);
      expect((service as any).photoCache.has('photo1')).toBe(false);
    });

    it('should handle already deleted photos gracefully', async () => {
      const mockPhoto = {
        id: 'photo1',
        androidMediaStoreId: 'asset1',
        mediaType: 'photo' as const
      };

      (service as any).photoCache.set('photo1', mockPhoto);

      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [], // Asset not found
        endCursor: '',
        hasNextPage: false,
        totalCount: 0
      });

      await service.deletePhotoAndroid('photo1');

      expect((service as any).photoCache.has('photo1')).toBe(false);
      expect(mockMediaLibrary.deleteAssetsAsync).not.toHaveBeenCalled();
    });
  });

  describe('getPhotoMetadata', () => {
    it('should return cached metadata if available', async () => {
      const mockMetadata = {
        dateAdded: Date.now(),
        dateModified: Date.now(),
        displayName: 'test.jpg'
      };

      const mockPhoto = {
        id: 'photo1',
        androidMediaStoreId: 'asset1',
        metadata: mockMetadata
      };

      (service as any).photoCache.set('photo1', mockPhoto);

      const result = await service.getPhotoMetadata('photo1');

      expect(result).toEqual(mockMetadata);
      expect(mockMediaLibrary.getAssetInfoAsync).not.toHaveBeenCalled();
    });

    it('should fetch metadata from MediaLibrary when not cached', async () => {
      const mockPhoto = {
        id: 'photo1',
        androidMediaStoreId: 'asset1',
        filename: 'test.jpg', creationTime: 1640995200000, modificationTime: 1640995300000,
        width: 1920,
        height: 1080,
        mimeType: 'image/jpeg'
      };

      (service as any).photoCache.set('photo1', mockPhoto);

      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue({ 
        id: "test", 
        filename: "test.jpg", 
        uri: "file://test.jpg", 
        mediaType: "photo", 
        width: 1920, 
        height: 1080, 
        creationTime: 1640995200000, 
        modificationTime: Date.now(), 
        duration: 0, 
        localUri: 'file://local/test.jpg', 
        orientation: 0,
        location: undefined,
        exif: {}
      } as any);

      const result = await service.getPhotoMetadata('photo1');

      expect(result).toMatchObject({
        dateAdded: 1640995200000,
        dateModified: 1640995300000,
        dateTaken: 1640995200000,
        displayName: 'test.jpg',
        resolution: '1920x1080',
        compressionType: 'JPEG'
      });

      expect(mockMediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith('asset1');
    });
  });

  describe('createAlbumAndroid', () => {
    it('should create new album', async () => {
      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([]);

      const request = {
        name: 'New Album',
        type: 'user' as const
      };

      const result = await service.createAlbumAndroid(request.name);

      expect(result).toMatchObject({
        title: 'New Album',
        type: 'user',
        assetCount: 0,
        isDefault: false
      });

      expect(result.id).toMatch(/^album_\d+_/);
    });

    it('should throw error when album already exists', async () => {
      const existingAlbum = {
        id: 'album1',
        title: 'Existing Album',
        assetCount: 5,
        startTime: 0,
        endTime: 0
      };

      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      mockMediaLibrary.getAlbumsAsync.mockResolvedValue([existingAlbum]);

      const request = {
        name: 'Existing Album',
        type: 'user' as const
      };

      await expect(service.createAlbumAndroid(request.name))
        .rejects.toMatchObject({
          type: MobileErrorType.FILE_NOT_FOUND,
          message: 'Album already exists'
        });
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      mockFileSystem.getTotalDiskCapacityAsync.mockResolvedValue(2000000000); // 2GB
      mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(1000000000); // 1GB

      const result = await service.getStorageInfo();

      expect(result).toMatchObject({
        totalSpace: 2000000000,
        availableSpace: 1000000000,
        usedSpace: 1000000000,
        isLowStorage: false,
        storageType: 'internal',
        isEmulated: true
      });
    });

    it('should detect low storage condition', async () => {
      mockFileSystem.getTotalDiskCapacityAsync.mockResolvedValue(1000000000); // 1GB
      mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(50000000); // 50MB (5%)

      const result = await service.getStorageInfo();

      expect(result.isLowStorage).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should use cached photos when cache is valid', async () => {
      const mockPhoto = {
        id: 'photo1',
        filename: 'test.jpg'
      };

      // Set up cache
      (service as any).photoCache.set('photo1', mockPhoto);
      (service as any).lastCacheUpdate = Date.now();

      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      const result = await service.getAllPhotos();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockPhoto);
      expect(mockMediaLibrary.getAssetsAsync).not.toHaveBeenCalled();
    });

    it('should refresh cache when expired', async () => {
      const mockPhoto = {
        id: 'photo1',
        filename: 'test.jpg'
      };

      // Set up expired cache
      (service as any).photoCache.set('photo1', mockPhoto);
      (service as any).lastCacheUpdate = Date.now() - (10 * 60 * 1000); // 10 minutes ago

      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never'
      });

      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [],
        endCursor: '',
        hasNextPage: false,
        totalCount: 0
      });

      await service.getAllPhotos();

      expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalled();
    });
  });
});