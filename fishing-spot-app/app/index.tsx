import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Text, TextInput } from 'react-native';
import type { MapRegion } from '@/types/map';//导入地图区域类型，用于定义地图区域的类型。
import BottomSheet from '@gorhom/bottom-sheet';//导入 `BottomSheet` 组件，用于在底部显示钓点详情的弹窗。
import { useRouter } from 'expo-router';//导入 `useRouter` 钩子，用于在应用中进行页面导航。
import { Ionicons } from '@expo/vector-icons';//导入 `Ionicons` 图标库，用于在工具栏按钮中显示图标。
import { spotApi } from '@/api/client';//导入 `spotApi` 对象，用于调用与钓点相关的 API 接口。
import { useAppStore } from '@/stores/useAppStore';//导入全局状态管理的 `useAppStore` 钩子，用于访问和更新应用的全局状态。
import { useLocation } from '@/hooks/useLocation';//导入自定义的 `useLocation` 钩子，用于获取用户的位置信息和请求权限的方法。
import SpotDetailSheet from '@/components/SpotDetailSheet';//导入 `SpotDetailSheet` 组件，用于在底部弹窗中显示钓点的详细信息。
import MapSurface, { MapSurfaceHandle } from '@/components/MapSurface';//
import { ensureLoggedIn } from '@/utils/authPrompt';

type LocationPoint = { latitude: number; longitude: number };
type FocusReason = 'cached-location' | 'location' | 'current-location' | 'native-location' | 'pan' | 'zoom' | 'selected';

const WATER_CACHE_TTL = 10 * 60 * 1000;
const WATER_FETCH_DISTANCE_METERS = 2000;
const WATER_GRID_SIZE = 0.02;
const WATER_RADIUS = 5000;
const WATER_LIMIT = 30;
const PROGRAMMATIC_IDLE_MS = 4000;
const CAMERA_IDLE_CENTER_TOLERANCE_METERS = 180;

