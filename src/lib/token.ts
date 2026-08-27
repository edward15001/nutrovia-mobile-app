import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'nutrovia_token';

/**
 * Almacenamiento del token JWT.
 * En web SecureStore no está disponible: usamos localStorage (con guard
 * de `typeof window` para no romper el render estático/SSR).
 */
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export async function getToken(): Promise<string | null> {
  return storage.get(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await storage.set(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await storage.remove(TOKEN_KEY);
}
