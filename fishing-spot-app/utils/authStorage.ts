import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStore = new Map<string, string>();

export async function getAuthItem(key: string) {
  if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(key);
  return memoryStore.get(key) ?? null;
}

export async function setAuthItem(key: string, value: string) {
  if (Platform.OS !== 'web') return SecureStore.setItemAsync(key, value);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
    return;
  }
  memoryStore.set(key, value);
}

export async function deleteAuthItem(key: string) {
  if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(key);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
    return;
  }
  memoryStore.delete(key);
}
