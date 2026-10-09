import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Universal Backend API Base URL Resolver
 * Resolves the correct backend URL whether running on:
 * - Physical Phone via Expo Go (LAN or Tunnel)
 * - Android Emulator (10.0.2.2)
 * - iOS Simulator / Web (localhost)
 */
export const getApiBaseUrl = (): string => {
  // 1. Explicit EXPO_PUBLIC_API_URL takes highest priority (if not localhost)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // Your PC's actual local network IP (Ethernet / Wi-Fi)
  const PC_LAN_IP = '192.168.111.16';

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
    // It cannot accept port 5000. Fall back to the PC LAN IP.
    return `http://${PC_LAN_IP}:5000/api`;
  }

  // 3. Physical Android device fallback
  if (Platform.OS === 'android') {
    return `http://${PC_LAN_IP}:5000/api`;
  }

  // 4. Default for Web / Localhost
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Universal Fetch wrapper with automatic tunnel bypass headers
 */
export const apiFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = {
    'Bypass-Tunnel-Reminder': 'true',
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
};
