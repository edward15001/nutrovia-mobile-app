import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api } from './api';
import { getToken, removeToken, setToken } from './token';

const USER_KEY = 'nutrovia_user';

export interface User {
  id: string;
  name: string;
  email: string;
}

// En web SecureStore no está disponible: usamos localStorage
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

// ─── Cambios de sesión ──────────────────────────────────────
// El layout raíz escucha para actualizar los guards (Stack.Protected):
// sin esto, tras login/registro/logout el estado de autenticación
// quedaría desactualizado y la navegación se quedaría bloqueada.

type AuthListener = () => void;
const listeners = new Set<AuthListener>();

export function onAuthChange(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyAuthChange() {
  listeners.forEach(listener => listener());
}

// ─── Sesión ─────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  const data = await api<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  await setToken(data.token);
  await storage.set(USER_KEY, JSON.stringify(data.user));
  notifyAuthChange();
  return data.user;
}

export async function register(name: string, email: string, password: string): Promise<User> {
  const data = await api<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  await setToken(data.token);
  await storage.set(USER_KEY, JSON.stringify(data.user));
  notifyAuthChange();
  return data.user;
}

export async function logout(): Promise<void> {
  await removeToken();
  await storage.remove(USER_KEY);
  notifyAuthChange();
}

export async function getUser(): Promise<User | null> {
  const raw = await storage.get(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  return !!(await getToken());
}
