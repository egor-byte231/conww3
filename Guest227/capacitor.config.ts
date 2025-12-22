import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.novatune.ai',
  appName: 'NovaTune AI',
  webDir: 'dist',  // <-- правильно, після vite build
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;
