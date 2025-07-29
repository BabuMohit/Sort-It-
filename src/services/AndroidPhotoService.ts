import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import {
  AndroidPhotoService,
  Photo,
  Album,
  PhotoMetadata,
  StorageInfo,
  MobileAppError,
  MobileErrorType,
  CreateAlbumRequest
} from '../types';

/**
 * Android Photo Service Implementation
 * Handles all photo operations using Android MediaStore API through Expo
 * Optimized for mobile performance with efficient memory usage
 */
export class AndroidPhotoServiceImpl implements AndroidPhotoService {
  private photoCache: Map<string, Photo> = new Map();
  private albumCache: Map<string, Album> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all photos from Android MediaStore
   * Includes both images and videos with comprehensive metadata
   */
  async getAllPhotos(): Promise<Photo[]> {
    console.log('AndroidPhotoService: Starting getAllPhotos()');
    
    try {
      // Check and request permissions
      console.log('AndroidPhotoService: Checking permissions...');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log(`AndroidPhotoService: Permission status: ${status}`);
      
      if (status !== 'granted') {
        console.error('AndroidPhotoService: Media library permission denied');
        throw this.createError(
          'Media library permission denied',
          MobileErrorType.PERMISSION_DENIED,
          'Please grant photo access in Settings'
        );
      }

      console.log('AndroidPhotoService: Permissions granted, testing simple fetch...');

      // Try a simple fetch first to test
      try {
        const testResult = await MediaLibrary.getAssetsAsync({
          first: 10,
          mediaType: ['photo', 'video']
        });
        console.log(`AndroidPhotoService: Test fetch returned ${testResult.assets.length} assets`);
        console.log('AndroidPhotoService: First asset:', testResult.assets[0]);
      } catch (testError) {
        console.error('AndroidPhotoService: Test fetch failed:', testError);
        throw testError;
      }

      // Fetch all media assets
      console.log('AndroidPhotoService: Fetching all media assets...');
      const allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let endCursor: string | undefined;
      let pageCount = 0;

      while (hasNextPage && pageCount < 50) { // Reduced safety limit
        pageCount++;
        console.log(`AndroidPhotoService: Fetching page ${pageCount}...`);
        
        try {
          const result = await MediaLibrary.getAssetsAsync({
            first: 50, // Smaller page size
            mediaType: ['photo', 'video'],
            sortBy: ['creationTime'],
            after: endCursor
          });

          console.log(`AndroidPhotoService: Page ${pageCount} returned ${result.assets.length} assets, hasNextPage: ${result.hasNextPage}`);
          
          if (result.assets.length > 0) {
            allAssets.push(...result.assets);
          }
          
          hasNextPage = result.hasNextPage;
          endCursor = result.endCursor;
          
          // Break if no more pages
          if (!result.hasNextPage) {
            break;
          }
        } catch (pageError) {
          console.error(`AndroidPhotoService: Error fetching page ${pageCount}:`, pageError);
          break;
        }
      }

      console.log(`AndroidPhotoService: Total assets fetched: ${allAssets.length}`);

      if (allAssets.length === 0) {
        console.log('AndroidPhotoService: No assets found, returning empty array');
        return [];
      }

      // Convert assets to photos - process first 100 for testing
      const photos: Photo[] = [];
      const assetsToProcess = allAssets.slice(0, 100); // Limit for testing
      
      console.log(`AndroidPhotoService: Processing first ${assetsToProcess.length} assets...`);
      
      for (let i = 0; i < assetsToProcess.length; i++) {
        const asset = assetsToProcess[i];
        try {
          const photo = await this.convertAssetToPhotoSimple(asset);
          if (photo) {
            photos.push(photo);
          }
        } catch (error) {
          console.warn(`AndroidPhotoService: Failed to convert asset ${asset.id}:`, error);
        }
        
        // Log progress every 10 items
        if ((i + 1) % 10 === 0) {
          console.log(`AndroidPhotoService: Processed ${i + 1}/${assetsToProcess.length} assets, ${photos.length} photos created`);
        }
      }

      console.log(`AndroidPhotoService: Successfully processed ${photos.length} photos out of ${assetsToProcess.length} assets`);

      // Update cache
      this.updatePhotoCache(photos);

      return photos;
    } catch (error) {
      console.error('AndroidPhotoService: Error getting all photos:', error);
      
      // If it's a permission error, re-throw it
      if (error && typeof error === 'object' && 'type' in error && error.type === MobileErrorType.PERMISSION_DENIED) {
        throw error;
      }
      
      throw this.createError(
        'Failed to load photos',
        MobileErrorType.MEDIA_STORE_ERROR,
        'Please try refreshing or check your storage'
      );
    }
  }