export default function MapScreen() {
  const mapRef = useRef<MapSurfaceHandle>(null);//使用 `useRef` 创建一个引用 `mapRef`，用于访问 `MapSurface` 组件的实例方法。
  const sheetRef = useRef<BottomSheet>(null);//使用 `useRef` 创建一个引用 `sheetRef`，用于访问 `BottomSheet` 组件的实例方法。
  const hasCenteredOnInitialLocation = useRef(false);//使用 `useRef` 创建一个引用 `hasCenteredOnInitialLocation`，用于跟踪是否已经将地图中心定位到用户的初始位置，以避免重复定位。
  const hasCenteredOnNativeLocation = useRef(false);
  const hasAppliedCachedLocation = useRef(false);
  const lastFocusedLocationKey = useRef('');
  const waterCandidateCacheRef = useRef(new Map<string, { items: any[]; createdAt: number; center: LocationPoint }>());
  const waterCandidateInFlightRef = useRef(new Set<string>());
  const lastWaterFetchCenterRef = useRef<LocationPoint | null>(null);
  const suppressMapIdleUntilRef = useRef(0);
  const programmaticMoveRef = useRef<{ center: LocationPoint; until: number } | null>(null);
  const cachedLocation = normalizeCachedLocation(useAppStore.getState().currentLocation);
  const [region, setRegion] = useState<MapRegion>({//初始位置设置为北京，实际使用中可以根据需要调整或使用用户当前位置。
    latitude: cachedLocation?.latitude || 39.9042, longitude: cachedLocation?.longitude || 116.4074,//优先使用上次定位，首次安装或无缓存时再回退北京。
    latitudeDelta: 0.05, longitudeDelta: 0.05,//定义地图的初始区域，包含中心点的经纬度和缩放级别（通过 `latitudeDelta` 和 `longitudeDelta` 控制）。
  });
  const [spots, setSpots] = useState<any[]>([]);
  const [waterCandidates, setWaterCandidates] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [spotSearchResults, setSpotSearchResults] = useState<any[]>([]);
  const [waterSearchResults, setWaterSearchResults] = useState<any[]>([]);
  const [spotSearchLoading, setSpotSearchLoading] = useState(false);
  const [waterSearchLoading, setWaterSearchLoading] = useState(false);
  const router = useRouter();
  const { location, error: locationError, loading: locationLoading, requestLocation } = useLocation();//使用自定义的 `useLocation` 钩子获取用户的位置信息和请求权限的方法。
  const currentLocation = useAppStore((s) => normalizeCachedLocation(s.currentLocation));//从全局状态管理中获取当前位置信息。
  const setCurrentLocation = useAppStore((s) => s.setCurrentLocation);
  const user = useAppStore((s) => s.user);
  const selectedMapSpot = useAppStore((s) => s.selectedMapSpot);
  const setSelectedMapSpot = useAppStore((s) => s.setSelectedMapSpot);
  const convertedCandidateSpot = useAppStore((s) => s.convertedCandidateSpot);
  const setConvertedCandidateSpot = useAppStore((s) => s.setConvertedCandidateSpot);

  const removeCandidateKeys = useCallback((keys: Set<string>) => {
    if (keys.size === 0) return;
    setWaterCandidates((prev) => prev.filter((item) => !keys.has(getCandidateKey(item))));
    waterCandidateCacheRef.current.forEach((cache, key) => {
      const nextItems = cache.items.filter((item) => !keys.has(getCandidateKey(item)));
      if (nextItems.length === cache.items.length) return;
      if (nextItems.length === 0) {
        waterCandidateCacheRef.current.delete(key);
      } else {
        waterCandidateCacheRef.current.set(key, { ...cache, items: nextItems });
      }
    });
  }, []);

  const removeCandidatesForRealSpots = useCallback((realSpots: any[]) => {
    const keys = new Set<string>();
    realSpots.forEach((spot) => {
      if (spot?.id) keys.add(String(spot.id));
      if (spot?.sourcePoiId) {
        keys.add(String(spot.sourcePoiId));
        keys.add(`amap_${spot.sourcePoiId}`);
      }
    });
    removeCandidateKeys(keys);
  }, [removeCandidateKeys]);

  const fetchRealSpots = useCallback(async (r: MapRegion) => {
    if (!isValidMapLocation(r.latitude, r.longitude)) {
      console.log('[Map] skip fetch invalid region:', r.latitude, r.longitude);
      return [];
    }
    try {
      const spotRes: any = await spotApi.getInBounds({
        north: r.latitude + r.latitudeDelta / 2,
        south: r.latitude - r.latitudeDelta / 2,
        east: r.longitude + r.longitudeDelta / 2,
        west: r.longitude - r.longitudeDelta / 2,
      });
      const realSpots = spotRes || [];
      setSpots(realSpots);//将获取到的钓点数据存储在 `spots` 状态中，以便在地图上显示。
      removeCandidatesForRealSpots(realSpots);
      return realSpots;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [removeCandidatesForRealSpots]);

  const mergeWaterCandidates = useCallback((items: any[]) => {
    const nextItems = items.filter((item) => item?.isCandidate !== false && item?.status !== 'verified');
    if (nextItems.length === 0) return;
    setWaterCandidates((prev) => mergeCandidates(prev, nextItems));
  }, []);

  const cacheWaterCandidates = useCallback((center: LocationPoint, items: any[]) => {
    const candidates = items.filter((item) => item?.isCandidate !== false && item?.status !== 'verified');
    if (candidates.length === 0) return;
    const gridKey = getWaterGridKey(center);
    const cached = waterCandidateCacheRef.current.get(gridKey);
    waterCandidateCacheRef.current.set(gridKey, {
      items: mergeCandidates(cached?.items || [], candidates),
      createdAt: Date.now(),
      center,
    });
    mergeWaterCandidates(candidates);
  }, [mergeWaterCandidates]);

  const fetchWaterCandidatesIfNeeded = useCallback(async (r: MapRegion, reason: FocusReason) => {
    if (reason === 'zoom' || reason === 'selected') return;
    const center = { latitude: r.latitude, longitude: r.longitude };
    const gridKey = getWaterGridKey(center);
    const cached = waterCandidateCacheRef.current.get(gridKey);
    if (cached && Date.now() - cached.createdAt < WATER_CACHE_TTL) {
      console.log('[Map] water candidates cache hit:', gridKey, reason);
      mergeWaterCandidates(cached.items);
      lastWaterFetchCenterRef.current = cached.center;
      return;
    }
    if (waterCandidateInFlightRef.current.has(gridKey)) {
      console.log('[Map] water candidates already loading:', gridKey);
      return;
    }

    if (reason === 'pan' && lastWaterFetchCenterRef.current) {
      const moved = distanceMeters(lastWaterFetchCenterRef.current, center);
      if (moved < WATER_FETCH_DISTANCE_METERS) {
        console.log('[Map] skip water candidates, moved:', Math.round(moved), 'm');
        return;
      }
    }

    try {
      console.log('[Map] fetch water candidates:', gridKey, reason);
      waterCandidateInFlightRef.current.add(gridKey);
      const candidateRes: any = await spotApi.getWaterCandidates(r.latitude, r.longitude, WATER_RADIUS, WATER_LIMIT);
      const verifiedKeys = new Set<string>();
      const candidates = (candidateRes || []).filter((item: any) => {
        const isReal = item?.isCandidate === false || item?.status === 'verified';
        if (isReal) verifiedKeys.add(getCandidateKey(item));
        return !isReal;
      });
      if (verifiedKeys.size) removeCandidateKeys(verifiedKeys);
      waterCandidateCacheRef.current.set(gridKey, { items: candidates, createdAt: Date.now(), center });
      lastWaterFetchCenterRef.current = center;
      mergeWaterCandidates(candidates);
    } catch (e) {
      console.error(e);
    } finally {
      waterCandidateInFlightRef.current.delete(gridKey);
    }
  }, [mergeWaterCandidates, removeCandidateKeys]);

  const fetchMapData = useCallback(async (r: MapRegion, reason: FocusReason) => {
    const realSpots = await fetchRealSpots(r);
    removeCandidatesForRealSpots(realSpots);
    fetchWaterCandidatesIfNeeded(r, reason);
  }, [fetchRealSpots, fetchWaterCandidatesIfNeeded, removeCandidatesForRealSpots]);

  const focusRegion = useCallback((r: MapRegion, shouldAnimate = false, reason: FocusReason = 'pan') => {//定义一个函数 `focusRegion`，接受一个 `MapRegion` 对象和一个可选的布尔参数 `shouldAnimate`，用于更新地图区域并获取新的钓点数据。
    if (!isValidMapLocation(r.latitude, r.longitude)) {
      console.log('[Map] skip invalid region:', r.latitude, r.longitude);
      return;
    }
    console.log('[Map] focusRegion:', r.latitude, r.longitude, 'animate:', shouldAnimate, 'reason:', reason);
    setRegion(r);
    fetchMapData(r, reason);
    if (shouldAnimate) {
      const until = Date.now() + PROGRAMMATIC_IDLE_MS;
      suppressMapIdleUntilRef.current = until;
      programmaticMoveRef.current = {
        center: { latitude: r.latitude, longitude: r.longitude },
        until,
      };
      mapRef.current?.animateToRegion(r);
    }
  }, [fetchMapData]);

  useEffect(() => {
    if (!currentLocation || location || hasAppliedCachedLocation.current) return;
    hasAppliedCachedLocation.current = true;
    lastFocusedLocationKey.current = locationKey(currentLocation.latitude, currentLocation.longitude);
    console.log('[Map] using cached location:', currentLocation.latitude, currentLocation.longitude);
    focusRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, true, 'cached-location');
  }, [currentLocation, focusRegion, location]);

  useEffect(() => {//当组件挂载或 `location` 发生变化时执行。
    if (!location || hasCenteredOnInitialLocation.current) return;
    const r = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05, longitudeDelta: 0.05,//根据用户的当前位置设置地图区域，初始缩放级别为 0.05，可以根据需要调整。
    };
    hasCenteredOnInitialLocation.current = true;
    lastFocusedLocationKey.current = locationKey(r.latitude, r.longitude);
    console.log('[Map] using location object:', r.latitude, r.longitude);
    focusRegion(r, true, 'location');//定位成功后，地图首屏切到用户位置，并加载附近钓点。
  }, [focusRegion, location]);

  useEffect(() => {
    if (!currentLocation) return;
    const key = locationKey(currentLocation.latitude, currentLocation.longitude);
    if (key === lastFocusedLocationKey.current) return;
    lastFocusedLocationKey.current = key;
    console.log('[Map] currentLocation changed:', currentLocation.latitude, currentLocation.longitude);
    focusRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, true, 'current-location');
  }, [currentLocation, focusRegion]);

  const onRegionChangeComplete = (r: MapRegion) => {//当地图区域变化完成时调用，更新 `region` 状态并重新获取钓点数据。
    if (!isValidMapLocation(r.latitude, r.longitude)) {
      console.log('[Map] skip idle invalid region:', r.latitude, r.longitude);
      return;
    }

    const now = Date.now();
    const nextCenter = { latitude: r.latitude, longitude: r.longitude };
    const currentCenter = { latitude: region.latitude, longitude: region.longitude };
    const movedFromCurrent = distanceMeters(currentCenter, nextCenter);
    const programmaticMove = programmaticMoveRef.current;
    const isProgrammaticIdle = Boolean(
      programmaticMove
      && now < programmaticMove.until
      && distanceMeters(programmaticMove.center, nextCenter) < CAMERA_IDLE_CENTER_TOLERANCE_METERS,
    );
    const isZoomOnlyIdle = movedFromCurrent < CAMERA_IDLE_CENTER_TOLERANCE_METERS;

    if (isProgrammaticIdle || now < suppressMapIdleUntilRef.current) {
      console.log('[Map] suppress programmatic idle:', r.latitude, r.longitude, 'moved:', Math.round(movedFromCurrent));
      setRegion(r);
      return;
    }

    if (isZoomOnlyIdle) {
      console.log('[Map] zoom/camera idle, real spots only:', r.latitude, r.longitude, 'moved:', Math.round(movedFromCurrent));
      setRegion(r);
      fetchRealSpots(r);
      return;
    }

    focusRegion(r, false, 'pan');//更新地图区域，并获取新的钓点数据。
  };

  const zoom = (factor: number) => {//根据传入的缩放因子调整 `latitudeDelta` 和 `longitudeDelta`，实现地图的缩放功能。
    const nextRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta * factor,
      longitudeDelta: region.longitudeDelta * factor,
    };
    focusRegion(nextRegion, true, 'zoom');
  };

  const goToMyLocation = async () => {//如果当前位置信息不可用，调用 `requestLocation` 方法请求权限并获取位置信息。
    const nextLocation = await requestLocation();
    const coords = 'coords' in (nextLocation || {}) ? (nextLocation as any).coords : nextLocation;
    if (!coords) return;
    focusRegion({
      latitude: coords.latitude, longitude: coords.longitude,
      latitudeDelta: 0.01, longitudeDelta: 0.01,
    }, true, 'current-location');
  };

  const handleNativeLocation = useCallback((nextLocation: { latitude: number; longitude: number; accuracy?: number }) => {
    if (!isValidMapLocation(nextLocation.latitude, nextLocation.longitude)) return;
    console.log('[Map] native location:', nextLocation.latitude, nextLocation.longitude, nextLocation.accuracy);
    setCurrentLocation({ latitude: nextLocation.latitude, longitude: nextLocation.longitude });
    if (hasCenteredOnNativeLocation.current) return;
    hasCenteredOnNativeLocation.current = true;
    focusRegion({
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, true, 'native-location');
  }, [focusRegion, setCurrentLocation]);

  const handleMarkerPress = useCallback((spot: any) => {//当用户点击地图上的钓点标记时调用，设置选中的钓点并打开底部弹窗显示钓点详情。
    setSelectedSpot(spot);//更新 `selectedSpot` 状态以存储当前选中的钓点信息。
    sheetRef.current?.snapToIndex(0);//调用 `snapToIndex` 方法将底部弹窗打开到第一个位置，以显示钓点详情。
  }, []);

  const handleCandidatePress = useCallback((candidate: any) => {
    setSelectedSpot(candidate);
    sheetRef.current?.snapToIndex(0);
  }, []);

  const localSearchResults = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return { real: [], candidates: [] };
    const match = (item: any) => `${item?.name || ''} ${item?.address || ''}`.toLowerCase().includes(keyword);
    return {
      real: spots.filter(match).slice(0, 6),
      candidates: waterCandidates.filter(match).slice(0, 8),
    };
  }, [searchKeyword, spots, waterCandidates]);

  const realSearchResults = useMemo(
    () => mergeSearchItems(localSearchResults.real, spotSearchResults).slice(0, 8),
    [localSearchResults.real, spotSearchResults],
  );

  const candidateSearchResults = useMemo(
    () => mergeSearchItems(localSearchResults.candidates, waterSearchResults).filter((item) => item?.isCandidate !== false && item?.status !== 'verified').slice(0, 10),
    [localSearchResults.candidates, waterSearchResults],
  );

  const hasSearchKeyword = searchKeyword.trim().length > 0;
  const shouldShowSearchPanel = searchFocused && hasSearchKeyword;
  const canSearchMoreWater = hasSearchKeyword && realSearchResults.length < 3;

  useEffect(() => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setSpotSearchResults([]);
      setWaterSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSpotSearchLoading(true);
      try {
        const center = currentLocation || { latitude: region.latitude, longitude: region.longitude };
        const res: any = await spotApi.search(keyword, center.latitude, center.longitude, 20);
        setSpotSearchResults(res || []);
      } catch (error) {
        console.error(error);
      } finally {
        setSpotSearchLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentLocation, region.latitude, region.longitude, searchKeyword]);

  const openSearchResult = useCallback((item: any) => {
    if (!isValidMapLocation(Number(item.latitude), Number(item.longitude))) return;
    const target = {
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setSearchFocused(false);
    focusRegion(target, true, 'selected');
    if (isCandidateSpot(item)) {
      cacheWaterCandidates({ latitude: target.latitude, longitude: target.longitude }, [item]);
    }
    setSelectedSpot(item);
    sheetRef.current?.snapToIndex(0);
  }, [cacheWaterCandidates, focusRegion]);

  const searchMoreWater = useCallback(async () => {
    const keyword = searchKeyword.trim();
    if (!keyword || waterSearchLoading) return;
    const center = currentLocation || { latitude: region.latitude, longitude: region.longitude };
    if (!isValidMapLocation(center.latitude, center.longitude)) return;
    setWaterSearchLoading(true);
    try {
      const res: any = await spotApi.searchWater(keyword, center.latitude, center.longitude, 10000, 20);
      const candidates = (res || []).filter((item: any) => item?.isCandidate !== false && item?.status !== 'verified');
      setWaterSearchResults(candidates);
      cacheWaterCandidates(center, candidates);
    } catch (error) {
      console.error(error);
    } finally {
      setWaterSearchLoading(false);
    }
  }, [cacheWaterCandidates, currentLocation, region.latitude, region.longitude, searchKeyword, waterSearchLoading]);

  useEffect(() => {
    if (!selectedMapSpot) return;
    setSelectedSpot(selectedMapSpot);
    sheetRef.current?.snapToIndex(0);
    mapRef.current?.animateToRegion({
      latitude: Number(selectedMapSpot.latitude),
      longitude: Number(selectedMapSpot.longitude),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    fetchMapData({
      latitude: Number(selectedMapSpot.latitude),
      longitude: Number(selectedMapSpot.longitude),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 'selected');
    setSelectedMapSpot(null);
  }, [fetchMapData, selectedMapSpot, setSelectedMapSpot]);

  useEffect(() => {
    if (!convertedCandidateSpot) return;
    const keys = new Set<string>();
    if (convertedCandidateSpot.id) keys.add(String(convertedCandidateSpot.id));
    if (convertedCandidateSpot.sourcePoiId) {
      keys.add(String(convertedCandidateSpot.sourcePoiId));
      keys.add(`amap_${convertedCandidateSpot.sourcePoiId}`);
    }
    removeCandidateKeys(keys);
    waterCandidateCacheRef.current.clear();
    waterCandidateInFlightRef.current.clear();
    setConvertedCandidateSpot(null);
    fetchMapData(region, 'current-location');
  }, [convertedCandidateSpot, fetchMapData, region, removeCandidateKeys, setConvertedCandidateSpot]);

  const shareSelectedSpot = useCallback(() => {
    if (!selectedSpot) return;
    if (!ensureLoggedIn(user, router, '登录后才能分享这个钓点。')) return;
    const store = useAppStore.getState();
    store.setDraft({ ...(store.draft || {}), spot: selectedSpot });
    router.push('/share/edit');
  }, [router, selectedSpot, user]);

  const goToShare = useCallback(() => {
    if (!ensureLoggedIn(user, router, '登录后才能发布钓点分享。')) return;
    router.push('/share/camera');
  }, [router, user]);

  const selectedSpotId = selectedSpot?.savedSpotId || (selectedSpot?.isCandidate ? null : selectedSpot?.id);

  return (
    <View style={styles.container}>
      <MapSurface
        ref={mapRef}
        region={region}
        spots={spots}
        waterCandidates={waterCandidates}
        currentLocation={currentLocation}
        onRegionChangeComplete={onRegionChangeComplete}
        onMarkerPress={handleMarkerPress}
        onCandidatePress={handleCandidatePress}
        onNativeLocation={handleNativeLocation}
      />

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color="#64748b" />
          <TextInput
            value={searchKeyword}
            onChangeText={(text) => {
              setSearchKeyword(text);
              setSearchFocused(true);
              if (text.trim().length === 0) setWaterSearchResults([]);
            }}
            onFocus={() => setSearchFocused(true)}
            placeholder="搜索钓点、水域"
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {spotSearchLoading ? (
            <ActivityIndicator size="small" color="#0ea5e9" />
          ) : searchKeyword.length > 0 ? (
            <TouchableOpacity
              style={styles.searchClear}
              onPress={() => {
                setSearchKeyword('');
                setSpotSearchResults([]);
                setWaterSearchResults([]);
              }}
            >
              <Ionicons name="close" size={16} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        {shouldShowSearchPanel && (
          <View style={styles.searchPanel}>
            {realSearchResults.length > 0 && <Text style={styles.searchSectionTitle}>钓点</Text>}
            {realSearchResults.map((item) => (
              <SearchResultItem key={`real-${item.id}`} item={item} type="real" onPress={() => openSearchResult(item)} />
            ))}

            {candidateSearchResults.length > 0 && <Text style={styles.searchSectionTitle}>可探索水域</Text>}
            {candidateSearchResults.map((item) => (
              <SearchResultItem key={`candidate-${getCandidateKey(item)}`} item={item} type="candidate" onPress={() => openSearchResult(item)} />
            ))}

            {canSearchMoreWater && (
              <TouchableOpacity style={styles.searchMoreBtn} activeOpacity={0.8} onPress={searchMoreWater}>
                {waterSearchLoading ? <ActivityIndicator size="small" color="#0ea5e9" /> : <Ionicons name="water-outline" size={17} color="#0ea5e9" />}
                <Text style={styles.searchMoreText}>{waterSearchLoading ? '正在搜索水域...' : '搜索更多附近水域'}</Text>
              </TouchableOpacity>
            )}

            {!spotSearchLoading && realSearchResults.length === 0 && candidateSearchResults.length === 0 && (
              <Text style={styles.searchEmpty}>暂无结果，可尝试搜索附近水域</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.toolbar}>
        <ToolButton icon="add" onPress={() => zoom(0.5)} />
        <ToolButton icon="remove" onPress={() => zoom(2)} />
        <ToolButton icon="locate" onPress={goToMyLocation} />
        <ToolButton icon="list" onPress={() => router.push('/nearby')} />
      </View>

      <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85} onPress={goToShare}>
        <Text style={styles.shareText}>钓点分享</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={styles.debugPanel} pointerEvents="none">
          <Text style={styles.debugText}>loc: {currentLocation ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}` : 'null'}</Text>
          <Text style={styles.debugText}>map: {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}</Text>
          <Text style={styles.debugText}>status: {locationLoading ? 'loading' : locationError || 'ok'}</Text>
        </View>
      )}

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['66%', '85%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleComponent={() => <SheetHandle onDoubleTap={() => sheetRef.current?.close()} />}
      >
        <SpotDetailSheet spot={selectedSpot} spotId={selectedSpotId} onShare={shareSelectedSpot} />
      </BottomSheet>
    </View>
  );
}

function locationKey(latitude: number, longitude: number) {
  return `${Number(latitude).toFixed(5)},${Number(longitude).toFixed(5)}`;
}

function getWaterGridKey(location: LocationPoint) {
  const latGrid = Math.floor(location.latitude / WATER_GRID_SIZE);
  const lngGrid = Math.floor(location.longitude / WATER_GRID_SIZE);
  return `${latGrid}:${lngGrid}:${WATER_RADIUS}`;
}

function getCandidateKey(item: any) {
  if (item?.sourcePoiId) return String(item.sourcePoiId);
  if (typeof item?.id === 'string' && item.id.startsWith('amap_')) return item.id.replace(/^amap_/, '');
  return String(item?.id || '');
}

function getSearchItemKey(item: any) {
  return getCandidateKey(item) || `${item?.name || ''}:${item?.latitude || ''}:${item?.longitude || ''}`;
}

function mergeSearchItems(primary: any[], secondary: any[]) {
  const map = new Map<string, any>();
  [...primary, ...secondary].forEach((item) => {
    const key = getSearchItemKey(item);
    if (key) map.set(key, item);
  });
  return Array.from(map.values());
}

function isCandidateSpot(item: any) {
  return item?.isCandidate !== false
    && (item?.source === 'amap' || item?.sourcePoiId || String(item?.id || '').startsWith('amap_'));
}

function mergeCandidates(current: any[], incoming: any[]) {
  const map = new Map<string, any>();
  current.forEach((item) => {
    const key = getCandidateKey(item);
    if (key) map.set(key, item);
  });
  incoming.forEach((item) => {
    const key = getCandidateKey(item);
    if (key && item?.isCandidate !== false && item?.status !== 'verified') map.set(key, item);
  });
  return Array.from(map.values());
}

function distanceMeters(a: LocationPoint, b: LocationPoint) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function normalizeCachedLocation(location?: { latitude: number; longitude: number } | null) {
  if (!location) return null;
  if (!isValidMapLocation(location.latitude, location.longitude)) return null;
  const isBeijingFallback = Math.abs(location.latitude - 39.9042) < 0.00001
    && Math.abs(location.longitude - 116.4074) < 0.00001;
  return isBeijingFallback ? null : location;
}

function isValidMapLocation(latitude: number, longitude: number) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && !(latitude === 0 && longitude === 0)
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180;
}

function SheetHandle({ onDoubleTap }: { onDoubleTap: () => void }) {
  const lastTapRef = useRef(0);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.sheetHandleWrap}
      onPress={() => {
        const now = Date.now();
        if (now - lastTapRef.current < 280) onDoubleTap();
        lastTapRef.current = now;
      }}
    >
      <View style={styles.sheetHandle} />
    </TouchableOpacity>
  );
}

function ToolButton({ icon, onPress }: { icon: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.toolBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color="#1a1a1a" />
    </TouchableOpacity>
  );
}

function SearchResultItem({ item, type, onPress }: { item: any; type: 'real' | 'candidate'; onPress: () => void }) {
  const tags = normalizeTags(item.fishTypes || item.fishCategories).slice(0, 2);
  return (
    <TouchableOpacity style={styles.searchItem} activeOpacity={0.78} onPress={onPress}>
      <View style={[styles.searchItemIcon, type === 'candidate' && styles.searchItemIconCandidate]}>
        <Ionicons name={type === 'candidate' ? 'water-outline' : 'fish-outline'} size={17} color={type === 'candidate' ? '#0284c7' : '#111827'} />
      </View>
      <View style={styles.searchItemBody}>
        <View style={styles.searchItemTitleRow}>
          <Text style={styles.searchItemTitle} numberOfLines={1}>{item.name || '未命名钓点'}</Text>
          {item.distance != null && <Text style={styles.searchDistance}>{formatDistance(item.distance, type)}</Text>}
        </View>
        <Text style={styles.searchAddress} numberOfLines={1}>{item.address || (type === 'candidate' ? '待探索水域' : '暂无地址')}</Text>
        <View style={styles.searchTags}>
          <Text style={[styles.searchBadge, type === 'candidate' && styles.searchBadgeCandidate]}>
            {type === 'candidate' ? '待探索' : `${item.postCount || 0}条分享`}
          </Text>
          {tags.map((tag) => <Text key={tag} style={styles.searchTag}>#{tag}</Text>)}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

function normalizeTags(tags: any) {
  if (Array.isArray(tags)) return tags.filter(Boolean).map(String);
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {}
    return tags.split(/[,，、]+/).filter(Boolean).map(String);
  }
  return [];
}

function formatDistance(distance: any, type: 'real' | 'candidate') {
  const value = Number(distance);
  if (!Number.isFinite(value)) return '';
  if (type === 'real') return `${value.toFixed(1)}km`;
  if (value > 1000) return `${(value / 1000).toFixed(1)}km`;
  return `${value}m`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchWrap: {
    position: 'absolute',
    left: 16,
    right: 84,
    top: 10,
    zIndex: 20,
  },
  searchBox: {
    height: 48,
    borderRadius: 18,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  searchClear: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  searchPanel: {
    marginTop: 10,
    maxHeight: 430,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.98)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 9,
  },
  searchSectionTitle: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  searchItem: {
    minHeight: 66,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchItemIconCandidate: {
    backgroundColor: '#e0f2fe',
  },
  searchItemBody: { flex: 1, minWidth: 0 },
  searchItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchItemTitle: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  searchDistance: { fontSize: 11, color: '#0ea5e9', fontWeight: '800' },
  searchAddress: { marginTop: 2, fontSize: 12, color: '#64748b' },
  searchTags: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchBadge: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  searchBadgeCandidate: {
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
  },
  searchTag: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  searchMoreBtn: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: '#f0f9ff',
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchMoreText: { color: '#0284c7', fontSize: 13, fontWeight: '800' },
  searchEmpty: { paddingVertical: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  toolbar: {
    position: 'absolute', right: 16, top: '28%',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
    paddingVertical: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5,
  },
  toolBtn: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
  shareBtn: {
    position: 'absolute', bottom: 36, alignSelf: 'center',
    backgroundColor: '#fff', paddingHorizontal: 36, paddingVertical: 14,
    borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 10,
  },
  shareText: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.8 },
  sheetBg: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandleWrap: { height: 28, alignItems: 'center', justifyContent: 'center' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5' },
  debugPanel: { position: 'absolute', left: 1, bottom: 20, backgroundColor: 'rgba(0,0,0,0.68)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  debugText: { color: '#fff', fontSize: 8, lineHeight: 15 },
});
