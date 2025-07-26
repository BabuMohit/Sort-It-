// Constants for Sort It! Mobile Gallery App

export const APP_CONFIG = {
  name: 'Sort It!',
  version: '1.0.0',
  description: 'Mobile Gallery App with Swipe-to-Sort',
};

export const GESTURE_CONFIG = {
  MINIMUM_SWIPE_DISTANCE: 50,
  MINIMUM_SWIPE_VELOCITY: 500,
  ANIMATION_DURATION: 300,
  UNDO_TIMEOUT: 5000,
};

export const GRID_CONFIG = {
  DEFAULT_COLUMNS: 3,
  MIN_COLUMNS: 2,
  MAX_COLUMNS: 5,
  ITEM_SPACING: 2,
  MINIMUM_TOUCH_TARGET: 48,
};

export const COLORS = {
  primary: '#2196F3',
  secondary: '#FF9800',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
};

export const PERMISSIONS = {
  MEDIA_LIBRARY: 'READ_EXTERNAL_STORAGE',
  STORAGE: 'WRITE_EXTERNAL_STORAGE',
  MEDIA_IMAGES: 'READ_MEDIA_IMAGES',
  MEDIA_VIDEO: 'READ_MEDIA_VIDEO',
};

export const ALBUM_TYPES = {
  CAMERA: 'Camera',
  SCREENSHOTS: 'Screenshots',
  DOWNLOADS: 'Downloads',
  WHATSAPP: 'WhatsApp Images',
  DCIM: 'DCIM',
};