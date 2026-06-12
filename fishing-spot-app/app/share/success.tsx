import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SuccessScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="fish-outline" size={64} color="#0ea5e9" />
        </View>
        <Text style={styles.title}>钓点分享成功！</Text>
        <Text style={styles.subtitle}>您的内容已自动分享至社区！</Text>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
        <Text style={styles.backText}>&gt;&gt; 点击返回钓点地图 &lt;&lt;</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  content: { alignItems: 'center', marginBottom: 60 },
  iconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666' },
  backBtn: { marginTop: 40 },
  backText: { fontSize: 15, color: '#0ea5e9', fontWeight: '600' },
});
