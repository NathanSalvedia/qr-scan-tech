import { useState, useEffect } from 'react';

export interface AuthUser {
  id: string | number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | string;
  isActive?: boolean;
}

type Listener = () => void;

class AuthStateManager {
  private email: string = '';
  private mode: 'verification' | 'reset' = 'verification';
  private user: AuthUser | null = null;
  private token: string | null = null;
  private listeners: Set<Listener> = new Set();

  // OTP flow helpers
  setAuthTarget(email: string, mode: 'verification' | 'reset' = 'verification') {
    this.email = email.trim().toLowerCase();
    this.mode = mode;
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
    this.notify();
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

  useEffect(() => {
    const unsubscribe = authState.subscribe(() => {
      setUser(authState.getUser());
      setToken(authState.getToken());
    });
    return unsubscribe;
  }, []);

  return {
    user,
    token,
    role: user?.role?.toLowerCase() || null,
    isAdmin: user?.role?.toLowerCase() === 'admin',
    isAuthenticated: user !== null,
    logout: () => authState.logout(),
  };
}
