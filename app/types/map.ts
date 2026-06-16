export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export function regionToZoom(region: Pick<MapRegion, 'latitudeDelta'>) {
  return Math.max(3, Math.min(20, Math.round(Math.log2(360 / Math.max(region.latitudeDelta, 0.0001)))));
}

export function zoomToDelta(zoom: number) {
  return 360 / Math.pow(2, zoom);
}
