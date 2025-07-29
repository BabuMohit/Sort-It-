import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AlbumsStackParamList } from './types';
import {
  AlbumsScreen,
  AlbumPhotosScreen,
  CreateAlbumScreen,
} from '../screens';

const Stack = createNativeStackNavigator<AlbumsStackParamList>();

export const AlbumsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="AlbumsList"
        component={AlbumsScreen}
        options={{
          title: 'Albums',
        }}
      />
      
      <Stack.Screen
        name="AlbumPhotos"
        component={AlbumPhotosScreen}
        options={{
          title: 'Album Photos',
          headerShown: true,
        }}
      />
      
      <Stack.Screen
        name="CreateAlbum"
        component={CreateAlbumScreen}
        options={{
          title: 'Create Album',
          presentation: 'modal',
        }}
      />
      
      <Stack.Screen
        name="AlbumSettings"
        component={AlbumPhotosScreen} // Placeholder - will be implemented later
        options={{
          title: 'Album Settings',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};