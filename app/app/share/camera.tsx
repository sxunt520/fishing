import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/stores/useAppStore';
import { uploadApi } from '@/api/client';
import { ensureLoggedIn } from '@/utils/authPrompt';

export default function CameraScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('需要相机权限'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8, base64: false });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('需要相册权限'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8, base64: false });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleConfirm = async () => {
    if (!ensureLoggedIn(user, router, '登录后才能上传图片。')) return;
    const store = useAppStore.getState();
    if (!image) {
      store.setDraft({ ...(store.draft || {}), images: [] });
      router.push('/share/edit');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImageUri(image);
      store.setDraft({ ...(store.draft || {}), images: [url] });
      router.push('/share/edit');
    } catch (e: any) {
      Alert.alert('图片上传失败', e.response?.data?.message || '请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>钓点分享</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.preview}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={48} color="#ddd" />
            <Text style={styles.placeholderText}>选择或拍摄一张钓鱼照片</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.btn} onPress={() => setImage(null)}>
          <View style={styles.circle}><Ionicons name="refresh" size={24} color="#666" /></View>
          <Text style={styles.btnText}>重置</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { marginBottom: 12 }]} onPress={takePhoto}>
          <View style={[styles.circle, { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1a1a1a', borderWidth: 4, borderColor: '#f0f0f0' }]}>
            <Ionicons name="camera" size={32} color="#fff" />
          </View>
          <Text style={[styles.btnText, { fontWeight: '700', color: '#1a1a1a' }]}>相机</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={pickImage}>
          <View style={styles.circle}><Ionicons name="images-outline" size={24} color="#666" /></View>
          <Text style={styles.btnText}>上传</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.nextBtn, uploading && { opacity: 0.6 }]} onPress={handleConfirm} disabled={uploading}>
        <Text style={styles.nextText}>{uploading ? '上传中...' : '下一步'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  preview: { flex: 1, margin: 20, backgroundColor: '#fafafa', borderRadius: 20, borderWidth: 2, borderColor: '#f0f0f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%', borderRadius: 20 },
  placeholder: { alignItems: 'center' },
  placeholderText: { marginTop: 12, color: '#ccc', fontSize: 14 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingHorizontal: 40, paddingBottom: 20 },
  btn: { alignItems: 'center', gap: 8 },
  circle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  btnText: { fontSize: 13, color: '#666' },
  nextBtn: { marginHorizontal: 20, marginBottom: 30, backgroundColor: '#1a1a1a', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

async function uploadImageUri(uri: string) {
  const formData = new FormData();
  formData.append('files', buildUploadFile(uri) as any);
  const uploadRes: any = await uploadApi.uploadImages(formData);
  const url = uploadRes.urls?.[0];
  if (!url || !/^https?:\/\//i.test(url)) throw new Error('图片上传失败，未拿到腾讯云图片地址');
  console.log('[Image Uploaded]', url);
  return url;
}

function buildUploadFile(uri: string) {
  const cleanUri = uri.split('?')[0];
  const rawName = cleanUri.split('/').pop() || `fishing-${Date.now()}.jpg`;
  const hasExt = /\.[a-zA-Z0-9]+$/.test(rawName);
  const name = hasExt ? rawName : `${rawName}.jpg`;
  const ext = (name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'jpg').toLowerCase();
  const mimeExt = ext === 'jpg' ? 'jpeg' : ext;
  return { uri, name, type: `image/${mimeExt}` };
}
