import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  MobileAppState, 
  Photo, 
  Album, 
  SwipeConfiguration, 
  MobilePermissions, 
  DeviceInfo, 
  MobileAppSettings, 
  UIState, 
  PerformanceMetrics,
  MobileAppError,
  PhotoOperationResult,
  BatchOperationResult
} from '../types';
import { androidPhotoService, androidPermissionService, androidPhotoFileOperations } from '../services';
import { createDefaultSwipeConfiguration, createDefaultGestureConfig } from '../types/validation';

/**
 * Mobile App Store Interface
 * Defines all actions available in the mobile app store
 */
interface MobileAppStore extends MobileAppState {
  // Photo operations
  loadPhotos: () => Promise<void>;
  refreshPhotos: () => Promise<void>;
  selectPhoto: (photoId: string) => void;
  deselectPhoto: (photoId: string) => void;
  clearSelection: () => void;
  setCurrentPhoto: (photo: Photo | null) => void;
  
  // Album operations
  loadAlbums: () => Promise<void>;
  createAlbum: (name: string, storagePath?: string) => Promise<Album>;
  deleteAlbum: (albumId: string) => Promise<void>;
  
  // Photo file operations
  movePhoto: (photoId: string, targetAlbumId: string) => Promise<PhotoOperationResult>;
  copyPhoto: (photoId: string, targetAlbumId: string) => Promise<PhotoOperationResult>;
  deletePhoto: (photoId: string) => Promise<PhotoOperationResult>;
  processBatchOperations: (operations: Array<{
    type: 'move' | 'copy' | 'delete';
    photoId: string;
    targetAlbumId?: string;
  }>) => Promise<BatchOperationResult>;
  
  // Swipe configuration
  updateSwipeConfig: (config: Partial<SwipeConfiguration>) => void;
  resetSwipeConfig: () => void;
  
  // Permission management
  checkPermissions: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  
  // Settings management
  updateSettings: (settings: Partial<MobileAppSettings>) => void;
  resetSettings: () => void;
  
  // UI state management
  setFullscreen: (isFullscreen: boolean) => void;
  setSelectionMode: (isSelectionMode: boolean) => void;
  setCurrentScreen: (screen: string) => void;
  setOrientation: (orientation: 'portrait' | 'landscape') => void;
  updateSafeAreaInsets: (insets: { top: number; bottom: number; left: number; right: number }) => void;
  
  // Error handling
  setError: (error: MobileAppError | null) => void;
  clearError: () => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  
  // Performance monitoring
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  
  // Device info
  updateDeviceInfo: (deviceInfo: Partial<DeviceInfo>) => void;
  
  // Offline/sync operations
  syncWithMediaStore: () => Promise<void>;
  handleOfflineOperations: () => Promise<void>;
}

/**
 * Default mobile app state
 */
