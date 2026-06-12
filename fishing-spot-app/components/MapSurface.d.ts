import type { Region } from 'react-native-maps';

export type MapSurfaceHandle = {
  animateToRegion: (region: Region) => void;
};

type LocationPoint = { latitude: number; longitude: number };

type MapSurfaceProps = {
  region: Region;
  spots: any[];
  currentLocation: LocationPoint | null;
  onRegionChangeComplete: (region: Region) => void;
  onMarkerPress: (spot: any) => void;
};

declare const MapSurface: React.ForwardRefExoticComponent<
  MapSurfaceProps & React.RefAttributes<MapSurfaceHandle>
>;

export default MapSurface;
