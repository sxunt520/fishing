import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';
import { useAppStore } from '@/stores/useAppStore';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const setCurrentLocation = useAppStore((s) => s.setCurrentLocation);

  const requestLocation = useCallback(async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('定位权限被拒绝');
        if (Platform.OS === 'web') {
          const fallback = {
            coords: { latitude: 39.9042, longitude: 116.4074, altitude: 0, accuracy: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
            timestamp: Date.now(),
          } as Location.LocationObject;
          setLocation(fallback);
          setCurrentLocation({ latitude: 39.9042, longitude: 116.4074 });
        }
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
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

  useEffect(() => {
    requestLocation();
  }, []);

  return { location, error, loading, requestLocation };
}