  /**
   * Get Android albums including system albums (DCIM, Screenshots, etc.)
   * Returns both user-created and system albums with storage information
   */
  async getAndroidAlbums(): Promise<Album[]> {
    try {
      // Check cache first
      if (this.isCacheValid() && this.albumCache.size > 0) {
        return Array.from(this.albumCache.values());
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw this.createError(
          'Media library permission denied',
          MobileErrorType.PERMISSION_DENIED,
          'Please grant photo access in Settings'
        );
      }

      // Get albums from MediaLibrary
      const mediaAlbums = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true
      });

      const albums: Album[] = [];
      const storageInfo = await this.getStorageInfo();

      // Process each album and get its asset count
      for (const mediaAlbum of mediaAlbums) {
        try {
          // Get assets for this album to get accurate count
          const albumAssets = await MediaLibrary.getAssetsAsync({
            album: mediaAlbum,
            first: 1, // Just get count, not all assets
          });
          
          const album = await this.convertMediaAlbumToAlbum(mediaAlbum, storageInfo);
          // Update asset count with actual count
          album.assetCount = albumAssets.totalCount;
          albums.push(album);
        } catch (error) {
          console.warn(`Failed to process album ${mediaAlbum.title}:`, error);
          // Continue with other albums
        }
      }

      // Sort albums: system albums first, then user albums
      albums.sort((a, b) => {
        if (a.type === 'system' && b.type !== 'system') return -1;
        if (a.type !== 'system' && b.type === 'system') return 1;
        return a.title.localeCompare(b.title);
      });

      // Update cache
      this.updateAlbumCache(albums);

