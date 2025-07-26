// Type definitions for permission-related components

import { PermissionStatus } from '../types';

export interface PermissionRequestScreenProps {
  onPermissionsGranted: () => void;
  onPermissionsDenied: () => void;
}

export interface PermissionStatusIndicatorProps {
  onPermissionChange?: (granted: boolean) => void;
  showDetails?: boolean;
  style?: any;
}

export interface PermissionDeniedFallbackProps {
  onRetry?: () => void;
  onSkip?: () => void;
  showSkipOption?: boolean;
}

export interface PermissionOnboardingFlowProps {
  onComplete: (granted: boolean) => void;
  onSkip?: () => void;
}