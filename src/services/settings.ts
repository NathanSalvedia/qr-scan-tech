import AsyncStorage from '@react-native-async-storage/async-storage';
import { DistributionBox } from './boxes';

export interface ScannerPreferences {
  vibrateOnScan: boolean;
  autoFlashlight: boolean;
  beepOnScan: boolean;
}

const STORAGE_KEYS = {
  SCANNER_PREFERENCES: '@qr_scanner_preferences',
  TECHNICIAN_ON_DUTY: '@technician_on_duty',
  OFFLINE_BOXES: '@offline_boxes_cache',
  OFFLINE_LAST_SYNC: '@offline_last_sync_timestamp',
};

const DEFAULT_PREFERENCES: ScannerPreferences = {
  vibrateOnScan: true,
  autoFlashlight: false,
  beepOnScan: true,
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

  // 2. On Duty Status
  getOnDutyStatus: async (): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TECHNICIAN_ON_DUTY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch (e) {
      console.warn('Failed to load on-duty status:', e);
    }
    return true; // default On Duty
  },

  setOnDutyStatus: async (onDuty: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TECHNICIAN_ON_DUTY, String(onDuty));
    } catch (e) {
      console.warn('Failed to save on-duty status:', e);
    }
  },

  // 3. Offline Box Cache & Sync
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
};
