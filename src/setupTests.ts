// Jest setup file for Sort It! Mobile Gallery App

// Mock React Native modules that aren't available in test environment
jest.mock('react-native', () => ({
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
    roundToNearestPixel: jest.fn((size) => Math.round(size)),
  },
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
    openSettings: jest.fn()
  },
  Platform: {
    OS: 'android',
    Version: 29
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
    hairlineWidth: 1,
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
  Image: {
    getSize: jest.fn((uri, success) => success(1920, 1080)),
    resolveAssetSource: jest.fn(() => ({ uri: 'test-uri', width: 100, height: 100 })),
    prefetch: jest.fn(() => Promise.resolve(true)),
    abortPrefetch: jest.fn(),
  },
  ActivityIndicator: 'ActivityIndicator',
  FlatList: 'FlatList',
  ScrollView: 'ScrollView',
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  RefreshControl: 'RefreshControl',
  SafeAreaView: 'SafeAreaView',
  StatusBar: 'StatusBar',
}));

// Mock Expo modules
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn()
}));

jest.mock('expo-permissions', () => ({
  askAsync: jest.fn(),
  getAsync: jest.fn(),
  MEDIA_LIBRARY: 'mediaLibrary'
}));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn()
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  }),
  useFocusEffect: jest.fn()
}));

// Mock Gesture Handler
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: 'PanGestureHandler',
  PinchGestureHandler: 'PinchGestureHandler',
  State: {
    BEGAN: 'BEGAN',
    ACTIVE: 'ACTIVE',
    END: 'END',
    CANCELLED: 'CANCELLED'
  },
  Directions: {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8
  }
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(() => ({})),
  withSpring: jest.fn((value) => value),
  withTiming: jest.fn((value) => value),
  runOnJS: jest.fn((fn) => fn),
  interpolate: jest.fn()
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};