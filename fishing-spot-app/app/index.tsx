import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import type { MapRegion } from '@/types/map';//导入地图区域类型，用于定义地图区域的类型。
import BottomSheet from '@gorhom/bottom-sheet';//导入 `BottomSheet` 组件，用于在底部显示钓点详情的弹窗。
import { useRouter } from 'expo-router';//导入 `useRouter` 钩子，用于在应用中进行页面导航。
import { Ionicons } from '@expo/vector-icons';//导入 `Ionicons` 图标库，用于在工具栏按钮中显示图标。
import { spotApi } from '@/api/client';//导入 `spotApi` 对象，用于调用与钓点相关的 API 接口。
import { useAppStore } from '@/stores/useAppStore';//导入全局状态管理的 `useAppStore` 钩子，用于访问和更新应用的全局状态。
import { useLocation } from '@/hooks/useLocation';//导入自定义的 `useLocation` 钩子，用于获取用户的位置信息和请求权限的方法。
import SpotDetailSheet from '@/components/SpotDetailSheet';//导入 `SpotDetailSheet` 组件，用于在底部弹窗中显示钓点的详细信息。
import MapSurface, { MapSurfaceHandle } from '@/components/MapSurface';//

export default function MapScreen() {
  const mapRef = useRef<MapSurfaceHandle>(null);//使用 `useRef` 创建一个引用 `mapRef`，用于访问 `MapSurface` 组件的实例方法。
  const sheetRef = useRef<BottomSheet>(null);//使用 `useRef` 创建一个引用 `sheetRef`，用于访问 `BottomSheet` 组件的实例方法。
  const [region, setRegion] = useState<MapRegion>({//初始位置设置为北京，实际使用中可以根据需要调整或使用用户当前位置。
    latitude: 39.9042, longitude: 116.4074,//设置地图的初始区域，包含中心点的经纬度和缩放级别（通过 `latitudeDelta` 和 `longitudeDelta` 控制）。
    latitudeDelta: 0.05, longitudeDelta: 0.05,//定义地图的初始区域，包含中心点的经纬度和缩放级别（通过 `latitudeDelta` 和 `longitudeDelta` 控制）。
  });
  const [spots, setSpots] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const router = useRouter();
  const { location, requestLocation } = useLocation();//使用自定义的 `useLocation` 钩子获取用户的位置信息和请求权限的方法。
  const currentLocation = useAppStore((s) => s.currentLocation);//从全局状态管理中获取当前位置信息。

  useEffect(() => {//当组件挂载或 `location` 发生变化时执行。
    if (location) {//当 `location` 可用时，更新 `region` 并调用 `fetchSpots`  函数获取钓点数据。
      const r = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05, longitudeDelta: 0.05,//根据用户的当前位置设置地图区域，初始缩放级别为 0.05，可以根据需要调整。
      };
      setRegion(r);//更新 `region` 状态以反映当前位置信息。
      fetchSpots(r);//调用 `fetchSpots` 函数获取钓点数据。
    }
  }, [location]);

  const fetchSpots = async (r: MapRegion) => {//定义一个异步函数 `fetchSpots`，接受一个 `MapRegion` 对象作为参数，用于获取指定区域内的钓点数据。
    try {
      const res: any = await spotApi.getInBounds({//调用 `spotApi.getInBounds` 方法，传入当前地图区域的边界坐标（北、南、东、西）来获取该区域内的钓点数据。
        north: r.latitude + r.latitudeDelta / 2,//计算地图区域的北边界坐标，通过中心点的纬度加上纬度跨度的一半来得到。
        south: r.latitude - r.latitudeDelta / 2,
        east: r.longitude + r.longitudeDelta / 2,
        west: r.longitude - r.longitudeDelta / 2,
      });
      setSpots(res || []);//将获取到的钓点数据存储在 `spots` 状态中，以便在地图上显示。
    } catch (e) { console.error(e); }
  };

  const onRegionChangeComplete = (r: MapRegion) => {//当地图区域变化完成时调用，更新 `region` 状态并重新获取钓点数据。
    setRegion(r);//更新 `region` 状态以反映新的地图区域。
    fetchSpots(r);//调用 `fetchSpots` 函数获取新的钓点数据，以便在地图上显示更新后的钓点信息。
  };

  const zoom = (factor: number) => setRegion((p) => ({//根据传入的缩放因子调整 `latitudeDelta` 和 `longitudeDelta`，实现地图的缩放功能。
    ...p, latitudeDelta: p.latitudeDelta * factor, longitudeDelta: p.longitudeDelta * factor,
  }));

  const goToMyLocation = async () => {//如果当前位置信息不可用，调用 `requestLocation` 方法请求权限并获取位置信息。
    if (!currentLocation) { await requestLocation(); return; }
    mapRef.current?.animateToRegion({
      latitude: currentLocation.latitude, longitude: currentLocation.longitude,
      latitudeDelta: 0.01, longitudeDelta: 0.01,
    });
  };

  const handleMarkerPress = useCallback((spot: any) => {//当用户点击地图上的钓点标记时调用，设置选中的钓点并打开底部弹窗显示钓点详情。
    setSelectedSpot(spot);//更新 `selectedSpot` 状态以存储当前选中的钓点信息。
    sheetRef.current?.snapToIndex(0);//调用 `snapToIndex` 方法将底部弹窗打开到第一个位置，以显示钓点详情。
  }, []);

  return (
    <View style={styles.container}>
      <MapSurface
        ref={mapRef}
        region={region}
        spots={spots}
        currentLocation={currentLocation}
        onRegionChangeComplete={onRegionChangeComplete}
        onMarkerPress={handleMarkerPress}
      />

      <View style={styles.toolbar}>
        <ToolButton icon="add" onPress={() => zoom(0.5)} />
        <ToolButton icon="remove" onPress={() => zoom(2)} />
        <ToolButton icon="locate" onPress={goToMyLocation} />
        <ToolButton icon="list" onPress={() => router.push('/nearby')} />
      </View>

      <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85} onPress={() => router.push('/share/camera')}>
        <Text style={styles.shareText}>钓点分享</Text>
      </TouchableOpacity>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['66%', '85%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <SpotDetailSheet spotId={selectedSpot?.id} />
      </BottomSheet>
    </View>
  );
}

function ToolButton({ icon, onPress }: { icon: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.toolBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color="#1a1a1a" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5', marginTop: 10 },
});
