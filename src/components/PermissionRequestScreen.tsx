import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
  AccessibilityInfo
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { androidPermissionService } from '../services/AndroidPermissionService';
import { PermissionStatus } from '../types';

interface PermissionRequestScreenProps {
  onPermissionsGranted: () => void;
  onPermissionsDenied: () => void;
}

/**
 * Permission Request Screen Component
 * Follows Material Design 3 patterns for permission requests
 * Provides clear explanations and accessibility support
 */
export const PermissionRequestScreen: React.FC<PermissionRequestScreenProps> = ({
  onPermissionsGranted,
  onPermissionsDenied
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [showRationale, setShowRationale] = useState(false);

  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    checkInitialPermissions();
    
    // Announce screen to screen readers
    AccessibilityInfo.announceForAccessibility(
      'Permission request screen. Sort It needs access to your photos to organize them.'
    );
  }, []);

  const checkInitialPermissions = async () => {
    try {
      const status = await androidPermissionService.checkPermissionStatus();
      setPermissionStatus(status);
      
      if (status.granted) {
        onPermissionsGranted();
      }
    } catch (error) {
      console.error('Error checking initial permissions:', error);
    }
  };

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    
    try {
      // Check if we should show rationale first
      const shouldShowRationale = await androidPermissionService.shouldShowPermissionRationale('mediaLibrary');
      
      if (shouldShowRationale) {
        setShowRationale(true);
        setIsRequesting(false);
        return;
      }

      // Request all permissions
      const allGranted = await androidPermissionService.requestAllPermissions();
      
      if (allGranted) {
        AccessibilityInfo.announceForAccessibility('Permissions granted successfully');
        onPermissionsGranted();
      } else {
        const status = await androidPermissionService.checkPermissionStatus();
        setPermissionStatus(status);
        
        if (!status.canAskAgain) {
          AccessibilityInfo.announceForAccessibility('Permissions denied. Please enable them in settings.');
        }
        
        onPermissionsDenied();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      AccessibilityInfo.announceForAccessibility('Error requesting permissions');
      onPermissionsDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleContinueAfterRationale = async () => {
    setShowRationale(false);
    await handleRequestPermissions();
  };

  const handleOpenSettings = async () => {
    try {
      await androidPermissionService.openAppSettings();
      AccessibilityInfo.announceForAccessibility('Opening app settings');
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  };

  const renderPermissionItem = (
    icon: string,
    title: string,
    description: string,
    isGranted?: boolean
  ) => (
    <View style={styles.permissionItem} accessible={true} accessibilityRole="text">
      <View style={styles.permissionIcon}>
        <Text style={styles.iconText} accessibilityLabel={`${title} icon`}>
          {icon}
        </Text>
        {isGranted && (
          <View style={styles.checkmark} accessibilityLabel="Permission granted">
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>
    </View>
  );

  if (showRationale) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Why Sort It! Needs Permissions
            </Text>
            <Text style={styles.subtitle}>
              To organize your photos effectively, Sort It! needs access to your device's photo library.
            </Text>
          </View>

          <View style={styles.rationaleContent}>
            <Text style={styles.rationaleText}>
              Sort It! uses these permissions to:
            </Text>
            
            {renderPermissionItem(
              '📱',
              'Access Your Photos',
              'View and organize photos and videos in your gallery'
            )}
            
            {renderPermissionItem(
              '📁',
              'Create Albums',
              'Create new albums and move photos between them'
            )}
            
            {renderPermissionItem(
              '🔒',
              'Keep Data Private',
              'All operations happen locally on your device'
            )}

            <View style={styles.privacyNote}>
              <Text style={styles.privacyText}>
                🔐 Your photos never leave your device. Sort It! works completely offline.
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleContinueAfterRationale}
              disabled={isRequesting}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Continue and grant permissions"
              accessibilityHint="Grants Sort It access to your photos"
            >
              <Text style={styles.primaryButtonText}>
                {isRequesting ? 'Requesting...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>📱</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Welcome to Sort It!
          </Text>
          <Text style={styles.subtitle}>
            Organize your photos with simple swipe gestures
          </Text>
        </View>

        <View style={styles.permissionsSection}>
          <Text style={styles.sectionTitle}>Required Permissions</Text>
          
          {renderPermissionItem(
            '🖼️',
            'Photo Library Access',
            'View and organize your photos and videos',
            permissionStatus?.granted
          )}
          
          {renderPermissionItem(
            '💾',
            'Storage Access',
            'Create albums and save your organization preferences',
            permissionStatus?.granted
          )}
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What You Can Do</Text>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>👆</Text>
            <Text style={styles.featureText}>Swipe photos to organize them instantly</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📁</Text>
            <Text style={styles.featureText}>Create custom albums for different categories</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔄</Text>
            <Text style={styles.featureText}>Undo actions with a simple tap</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {permissionStatus && !permissionStatus.granted && !permissionStatus.canAskAgain ? (
            <>
              <Text style={styles.settingsMessage}>
                Permissions were denied. Please enable them in Settings to use Sort It!
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleOpenSettings}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Open app settings"
                accessibilityHint="Opens device settings to enable permissions"
              >
                <Text style={styles.primaryButtonText}>Open Settings</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRequestPermissions}
              disabled={isRequesting}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Grant permissions"
              accessibilityHint="Requests access to photos and storage"
            >
              <Text style={styles.primaryButtonText}>
                {isRequesting ? 'Requesting Permissions...' : 'Grant Permissions'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    minHeight: 48, // Accessibility: minimum touch target
  },
  permissionIcon: {
    position: 'relative',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  checkmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  rationaleContent: {
    marginBottom: 32,
  },
  rationaleText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 20,
    fontWeight: '500',
  },
  privacyNote: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  privacyText: {
    fontSize: 14,
    color: '#2e7d32',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 48, // Accessibility: minimum touch target
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
});