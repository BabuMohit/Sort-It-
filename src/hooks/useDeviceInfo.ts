import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface DeviceInfo {
  screenWidth: number;
  screenHeight: number;
  pixelDensity: number;
  androidVersion: number;
  availableStorage: number;
  isTablet: boolean;
}

export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    screenWidth: 0,
    screenHeight: 0,
    pixelDensity: 1,
    androidVersion: 0,
    availableStorage: 0,
    isTablet: false,
  });

  useEffect(() => {
    const updateDeviceInfo = async () => {
      const { width, height } = Dimensions.get('window');
      const { scale } = Dimensions.get('screen');
      
      // Get available storage
      let availableStorage = 0;
      try {
        const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
        availableStorage = freeDiskStorage;
      } catch (error) {
        console.warn('Could not get storage info:', error);
      }

      setDeviceInfo({
        screenWidth: width,
        screenHeight: height,
        pixelDensity: scale,
        androidVersion: Platform.Version as number,
        availableStorage,
        isTablet: width >= 768, // Simple tablet detection
      });
    };

    updateDeviceInfo();

    const subscription = Dimensions.addEventListener('change', updateDeviceInfo);
    return () => subscription?.remove();
  }, []);

  return deviceInfo;
};