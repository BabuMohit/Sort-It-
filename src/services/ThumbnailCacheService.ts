import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Photo } from '../types';

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

// Simple LRU Cache implementation
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

export class ThumbnailCacheService {
  private lruCache: LRUCache<string, ThumbnailCacheEntry>;
  private cacheDirectory: string;
  private metadata: CacheMetadata;
  private initialized: boolean = false;

  constructor() {
    this.lruCache = new LRUCache<string, ThumbnailCacheEntry>(500);
    this.cacheDirectory = `${FileSystem.cacheDirectory}thumbnails/`;
    this.metadata = {
      totalSize: 0,
      entryCount: 0,
      lastCleanup: Date.now(),
      maxSize: MAX_CACHE_SIZE_MB * 1024 * 1024,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
      }
      this.initialized = true;
    } catch (error) {
      console.error('ThumbnailCacheService: Failed to initialize:', error);
      throw error;
    }
  }

  async getThumbnail(photo: Photo, options?: ThumbnailGenerationOptions): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = this.generateCacheKey(photo, options);
    
    // Check LRU cache first
    const cachedEntry = this.lruCache.get(cacheKey);
    if (cachedEntry) {
      cachedEntry.lastAccessed = Date.now();
      return cachedEntry.uri;
    }

    // For now, return the original URI or thumbnailUri
    const thumbnailUri = photo.thumbnailUri || photo.uri;
    
    // Create cache entry
    const cacheEntry: ThumbnailCacheEntry = {
      uri: thumbnailUri,
      originalUri: photo.uri,
      size: 0,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      quality: THUMBNAIL_QUALITY,
    };

    this.lruCache.set(cacheKey, cacheEntry);
    return thumbnailUri;
  }

  async preloadThumbnails(photos: Photo[], options?: ThumbnailGenerationOptions): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Process in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      await Promise.all(
        batch.map(photo => this.getThumbnail(photo, options).catch(error => {
          console.warn(`Failed to preload thumbnail for ${photo.id}:`, error);
          return photo.uri;
        }))
      );
    }
  }

  async clearCache(): Promise<void> {
    try {
      this.lruCache.clear();
      
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDirectory);
      }
      
      this.metadata = {
        totalSize: 0,
        entryCount: 0,
        lastCleanup: Date.now(),
        maxSize: MAX_CACHE_SIZE_MB * 1024 * 1024,
      };
    } catch (error) {
      console.error('ThumbnailCacheService: Failed to clear cache:', error);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Remove old entries based on LRU
      const currentTime = Date.now();
      const entries = Array.from(this.lruCache.entries());
      
      // Sort by last accessed time (oldest first)
      entries.sort((a, b) => (a[1] as ThumbnailCacheEntry).lastAccessed - (b[1] as ThumbnailCacheEntry).lastAccessed);
      
      let currentSize = this.metadata.totalSize;
      const targetSize = this.metadata.maxSize * 0.8; // Clean to 80% of max size
      
      for (const [key, entry] of entries as [string, ThumbnailCacheEntry][]) {
        if (currentSize <= targetSize) break;
        
        // Remove from cache
        this.lruCache.delete(key);
        
        // Remove file if it exists
        try {
          const fileInfo = await FileSystem.getInfoAsync(entry.uri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(entry.uri);
            currentSize -= entry.size;
          }
        } catch (error) {
          console.warn('Failed to delete cached file:', error);
        }
      }
      
      // Update metadata
      this.metadata.totalSize = currentSize;
      this.metadata.entryCount = this.lruCache.size();
      this.metadata.lastCleanup = currentTime;
      
      // Save updated metadata
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.error('ThumbnailCacheService: Failed to cleanup cache:', error);
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    return {
      totalEntries: this.lruCache.size(),
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      oldestEntry: 0,
      newestEntry: 0,
      availableSpace: this.metadata.maxSize,
    };
  }

  private generateCacheKey(photo: Photo, options?: ThumbnailGenerationOptions): string {
    const opts = {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      quality: THUMBNAIL_QUALITY,
      ...options,
    };
    return `${photo.id}_${opts.width}x${opts.height}_${opts.quality}`;
  }

  async updateCacheSize(newSizeMB: number): Promise<void> {
    const newSizeBytes = newSizeMB * 1024 * 1024;
    this.metadata.maxSize = newSizeBytes;
    
    // Save updated metadata
    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.metadata));
    
    // Clean up if current size exceeds new limit
    if (this.metadata.totalSize > newSizeBytes) {
      await this.cleanup();
    }
  }
}

// Export singleton instance
export const thumbnailCacheService = new ThumbnailCacheService();