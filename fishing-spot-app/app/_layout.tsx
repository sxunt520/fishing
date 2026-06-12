import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { authApi } from '@/api/client';

export default function RootLayout() {
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    authApi.me().then((res) => setUser(res)).catch(() => {});
  }, []);

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
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
