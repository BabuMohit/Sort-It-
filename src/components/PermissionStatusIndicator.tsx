import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AccessibilityInfo
} from 'react-native';
import { androidPermissionService } from '../services/AndroidPermissionService';
import { PermissionStatus } from '../types';

interface PermissionStatusIndicatorProps {
  onPermissionChange?: (granted: boolean) => void;
  showDetails?: boolean;
  style?: any;
}

/**
 * Permission Status Indicator Component
 * Shows current permission status with Material Design 3 styling
 * Provides quick access to permission management
 */
export const PermissionStatusIndicator: React.FC<PermissionStatusIndicatorProps> = ({
  onPermissionChange,
  showDetails = true,
  style
}) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPermissionStatus();
    
    // Set up periodic permission checks
    const interval = setInterval(checkPermissionStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const status = await androidPermissionService.checkPermissionStatus();
      setPermissionStatus(status);
      setIsLoading(false);
      
      if (onPermissionChange) {
        onPermissionChange(status.granted);
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
      setIsLoading(false);
    }
  };

  const handlePermissionAction = async () => {
    if (!permissionStatus) return;

    if (permissionStatus.granted) {
      // Show current status
      Alert.alert(
        'Permissions Granted',
        'Sort It! has access to your photos and can organize them.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (permissionStatus.canAskAgain) {
      // Try to request permissions again
      Alert.alert(
        'Grant Permissions',
        'Sort It! needs access to your photos to organize them. Would you like to grant permissions now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant',
            style: 'default',
            onPress: async () => {
              try {
                const granted = await androidPermissionService.requestAllPermissions();
                if (granted) {
                  AccessibilityInfo.announceForAccessibility('Permissions granted');
                  await checkPermissionStatus();
                } else {
                  AccessibilityInfo.announceForAccessibility('Permissions denied');
                }
              } catch (error) {
                console.error('Error requesting permissions:', error);
              }
            }
          }
        ]
      );
    } else {
      // Permission permanently denied, show settings option
      Alert.alert(
        'Permissions Required',
        'Sort It! needs photo access to function. Please enable permissions in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            style: 'default',
            onPress: async () => {
              try {
                await androidPermissionService.openAppSettings();
                AccessibilityInfo.announceForAccessibility('Opening app settings');
              } catch (error) {
                console.error('Error opening settings:', error);
              }
            }
          }
        ]
      );
    }
  };

  const getStatusColor = () => {
    if (isLoading) return '#9E9E9E';
    if (!permissionStatus) return '#F44336';
    return permissionStatus.granted ? '#4CAF50' : '#FF9800';
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking...';
    if (!permissionStatus) return 'Error';
    if (permissionStatus.granted) return 'Granted';
    return permissionStatus.canAskAgain ? 'Denied' : 'Blocked';
  };

  const getStatusIcon = () => {
    if (isLoading) return '⏳';
    if (!permissionStatus) return '❌';
    if (permissionStatus.granted) return '✅';
    return permissionStatus.canAskAgain ? '⚠️' : '🚫';
  };

  const getAccessibilityLabel = () => {
    const status = getStatusText();
    return `Permission status: ${status}. Tap to ${
      permissionStatus?.granted ? 'view details' : 'manage permissions'
    }`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePermissionAction}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={
        permissionStatus?.granted
          ? 'Shows permission details'
          : 'Opens permission management options'
      }
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon} accessibilityLabel={`Status: ${getStatusText()}`}>
            {getStatusIcon()}
          </Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Photo Access</Text>
          {showDetails && (
            <Text style={[styles.status, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          )}
        </View>
        
        <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
      </View>
      
      {showDetails && !permissionStatus?.granted && (
        <Text style={styles.actionHint}>
          Tap to {permissionStatus?.canAskAgain ? 'grant permissions' : 'open settings'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Compact Permission Status Badge
 * Minimal indicator for use in headers or toolbars
 */
export const PermissionStatusBadge: React.FC<{
  onPress?: () => void;
  style?: any;
}> = ({ onPress, style }) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await androidPermissionService.checkPermissionStatus();
        setPermissionStatus(status);
      } catch (error) {
        console.error('Error checking permission status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!permissionStatus) return '#F44336';
    return permissionStatus.granted ? '#4CAF50' : '#FF9800';
  };

  const getStatusIcon = () => {
    if (!permissionStatus) return '❌';
    return permissionStatus.granted ? '✅' : '⚠️';
  };

  return (
    <TouchableOpacity
      style={[styles.badge, style]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Permission status: ${
        permissionStatus?.granted ? 'granted' : 'denied'
      }`}
    >
      <Text style={styles.badgeIcon}>{getStatusIcon()}</Text>
      <View style={[styles.badgeIndicator, { backgroundColor: getStatusColor() }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 48, // Accessibility: minimum touch target
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionHint: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  badge: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 20,
  },
  badgeIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
});