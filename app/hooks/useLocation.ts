import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import ExpoGaodeMapModule from 'expo-gaode-map';
import { useAppStore } from '@/stores/useAppStore';
import { ensureGaodePrivacyAndSdk } from '@/utils/gaodePrivacy';
import { spotApi } from '@/api/client';
import { getAndroidSystemLocation } from '@/utils/androidSystemLocation';

const FALLBACK_LOCATION = { latitude: 39.9042, longitude: 116.4074 };

export function useLocation() {//定义了一个自定义的 React Hook `useLocation`，用于获取用户的位置信息并处理相关的权限请求和错误状态。
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const rawCachedLocation = useAppStore((s) => s.currentLocation);
  const cachedLocation = hasUsableCachedLocation(rawCachedLocation) ? rawCachedLocation : null;
  const setCurrentLocation = useAppStore((s) => s.setCurrentLocation);

  /*
  /////////执行定位逻辑//////////
  requestLocation() 的顺序大概是：
    检查系统定位服务是否开启。
    检查定位 provider 状态。
    申请前台定位权限。
    Android 下尝试打开网络定位 provider。
    尝试高德定位 requestGaodeLocation()。
    高德失败后，尝试 Android 原生系统定位 requestAndroidSystemLocation()。
    再尝试 Expo getLastKnownPositionAsync()。
    再尝试 Expo getCurrentPositionAsync()。
    再尝试 Expo watch 监听一次定位。
    最后用后端 /spots/ip-location 做 IP 城市定位兜底。
    成功后写入：location
    store.currentLocation
    地图首页会监听这个值并移动地图。
  */
  const requestLocation = useCallback(async () => {//定义了一个名为 `requestLocation` 的异步函数，用于请求用户的位置信息。该函数首先请求前台定位权限，如果权限被拒绝，则设置错误状态并在 Web 平台上使用一个默认位置作为回退。然后尝试获取当前位置信息，并将其存储在本地状态和全局状态中。如果获取位置信息失败，则设置错误状态并在 Web 平台上使用默认位置作为回退。最后，无论成功还是失败，都将加载状态设置为 `false`。
    let lastError = '';
    const applyLocation = (coords: { latitude: number; longitude: number }, source: string, nextError: string | null = null) => {
      const loc = makeLocationObject(coords);
      console.log(`[Location] ${source}:`, coords.latitude, coords.longitude);
      setLocation(loc);
      setCurrentLocation(coords);
      setError(nextError);
      return loc;
    };

    ///////检查系统定位服务是否开启///////
    try {
      setLoading(true);
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      console.log('[Location] servicesEnabled:', servicesEnabled);
      const providerStatus = await Location.getProviderStatusAsync().catch((error) => {
        console.log('[Location] providerStatus skipped:', error?.message || error);
        return null;
      });
      if (providerStatus) {//检查定位 provider 状态
        console.log('[Location] providerStatus:', JSON.stringify(providerStatus));
      }
      if (!servicesEnabled) {
        setError('系统定位服务未开启');
        return cachedLocation ? applyLocation(cachedLocation, 'cached-services-off') : null;
      }

      const beforePermission = await Location.getForegroundPermissionsAsync();
      console.log('[Location] permission before:', beforePermission.status, beforePermission.canAskAgain);
      const { status, canAskAgain } = beforePermission.status === 'granted'
        ? beforePermission
        : await Location.requestForegroundPermissionsAsync();//请求前台定位权限，并获取权限状态。
      console.log('[Location] permission after:', status, canAskAgain);
      if (status !== 'granted') {
        setError('定位权限被拒绝');
        return cachedLocation ? applyLocation(cachedLocation, 'cached-permission-denied') : null;
      }

      if (Platform.OS === 'android') {//Android 下尝试打开网络定位 provider
        await Location.enableNetworkProviderAsync().catch((error) => {
          console.log('[Location] enableNetworkProvider skipped:', error?.message || error);
        });
      }

      //////尝试高德定位//////
      const gaodeLocation = await requestGaodeLocation().catch((error) => {
        const errorText = formatLocationError(error);
        lastError = `高德定位失败: ${errorText}`;
        console.log('[Location] gaode skipped:', errorText);
        return null;
      });
      if (gaodeLocation) {
        return applyLocation(gaodeLocation, 'gaode current');
      }

      /////// 尝试 Android 原生系统定位 requestAndroidSystemLocation() ///////
      const androidLocation = await requestAndroidSystemLocation().catch((error) => {
        lastError = `Android系统定位失败: ${formatLocationError(error)}`;
        console.log('[Location] android system skipped:', formatLocationError(error));
        return null;
      });
      if (androidLocation) {
        return applyLocation(androidLocation, 'android system');
      }

      //////再尝试 Expo getLastKnownPositionAsync()//////
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 1000 * 60 * 30, requiredAccuracy: 3000 }).catch((error) => {
        lastError = `系统上次定位失败: ${error?.message || error}`;
        console.log('[Location] lastKnown skipped:', error?.message || error);
        return null;
      });
      if (lastKnown) {
        return applyLocation({ latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude }, 'lastKnown');
      }

      //////再尝试 Expo getCurrentPositionAsync()//////
      const current = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest, mayShowUserSettingsDialog: true }),
        12000,
        '系统当前定位超时',
      ).catch((error) => {
        lastError = `系统当前定位失败: ${error?.message || error}`;
        console.log('[Location] current skipped:', error?.message || error);
        return null;
      });
      if (current) {
        return applyLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude }, 'current');
      }

      ///////再尝试 Expo watch 监听一次定位//////
      const watched = await getFirstWatchedLocation().catch((error) => {
        lastError = `连续定位失败: ${error?.message || error}`;
        console.log('[Location] watch skipped:', error?.message || error);
        return null;
      });
      if (watched) {
        return applyLocation({ latitude: watched.coords.latitude, longitude: watched.coords.longitude }, 'watch');
      }

      //////最后用后端 /spots/ip-location 做 IP 城市定位兜底//////
      const ipLocation = await requestIpLocation().catch((error) => {
        lastError = `IP定位失败: ${error?.message || error}`;
        console.log('[Location] ip skipped:', error?.message || error);
        return null;
      });
      if (ipLocation) {
        return applyLocation(ipLocation, 'amap-ip', 'GPS定位失败，已使用城市定位');
      }

      throw new Error(lastError || '所有定位来源都失败');
    } catch (e: any) {
      console.log('[Location] error:', e?.message || e);
      setError(e?.message ? `获取定位失败: ${e.message}` : '获取定位失败');
      if (cachedLocation) {
        return applyLocation(cachedLocation, 'cached-error');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [cachedLocation, setCurrentLocation]);

  useEffect(() => {//在组件挂载时调用 `requestLocation` 函数，以便在应用启动时获取用户的位置信息。
    requestLocation();
  }, []);

  return { location, error, loading, requestLocation };
}

