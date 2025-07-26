import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GalleryStackParamList } from './types';
import { GalleryScreen, PhotoViewerScreen } from '../screens';

const Stack = createNativeStackNavigator<GalleryStackParamList>();

export const GalleryStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="GalleryGrid"
        component={GalleryScreen}
        options={{
          title: 'Gallery',
        }}
      />
      
      <Stack.Screen
        name="PhotoViewer"
        component={PhotoViewerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};