/**
 * Unit tests for Mobile App Store
 * Tests Zustand store functionality for mobile app state management
 */

import { useMobileAppStore } from '../mobileAppStore';

// Mock the services
jest.mock('../../services', () => ({
  androidPhotoService: {
    getAllPhotos: jest.fn(),
    getAndroidAlbums: jest.fn()
  },
  androidPermissionService: {
    checkPermissionStatus: jest.fn(),
    requestAllPermissions: jest.fn()
  },
  androidPhotoFileOperations: {
    movePhotoAndroid: jest.fn(),
    copyPhotoAndroid: jest.fn(),
    deletePhotoAndroid: jest.fn(),
    createAlbumAndroid: jest.fn(),
    processBatchOperations: jest.fn(),
    updateMediaStore: jest.fn()
  }
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

describe('MobileAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMobileAppStore.setState({
      photos: [],
      albums: [],
      currentPhoto: null,
      loading: false,
      error: null,
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
      }
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useMobileAppStore.getState();
      
      expect(state.photos).toEqual([]);
      expect(state.albums).toEqual([]);
      expect(state.currentPhoto).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ui.isSelectionMode).toBe(false);
      expect(state.ui.selectedPhotos).toEqual([]);
    });
  });

  describe('photo selection', () => {
    it('should select photo', () => {
      const store = useMobileAppStore.getState();
      
      store.selectPhoto('photo1');
      
      const state = useMobileAppStore.getState();
      expect(state.ui.selectedPhotos).toContain('photo1');
      expect(state.ui.isSelectionMode).toBe(true);
    });

    it('should deselect photo', () => {
      const store = useMobileAppStore.getState();
      
      store.selectPhoto('photo1');
      store.selectPhoto('photo2');
      store.deselectPhoto('photo1');
      
      const state = useMobileAppStore.getState();
      expect(state.ui.selectedPhotos).not.toContain('photo1');
      expect(state.ui.selectedPhotos).toContain('photo2');
      expect(state.ui.isSelectionMode).toBe(true);
    });

    it('should clear selection', () => {
      const store = useMobileAppStore.getState();
      
      store.selectPhoto('photo1');
      store.selectPhoto('photo2');
      store.clearSelection();
      
      const state = useMobileAppStore.getState();
      expect(state.ui.selectedPhotos).toEqual([]);
      expect(state.ui.isSelectionMode).toBe(false);
    });

    it('should not duplicate selected photos', () => {
      const store = useMobileAppStore.getState();
      
      store.selectPhoto('photo1');
      store.selectPhoto('photo1'); // Try to select again
      
      const state = useMobileAppStore.getState();
      expect(state.ui.selectedPhotos).toEqual(['photo1']);
    });
  });

  describe('current photo management', () => {
    it('should set current photo', () => {
      const store = useMobileAppStore.getState();
      const mockPhoto = {
        id: 'photo1',
        uri: 'file://photo1.jpg',
        filename: 'photo1.jpg',
        width: 1920,
        height: 1080,
        creationTime: Date.now(),
        modificationTime: Date.now(),
        mediaType: 'photo' as const,
        thumbnailUri: 'file://thumb1.jpg',
        size: 1000000,
        mimeType: 'image/jpeg',
        orientation: 0,
        isFromCamera: false,
        androidMediaStoreId: 'media1'
      };
      
      store.setCurrentPhoto(mockPhoto);
      
      const state = useMobileAppStore.getState();
      expect(state.currentPhoto).toEqual(mockPhoto);
    });

    it('should clear current photo', () => {
      const store = useMobileAppStore.getState();
      
      store.setCurrentPhoto(null);
      
      const state = useMobileAppStore.getState();
      expect(state.currentPhoto).toBeNull();
    });
  });

  describe('UI state management', () => {
    it('should set fullscreen mode', () => {
      const store = useMobileAppStore.getState();
      
      store.setFullscreen(true);
      
      const state = useMobileAppStore.getState();
      expect(state.ui.isFullscreen).toBe(true);
    });

    it('should set selection mode', () => {
      const store = useMobileAppStore.getState();
      
      store.setSelectionMode(true);
      
      const state = useMobileAppStore.getState();
      expect(state.ui.isSelectionMode).toBe(true);
    });

    it('should clear selected photos when disabling selection mode', () => {
      const store = useMobileAppStore.getState();
      
      store.selectPhoto('photo1');
      store.setSelectionMode(false);
      
      const state = useMobileAppStore.getState();
      expect(state.ui.isSelectionMode).toBe(false);
      expect(state.ui.selectedPhotos).toEqual([]);
    });

    it('should set current screen', () => {
      const store = useMobileAppStore.getState();
      
      store.setCurrentScreen('album');
      
      const state = useMobileAppStore.getState();
      expect(state.ui.currentScreen).toBe('album');
    });

    it('should set orientation', () => {
      const store = useMobileAppStore.getState();
      
      store.setOrientation('landscape');
      
      const state = useMobileAppStore.getState();
      expect(state.ui.orientation).toBe('landscape');
    });
  });

  describe('error handling', () => {
    it('should set error', () => {
      const store = useMobileAppStore.getState();
      const error = {
        type: 'MEDIA_STORE_ERROR' as any,
        message: 'Test error',
        details: {},
        recoverable: true,
        userAction: 'Try again'
      };
      
      store.setError(error);
      
      const state = useMobileAppStore.getState();
      expect(state.error).toEqual(error);
    });

    it('should clear error', () => {
      const store = useMobileAppStore.getState();
      
      store.setError({
        type: 'MEDIA_STORE_ERROR' as any,
        message: 'Test error',
        details: {},
        recoverable: true,
        userAction: 'Try again'
      });
      store.clearError();
      
      const state = useMobileAppStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      const store = useMobileAppStore.getState();
      
      store.setLoading(true);
      
      const state = useMobileAppStore.getState();
      expect(state.loading).toBe(true);
    });
  });

  describe('store methods', () => {
    it('should have all required methods', () => {
      const store = useMobileAppStore.getState();
      
      expect(typeof store.loadPhotos).toBe('function');
      expect(typeof store.refreshPhotos).toBe('function');
      expect(typeof store.selectPhoto).toBe('function');
      expect(typeof store.deselectPhoto).toBe('function');
      expect(typeof store.clearSelection).toBe('function');
      expect(typeof store.setCurrentPhoto).toBe('function');
      expect(typeof store.loadAlbums).toBe('function');
      expect(typeof store.createAlbum).toBe('function');
      expect(typeof store.deleteAlbum).toBe('function');
      expect(typeof store.movePhoto).toBe('function');
      expect(typeof store.copyPhoto).toBe('function');
      expect(typeof store.deletePhoto).toBe('function');
      expect(typeof store.processBatchOperations).toBe('function');
      expect(typeof store.updateSwipeConfig).toBe('function');
      expect(typeof store.resetSwipeConfig).toBe('function');
      expect(typeof store.checkPermissions).toBe('function');
      expect(typeof store.requestPermissions).toBe('function');
      expect(typeof store.updateSettings).toBe('function');
      expect(typeof store.resetSettings).toBe('function');
      expect(typeof store.setFullscreen).toBe('function');
      expect(typeof store.setSelectionMode).toBe('function');
      expect(typeof store.setCurrentScreen).toBe('function');
      expect(typeof store.setOrientation).toBe('function');
      expect(typeof store.updateSafeAreaInsets).toBe('function');
      expect(typeof store.setError).toBe('function');
      expect(typeof store.clearError).toBe('function');
      expect(typeof store.setLoading).toBe('function');
      expect(typeof store.updatePerformanceMetrics).toBe('function');
      expect(typeof store.updateDeviceInfo).toBe('function');
      expect(typeof store.syncWithMediaStore).toBe('function');
      expect(typeof store.handleOfflineOperations).toBe('function');
    });
  });
});