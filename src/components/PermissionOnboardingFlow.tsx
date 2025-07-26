import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  AccessibilityInfo
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { androidPermissionService } from '../services';
import { PermissionStatus } from '../types';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: React.ReactNode;
}

interface PermissionOnboardingFlowProps {
  onComplete: (granted: boolean) => void;
  onSkip?: () => void;
}

/**
 * Permission Onboarding Flow Component
 * Guides users through understanding and granting permissions
 * Follows Material Design 3 onboarding patterns with accessibility
 */
export const PermissionOnboardingFlow: React.FC<PermissionOnboardingFlowProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    checkInitialPermissions();
    
    // Announce current step to screen readers
    AccessibilityInfo.announceForAccessibility(
      `Onboarding step ${currentStep + 1} of ${onboardingSteps.length}`
    );
  }, [currentStep]);

  const checkInitialPermissions = async () => {
    try {
      const status = await androidPermissionService.checkPermissionStatus();
      setPermissionStatus(status);
      
      if (status.granted) {
        onComplete(true);
      }
    } catch (error) {
      console.error('Error checking initial permissions:', error);
    }
  };

  const animateStepTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: currentStep < onboardingSteps.length - 1 ? -50 : 50,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      animateStepTransition(() => {
        setCurrentStep(currentStep + 1);
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      animateStepTransition(() => {
        setCurrentStep(currentStep - 1);
      });
    }
  };

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    
    try {
      const allGranted = await androidPermissionService.requestAllPermissions();
      
      if (allGranted) {
        AccessibilityInfo.announceForAccessibility('Permissions granted successfully');
        onComplete(true);
      } else {
        const status = await androidPermissionService.checkPermissionStatus();
        setPermissionStatus(status);
        AccessibilityInfo.announceForAccessibility('Some permissions were denied');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      AccessibilityInfo.announceForAccessibility('Error requesting permissions');
    } finally {
      setIsRequesting(false);
    }
  };

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Sort It!',
      description: 'Organize your photos with simple swipe gestures',
      icon: '👋',
      content: (
        <View style={styles.stepContent}>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureText}>View all your photos in one place</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>👆</Text>
              <Text style={styles.featureText}>Swipe to organize instantly</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📁</Text>
              <Text style={styles.featureText}>Create custom albums</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔄</Text>
              <Text style={styles.featureText}>Undo with a simple tap</Text>
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'how-it-works',
      title: 'How Swipe Organization Works',
      description: 'Learn the simple gestures that make organizing effortless',
      icon: '✨',
      content: (
        <View style={styles.stepContent}>
          <View style={styles.gestureDemo}>
            <View style={styles.gestureItem}>
              <Text style={styles.gestureIcon}>👉</Text>
              <Text style={styles.gestureText}>Swipe right to keep photos</Text>
            </View>
            <View style={styles.gestureItem}>
              <Text style={styles.gestureIcon}>👈</Text>
              <Text style={styles.gestureText}>Swipe left to archive</Text>
            </View>
            <View style={styles.gestureItem}>
              <Text style={styles.gestureIcon}>👆</Text>
              <Text style={styles.gestureText}>Swipe up for custom albums</Text>
            </View>
            <View style={styles.gestureItem}>
              <Text style={styles.gestureIcon}>👇</Text>
              <Text style={styles.gestureText}>Swipe down to delete</Text>
            </View>
          </View>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 You can customize these gestures later in settings
            </Text>
          </View>
        </View>
      )
    },
    {
      id: 'privacy',
      title: 'Your Privacy Matters',
      description: 'Sort It! keeps your photos completely private',
      icon: '🔒',
      content: (
        <View style={styles.stepContent}>
          <View style={styles.privacyFeatures}>
            <View style={styles.privacyItem}>
              <Text style={styles.privacyIcon}>📱</Text>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>Local Processing</Text>
                <Text style={styles.privacyDescription}>
                  All operations happen on your device
                </Text>
              </View>
            </View>
            <View style={styles.privacyItem}>
              <Text style={styles.privacyIcon}>🚫</Text>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>No Cloud Upload</Text>
                <Text style={styles.privacyDescription}>
                  Your photos never leave your device
                </Text>
              </View>
            </View>
            <View style={styles.privacyItem}>
              <Text style={styles.privacyIcon}>🔐</Text>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>No Data Collection</Text>
                <Text style={styles.privacyDescription}>
                  We don't track or store your information
                </Text>
              </View>
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'permissions',
      title: 'Grant Photo Access',
      description: 'Allow Sort It! to access your photos to get started',
      icon: '🔑',
      content: (
        <View style={styles.stepContent}>
          <View style={styles.permissionExplanation}>
            <Text style={styles.permissionTitle}>Why we need this permission:</Text>
            <View style={styles.permissionReasons}>
              <View style={styles.reasonItem}>
                <Text style={styles.reasonIcon}>👀</Text>
                <Text style={styles.reasonText}>View your photos and videos</Text>
              </View>
              <View style={styles.reasonItem}>
                <Text style={styles.reasonIcon}>📁</Text>
                <Text style={styles.reasonText}>Create and manage albums</Text>
              </View>
              <View style={styles.reasonItem}>
                <Text style={styles.reasonIcon}>🔄</Text>
                <Text style={styles.reasonText}>Move photos between folders</Text>
              </View>
            </View>
          </View>
          
          {permissionStatus && !permissionStatus.granted && (
            <View style={styles.permissionStatus}>
              <Text style={styles.statusText}>
                {permissionStatus.canAskAgain
                  ? 'Tap "Grant Access" to continue'
                  : 'Please enable permissions in Settings'
                }
              </Text>
            </View>
          )}
        </View>
      )
    }
  ];

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText} accessibilityLabel={`Step ${currentStep + 1} of ${onboardingSteps.length}`}>
            {currentStep + 1} / {onboardingSteps.length}
          </Text>
        </View>
        
        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            <View style={styles.stepIconContainer}>
              <Text style={styles.stepIcon} accessibilityLabel={`${currentStepData.title} icon`}>
                {currentStepData.icon}
              </Text>
            </View>
            <Text style={styles.stepTitle} accessibilityRole="header">
              {currentStepData.title}
            </Text>
            <Text style={styles.stepDescription}>
              {currentStepData.description}
            </Text>
          </View>

          {currentStepData.content}
        </ScrollView>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, styles.previousButton, isFirstStep && styles.disabledButton]}
            onPress={handlePrevious}
            disabled={isFirstStep}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Previous step"
            accessibilityState={{ disabled: isFirstStep }}
          >
            <Text style={[styles.navButtonText, isFirstStep && styles.disabledButtonText]}>
              Previous
            </Text>
          </TouchableOpacity>

          {isLastStep ? (
            <TouchableOpacity
              style={[styles.navButton, styles.primaryButton]}
              onPress={handleRequestPermissions}
              disabled={isRequesting}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Grant photo access"
              accessibilityHint="Requests permission to access your photos"
            >
              <Text style={styles.primaryButtonText}>
                {isRequesting ? 'Requesting...' : 'Grant Access'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNext}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Next step"
            >
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIcon: {
    fontSize: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepContent: {
    flex: 1,
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  gestureDemo: {
    gap: 12,
    marginBottom: 24,
  },
  gestureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
  },
  gestureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  gestureText: {
    fontSize: 16,
    color: '#1565c0',
    fontWeight: '500',
  },
  tipBox: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#e65100',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  privacyFeatures: {
    gap: 16,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
  },
  privacyIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  permissionExplanation: {
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  permissionReasons: {
    gap: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  reasonText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  permissionStatus: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#1565c0',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48, // Accessibility: minimum touch target
  },
  previousButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  nextButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButtonText: {
    color: '#999999',
  },
});