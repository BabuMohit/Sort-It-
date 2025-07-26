import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  AccessibilityInfo,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { androidPermissionService } from '../services';
import { PermissionStatus } from '../types';

interface PermissionDeniedFallbackProps {
  onRetry?: () => void;
  onSkip?: () => void;
  showSkipOption?: boolean;
}

/**
 * Permission Denied Fallback UI Component
 * Shown when permissions are denied with clear guidance for users
 * Follows Material Design 3 patterns with accessibility support
 */
export const PermissionDeniedFallback: React.FC<PermissionDeniedFallbackProps> = ({
  onRetry,
  onSkip,
  showSkipOption = false
}) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    checkPermissionStatus();
    
    // Announce to screen readers
    AccessibilityInfo.announceForAccessibility(
      'Permissions are required to use Sort It. Please follow the instructions to enable them.'
    );
  }, []);

  const checkPermissionStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await androidPermissionService.checkPermissionStatus();
      setPermissionStatus(status);
      
      if (status.granted && onRetry) {
        onRetry();
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await androidPermissionService.openAppSettings();
      AccessibilityInfo.announceForAccessibility('Opening device settings');
      
      // Check status after a delay to see if user granted permissions
      setTimeout(checkPermissionStatus, 2000);
    } catch (error) {
      console.error('Error opening settings:', error);
      AccessibilityInfo.announceForAccessibility('Unable to open settings');
    }
  };

  const handleTryAgain = async () => {
    if (permissionStatus?.canAskAgain) {
      try {
        const granted = await androidPermissionService.requestAllPermissions();
        if (granted && onRetry) {
          AccessibilityInfo.announceForAccessibility('Permissions granted successfully');
          onRetry();
        } else {
          await checkPermissionStatus();
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    } else {
      await handleOpenSettings();
    }
  };

  const renderInstructionStep = (
    stepNumber: number,
    title: string,
    description: string,
    icon: string
  ) => (
    <View style={styles.instructionStep} accessible={true} accessibilityRole="text">
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText} accessibilityLabel={`Step ${stepNumber}`}>
          {stepNumber}
        </Text>
      </View>
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepIcon} accessibilityLabel={`${title} icon`}>
            {icon}
          </Text>
          <Text style={styles.stepTitle}>{title}</Text>
        </View>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );

  const getMainMessage = () => {
    if (!permissionStatus) {
      return 'Permission status unknown';
    }
    
    if (permissionStatus.canAskAgain) {
      return 'Sort It! needs permission to access your photos';
    }
    
    return 'Photo access was denied';
  };

  const getSubMessage = () => {
    if (!permissionStatus) {
      return 'Please check your device settings';
    }
    
    if (permissionStatus.canAskAgain) {
      return 'Tap "Grant Permissions" to allow Sort It! to organize your photos';
    }
    
    return 'Please enable photo access in your device settings to use Sort It!';
  };

  const getActionButtonText = () => {
    if (isCheckingStatus) return 'Checking...';
    if (permissionStatus?.canAskAgain) return 'Grant Permissions';
    return 'Open Settings';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.mainIcon} accessibilityLabel="Permission required icon">
              🔐
            </Text>
          </View>
          
          <Text style={styles.title} accessibilityRole="header">
            {getMainMessage()}
          </Text>
          
          <Text style={styles.subtitle}>
            {getSubMessage()}
          </Text>
        </View>

        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>How to Enable Permissions</Text>
          
          {permissionStatus?.canAskAgain ? (
            <View style={styles.simpleInstructions}>
              <Text style={styles.simpleInstructionText}>
                Tap the "Grant Permissions" button below and select "Allow" when prompted.
              </Text>
            </View>
          ) : (
            <View style={styles.detailedInstructions}>
              {renderInstructionStep(
                1,
                'Open Settings',
                'Tap "Open Settings" below to go to your device settings',
                '⚙️'
              )}
              
              {renderInstructionStep(
                2,
                'Find Sort It!',
                'Look for "Sort It!" in your app list or search for it',
                '🔍'
              )}
              
              {renderInstructionStep(
                3,
                'Enable Permissions',
                'Tap on "Permissions" and enable "Photos and videos" or "Storage"',
                '✅'
              )}
              
              {renderInstructionStep(
                4,
                'Return to App',
                'Come back to Sort It! and tap "Check Again" to continue',
                '🔄'
              )}
            </View>
          )}
        </View>

        <View style={styles.whySection}>
          <Text style={styles.sectionTitle}>Why Sort It! Needs This</Text>
          
          <View style={styles.reasonItem}>
            <Text style={styles.reasonIcon}>📱</Text>
            <Text style={styles.reasonText}>
              Access your photo library to show and organize your images
            </Text>
          </View>
          
          <View style={styles.reasonItem}>
            <Text style={styles.reasonIcon}>📁</Text>
            <Text style={styles.reasonText}>
              Create and manage albums to keep your photos organized
            </Text>
          </View>
          
          <View style={styles.reasonItem}>
            <Text style={styles.reasonIcon}>🔒</Text>
            <Text style={styles.reasonText}>
              All operations happen locally - your photos stay private
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleTryAgain}
            disabled={isCheckingStatus}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={getActionButtonText()}
            accessibilityHint={
              permissionStatus?.canAskAgain
                ? 'Requests photo access permissions'
                : 'Opens device settings to enable permissions'
            }
          >
            <Text style={styles.primaryButtonText}>
              {getActionButtonText()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={checkPermissionStatus}
            disabled={isCheckingStatus}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Check permissions again"
            accessibilityHint="Checks if permissions have been granted"
          >
            <Text style={styles.secondaryButtonText}>
              {isCheckingStatus ? 'Checking...' : 'Check Again'}
            </Text>
          </TouchableOpacity>

          {showSkipOption && onSkip && (
            <TouchableOpacity
              style={[styles.button, styles.textButton]}
              onPress={onSkip}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Skip for now"
              accessibilityHint="Continues without granting permissions"
            >
              <Text style={styles.textButtonText}>Skip for Now</Text>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff3e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
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
  instructionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  simpleInstructions: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
  },
  simpleInstructionText: {
    fontSize: 16,
    color: '#1565c0',
    textAlign: 'center',
    lineHeight: 24,
  },
  detailedInstructions: {
    gap: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  whySection: {
    marginBottom: 32,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reasonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  reasonText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
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
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
  },
  textButton: {
    backgroundColor: 'transparent',
  },
  textButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
});