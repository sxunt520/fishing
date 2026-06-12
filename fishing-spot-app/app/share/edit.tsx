import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/stores/useAppStore';//导入全局状态管理的 `useAppStore` 钩子，用于访问和更新应用的全局状态。
import { postApi, draftApi, aiApi, uploadApi } from '@/api/client';//导入与发布相关的 API 接口，包括获取草稿、保存草稿、调用 AI 生成内容和上传图片的接口。
import * as ImagePicker from 'expo-image-picker';//导入 `expo-image-picker` 库，用于实现图片选择功能，允许用户从相册中选择图片进行上传。

export default function ShareEditScreen() {
  const router = useRouter();
  const draft = useAppStore((s) => s.draft);//从全局状态管理中获取当前的草稿数据，以便在编辑界面中显示和编辑。
  const setDraft = useAppStore((s) => s.setDraft);//从全局状态管理中获取设置草稿数据的方法，以便在编辑过程中更新草稿内容。
  const user = useAppStore((s) => s.user);//从全局状态管理中获取当前用户信息，以便在发布内容时进行用户验证和关联。

  const [images, setImages] = useState<string[]>(draft?.images || []);
  const [title, setTitle] = useState(draft?.title || '');
  const [content, setContent] = useState(draft?.content || '');//定义状态变量 `images`、`title` 和 `content`，用于存储用户编辑的图片、标题和内容信息，初始值从草稿中获取，如果草稿中没有则默认为空。
  const [spot, setSpot] = useState<any>(draft?.spot || null);//定义一个状态 `spot`，用于存储用户选择的钓点信息，初始值从草稿中获取，如果草稿中没有则默认为 `null`。
  console.log('---------spot----------', spot);
  //const [spot, setSpot] = useState<any>(draft?.spot || '65333cd9-f988-49b5-a460-a01b646ce48e');
  const [fishCategories, setFishCategories] = useState<string[]>(draft?.fishCategories || []);//定义一个状态 `fishCategories`，用于存储用户选择的鱼获类别信息，初始值从草稿中获取，如果草稿中没有则默认为空数组。
  const [spotEvaluation, setSpotEvaluation] = useState(draft?.spotEvaluation || '');//定义一个状态 `spotEvaluation`，用于存储用户选择的钓点评价信息，初始值从草稿中获取，如果草稿中没有则默认为空字符串。
  const [aiLoading, setAiLoading] = useState(false);//定义一个状态 `aiLoading`，用于表示 AI 生成内容的加载状态，初始值为 `false`，表示未加载。
  const [saving, setSaving] = useState(false);//定义一个状态 `saving`，用于表示发布内容的保存状态，初始值为 `false`，表示未保存。

  useEffect(() => {//当组件挂载时执行，从草稿中加载之前保存的编辑内容，以便用户继续编辑未完成的内容。
    if (draft?.spot) setSpot(draft.spot);//如果草稿中存在钓点信息，则将其设置到 `spot` 状态中，以便在编辑界面中显示和编辑。
    if (draft?.fishCategories) setFishCategories(draft.fishCategories);//如果草稿中存在鱼获类别信息，则将其设置到 `fishCategories` 状态中，以便在编辑界面中显示和编辑。
    if (draft?.spotEvaluation) setSpotEvaluation(draft.spotEvaluation);//如果草稿中存在钓点评价信息，则将其设置到 `spotEvaluation` 状态中，以便在编辑界面中显示和编辑。
  }, [draft]);

  useEffect(() => {//当 `images`、`title`、`content`、`spot`、`fishCategories` 或 `spotEvaluation` 发生变化时执行，自动保存当前编辑内容到草稿中，以便用户在下次进入编辑界面时能够继续编辑未完成的内容。
    const timer = setTimeout(() => {//使用 `setTimeout` 来延迟保存操作，避免在用户频繁修改内容时过于频繁地保存草稿，提升性能和用户体验。
      const current = { images, title, content, spot, fishCategories, spotEvaluation };
      setDraft(current);
      draftApi.save(current).catch(() => {});//调用 `draftApi.save` 方法将当前编辑内容保存到服务器上的草稿中，如果保存失败则捕获错误并忽略，以免影响用户的编辑体验。
    }, 3000);
    return () => clearTimeout(timer);
  }, [images, title, content, spot, fishCategories, spotEvaluation]);

  const addImage = async () => {//定义一个异步函数 `addImage`，用于处理用户添加图片的操作。
    if (images.length >= 3) { Alert.alert('最多上传3张图片'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });//调用 `ImagePicker.launchImageLibraryAsync` 方法打开系统的图片选择界面，允许用户选择图片，设置媒体类型为图片、允许编辑和调整质量。
    if (!result.canceled) setImages((p) => [...p, result.assets[0].uri]);
  };

  const removeImage = (idx: number) => setImages((p) => p.filter((_, i) => i !== idx));//定义一个函数 `removeImage`，接受一个索引参数 `idx`，用于处理用户删除图片的操作，通过过滤掉指定索引的图片来更新 `images` 状态。

  const handleAI = async () => {//定义一个异步函数 `handleAI`，用于处理用户点击 AI 生成内容按钮的操作。
    if (images.length === 0) { Alert.alert('请先上传图片'); return; }
    setAiLoading(true);
    try {
      const formData = new FormData();
      const uri = images[0];
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('files', { uri, name: filename, type } as any);//将用户选择的第一张图片添加到 `FormData` 中，以便上传到服务器进行 AI 生成内容的处理。
      const uploadRes: any = await uploadApi.uploadImages(formData);//调用 `uploadApi.uploadImages` 方法将用户选择的图片上传到服务器，并获取上传后的图片 URL。
      const res: any = await aiApi.generateCaption(uploadRes.urls[0]);//调用 `aiApi.generateCaption` 方法，传入上传后的图片 URL 来生成 AI 生成的标题和内容。
      setTitle(res.title || '');
      setContent(res.content || '');
    } catch (e) {
      Alert.alert('AI生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePublish = async () => {//定义一个异步函数 `handlePublish`，用于处理用户点击发布按钮的操作。
    //if (!spot?.id) { Alert.alert('请选择钓点标记'); return; }
    if (!user) { router.push('/login'); return; }
    setSaving(true);
    try {
      let imageUrls = images;
      if (images.some((i) => i.startsWith('file://'))) {
        const formData = new FormData();
        images.forEach((uri) => {
          const filename = uri.split('/').pop() || 'image.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          formData.append('files', { uri, name: filename, type } as any);
        });
        const uploadRes: any = await uploadApi.uploadImages(formData);//如果用户选择的图片中有本地文件 URI，则需要先将这些图片上传到服务器，获取上传后的图片 URL，以便在发布内容时使用这些 URL 来关联图片。
        imageUrls = uploadRes.urls;//将上传后的图片 URL 替换原来的本地文件 URI，以便在发布内容时使用这些 URL 来关联图片。
      }
      await postApi.create({//调用 `postApi.create` 方法将用户编辑的内容发布到服务器，包括钓点 ID、标题、内容、图片 URL、鱼获类别和钓点评价等信息。
        spotId: spot.id, title, content,
        images: imageUrls, fishCategories, spotEvaluation,
      });
      setDraft(null);//发布成功后，清除草稿内容，以便用户下次进入编辑界面时不会看到之前的编辑内容。
      await draftApi.clear();//调用 `draftApi.clear` 方法清除服务器上的草稿内容，以确保用户的草稿数据被正确清除，避免占用服务器资源。
      router.replace('/share/success');
    } catch (e: any) {
      Alert.alert('发布失败', e.response?.data?.message || '请检查网络');
    } finally {
      setSaving(false);
    }
  };

  const goToTags = (type: 'fish' | 'evaluation') => {//定义一个函数 `goToTags`，接受一个参数 `type`，用于处理用户点击选择标签的操作，根据标签类型导航到相应的标签选择页面，并传递当前已选择的标签信息。
    const selected = type === 'fish' ? fishCategories : [spotEvaluation].filter(Boolean);//根据标签类型获取当前已选择的标签信息，如果是鱼获类别则使用 `fishCategories`，如果是钓点评价则使用 `spotEvaluation`，并过滤掉空值，以便在标签选择页面中显示当前已选择的标签，并允许用户进行修改。
    router.push({ pathname: '/share/tags', params: { type, selected: JSON.stringify(selected) } });//将当前已选择的标签信息通过 URL 参数传递到标签选择页面，以便在标签选择页面中显示当前已选择的标签，并允许用户进行修改。
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>钓点分享</Text>
        <TouchableOpacity style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.imgSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.imgRow}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.imgWrap}>
                  <Image source={{ uri: img }} style={styles.img} />
                  <TouchableOpacity style={styles.delBtn} onPress={() => removeImage(idx)}>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 3 && (
                <TouchableOpacity style={styles.addBtn} onPress={addImage}>
                  <Ionicons name="add" size={32} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <TextInput style={styles.titleInput} placeholder="请输入标题" value={title} onChangeText={setTitle} maxLength={50} />
        </View>

        <View style={[styles.inputGroup, { minHeight: 140 }]}>
          <TextInput
            style={styles.contentInput}
            placeholder="请写下你的垂钓心得～"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          <TouchableOpacity style={styles.aiBtn} onPress={handleAI} disabled={aiLoading}>
            <Text style={styles.aiText}>{aiLoading ? '...' : 'AI'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.row} onPress={() => router.push('/spot/select')}>
          <View style={styles.rowLeft}>
            <Ionicons name="location" size={18} color="#333" />
            <Text style={styles.rowLabel}>钓点标记</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={spot ? styles.rowValue : styles.rowPlaceholder}>
              {spot ? `${spot.name}` : '选择钓点位置'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => goToTags('fish')}>
          <View style={styles.rowLeft}>
            <Ionicons name="fish-outline" size={18} color="#333" />
            <Text style={styles.rowLabel}>鱼获类别</Text>
          </View>
          <View style={styles.rowRight}>
            {fishCategories.length > 0 ? (
              <View style={styles.tagGroup}>
                {fishCategories.map((t, i) => (
                  <View key={i} style={styles.tag}><Text style={styles.tagText}>#{t}</Text></View>
                ))}
              </View>
            ) : <Text style={styles.rowPlaceholder}>选择鱼获</Text>}
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => goToTags('evaluation')}>
          <View style={styles.rowLeft}>
            <Ionicons name="star-outline" size={18} color="#333" />
            <Text style={styles.rowLabel}>钓点评价</Text>
          </View>
          <View style={styles.rowRight}>
            {spotEvaluation ? (
              <View style={styles.tag}><Text style={styles.tagText}>#{spotEvaluation}</Text></View>
            ) : <Text style={styles.rowPlaceholder}>选择评价</Text>}
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.draftBtn} onPress={() => router.back()}>
          <Ionicons name="archive-outline" size={18} color="#666" />
          <Text style={styles.draftText}>草稿箱</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.publishBtn, saving && { opacity: 0.6 }]} onPress={handlePublish} disabled={saving}>
          <Text style={styles.publishText}>{saving ? '发布中...' : '发布'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  infoBtn: { padding: 4 },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  imgSection: { marginBottom: 16 },
  imgRow: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  imgWrap: { position: 'relative' },
  img: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#f5f5f5' },
  delBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10 },
  addBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#eee', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  inputGroup: { backgroundColor: '#fafafa', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  titleInput: { fontSize: 16, fontWeight: '600', color: '#333', padding: 0 },
  contentInput: { fontSize: 15, color: '#555', minHeight: 100, padding: 0, lineHeight: 22 },
  aiBtn: { position: 'absolute', right: 8, bottom: 8, backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  aiText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  rowValue: { fontSize: 14, color: '#333', maxWidth: 200, textAlign: 'right' },
  rowPlaceholder: { fontSize: 14, color: '#bbb' },
  tagGroup: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: '#e0f2fe' },
  tagText: { fontSize: 12, color: '#0284c7', fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#f5f5f5', gap: 12 },
  draftBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  draftText: { fontSize: 14, color: '#666' },
  publishBtn: { flex: 1, backgroundColor: '#1a1a1a', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  publishText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
