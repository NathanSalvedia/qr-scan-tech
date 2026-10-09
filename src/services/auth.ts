import { authState, AuthUser } from './auth-state';
import { API_BASE_URL as API_URL, apiFetch } from './api-config';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: AuthUser;
  token?: string;
}

export const authService = {
  // 1. Sign Up (Register)
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
        message: `${err.message} (Attempted to connect to: ${API_URL})`,
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
      const data: AuthResponse = await res.json();
      if (data.success && data.user) {
        authState.setUser(data.user, data.token || null);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: `${err.message} (Attempted to connect to: ${API_URL})`,
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
  logout: () => {
    authState.logout();
  },
};
