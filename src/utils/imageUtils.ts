import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

/**
 * Generate thumbnail for a photo
 */
export const generateThumbnail = async (
  uri: string,
  options: ThumbnailOptions = {}
): Promise<string> => {
  const {
    width = 200,
    height = 200,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width,
            height,
          },
        },
      ],
      {
        compress: quality,
        format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    throw new Error('Thumbnail generation failed');
  }
};

/**
 * Optimize image for better performance
 */
export const optimizeImage = async (
  uri: string,
  options: OptimizeOptions = {}
): Promise<string> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.9,
    format = 'jpeg'
  } = options;

  try {
    // Get original image info
    const imageInfo = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const manipulations: ImageManipulator.Action[] = [];

    // Add resize if needed
    if (imageInfo.width > maxWidth || imageInfo.height > maxHeight) {
      const aspectRatio = imageInfo.width / imageInfo.height;
      let newWidth = maxWidth;
      let newHeight = maxHeight;

      if (aspectRatio > 1) {
        // Landscape
        newHeight = maxWidth / aspectRatio;
      } else {
        // Portrait
        newWidth = maxHeight * aspectRatio;
      }

      manipulations.push({
        resize: {
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        },
      });
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      manipulations,
      {
        compress: quality,
        format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Failed to optimize image:', error);
    throw new Error('Image optimization failed');
  }
};

/**
 * Get image dimensions without loading the full image
 */
export const getImageDimensions = async (uri: string): Promise<{ width: number; height: number }> => {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { width: result.width, height: result.height };
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
    throw new Error('Could not get image dimensions');
  }
};

/**
 * Calculate optimal thumbnail size maintaining aspect ratio
 */
export const calculateThumbnailSize = (
  originalWidth: number,
  originalHeight: number,
  maxSize: number = 200
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;

  if (aspectRatio > 1) {
    // Landscape
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio),
    };
  } else {
    // Portrait or square
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize,
    };
  }
};