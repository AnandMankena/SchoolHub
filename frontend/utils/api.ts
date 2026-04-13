import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: any = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;
    const message = typeof detail === 'string' ? detail :
      Array.isArray(detail) ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(' ') :
      'Something went wrong';
    throw new Error(message);
  }

  return data;
}