const defaultState: MobileAppState = {
  photos: [],
  albums: [],
  currentPhoto: null,
  swipeConfig: createDefaultSwipeConfiguration(),
  loading: false,
  error: null,
  permissions: {
    mediaLibrary: false,
    storage: false,
    camera: false,
    location: false,
    notifications: false,
    writeExternalStorage: false,
    readExternalStorage: false,
    manageExternalStorage: false,
    accessMediaLocation: false,
    lastPermissionCheck: 0,
    permissionRationale: {}
  },
  deviceInfo: {
    screenWidth: 0,
    screenHeight: 0,
    pixelDensity: 1,
    androidVersion: 0,
    androidApiLevel: 0,
    availableStorage: 0,
    totalStorage: 0,
    deviceModel: '',
    deviceManufacturer: '',
    isTablet: false,
    hasNotch: false,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    supportedOrientations: ['portrait'],
    hasHapticFeedback: false,
    batteryLevel: undefined,
    isLowPowerMode: false,
    networkType: 'none',
    storageInfo: {
      totalSpace: 0,
      availableSpace: 0,
      usedSpace: 0,
      photoStorageUsage: 0,
      cacheSize: 0,
      isLowStorage: false,
      sdCardAvailable: false,
      storageType: 'internal',
      mountPoint: undefined,
      isRemovable: false,
      isEmulated: true
    }
  },
  settings: {
    gridColumns: 3,
    hapticFeedback: true,
    darkMode: false,
    autoBackup: false,
    deleteConfirmation: true,
    thumbnailQuality: 'medium',
    preloadAdjacentPhotos: true,
    autoRotatePhotos: true,
    showMetadataOverlay: false,
    enableGestureHints: true,
    cacheSize: 100 * 1024 * 1024, // 100MB
    backgroundSync: true,
    lowStorageWarning: true,
    compressionLevel: 80,
    videoAutoPlay: false,
    gestureTimeout: 300,
    undoTimeout: 5000,
    animationsEnabled: true,
    accessibilityMode: false,
    language: 'en',
    dateFormat: 'MM/dd/yyyy',
    theme: 'system'
  },
  ui: {
    currentScreen: 'gallery',
    isFullscreen: false,
    showingMetadata: false,
    selectedPhotos: [],
    isSelectionMode: false,
    showingAlbumPicker: false,
    keyboardVisible: false,
    orientation: 'portrait',
    statusBarHeight: 0,
    navigationBarHeight: 0,
    activeGesture: null,
    lastUserInteraction: Date.now()
  },
  performance: {
    memoryUsage: 0,
    cpuUsage: 0,
    frameRate: 60,
    loadTime: 0,
    gestureResponseTime: 0,
    thumbnailLoadTime: 0,
    cacheHitRate: 0,
    errorCount: 0,
    crashCount: 0,
    lastPerformanceCheck: Date.now()
  }
};

/**
 * Mobile App Store
 * Zustand store with persistence and middleware for mobile app state management
 */
