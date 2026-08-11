import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://dealgapiq.com';
const isLocal = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.dealgapiq.mobile',
  appName: 'DealGapIQ',
  webDir: 'www',
  server: {
    url: serverUrl,
    cleartext: isLocal,
    allowNavigation: [
      'dealgapiq.com',
      '*.dealgapiq.com',
      'accounts.google.com',
    ],
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000',
    // "recommended" lets iPad/Mac Catalyst use desktop-width layouts instead of
    // forcing a mobile user-agent / content mode (needed for Mac App Store).
    preferredContentMode: 'recommended',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 300,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
