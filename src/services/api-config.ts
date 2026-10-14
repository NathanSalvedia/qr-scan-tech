import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { authState } from './auth-state';

/**
 * Universal Backend API Base URL Resolver
 * Resolves the correct backend URL whether running on:
 * - Physical Phone via Expo Go (LAN or Tunnel)
 * - Android Emulator (10.0.2.2)
 * - iOS Simulator / Web (localhost)
 */
export const getApiBaseUrl = (): string => {
  // 0. For Web in browser: use localhost for local development or match hostname
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return `http://${hostname}:5000/api`;
  }

  // 1. Explicit EXPO_PUBLIC_API_URL takes highest priority (if not localhost)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // Default fallback URL for standalone mobile builds (HTTPS tunnel)
  const DEFAULT_REMOTE_URL = 'https://qr-scan-tech-api.loca.lt/api';

  // 2. Automatically resolve host machine IP from Expo bundler
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const isTunnel =
      hostUri.includes('exp.direct') ||
      hostUri.includes('ngrok') ||
      hostUri.includes('.tunnel.');

    // If NOT tunnel (i.e. normal LAN mode), hostUri has the exact PC IP
    if (!isTunnel) {
      const hostIp = hostUri.split(':')[0];
      return `http://${hostIp}:5000/api`;
    }

    // In TUNNEL mode: hostUri is an ngrok tunnel forwarding ONLY Metro (8081).
    return DEFAULT_REMOTE_URL;
  }

  // 3. Physical Android device fallback (Standalone APK)
  if (Platform.OS === 'android') {
    return DEFAULT_REMOTE_URL;
  }

  // 4. Default for Web / Localhost
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Universal Fetch wrapper with automatic tunnel bypass headers and persistent auth token injection
 */
export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  await authState.ensureHydrated();
  const token = authState.getToken();

  const customHeaders: Record<string, string> = {
    'Bypass-Tunnel-Reminder': 'true',
  };

  const optionHeaders = (options.headers || {}) as Record<string, string>;
  const hasAuth = Object.keys(optionHeaders).some((k) => k.toLowerCase() === 'authorization');

  if (token && !hasAuth) {
    customHeaders['Authorization'] = `Bearer ${token}`;
  }

  const mergedHeaders = {
    ...customHeaders,
    ...optionHeaders,
  };

  return fetch(url, { ...options, headers: mergedHeaders });
};
