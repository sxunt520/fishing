import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';
import { useAppStore } from '@/stores/useAppStore';

export function useLocation() {//定义了一个自定义的 React Hook `useLocation`，用于获取用户的位置信息并处理相关的权限请求和错误状态。
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const setCurrentLocation = useAppStore((s) => s.setCurrentLocation);

  const requestLocation = useCallback(async () => {//定义了一个名为 `requestLocation` 的异步函数，用于请求用户的位置信息。该函数首先请求前台定位权限，如果权限被拒绝，则设置错误状态并在 Web 平台上使用一个默认位置作为回退。然后尝试获取当前位置信息，并将其存储在本地状态和全局状态中。如果获取位置信息失败，则设置错误状态并在 Web 平台上使用默认位置作为回退。最后，无论成功还是失败，都将加载状态设置为 `false`。
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();//请求前台定位权限，并获取权限状态。
      if (status !== 'granted') {
        setError('定位权限被拒绝');
        if (Platform.OS === 'web') {//如果权限被拒绝且运行在 Web 平台上，使用一个默认位置作为回退，以确保应用仍然能够显示地图和相关功能。
          const fallback = {
            coords: { latitude: 39.9042, longitude: 116.4074, altitude: 0, accuracy: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
            timestamp: Date.now(),
          } as Location.LocationObject;
          setLocation(fallback);//将默认位置存储在本地状态中，以便在地图上显示。
          setCurrentLocation({ latitude: 39.9042, longitude: 116.4074 });//将默认位置的经纬度存储在全局状态中，以便在应用的其他部分使用。
        }
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });//尝试获取当前位置信息，使用平衡的定位精度以节省电量。
      setLocation(loc);//将获取到的位置信息存储在本地状态中，以便在地图上显示。
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });//将获取到的位置信息存储在本地状态和全局状态中，以便在地图上显示和在应用的其他部分使用。
      setError(null);
    } catch (e) {
      setError('获取定位失败');
      if (Platform.OS === 'web') {
        const fallback = {
          coords: { latitude: 39.9042, longitude: 116.4074, altitude: 0, accuracy: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
          timestamp: Date.now(),
        } as Location.LocationObject;
        setLocation(fallback);
        setCurrentLocation({ latitude: 39.9042, longitude: 116.4074 });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {//在组件挂载时调用 `requestLocation` 函数，以便在应用启动时获取用户的位置信息。
    requestLocation();
  }, []);

  return { location, error, loading, requestLocation };
}
