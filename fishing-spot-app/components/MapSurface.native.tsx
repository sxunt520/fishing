import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Device from 'expo-device';
import { Circle, Marker, MapView, MapViewRef } from 'expo-gaode-map';
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
  currentLocation: LocationPoint | null;
  onRegionChangeComplete: (region: MapRegion) => void;
  onMarkerPress: (spot: any) => void;
};

ensureGaodePrivacyAndSdk();//在模块加载时调用 `ensureGaodePrivacyAndSdk` 函数，确保高德地图的隐私政策已同意并且 SDK 已正确加载，以便在地图组件中使用高德地图相关功能。

const MapSurface = forwardRef<MapSurfaceHandle, Props>(
  ({ region, spots, currentLocation, onRegionChangeComplete, onMarkerPress }, ref) => {
    const mapRef = useRef<MapViewRef>(null);
    const isProgrammaticMove = useRef(false);
    const [mapReady, setMapReady] = useState(false);
    const useEmulatorFallback = Platform.OS === 'android' && !Device.isDevice;//安卓模拟器识别,不再渲染高德原生 MapView，改成一个 RN 预览地图

    useImperativeHandle(ref, () => ({//使用 `useImperativeHandle` 钩子暴露一个 `animateToRegion` 方法，使父组件能够通过引用调用该方法来控制地图的动画移动。
      animateToRegion: (nextRegion) => {
        if (useEmulatorFallback) {//如果当前处于安卓模拟器环境，直接调用 `onRegionChangeComplete` 回调函数来更新地图区域，而不执行动画移动。
          onRegionChangeComplete(nextRegion);
          return;
        }
        isProgrammaticMove.current = true;
        mapRef.current?.moveCamera(
          {
            target: { latitude: nextRegion.latitude, longitude: nextRegion.longitude },
            zoom: regionToZoom(nextRegion),
          },
          260,
        );
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
      isProgrammaticMove.current = true;
      mapRef.current.moveCamera(
        {
          target: { latitude: region.latitude, longitude: region.longitude },
          zoom: regionToZoom(region),
        },
        220,
      );
      setTimeout(() => {
        isProgrammaticMove.current = false;
      }, 280);
    }, [mapReady, useEmulatorFallback, region.latitude, region.longitude, region.latitudeDelta]);

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
                style={[styles.fallbackMarker, { left: `${point.x}%`, top: `${point.y}%` }]}
              />
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
        followUserLocation={false}
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
          locationType: 'LOCATION_ROTATE_NO_CENTER',
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
              <View style={styles.dot} />
              <View style={styles.pin} />
            </View>
          </Marker>
        ))}
        {currentLocation && (
          <Circle
            center={currentLocation}
            radius={80}
            strokeWidth={1}
            strokeColor="rgba(14,165,233,0.6)"
            fillColor="rgba(14,165,233,0.15)"
          />
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
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1a1a1a',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  pin: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1a1a1a', marginTop: 2 },
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
  fallbackMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    borderRadius: 10,
    backgroundColor: '#111',
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 2,
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
