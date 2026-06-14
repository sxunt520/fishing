import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Device from 'expo-device';
import { Circle, Marker, MapView, MapViewRef } from 'expo-gaode-map';
import { Ionicons } from '@expo/vector-icons';
import type { MapRegion } from '@/types/map';
import { regionToZoom, zoomToDelta } from '@/types/map';
import { ensureGaodePrivacyAndSdk } from '@/utils/gaodePrivacy';

type LocationPoint = { latitude: number; longitude: number };

export type MapSurfaceHandle = {
  animateToRegion: (region: MapRegion) => void;
};

type Props = {
  region: MapRegion;
  spots: any[];
  waterCandidates?: any[];
  currentLocation: LocationPoint | null;
  onRegionChangeComplete: (region: MapRegion) => void;
  onMarkerPress: (spot: any) => void;
  onCandidatePress?: (spot: any) => void;
  onNativeLocation?: (location: { latitude: number; longitude: number; accuracy?: number }) => void;
};

ensureGaodePrivacyAndSdk();//在模块加载时调用 `ensureGaodePrivacyAndSdk` 函数，确保高德地图的隐私政策已同意并且 SDK 已正确加载，以便在地图组件中使用高德地图相关功能。

const MapSurface = forwardRef<MapSurfaceHandle, Props>(
  ({ region, spots, waterCandidates = [], currentLocation, onRegionChangeComplete, onMarkerPress, onCandidatePress, onNativeLocation }, ref) => {
    const mapRef = useRef<MapViewRef>(null);
    const isProgrammaticMove = useRef(false);
    const [mapReady, setMapReady] = useState(false);
    const useEmulatorFallback = Platform.OS === 'android' && !Device.isDevice;//安卓模拟器识别,不再渲染高德原生 MapView，改成一个 RN 预览地图

    useImperativeHandle(ref, () => ({//使用 `useImperativeHandle` 钩子暴露一个 `animateToRegion` 方法，使父组件能够通过引用调用该方法来控制地图的动画移动。
      animateToRegion: (nextRegion) => {
        console.log('[MapSurface] animateToRegion:', nextRegion.latitude, nextRegion.longitude);
        if (useEmulatorFallback) {//如果当前处于安卓模拟器环境，直接调用 `onRegionChangeComplete` 回调函数来更新地图区域，而不执行动画移动。
          onRegionChangeComplete(nextRegion);
          return;
        }
        if (!mapRef.current) {
          console.log('[MapSurface] mapRef not ready, region prop will sync later');
          return;
        }
        isProgrammaticMove.current = true;
        const zoom = regionToZoom(nextRegion);
        mapRef.current.setCenter({ latitude: nextRegion.latitude, longitude: nextRegion.longitude }, true).catch((error) => {
          console.log('[MapSurface] setCenter failed:', error?.message || error);
        });
        mapRef.current.setZoom(zoom, true).catch((error) => {
          console.log('[MapSurface] setZoom failed:', error?.message || error);
        });
        mapRef.current.moveCamera({ target: { latitude: nextRegion.latitude, longitude: nextRegion.longitude }, zoom }, 260).catch((error) => {
          console.log('[MapSurface] moveCamera failed:', error?.message || error);
        });
        setTimeout(() => {
          isProgrammaticMove.current = false;
        }, 320);
      },
    }));

    useEffect(() => {
      if (useEmulatorFallback) {
        setMapReady(true);
        return;
      }
      let mounted = true;
      ensureGaodePrivacyAndSdk()
        .then(() => {
          if (mounted) setMapReady(true);
        })
        .catch((error) => {
          console.error('高德地图初始化失败', error);
        });

      return () => {
        mounted = false;
      };
    }, [useEmulatorFallback]);

    useEffect(() => {
      if (useEmulatorFallback || !mapRef.current) return;
      console.log('[MapSurface] sync region:', region.latitude, region.longitude, 'ready:', mapReady);
      isProgrammaticMove.current = true;
      const zoom = regionToZoom(region);
      mapRef.current.setCenter({ latitude: region.latitude, longitude: region.longitude }, true).catch((error) => {
        console.log('[MapSurface] sync setCenter failed:', error?.message || error);
      });
      mapRef.current.setZoom(zoom, true).catch((error) => {
        console.log('[MapSurface] sync setZoom failed:', error?.message || error);
      });
      setTimeout(() => {
        isProgrammaticMove.current = false;
      }, 280);
    }, [mapReady, useEmulatorFallback, region.latitude, region.longitude, region.latitudeDelta]);

    useEffect(() => {
      if (useEmulatorFallback || !mapReady) return;
      const timer = setTimeout(() => {
        if (!mapRef.current) return;
        console.log('[MapSurface] delayed sync region:', region.latitude, region.longitude);
        mapRef.current.setCenter({ latitude: region.latitude, longitude: region.longitude }, false).catch((error) => {
          console.log('[MapSurface] delayed setCenter failed:', error?.message || error);
        });
        mapRef.current.setZoom(regionToZoom(region), false).catch((error) => {
          console.log('[MapSurface] delayed setZoom failed:', error?.message || error);
        });
      }, 500);
      return () => clearTimeout(timer);
    }, [mapReady, useEmulatorFallback]);

    if (!mapReady) return <View style={StyleSheet.absoluteFill} />;

    if (useEmulatorFallback) {//如果当前处于安卓模拟器环境，渲染一个自定义的预览地图界面，显示一个简单的地图背景和钓点标记，而不使用高德地图组件。
      return (
        <View style={styles.fallbackMap}>
          <View style={styles.fallbackPark} />
          <View style={styles.fallbackWater} />
          <View style={styles.fallbackGrid} />
          <Text style={styles.fallbackLabel}>模拟器预览模式：真机将使用高德地图</Text>
          {spots.map((spot) => {
            const point = projectToFallback(region, +spot.latitude, +spot.longitude);
            return (
              <TouchableOpacity
                key={spot.id}
                activeOpacity={0.75}
                onPress={() => onMarkerPress(spot)}
                style={[styles.fallbackMarkerWrap, { left: `${point.x}%`, top: `${point.y}%` }]}
              >
                <View style={styles.fallbackMarker}>
                  <Ionicons name="fish-outline" size={16} color="#fff" />
                </View>
                <View style={styles.fallbackMarkerTail} />
              </TouchableOpacity>
            );
          })}
          {waterCandidates.map((spot) => {
            const point = projectToFallback(region, +spot.latitude, +spot.longitude);
            return (
              <TouchableOpacity
                key={spot.id || spot.sourcePoiId}
                activeOpacity={0.75}
                onPress={() => onCandidatePress?.(spot)}
                style={[styles.fallbackCandidateWrap, { left: `${point.x}%`, top: `${point.y}%` }]}
              >
                <View style={styles.fallbackCandidateMarker}>
                  <Ionicons name="water-outline" size={16} color="#fff" style={styles.candidateIcon} />
                  <View style={styles.fallbackCandidateFish} />
                </View>
              </TouchableOpacity>
            );
          })}
          {currentLocation && (
            <View
              style={[
                styles.fallbackUserMarker,
                {
                  left: `${projectToFallback(region, currentLocation.latitude, currentLocation.longitude).x}%`,
                  top: `${projectToFallback(region, currentLocation.latitude, currentLocation.longitude).y}%`,
                },
              ]}
            />
          )}
        </View>
      );
    }

    return (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialCameraPosition={{
          target: { latitude: region.latitude, longitude: region.longitude },
          zoom: regionToZoom(region),
        }}
        myLocationEnabled
        followUserLocation
        compassEnabled={false}
        zoomControlsEnabled={false}
        myLocationButtonEnabled={false}
        scaleControlsEnabled={false}
        worldMapSwitchEnabled={false}
        userLocationRepresentation={{
          showMyLocation: true,
          showsAccuracyRing: true,
          fillColor: 'rgba(14,165,233,0.15)',
          strokeColor: 'rgba(14,165,233,0.6)',
          locationType: 'LOCATE',
        }}
        onLocation={(event) => {
          const nextLocation = event.nativeEvent;
          console.log('[MapSurface] native location:', nextLocation.latitude, nextLocation.longitude, nextLocation.accuracy);
          onNativeLocation?.({
            latitude: nextLocation.latitude,
            longitude: nextLocation.longitude,
            accuracy: nextLocation.accuracy,
          });
        }}
        onCameraIdle={(event) => {//当地图的摄像机停止移动时触发，检查是否是程序matic移动，如果不是，则获取新的地图区域信息并调用 `onRegionChangeComplete` 回调函数来更新父组件中的地图区域状态。
          if (isProgrammaticMove.current) return;
          const { cameraPosition, latLngBounds } = event.nativeEvent;
          const center = cameraPosition.target;
          const north = latLngBounds.northeast.latitude;
          const south = latLngBounds.southwest.latitude;
          const east = latLngBounds.northeast.longitude;
          const west = latLngBounds.southwest.longitude;
          onRegionChangeComplete({//调用 `onRegionChangeComplete` 回调函数，传入新的地图区域信息，包括中心点的纬度和经度，以及纬度跨度和经度跨度，以便父组件能够更新地图区域状态并重新获取钓点数据。
            latitude: center?.latitude ?? region.latitude,
            longitude: center?.longitude ?? region.longitude,
            latitudeDelta: Math.max(0.0001, Math.abs(north - south) || zoomToDelta(cameraPosition.zoom ?? 15)),
            longitudeDelta: Math.max(0.0001, Math.abs(east - west) || zoomToDelta(cameraPosition.zoom ?? 15)),
          });
        }}
      >
        {spots.map((spot) => (//遍历 `spots` 数组，为每个钓点渲染一个地图标记。当用户点击标记时，调用 `onMarkerPress` 回调函数并传入对应的钓点信息，以便在父组件中处理相关逻辑（如显示钓点详情等）。
          <Marker
            key={spot.id}
            position={{ latitude: +spot.latitude, longitude: +spot.longitude }}
            onMarkerPress={() => onMarkerPress(spot)}
            anchor={{ x: 0.5, y: 1 }}
            cacheKey={`spot-${spot.id}`}
          >
            <View style={styles.marker}>
              <View style={styles.markerBubble}>
                <Ionicons name="fish-outline" size={18} color="#fff" />
              </View>
              <View style={styles.markerTail} />
            </View>
          </Marker>
        ))}
        {waterCandidates.map((spot) => (
          <Marker
            key={spot.id || spot.sourcePoiId}
            position={{ latitude: +spot.latitude, longitude: +spot.longitude }}
            onMarkerPress={() => onCandidatePress?.(spot)}
            anchor={{ x: 0.5, y: 0.5 }}
            cacheKey={`water-${spot.id || spot.sourcePoiId}`}
          >
            <View style={styles.candidateMarker}>
              <View style={styles.candidateDrop}>
                <Ionicons name="water-outline" size={17} color="#fff" style={styles.candidateIcon} />
                <View style={styles.candidateFishShadow} />
              </View>
            </View>
          </Marker>
        ))}
        {currentLocation && (
          <>
            <Circle
              center={currentLocation}
              radius={80}
              strokeWidth={1}
              strokeColor="rgba(14,165,233,0.6)"
              fillColor="rgba(14,165,233,0.15)"
            />
            <Marker
              position={currentLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              cacheKey={`user-${currentLocation.latitude.toFixed(5)}-${currentLocation.longitude.toFixed(5)}`}
            >
              <View style={styles.userMarker}>
                <View style={styles.userPulse} />
                <View style={styles.userDot} />
              </View>
            </Marker>
          </>
        )}
      </MapView>
    );
  },
);

function projectToFallback(region: MapRegion, latitude: number, longitude: number) {
  const x = 50 + ((longitude - region.longitude) / region.longitudeDelta) * 100;
  const y = 50 - ((latitude - region.latitude) / region.latitudeDelta) * 100;
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(8, Math.min(92, y)),
  };
}

