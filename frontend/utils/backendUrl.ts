import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dev machine IP as seen from a physical device (Metro / Expo dev server host).
 * Not available in all contexts; null in production builds or offline.
 */
function devMachineHostFromExpo(): string | null {
  const uri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string }; manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  if (!uri || typeof uri !== 'string') return null;
  const host = uri.split(':')[0]?.trim();
  return host || null;
}

/**
 * Base URL for the SchoolHub API (no trailing slash).
 * Prefer EXPO_PUBLIC_BACKEND_URL in frontend/.env — if unset in dev, we fall back so web/mobile simulators still work.
 */
export function getBackendBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_BACKEND_URL;
  const fromEnv = typeof raw === 'string' ? raw.trim() : '';
  if (fromEnv && fromEnv !== 'undefined') {
    let b = fromEnv.replace(/\/$/, '');
    // Common mistake: base should be the server root (…:8001), not …:8001/api — routes already include /api/...
    if (/\/api$/i.test(b)) {
      b = b.replace(/\/api$/i, '');
    }
    // Physical Android: localhost in .env points at the phone, not your PC. Use the same LAN host Metro uses.
    if (
      typeof __DEV__ !== 'undefined' &&
      __DEV__ &&
      Platform.OS === 'android' &&
      /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(b)
    ) {
      const devHost = devMachineHostFromExpo();
      if (devHost) {
        b = b.replace(/localhost|127\.0\.0\.1/i, devHost);
      }
    }
    return b;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (Platform.OS === 'web') {
      return 'http://localhost:8001';
    }
    if (Platform.OS === 'android') {
      const devHost = devMachineHostFromExpo();
      if (devHost) return `http://${devHost}:8001`;
      return 'http://10.0.2.2:8001';
    }
    return 'http://localhost:8001';
  }

  return '';
}
