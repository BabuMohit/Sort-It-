import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';
import { Photo, StorageInfo } from '../types';

// Cache configuration
const CACHE_KEY_PREFIX = 'thumbnail_cache_';
const CACHE_METADATA_KEY = 'thumbnail_cache_metadata';
const MAX_CACHE_SIZE_MB = 100; // 100MB default cache size
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const THUMBNAIL_QUALITY = 0.8;
const THUMBNAIL_SIZE = 200; // 200x200 pixels

export interface ThumbnailCacheEntry {
  uri: string;
  originalUri: string;
  size: number;
  createdAt: number;
  lastAccessed: number;
  width: number;
  height: number;
  quality: number;
}

export interface CacheMetadata {
  totalSize: number;
  entryCount: number;
  lastCleanup: number;
  maxSize: number;
}

export interface ThumbnailGenerationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
  preserveAspectRatio?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  oldestEntry: number;
  newestEntry: number;
  availableSpace: number;
}

export class ThumbnailCacheService {
  private cacheDir: string;
  private metadata: CacheMetadata;
  private memoryCache: Map<string, ThumbnailCacheEntry>;
  private accessCount: Map<string, number>;
  private hitCount: number = 0;
  private missCount: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    this.cacheDir = `${FileSystem.cacheDirectory || 'file://cache/'}thumbnails/`;
    this.metadata = {
      totalSize: 0,
      entryCount: 0,
      lastCleanup: Date.now(),
      maxSize: MAX_CACHE_SIZE_MB * 1024 * 1024, // Convert to bytes
    };
    this.memoryCache = new Map();
    this.accessCount = new Map();
  }

  /**
   * Initialize the thumbnail cache service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }

      // Load cache metadata
      await this.loadCacheMetadata();
      
      // Load memory cache from disk
      await this.loadMemoryCache();
      
      // Perform cleanup if needed
      await this.performMaintenanceIfNeeded();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize thumbnail cache:', error);
      throw error;
    }
  }

  /**
   * Get or generate thumbnail for a photo
   */
  async getThumbnail(
    photo: Photo,
    options: ThumbnailGenerationOptions = {}
  ): Promise<string> {
    await this.ensureInitialized();

    const cacheKey = this.generateCacheKey(photo.id, options);
    
    // Check memory cache first
    const cachedEntry = this.memoryCache.get(cacheKey);
    if (cachedEntry) {
      // Update access time
      cachedEntry.lastAccessed = Date.now();
      this.updateAccessCount(cacheKey);
      this.hitCount++;
      
      // Verify file still exists
      const fileInfo = await FileSystem.getInfoAsync(cachedEntry.uri);
      if (fileInfo.exists) {
        return cachedEntry.uri;
      } else {
        // File was deleted, remove from cache
        this.memoryCache.delete(cacheKey);
      }
    }

    this.missCount++;
    
    // Generate new thumbnail
    const thumbnailUri = await this.generateThumbnail(photo, options);
    
    // Cache the result
    await this.cacheThumbnail(cacheKey, photo.uri, thumbnailUri, options);
    
    return thumbnailUri;
  }

  /**
   * Generate thumbnail from original photo
   */
  private async generateThumbnail(
    photo: Photo,
    options: ThumbnailGenerationOptions
  ): Promise<string> {
    const {
      width = THUMBNAIL_SIZE,
      height = THUMBNAIL_SIZE,
      quality = THUMBNAIL_QUALITY,
      format = 'jpeg',
      preserveAspectRatio = true,
    } = options;

    try {
      // Use existing thumbnail if available and meets requirements
      if (photo.thumbnailUri && photo.thumbnailUri !== photo.uri) {
        const thumbInfo = await FileSystem.getInfoAsync(photo.thumbnailUri);
        if (thumbInfo.exists) {
          return photo.thumbnailUri;
        }
      }

      // Generate thumbnail using Expo FileSystem
      const cacheKey = this.generateCacheKey(photo.id, options);
      const thumbnailPath = `${this.cacheDir}${cacheKey}.${format}`;

      // Use Image.getSize to get original dimensions
      const { width: originalWidth, height: originalHeight } = await new Promise<{
        width: number;
        height: number;
      }>((resolve, reject) => {
        Image.getSize(
          photo.uri,
          (w, h) => resolve({ width: w, height: h }),
          reject
        );
      });

      // Calculate target dimensions
      let targetWidth = width;
      let targetHeight = height;

      if (preserveAspectRatio) {
        const aspectRatio = originalWidth / originalHeight;
        if (aspectRatio > 1) {
          // Landscape
          targetHeight = width / aspectRatio;
        } else {
          // Portrait
          targetWidth = height * aspectRatio;
        }
      }

      // Use FileSystem to manipulate image (basic resize)
      // Note: For production, consider using react-native-image-resizer or similar
      const resizedUri = await this.resizeImage(
        photo.uri,
        thumbnailPath,
        targetWidth,
        targetHeight,
        quality
      );

      return resizedUri;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      // Fallback to original image
      return photo.uri;
    }
  }

  /**
   * Basic image resize implementation
   * Note: This is a simplified version. In production, use a proper image manipulation library
   */
  private async resizeImage(
    sourceUri: string,
    targetPath: string,
    width: number,
    height: number,
    quality: number
  ): Promise<string> {
    try {
      // For now, we'll copy the original file as a placeholder
      // In a real implementation, you would use react-native-image-resizer or similar
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetPath,
      });
      
      return targetPath;
    } catch (error) {
      console.error('Failed to resize image:', error);
      return sourceUri;
    }
  }

  /**
   * Cache thumbnail entry
   */
  private async cacheThumbnail(
    cacheKey: string,
    originalUri: string,
    thumbnailUri: string,
    options: ThumbnailGenerationOptions
  ): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(thumbnailUri);
      if (!fileInfo.exists) return;

      const entry: ThumbnailCacheEntry = {
        uri: thumbnailUri,
        originalUri,
        size: fileInfo.size || 0,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        width: options.width || THUMBNAIL_SIZE,
        height: options.height || THUMBNAIL_SIZE,
        quality: options.quality || THUMBNAIL_QUALITY,
      };

      // Add to memory cache
      this.memoryCache.set(cacheKey, entry);
      
      // Update metadata
      this.metadata.totalSize += entry.size;
      this.metadata.entryCount++;
      
      // Save metadata
      await this.saveCacheMetadata();
      
      // Check if cleanup is needed
      if (this.metadata.totalSize > this.metadata.maxSize) {
        await this.performLRUCleanup();
      }
    } catch (error) {
      console.error('Failed to cache thumbnail:', error);
    }
  }

  /**
   * Perform LRU (Least Recently Used) cleanup
   */
  private async performLRUCleanup(): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    const targetSize = this.metadata.maxSize * 0.8; // Clean to 80% of max size
    let currentSize = this.metadata.totalSize;
    
    for (const [key, entry] of entries) {
      if (currentSize <= targetSize) break;
      
      try {
        // Delete file
        await FileSystem.deleteAsync(entry.uri, { idempotent: true });
        
        // Remove from memory cache
        this.memoryCache.delete(key);
        this.accessCount.delete(key);
        
        // Update metadata
        currentSize -= entry.size;
        this.metadata.entryCount--;
      } catch (error) {
        console.error('Failed to delete cached thumbnail:', error);
      }
    }
    
    this.metadata.totalSize = currentSize;
    await this.saveCacheMetadata();
  }

  /**
   * Perform maintenance if needed
   */
  private async performMaintenanceIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCleanup = now - this.metadata.lastCleanup;
    
    // Perform cleanup every 24 hours
    if (timeSinceLastCleanup > 24 * 60 * 60 * 1000) {
      await this.performAgeBasedCleanup();
      await this.performLRUCleanup();
      this.metadata.lastCleanup = now;
      await this.saveCacheMetadata();
    }
  }

  /**
   * Remove old cache entries
   */
  private async performAgeBasedCleanup(): Promise<void> {
    const now = Date.now();
    const expiredEntries: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.createdAt > MAX_CACHE_AGE_MS) {
        expiredEntries.push(key);
      }
    }
    
    for (const key of expiredEntries) {
      const entry = this.memoryCache.get(key);
      if (entry) {
        try {
          await FileSystem.deleteAsync(entry.uri, { idempotent: true });
          this.memoryCache.delete(key);
          this.accessCount.delete(key);
          this.metadata.totalSize -= entry.size;
          this.metadata.entryCount--;
        } catch (error) {
          console.error('Failed to delete expired thumbnail:', error);
        }
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    await this.ensureInitialized();
    
    const entries = Array.from(this.memoryCache.values());
    const totalRequests = this.hitCount + this.missCount;
    
    return {
      totalEntries: this.metadata.entryCount,
      totalSize: this.metadata.totalSize,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      missRate: totalRequests > 0 ? this.missCount / totalRequests : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.createdAt)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.createdAt)) : 0,
      availableSpace: this.metadata.maxSize - this.metadata.totalSize,
    };
  }

  /**
   * Clear entire cache
   */
  async clearCache(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Delete cache directory
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      
      // Recreate directory
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      
      // Reset metadata
      this.metadata = {
        totalSize: 0,
        entryCount: 0,
        lastCleanup: Date.now(),
        maxSize: MAX_CACHE_SIZE_MB * 1024 * 1024,
      };
      
      // Clear memory cache
      this.memoryCache.clear();
      this.accessCount.clear();
      this.hitCount = 0;
      this.missCount = 0;
      
      // Save metadata
      await this.saveCacheMetadata();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Update cache size limit
   */
  async updateCacheSize(sizeMB: number): Promise<void> {
    await this.ensureInitialized();
    
    this.metadata.maxSize = sizeMB * 1024 * 1024;
    await this.saveCacheMetadata();
    
    // Perform cleanup if current size exceeds new limit
    if (this.metadata.totalSize > this.metadata.maxSize) {
      await this.performLRUCleanup();
    }
  }

  /**
   * Preload thumbnails for photos
   */
  async preloadThumbnails(
    photos: Photo[],
    options: ThumbnailGenerationOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(photo => this.getThumbnail(photo, options))
      );
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Private helper methods

  private generateCacheKey(photoId: string, options: ThumbnailGenerationOptions): string {
    const optionsHash = JSON.stringify(options);
    return `${photoId}_${Buffer.from(optionsHash).toString('base64')}`;
  }

  private updateAccessCount(key: string): void {
    const count = this.accessCount.get(key) || 0;
    this.accessCount.set(key, count + 1);
  }

  private async loadCacheMetadata(): Promise<void> {
    try {
      const metadataJson = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      if (metadataJson) {
        this.metadata = { ...this.metadata, ...JSON.parse(metadataJson) };
      }
    } catch (error) {
      console.error('Failed to load cache metadata:', error);
    }
  }

  private async saveCacheMetadata(): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.error('Failed to save cache metadata:', error);
    }
  }

  private async loadMemoryCache(): Promise<void> {
    try {
      // Load cache entries from disk
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.jpeg') || file.endsWith('.jpg') || file.endsWith('.png')) {
          const filePath = `${this.cacheDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists) {
            const cacheKey = file.replace(/\.(jpeg|jpg|png)$/, '');
            const entry: ThumbnailCacheEntry = {
              uri: filePath,
              originalUri: '', // Will be populated when accessed
              size: fileInfo.size || 0,
              createdAt: fileInfo.modificationTime || Date.now(),
              lastAccessed: fileInfo.modificationTime || Date.now(),
              width: THUMBNAIL_SIZE,
              height: THUMBNAIL_SIZE,
              quality: THUMBNAIL_QUALITY,
            };
            
            this.memoryCache.set(cacheKey, entry);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load memory cache:', error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const thumbnailCacheService = new ThumbnailCacheService();