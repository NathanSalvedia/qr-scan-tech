import AsyncStorage from '@react-native-async-storage/async-storage';
import { DistributionBox } from './boxes';
import { authState, AuthUser } from './auth-state';
import { API_BASE_URL as API_URL, apiFetch } from './api-config';

export type BeepSoundStyle = 'tech-chirp' | 'laser-beep' | 'fiber-bell' | 'dual-chime';

export interface ScannerPreferences {
  vibrateOnScan: boolean;
  autoFlashlight: boolean;
  beepOnScan: boolean;
  beepSoundStyle: BeepSoundStyle;
}

export interface SystemSettings {
  id?: string;
  companyName: string;
  branchName: string;
  officeAddress: string;
  hotline: string;
  mobileDispatch: string;
  placardHeader: string;
  paperFormat: string;
  autoFillDuplicate: boolean;
  tokenPrefix: string;
  updatedAt?: string;
}

export interface AdminProfilePayload {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface SystemSettingsResponse {
  success: boolean;
  settings?: SystemSettings;
  message?: string;
  error?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  token?: string;
  error?: string;
}

const STORAGE_KEYS = {
  SCANNER_PREFERENCES: '@qr_scanner_preferences',
  OFFLINE_BOXES: '@offline_boxes_cache',
  OFFLINE_LAST_SYNC: '@offline_last_sync_timestamp',
  SYSTEM_SETTINGS: '@qr_system_settings_cache',
};

const DEFAULT_PREFERENCES: ScannerPreferences = {
  vibrateOnScan: true,
  autoFlashlight: false,
  beepOnScan: true,
  beepSoundStyle: 'tech-chirp',
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  companyName: 'MultiFactors Network Infrastructure',
  branchName: 'Iligan City Operations',
  officeAddress: 'Aguinaldo St, Poblacion, Iligan City, 9200',
  hotline: '(063) 221-4400',
  mobileDispatch: '+63 917 800 9000',
  placardHeader: 'MULTIFACTORS · ILIGAN',
  paperFormat: 'A4 Bondpaper (2 Placards / Sheet)',
  autoFillDuplicate: true,
  tokenPrefix: 'QRTECH-BOX-',
};

export const settingsService = {
  // 1. Scanner Preferences
  getScannerPreferences: async (): Promise<ScannerPreferences> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCANNER_PREFERENCES);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load scanner preferences:', e);
    }
    return DEFAULT_PREFERENCES;
  },

  setScannerPreferences: async (prefs: Partial<ScannerPreferences>): Promise<ScannerPreferences> => {
    try {
      const current = await settingsService.getScannerPreferences();
      const updated = { ...current, ...prefs };
      await AsyncStorage.setItem(STORAGE_KEYS.SCANNER_PREFERENCES, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Failed to save scanner preferences:', e);
      return DEFAULT_PREFERENCES;
    }
  },

  // 2. Offline Box Cache & Sync
  getOfflineBoxes: async (): Promise<DistributionBox[]> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_BOXES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load offline boxes:', e);
    }
    return [];
  },

  saveOfflineBoxes: async (boxes: DistributionBox[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_BOXES, JSON.stringify(boxes));
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_LAST_SYNC, new Date().toISOString());
    } catch (e) {
      console.warn('Failed to save offline boxes cache:', e);
    }
  },

  getLastSyncTimestamp: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_LAST_SYNC);
    } catch (e) {
      console.warn('Failed to get last sync timestamp:', e);
      return null;
    }
  },

  formatLastSyncTime: (isoString: string | null): string => {
    if (!isoString) return 'Never synced';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Never synced';

      const now = new Date();
      const todayManila = now.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(now.getDate() - 1);
      const yesterdayManila = yesterdayDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
      const syncManila = date.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });

      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
      });

      if (syncManila === todayManila) {
        return `Today, ${timeStr}`;
      } else if (syncManila === yesterdayManila) {
        return `Yesterday, ${timeStr}`;
      } else {
        const monthDay = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Manila',
        });
        return `${monthDay}, ${timeStr}`;
      }
    } catch {
      return 'Never synced';
    }
  },

  // 4. System Settings (Backend + AsyncStorage Cache)
  getSystemSettings: async (): Promise<SystemSettings> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data: SystemSettingsResponse = await res.json();
        if (data.success && data.settings) {
          await AsyncStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(data.settings));
          return data.settings;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch system settings from server, falling back to cache:', e);
    }

    // Fallback to AsyncStorage cache
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.SYSTEM_SETTINGS);
      if (cached) {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(cached) };
      }
    } catch (e) {
      console.warn('Failed to load system settings from cache:', e);
    }

    return DEFAULT_SYSTEM_SETTINGS;
  },

  updateSystemSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettingsResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settings),
      });

      const data: SystemSettingsResponse = await res.json();
      if (data.success && data.settings) {
        await AsyncStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(data.settings));
      }
      return data;
    } catch (err: any) {
      console.warn('Failed to update system settings on server:', err);
      // Save locally to AsyncStorage anyway
      try {
        const current = await settingsService.getSystemSettings();
        const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(updated));
        return {
          success: true,
          settings: updated,
          message: 'Saved to local device cache (server was unreachable).',
        };
      } catch (localErr: any) {
        return { success: false, message: localErr.message || 'Failed to save settings' };
      }
    }
  },

  resetSystemSettings: async (): Promise<SystemSettingsResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/settings/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data: SystemSettingsResponse = await res.json();
      if (data.success && data.settings) {
        await AsyncStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(data.settings));
        return data;
      }
    } catch (e) {
      console.warn('Failed to reset system settings on server:', e);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
    return {
      success: true,
      settings: DEFAULT_SYSTEM_SETTINGS,
      message: 'Reset to default settings.',
    };
  },

  // 5. Update Admin Profile & Credentials
  updateAdminProfile: async (payload: AdminProfilePayload): Promise<ProfileUpdateResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data: ProfileUpdateResponse = await res.json();
      if (data.success && data.user) {
        authState.setUser(data.user, data.token || token);
      }
      return data;
    } catch (err: any) {
      console.warn('Failed to update admin profile:', err);
      return { success: false, message: err.message || 'Failed to update admin profile' };
    }
  },
};
