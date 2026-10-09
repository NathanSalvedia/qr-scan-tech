import { authState } from './auth-state';
import { API_BASE_URL as API_URL, apiFetch } from './api-config';

export interface ScanLogEntry {
  id: string;
  boxCode: string;
  siteName: string;
  timestamp: string;
  status: 'NORMAL' | 'ALARM' | 'MAINTENANCE_DONE';
  notes: string;
}

export interface MaintenanceAction {
  id: string;
  boxCode: string;
  action: string;
  date: string;
  status: 'RESOLVED' | 'PENDING';
}

export interface Technician {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarColor?: string;
  phone: string;
  email: string;
  dutyStatus: 'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY';
  lastBoxCode: string;
  lastBoxName: string;
  lastScanTime: string;
  todayScansCount: number;
  totalScansThisMonth: number;
  activeAlarmsCount: number;
  appVersion: string;
  deviceModel: string;
  lastBatteryLevel: string;
  scanHistory: ScanLogEntry[];
  maintenanceActions: MaintenanceAction[];
}

export interface TechniciansApiResponse {
  success: boolean;
  technicians?: Technician[];
  totalCount?: number;
  message?: string;
}

export const technicianService = {
  getAll: async (): Promise<TechniciansApiResponse> => {
    try {
      const token = await authState.getToken();
      const response = await apiFetch(`${API_URL}/technicians`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch technicians');
      }

      return data;
    } catch (error: any) {
      console.error('technicianService.getAll error:', error);
      return {
        success: false,
        message: error.message || 'Network error fetching technicians',
      };
    }
  },

  getById: async (id: string): Promise<{ success: boolean; technician?: Technician; message?: string }> => {
    try {
      const token = await authState.getToken();
      const response = await apiFetch(`${API_URL}/technicians/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch technician');
      }

      return data;
    } catch (error: any) {
      console.error('technicianService.getById error:', error);
      return {
        success: false,
        message: error.message || 'Network error fetching technician',
      };
    }
  },
};