export const useMobileAppStore = create<MobileAppStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...defaultState,

        // Photo operations
        loadPhotos: async () => {
          console.log('MobileAppStore: Starting loadPhotos...');
          set({ loading: true, error: null });
          try {
            console.log('MobileAppStore: Calling androidPhotoService.getAllPhotos()...');
            const photos = await androidPhotoService.getAllPhotos();
            console.log(`MobileAppStore: Received ${photos.length} photos from service`);
            
            if (photos.length === 0) {
              console.warn('MobileAppStore: No photos returned from service');
            }
            
            set({ photos, loading: false });
            console.log('MobileAppStore: Photos loaded successfully');
          } catch (error) {
            console.error('MobileAppStore: Error loading photos:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            set({ 
              error: {
                type: 'MEDIA_STORE_ERROR' as any,
                message: `Failed to load photos: ${errorMessage}`,
                details: error,
                recoverable: true,
                userAction: 'Try refreshing the photo library'
              },
              loading: false,
              photos: [] // Clear photos on error
            });
          }
        },

        refreshPhotos: async () => {
          const { loadPhotos } = get();
          await loadPhotos();
        },

        selectPhoto: (photoId: string) => {
          const { ui } = get();
          const selectedPhotos = [...ui.selectedPhotos];
          if (!selectedPhotos.includes(photoId)) {
            selectedPhotos.push(photoId);
            set({ 
              ui: { 
                ...ui, 
                selectedPhotos,
                isSelectionMode: selectedPhotos.length > 0
              } 
            });
          }
        },

        deselectPhoto: (photoId: string) => {
          const { ui } = get();
          const selectedPhotos = ui.selectedPhotos.filter(id => id !== photoId);
          set({ 
            ui: { 
              ...ui, 
              selectedPhotos,
              isSelectionMode: selectedPhotos.length > 0
            } 
          });
        },

        clearSelection: () => {
          const { ui } = get();
          set({ 
            ui: { 
              ...ui, 
              selectedPhotos: [],
              isSelectionMode: false
            } 
          });
        },

        setCurrentPhoto: (photo: Photo | null) => {
          set({ currentPhoto: photo });
        },

        // Album operations
        loadAlbums: async () => {
          set({ loading: true, error: null });
          try {
            const albums = await androidPhotoService.getAndroidAlbums();
            set({ albums, loading: false });
          } catch (error) {
            console.error('Error loading albums:', error);
            set({ 
              error: {
                type: 'MEDIA_STORE_ERROR' as any,
                message: 'Failed to load albums',
                details: error,
                recoverable: true,
                userAction: 'Try refreshing the album list'
              },
              loading: false 
            });
          }
        },

        createAlbum: async (name: string, storagePath?: string) => {
          set({ loading: true, error: null });
          try {
            const album = await androidPhotoFileOperations.createAlbumAndroid({
              name,
              storagePath,
              type: 'user'
            });
            
            const { albums } = get();
            set({ 
              albums: [...albums, album],
              loading: false 
            });
            
            return album;
          } catch (error) {
            console.error('Error creating album:', error);
            set({ 
              error: {
                type: 'MEDIA_STORE_ERROR' as any,
                message: 'Failed to create album',
                details: error,
                recoverable: true,
                userAction: 'Try a different album name'
              },
              loading: false 
            });
            throw error;
          }
        },

        deleteAlbum: async (albumId: string) => {
          set({ loading: true, error: null });
          try {
            // Implementation would depend on AndroidPhotoService having deleteAlbum method
            const { albums } = get();
            const updatedAlbums = albums.filter(album => album.id !== albumId);
            set({ albums: updatedAlbums, loading: false });
          } catch (error) {
            console.error('Error deleting album:', error);
            set({ 
              error: {
                type: 'MEDIA_STORE_ERROR' as any,
                message: 'Failed to delete album',
                details: error,
                recoverable: true,
                userAction: 'Try again or check album permissions'
              },
              loading: false 
            });
          }
        },

        // Photo file operations
        movePhoto: async (photoId: string, targetAlbumId: string) => {
          set({ loading: true, error: null });
          try {
            const result = await androidPhotoFileOperations.movePhotoAndroid(photoId, targetAlbumId);
            
            if (result.success) {
              // Update local state
              const { photos } = get();
              const updatedPhotos = photos.map(photo => 
                photo.id === photoId 
                  ? { ...photo, albumId: targetAlbumId }
                  : photo
              );
              set({ photos: updatedPhotos, loading: false });
            } else {
              set({ 
                error: result.error || null,
                loading: false 
              });
            }
            
            return result;
          } catch (error) {
            console.error('Error moving photo:', error);
            const errorResult: PhotoOperationResult = {
              success: false,
              error: {
                type: 'MEDIA_STORE_ERROR' as any,
                message: 'Failed to move photo',
                details: error,
                recoverable: true,
                userAction: 'Try again or check permissions'
              },
              photoId,
              operation: 'move',
              targetAlbumId
            };
            set({ error: errorResult.error, loading: false });
            return errorResult;
          }
        },

        copyPhoto: async (photoId: string, targetAlbumId: string) => {
          set({ loading: true, error: null });
          try {
            const result = await androidPhotoFileOperations.copyPhotoAndroid(photoId, targetAlbumId);
            set({ loading: false });
            
            if (!result.success) {
              set({ error: result.error || null });
            }
            
            return result;
          } catch (error) {
            console.error('Error copying photo:', error);
            const errorResult: PhotoOperationResult = {
              success: false,
              error: {
                type: 'MEDIA_STORE_ERROR' as any,
                message: 'Failed to copy photo',
                details: error,
                recoverable: true,
                userAction: 'Try again or check storage space'
              },
              photoId,
              operation: 'copy',
              targetAlbumId
            };
            set({ error: errorResult.error, loading: false });
            return errorResult;
          }
        },

        deletePhoto: async (photoId: string) => {
          set({ loading: true, error: null });
          try {
            const result = await androidPhotoFileOperations.deletePhotoAndroid(photoId);
            
            if (result.success) {
              // Remove from local state
              const { photos } = get();
              const updatedPhotos = photos.filter(photo => photo.id !== photoId);
              set({ photos: updatedPhotos, loading: false });
            } else {
              set({ 
                error: result.error || null,
                loading: false 
              });
            }
            
            return result;
          } catch (error) {
            console.error('Error deleting photo:', error);
            const errorResult: PhotoOperationResult = {
              success: false,
              error: {
                type: 'MEDIA_STORE_ERROR' as any,
                message: 'Failed to delete photo',
                details: error,
                recoverable: true,
                userAction: 'Try again or check permissions'
              },
              photoId,
              operation: 'delete'
            };
            set({ error: errorResult.error, loading: false });
            return errorResult;
          }
        },

        processBatchOperations: async (operations) => {
          set({ loading: true, error: null });
          try {
            const result = await androidPhotoFileOperations.processBatchOperations(operations);
            
            // Update local state based on successful operations
            if (result.successfulOperations > 0) {
              await get().refreshPhotos();
            }
            
            if (result.errors.length > 0) {
              set({ error: result.errors[0] });
            }
            
            set({ loading: false });
            return result;
          } catch (error) {
            console.error('Error processing batch operations:', error);
            const errorResult: BatchOperationResult = {
              totalOperations: operations.length,
              successfulOperations: 0,
              failedOperations: operations.length,
              results: [],
              errors: [{
                type: 'MEDIA_STORE_ERROR' as any,
                message: 'Failed to process batch operations',
                details: error,
                recoverable: true,
                userAction: 'Try again with fewer operations'
              }]
            };
            set({ error: errorResult.errors[0], loading: false });
            return errorResult;
          }
        },

        // Swipe configuration
        updateSwipeConfig: (config: Partial<SwipeConfiguration>) => {
          const { swipeConfig } = get();
          const updatedConfig = {
            ...swipeConfig,
            ...config,
            lastModified: Date.now(),
            version: swipeConfig.version + 1
          };
          set({ swipeConfig: updatedConfig });
        },

        resetSwipeConfig: () => {
          set({ swipeConfig: createDefaultSwipeConfiguration() });
        },

        // Permission management
        checkPermissions: async () => {
          try {
            const status = await androidPermissionService.checkPermissionStatus();
            const { permissions } = get();
            const hasPermissions = status.granted;
            set({
              permissions: {
                ...permissions,
                mediaLibrary: hasPermissions,
                storage: hasPermissions,
                lastPermissionCheck: Date.now()
              }
            });
            return hasPermissions;
          } catch (error) {
            console.error('Error checking permissions:', error);
            return false;
          }
        },

        requestPermissions: async () => {
          try {
            const granted = await androidPermissionService.requestAllPermissions();
            const { permissions } = get();
            set({
              permissions: {
                ...permissions,
                mediaLibrary: granted,
                storage: granted,
                lastPermissionCheck: Date.now()
              }
            });
            return granted;
          } catch (error) {
            console.error('Error requesting permissions:', error);
            return false;
          }
        },

        // Settings management
        updateSettings: (newSettings: Partial<MobileAppSettings>) => {
          const { settings } = get();
          set({ settings: { ...settings, ...newSettings } });
        },

        resetSettings: () => {
          set({ settings: defaultState.settings });
        },

        // UI state management
        setFullscreen: (isFullscreen: boolean) => {
          const { ui } = get();
          set({ ui: { ...ui, isFullscreen } });
        },

        setSelectionMode: (isSelectionMode: boolean) => {
          const { ui } = get();
          set({ 
            ui: { 
              ...ui, 
              isSelectionMode,
              selectedPhotos: isSelectionMode ? ui.selectedPhotos : []
            } 
          });
        },

        setCurrentScreen: (currentScreen: string) => {
          const { ui } = get();
          set({ ui: { ...ui, currentScreen } });
        },

        setOrientation: (orientation: 'portrait' | 'landscape') => {
          const { ui } = get();
          set({ ui: { ...ui, orientation } });
        },

        updateSafeAreaInsets: (safeAreaInsets) => {
          const { deviceInfo } = get();
          set({ 
            deviceInfo: { ...deviceInfo, safeAreaInsets },
            ui: { 
              ...get().ui, 
              statusBarHeight: safeAreaInsets.top,
              navigationBarHeight: safeAreaInsets.bottom
            }
          });
        },

        // Error handling
        setError: (error: MobileAppError | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        // Loading states
        setLoading: (loading: boolean) => {
          set({ loading });
        },

        // Performance monitoring
        updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => {
          const { performance } = get();
          set({ 
            performance: { 
              ...performance, 
              ...metrics,
              lastPerformanceCheck: Date.now()
            } 
          });
        },

        // Device info
        updateDeviceInfo: (newDeviceInfo: Partial<DeviceInfo>) => {
          const { deviceInfo } = get();
          set({ deviceInfo: { ...deviceInfo, ...newDeviceInfo } });
        },

        // Offline/sync operations
        syncWithMediaStore: async () => {
          set({ loading: true });
          try {
            await androidPhotoFileOperations.updateMediaStore();
            await get().refreshPhotos();
            await get().loadAlbums();
            set({ loading: false });
          } catch (error) {
            console.error('Error syncing with MediaStore:', error);
            set({ 
              error: {
                type: 'MEDIA_STORE_ERROR' as any,
                message: 'Failed to sync with MediaStore',
                details: error,
                recoverable: true,
                userAction: 'Try again later'
              },
              loading: false 
            });
          }
        },

        handleOfflineOperations: async () => {
          // Placeholder for offline operation handling
          // This would queue operations when offline and process them when online
          console.log('Handling offline operations...');
        }
      }),
      {
        name: 'mobile-app-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Only persist certain parts of the state
          swipeConfig: state.swipeConfig,
          settings: state.settings,
          permissions: state.permissions,
          ui: {
            currentScreen: state.ui.currentScreen,
            selectedPhotos: state.ui.selectedPhotos
          }
        })
      }
    )
  )
);

