import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type React from 'react';
import { AMAP_SECURITY_JS_CODE, AMAP_WEB_KEY } from '@/constants/config';
import type { MapRegion } from '@/types/map';
import { regionToZoom, zoomToDelta } from '@/types/map';

type LocationPoint = { latitude: number; longitude: number };

export type MapSurfaceHandle = {
  animateToRegion: (region: MapRegion) => void;
};

type Props = {
  region: MapRegion;
  spots: any[];
  waterCandidates?: any[];
  pendingCandidate?: LocationPoint | null;
  currentLocation: LocationPoint | null;
  onRegionChangeComplete: (region: MapRegion) => void;
  onMarkerPress: (spot: any) => void;
  onCandidatePress?: (spot: any) => void;
  onMapLongPress?: (location: LocationPoint) => void;
  onNativeLocation?: (location: { latitude: number; longitude: number; accuracy?: number }) => void;
};

declare global {
  interface Window {
    AMap?: any;
    __amapLoader?: Promise<any>;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

function loadAMap() {//定义了一个名为 `loadAMap` 的函数，用于加载高德地图的 JavaScript API。该函数首先检查是否已经配置了高德地图的 Web Key，如果没有配置或使用了默认值，则返回一个拒绝的 Promise。然后检查是否已经加载了高德地图的 API，如果已经加载则直接返回已加载的 API 对象。如果尚未加载，则创建一个新的 Promise 来加载高德地图的 JavaScript 文件，并在加载完成后解析 Promise，返回高德地图的 API 对象。
  if (!AMAP_WEB_KEY || AMAP_WEB_KEY === 'your-amap-web-key') return Promise.reject(new Error('Missing AMap key'));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (window.__amapLoader) return window.__amapLoader;
  if (AMAP_SECURITY_JS_CODE) {
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_JS_CODE,
    };
  }
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

const MapSurface = forwardRef<MapSurfaceHandle, Props>(//定义了一个名为 `MapSurface` 的 React 组件，使用 `forwardRef` 来允许父组件通过引用访问该组件的实例方法。该组件接受地图区域、钓点数据、当前位置信息以及相关的回调函数作为 props，并在内部管理地图的加载、渲染和交互逻辑。
  ({ region, spots, waterCandidates = [], pendingCandidate, currentLocation, onRegionChangeComplete, onMarkerPress, onCandidatePress, onMapLongPress }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const candidateMarkersRef = useRef<any[]>([]);
    const userMarkerRef = useRef<any>(null);
    const pendingMarkerRef = useRef<any>(null);
    const isProgrammaticMove = useRef(false);
    const [isFallback, setIsFallback] = useState(!AMAP_WEB_KEY || AMAP_WEB_KEY === 'your-amap-web-key');

    const emitRegion = () => {//定义了一个名为 `emitRegion` 的函数，用于获取当前地图的中心点坐标和缩放级别，并计算出新的地图区域信息（包括中心点的纬度和经度，以及纬度跨度和经度跨度）。然后调用 `onRegionChangeComplete` 回调函数，将新的地图区域信息传递给父组件，以便父组件能够更新地图区域状态并重新获取钓点数据。
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

    const emitLongPress = (event: any) => {
      const lnglat = event?.lnglat;
      if (!lnglat) return;
      const latitude = Number(lnglat.lat);
      const longitude = Number(lnglat.lng);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        onMapLongPress?.({ latitude, longitude });
      }
    };

    useImperativeHandle(ref, () => ({//使用 `useImperativeHandle` 钩子暴露一个 `animateToRegion` 方法，使父组件能够通过引用调用该方法来控制地图的动画移动。当调用 `animateToRegion` 方法时，首先检查是否处于安卓模拟器环境，如果是，则直接调用 `onRegionChangeComplete` 回调函数来更新地图区域，而不执行动画移动。否则，使用高德地图的 API 来移动摄像机到指定的地图区域，并在动画完成后将 `isProgrammaticMove` 标志重置为 `false`。 
      animateToRegion: (nextRegion) => {
        if (!mapRef.current) return;
        isProgrammaticMove.current = true;
        mapRef.current.setZoomAndCenter(regionToZoom(nextRegion), [
          nextRegion.longitude,
          nextRegion.latitude,
        ]);
        setTimeout(() => {
          isProgrammaticMove.current = false;
        }, 250);
      },
    }));

    useEffect(() => {//在组件挂载时执行，首先检查是否已经加载了高德地图的 API，如果尚未加载，则调用 `loadAMap` 函数来加载高德地图的 JavaScript 文件，并在加载完成后初始化地图实例并绑定相关事件监听器。如果加载失败，则设置 `isFallback` 状态为 `true`，以便渲染一个自定义的预览地图界面。组件卸载时销毁地图实例并清理相关资源。
      let disposed = false;
      loadAMap()
        .then((AMap) => {
          if (disposed || !containerRef.current || mapRef.current) return;
          setIsFallback(false);
          mapRef.current = new AMap.Map(containerRef.current, {
            center: [region.longitude, region.latitude],
          zoom: regionToZoom(region),
            resizeEnable: true,
            viewMode: '2D',
          });
          mapRef.current.on('moveend', emitRegion);
          mapRef.current.on('zoomend', emitRegion);
          mapRef.current.on('rightclick', emitLongPress);
        })
        .catch(() => setIsFallback(true));

      return () => {
        disposed = true;
        mapRef.current?.destroy?.();
        mapRef.current = null;
      };
    }, []);

    useEffect(() => {//当 `region` 发生变化时执行，首先检查是否已经加载了高德地图的 API，如果尚未加载则直接返回。然后将 `isProgrammaticMove` 标志设置为 `true`，使用高德地图的 API 来设置地图的中心点和缩放级别，以便地图能够平滑地移动到新的区域。最后，在动画完成后将 `isProgrammaticMove` 标志重置为 `false`。
      if (!mapRef.current) return;
      isProgrammaticMove.current = true;
      mapRef.current.setZoomAndCenter(regionToZoom(region), [region.longitude, region.latitude]);
      setTimeout(() => {
        isProgrammaticMove.current = false;
      }, 250);
    }, [region.latitude, region.longitude, region.latitudeDelta]);

    useEffect(() => {//当 `spots` 发生变化时执行，首先检查是否已经加载了高德地图的 API，如果尚未加载则直接返回。然后清除之前渲染的钓点标记，并遍历新的 `spots` 数组，为每个钓点创建一个新的地图标记，并将其添加到地图上。当用户点击标记时，调用 `onMarkerPress` 回调函数并传入对应的钓点信息，以便在父组件中处理相关逻辑（如显示钓点详情等）。
      if (!mapRef.current || !window.AMap) return;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = spots.map((spot) => {//遍历 `spots` 数组，为每个钓点创建一个新的地图标记，并将其添加到地图上。当用户点击标记时，调用 `onMarkerPress` 回调函数并传入对应的钓点信息，以便在父组件中处理相关逻辑（如显示钓点详情等）。
        const marker = new window.AMap.Marker({
          position: [+spot.longitude, +spot.latitude],
          anchor: 'bottom-center',
          content: REAL_SPOT_MARKER_HTML,
        });
        marker.on('click', () => onMarkerPress(spot));
        mapRef.current.add(marker);
        return marker;
      });
    }, [spots, onMarkerPress]);

    useEffect(() => {
      if (!mapRef.current || !window.AMap) return;
      candidateMarkersRef.current.forEach((marker) => marker.setMap(null));
      candidateMarkersRef.current = waterCandidates.map((spot) => {
        const marker = new window.AMap.Marker({
          position: [+spot.longitude, +spot.latitude],
          anchor: 'center',
          content: WATER_CANDIDATE_MARKER_HTML,
        });
        marker.on('click', () => onCandidatePress?.(spot));
        mapRef.current.add(marker);
        return marker;
      });
    }, [waterCandidates, onCandidatePress]);

    useEffect(() => {//当 `currentLocation` 发生变化时执行，首先检查是否已经加载了高德地图的 API，如果尚未加载则直接返回。然后检查是否已经创建了用户位置的标记，如果没有，则创建一个新的标记并添加到地图上。最后，更新用户位置标记的位置，以便在地图上显示用户的当前位置。
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

    useEffect(() => {
      if (!mapRef.current || !window.AMap) return;
      if (!pendingCandidate) {
        pendingMarkerRef.current?.setMap(null);
        pendingMarkerRef.current = null;
        return;
      }
      if (!pendingMarkerRef.current) {
        pendingMarkerRef.current = new window.AMap.Marker({
          anchor: 'bottom-center',
          content: PENDING_CANDIDATE_MARKER_HTML,
        });
        mapRef.current.add(pendingMarkerRef.current);
      }
      pendingMarkerRef.current.setPosition([pendingCandidate.longitude, pendingCandidate.latitude]);
    }, [pendingCandidate]);

    if (isFallback) {//如果 `isFallback` 状态为 `true`，则渲染一个自定义的预览地图界面，显示一个简单的地图背景和钓点标记，而不使用高德地图组件。该界面使用绝对定位和 CSS 样式来模拟地图的外观，并通过计算将钓点和用户位置转换为相对于当前地图区域的百分比坐标，以便在界面上正确显示。
      return (
        <div
          style={fallbackStyles.map}
          onContextMenu={(event) => {
            event.preventDefault();
            onMapLongPress?.({ latitude: region.latitude, longitude: region.longitude });
          }}
        >
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
                dangerouslySetInnerHTML={{ __html: REAL_SPOT_MARKER_HTML }}
              />
            );
          })}
          {waterCandidates.map((spot) => {
            const point = projectToFallback(region, +spot.latitude, +spot.longitude);
            return (
              <button
                key={spot.id || spot.sourcePoiId}
                onClick={() => onCandidatePress?.(spot)}
                style={{ ...fallbackStyles.candidateMarker, left: `${point.x}%`, top: `${point.y}%` }}
                aria-label={spot.name}
                dangerouslySetInnerHTML={{ __html: WATER_CANDIDATE_MARKER_HTML }}
              />
            );
          })}
          {pendingCandidate && (
            <div
              style={{
                ...fallbackStyles.pendingMarker,
                left: `${projectToFallback(region, pendingCandidate.latitude, pendingCandidate.longitude).x}%`,
                top: `${projectToFallback(region, pendingCandidate.latitude, pendingCandidate.longitude).y}%`,
              }}
              dangerouslySetInnerHTML={{ __html: PENDING_CANDIDATE_MARKER_HTML }}
            />
          )}
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

const REAL_SPOT_MARKER_HTML = `
  <div style="position:relative;width:36px;height:44px;transform:translateY(2px)">
    <div style="width:32px;height:32px;border-radius:999px;background:#111827;border:3px solid #fff;box-shadow:0 7px 18px rgba(0,0,0,.30);display:flex;align-items:center;justify-content:center;box-sizing:border-box">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6.5 12c2.8-5.1 8.6-5.1 11.8 0-3.2 5.1-9 5.1-11.8 0Z"/>
        <path d="M6.5 12 3.5 9.5v5L6.5 12Z"/>
        <path d="M15.5 10.2h.01"/>
        <path d="M12.6 8.1c1.2 2.4 1.2 5.4 0 7.8"/>
      </svg>
    </div>
    <div style="position:absolute;left:11px;top:25px;width:10px;height:10px;background:#111827;border-right:2px solid #fff;border-bottom:2px solid #fff;border-radius:2px;transform:rotate(45deg);box-sizing:border-box"></div>
  </div>
`;

const WATER_CANDIDATE_MARKER_HTML = `
  <div style="width:40px;height:40px;border-radius:999px;background:rgba(14,165,233,.16);display:flex;align-items:center;justify-content:center">
    <div style="position:relative;width:28px;height:32px;border-radius:15px 15px 15px 4px;background:#0ea5e9;border:3px solid #fff;box-shadow:0 7px 18px rgba(2,132,199,.30);transform:rotate(45deg);box-sizing:border-box;display:flex;align-items:center;justify-content:center">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(-45deg)" aria-hidden="true">
        <path d="M12 2.8C8.4 7.1 6.6 10 6.6 13a5.4 5.4 0 0 0 10.8 0c0-3-1.8-5.9-5.4-10.2Z"/>
      </svg>
      <span style="position:absolute;right:5px;bottom:5px;width:9px;height:4px;border-radius:999px;background:rgba(255,255,255,.74);transform:rotate(-45deg)"></span>
    </div>
  </div>
`;

const PENDING_CANDIDATE_MARKER_HTML = `
  <div style="position:relative;width:44px;height:52px;display:flex;align-items:flex-start;justify-content:center">
    <div style="position:absolute;top:2px;width:42px;height:42px;border-radius:999px;background:rgba(14,165,233,.2);border:1px dashed #0284c7;box-sizing:border-box"></div>
    <div style="position:absolute;top:7px;width:30px;height:30px;border-radius:999px;background:#0ea5e9;border:3px solid #fff;box-shadow:0 7px 18px rgba(2,132,199,.32);display:flex;align-items:center;justify-content:center;box-sizing:border-box">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
      </svg>
    </div>
    <div style="position:absolute;left:17px;top:32px;width:9px;height:9px;background:#0ea5e9;border-right:2px solid #fff;border-bottom:2px solid #fff;border-radius:2px;transform:rotate(45deg);box-sizing:border-box"></div>
  </div>
`;

function projectToFallback(region: MapRegion, latitude: number, longitude: number) {//定义了一个名为 `projectToFallback` 的函数，用于将地理坐标（纬度和经度）转换为相对于当前地图区域的百分比坐标。该函数根据当前地图区域的中心点和跨度计算出输入坐标在地图上的位置，并将其限制在一定范围内，以便在预览地图界面上正确显示。
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
    width: 36,
    height: 44,
    marginLeft: -18,
    marginTop: -44,
    border: 0,
    padding: 0,
    background: 'transparent',
    zIndex: 2,
    cursor: 'pointer',
  },
  candidateMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    border: 0,
    padding: 0,
    background: 'transparent',
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
  pendingMarker: {
    position: 'absolute',
    width: 44,
    height: 52,
    marginLeft: -22,
    marginTop: -52,
    zIndex: 4,
    pointerEvents: 'none',
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
