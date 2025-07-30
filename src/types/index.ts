// Core data types for Sort It! Mobile Gallery App

export interface Photo {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  creationTime: number;
  modificationTime: number;
  mediaType: 'photo' | 'video';
  albumId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  // Mobile-specific properties
  thumbnailUri: string;
  size: number;
  mimeType: string;
  orientation: number;
  isFromCamera: boolean;
  androidMediaStoreId: string;
  // Enhanced metadata properties for Android MediaStore
  metadata?: PhotoMetadata;
  sourceInfo?: PhotoSourceInfo;
  exifData?: ExifData;
}

export interface PhotoMetadata {
  dateAdded: number;
  dateModified: number;
  dateTaken?: number;
  displayName: string;
  relativePath?: string;
  bucketDisplayName?: string;
  bucketId?: string;
  duration?: number; // For videos
  resolution?: string;
  colorSpace?: string;
  bitDepth?: number;
  compressionType?: string;
}

export interface PhotoSourceInfo {
  sourceType: 'camera' | 'screenshot' | 'download' | 'whatsapp' | 'social' | 'unknown';
  sourceApp?: string;
  downloadSource?: string;
  downloadDate?: number;
  originalPath?: string;
}

export interface ExifData {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: number;
  focalLength?: string;
  flash?: string;
  whiteBalance?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  gpsTimestamp?: string;
  imageDescription?: string;
  userComment?: string;
}

export interface Album {
  id: string;
  title: string;
  assetCount: number;
  type: 'user' | 'system' | 'android_default';
  isDefault: boolean;
  thumbnailUri?: string;
  createdAt: number;
  updatedAt: number;
  // Enhanced Android-specific properties
  androidBucketId?: string;
  storagePath: string;
  isOnSdCard: boolean;
  storageUsage: number;
  storageInfo: StorageInfo;
  permissions: AlbumPermissions;
  syncStatus: AlbumSyncStatus;
}

export interface StorageInfo {
  totalSpace: number;
  availableSpace: number;
  usedSpace: number;
  photoStorageUsage: number;
  cacheSize: number;
  isLowStorage: boolean;
  sdCardAvailable: boolean;
  sdCardSpace?: number;
  storageType: 'internal' | 'external' | 'sd_card';
  mountPoint?: string;
  isRemovable: boolean;
  isEmulated: boolean;
}

export interface AlbumPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canCreateSubfolders: boolean;
  requiresElevatedPermissions: boolean;
}

export interface AlbumSyncStatus {
  lastSyncTime: number;
  isSyncing: boolean;
  syncErrors: string[];
  needsRescan: boolean;
}

export interface SwipeDirection {
  type: 'left' | 'right' | 'up' | 'down';
  albumId?: string;
  action: 'move' | 'copy' | 'delete';
  velocity: number;
  distance: number;
  timestamp: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
}

export interface SwipeConfiguration {
  left: AlbumAction;
  right: AlbumAction;
  up: AlbumAction;
  down: AlbumAction;
  gestureSettings: GestureConfig;
  isConfigured: boolean;
  lastModified: number;
  version: number;
}

export interface AlbumAction {
  type: 'move' | 'copy' | 'delete';
  albumId?: string;
  albumName?: string;
  confirmationRequired: boolean;
  undoTimeout: number;
  hapticFeedback: boolean;
}

export interface GestureConfig {
  minimumSwipeDistance: number;
  minimumSwipeVelocity: number;
  hapticFeedbackEnabled: boolean;
  animationDuration: number;
  // Enhanced mobile gesture settings
  touchSensitivity: number;
  gestureDeadZone: number;
  simultaneousGesturesEnabled: boolean;
  longPressDelay: number;
  doubleTapDelay: number;
  pinchToZoomEnabled: boolean;
  rotationGesturesEnabled: boolean;
  edgeSwipeEnabled: boolean;
  conflictResolution: 'swipe' | 'scroll' | 'zoom';
}

export interface MobileAppState {
  photos: Photo[];
  albums: Album[];
  currentPhoto: Photo | null;
  swipeConfig: SwipeConfiguration;
  loading: boolean;
  error: MobileAppError | null;
  permissions: MobilePermissions;
  deviceInfo: DeviceInfo;
  settings: MobileAppSettings;
  ui: UIState;
  performance: PerformanceMetrics;
}

export interface MobilePermissions {
  mediaLibrary: boolean;
  storage: boolean;
  camera: boolean;
  location: boolean;
  notifications: boolean;
  writeExternalStorage: boolean;
  readExternalStorage: boolean;
  manageExternalStorage: boolean;
  accessMediaLocation: boolean;
  lastPermissionCheck: number;
  permissionRationale: Record<string, boolean>;
}

