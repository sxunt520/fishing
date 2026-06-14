import type { MapRegion } from '@/types/map';

export type MapSurfaceHandle = {
  animateToRegion: (region: MapRegion) => void;
};

type LocationPoint = { latitude: number; longitude: number };

type MapSurfaceProps = {
  region: MapRegion;
  spots: any[];
  waterCandidates?: any[];
  currentLocation: LocationPoint | null;
  onRegionChangeComplete: (region: MapRegion) => void;
  onMarkerPress: (spot: any) => void;
  onCandidatePress?: (spot: any) => void;
  onNativeLocation?: (location: { latitude: number; longitude: number; accuracy?: number }) => void;
};

declare const MapSurface: React.ForwardRefExoticComponent<
  MapSurfaceProps & React.RefAttributes<MapSurfaceHandle>
>;

export default MapSurface;