const styles = StyleSheet.create({
  marker: { alignItems: 'center' },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  markerTail: {
    width: 10,
    height: 10,
    marginTop: -6,
    borderRadius: 2,
    backgroundColor: '#111827',
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
  },
  candidateMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(14,165,233,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateDrop: {
    width: 28,
    height: 32,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 4,
    backgroundColor: '#0ea5e9',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  candidateFishShadow: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 9,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.72)',
    transform: [{ rotate: '-45deg' }],
  },
  candidateIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  userMarker: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulse: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(14,165,233,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.32)',
  },
  userDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0ea5e9',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  fallbackMap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#eef0ed',
  },
  fallbackGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.92)',
    borderWidth: 24,
  },
  fallbackPark: {
    position: 'absolute',
    left: '8%',
    top: '10%',
    width: '42%',
    height: '70%',
    borderRadius: 30,
    backgroundColor: '#bcefb5',
    opacity: 0.78,
  },
  fallbackWater: {
    position: 'absolute',
    left: '16%',
    top: '8%',
    width: '28%',
    height: '62%',
    borderRadius: 90,
    backgroundColor: '#a8ddf6',
  },
  fallbackLabel: {
    position: 'absolute',
    left: 14,
    top: 14,
    zIndex: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.9)',
    color: '#475569',
    fontSize: 12,
  },
  fallbackMarkerWrap: {
    position: 'absolute',
    width: 34,
    height: 42,
    marginLeft: -17,
    marginTop: -40,
    zIndex: 2,
    alignItems: 'center',
  },
  fallbackMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackMarkerTail: {
    width: 10,
    height: 10,
    marginTop: -6,
    borderRadius: 2,
    backgroundColor: '#111827',
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
  },
  fallbackCandidateWrap: {
    position: 'absolute',
    width: 38,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    borderRadius: 19,
    backgroundColor: 'rgba(14,165,233,0.16)',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackCandidateMarker: {
    width: 28,
    height: 32,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 4,
    backgroundColor: '#0ea5e9',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  fallbackCandidateFish: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 9,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.72)',
    transform: [{ rotate: '-45deg' }],
  },
  fallbackUserMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    borderRadius: 8,
    backgroundColor: '#0ea5e9',
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 3,
  },
});

export default MapSurface;
