import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Region } from 'react-native-maps';

type LocationPoint = { latitude: number; longitude: number };

export type MapSurfaceHandle = {
  animateToRegion: (region: Region) => void;
};

type Props = {
  region: Region;
  spots: any[];
  currentLocation: LocationPoint | null;
  onRegionChangeComplete: (region: Region) => void;
  onMarkerPress: (spot: any) => void;
};

const MapSurface = forwardRef<MapSurfaceHandle, Props>(
  ({ region, spots, currentLocation, onRegionChangeComplete, onMarkerPress }, ref) => {
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (nextRegion) => mapRef.current?.animateToRegion(nextRegion),
    }));

    return (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: +spot.latitude, longitude: +spot.longitude }}
            onPress={() => onMarkerPress(spot)}
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
