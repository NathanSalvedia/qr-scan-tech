import { authState, AuthUser } from './auth-state';
import { API_BASE_URL as API_URL, apiFetch, getActiveApiBaseUrl } from './api-config';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface RegisterWithPhonePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  idToken: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: AuthUser;
  token?: string;
}

export const authService = {
  // Pre-check if email or phone is already taken before submitting
  checkAvailability: async (
    email?: string,
    phone?: string
  ): Promise<{ success: boolean; message?: string; field?: 'email' | 'phone' }> => {
    try {
      const res = await apiFetch(`${API_URL}/auth/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });
      return await res.json();
    } catch {
      return { success: true };
    }
  },

  // 1. Sign Up (Register with Phone)
  registerWithPhone: async (payload: RegisterWithPhonePayload): Promise<AuthResponse> => {
    try {
      const res = await apiFetch(`${API_URL}/auth/register-with-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.user) {
        authState.setUser(data.user, data.token || null);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to complete phone registration.',
      };
    }
  },

  // 1b. Legacy Register (Email OTP)
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {

    try {
      const res = await apiFetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        message: `${err.message} (Attempted to connect to: ${getActiveApiBaseUrl()})`,
      };
    }
  },

  // 2. Verify 6-digit OTP
  verifyOtp: async (email: string, otpCode: string, mode: 'verification' | 'reset' = 'verification'): Promise<AuthResponse> => {
    try {
      const res = await apiFetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode, mode }),
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.user) {
        authState.setUser(data.user, data.token || null);
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Network request failed' };
    }
  },

  // 3. Resend OTP
  resendOtp: async (email: string, mode: 'verification' | 'reset' = 'verification'): Promise<AuthResponse> => {
    try {
      const res = await apiFetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mode }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network request failed' };
    }
  },

  // 4. Sign In (Login)
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await apiFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      let data: AuthResponse;
      try {
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          message: `Server returned an unexpected response (Status: ${res.status}). Please verify your backend server and tunnel are active. (Attempted to connect to: ${getActiveApiBaseUrl()})`,
        };
      }
      if (data.success && data.user) {
        authState.setUser(data.user, data.token || null);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: `${err.message} (Attempted to connect to: ${getActiveApiBaseUrl()})`,
      };
    }
  },

  // 5. Forgot Password (Request OTP)
  forgotPassword: async (email: string): Promise<AuthResponse> => {
    try {
      const res = await apiFetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network request failed' };
    }
  },

  // 6. Reset Password
  resetPassword: async (email: string, newPassword: string, otpCode?: string): Promise<AuthResponse> => {
    try {
      const res = await apiFetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, otpCode }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network request failed' };
    }
  },

  // 7. Change Password (Authenticated session)
  changePassword: async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    try {
      const token = authState.getToken();
      const res = await apiFetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Network request failed' };
    }
  },

  // 8. Logout
  logout: async (currentUser?: AuthUser | null): Promise<void> => {
    try {
      await authState.ensureHydrated();
      const token = authState.getToken();
      const user = currentUser || authState.getUser();

      await apiFetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
        }),
      }).catch((err) => {
        console.warn('Failed to notify backend on logout:', err);
      });
    } catch (err) {
      console.warn('Logout network error:', err);
    } finally {
      authState.logout();
    }
  },
};
