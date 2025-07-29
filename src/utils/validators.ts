import { Photo, Album } from '../types';

/**
 * Validate photo object structure and required fields
 */
export const validatePhoto = (photo: any): photo is Photo => {
  if (!photo || typeof photo !== 'object') {
    return false;
  }

  const requiredFields = ['id', 'filename', 'uri', 'mediaType'];
  for (const field of requiredFields) {
    if (!(field in photo) || photo[field] === null || photo[field] === undefined) {
      return false;
    }
  }

  // Validate mediaType
  if (!['photo', 'video'].includes(photo.mediaType)) {
    return false;
  }

  // Validate URI format
  if (typeof photo.uri !== 'string' || !photo.uri.startsWith('file://')) {
    return false;
  }

  // Validate dimensions for photos
  if (photo.mediaType === 'photo') {
    if (typeof photo.width !== 'number' || typeof photo.height !== 'number') {
      return false;
    }
    if (photo.width <= 0 || photo.height <= 0) {
      return false;
    }
  }

  return true;
};

/**
 * Validate album object structure and required fields
 */
export const validateAlbum = (album: any): album is Album => {
  if (!album || typeof album !== 'object') {
    return false;
  }

  const requiredFields = ['id', 'title'];
  for (const field of requiredFields) {
    if (!(field in album) || album[field] === null || album[field] === undefined) {
      return false;
    }
  }

  // Validate title is non-empty string
  if (typeof album.title !== 'string' || album.title.trim().length === 0) {
    return false;
  }

  // Validate assetCount if present
  if ('assetCount' in album && typeof album.assetCount !== 'number') {
    return false;
  }

  return true;
};

/**
 * Validate file extension for supported image/video formats
 */
export const validateFileExtension = (filename: string): boolean => {
  const supportedExtensions = [
    // Image formats
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif',
    // Video formats
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp'
  ];

  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return supportedExtensions.includes(extension);
};

/**
 * Validate photo dimensions are within reasonable limits
 */
export const validatePhotoDimensions = (width: number, height: number): boolean => {
  const MAX_DIMENSION = 10000; // 10k pixels max
  const MIN_DIMENSION = 1; // 1 pixel min

  return width >= MIN_DIMENSION && width <= MAX_DIMENSION &&
         height >= MIN_DIMENSION && height <= MAX_DIMENSION;
};