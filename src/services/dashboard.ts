import { authState } from './auth-state';
import { API_BASE_URL as API_URL, apiFetch } from './api-config';

export interface DashboardStats {
  totalBoxes: number;
  mainBoxes: number;
  subBoxes: number;
  activeCount: number;
  needsTagCount: number;
  issuesCount: number;
  verifiedPercentage: string;
  totalClients: number;
  totalPortsUsed: number;
  totalPortsCapacity: number;
  highTempAlerts: number;
  portDegraded: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  stats?: DashboardStats;
  message?: string;
}

export interface BoxData {
  id: string;
  code: string;
  category: 'MAIN_BOX' | 'SUB_BOX';
  status: 'ACTIVE' | 'NEEDS_TAG' | 'ISSUE';
  siteName: string;
  address: string;
  parentCode?: string | null;
  equipmentItems: string[];
  clientsCount: number;
  latitude: number;
  longitude: number;
  zone: string;
  tier: string;
  portsUsed: number;
  totalPorts: number;
  circuitBreaker?: string;
  voltage?: string;
  lastScannedBy?: string | null;
  lastScannedAt?: string | null;
}

export interface BoxesResponse {
  success: boolean;
  boxes?: BoxData[];
  message?: string;
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStatsResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to fetch dashboard stats',
      };
    }
  },

  getBoxes: async (): Promise<BoxesResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to fetch dashboard boxes',
      };
    }
  },
};
