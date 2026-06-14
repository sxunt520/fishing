import { NativeModules, Platform } from 'react-native';

type AndroidLocationResult = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source?: string;
  timestamp?: number;
};

export async function getAndroidSystemLocation(timeoutMs = 15000): Promise<AndroidLocationResult | null> {
  if (Platform.OS !== 'android') return null;
  const module = NativeModules.AndroidLocationModule;
  if (!module?.getCurrentLocation) {
    console.log('[Location] android native module missing');
    return null;
  }
  const location = await module.getCurrentLocation(timeoutMs);
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
    return null;
  }
  return {
    latitude,
    longitude,
    accuracy: Number(location?.accuracy || 0),
    source: location?.source,
    timestamp: Number(location?.timestamp || 0),
  };
}
