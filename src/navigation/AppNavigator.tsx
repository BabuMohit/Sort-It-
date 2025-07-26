import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, LinkingConfiguration } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import {
  PhotoViewerScreen,
  AlbumPhotosScreen,
  SwipeConfigurationScreen,
  StorageManagementScreen,
  PermissionDemoScreen,
} from '../screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false);
  const [initialState, setInitialState] = React.useState();

  React.useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem('NAVIGATION_STATE');
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;

        if (state !== undefined) {
          setInitialState(state);
        }
      } catch (e) {
        console.warn('Failed to restore navigation state:', e);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  const onStateChange = (state: any) => {
    AsyncStorage.setItem('NAVIGATION_STATE', JSON.stringify(state));
  };

  if (!isReady) {
    return null;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={onStateChange}
      linking={LinkingConfiguration}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{
            title: 'Sort It!',
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
        
        <Stack.Screen
          name="AlbumPhotos"
          component={AlbumPhotosScreen}
          options={{
            title: 'Album Photos',
            headerShown: true,
            headerBackTitleVisible: false,
          }}
        />
        
        <Stack.Screen
          name="SwipeConfiguration"
          component={SwipeConfigurationScreen}
          options={{
            title: 'Swipe Configuration',
            headerShown: true,
            headerBackTitleVisible: false,
          }}
        />
        
        <Stack.Screen
          name="StorageManagement"
          component={StorageManagementScreen}
          options={{
            title: 'Storage Management',
            headerShown: true,
            headerBackTitleVisible: false,
          }}
        />
        
        <Stack.Screen
          name="PermissionOnboarding"
          component={PermissionDemoScreen}
          options={{
            title: 'Permissions',
            presentation: 'modal',
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};