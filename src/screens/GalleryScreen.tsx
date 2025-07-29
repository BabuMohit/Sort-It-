import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  Text,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMobileAppStore } from '../store/mobileAppStore';
import { Photo } from '../types';
import { NavigationProps } from '../navigation/types';

const { width: screenWidth } = Dimensions.get('window');

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
  const [gridColumns, setGridColumns] = useState(settings.gridColumns || 3);

  useEffect(() => {
    initializeGallery();
  }, []);

  const initializeGallery = async () => {
    try {
      const hasPermissions = await checkPermissions();
      if (!hasPermissions) {
        navigation.navigate('PermissionOnboarding');
        return;
      }
      await loadPhotos();
    } catch (err) {
      console.error('Failed to initialize gallery:', err);
      Alert.alert('Error', 'Failed to load photos. Please check permissions.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPhotos();
    } catch (err) {
      console.error('Failed to refresh photos:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePhotoPress = (photo: Photo, index: number) => {
    navigation.navigate('PhotoViewer', {
      photos,
      currentIndex: index,
    });
  };

  const renderPhoto = ({ item: photo, index }: { item: Photo; index: number }) => {
    const itemSize = (screenWidth - (gridColumns + 1) * 4) / gridColumns;

    return (
      <TouchableOpacity
        style={[styles.photoItem, { width: itemSize, height: itemSize }]}
        onPress={() => handlePhotoPress(photo, index)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: photo.thumbnailUri || photo.uri }}
          style={styles.photoImage}
          resizeMode="cover"
        />
        {photo.mediaType === 'video' && (
          <View style={styles.videoIndicator}>
            <Text style={styles.videoIcon}>▶</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gallery</Text>
        <Text style={styles.photoCount}>
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </Text>
      </View>
      
      {photos.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={gridColumns}
          contentContainerStyle={styles.photoGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
          getItemLayout={(data, index) => ({
            length: (screenWidth - (gridColumns + 1) * 4) / gridColumns,
            offset: ((screenWidth - (gridColumns + 1) * 4) / gridColumns) * Math.floor(index / gridColumns),
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={10}
        />
      )}
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  photoCount: {
    fontSize: 14,
    color: '#666666',
  },
  photoGrid: {
    padding: 2,
  },
  photoItem: {
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
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