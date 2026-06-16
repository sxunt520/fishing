import { useEffect, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { spotApi, postApi, commentApi } from '@/api/client';
import { resolveAssetUrl } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';
import { ensureLoggedIn } from '@/utils/authPrompt';

const { width } = Dimensions.get('window');

export default function SpotDetailSheet({ spotId, spot, onShare }: { spotId: string | null; spot?: any | null; onShare?: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const currentLocation = useAppStore((s) => s.currentLocation);
  const effectiveSpotId = spot?.savedSpotId || (!spot?.isCandidate ? spotId : null) || (!String(spot?.id || '').startsWith('amap_') ? spot?.id : null);
  const isCandidate = !effectiveSpotId && spot?.isCandidate !== false && (spot?.source === 'amap' || spot?.sourcePoiId || String(spot?.id || '').startsWith('amap_'));

  useEffect(() => {
    setPosts([]);
    if (!effectiveSpotId && isCandidate && spot) {
      setDetail({
        ...spot,
        distance: formatCandidateDistance(spot.distance),
        fishTypes: [],
      });
      return;
    }
    if (!effectiveSpotId) {
      setDetail(null);
      return;
    }
    loadDetail();
    loadPosts();
  }, [effectiveSpotId, isCandidate, spot?.id, spot?.sourcePoiId]);

  const loadDetail = async () => {
    try {
      const res: any = await spotApi.getDetail(effectiveSpotId!, currentLocation?.latitude, currentLocation?.longitude);
      setDetail(res);
    } catch (e) { console.error(e); }
  };

  const loadPosts = async () => {
    try {
      const res: any = await postApi.getBySpot(effectiveSpotId!, 1);
      console.log('[Spot Posts]', effectiveSpotId, res.data?.length || 0);
      setPosts(res.data || []);
    } catch (e) { console.error(e); }
  };

  if (!detail) return null;

  const rawFishTypes = mergeFishTags(detail.fishTypes || detail.fish_types, detail.fishCategories);
  const fishTypes = rawFishTypes.length > 0 ? rawFishTypes.slice(0, 3) : ['待探索'];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{detail.name}</Text>
            {detail.distance != null && (
              <View style={styles.distBadge}>
                <Ionicons name="location-outline" size={12} color="#0ea5e9" />
                <Text style={styles.distText}>{formatDistance(detail.distance)}</Text>
              </View>
            )}
          </View>
          <View style={styles.addrRow}>
            <Ionicons name="location" size={14} color="#bbb" />
            <Text style={styles.addr}>{detail.address || '未知地址'}</Text>
          </View>
          <View style={styles.coordRow}>
            <Ionicons name="navigate-outline" size={13} color="#cbd5e1" />
            <Text style={styles.coordText}>
              {Number(detail.latitude).toFixed(5)}, {Number(detail.longitude).toFixed(5)}
            </Text>
          </View>
          <View style={styles.tagsLine}>
            <View style={styles.tagsRow}>
              {fishTypes.map((f: string, i: number) => (
                <View key={i} style={[styles.tag, f === '待探索' && styles.pendingTag]}>
                  <Text style={[styles.tagText, f === '待探索' && styles.pendingTagText]}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.shareSpotBtn} activeOpacity={0.85} onPress={onShare}>
              <Ionicons name="add-circle-outline" size={15} color="#fff" />
              <Text style={styles.shareSpotText}>分享此钓点</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>钓友分享</Text>
          {posts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{isCandidate ? '这个水域还没有钓友分享，等你来探索。' : '暂无分享，快来抢占沙发！'}</Text>
            </View>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatCandidateDistance(distance?: number | string | null) {
  if (distance == null || distance === '') return null;
  const value = Number(distance);
  if (Number.isNaN(value)) return distance;
  return value > 100 ? `${Math.round(value)}m` : `${value}km`;
}

function mergeFishTags(...groups: any[]) {
  const tags = groups.flatMap((group) => Array.isArray(group) ? group : []);
  return Array.from(new Set(tags.filter(Boolean)));
}

function formatDistance(distance?: number | string | null) {
  if (distance == null || distance === '') return '';
  if (typeof distance === 'string' && /m|km$/i.test(distance)) return distance;
  return `${distance}km`;
}

function PostCard({ post }: { post: any }) {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.user);
  const [liked, setLiked] = useState(Boolean(post.likedByMe || post.liked));
  const [count, setCount] = useState(post.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);

  const toggleLike = async () => {
    if (!ensureLoggedIn(currentUser, router, '登录后才能给钓友的分享点赞。')) return;
    try {
      if (liked) {
        const res: any = await postApi.unlike(post.id);
        setLiked(false);
        setCount(Math.max(0, Number(res?.likeCount ?? count - 1)));
      } else {
        const res: any = await postApi.like(post.id);
        setLiked(true);
        setCount(Number(res?.likeCount ?? count + 1));
      }
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setLiked(true);
        Alert.alert('已点赞', '你已经给这条分享点过赞啦。');
        return;
      }
      if (e?.response?.status === 404 && liked) {
        setLiked(false);
        return;
      }
      console.error(e);
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res: any = await commentApi.getComments(post.id, 1);
      setComments(res.data || []);
      setCommentCount(res.total ?? res.data?.length ?? commentCount);
    } catch (e) {
      console.error(e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = async () => {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (nextOpen && comments.length === 0) await loadComments();
  };

  const submitComment = async () => {
    if (!ensureLoggedIn(currentUser, router, '登录后才能评论钓友的分享。')) return;
    const content = commentText.trim();
    if (!content) {
      Alert.alert('评论不能为空');
      return;
    }
    setCommentSaving(true);
    try {
      const created: any = await commentApi.create(post.id, content, replyTo?.id, replyTo?.userId);
      setComments((prev) => [...prev, created]);
      setCommentCount((prev: number) => prev + 1);
      setCommentText('');
      setReplyTo(null);
      setCommentsOpen(true);
    } catch (e: any) {
      Alert.alert('评论失败', e.response?.data?.message || '请稍后重试');
    } finally {
      setCommentSaving(false);
    }
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
        <TouchableOpacity style={styles.action} onPress={toggleComments}>
          <Ionicons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>
      </View>

      {commentsOpen && (
        <View style={styles.commentsBox}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentTitle}>评论</Text>
            {commentsLoading && <Text style={styles.commentHint}>加载中...</Text>}
          </View>

          {comments.length === 0 && !commentsLoading ? (
            <Text style={styles.noComment}>还没有评论，来聊两句。</Text>
          ) : (
            comments.map((comment) => (
              <TouchableOpacity
                key={comment.id}
                style={styles.commentItem}
                activeOpacity={0.75}
                onPress={() => setReplyTo(comment)}
              >
                <Image source={{ uri: comment.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}` }} style={styles.commentAvatar} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentUser}>
                    {comment.user?.nickname || '钓友'}
                    {comment.replyToUser ? <Text style={styles.replyUser}> 回复 @{comment.replyToUser.nickname || '钓友'}</Text> : null}
                  </Text>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          {replyTo && (
            <View style={styles.replyBar}>
              <Text style={styles.replyText}>回复 @{replyTo.user?.nickname || '钓友'}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.commentInputRow}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder={replyTo ? `回复 @${replyTo.user?.nickname || '钓友'}` : '说点什么...'}
              placeholderTextColor="#94a3b8"
              style={styles.commentInput}
              multiline
            />
            <TouchableOpacity style={[styles.commentSend, commentSaving && styles.commentSendDisabled]} onPress={submitComment} disabled={commentSaving}>
              <Text style={styles.commentSendText}>{commentSaving ? '发送中' : '发送'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  coordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  coordText: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
  tagsLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  tag: { backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#e0f2fe' },
  tagText: { fontSize: 12, color: '#0284c7', fontWeight: '600' },
  pendingTag: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  pendingTagText: { color: '#64748b' },
  shareSpotBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#111827', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 },
  shareSpotText: { color: '#fff', fontSize: 12, fontWeight: '800' },
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
  commentsBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  commentTitle: { fontSize: 13, fontWeight: '800', color: '#334155' },
  commentHint: { fontSize: 12, color: '#94a3b8' },
  noComment: { fontSize: 12, color: '#94a3b8', paddingVertical: 8 },
  commentItem: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  commentAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e2e8f0' },
  commentBody: { flex: 1, minWidth: 0 },
  commentUser: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 2 },
  replyUser: { color: '#0ea5e9', fontWeight: '800' },
  commentContent: { fontSize: 13, color: '#475569', lineHeight: 18 },
  replyBar: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyText: { fontSize: 12, color: '#475569', fontWeight: '700' },
  commentInputRow: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  commentInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 86,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#0f172a',
    fontSize: 13,
  },
  commentSend: { height: 38, borderRadius: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  commentSendDisabled: { opacity: 0.55 },
  commentSendText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
