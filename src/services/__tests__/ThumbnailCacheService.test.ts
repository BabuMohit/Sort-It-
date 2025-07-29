import { ThumbnailCacheService } from '../ThumbnailCacheService';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Photo } from '../../types';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Image: {
    getSize: jest.fn((uri, success) => success(1920, 1080)),
  },
}));

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock photo data
const mockPhoto: Photo = {
  id: 'test-photo-1',
  uri: 'file://test-photo.jpg',
  filename: 'test-photo.jpg',
  width: 1920,
  height: 1080,
  creationTime: Date.now(),
  modificationTime: Date.now(),
  mediaType: 'photo',
  thumbnailUri: 'file://test-thumb.jpg',
  size: 2048000,
  mimeType: 'image/jpeg',
  orientation: 0,
  isFromCamera: true,
  androidMediaStoreId: 'ms1',
};

describe('ThumbnailCacheService', () => {
  let cacheService: ThumbnailCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new ThumbnailCacheService();
    
    // Setup default mocks
    Object.defineProperty(mockFileSystem, 'cacheDirectory', {
      value: 'file://cache/',
      writable: true,
    });
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: false,
      modificationTime: Date.now(),
      size: 1024,
      uri: 'file://test',
    });
    mockFileSystem.makeDirectoryAsync.mockResolvedValue();
    mockFileSystem.copyAsync.mockResolvedValue();
    mockFileSystem.deleteAsync.mockResolvedValue();
    mockFileSystem.readDirectoryAsync.mockResolvedValue([]);
    
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('Initialization', () => {
    it('initializes cache service correctly', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
        isDirectory: false,
        uri: '',
      });

      await cacheService.initialize();

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        'file://cache/thumbnails/',
        { intermediates: true }
      );
    });

    it('loads existing cache metadata', async () => {
      const mockMetadata = {
        totalSize: 1024000,
        entryCount: 10,
        lastCleanup: Date.now(),
        maxSize: 104857600,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockMetadata));

      await cacheService.initialize();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('thumbnail_cache_metadata');
    });

    it('handles initialization errors gracefully', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
        isDirectory: false,
        uri: '',
      });
      mockFileSystem.makeDirectoryAsync.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(cacheService.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('Thumbnail Generation and Caching', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('generates thumbnail for new photo', async () => {
      // Mock that existing thumbnail doesn't exist, so it generates a new one
      const photoWithoutThumbnail = { ...mockPhoto, thumbnailUri: '' };
      
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true, isDirectory: true, modificationTime: Date.now(), size: 0, uri: '' }); // cache dir exists

      const thumbnailUri = await cacheService.getThumbnail(photoWithoutThumbnail);

      expect(thumbnailUri).toBeDefined();
      expect(mockFileSystem.copyAsync).toHaveBeenCalled();
    });

    it('returns cached thumbnail for existing photo', async () => {
      // First call - generates thumbnail
      const firstCall = await cacheService.getThumbnail(mockPhoto);
      
      // Second call - should return cached version
      const secondCall = await cacheService.getThumbnail(mockPhoto);

      expect(firstCall).toBe(secondCall);
    });

    it('handles thumbnail generation with custom options', async () => {
      const options = {
        width: 150,
        height: 150,
        quality: 0.9,
        format: 'png' as const,
      };

      const thumbnailUri = await cacheService.getThumbnail(mockPhoto, options);

      expect(thumbnailUri).toBeDefined();
    });

    it('falls back to original URI on generation failure', async () => {
      // Use a photo without existing thumbnail and mock copy failure
      const photoWithoutThumbnail = { ...mockPhoto, thumbnailUri: '' };
      
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true, isDirectory: true, modificationTime: Date.now(), size: 0, uri: '' }); // cache dir exists
      
      mockFileSystem.copyAsync.mockRejectedValueOnce(new Error('Copy failed'));

      const thumbnailUri = await cacheService.getThumbnail(photoWithoutThumbnail);

      expect(thumbnailUri).toBe(photoWithoutThumbnail.uri);
    });

    it('uses existing thumbnail if available', async () => {
      const photoWithThumbnail = {
        ...mockPhoto,
        thumbnailUri: 'file://existing-thumb.jpg',
      };

      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now(),
        size: 1024,
        uri: 'file://existing-thumb.jpg',
      });

      const thumbnailUri = await cacheService.getThumbnail(photoWithThumbnail);

      expect(thumbnailUri).toBe('file://existing-thumb.jpg');
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('performs LRU cleanup when cache size exceeds limit', async () => {
      // Mock a large cache that exceeds the limit
      const mockLargeMetadata = {
        totalSize: 200 * 1024 * 1024, // 200MB
        entryCount: 100,
        lastCleanup: Date.now(),
        maxSize: 100 * 1024 * 1024, // 100MB limit
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockLargeMetadata));
      
      // Reinitialize to load the large cache
      const newCacheService = new ThumbnailCacheService();
      await newCacheService.initialize();

      // Generate a thumbnail which should trigger cleanup
      await newCacheService.getThumbnail(mockPhoto);

      expect(mockFileSystem.deleteAsync).toHaveBeenCalled();
    });

    it('clears entire cache', async () => {
      await cacheService.clearCache();

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        'file://cache/thumbnails/',
        { idempotent: true }
      );
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        'file://cache/thumbnails/',
        { intermediates: true }
      );
    });

    it('updates cache size limit', async () => {
      await cacheService.updateCacheSize(50); // 50MB

      // Should trigger cleanup if current size exceeds new limit
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('gets cache statistics', async () => {
      const stats = await cacheService.getCacheStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('missRate');
      expect(stats).toHaveProperty('availableSpace');
    });
  });

  describe('Preloading', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('preloads thumbnails for multiple photos', async () => {
      const photos = [
        { ...mockPhoto, id: 'photo-1', thumbnailUri: '' },
        { ...mockPhoto, id: 'photo-2', uri: 'file://photo2.jpg', thumbnailUri: '' },
        { ...mockPhoto, id: 'photo-3', uri: 'file://photo3.jpg', thumbnailUri: '' },
      ];

      // Mock that cache directory exists but thumbnails don't exist
      mockFileSystem.getInfoAsync
        .mockResolvedValue({ exists: true, isDirectory: true, modificationTime: Date.now(), size: 0, uri: '' });

      await cacheService.preloadThumbnails(photos);

      expect(mockFileSystem.copyAsync).toHaveBeenCalledTimes(3);
    });

    it('processes preloading in batches', async () => {
      const photos = Array.from({ length: 15 }, (_, i) => ({
        ...mockPhoto,
        id: `photo-${i}`,
        uri: `file://photo${i}.jpg`,
        thumbnailUri: '', // No existing thumbnail
      }));

      // Mock that cache directory exists
      mockFileSystem.getInfoAsync
        .mockResolvedValue({ exists: true, isDirectory: true, modificationTime: Date.now(), size: 0, uri: '' });

      await cacheService.preloadThumbnails(photos);

      // Should process in batches of 5
      expect(mockFileSystem.copyAsync).toHaveBeenCalledTimes(15);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('tracks cache hit and miss rates', async () => {
      // First call - miss
      await cacheService.getThumbnail(mockPhoto);
      
      // Second call - hit
      await cacheService.getThumbnail(mockPhoto);

      const stats = await cacheService.getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });

    it('handles memory pressure scenarios', async () => {
      // Simulate low memory by setting a very small cache size
      await cacheService.updateCacheSize(0.001); // 1KB to force cleanup

      // Mock large file sizes to trigger cleanup
      mockFileSystem.getInfoAsync
        .mockResolvedValue({ exists: true, isDirectory: false, modificationTime: Date.now(), size: 500000, uri: '' }); // 500KB files

      // Generate multiple thumbnails without existing thumbnails
      for (let i = 0; i < 3; i++) {
        await cacheService.getThumbnail({
          ...mockPhoto,
          id: `photo-${i}`,
          uri: `file://photo${i}.jpg`,
          thumbnailUri: '', // Force generation
        });
      }

      // Should have triggered cleanup due to exceeding cache size
      expect(mockFileSystem.deleteAsync).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('handles file system errors gracefully', async () => {
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(new Error('File system error'));

      const thumbnailUri = await cacheService.getThumbnail(mockPhoto);

      // Should fallback to original URI
      expect(thumbnailUri).toBe(mockPhoto.uri);
    });

    it('handles AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw, just log error
      await expect(cacheService.getThumbnail(mockPhoto)).resolves.toBeDefined();
    });

    it('handles missing cache directory', async () => {
      // Create a new service instance to test initialization
      const newCacheService = new ThumbnailCacheService();
      
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
        isDirectory: false,
        uri: '',
      });

      await newCacheService.initialize();

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalled();
    });
  });

  describe('Cache Persistence', () => {
    it('persists cache metadata across sessions', async () => {
      await cacheService.initialize();
      await cacheService.getThumbnail(mockPhoto);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'thumbnail_cache_metadata',
        expect.stringContaining('totalSize')
      );
    });

    it('loads cache from disk on initialization', async () => {
      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce([
        'cached-thumb1.jpeg',
        'cached-thumb2.jpg',
        'other-file.txt',
      ]);

      await cacheService.initialize();

      expect(mockFileSystem.readDirectoryAsync).toHaveBeenCalledWith(
        'file://cache/thumbnails/'
      );
    });
  });
});