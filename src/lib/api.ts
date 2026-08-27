import { API_URL } from './config';
import { getToken } from './token';

/**
 * Cliente HTTP de la API de NutroVia.
 * Añade el header Authorization con el JWT cuando hay token.
 */
export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error ||
      (data?.errors ? data.errors.map((e: any) => e.msg).join(' · ') : 'Error de conexión');
    const err: any = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}
