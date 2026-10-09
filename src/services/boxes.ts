import { authState } from './auth-state';
import { API_BASE_URL as API_URL, apiFetch } from './api-config';

export interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  status: 'OPERATIONAL' | 'FAULTY' | 'SPARE';
}

export interface ClientConnection {
  port: string;
  accountNumber: string;
  name: string;
  clientType?: 'Commercial' | 'Residential' | string;
  plan?: string;
  status: 'CONNECTED' | 'DISCONNECTED';
}

export interface DistributionBox {
  id: string;
  code: string;
  category: 'MAIN_BOX' | 'SUB_BOX';
  parentCode?: string;
  siteName: string;
  address: string;
  mountingType?: 'Utility Pole' | 'Wall Mount' | 'Cabinet';
  poleNumber?: string;
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'NEEDS_TAG' | 'ISSUE';
  totalPorts: number;
  activePorts: number;
  portsUsed?: number;
  zone?: string;
  tier?: string;
  subscriberType?: 'Commercial' | 'Residential' | string;
  clientType?: 'Commercial' | 'Residential' | string;
  opticalLoss?: string;
  temperature?: string;
  circuitBreaker?: string;
  voltage?: string;
  equipment: EquipmentItem[];
  clients: ClientConnection[];
  qrToken: string;
  lastScanned?: string;
  lastScannedBy?: string;
  lastScannedAt?: string;
  notes?: string;
}

export interface BoxesApiResponse {
  success: boolean;
  boxes?: any[];
  box?: any;
  message?: string;
}

export const boxService = {
  // 1. Get All Boxes
  getAll: async (): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to fetch boxes.' };
    }
  },

  // 2. Get Single Box
  getById: async (id: string): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to fetch box.' };
    }
  },

  // 3. Create Box
  create: async (payload: any): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to create box.' };
    }
  },

  // 4. Update Box
  update: async (id: string, payload: any): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update box.' };
    }
  },

  // 5. Assign Client to Port
  assignClient: async (
    boxId: string,
    client: { port: string; accountNumber: string; name: string; plan?: string; clientType?: string }
  ): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes/${boxId}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(client),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to assign client.' };
    }
  },

  // 6. Toggle Client Status
  toggleClientStatus: async (boxId: string, port: string): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes/${boxId}/clients/${port}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to toggle client status.' };
    }
  },

  // 7. Remove Client from Port
  removeClient: async (boxId: string, port: string): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes/${boxId}/clients/${port}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to remove client.' };
    }
  },

  // 8. Delete Box
  delete: async (id: string): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to delete box.' };
    }
  },

  // 9. Record Single QR Sticker Dispatch (When printing sticker)
  recordDispatch: async (boxId: string, stickerSize?: string): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes/${boxId}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ stickerSize }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to record QR dispatch.' };
    }
  },

  // 10. Record Batch QR Sticker Dispatch (When printing A4 sheet queue)
  recordBatchDispatch: async (boxIds: string[], batchNumber?: string): Promise<BoxesApiResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/boxes/dispatch-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ boxIds, batchNumber }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to record batch dispatch.' };
    }
  },
};
