
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.novatonex.ai',
  appName: 'NovaToneX',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    buildOptions: {
      releaseType: 'APK'
    },
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;