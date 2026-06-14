import type { Router } from 'expo-router';

export function ensureLoggedIn(user: any, router: Router, message = '登录后才能继续操作') {
  if (user?.id) return true;

  console.log('[Auth Required]', message);
  router.push('/login');
  return false;
}
