import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dealgapiq.mobile',
  appName: 'DealGapIQ',
  webDir: 'www',
  server: {
    url: 'https://dealgapiq.com',
    cleartext: false,
  },
  ios: {
    scheme: 'DealGapIQ',
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
