import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMobileAppStore } from '../store/mobileAppStore';
import { Album } from '../types';
import { NavigationProps } from '../navigation/types';

const { width: screenWidth } = Dimensions.get('window');

interface AlbumsScreenProps extends NavigationProps {}

export const AlbumsScreen: React.FC<AlbumsScreenProps> = ({ navigation }) => {
  const {
    albums,
    loading,
    error,
    permissions,
    loadAlbums,
    checkPermissions,
  } = useMobileAppStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeAlbums();
  }, []);

  const initializeAlbums = async () => {
    try {
      const hasPermissions = await checkPermissions();
      if (!hasPermissions) {
        navigation.navigate('PermissionOnboarding');
        return;
      }
      await loadAlbums();
    } catch (err) {
      console.error('Failed to initialize albums:', err);
      Alert.alert('Error', 'Failed to load albums. Please check permissions.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAlbums();
    } catch (err) {
      console.error('Failed to refresh albums:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAlbumPress = (album: Album) => {
    navigation.navigate('AlbumPhotos', { album });
  };

  const handleCreateAlbum = () => {
    navigation.navigate('CreateAlbum');
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getAlbumTypeIcon = (album: Album): string => {
    switch (album.type) {
      case 'system':
        return '📁';
      case 'android_default':
        return '📱';
      default:
        return '📂';
    }
  };

  const renderAlbum = ({ item: album }: { item: Album }) => {
    const itemWidth = (screenWidth - 48) / 2;

    return (
      <TouchableOpacity
        style={[styles.albumItem, { width: itemWidth }]}
        onPress={() => handleAlbumPress(album)}
        activeOpacity={0.8}
      >
        <View style={styles.albumThumbnail}>
          {album.thumbnailUri ? (
            <Image
              source={{ uri: album.thumbnailUri }}
              style={styles.albumImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.albumPlaceholder}>
              <Text style={styles.albumPlaceholderIcon}>📷</Text>
            </View>
          )}
          <View style={styles.albumOverlay}>
            <Text style={styles.albumCount}>{album.assetCount}</Text>
          </View>
        </View>
        
        <View style={styles.albumInfo}>
          <View style={styles.albumHeader}>
            <Text style={styles.albumTypeIcon}>{getAlbumTypeIcon(album)}</Text>
            <Text style={styles.albumTitle} numberOfLines={1}>
              {album.title}
            </Text>
          </View>
          
          <Text style={styles.albumDetails}>
            {album.assetCount} {album.assetCount === 1 ? 'item' : 'items'}
          </Text>
          
          {album.storageUsage > 0 && (
            <Text style={styles.albumStorage}>
              {formatStorageSize(album.storageUsage)}
            </Text>
          )}
          
          {album.isOnSdCard && (
            <Text style={styles.sdCardIndicator}>SD Card</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Albums Found</Text>
      <Text style={styles.emptyStateText}>
        {!permissions.mediaLibrary
          ? 'Please grant media library permissions to view your albums.'
          : 'Create your first album to organize your photos.'}
      </Text>
      {permissions.mediaLibrary ? (
        <TouchableOpacity style={styles.createButton} onPress={handleCreateAlbum}>
          <Text style={styles.createButtonText}>Create Album</Text>
        </TouchableOpacity>
      ) : (
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
          <Text style={styles.errorTitle}>Error Loading Albums</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeAlbums}>
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
        <Text style={styles.headerTitle}>Albums</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateAlbum}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      {albums.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbum}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.albumGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  albumGrid: {
    padding: 16,
  },
  albumItem: {
    marginBottom: 16,
    marginHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  albumThumbnail: {
    position: 'relative',
    aspectRatio: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumPlaceholderIcon: {
    fontSize: 32,
    opacity: 0.5,
  },
  albumOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  albumCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  albumInfo: {
    padding: 12,
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  albumTypeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  albumTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  albumDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  albumStorage: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  sdCardIndicator: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
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
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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