// Selectors for efficient component updates
export const usePhotos = () => useMobileAppStore(state => state.photos);
export const useAlbums = () => useMobileAppStore(state => state.albums);
export const useCurrentPhoto = () => useMobileAppStore(state => state.currentPhoto);
export const useSwipeConfig = () => useMobileAppStore(state => state.swipeConfig);
export const usePermissions = () => useMobileAppStore(state => state.permissions);
export const useSettings = () => useMobileAppStore(state => state.settings);
export const useUIState = () => useMobileAppStore(state => state.ui);
export const useLoading = () => useMobileAppStore(state => state.loading);
export const useError = () => useMobileAppStore(state => state.error);
export const useDeviceInfo = () => useMobileAppStore(state => state.deviceInfo);
export const usePerformanceMetrics = () => useMobileAppStore(state => state.performance);

// Action selectors
export const usePhotoActions = () => useMobileAppStore(state => ({
  loadPhotos: state.loadPhotos,
  refreshPhotos: state.refreshPhotos,
  selectPhoto: state.selectPhoto,
  deselectPhoto: state.deselectPhoto,
  clearSelection: state.clearSelection,
  setCurrentPhoto: state.setCurrentPhoto,
  movePhoto: state.movePhoto,
  copyPhoto: state.copyPhoto,
  deletePhoto: state.deletePhoto,
  processBatchOperations: state.processBatchOperations
}));

export const useAlbumActions = () => useMobileAppStore(state => ({
  loadAlbums: state.loadAlbums,
  createAlbum: state.createAlbum,
  deleteAlbum: state.deleteAlbum
}));

export const useSwipeActions = () => useMobileAppStore(state => ({
  updateSwipeConfig: state.updateSwipeConfig,
  resetSwipeConfig: state.resetSwipeConfig
}));

export const usePermissionActions = () => useMobileAppStore(state => ({
  checkPermissions: state.checkPermissions,
  requestPermissions: state.requestPermissions
}));

export const useUIActions = () => useMobileAppStore(state => ({
  setFullscreen: state.setFullscreen,
  setSelectionMode: state.setSelectionMode,
  setCurrentScreen: state.setCurrentScreen,
  setOrientation: state.setOrientation,
  updateSafeAreaInsets: state.updateSafeAreaInsets
}));

export const useErrorActions = () => useMobileAppStore(state => ({
  setError: state.setError,
  clearError: state.clearError
}));