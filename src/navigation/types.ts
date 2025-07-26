// Navigation types for Sort It! Mobile Gallery App

import { Photo, Album } from '../types';

// Root Stack Navigator params
export type RootStackParamList = {
  MainTabs: undefined;
  PhotoViewer: {
    photos: Photo[];
    currentIndex: number;
    albumId?: string;
  };
  AlbumPhotos: {
    album: Album;
  };
  Settings: undefined;
  PermissionOnboarding: undefined;
};

// Bottom Tab Navigator params
export type MainTabParamList = {
  Gallery: undefined;
  Albums: undefined;
  Settings: undefined;
};

// Gallery Stack Navigator params
export type GalleryStackParamList = {
  GalleryGrid: undefined;
  PhotoViewer: {
    photos: Photo[];
    currentIndex: number;
    albumId?: string;
  };
};

// Albums Stack Navigator params
export type AlbumsStackParamList = {
  AlbumsList: undefined;
  AlbumPhotos: {
    album: Album;
  };
  CreateAlbum: undefined;
  AlbumSettings: {
    album: Album;
  };
};

// Settings Stack Navigator params
export type SettingsStackParamList = {
  SettingsMain: undefined;
  SwipeConfiguration: undefined;
  StorageManagement: undefined;
  About: undefined;
};

// Navigation prop types for screens
export type NavigationProps = {
  navigation: any;
  route: any;
};

// Deep linking configuration
export const LinkingConfiguration = {
  prefixes: ['sortit://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Gallery: 'gallery',
          Albums: 'albums',
          Settings: 'settings',
        },
      },
      PhotoViewer: 'photo/:photoId',
      AlbumPhotos: 'album/:albumId',
    },
  },
};