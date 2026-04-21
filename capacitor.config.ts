import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'ai.cashdash.app',
  appName: 'CashDash',
  webDir: 'capacitor-web',
  backgroundColor: '#fafafa',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://cashdash.ai',
    cleartext: true,
    allowNavigation: ['cashdash.ai', '*.cashdash.ai', '10.0.2.2', 'localhost'],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#fafafa',
      showSpinner: false,
      androidSpinnerStyle: 'large',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#fafafa',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
