import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  Text,
  RefreshControl,
  ActivityIndicator,
  ListRenderItem,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Photo } from '../types';
import { thumbnailCacheService } from '../services/ThumbnailCacheService';
import { performanceMonitorService } from '../services/PerformanceMonitorService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Minimum touch target size for accessibility (48dp)
const MIN_TOUCH_TARGET = 48;
const ITEM_SPACING = 2;
const CONTAINER_PADDING = 4;

export interface MobileGalleryGridProps {
  photos: Photo[];
  columns?: number;
  onPhotoSelect: (photo: Photo, index: number) => void;
  onPhotoLongPress?: (photo: Photo, index: number) => void;
  onLoadMore?: () => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
  refreshing?: boolean;
  screenWidth?: number;
  itemSpacing?: number;
  enableSelection?: boolean;
  selectedPhotos?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  showVideoIndicator?: boolean;
  showPhotoCount?: boolean;
  emptyStateComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  testID?: string;
}

interface PhotoGridItem extends Photo {
  index: number;
}

export const MobileGalleryGrid: React.FC<MobileGalleryGridProps> = ({
  photos,
  columns = 3,
  onPhotoSelect,
  onPhotoLongPress,
  onLoadMore,
  onRefresh,
  loading = false,
  refreshing = false,
  screenWidth: propScreenWidth,
  itemSpacing = ITEM_SPACING,
  enableSelection = false,
  selectedPhotos = [],
  onSelectionChange,
  showVideoIndicator = true,
  showPhotoCount = false,
  emptyStateComponent,
  loadingComponent,
  testID = 'mobile-gallery-grid',
}) => {
  // Smart loading state with predictive loading
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(50, photos.length) });
  const [loadedPhotos, setLoadedPhotos] = useState<PhotoGridItem[]>([]);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);
  const predictiveBuffer = useRef(20); // Dynamic buffer based on scroll velocity

  // Debug logging (reduced for cleaner console)
  if (__DEV__ && photos.length === 0) {
    console.log('MobileGalleryGrid: No photos to display');
  }
  const [dimensions, setDimensions] = useState({
    width: propScreenWidth || screenWidth,
    height: screenHeight,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map());
  const flatListRef = useRef<FlatList>(null);
  const scrollStartTime = useRef(0);
  const frameDropCount = useRef(0);
  const renderStartTime = useRef(0);

  // Calculate responsive grid layout
  const gridLayout = useMemo(() => {
    const availableWidth = dimensions.width - (CONTAINER_PADDING * 2);
    const totalSpacing = (columns - 1) * itemSpacing;
    const itemWidth = (availableWidth - totalSpacing) / columns;
    
    // Ensure minimum touch target size
    const adjustedItemWidth = Math.max(itemWidth, MIN_TOUCH_TARGET);
    const adjustedColumns = Math.floor((availableWidth + itemSpacing) / (adjustedItemWidth + itemSpacing));
    
    return {
      itemWidth: adjustedItemWidth,
      itemHeight: adjustedItemWidth, // Square items
      columns: adjustedColumns,
      spacing: itemSpacing,
    };
  }, [dimensions.width, columns, itemSpacing]);

  // Prepare data with indices for efficient rendering
  const gridData = useMemo(() => {
    return photos.map((photo, index) => ({
      ...photo,
      index,
    }));
  }, [photos]);

  // Smart loading: Update loaded photos based on visible range with predictive loading
  useEffect(() => {
    const start = Math.max(0, visibleRange.start);
    const end = Math.min(photos.length, visibleRange.end);
    
    // Add predictive buffer based on scroll direction and velocity
    const bufferSize = Math.min(predictiveBuffer.current, 20); // Reduced buffer
    const predictiveStart = scrollDirection.current === 'up' 
      ? Math.max(0, start - bufferSize) 
      : start;
    const predictiveEnd = scrollDirection.current === 'down' 
      ? Math.min(photos.length, end + bufferSize) 
      : end;
    
    const newLoadedPhotos = gridData.slice(predictiveStart, predictiveEnd);
    setLoadedPhotos(newLoadedPhotos);
    
    // Reduced logging frequency
    if (__DEV__ && Math.random() < 0.1) { // Only log 10% of the time
      console.log(`MobileGalleryGrid: Loading photos ${predictiveStart}-${predictiveEnd} of ${photos.length} (visible: ${start}-${end})`);
    }
  }, [gridData, visibleRange, photos.length]);

  // Update visible range when photos change
  useEffect(() => {
    if (photos.length > 0) {
      const initialEnd = Math.min(50, photos.length);
      setVisibleRange({ start: 0, end: initialEnd });
    }
  }, [photos.length]);

  // Initialize services and handle dimension changes
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await thumbnailCacheService.initialize();
        performanceMonitorService.startMonitoring();
        
        // Preload thumbnails for visible photos
        if (photos.length > 0) {
          const visiblePhotos = photos.slice(0, 20); // Preload first 20
          await thumbnailCacheService.preloadThumbnails(visiblePhotos, {
            width: gridLayout.itemWidth,
            height: gridLayout.itemHeight,
            quality: 0.8,
          });
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
        performanceMonitorService.recordError(error as Error, 'service_initialization');
      }
    };

    initializeServices();

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: propScreenWidth || window.width,
        height: window.height,
      });
    });

    return () => {
      subscription?.remove();
      performanceMonitorService.stopMonitoring();
    };
  }, [propScreenWidth, photos.length, gridLayout.itemWidth, gridLayout.itemHeight]);

  // Handle photo selection
  const handlePhotoPress = useCallback((photo: PhotoGridItem) => {
    if (enableSelection) {
      const isSelected = selectedPhotos.includes(photo.id);
      const newSelection = isSelected
        ? selectedPhotos.filter(id => id !== photo.id)
        : [...selectedPhotos, photo.id];
      
      onSelectionChange?.(newSelection);
    } else {
      // Find the correct index in the original photos array
      const correctIndex = photos.findIndex(p => p.id === photo.id);
      onPhotoSelect(photo, correctIndex >= 0 ? correctIndex : photo.index);
    }
  }, [enableSelection, selectedPhotos, onSelectionChange, onPhotoSelect, photos]);

  // Handle long press for selection mode or custom actions
  const handlePhotoLongPress = useCallback((photo: PhotoGridItem) => {
    if (onPhotoLongPress) {
      // Custom long press handler takes precedence
      const correctIndex = photos.findIndex(p => p.id === photo.id);
      onPhotoLongPress(photo, correctIndex >= 0 ? correctIndex : photo.index);
    } else if (enableSelection) {
      // Default selection behavior
      const newSelection = selectedPhotos.includes(photo.id)
        ? selectedPhotos.filter(id => id !== photo.id)
        : [...selectedPhotos, photo.id];
      
      onSelectionChange?.(newSelection);
    }
  }, [onPhotoLongPress, enableSelection, selectedPhotos, onSelectionChange, photos]);

  // Handle load more with debouncing
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || loading || !onLoadMore) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, loading, onLoadMore]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    await onRefresh();
  }, [onRefresh]);

  // Enhanced scroll handler with performance monitoring and predictive loading
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);
    const newDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';
    
    // Record scroll performance
    if (scrollStartTime.current > 0) {
      const scrollDuration = Date.now() - scrollStartTime.current;
      const visibleItems = Math.ceil(dimensions.height / gridLayout.itemHeight) * gridLayout.columns;
      
      performanceMonitorService.recordScrollPerformance(
        60, // Assume 60fps, could be measured more accurately
        frameDropCount.current,
        scrollDuration,
        scrollDelta,
        visibleItems
      );
      
      frameDropCount.current = 0;
    }
    
    // Predictive loading based on scroll direction
    if (newDirection !== scrollDirection.current) {
      scrollDirection.current = newDirection;
      
      // Adjust buffer based on scroll direction
      const bufferSize = 15; // Larger buffer for predictive loading
      const currentStart = visibleRange.start;
      const currentEnd = visibleRange.end;
      
      if (newDirection === 'down') {
        // Scrolling down - preload more photos ahead
        const newEnd = Math.min(photos.length, currentEnd + bufferSize);
        setVisibleRange({ start: currentStart, end: newEnd });
      } else {
        // Scrolling up - preload more photos behind
        const newStart = Math.max(0, currentStart - bufferSize);
        setVisibleRange({ start: newStart, end: currentEnd });
      }
    }
    
    lastScrollY.current = currentScrollY;
  }, [dimensions.height, gridLayout.itemHeight, gridLayout.columns, visibleRange, photos.length]);

  // Handle scroll begin for performance tracking
  const handleScrollBeginDrag = useCallback(() => {
    scrollStartTime.current = Date.now();
    frameDropCount.current = 0;
  }, []);

  // Handle scroll end for performance tracking
  const handleScrollEndDrag = useCallback(() => {
    scrollStartTime.current = 0;
  }, []);

  // Handle viewport changes for smart loading
  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length === 0) return;
    
    const firstVisible = viewableItems[0]?.index || 0;
    const lastVisible = viewableItems[viewableItems.length - 1]?.index || 0;
    
    // Buffer size for preloading
    const bufferSize = 10;
    const start = Math.max(0, firstVisible - bufferSize);
    const end = Math.min(photos.length, lastVisible + bufferSize);
    
    // Only update if range has changed significantly
    if (Math.abs(start - visibleRange.start) > 5 || Math.abs(end - visibleRange.end) > 5) {
      setVisibleRange({ start, end });
    }
  }, [photos.length, visibleRange]);



  // Get optimized thumbnail URI - simplified to avoid Buffer issues
  const getThumbnailUri = useCallback(async (photo: Photo): Promise<string> => {
    // For now, just return the original URI or thumbnail URI
    // This avoids the Buffer error while we fix the thumbnail service
    return photo.thumbnailUri || photo.uri;
  }, []);

  // Optimized photo item component
  const PhotoItem = React.memo<{ photo: PhotoGridItem }>(({ photo }) => {
    // Safety check for photo data
    if (!photo || !photo.id || !photo.uri) {
      console.warn('MobileGalleryGrid: Invalid photo data:', photo);
      return (
        <View style={[
          styles.photoItem,
          {
            width: gridLayout.itemWidth,
            height: gridLayout.itemHeight,
            marginRight: itemSpacing,
            marginBottom: itemSpacing,
          }
        ]}>
          <View style={styles.errorPhotoPlaceholder}>
            <Text style={styles.errorPhotoText}>⚠</Text>
          </View>
        </View>
      );
    }

    const [thumbnailUri, setThumbnailUri] = useState(photo.thumbnailUri || photo.uri);
    const [imageLoading, setImageLoading] = useState(true);
    const isSelected = enableSelection && selectedPhotos.includes(photo.id);
    
    useEffect(() => {
      getThumbnailUri(photo).then(setThumbnailUri);
    }, [photo.id, getThumbnailUri]);
    
    const handleImageLoad = useCallback(() => {
      setImageLoading(false);
    }, []);
    
    const handleImageError = useCallback(() => {
      setImageLoading(false);
      performanceMonitorService.recordError(
        new Error('Image load failed'),
        { photoId: photo.id, uri: thumbnailUri }
      );
    }, [photo.id, thumbnailUri]);
    
    return (
      <TouchableOpacity
        style={[
          styles.photoItem,
          {
            width: gridLayout.itemWidth,
            height: gridLayout.itemHeight,
            marginRight: itemSpacing,
            marginBottom: itemSpacing,
          },
          isSelected && styles.selectedPhotoItem,
        ]}
        onPress={() => handlePhotoPress(photo)}
        onLongPress={() => handlePhotoLongPress(photo)}
        activeOpacity={0.8}
        testID={`photo-item-${photo.id}`}
        accessibilityLabel={`Photo ${photo.filename || 'Unknown'}`}
        accessibilityRole="imagebutton"
        accessibilityState={{ selected: isSelected }}
      >
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.photoImage}
          resizeMode="cover"
          fadeDuration={200}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {/* Loading indicator */}
        {imageLoading && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
        
        {/* Video indicator */}
        {showVideoIndicator && photo.mediaType === 'video' && (
          <View style={styles.videoIndicator}>
            <Text style={styles.videoIcon}>▶</Text>
          </View>
        )}
        
        {/* Selection indicator */}
        {enableSelection && (
          <View style={[styles.selectionIndicator, isSelected && styles.selectedIndicator]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        
        {/* Photo metadata overlay */}
        {photo.metadata && (
          <View style={styles.metadataOverlay}>
            <Text style={styles.metadataText} numberOfLines={1}>
              {new Date(photo.creationTime).toLocaleDateString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  });

  // Render individual photo item
  const renderPhotoItem: ListRenderItem<PhotoGridItem> = useCallback(({ item: photo }) => {
    renderStartTime.current = performance.now();
    return <PhotoItem photo={photo} />;
  }, []);

  // Render loading footer
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading more photos...</Text>
      </View>
    );
  }, [isLoadingMore]);

  // Render empty state
  const renderEmptyComponent = useCallback(() => {
    if (loading) {
      return loadingComponent || (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      );
    }
    
    return emptyStateComponent || (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>No Photos Found</Text>
        <Text style={styles.emptyStateText}>
          Your photo library appears to be empty.
        </Text>
      </View>
    );
  }, [loading, loadingComponent, emptyStateComponent]);

  // Get item layout for performance optimization
  const getItemLayout = useCallback((data: any, index: number) => {
    const itemHeight = gridLayout.itemHeight + itemSpacing;
    const rowIndex = Math.floor(index / gridLayout.columns);
    
    return {
      length: itemHeight,
      offset: itemHeight * rowIndex,
      index,
    };
  }, [gridLayout, itemSpacing]);

  // Key extractor for FlatList optimization
  const keyExtractor = useCallback((item: PhotoGridItem) => item.id, []);

  return (
    <View style={styles.container} testID={testID}>
      {showPhotoCount && (
        <View style={styles.header}>
          <Text style={styles.photoCount}>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            {enableSelection && selectedPhotos.length > 0 && (
              <Text style={styles.selectedCount}>
                {' '}• {selectedPhotos.length} selected
              </Text>
            )}
          </Text>
        </View>
      )}
      
      <FlatList
        ref={flatListRef}
        data={gridData}
        renderItem={renderPhotoItem}
        keyExtractor={keyExtractor}
        numColumns={gridLayout.columns}
        key={`${gridLayout.columns}-${dimensions.width}`} // Force re-render on layout change
        contentContainerStyle={[
          styles.photoGrid,
          { paddingHorizontal: CONTAINER_PADDING },
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          ) : undefined
        }
        onScroll={handleScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 100,
        }}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        // Performance optimizations with smart loading
        removeClippedSubviews={true}
        maxToRenderPerBatch={15} // Reduced for better performance
        windowSize={8} // Reduced window size
        initialNumToRender={15} // Reduced initial render
        getItemLayout={getItemLayout}
        // Accessibility
        accessible={true}
        accessibilityLabel="Photo grid"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  photoCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  selectedCount: {
    color: '#007AFF',
    fontWeight: '600',
  },
  photoGrid: {
    paddingVertical: CONTAINER_PADDING,
  },
  photoItem: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  selectedPhotoItem: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  errorPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPhotoText: {
    fontSize: 24,
    color: '#999999',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    color: '#ffffff',
    fontSize: 10,
    marginLeft: 2,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  metadataOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metadataText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});