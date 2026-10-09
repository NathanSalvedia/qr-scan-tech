import { authState } from './auth-state';
import { API_BASE_URL as API_URL, apiFetch } from './api-config';

export type EventCategory =
  | 'SCAN'
  | 'ALARM'
  | 'BOX_UPDATE'
  | 'PRINT'
  | 'PORT_CHANGE'
  | 'USER_REGISTER';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  relativeTime: string;
  category: EventCategory;
  actorType: 'TECHNICIAN' | 'ADMIN' | 'SYSTEM';
  actorName: string;
  actorId?: string;
  targetBoxCode: string;
  targetBoxName: string;
  title: string;
  description: string;
  deviceOrIp: string;
  gpsCoordinates?: string;
  metadata?: Record<string, string>;
}

export interface LogsApiResponse {
  success: boolean;
  logs?: AuditLogItem[];
  totalCount?: number;
  message?: string;
}

export interface RecordScanPayload {
  boxId?: string;
  boxCode?: string;
  scanType?: string;
  padlockVerified?: boolean;
  measuredSignal?: string;
  measuredTemp?: string;
  auditNotes?: string;
  photoUrl?: string;
  boxStatusAtScan?: string;
}

export interface RecentScanItem {
  id: string;
  boxId: string;
  boxCode: string;
  siteName: string;
  tier?: string;
  category: 'MAIN_BOX' | 'SUB_BOX' | string;
  status?: 'ACTIVE' | 'NEEDS_TAG' | 'ISSUE' | string;
  boxStatus: 'ACTIVE' | 'NEEDS_TAG' | 'ISSUE' | string;
  isAlarm: boolean;
  opticalLoss?: string;
  measuredSignal?: string | null;
  measuredTemp?: string | null;
  portsUsed?: number;
  totalPorts?: number;
  timeLabel?: string;
  dateGroup?: 'TODAY' | 'YESTERDAY' | 'EARLIER';
  auditNote?: string;
  padlockVerified?: boolean;
  createdAt?: string;
  timestamp: string;
  relativeTime: string;
}

export interface RecentScansResponse {
  success: boolean;
  scans?: RecentScanItem[];
  message?: string;
}

export const logsService = {
  getMyRecentScans: async (limit = 5): Promise<RecentScansResponse> => {
    try {
      const token = authState.getToken();
      const response = await apiFetch(`${API_URL}/logs/my-recent-scans?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch recent scans');
      }

      return data;
    } catch (error: any) {
      console.error('logsService.getMyRecentScans error:', error);
      return {
        success: false,
        message: error.message || 'Network error fetching recent scans',
      };
    }
  },

  getAll: async (): Promise<LogsApiResponse> => {
    try {
      const token = await authState.getToken();
      const response = await apiFetch(`${API_URL}/logs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch activity logs');
      }

      return data;
    } catch (error: any) {
      console.error('logsService.getAll error:', error);
      return {
        success: false,
        message: error.message || 'Network error fetching activity logs',
      };
    }
  },

  recordScan: async (payload: RecordScanPayload): Promise<{ success: boolean; message?: string; auditLog?: any }> => {
    try {
      const token = await authState.getToken();
      const response = await apiFetch(`${API_URL}/logs/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to record scan audit log');
      }

      return data;
    } catch (error: any) {
      console.error('logsService.recordScan error:', error);
      return {
        success: false,
        message: error.message || 'Network error recording scan audit',
      };
    }
  },
};
