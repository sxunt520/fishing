import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type React from 'react';
import type { Region } from 'react-native-maps';
import { AMAP_WEB_KEY } from '@/constants/config';

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

declare global {
  interface Window {
    AMap?: any;
    __amapLoader?: Promise<any>;
  }
}

function loadAMap() {
  if (!AMAP_WEB_KEY || AMAP_WEB_KEY === 'your-amap-web-key') return Promise.reject(new Error('Missing AMap key'));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (window.__amapLoader) return window.__amapLoader;
  window.__amapLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_WEB_KEY}`;
    script.async = true;
    script.onload = () => resolve(window.AMap);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.__amapLoader;
}

const MapSurface = forwardRef<MapSurfaceHandle, Props>(
  ({ region, spots, currentLocation, onRegionChangeComplete, onMarkerPress }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const userMarkerRef = useRef<any>(null);
    const isProgrammaticMove = useRef(false);
    const [isFallback, setIsFallback] = useState(!AMAP_WEB_KEY || AMAP_WEB_KEY === 'your-amap-web-key');

    const emitRegion = () => {
      if (!mapRef.current || isProgrammaticMove.current) return;
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      const latitudeDelta = zoomToDelta(zoom);
      onRegionChangeComplete({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta,
        longitudeDelta: latitudeDelta,
      });
    };

    useImperativeHandle(ref, () => ({
      animateToRegion: (nextRegion) => {
        if (!mapRef.current) return;
        isProgrammaticMove.current = true;
        mapRef.current.setZoomAndCenter(deltaToZoom(nextRegion.latitudeDelta), [
          nextRegion.longitude,
          nextRegion.latitude,
        ]);
        setTimeout(() => {
          isProgrammaticMove.current = false;
        }, 250);
      },
    }));

    useEffect(() => {
      let disposed = false;
      loadAMap()
        .then((AMap) => {
          if (disposed || !containerRef.current || mapRef.current) return;
          setIsFallback(false);
          mapRef.current = new AMap.Map(containerRef.current, {
            center: [region.longitude, region.latitude],
            zoom: deltaToZoom(region.latitudeDelta),
            resizeEnable: true,
            viewMode: '2D',
          });
          mapRef.current.on('moveend', emitRegion);
          mapRef.current.on('zoomend', emitRegion);
        })
        .catch(() => setIsFallback(true));

      return () => {
        disposed = true;
        mapRef.current?.destroy?.();
        mapRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (!mapRef.current) return;
      isProgrammaticMove.current = true;
      mapRef.current.setZoomAndCenter(deltaToZoom(region.latitudeDelta), [region.longitude, region.latitude]);
      setTimeout(() => {
        isProgrammaticMove.current = false;
      }, 250);
    }, [region.latitude, region.longitude, region.latitudeDelta]);

    useEffect(() => {
      if (!mapRef.current || !window.AMap) return;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = spots.map((spot) => {
        const marker = new window.AMap.Marker({
          position: [+spot.longitude, +spot.latitude],
          anchor: 'bottom-center',
          content: '<div style="width:18px;height:18px;border-radius:999px;background:#111;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.28)"></div>',
        });
        marker.on('click', () => onMarkerPress(spot));
        mapRef.current.add(marker);
        return marker;
      });
    }, [spots, onMarkerPress]);

    useEffect(() => {
      if (!mapRef.current || !window.AMap || !currentLocation) return;
      if (!userMarkerRef.current) {
        userMarkerRef.current = new window.AMap.Marker({
          anchor: 'center',
          content: '<div style="width:16px;height:16px;border-radius:999px;background:#0ea5e9;border:3px solid #fff;box-shadow:0 0 0 10px rgba(14,165,233,.16)"></div>',
        });
        mapRef.current.add(userMarkerRef.current);
      }
      userMarkerRef.current.setPosition([currentLocation.longitude, currentLocation.latitude]);
    }, [currentLocation]);

    if (isFallback) {
      return (
        <div style={fallbackStyles.map}>
          <div style={fallbackStyles.water} />
          <div style={fallbackStyles.parkA} />
          <div style={fallbackStyles.parkB} />
          <div style={fallbackStyles.grid} />
          <div style={fallbackStyles.label}>AMap Web Key 未配置，当前为开发预览地图</div>
          {spots.map((spot) => {
            const point = projectToFallback(region, +spot.latitude, +spot.longitude);
            return (
              <button
                key={spot.id}
                onClick={() => onMarkerPress(spot)}
                style={{ ...fallbackStyles.marker, left: `${point.x}%`, top: `${point.y}%` }}
                aria-label={spot.name}
              />
            );
          })}
          {currentLocation && (
            <div
              style={{
                ...fallbackStyles.userMarker,
                left: `${projectToFallback(region, currentLocation.latitude, currentLocation.longitude).x}%`,
                top: `${projectToFallback(region, currentLocation.latitude, currentLocation.longitude).y}%`,
              }}
            />
          )}
        </div>
      );
    }

    return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
  },
);

function deltaToZoom(delta: number) {
  return Math.max(3, Math.min(19, Math.round(Math.log2(360 / Math.max(delta, 0.0001)))));
}

function zoomToDelta(zoom: number) {
  return 360 / Math.pow(2, zoom);
}

function projectToFallback(region: Region, latitude: number, longitude: number) {
  const x = 50 + ((longitude - region.longitude) / region.longitudeDelta) * 100;
  const y = 50 - ((latitude - region.latitude) / region.latitudeDelta) * 100;
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(8, Math.min(92, y)),
  };
}

const fallbackStyles: Record<string, React.CSSProperties> = {
  map: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: '#eef0ed',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(90deg, rgba(255,255,255,.9) 2px, transparent 2px), linear-gradient(rgba(255,255,255,.9) 2px, transparent 2px)',
    backgroundSize: '96px 96px',
    transform: 'rotate(-6deg) scale(1.2)',
    opacity: 0.8,
  },
  water: {
    position: 'absolute',
    left: '14%',
    top: '8%',
    width: '28%',
    height: '62%',
    borderRadius: '48% 42% 50% 40%',
    background: '#a8ddf6',
  },
  parkA: {
    position: 'absolute',
    left: '8%',
    top: '12%',
    width: '34%',
    height: '68%',
    borderRadius: 28,
    background: '#bcefb5',
    opacity: 0.78,
  },
  parkB: {
    position: 'absolute',
    right: '8%',
    bottom: '2%',
    width: '42%',
    height: '24%',
    borderRadius: 32,
    background: '#bcefb5',
    opacity: 0.78,
  },
  marker: {
    position: 'absolute',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    borderRadius: 20,
    background: '#111',
    border: '3px solid #fff',
    boxShadow: '0 4px 14px rgba(0,0,0,.28)',
    zIndex: 2,
    cursor: 'pointer',
  },
  userMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    borderRadius: 16,
    background: '#0ea5e9',
    border: '3px solid #fff',
    boxShadow: '0 0 0 10px rgba(14,165,233,.16)',
    zIndex: 3,
  },
  label: {
    position: 'absolute',
    left: 16,
    top: 16,
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(255,255,255,.88)',
    color: '#475569',
    fontSize: 12,
    zIndex: 4,
  },
};

export default MapSurface;