export interface DeviceInfo {
  screenWidth: number;
  screenHeight: number;
  pixelDensity: number;
  androidVersion: number;
  androidApiLevel: number;
  availableStorage: number;
  totalStorage: number;
  deviceModel: string;
  deviceManufacturer: string;
  isTablet: boolean;
  hasNotch: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  supportedOrientations: ('portrait' | 'landscape')[];
  hasHapticFeedback: boolean;
  batteryLevel?: number;
  isLowPowerMode: boolean;
  networkType: 'wifi' | 'cellular' | 'none';
  storageInfo: StorageInfo;
}

export interface MobileAppSettings {
  gridColumns: number;
  hapticFeedback: boolean;
  darkMode: boolean;
  autoBackup: boolean;
  deleteConfirmation: boolean;
  // Enhanced mobile-specific settings
  thumbnailQuality: 'low' | 'medium' | 'high';
  preloadAdjacentPhotos: boolean;
  autoRotatePhotos: boolean;
  showMetadataOverlay: boolean;
  enableGestureHints: boolean;
  cacheSize: number;
  backgroundSync: boolean;
  lowStorageWarning: boolean;
  compressionLevel: number;
  videoAutoPlay: boolean;
  gestureTimeout: number;
  undoTimeout: number;
  animationsEnabled: boolean;
  accessibilityMode: boolean;
  language: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
}

export interface UIState {
  currentScreen: string;
  isFullscreen: boolean;
  showingMetadata: boolean;
  selectedPhotos: string[];
  isSelectionMode: boolean;
  showingAlbumPicker: boolean;
  keyboardVisible: boolean;
  orientation: 'portrait' | 'landscape';
  statusBarHeight: number;
  navigationBarHeight: number;
  activeGesture: string | null;
  lastUserInteraction: number;
}

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  frameRate: number;
  loadTime: number;
  gestureResponseTime: number;
  thumbnailLoadTime: number;
  cacheHitRate: number;
  errorCount: number;
  crashCount: number;
  lastPerformanceCheck: number;
}

// Additional mobile-specific interfaces for Android integration

export interface AndroidMediaStoreService {
  queryImages(): Promise<Photo[]>;
  queryVideos(): Promise<Photo[]>;
  queryAlbums(): Promise<Album[]>;
  updateMediaStoreEntry(photoId: string, updates: Partial<Photo>): Promise<void>;
  deleteFromMediaStore(photoId: string): Promise<void>;
  addToMediaStore(filePath: string, albumId: string): Promise<string>;
}

export interface AndroidPermissionService {
  requestMediaLibraryPermissions(): Promise<boolean>;
  requestStoragePermissions(): Promise<boolean>;
  checkPermissionStatus(): Promise<PermissionStatus>;
  openAppSettings(): Promise<void>;
  shouldShowPermissionRationale(permission: string): Promise<boolean>;
}

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export interface AndroidPhotoService {
  getAllPhotos(): Promise<Photo[]>;
  getAndroidAlbums(): Promise<Album[]>;
  movePhotoAndroid(photoId: string, targetAlbumId: string): Promise<void>;
  copyPhotoAndroid(photoId: string, targetAlbumId: string): Promise<void>;
  deletePhotoAndroid(photoId: string): Promise<void>;
  getPhotoMetadata(photoId: string): Promise<PhotoMetadata>;
  createAlbumAndroid(name: string): Promise<Album>;
  updateMediaStore(): Promise<void>;
  getStorageInfo(): Promise<StorageInfo>;
}

export interface CreateAlbumRequest {
  name: string;
  storagePath?: string;
  isOnSdCard?: boolean;
  type?: 'user' | 'system';
}

export interface PhotoOperationResult {
  success: boolean;
  error?: MobileAppError;
  photoId: string;
  operation: 'move' | 'copy' | 'delete' | 'undo';
  targetAlbumId?: string;
  originalAlbumId?: string;
  undoAction?: () => Promise<void>;
}

export interface BatchOperationResult {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  results: PhotoOperationResult[];
  errors: MobileAppError[];
}

// Re-export validation functions
export * from './validation';

export enum MobileErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  STORAGE_FULL = 'STORAGE_FULL',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  MEDIA_STORE_ERROR = 'MEDIA_STORE_ERROR',
  GESTURE_CONFLICT = 'GESTURE_CONFLICT',
  MEMORY_LOW = 'MEMORY_LOW',
  ANDROID_VERSION_UNSUPPORTED = 'ANDROID_VERSION_UNSUPPORTED'
}

export interface MobileAppError {
  type: MobileErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  userAction?: string;
  androidErrorCode?: number;
  code?: string;
}