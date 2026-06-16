import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spotApi } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';
import { useLocation } from '@/hooks/useLocation';

export default function NearbyScreen() {
  const [spots, setSpots] = useState<any[]>([]);//定义一个状态 `spots`，用于存储获取到的钓点数据，以便在界面上显示。
  const router = useRouter();
  const currentLocation = useAppStore((s) => s.currentLocation);//从全局状态管理中获取当前位置信息，以便在界面上显示附近的钓点数据。
  const setSelectedMapSpot = useAppStore((s) => s.setSelectedMapSpot);
  const { requestLocation, loading: locationLoading } = useLocation();

  useEffect(() => {//当组件挂载或 `currentLocation` 发生变化时执行，如果当前位置信息可用，则调用 `spotApi.getNearby` 方法获取附近的钓点数据，并将获取到的数据存储在 `spots` 状态中，以便在界面上显示。
    if (isValidLocation(currentLocation)) {
      loadNearby(currentLocation);
      return;
    }
    requestLocation();
  }, [currentLocation, requestLocation]);

  const loadNearby = async (location: { latitude: number; longitude: number }) => {//定义一个异步函数 `loadNearby`，用于获取当前位置信息附近的钓点数据，如果当前位置信息不可用，则调用 `requestLocation` 方法请求权限并获取位置信息。
    try {
      const res: any = await spotApi.getNearby(location.latitude, location.longitude, 10, 20);//调用 `spotApi.getNearby` 方法，传入当前位置信息的经纬度和搜索半径来获取附近的钓点数据。
      setSpots(res || []);//将获取到的钓点数据存储在 `spots` 状态中，以便在界面上显示。
    } catch (e) { console.error(e); }
  };

  const renderItem = ({ item }: { item: any }) => {
    const fishToShow = normalizeFishTags(item.fishTypes || item.fish_types || item.fishCategories || item.fish_categories).slice(0, 2);//从鱼类字段中获取鱼类数据，确保其为数组格式，并且只显示前两个鱼类名称。

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedMapSpot(item);
          router.back();
        }}
      >
        <Image source={{ uri: `https://picsum.photos/200?random=${item.id}` }} style={styles.thumb} />
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.dist}>{item.distance}km</Text>
          </View>
          <View style={styles.addrRow}>
            <Ionicons name="location" size={12} color="#bbb" />
            <Text style={styles.addr}>{item.address}</Text>
          </View>
          {fishToShow.length > 0 && (
            <View style={styles.tags}>
              {fishToShow.map((t: string, i: number) => (
                <View key={`${t}-${i}`} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ddd" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>附近热门钓点</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={spots}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}//为每个钓点项提供一个唯一的键，通常使用钓点的 `id` 字段。
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>{locationLoading ? '正在定位附近钓点...' : '附近暂无钓点，去分享一个吧！'}</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  list: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderRadius: 16, padding: 12, gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#eee' },
  body: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  dist: { fontSize: 13, color: '#0ea5e9', fontWeight: '600' },
  addrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  addr: { fontSize: 12, color: '#aaa', marginLeft: 4 },
  tags: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 11, color: '#0284c7' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
});

function normalizeFishTags(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed || trimmed === '[]') return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {}
  return trimmed
    .split(/[,，、]+/)
    .map((item) => item.trim())
    .filter((item) => item && item !== '[]');
}

function isValidLocation(location?: { latitude: number; longitude: number } | null): location is { latitude: number; longitude: number } {
  if (!location) return false;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && !(latitude === 0 && longitude === 0)
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180;
}
