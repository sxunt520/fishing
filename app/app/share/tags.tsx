import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tagApi } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';

export default function TagsScreen() {
  const router = useRouter();
  const { type, selected } = useLocalSearchParams();
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(JSON.parse((selected as string) || '[]'));

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const res: any = type === 'fish' ? await tagApi.getFish() : await tagApi.getEvaluations();
      setTags(res || []);
    } catch (e) {
      setTags(type === 'fish'
        ? ['鲫鱼','草鱼','鲤鱼','青鱼','鲢鳙','黑鱼','鲈鱼','鳜鱼'].map((t) => ({ name: t, display: `#${t}` }))
        : ['黑坑','野钓','斤塘','水库','爆护','空军','新手友好'].map((t) => ({ name: t, display: `#${t}` }))
      );
    }
  };

  const toggle = (name: string) => {
    if (type === 'evaluation') setSelectedTags([name]);
    else setSelectedTags((p) => (p.includes(name) ? p.filter((t) => t !== name) : [...p, name]));
  };

  const confirm = () => {
    const store = useAppStore.getState();
    const draft = store.draft || {};
    if (type === 'fish') store.setDraft({ ...draft, fishCategories: selectedTags });
    else store.setDraft({ ...draft, spotEvaluation: selectedTags[0] });
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{type === 'fish' ? '鱼获类别' : '钓点评价'}</Text>
        <TouchableOpacity onPress={confirm} style={styles.doneBtn}>
          <Text style={styles.doneText}>完成</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tags.map((tag) => {
          const active = selectedTags.includes(tag.name);
          return (
            <TouchableOpacity key={tag.name} style={[styles.item, active && styles.itemActive]} onPress={() => toggle(tag.name)}>
              <Text style={[styles.itemText, active && styles.itemTextActive]}>{tag.display}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  doneBtn: { padding: 4 },
  doneText: { fontSize: 15, color: '#0ea5e9', fontWeight: '600' },
  list: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  item: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee' },
  itemActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  itemText: { fontSize: 14, color: '#666' },
  itemTextActive: { color: '#fff', fontWeight: '600' },
});
