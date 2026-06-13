import ExpoGaodeMapModule from 'expo-gaode-map';
import { AMAP_ANDROID_KEY, AMAP_IOS_KEY, AMAP_WEB_KEY } from '@/constants/config';

let configured = false;
let configurePromise: Promise<void> | null = null;

export function ensureGaodePrivacyAndSdk() {
  if (configured) return Promise.resolve();
  if (configurePromise) return configurePromise;

  configurePromise = new Promise((resolve) => {
    ExpoGaodeMapModule.setPrivacyConfig({
      hasShow: true,
      hasContainsPrivacy: true,
      hasAgree: true,
      privacyVersion: '1.0',
    });

    ExpoGaodeMapModule.initSDK({
      androidKey: AMAP_ANDROID_KEY,
      iosKey: AMAP_IOS_KEY,
      webKey: AMAP_WEB_KEY,
    });

    setTimeout(() => {
      configured = true;
      resolve();
    }, 120);
  });

  return configurePromise;
}
