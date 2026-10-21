import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authState } from './auth-state';

const STORAGE_KEY_CUSTOM_API_URL = 'qr_custom_backend_api_url';

let memoryCustomApiUrl: string | null = null;
let isStorageLoaded = false;

export const normalizeApiUrl = (rawUrl: string): string => {
  const cleaned = rawUrl.trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
};

export const loadCustomApiUrl = async (): Promise<string | null> => {
  if (isStorageLoaded) return memoryCustomApiUrl;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_API_URL);
    if (saved && saved.trim()) {
      // Automatically purge legacy temporary tunnels (Cloudflare / Localtunnel)
      if (saved.includes('trycloudflare.com') || saved.includes('loca.lt')) {
        await AsyncStorage.removeItem(STORAGE_KEY_CUSTOM_API_URL);
        memoryCustomApiUrl = null;
      } else {
        const normalized = normalizeApiUrl(saved);
        memoryCustomApiUrl = normalized;
        if (normalized !== saved) {
          await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_API_URL, normalized);
        }
      }
    }
  } catch {
    // ignore
  } finally {
    isStorageLoaded = true;
  }
  return memoryCustomApiUrl;
};

// Eager initialization on app launch
loadCustomApiUrl();

export const setCustomApiUrl = async (url: string | null): Promise<void> => {
  try {
    if (url && url.trim()) {
      const cleanUrl = normalizeApiUrl(url);
      memoryCustomApiUrl = cleanUrl;
      await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_API_URL, cleanUrl);
    } else {
      memoryCustomApiUrl = null;
      await AsyncStorage.removeItem(STORAGE_KEY_CUSTOM_API_URL);
    }
  } catch (err) {
    console.error('Error saving custom API URL:', err);
  }
};

export const getCustomApiUrl = (): string | null => {
  return memoryCustomApiUrl;
};

/**
 * Universal Backend API Base URL Resolver
 * Resolves the correct backend URL whether running on:
 * - Physical Phone via Expo Go (LAN or Tunnel)
 * - Android Emulator (10.0.2.2)
 * - iOS Simulator / Web (localhost)
 */
export const getApiBaseUrl = (): string => {
  // 0. For Web in browser on localhost: use local backend directly
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }

  // 1. Explicit EXPO_PUBLIC_API_URL takes highest priority (used by Vercel Web & Mobile)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (
    envUrl &&
    !envUrl.includes('localhost') &&
    !envUrl.includes('127.0.0.1') &&
    !envUrl.includes('trycloudflare.com') &&
    !envUrl.includes('loca.lt')
  ) {
    return normalizeApiUrl(envUrl);
  }

  // 1b. For Web in browser (LAN development or Vercel production)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLanIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    // If running on a remote production domain (such as Vercel) or HTTPS
    if (window.location.protocol === 'https:' || (!isLanIp && hostname !== 'localhost')) {
      return `${window.location.origin}/api`;
    }
    return `http://${hostname}:5000/api`;
  }

  // Default fallback URL for standalone mobile builds (Vercel Production API)
  const DEFAULT_REMOTE_URL = 'https://qr-scan-tech.vercel.app/api';

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

export const getActiveApiBaseUrl = (): string => {
  if (
    memoryCustomApiUrl &&
    !memoryCustomApiUrl.includes('trycloudflare.com') &&
    !memoryCustomApiUrl.includes('loca.lt')
  ) {
    return normalizeApiUrl(memoryCustomApiUrl);
  }
  return API_BASE_URL;
};

/**
 * Universal Fetch wrapper with automatic tunnel bypass headers and persistent auth token injection
 */
export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  await authState.ensureHydrated();
  await loadCustomApiUrl();
  const token = authState.getToken();

  const activeBase = getActiveApiBaseUrl();
  let targetUrl = url;
  if (targetUrl.includes('trycloudflare.com') || targetUrl.includes('loca.lt')) {
    targetUrl = targetUrl.replace(/https?:\/\/[^/]+(\.trycloudflare\.com|\.loca\.lt)\/api/, activeBase);
  } else if (activeBase && activeBase !== API_BASE_URL && url.startsWith(API_BASE_URL)) {
    targetUrl = url.replace(API_BASE_URL, activeBase);
  }

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

  return fetch(targetUrl, { ...options, headers: mergedHeaders });
};
