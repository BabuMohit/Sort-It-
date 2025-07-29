// Material Design 3 Theme Configuration for Sort It! Mobile

export const materialColors = {
  // Color palette for swipe actions and UI elements
  red: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336',
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },
  green: {
    50: '#E8F5E8',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },
  blue: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  orange: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800',
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

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