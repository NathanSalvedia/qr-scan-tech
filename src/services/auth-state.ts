import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string | number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | string;
  isActive?: boolean;
  dutyStatus?: 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK' | string;
}

type Listener = () => void;

const STORAGE_KEYS = {
  USER: 'qr_auth_user',
  TOKEN: 'qr_auth_token',
};

class AuthStateManager {
  private email: string = '';
  private phone: string = '';
  private mode: 'verification' | 'reset' = 'verification';
  private otpType: 'sms' | 'email' = 'email';
  private confirmationResult: any = null;
  private pendingRegistration: any = null;
  private user: AuthUser | null = null;
  private token: string | null = null;
  private isHydrated: boolean = false;
  private hydrationPromise: Promise<void>;
  private listeners: Set<Listener> = new Set();

  constructor() {
    // 1. Synchronous web initialization for instant render without flash
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedToken = window.localStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedUser = window.localStorage.getItem(STORAGE_KEYS.USER);
        if (storedToken) this.token = storedToken;
        if (storedUser) this.user = JSON.parse(storedUser);
        if (storedToken && storedUser) {
          this.isHydrated = true;
        }
      } catch {
        // ignore
      }
    }

    // 2. Cross-platform AsyncStorage hydration
    this.hydrationPromise = this.initStorage();
  }

  private async initStorage(): Promise<void> {
    try {
      const [[, userVal], [, tokenVal]] = await AsyncStorage.multiGet([
        STORAGE_KEYS.USER,
        STORAGE_KEYS.TOKEN,
      ]);

      let changed = false;
      if (tokenVal && tokenVal !== this.token) {
        this.token = tokenVal;
        changed = true;
      }
      if (userVal) {
        try {
          const parsed = JSON.parse(userVal);
          if (JSON.stringify(parsed) !== JSON.stringify(this.user)) {
            this.user = parsed;
            changed = true;
          }
        } catch {
          // ignore corrupted json
        }
      }
      this.isHydrated = true;
      if (changed) {
        this.notify();
      }
    } catch {
      this.isHydrated = true;
    }
  }

  ensureHydrated(): Promise<void> {
    return this.hydrationPromise;
  }

  getIsHydrated(): boolean {
    return this.isHydrated;
  }

  // OTP flow helpers
  setAuthTarget(email: string, mode: 'verification' | 'reset' = 'verification', phone = '', otpType: 'sms' | 'email' = 'email') {
    this.email = email.trim().toLowerCase();
    this.phone = phone.trim();
    this.mode = mode;
    this.otpType = otpType;
  }

  setPendingRegistration(data: any, confirmationResult: any) {
    this.pendingRegistration = data;
    this.confirmationResult = confirmationResult;
    this.email = data.email?.trim().toLowerCase() || '';
    this.phone = data.phone?.trim() || '';
    this.mode = 'verification';
    this.otpType = 'sms';
  }

  setConfirmationResult(confirmationResult: any) {
    this.confirmationResult = confirmationResult;
  }

  clearPendingRegistration() {
    this.pendingRegistration = null;
    this.confirmationResult = null;
  }

  getPendingRegistration() {
    return this.pendingRegistration;
  }

  getConfirmationResult() {
    return this.confirmationResult;
  }

  getPhone(): string {
    return this.phone;
  }

  getOtpType(): 'sms' | 'email' {
    return this.otpType;
  }

  getEmail(): string {
    return this.email;
  }

  getMode(): 'verification' | 'reset' {
    return this.mode;
  }

  // Session & User management
  setUser(user: AuthUser | null, token?: string | null) {
    this.user = user;
    if (token !== undefined) {
      this.token = token;
    }

    // Persist session
    if (user && this.token) {
      AsyncStorage.multiSet([
        [STORAGE_KEYS.USER, JSON.stringify(user)],
        [STORAGE_KEYS.TOKEN, this.token],
      ]).catch(() => {});

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
          window.localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);
        } catch {}
      }
    } else if (!user) {
      this.clearPersisted();
    }

    this.notify();
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  getRole(): string | null {
    return this.user?.role?.toLowerCase() || null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  logout() {
    this.user = null;
    this.token = null;
    this.email = '';
    this.clearPersisted();
    this.notify();
  }

  private clearPersisted() {
    AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]).catch(() => {});
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.USER);
        window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
      } catch {}
    }
  }

  // Subscriptions for React components
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const authState = new AuthStateManager();

/**
 * React Hook to access reactive Auth State anywhere in the app
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(authState.getUser());
  const [token, setToken] = useState<string | null>(authState.getToken());
  const [isHydrated, setIsHydrated] = useState<boolean>(authState.getIsHydrated());

  useEffect(() => {
    const unsubscribe = authState.subscribe(() => {
      setUser(authState.getUser());
      setToken(authState.getToken());
      setIsHydrated(authState.getIsHydrated());
    });
    return unsubscribe;
  }, []);

  return {
    user,
    token,
    isHydrated,
    role: user?.role?.toLowerCase() || null,
    isAdmin: user?.role?.toLowerCase() === 'admin',
    isAuthenticated: user !== null,
    logout: () => authState.logout(),
  };
}