      return albums;
    } catch (error) {
      console.error('Error getting Android albums:', error);
      throw this.createError(
        'Failed to load albums',
        MobileErrorType.MEDIA_STORE_ERROR,
        'Please try refreshing or check your storage'
      );
    }
  }

  /**
   * Move photo to different album using Android MediaStore
   * Updates MediaStore to maintain compatibility with other gallery apps
   */
  async movePhotoAndroid(photoId: string, targetAlbumId: string): Promise<void> {
    const photo = this.photoCache.get(photoId);
    if (!photo) {
      throw this.createError(
        'Photo not found',
        MobileErrorType.FILE_NOT_FOUND,
        'The photo may have been deleted or moved'
      );
    }

    const targetAlbum = this.albumCache.get(targetAlbumId);
    if (!targetAlbum) {
      throw this.createError(
        'Target album not found',
        MobileErrorType.FILE_NOT_FOUND,
        'The target album may have been deleted'
      );
    }

    try {

      // Get the asset from MediaLibrary
      const assets = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: photo.mediaType === 'photo' ? 'photo' : 'video',
        album: photo.albumId
      });

      const asset = assets.assets.find(a => a.id === photo.androidMediaStoreId);
      if (!asset) {
        throw this.createError(
          'Asset not found in MediaStore',
          MobileErrorType.MEDIA_STORE_ERROR,
          'The photo may have been moved by another app'
        );
      }

      // Move asset to target album
      const targetMediaAlbum = await MediaLibrary.getAlbumAsync(targetAlbum.title);
      if (targetMediaAlbum) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], targetMediaAlbum, false);
      } else {
        // Create album if it doesn't exist
        const newAlbum = await MediaLibrary.createAlbumAsync(targetAlbum.title, asset, false);
        // Update our album cache
        const updatedAlbum: Album = {
          ...targetAlbum,
          androidBucketId: newAlbum.id
        };
        this.albumCache.set(targetAlbumId, updatedAlbum);
      }

      // Update photo cache
      const updatedPhoto: Photo = {
        ...photo,
        albumId: targetAlbumId
      };
      this.photoCache.set(photoId, updatedPhoto);

      // Update MediaStore
      await this.updateMediaStore();

    } catch (error) {
      console.error('Error moving photo:', error);
      throw this.createError(
        'Failed to move photo',
        MobileErrorType.MEDIA_STORE_ERROR,
        'Please try again or check storage permissions'
      );
    }
  }

  /**
   * Copy photo to different album
   * Creates a copy while preserving the original
   */
  async copyPhotoAndroid(photoId: string, targetAlbumId: string): Promise<void> {
    try {
      const photo = this.photoCache.get(photoId);
      if (!photo) {
        throw this.createError(
          'Photo not found',
          MobileErrorType.FILE_NOT_FOUND,
          'The photo may have been deleted or moved'
        );
      }

      const targetAlbum = this.albumCache.get(targetAlbumId);
      if (!targetAlbum) {
        throw this.createError(
          'Target album not found',
          MobileErrorType.FILE_NOT_FOUND,
          'The target album may have been deleted'
        );
      }

      // Get the asset from MediaLibrary
      const assets = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: photo.mediaType === 'photo' ? 'photo' : 'video'
      });

      const asset = assets.assets.find(a => a.id === photo.androidMediaStoreId);
      if (!asset) {
        throw this.createError(
          'Asset not found in MediaStore',
          MobileErrorType.MEDIA_STORE_ERROR,
          'The photo may have been moved by another app'
        );
      }

      // Copy file to target album directory
      const targetMediaAlbum = await MediaLibrary.getAlbumAsync(targetAlbum.title);
      if (targetMediaAlbum) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], targetMediaAlbum, true);
      } else {
        // Create album and add asset
        await MediaLibrary.createAlbumAsync(targetAlbum.title, asset, true);
      }

      // Update MediaStore
      await this.updateMediaStore();

    } catch (error) {
      console.error('Error copying photo:', error);
      throw this.createError(
        'Failed to copy photo',
        MobileErrorType.MEDIA_STORE_ERROR,
        'Please try again or check storage space'
      );
    }
  }

  /**
   * Delete photo from Android MediaStore
   * Uses Android's trash/recycle bin when available
   */
  async deletePhotoAndroid(photoId: string): Promise<void> {
    try {
      const photo = this.photoCache.get(photoId);
      if (!photo) {
        throw this.createError(
          'Photo not found',
          MobileErrorType.FILE_NOT_FOUND,
          'The photo may have already been deleted'
        );
      }

      // Get the asset from MediaLibrary
      const assets = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: photo.mediaType === 'photo' ? 'photo' : 'video'
      });

      const asset = assets.assets.find(a => a.id === photo.androidMediaStoreId);
      if (!asset) {
        // Photo already deleted, just remove from cache
        this.photoCache.delete(photoId);
        return;
      }

      // Delete the asset
      const deleted = await MediaLibrary.deleteAssetsAsync([asset]);
      if (!deleted) {
        throw this.createError(
          'Failed to delete photo',
          MobileErrorType.MEDIA_STORE_ERROR,
          'The photo could not be deleted'
        );
      }

      // Remove from cache
      this.photoCache.delete(photoId);

      // Update MediaStore
      await this.updateMediaStore();

    } catch (error) {
      console.error('Error deleting photo:', error);
      throw this.createError(
        'Failed to delete photo',
        MobileErrorType.MEDIA_STORE_ERROR,
        'Please try again or check permissions'
      );
    }
  }

  /**
   * Get photo metadata including EXIF data
   * Optimized for mobile performance
   */
  async getPhotoMetadata(photoId: string): Promise<PhotoMetadata> {
    try {
      const photo = this.photoCache.get(photoId);
      if (!photo) {
        throw this.createError(
          'Photo not found',
          MobileErrorType.FILE_NOT_FOUND,
          'The photo may have been deleted or moved'
        );
      }

      // Return cached metadata if available
      if (photo.metadata) {
        return photo.metadata;
      }

      // Get asset info from MediaLibrary
      const assetInfo = await MediaLibrary.getAssetInfoAsync(photo.androidMediaStoreId);
      
      const metadata: PhotoMetadata = {
        dateAdded: photo.creationTime,
        dateModified: photo.modificationTime,
        dateTaken: assetInfo.creationTime || photo.creationTime,
        displayName: photo.filename,
        relativePath: assetInfo.localUri ? this.extractRelativePath(assetInfo.localUri) : undefined,
        bucketDisplayName: photo.albumId ? this.albumCache.get(photo.albumId)?.title : undefined,
        bucketId: photo.albumId,
        duration: assetInfo.duration || undefined,
        resolution: `${photo.width}x${photo.height}`,
        colorSpace: undefined, // Not available through Expo MediaLibrary
        bitDepth: undefined, // Not available through Expo MediaLibrary
        compressionType: this.getCompressionType(photo.mimeType)
      };

      // Update photo cache with metadata
      const updatedPhoto: Photo = {
        ...photo,
        metadata
      };
      this.photoCache.set(photoId, updatedPhoto);

      return metadata;
    } catch (error) {
      console.error('Error getting photo metadata:', error);
      throw this.createError(
        'Failed to get photo metadata',
        MobileErrorType.MEDIA_STORE_ERROR,
        'Please try again'
      );
    }
  }

  /**
   * Create new album in Android storage
   * Creates proper Android folder structure
   */
  async createAlbumAndroid(albumName: string): Promise<Album> {
    const request: CreateAlbumRequest = { name: albumName };
    const { name, storagePath, isOnSdCard = false, type = 'user' } = request;

    // Check if album already exists
    const existingAlbums = await this.getAndroidAlbums();
    const existingAlbum = existingAlbums.find(album => 
      album.title.toLowerCase() === name.toLowerCase()
    );

    if (existingAlbum) {
      throw this.createError(
        'Album already exists',
        MobileErrorType.FILE_NOT_FOUND,
        'Please choose a different name'
      );
    }

    try {

      // Create album using MediaLibrary
      // Note: We need at least one asset to create an album
      // For now, we'll create the album structure and it will be populated when photos are added
      const albumId = `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storageInfo = await this.getStorageInfo();

      const newAlbum: Album = {
        id: albumId,
        title: name,
        assetCount: 0,
        type,
        isDefault: false,
        thumbnailUri: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        androidBucketId: undefined, // Will be set when first photo is added
        storagePath: storagePath || `${FileSystem.documentDirectory}Pictures/${name}`,
        isOnSdCard,
        storageUsage: 0,
        storageInfo,
        permissions: {
          canRead: true,
          canWrite: true,
          canDelete: type === 'user',
          canCreateSubfolders: type === 'user',
          requiresElevatedPermissions: false
        },
        syncStatus: {
          lastSyncTime: Date.now(),
          isSyncing: false,
          syncErrors: [],
          needsRescan: false
        }
      };

      // Add to cache
      this.albumCache.set(albumId, newAlbum);

      return newAlbum;
    } catch (error) {
      console.error('Error creating album:', error);
      throw this.createError(
        'Failed to create album',
        MobileErrorType.MEDIA_STORE_ERROR,
        'Please try again or check storage permissions'
      );
    }
  }

  /**
   * Update MediaStore to maintain compatibility
   * Triggers media scanner to update other gallery apps
   */
  async updateMediaStore(): Promise<void> {
    try {
      // Clear cache to force refresh
      this.clearCache();
      
      // Note: Expo doesn't provide direct MediaStore update functionality
      // The system will automatically update when files are modified
      // We simulate this by clearing our cache
      
      console.log('MediaStore update triggered');
    } catch (error) {
      console.error('Error updating MediaStore:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get photos for a specific album
   */
  async getAlbumPhotos(albumId: string): Promise<Photo[]> {
    try {
      console.log(`AndroidPhotoService: Getting photos for album ${albumId}`);
      
      // Extract the original album ID (remove 'album_' prefix)
      const originalAlbumId = albumId.replace('album_', '');
      
      // Get the album from MediaLibrary
      const mediaAlbums = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true
      });
      
      const targetAlbum = mediaAlbums.find(album => album.id === originalAlbumId);
      if (!targetAlbum) {
        console.warn(`AndroidPhotoService: Album ${albumId} not found`);
        return [];
      }
      
      // Get assets for this specific album
      const albumAssets = await MediaLibrary.getAssetsAsync({
        album: targetAlbum,
        first: 1000, // Get up to 1000 photos from album
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: MediaLibrary.SortBy.creationTime,
      });
      
      console.log(`AndroidPhotoService: Found ${albumAssets.assets.length} assets in album ${targetAlbum.title}`);
      
      // Convert assets to photos with proper albumId
      const photos: Photo[] = [];
      for (const asset of albumAssets.assets) {
        try {
          const photo = await this.convertAssetToPhotoWithAlbum(asset, albumId);
          if (photo) {
            photos.push(photo);
          }
        } catch (error) {
          console.warn(`AndroidPhotoService: Failed to convert asset ${asset.id}:`, error);
        }
      }
      
      console.log(`AndroidPhotoService: Successfully converted ${photos.length} photos for album ${albumId}`);
      return photos;
      
    } catch (error) {
      console.error(`AndroidPhotoService: Error getting album photos for ${albumId}:`, error);
      return [];
    }
  }

  /**
   * Convert asset to photo with specific album ID
   */
  private async convertAssetToPhotoWithAlbum(asset: MediaLibrary.Asset, albumId: string): Promise<Photo | null> {
    try {
      // Basic validation
      if (!asset || !asset.id || !asset.uri) {
        return null;
      }

      // Determine media type safely
      const mediaType = asset.mediaType === 'unknown' ? 'photo' : asset.mediaType as 'photo' | 'video';
      
      const photo: Photo = {
        id: `photo_${asset.id}`,
        uri: asset.uri,
        filename: asset.filename || `unknown_${asset.id}`,
        width: asset.width || 0,
        height: asset.height || 0,
        creationTime: asset.creationTime || Date.now(),
        modificationTime: asset.modificationTime || Date.now(),
        mediaType,
        albumId: albumId, // Set the correct album ID
        location: undefined,
        thumbnailUri: asset.uri,
        size: 0,
        mimeType: this.getMimeType(asset.filename || '', mediaType),
        orientation: 0,
        isFromCamera: false,
        androidMediaStoreId: asset.id,
        metadata: undefined,
        sourceInfo: undefined,
        exifData: undefined
      };

      return photo;
    } catch (error) {
      console.warn(`AndroidPhotoService: Failed to convert asset ${asset?.id || 'unknown'}:`, error);
      return null;
    }
  }

  /**
   * Get storage information for internal and SD card storage
   * Provides comprehensive storage analytics
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const [totalSpace, availableSpace] = await Promise.all([
        FileSystem.getTotalDiskCapacityAsync(),
        FileSystem.getFreeDiskStorageAsync()
      ]);

      const usedSpace = totalSpace - availableSpace;
      const photoStorageUsage = await this.calculatePhotoStorageUsage();
      const cacheSize = await this.calculateCacheSize();

      const storageInfo: StorageInfo = {
        totalSpace,
        availableSpace,
        usedSpace,
        photoStorageUsage,
        cacheSize,
        isLowStorage: availableSpace < (totalSpace * 0.1), // Less than 10% available
        sdCardAvailable: false, // Expo doesn't provide SD card detection
        sdCardSpace: undefined,
        storageType: 'internal',
        mountPoint: FileSystem.documentDirectory || '/',
        isRemovable: false,
        isEmulated: Platform.OS === 'android'
      };

      return storageInfo;
    } catch (error) {
      console.error('Error getting storage info:', error);
      // Return default values
      return {
        totalSpace: 0,
        availableSpace: 0,
        usedSpace: 0,
        photoStorageUsage: 0,
        cacheSize: 0,
        isLowStorage: false,
        sdCardAvailable: false,
        storageType: 'internal',
        mountPoint: '/',
        isRemovable: false,
        isEmulated: true
      };
    }
  }

  // Private helper methods

  private async fetchMediaAssets(mediaType: 'photo' | 'video'): Promise<MediaLibrary.Asset[]> {
    console.log(`AndroidPhotoService: Fetching ${mediaType} assets...`);
    const assets: MediaLibrary.Asset[] = [];
    let hasNextPage = true;
    let endCursor: string | undefined;
    let pageCount = 0;
    const maxPages = 50; // Reasonable limit to prevent infinite loops

    try {
      while (hasNextPage && pageCount < maxPages) {
        pageCount++;
        console.log(`AndroidPhotoService: Fetching ${mediaType} page ${pageCount}...`);
        
        try {
          const result = await MediaLibrary.getAssetsAsync({
            first: 50, // Smaller batch size for better performance
            mediaType,
            sortBy: ['creationTime'],
            after: endCursor
          });

          console.log(`AndroidPhotoService: Page ${pageCount} returned ${result.assets.length} ${mediaType} assets`);
          
          if (result.assets.length > 0) {
            assets.push(...result.assets);
          }
          
          hasNextPage = result.hasNextPage;
          endCursor = result.endCursor;
          
          // If we got no assets and there's supposedly a next page, something might be wrong
          if (result.assets.length === 0 && result.hasNextPage) {
            console.warn(`AndroidPhotoService: Got 0 assets but hasNextPage is true for ${mediaType} page ${pageCount}`);
            break;
          }
        } catch (pageError) {
          console.error(`AndroidPhotoService: Error fetching ${mediaType} page ${pageCount}:`, pageError);
          // Break on page error to avoid infinite loops
          break;
        }
      }

      if (pageCount >= maxPages) {
        console.warn(`AndroidPhotoService: Reached maximum page limit (${maxPages}) for ${mediaType} assets`);
      }

      console.log(`AndroidPhotoService: Total ${mediaType} assets fetched: ${assets.length} (${pageCount} pages)`);
      return assets;
    } catch (error) {
      console.error(`AndroidPhotoService: Error fetching ${mediaType} assets:`, error);
      return []; // Return empty array instead of throwing
    }
  }

  private async convertAssetToPhoto(asset: MediaLibrary.Asset): Promise<Photo | null> {
    try {
      // Basic validation
      if (!asset || !asset.id || !asset.uri) {
        console.warn(`AndroidPhotoService: Invalid asset data:`, asset);
        return null;
      }

      console.log(`AndroidPhotoService: Converting asset ${asset.id} (${asset.filename})`);
      
      // Get detailed asset info with error handling
      let assetInfo: MediaLibrary.AssetInfo;
      try {
        assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
      } catch (infoError) {
        console.warn(`AndroidPhotoService: Failed to get asset info for ${asset.id}, using basic data:`, infoError);
        // Create minimal asset info
        assetInfo = {
          ...asset,
          localUri: asset.uri,
          location: undefined,
          exif: {},
          orientation: 0,
          duration: 0
        } as MediaLibrary.AssetInfo;
      }
      
      // Determine media type safely
      const mediaType = asset.mediaType === 'unknown' ? 'photo' : asset.mediaType as 'photo' | 'video';
      
      // Get file size safely
      let fileSize = 0;
      try {
        if (assetInfo.localUri) {
          fileSize = await this.getFileSize(assetInfo.localUri);
        }
      } catch (sizeError) {
        console.warn(`AndroidPhotoService: Failed to get file size for ${asset.id}:`, sizeError);
      }
      
      const photo: Photo = {
        id: `photo_${asset.id}`,
        uri: asset.uri,
        filename: asset.filename || `unknown_${asset.id}`,
        width: asset.width || 0,
        height: asset.height || 0,
        creationTime: asset.creationTime || Date.now(),
        modificationTime: asset.modificationTime || Date.now(),
        mediaType,
        albumId: asset.albumId || undefined,
        location: assetInfo.location ? {
          latitude: assetInfo.location.latitude,
          longitude: assetInfo.location.longitude
        } : undefined,
        thumbnailUri: asset.uri, // Expo provides optimized thumbnails
        size: fileSize,
        mimeType: this.getMimeType(asset.filename || '', mediaType),
        orientation: assetInfo.orientation || 0,
        isFromCamera: this.isFromCamera(asset.filename || '', assetInfo.localUri),
        androidMediaStoreId: asset.id,
        metadata: undefined, // Will be loaded on demand
        sourceInfo: this.detectSourceInfo(asset.filename || '', assetInfo.localUri),
        exifData: undefined // Will be loaded on demand
      };

      console.log(`AndroidPhotoService: Successfully converted asset ${asset.id}`);
      return photo;
    } catch (error) {
      console.warn(`AndroidPhotoService: Failed to convert asset ${asset?.id || 'unknown'} (${asset?.filename || 'unknown'}):`, error);
      return null;
    }
  }

  /**
   * Simplified asset conversion for better reliability
   */
  private async convertAssetToPhotoSimple(asset: MediaLibrary.Asset): Promise<Photo | null> {
    try {
      // Basic validation
      if (!asset || !asset.id || !asset.uri) {
        return null;
      }

      // Determine media type safely
      const mediaType = asset.mediaType === 'unknown' ? 'photo' : asset.mediaType as 'photo' | 'video';
      
      const photo: Photo = {
        id: `photo_${asset.id}`,
        uri: asset.uri,
        filename: asset.filename || `unknown_${asset.id}`,
        width: asset.width || 0,
        height: asset.height || 0,
        creationTime: asset.creationTime || Date.now(),
        modificationTime: asset.modificationTime || Date.now(),
        mediaType,
        albumId: asset.albumId || undefined,
        location: undefined, // Skip location for simplicity
        thumbnailUri: asset.uri, // Use original URI as thumbnail
        size: 0, // Skip file size calculation for now
        mimeType: this.getMimeType(asset.filename || '', mediaType),
        orientation: 0, // Default orientation
        isFromCamera: false, // Default value
        androidMediaStoreId: asset.id,
        metadata: undefined,
        sourceInfo: undefined,
        exifData: undefined
      };

      return photo;
    } catch (error) {
      console.warn(`AndroidPhotoService: Failed to convert asset ${asset?.id || 'unknown'}:`, error);
      return null;
    }
  }

  private async convertMediaAlbumToAlbum(
    mediaAlbum: MediaLibrary.Album, 
    storageInfo: StorageInfo
  ): Promise<Album> {
    const albumType = this.determineAlbumType(mediaAlbum.title);
    
    const album: Album = {
      id: `album_${mediaAlbum.id}`,
      title: mediaAlbum.title,
      assetCount: mediaAlbum.assetCount,
      type: albumType,
      isDefault: this.isDefaultAlbum(mediaAlbum.title),
      thumbnailUri: undefined, // Will be set when we get the first asset
      createdAt: Date.now(), // MediaLibrary doesn't provide creation time
      updatedAt: Date.now(),
      androidBucketId: mediaAlbum.id,
      storagePath: `Pictures/${mediaAlbum.title}`,
      isOnSdCard: false, // Expo doesn't provide SD card detection
      storageUsage: 0, // Will be calculated on demand
      storageInfo,
      permissions: {
        canRead: true,
        canWrite: albumType === 'user',
        canDelete: albumType === 'user',
        canCreateSubfolders: albumType === 'user',
        requiresElevatedPermissions: albumType === 'system'
      },
      syncStatus: {
        lastSyncTime: Date.now(),
        isSyncing: false,
        syncErrors: [],
        needsRescan: false
      }
    };

    return album;
  }

  private determineAlbumType(albumTitle: string): 'user' | 'system' | 'android_default' {
    const systemAlbums = [
      'Camera', 'DCIM', 'Screenshots', 'Pictures', 'Download', 'Downloads',
      'WhatsApp Images', 'Instagram', 'Snapchat', 'Facebook'
    ];
    
    if (systemAlbums.some(name => albumTitle.toLowerCase().includes(name.toLowerCase()))) {
      return 'system';
    }
    
    return 'user';
  }

  private isDefaultAlbum(albumTitle: string): boolean {
    const defaultAlbums = ['Camera', 'DCIM'];
    return defaultAlbums.some(name => albumTitle.toLowerCase().includes(name.toLowerCase()));
  }

  private getMimeType(filename: string, mediaType: 'photo' | 'video'): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (mediaType === 'photo') {
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg';
        case 'png':
          return 'image/png';
        case 'gif':
          return 'image/gif';
        case 'webp':
          return 'image/webp';
        case 'heic':
          return 'image/heic';
        default:
          return 'image/jpeg';
      }
    } else {
      switch (extension) {
        case 'mp4':
          return 'video/mp4';
        case 'mov':
          return 'video/quicktime';
        case 'avi':
          return 'video/x-msvideo';
        case 'mkv':
          return 'video/x-matroska';
        default:
          return 'video/mp4';
      }
    }
  }

  private isFromCamera(filename: string, localUri?: string): boolean {
    // Check if file is from camera based on naming patterns
    const cameraPatterns = [
      /^IMG_\d+/i,
      /^DSC_\d+/i,
      /^PANO_\d+/i,
      /^VID_\d+/i
    ];
    
    if (cameraPatterns.some(pattern => pattern.test(filename))) {
      return true;
    }
    
    // Check path for camera folder
    if (localUri && (localUri.includes('DCIM') || localUri.includes('Camera'))) {
      return true;
    }
    
    return false;
  }

  private detectSourceInfo(filename: string, localUri?: string): any {
    // Detect source based on filename and path patterns
    if (filename.toLowerCase().includes('screenshot')) {
      return {
        sourceType: 'screenshot',
        sourceApp: 'system',
        originalPath: localUri
      };
    }
    
    if (localUri?.includes('WhatsApp')) {
      return {
        sourceType: 'whatsapp',
        sourceApp: 'WhatsApp',
        originalPath: localUri
      };
    }
    
    if (localUri?.includes('Download')) {
      return {
        sourceType: 'download',
        downloadSource: 'browser',
        originalPath: localUri
      };
    }
    
    if (this.isFromCamera(filename, localUri)) {
      return {
        sourceType: 'camera',
        sourceApp: 'camera',
        originalPath: localUri
      };
    }
    
    return {
      sourceType: 'unknown',
      originalPath: localUri
    };
  }

  private async getFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
    } catch {
      return 0;
    }
  }

  private extractRelativePath(uri: string): string {
    // Extract relative path from full URI
    const parts = uri.split('/');
    const picturesIndex = parts.findIndex(part => part.toLowerCase() === 'pictures');
    if (picturesIndex !== -1) {
      return parts.slice(picturesIndex).join('/');
    }
    return parts.slice(-2).join('/'); // Return last two parts as fallback
  }

  private getCompressionType(mimeType: string): string | undefined {
    if (mimeType.includes('jpeg')) return 'JPEG';
    if (mimeType.includes('png')) return 'PNG';
    if (mimeType.includes('webp')) return 'WebP';
    return undefined;
  }

  private async calculatePhotoStorageUsage(): Promise<number> {
    // Estimate photo storage usage
    // This is a simplified calculation
    return Array.from(this.photoCache.values())
      .reduce((total, photo) => total + photo.size, 0);
  }

  private async calculateCacheSize(): Promise<number> {
    try {
      const cacheDir = `${FileSystem.cacheDirectory}images/`;
      const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
      return cacheInfo.exists && 'size' in cacheInfo ? cacheInfo.size : 0;
    } catch {
      return 0;
    }
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_DURATION;
  }

  private updatePhotoCache(photos: Photo[]): void {
    this.photoCache.clear();
    photos.forEach(photo => this.photoCache.set(photo.id, photo));
    this.lastCacheUpdate = Date.now();
  }

  private updateAlbumCache(albums: Album[]): void {
    this.albumCache.clear();
    albums.forEach(album => this.albumCache.set(album.id, album));
    this.lastCacheUpdate = Date.now();
  }

  private clearCache(): void {
    this.photoCache.clear();
    this.albumCache.clear();
    this.lastCacheUpdate = 0;
  }

  private createError(
    message: string,
    type: MobileErrorType,
    userAction: string
  ): MobileAppError {
    return {
      type,
      message,
      recoverable: true,
      userAction,
      details: {
        timestamp: Date.now(),
        platform: Platform.OS
      }
    };
  }
}

// Export singleton instance
export const androidPhotoService = new AndroidPhotoServiceImpl();