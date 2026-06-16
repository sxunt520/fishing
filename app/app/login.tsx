import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';
import { setAuthItem } from '@/utils/authStorage';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const submit = async () => {
    if (!phone || !password) return;
    setLoading(true);
    try {
      const res: any = isRegister
        ? await authApi.register(phone, password)
        : await authApi.login(phone, password);
      await setAuthItem('access_token', res.accessToken);
      const me = await authApi.me();
      setUser(me);
      router.back();
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{isRegister ? '注册账号' : '欢迎回来'}</Text>
        <Text style={styles.subtitle}>登录后即可分享你的钓点</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Ionicons name="phone-portrait-outline" size={18} color="#999" />
          <TextInput style={styles.input} placeholder="请输入手机号" keyboardType="phone-pad" maxLength={11} value={phone} onChangeText={setPhone} />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={18} color="#999" />
          <TextInput style={styles.input} placeholder="请输入密码" secureTextEntry value={password} onChangeText={setPassword} />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? '请稍候...' : (isRegister ? '注册' : '登录')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchBtn} onPress={() => setIsRegister(!isRegister)}>
          <Text style={styles.switchText}>{isRegister ? '已有账号？去登录' : '没有账号？去注册'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 },
  header: { marginTop: 60, marginBottom: 40 },
  closeBtn: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#999' },
  form: { gap: 16 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#f0f0f0' },
  input: { flex: 1, marginLeft: 12, fontSize: 15, color: '#333' },
  submitBtn: { backgroundColor: '#1a1a1a', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { alignItems: 'center', marginTop: 16 },
  switchText: { color: '#666', fontSize: 14 },
});
