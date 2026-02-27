/**
 * Jest setup — mock native modules that aren't available in the test environment.
 */

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (c: any) => c || View,
      View,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    useAnimatedProps: (fn: any) => fn(),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    withDelay: (_d: number, v: any) => v,
    withSequence: (...args: any[]) => args[args.length - 1],
    withRepeat: (v: any) => v,
    interpolate: (v: number, input: number[], output: number[]) => output[0],
    interpolateColor: (v: number, input: number[], output: string[]) => output[0],
    Easing: {
      linear: (v: any) => v,
      ease: (v: any) => v,
      quad: (v: any) => v,
      cubic: (v: any) => v,
      out: (fn: any) => fn,
      in: (fn: any) => fn,
      inOut: (fn: any) => fn,
    },
    runOnJS: (fn: any) => fn,
    createAnimatedComponent: (c: any) => c || View,
  };
});

jest.mock('react-native-worklets', () => ({}));

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: any) => children,
  Gesture: {
    Pan: () => ({ onUpdate: () => ({}), onEnd: () => ({}), minDistance: () => ({}) }),
    Tap: () => ({ onEnd: () => ({}) }),
    Race: () => ({}),
  },
  GestureHandlerRootView: ({ children }: any) => children,
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Circle: View,
    Rect: View,
    Line: View,
    G: View,
    Defs: View,
    LinearGradient: View,
    Stop: View,
    Text: View,
  };
});

jest.mock('expo-image', () => ({
  Image: require('react-native').Image,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: require('react-native').View,
}));

jest.mock('expo-camera', () => ({
  CameraView: require('react-native').View,
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
}));

jest.mock('expo-file-system/next', () => ({
  File: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    write: jest.fn(),
    uri: 'file://mock',
  })),
  Paths: { cache: {} },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn().mockResolvedValue({ success: false }),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([]),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    logIn: jest.fn().mockResolvedValue({ customerInfo: {} }),
    logOut: jest.fn().mockResolvedValue(undefined),
    getOfferings: jest.fn().mockResolvedValue({ current: null }),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
    getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {}, all: {} } }),
  },
  LOG_LEVEL: { WARN: 2 },
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('posthog-react-native', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  usePostHog: jest.fn(() => null),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test' } }, version: '1.0.0' },
}));

// Expo runtime globals
if (typeof globalThis.__ExpoImportMetaRegistry === 'undefined') {
  (globalThis as any).__ExpoImportMetaRegistry = { url: '' };
}
if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as any).structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });

jest.mock('expo-device', () => ({
  isDevice: false,
  deviceName: 'Test Device',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: 'Link',
  Redirect: 'Redirect',
  Stack: 'Stack',
  Tabs: 'Tabs',
}));
