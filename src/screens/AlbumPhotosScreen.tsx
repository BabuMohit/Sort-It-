import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Album, Photo } from '../types';
import { NavigationProps } from '../navigation/types';
import { useMobileAppStore } from '../store/mobileAppStore';
import { MobileGalleryGrid } from '../components/MobileGalleryGrid';
import { androidPhotoService, androidPhotoFileOperations } from '../services';

interface AlbumPhotosScreenProps extends NavigationProps {
  route: {
    params: {
      album: Album;
    };
  };
}

export const AlbumPhotosScreen: React.FC<AlbumPhotosScreenProps> = ({
  navigation,
  route,
}) => {
  const { album } = route.params;
  const { loading, error } = useMobileAppStore();
  
  // Local state for album photos
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [albumLoading, setAlbumLoading] = useState(true);
  const [albumError, setAlbumError] = useState<string | null>(null);
  
  useEffect(() => {
    loadAlbumPhotos();
  }, [album.id]);

  const loadAlbumPhotos = async () => {
    try {
      setAlbumLoading(true);
      setAlbumError(null);
      console.log(`AlbumPhotosScreen: Loading photos for album ${album.id} (${album.title})`);
      
      const photos = await androidPhotoService.getAlbumPhotos(album.id);
      console.log(`AlbumPhotosScreen: Loaded ${photos.length} photos for album ${album.title}`);
      
      setAlbumPhotos(photos);
    } catch (err) {
      console.error(`AlbumPhotosScreen: Error loading album photos:`, err);
      setAlbumError(err instanceof Error ? err.message : 'Failed to load album photos');
    } finally {
      setAlbumLoading(false);
    }
  };

  const handlePhotoSelect = useCallback((photo: Photo, index: number) => {
    // Get the current albumPhotos state at the time of selection
    setAlbumPhotos(currentPhotos => {
      console.log(`AlbumPhotosScreen: Photo selected - ${photo.filename} at index ${index} of ${currentPhotos.length} album photos`);
      
      // Safety check - ensure we have photos before navigating
      if (currentPhotos.length === 0) {
        console.warn('AlbumPhotosScreen: No photos available for navigation');
        return currentPhotos;
      }
      
      navigation.navigate('PhotoViewer', {
        photos: currentPhotos,
        currentIndex: index,
        albumId: album.id, // Pass album context
      });
      
      return currentPhotos; // Return unchanged state
    });
  }, [navigation, album.id]);

  const handleDeletePhotoFromAlbum = useCallback(async (photoId: string) => {
    try {
      setAlbumLoading(true);
      const result = await androidPhotoFileOperations.deletePhotoAndroid(photoId);
      if (result.success) {
        console.log(`Successfully deleted photo ${photoId} from album ${album.id}`);
        await loadAlbumPhotos(); // Refresh album photos after delete
      } else {
        console.error('Failed to delete photo:', result.error);
        setAlbumError(result.error?.message || 'Failed to delete photo');
      }
    } catch (error) {
      console.error('Failed to delete photo from album:', error);
      setAlbumError(error instanceof Error ? error.message : 'Failed to delete photo');
    } finally {
      setAlbumLoading(false);
    }
  }, [album.id, loadAlbumPhotos]);

  const handlePhotoLongPress = useCallback((photo: Photo, index: number) => {
    // Show album-specific actions menu
    Alert.alert(
      'Photo Actions',
      `What would you like to do with ${photo.filename}?`,
      [
        {
          text: 'Move to Another Album',
          onPress: () => {
            // For now, show placeholder - will be enhanced in future tasks
            Alert.alert('Move Photo', 'Album selection UI will be implemented in task 9.1');
          },
        },
        {
          text: 'Copy to Another Album',
          onPress: () => {
            Alert.alert('Copy Photo', 'Album selection UI will be implemented in task 9.1');
          },
        },
        {
          text: 'Delete from Album',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Photo',
              `Are you sure you want to delete ${photo.filename} from ${album.title}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => handleDeletePhotoFromAlbum(photo.id),
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [album.title, handleDeletePhotoFromAlbum]);

  const handleMovePhotoFromAlbum = useCallback(async (photoId: string, targetAlbumId: string) => {
    try {
      setAlbumLoading(true);
      const result = await androidPhotoFileOperations.movePhotoAndroid(photoId, targetAlbumId);
      if (result.success) {
        console.log(`Successfully moved photo ${photoId} from album ${album.id} to ${targetAlbumId}`);
        await loadAlbumPhotos(); // Refresh album photos after move
      } else {
        console.error('Failed to move photo:', result.error);
        setAlbumError(result.error?.message || 'Failed to move photo');
      }
    } catch (error) {
      console.error('Failed to move photo from album:', error);
      setAlbumError(error instanceof Error ? error.message : 'Failed to move photo');
    } finally {
      setAlbumLoading(false);
    }
  }, [album.id, loadAlbumPhotos]);

  const handleCopyPhotoFromAlbum = useCallback(async (photoId: string, targetAlbumId: string) => {
    try {
      setAlbumLoading(true);
      const result = await androidPhotoFileOperations.copyPhotoAndroid(photoId, targetAlbumId);
      if (result.success) {
        console.log(`Successfully copied photo ${photoId} from album ${album.id} to ${targetAlbumId}`);
      } else {
        console.error('Failed to copy photo:', result.error);
        setAlbumError(result.error?.message || 'Failed to copy photo');
      }
    } catch (error) {
      console.error('Failed to copy photo from album:', error);
      setAlbumError(error instanceof Error ? error.message : 'Failed to copy photo');
    } finally {
      setAlbumLoading(false);
    }
  }, [album.id]);

  const handleRefresh = useCallback(async () => {
    await loadAlbumPhotos();
  }, [album.id]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (error || albumError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{album.title}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{albumError || error?.message || 'Error loading album photos'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbText}>Albums</Text>
            <Text style={styles.breadcrumbSeparator}> › </Text>
            <Text style={styles.breadcrumbCurrent}>{album.title}</Text>
          </View>
          <Text style={styles.photoCount}>{albumPhotos.length} photos</Text>
        </View>
      </View>
      
      <MobileGalleryGrid
        photos={albumPhotos}
        columns={3}
        onPhotoSelect={handlePhotoSelect}
        onPhotoLongPress={handlePhotoLongPress}
        onRefresh={handleRefresh}
        loading={albumLoading}
        showVideoIndicator={true}
        showPhotoCount={false}
        emptyStateComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Photos in Album</Text>
            <Text style={styles.emptyStateText}>
              This album doesn't contain any photos yet.
            </Text>
          </View>
        }
        testID="album-photos-grid"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#666666',
  },
  breadcrumbSeparator: {
    fontSize: 14,
    color: '#666666',
  },
  breadcrumbCurrent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  photoCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
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
  },
});