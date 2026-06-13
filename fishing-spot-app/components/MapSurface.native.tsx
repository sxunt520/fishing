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

ensureGaodePrivacyAndSdk();

const MapSurface = forwardRef<MapSurfaceHandle, Props>(
  ({ region, spots, currentLocation, onRegionChangeComplete, onMarkerPress }, ref) => {
    const mapRef = useRef<MapViewRef>(null);
    const isProgrammaticMove = useRef(false);
    const [mapReady, setMapReady] = useState(false);
    const useEmulatorFallback = Platform.OS === 'android' && !Device.isDevice;

    useImperativeHandle(ref, () => ({
      animateToRegion: (nextRegion) => {
        if (useEmulatorFallback) {
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

    if (useEmulatorFallback) {
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
        onCameraIdle={(event) => {
          if (isProgrammaticMove.current) return;
          const { cameraPosition, latLngBounds } = event.nativeEvent;
          const center = cameraPosition.target;
          const north = latLngBounds.northeast.latitude;
          const south = latLngBounds.southwest.latitude;
          const east = latLngBounds.northeast.longitude;
          const west = latLngBounds.southwest.longitude;
          onRegionChangeComplete({
            latitude: center?.latitude ?? region.latitude,
            longitude: center?.longitude ?? region.longitude,
            latitudeDelta: Math.max(0.0001, Math.abs(north - south) || zoomToDelta(cameraPosition.zoom ?? 15)),
            longitudeDelta: Math.max(0.0001, Math.abs(east - west) || zoomToDelta(cameraPosition.zoom ?? 15)),
          });
        }}
      >
        {spots.map((spot) => (
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
