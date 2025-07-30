import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMobileAppStore } from '../store/mobileAppStore';
import { Photo } from '../types';
import { NavigationProps } from '../navigation/types';
import { MobileGalleryGrid } from '../components/MobileGalleryGrid';
import { PhotoErrorBoundary } from '../components/PhotoErrorBoundary';

interface GalleryScreenProps extends NavigationProps {}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ navigation }) => {
  const {
    photos,
    loading,
    error,
    permissions,
    settings,
    loadPhotos,
    checkPermissions,
  } = useMobileAppStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeGallery();
  }, []);

  const initializeGallery = async () => {
    console.log('GalleryScreen: Initializing gallery...');
    try {
      console.log('GalleryScreen: Current permissions state:', permissions);
      console.log('GalleryScreen: Checking permissions...');
      const hasPermissions = await checkPermissions();
      console.log('GalleryScreen: Permissions result:', hasPermissions);
      
      // Force load photos even if permission check says no, since Albums are working
      console.log('GalleryScreen: Force loading photos...');
      await loadPhotos();
      console.log('GalleryScreen: Photos loaded successfully, count:', photos.length);
      
      // Only navigate to onboarding if we actually have no photos AND no permissions
      if (!hasPermissions && photos.length === 0) {
        console.log('GalleryScreen: No permissions and no photos, navigating to onboarding');
        navigation.navigate('PermissionOnboarding');
        return;
      }
    } catch (err) {
      console.error('GalleryScreen: Failed to initialize gallery:', err);
      Alert.alert('Error', `Failed to load photos: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPhotos();
    } catch (err) {
      console.error('Failed to refresh photos:', err);
    } finally {
      setRefreshing(false);
    }
  }, [loadPhotos]);

  const handlePhotoSelect = useCallback((photo: Photo, index: number) => {
    // Get fresh photos from store to avoid stale closure
    const currentPhotos = useMobileAppStore.getState().photos;
    console.log(`GalleryScreen: Photo selected - ${photo.filename} at index ${index} of ${currentPhotos.length} photos`);
    navigation.navigate('PhotoViewer', {
      photos: currentPhotos,
      currentIndex: index,
    });
  }, [navigation]);

  const handleLoadMore = useCallback(async () => {
    // Implement pagination if needed in the future
    // For now, we load all photos at once
  }, []);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Photos Found</Text>
      <Text style={styles.emptyStateText}>
        {!permissions.mediaLibrary
          ? 'Please grant media library permissions to view your photos.'
          : 'Your photo library appears to be empty.'}
      </Text>
      {!permissions.mediaLibrary && (
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => navigation.navigate('PermissionOnboarding')}
        >
          <Text style={styles.permissionButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Error Loading Photos</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeGallery}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Debug logging (reduced for cleaner console)
  if (__DEV__ && error) {
    console.log('GalleryScreen: Error:', error);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gallery</Text>
        <View style={styles.headerButtons}>
          <Text style={styles.photoCount}>{photos.length} photos</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Loading...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <PhotoErrorBoundary>
        <MobileGalleryGrid
          photos={photos}
          columns={settings.gridColumns || 3}
          onPhotoSelect={handlePhotoSelect}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
        loading={loading}
        refreshing={refreshing}
        showVideoIndicator={true}
        showPhotoCount={true}
        emptyStateComponent={renderEmptyState()}
        testID="gallery-grid"
        />
      </PhotoErrorBoundary>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});