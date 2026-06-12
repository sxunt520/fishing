const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) return;
    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();
    if (key && process.env[key] == null) process.env[key] = value;
  });
}

loadDotEnv();

const androidKey = process.env.EXPO_PUBLIC_AMAP_ANDROID_KEY || '';
const iosKey = process.env.EXPO_PUBLIC_AMAP_IOS_KEY || '';

module.exports = {
  expo: {
    name: '钓点分享',
    slug: 'fishing-spot-app',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'fishingspot',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.fishingspot.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: '需要定位权限来显示附近的钓点',
        NSCameraUsageDescription: '需要相机权限来拍摄钓鱼照片',
      },
    },
    android: {
      package: 'com.fishingspot.app',
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_NETWORK_STATE',
        'ACCESS_WIFI_STATE',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'single',
    },
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: '需要定位权限来显示附近的钓点',
        },
      ],
      [
        'expo-gaode-map',
        {
          androidKey,
          iosKey,
          locationDescription: '需要定位权限来显示附近的钓点',
        },
      ],
      'expo-font',
    ],
  },
};