//尝试高德定位
async function requestGaodeLocation() {
  if (Platform.OS === 'web') return null;
  await ensureGaodePrivacyAndSdk();
  const permission = await ExpoGaodeMapModule.requestLocationPermission().catch((error) => {
    console.log('[Location] gaode permission skipped:', error?.message || error);
    return null;
  });
  if (permission) {
    console.log('[Location] gaode permission:', permission.status, permission.granted);
  }
  (ExpoGaodeMapModule as any).setLocationMode?.(1);
  (ExpoGaodeMapModule as any).setGpsFirst?.(true);
  (ExpoGaodeMapModule as any).setOnceLocation?.(true);
  (ExpoGaodeMapModule as any).setOnceLocationLatest?.(true);
  (ExpoGaodeMapModule as any).setLocationCacheEnable?.(false);
  (ExpoGaodeMapModule as any).setLocationTimeout?.(30000);
  (ExpoGaodeMapModule as any).setLocatingWithReGeocode?.(false);
  ExpoGaodeMapModule.start();
  const location = await withTimeout(ExpoGaodeMapModule.getCurrentLocation(), 30000, '高德定位超时');
  console.log('[Location] gaode raw:', JSON.stringify(location));
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) return null;
  return { latitude, longitude };
}

async function requestIpLocation() {
  const res: any = await spotApi.getIpLocation();
  if (!res?.latitude || !res?.longitude) return null;
  return { latitude: Number(res.latitude), longitude: Number(res.longitude) };
}

async function requestAndroidSystemLocation() {
  if (Platform.OS !== 'android') return null;
  const location = await getAndroidSystemLocation(15000);
  if (!location) return null;
  console.log('[Location] android system raw:', JSON.stringify(location));
  return { latitude: location.latitude, longitude: location.longitude };
}

async function getFirstWatchedLocation() {
  return new Promise<Location.LocationObject>((resolve, reject) => {
    let subscription: Location.LocationSubscription | null = null;
    const timer = setTimeout(() => {
      subscription?.remove();
      reject(new Error('连续定位超时'));
    }, 15000);

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Lowest,
        timeInterval: 1000,
        distanceInterval: 0,
        mayShowUserSettingsDialog: true,
      },
      (location) => {
        clearTimeout(timer);
        subscription?.remove();
        resolve(location);
      },
    ).then((sub) => {
      subscription = sub;
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function formatLocationError(error: any) {
  if (!error) return 'unknown';
  const parts = [
    error.name,
    error.code,
    error.message,
    error.nativeStackAndroid ? JSON.stringify(error.nativeStackAndroid) : '',
  ].filter(Boolean);
  if (parts.length) return parts.join(' | ');
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function hasUsableCachedLocation(location?: { latitude: number; longitude: number } | null) {
  if (!location) return false;
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return false;
  if (location.latitude === 0 && location.longitude === 0) return false;
  if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) return false;
  return !isFallbackLocation(location);
}

function isFallbackLocation(location: { latitude: number; longitude: number }) {
  return Math.abs(location.latitude - FALLBACK_LOCATION.latitude) < 0.00001
    && Math.abs(location.longitude - FALLBACK_LOCATION.longitude) < 0.00001;
}

function makeLocationObject(coords: { latitude: number; longitude: number }) {
  return {
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: 0,
      accuracy: 0,
      altitudeAccuracy: 0,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  } as Location.LocationObject;
}
