import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PermissionRequestScreen,
  PermissionStatusIndicator,
  PermissionStatusBadge,
  PermissionDeniedFallback,
  PermissionOnboardingFlow
} from '../components';
import { androidPermissionService } from '../services';
import { PermissionStatus } from '../types';

type DemoMode = 'onboarding' | 'request' | 'status' | 'denied' | 'main';

/**
 * Permission Demo Screen
 * Demonstrates all permission-related UI components
 * Useful for testing and development
 */
export const PermissionDemoScreen: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<DemoMode>('main');
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const status = await androidPermissionService.checkPermissionStatus();
      setPermissionStatus(status);
    } catch (error) {
      console.error('Error checking permission status:', error);
    }
  };

  const handlePermissionsGranted = () => {
    Alert.alert('Success', 'Permissions granted successfully!');
    setCurrentMode('main');
    checkPermissionStatus();
  };

  const handlePermissionsDenied = () => {
    Alert.alert('Denied', 'Permissions were denied');
    setCurrentMode('denied');
    checkPermissionStatus();
  };

  const handleOnboardingComplete = (granted: boolean) => {
    if (granted) {
      handlePermissionsGranted();
    } else {
      handlePermissionsDenied();
    }
  };

  const handleRetry = () => {
    setCurrentMode('request');
  };

  const renderModeContent = () => {
    switch (currentMode) {
      case 'onboarding':
        return (
          <PermissionOnboardingFlow
            onComplete={handleOnboardingComplete}
            onSkip={() => setCurrentMode('main')}
          />
        );

      case 'request':
        return (
          <PermissionRequestScreen
            onPermissionsGranted={handlePermissionsGranted}
            onPermissionsDenied={handlePermissionsDenied}
          />
        );

      case 'denied':
        return (
          <PermissionDeniedFallback
            onRetry={handleRetry}
            onSkip={() => setCurrentMode('main')}
            showSkipOption={true}
          />
        );

      case 'status':
        return (
          <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.title}>Permission Status Components</Text>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status Indicator</Text>
                <PermissionStatusIndicator
                  onPermissionChange={(granted) => {
                    console.log('Permission changed:', granted);
                  }}
                  showDetails={true}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status Badge</Text>
                <View style={styles.badgeContainer}>
                  <PermissionStatusBadge
                    onPress={() => Alert.alert('Badge', 'Permission badge pressed')}
                  />
                  <Text style={styles.badgeLabel}>Tap the badge</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentMode('main')}
              >
                <Text style={styles.backButtonText}>Back to Main</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        );

      default:
        return (
          <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.title}>Permission Components Demo</Text>
              
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>Current Status</Text>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusText}>
                    Granted: {permissionStatus?.granted ? 'Yes' : 'No'}
                  </Text>
                  <Text style={styles.statusText}>
                    Can Ask Again: {permissionStatus?.canAskAgain ? 'Yes' : 'No'}
                  </Text>
                  <Text style={styles.statusText}>
                    Status: {permissionStatus?.status || 'Unknown'}
                  </Text>
                </View>
                <PermissionStatusBadge
                  onPress={() => Alert.alert('Status', 'Current permission status')}
                />
              </View>

              <View style={styles.buttonSection}>
                <Text style={styles.sectionTitle}>Demo Components</Text>
                
                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={() => setCurrentMode('onboarding')}
                >
                  <Text style={styles.demoButtonText}>🚀 Onboarding Flow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={() => setCurrentMode('request')}
                >
                  <Text style={styles.demoButtonText}>🔑 Permission Request</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={() => setCurrentMode('status')}
                >
                  <Text style={styles.demoButtonText}>📊 Status Components</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={() => setCurrentMode('denied')}
                >
                  <Text style={styles.demoButtonText}>❌ Denied Fallback</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionSection}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={checkPermissionStatus}
                >
                  <Text style={styles.actionButtonText}>Refresh Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    try {
                      await androidPermissionService.openAppSettings();
                    } catch (error) {
                      Alert.alert('Error', 'Could not open settings');
                    }
                  }}
                >
                  <Text style={styles.actionButtonText}>Open Settings</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        );
    }
  };

  return renderModeContent();
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  statusSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  statusInfo: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeLabel: {
    fontSize: 14,
    color: '#666666',
  },
  buttonSection: {
    marginBottom: 32,
  },
  demoButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionSection: {
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#666666',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});