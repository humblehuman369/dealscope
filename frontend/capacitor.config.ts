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
      'dealscope-production.up.railway.app',
      'api.dealgapiq.com',
      'api-staging.dealgapiq.com',
    ],
  },
  ios: {
    scheme: 'DealGapIQ',
    allowsLinkPreview: false,
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
  },
};

export default config;
