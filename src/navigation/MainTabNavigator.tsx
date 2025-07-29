import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { MainTabParamList } from './types';
import { MaterialColors, MaterialComponents, TouchTargets } from '../theme/materialDesign';
import { GalleryStackNavigator } from './GalleryStackNavigator';
import { AlbumsStackNavigator } from './AlbumsStackNavigator';
import { SettingsStackNavigator } from './SettingsStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
  icon: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, color, icon }) => (
  <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
    <Text style={[styles.tabIconText, { color }]}>{icon}</Text>
  </View>
);

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: MaterialColors.primary,
        tabBarInactiveTintColor: MaterialColors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: MaterialColors.surface,
          borderTopWidth: 1,
          borderTopColor: MaterialColors.outline,
          paddingTop: 8,
          paddingBottom: 8,
          height: MaterialComponents.navigationBar.height,
          elevation: MaterialComponents.card.elevation,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          minHeight: TouchTargets.minimum,
        },
      }}
    >
      <Tab.Screen
        name="Gallery"
        component={GalleryStackNavigator}
        options={{
          title: 'Gallery',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon focused={focused} color={color} size={size} icon="📷" />
          ),
        }}
      />
      
      <Tab.Screen
        name="Albums"
        component={AlbumsStackNavigator}
        options={{
          title: 'Albums',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon focused={focused} color={color} size={size} icon="📁" />
          ),
        }}
      />
      
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon focused={focused} color={color} size={size} icon="⚙️" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
  tabIconText: {
    fontSize: 20,
  },
});