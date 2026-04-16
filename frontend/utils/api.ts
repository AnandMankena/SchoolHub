import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from './backendUrl';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const base = getBackendBaseUrl();
  if (!base) {
    throw new Error(
      'EXPO_PUBLIC_BACKEND_URL is not set. Add it to frontend/.env (e.g. EXPO_PUBLIC_BACKEND_URL=http://localhost:8001) and restart Expo.'
    );
  }

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const token = await AsyncStorage.getItem('auth_token');
  const headers: any = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const requestUrl = `${base}${path}`;
  const response = await fetch(requestUrl, {
    ...options,
    headers,
  });

  const bodyText = await response.text();
  const ct = response.headers.get('content-type') || '';
  const finalUrl = response.url || requestUrl;

  if (!ct.includes('application/json')) {
    const preMatch = bodyText.match(/<pre[^>]*>([^<]*)<\/pre>/i);
    const expressHint = preMatch ? preMatch[1].trim() : '';
    const extra =
      expressHint && expressHint.includes('Cannot GET')
        ? ` (${expressHint})`
        : '';
    throw new Error(
      `API returned HTML or non-JSON (${response.status}) from ${finalUrl}${extra}. ` +
        `Use EXPO_PUBLIC_BACKEND_URL=http://localhost:8001 (no /api suffix). ` +
        `Restart the backend from the SchoolHub/backend folder after pulling updates so /api/analytics exists. ` +
        `Check http://localhost:8001/api/health — it should return JSON {"ok":true,...}.`
    );
  }

  let data: any;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error(`Invalid JSON from ${finalUrl} (${response.status})`);
  }

  if (!response.ok) {
    const detail = data.detail;
    const message = typeof detail === 'string' ? detail :
      Array.isArray(detail) ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(' ') :
      'Something went wrong';
    throw new Error(message);
  }

  return data;
}
