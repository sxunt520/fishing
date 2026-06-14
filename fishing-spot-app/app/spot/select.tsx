import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spotApi } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';

type SpotOption = {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  distance?: number;
  postCount?: number;
  source?: string;
  sourcePoiId?: string;
  isCandidate?: boolean;
};

export default function SpotSelectScreen() {
  const router = useRouter();
  const currentLocation = useAppStore((s) => s.currentLocation);
  const [realSpots, setRealSpots] = useState<SpotOption[]>([]);
  const [candidates, setCandidates] = useState<SpotOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentLocation) return;
    loadOptions();
  }, [currentLocation]);

  const options = useMemo(() => {
    const realIds = new Set(realSpots.map((spot) => spot.id));
    return [
      ...realSpots.map((spot) => ({ ...spot, isCandidate: false })),
      ...candidates.filter((candidate) => candidate.isCandidate !== false && !realIds.has(candidate.id)),
    ];
  }, [candidates, realSpots]);

  const loadOptions = async () => {
    if (!currentLocation) return;
    setLoading(true);
    try {
      const [nearbyRes, candidateRes]: any[] = await Promise.all([
        spotApi.getNearby(currentLocation.latitude, currentLocation.longitude, 10, 20),
        spotApi.getWaterCandidates(currentLocation.latitude, currentLocation.longitude, 5000, 30),
      ]);
      setRealSpots(nearbyRes || []);
      setCandidates(candidateRes || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectSpot = (spot: SpotOption) => {
    const store = useAppStore.getState();
    store.setDraft({ ...(store.draft || {}), spot });
    router.back();
  };

  const renderItem = ({ item }: { item: SpotOption }) => {
    const isCandidate = item.isCandidate !== false;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.82} onPress={() => selectSpot(item)}>
        <View style={[styles.marker, isCandidate ? styles.markerCandidate : styles.markerReal]}>
          <Ionicons name={isCandidate ? 'water-outline' : 'fish-outline'} size={18} color={isCandidate ? '#0284c7' : '#111'} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.badge, isCandidate ? styles.badgeCandidate : styles.badgeReal]}>
              <Text style={[styles.badgeText, isCandidate ? styles.badgeCandidateText : styles.badgeRealText]}>
                {isCandidate ? '候选水域' : '真实钓点'}
              </Text>
            </View>
          </View>
          <Text style={styles.address} numberOfLines={1}>{item.address || '暂无地址'}</Text>
          <View style={styles.metaRow}>
            {item.distance != null && (
              <Text style={styles.meta}>
                {Number(item.distance) > 100 ? `${Math.round(Number(item.distance))}m` : `${Number(item.distance).toFixed(1)}km`}
              </Text>
            )}
            {!isCandidate && <Text style={styles.meta}>{item.postCount || 0} 条分享</Text>}
            {isCandidate && <Text style={styles.meta}>发布后沉淀为钓点</Text>}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>选择钓点</Text>
        <TouchableOpacity onPress={loadOptions} style={styles.backBtn}>
          <Ionicons name="refresh" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {!currentLocation ? (
        <View style={styles.empty}>
          <Ionicons name="locate-outline" size={42} color="#cbd5e1" />
          <Text style={styles.emptyText}>需要定位后才能发现附近水域</Text>
        </View>
      ) : (
        <FlatList
          data={options}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.isCandidate ? 'candidate' : 'spot'}-${item.id || item.sourcePoiId}`}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.tip}>
              <Text style={styles.tipTitle}>附近钓点与水域</Text>
              <Text style={styles.tipText}>黑色为已有用户分享的钓点，蓝色为高德发现的候选水域。</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              {loading ? <ActivityIndicator color="#0ea5e9" /> : <Text style={styles.emptyText}>附近暂未发现钓点或水域</Text>}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  list: { padding: 16, gap: 10 },
  tip: { paddingBottom: 8 },
  tipTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  tipText: { fontSize: 13, color: '#64748b', lineHeight: 19 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  marker: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  markerReal: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#111' },
  markerCandidate: { backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#7dd3fc' },
  cardBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  badgeReal: { backgroundColor: '#111827' },
  badgeCandidate: { backgroundColor: '#e0f2fe' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeRealText: { color: '#fff' },
  badgeCandidateText: { color: '#0284c7' },
  address: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 8 },
  meta: { fontSize: 12, color: '#0ea5e9', fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
