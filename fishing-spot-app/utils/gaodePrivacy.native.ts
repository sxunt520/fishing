import ExpoGaodeMapModule from 'expo-gaode-map';
import { AMAP_ANDROID_KEY, AMAP_IOS_KEY, AMAP_WEB_KEY } from '@/constants/config';

let configured = false;
let configurePromise: Promise<void> | null = null;

export function ensureGaodePrivacyAndSdk() {
  if (configured) return Promise.resolve();//如果已经配置完成，直接返回一个已解决的 Promise。
  if (configurePromise) return configurePromise;//如果正在配置中，返回正在配置的 Promise，以避免重复配置。

  configurePromise = new Promise((resolve) => {//调用 `ExpoGaodeMapModule.setPrivacyConfig` 方法设置高德地图 SDK 的隐私配置，满足高德地图的隐私政策要求。
    ExpoGaodeMapModule.setPrivacyConfig({
      hasShow: true,
      hasContainsPrivacy: true,
      hasAgree: true,
      privacyVersion: '1.0',
    });

    ExpoGaodeMapModule.initSDK({//调用 `ExpoGaodeMapModule.initSDK` 方法初始化高德地图 SDK，传入相应平台的 API Key。
      androidKey: AMAP_ANDROID_KEY,
      iosKey: AMAP_IOS_KEY,
      webKey: AMAP_WEB_KEY,
    });

    setTimeout(() => {//由于高德地图 SDK 的隐私配置和初始化可能需要一些时间，使用 `setTimeout` 模拟一个短暂的延迟，确保配置完成后再将 `configured` 设置为 `true` 并解决 Promise。
      configured = true;
      resolve();
    }, 120);
  });

  return configurePromise;
}
