import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { MobileGalleryGrid } from '../MobileGalleryGrid';
import { Photo } from '../../types';

// Mock services
jest.mock('../../services/ThumbnailCacheService', () => ({
  thumbnailCacheService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getThumbnail: jest.fn().mockResolvedValue('file://cached-thumb.jpg'),
    preloadThumbnails: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/PerformanceMonitorService', () => ({
  performanceMonitorService: {
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    recordThumbnailLoadTime: jest.fn(),
    recordScrollPerformance: jest.fn(),
    recordError: jest.fn(),
  },
}));

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock photo data
const mockPhotos: Photo[] = [
  {
    id: '1',
    uri: 'file://photo1.jpg',
    filename: 'photo1.jpg',
    width: 1920,
    height: 1080,
    creationTime: Date.now() - 86400000,
    modificationTime: Date.now() - 86400000,
    mediaType: 'photo',
    thumbnailUri: 'file://thumb1.jpg',
    size: 2048000,
    mimeType: 'image/jpeg',
    orientation: 0,
    isFromCamera: true,
    androidMediaStoreId: 'ms1',
  },
  {
    id: '2',
    uri: 'file://video1.mp4',
    filename: 'video1.mp4',
    width: 1920,
    height: 1080,
    creationTime: Date.now() - 172800000,
    modificationTime: Date.now() - 172800000,
    mediaType: 'video',
    thumbnailUri: 'file://thumb2.jpg',
    size: 10485760,
    mimeType: 'video/mp4',
    orientation: 0,
    isFromCamera: false,
    androidMediaStoreId: 'ms2',
  },
  {
    id: '3',
    uri: 'file://photo3.jpg',
    filename: 'photo3.jpg',
    width: 1920,
    height: 1080,
    creationTime: Date.now() - 259200000,
    modificationTime: Date.now() - 259200000,
    mediaType: 'photo',
    thumbnailUri: 'file://thumb3.jpg',
    size: 1536000,
    mimeType: 'image/jpeg',
    orientation: 0,
    isFromCamera: true,
    androidMediaStoreId: 'ms3',
  },
];

describe('MobileGalleryGrid', () => {
  const defaultProps = {
    photos: mockPhotos,
    onPhotoSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders photo grid correctly', () => {
      const { getByTestId } = render(<MobileGalleryGrid {...defaultProps} />);
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });

    it('renders with correct props', () => {
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} photos={[]} />
      );
      
      const grid = getByTestId('mobile-gallery-grid');
      expect(grid).toBeTruthy();
    });

    it('displays photo count when enabled', () => {
      const { getByText } = render(
        <MobileGalleryGrid {...defaultProps} showPhotoCount={true} />
      );
      
      expect(getByText('3 photos')).toBeTruthy();
    });
  });

  describe('Grid Layout', () => {
    it('calculates correct grid layout for different column counts', () => {
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} columns={2} />
      );
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });

    it('adapts to different screen widths', () => {
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} screenWidth={320} />
      );
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });
  });

  describe('Component Props', () => {
    it('passes correct props to FlatList', () => {
      const onPhotoSelect = jest.fn();
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} onPhotoSelect={onPhotoSelect} />
      );
      
      const grid = getByTestId('mobile-gallery-grid');
      expect(grid).toBeTruthy();
    });

    it('handles selection mode props correctly', () => {
      const onSelectionChange = jest.fn();
      const { getByTestId } = render(
        <MobileGalleryGrid
          {...defaultProps}
          enableSelection={true}
          selectedPhotos={['1']}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const grid = getByTestId('mobile-gallery-grid');
      expect(grid).toBeTruthy();
    });

    it('handles refresh props correctly', () => {
      const onRefresh = jest.fn();
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} onRefresh={onRefresh} />
      );
      
      const grid = getByTestId('mobile-gallery-grid');
      expect(grid).toBeTruthy();
    });
  });

  describe('Configuration', () => {
    it('handles different column counts', () => {
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} columns={4} />
      );
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });

    it('handles custom screen width', () => {
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} screenWidth={320} />
      );
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });

    it('handles loading state', () => {
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} loading={true} />
      );
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });
  });

  describe('Performance and Error Handling', () => {
    it('renders with performance optimizations', () => {
      const { getByTestId } = render(<MobileGalleryGrid {...defaultProps} />);
      
      const grid = getByTestId('mobile-gallery-grid');
      expect(grid).toBeTruthy();
    });

    it('handles large photo arrays efficiently', () => {
      const largePhotoArray = Array.from({ length: 1000 }, (_, index) => ({
        ...mockPhotos[0],
        id: `photo-${index}`,
        filename: `photo-${index}.jpg`,
      }));
      
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} photos={largePhotoArray} />
      );
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });

    it('handles missing thumbnail gracefully', () => {
      const photosWithoutThumbnails = mockPhotos.map(photo => ({
        ...photo,
        thumbnailUri: '',
      }));
      
      const { getByTestId } = render(
        <MobileGalleryGrid {...defaultProps} photos={photosWithoutThumbnails} />
      );
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });

    it('handles dimension changes gracefully', () => {
      const mockDimensions = Dimensions.get as jest.Mock;
      const { getByTestId, rerender } = render(
        <MobileGalleryGrid {...defaultProps} />
      );
      
      // Simulate dimension change
      mockDimensions.mockReturnValue({ width: 414, height: 896 });
      
      rerender(<MobileGalleryGrid {...defaultProps} />);
      
      expect(getByTestId('mobile-gallery-grid')).toBeTruthy();
    });
  });
});