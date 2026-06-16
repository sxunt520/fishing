import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { authApi } from '@/api/client';
import { ensureGaodePrivacyAndSdk } from '@/utils/gaodePrivacy';

ensureGaodePrivacyAndSdk();//在应用启动时调用 `ensureGaodePrivacyAndSdk` 函数，确保高德地图 SDK 的隐私配置和初始化已经完成。这是为了满足高德地图的隐私政策要求，并确保地图功能能够正常使用。

export default function RootLayout() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);//从全局状态管理中获取 `setUser` 方法，用于更新用户信息。

  useEffect(() => {
    authApi.me().then((res) => setUser(res)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user && !user.id) setUser(null);
  }, [setUser, user]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="nearby" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="share/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="share/camera" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="share/success" options={{ presentation: 'modal', animation: 'fade' }} />
        <Stack.Screen name="share/tags" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="spot/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="spot/select" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
