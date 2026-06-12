import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spotApi, postApi } from '@/api/client';
import { resolveAssetUrl } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';

const { width } = Dimensions.get('window');

export default function SpotDetailSheet({ spotId }: { spotId: string | null }) {
  const [detail, setDetail] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const currentLocation = useAppStore((s) => s.currentLocation);

  useEffect(() => {
    if (!spotId) return;
    loadDetail();
    loadPosts();
  }, [spotId]);

  const loadDetail = async () => {
    if (!currentLocation) return;
    try {
      const res: any = await spotApi.getDetail(spotId!, currentLocation.latitude, currentLocation.longitude);
      setDetail(res);
    } catch (e) { console.error(e); }
  };

  const loadPosts = async () => {
    try {
      const res: any = await postApi.getBySpot(spotId!, 1);
      setPosts(res.data || []);
    } catch (e) { console.error(e); }
  };

  if (!detail) return null;

  const fishTypes = detail.fishTypes || detail.fish_types || ['鲫鱼', '草鱼'];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{detail.name}</Text>
            {detail.distance != null && (
              <View style={styles.distBadge}>
                <Ionicons name="location-outline" size={12} color="#0ea5e9" />
                <Text style={styles.distText}>{detail.distance}km</Text>
              </View>
            )}
          </View>
          <View style={styles.addrRow}>
            <Ionicons name="location" size={14} color="#bbb" />
            <Text style={styles.addr}>{detail.address || '未知地址'}</Text>
          </View>
          <View style={styles.tagsRow}>
            {fishTypes.map((f: string, i: number) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>钓友分享</Text>
          {posts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无分享，快来抢占沙发！</Text>
            </View>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function PostCard({ post }: { post: any }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(post.likeCount || 0);

  const toggleLike = async () => {
    try {
      if (liked) { await postApi.unlike(post.id); setCount((c: number) => c - 1); }
      else { await postApi.like(post.id); setCount((c: number) => c + 1); }
      setLiked(!liked);
    } catch (e) { console.error(e); }
  };

  const images = post.images || [];
  const user = post.user || {};

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}` }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nickname}>{user.nickname || '钓友'}</Text>
          <Text style={styles.time}>{new Date(post.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{post.title || '无标题'}</Text>
      <Text style={styles.cardContent} numberOfLines={3}>{post.content || ''}</Text>

      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgScroll}>
          {images.map((img: string, i: number) => (
            <Image key={i} source={{ uri: resolveAssetUrl(img) }} style={styles.postImg} />
          ))}
        </ScrollView>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.action} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#ef4444' : '#666'} />
          <Text style={[styles.actionText, liked && { color: '#ef4444' }]}>{count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <Ionicons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.actionText}>{post.commentCount || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 },
  header: { paddingTop: 6, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  distBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  distText: { fontSize: 12, color: '#0ea5e9', marginLeft: 3, fontWeight: '600' },
  addrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  addr: { fontSize: 13, color: '#aaa', marginLeft: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#e0f2fe' },
  tagText: { fontSize: 12, color: '#0284c7', fontWeight: '600' },
  section: { marginTop: 16, paddingBottom: 40 },
  secTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
  card: { backgroundColor: '#fafafa', borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eee' },
  nickname: { fontSize: 14, fontWeight: '600', color: '#333' },
  time: { fontSize: 11, color: '#bbb', marginTop: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  cardContent: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 8 },
  imgScroll: { marginVertical: 6 },
  postImg: { width: 120, height: 120, borderRadius: 10, marginRight: 8, backgroundColor: '#eee' },
  cardFooter: { flexDirection: 'row', marginTop: 8, gap: 20 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: '#666' },
});
