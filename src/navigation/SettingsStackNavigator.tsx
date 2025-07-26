import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from './types';
import {
  SettingsScreen,
  SwipeConfigurationScreen,
  StorageManagementScreen,
} from '../screens';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          title: 'Settings',
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
        name="About"
        component={SettingsScreen} // Placeholder - will be implemented later
        options={{
          title: 'About',
          headerShown: true,
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};