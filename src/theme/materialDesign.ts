// Material Design 3 Theme Configuration for Sort It! Mobile

export const MaterialColors = {
  // Primary colors
  primary: '#007AFF',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E3F2FD',
  onPrimaryContainer: '#0D47A1',
  
  // Secondary colors
  secondary: '#6C757D',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F8F9FA',
  onSecondaryContainer: '#495057',
  
  // Tertiary colors
  tertiary: '#28A745',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#D4EDDA',
  onTertiaryContainer: '#155724',
  
  // Error colors
  error: '#DC3545',
  onError: '#FFFFFF',
  errorContainer: '#F8D7DA',
  onErrorContainer: '#721C24',
  
  // Surface colors
  surface: '#FFFFFF',
  onSurface: '#1A1A1A',
  surfaceVariant: '#F5F5F5',
  onSurfaceVariant: '#666666',
  
  // Background colors
  background: '#FFFFFF',
  onBackground: '#1A1A1A',
  
  // Outline colors
  outline: '#E0E0E0',
  outlineVariant: '#F0F0F0',
  
  // Shadow and elevation
  shadow: '#000000',
  scrim: '#000000',
  
  // Inverse colors
  inverseSurface: '#1A1A1A',
  onInverseSurface: '#FFFFFF',
  inversePrimary: '#90CAF9',
};

export const MaterialElevation = {
  level0: 0,
  level1: 1,
  level2: 3,
  level3: 6,
  level4: 8,
  level5: 12,
};

export const MaterialSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const MaterialTypography = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontWeight: '400' as const,
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontWeight: '400' as const,
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '400' as const,
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '400' as const,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400' as const,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400' as const,
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400' as const,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
};

export const MaterialComponents = {
  button: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 24,
    minWidth: 64,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  card: {
    borderRadius: 12,
    elevation: MaterialElevation.level1,
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  navigationBar: {
    height: 80,
    paddingBottom: 16,
  },
  appBar: {
    height: 64,
  },
};

export const MaterialMotion = {
  duration: {
    short1: 50,
    short2: 100,
    short3: 150,
    short4: 200,
    medium1: 250,
    medium2: 300,
    medium3: 350,
    medium4: 400,
    long1: 450,
    long2: 500,
    long3: 550,
    long4: 600,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
    emphasize: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
  },
};

// Touch target sizes for accessibility
export const TouchTargets = {
  minimum: 48, // 48dp minimum touch target
  recommended: 56, // 56dp recommended for primary actions
  large: 64, // 64dp for important actions
};

// Responsive breakpoints
export const Breakpoints = {
  compact: 600, // 0-599dp
  medium: 840, // 600-839dp
  expanded: 1200, // 840-1199dp
  large: 1600, // 1200-1599dp
  extraLarge: 1600, // 1600dp+
};

export const getResponsiveValue = (
  screenWidth: number,
  values: {
    compact: any;
    medium?: any;
    expanded?: any;
    large?: any;
    extraLarge?: any;
  }
) => {
  if (screenWidth >= Breakpoints.extraLarge) {
    return values.extraLarge || values.large || values.expanded || values.medium || values.compact;
  } else if (screenWidth >= Breakpoints.large) {
    return values.large || values.expanded || values.medium || values.compact;
  } else if (screenWidth >= Breakpoints.expanded) {
    return values.expanded || values.medium || values.compact;
  } else if (screenWidth >= Breakpoints.medium) {
    return values.medium || values.compact;
  } else {
    return values.compact;
  }
};