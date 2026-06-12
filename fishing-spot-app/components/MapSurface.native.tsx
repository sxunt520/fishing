import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ExpoGaodeMapModule, { Circle, Marker, MapView, MapViewRef } from 'expo-gaode-map';
import { AMAP_ANDROID_KEY, AMAP_IOS_KEY, AMAP_WEB_KEY } from '@/constants/config';
import type { MapRegion } from '@/types/map';
import { regionToZoom, zoomToDelta } from '@/types/map';

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

const MapSurface = forwardRef<MapSurfaceHandle, Props>(
  ({ region, spots, currentLocation, onRegionChangeComplete, onMarkerPress }, ref) => {
    const mapRef = useRef<MapViewRef>(null);
    const isProgrammaticMove = useRef(false);

    useImperativeHandle(ref, () => ({
      animateToRegion: (nextRegion) => {
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
    }, []);

    useEffect(() => {
      if (!mapRef.current) return;
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
    }, [region.latitude, region.longitude, region.latitudeDelta]);

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
});

export default MapSurface;
