import type { Router } from 'expo-router';
import { Platform } from 'react-native';

export function ensureLoggedIn(user: any, router: Router, message = '登录后才能继续操作') {
  if (user?.id || user?.userId || hasWebAccessToken()) return true;

  console.log('[Auth Required]', message);
  router.push('/login');
  return false;
}

function hasWebAccessToken() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return Boolean(window.localStorage?.getItem('access_token'));
}
