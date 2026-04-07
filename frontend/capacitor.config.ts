import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dealgapiq.mobile',
  appName: 'DealGapIQ',
  webDir: 'www',
  server: {
    url: 'https://dealgapiq.com',
    cleartext: false,
    allowNavigation: [
      'dealgapiq.com',
      '*.dealgapiq.com',
      'accounts.google.com',
    ],
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000',
    preferredContentMode: 'mobile',
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
