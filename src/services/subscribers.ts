import { authState } from './auth-state';
import { API_BASE_URL as API_URL, apiFetch } from './api-config';

export interface SubscriberRecord {
  id?: string;
  accountNumber: string;
  customerName: string;
  name: string;
  subscriberType: 'Residential' | 'Commercial' | string;
  category: 'Residential' | 'Commercial' | string;
  servicePlan: string;
  plan: string;
  contactNumber?: string;
  address?: string;
  status: 'PENDING_PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'DISCONNECTED' | string;
  assignedBoxId?: string;
  assignedPort?: string;
}

export interface NextAccountResponse {
  success: boolean;
  accountNumber?: string;
  format?: string;
  message?: string;
}

export interface LookupSubscriberResponse {
  success: boolean;
  matched: boolean;
  subscriber?: SubscriberRecord;
  message?: string;
}

export interface SubscribersListResponse {
  success: boolean;
  subscribers?: SubscriberRecord[];
  message?: string;
}

export const subscriberService = {
  // 1. Get next dynamic 10-digit account number (atomic sequence + Luhn checksum)
  getNextAccountNumber: async (): Promise<NextAccountResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/subscribers/next-account`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch {
      // Local fallback in case network is down
      const fallbackSeq = (Date.now() % 90000) + 10000;
      const partial = `2608${String(fallbackSeq).padStart(5, '0')}`;
      let sum = 0;
      let alt = true;
      for (let i = partial.length - 1; i >= 0; i--) {
        let n = parseInt(partial[i], 10);
        if (alt) {
          n *= 2;
          if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return {
        success: true,
        accountNumber: `${partial}${checkDigit}`,
      };
    }
  },

  // 2. Lookup subscriber by 10-digit account number
  lookupSubscriber: async (accountNumber: string): Promise<LookupSubscriberResponse> => {
    try {
      const token = authState.getToken();
      const cleanAcc = accountNumber.trim();
      const res = await apiFetch(`${API_URL}/subscribers/lookup/${encodeURIComponent(cleanAcc)}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, matched: false, message: err.message || 'Lookup failed' };
    }
  },

  // 3. List subscribers directory
  getAllSubscribers: async (search?: string, status?: string): Promise<SubscribersListResponse> => {
    try {
      const token = authState.getToken();
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (status) queryParams.append('status', status);

      const url = `${API_URL}/subscribers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const res = await apiFetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, subscribers: [], message: err.message || 'Failed to fetch directory' };
    }
  },

  // 4. Create / Queue a Pending Subscriber Work Order for Field Technicians
  createSubscriber: async (payload: {
    accountNumber: string;
    customerName: string;
    subscriberType: string;
    servicePlan: string;
    contactNumber?: string;
    address?: string;
  }): Promise<{ success: boolean; subscriber?: SubscriberRecord; message?: string }> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to queue subscriber work order' };
    }
  },
};
