import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spotApi } from '@/api/client';//导入 `spotApi` 对象，用于调用与钓点相关的 API 接口。
import { useAppStore } from '@/stores/useAppStore';//导入全局状态管理的 `useAppStore` 钩子，用于访问和更新应用的全局状态。

export default function SpotSelectScreen() {
  const router = useRouter();
  const [spots, setSpots] = useState<any[]>([]);//定义一个状态 `spots`，用于存储获取到的钓点数据，以便在界面上显示。
  const currentLocation = useAppStore((s) => s.currentLocation);//从全局状态管理中获取当前位置信息，以便在获取钓点数据时使用当前位置信息来获取附近的钓点数据。

  useEffect(() => {//当组件挂载时执行，调用 `goToMyLocation` 函数获取附近的钓点数据。
    if (currentLocation) {//附近2000米范围内的钓点数据，并将获取到的数据存储在 `spots` 状态中，以便在界面上显示。
      spotApi.getNearby(currentLocation.latitude, currentLocation.longitude, 2000).then((res: any) => setSpots(res || []));
    }
  }, []);

  const selectSpot = (spot: any) => {//定义一个函数 `selectSpot`，接受一个参数 `spot`，用于处理用户选择钓点的操作，将选择的钓点信息保存到全局状态管理中，并返回上一页。
    const store = useAppStore.getState();//获取全局状态管理的当前状态，以便在选择钓点后更新草稿数据中的钓点信息。
    const draft = store.draft || {};//获取当前的草稿数据，如果没有则默认为空对象，以便在选择钓点后更新草稿数据中的钓点信息。
    store.setDraft({ ...draft, spot });//将选择的钓点信息保存到全局状态管理中的草稿数据中，以便在用户进入编辑界面时能够恢复之前的编辑内容，并且关联上选择的钓点信息。
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>选择钓点</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={spots}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => selectSpot(item)}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.addr}>{item.address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  name: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  addr: { fontSize: 13, color: '#999' },
});
