import React, { createContext, useContext, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { playNotificationChime } from '@/services/sound';

export type AdminToastCategory =
  | 'USER_REGISTER'
  | 'SCAN'
  | 'ALARM'
  | 'INFO'
  | 'BOX_UPDATE'
  | 'TAG_AFFIXED';

export interface AdminToastData {
  id?: string;
  title: string;
  description: string;
  category: AdminToastCategory;
  timestamp?: string;
  targetBoxCode?: string;
  actorName?: string;
  duration?: number;
  onPress?: () => void;
}

interface AdminToastContextType {
  activeToast: AdminToastData | null;
  showToast: (toast: AdminToastData) => void;
  hideToast: () => void;
}

const AdminToastContext = createContext<AdminToastContextType>({
  activeToast: null,
  showToast: () => {},
  hideToast: () => {},
});

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [activeToast, setActiveToast] = useState<AdminToastData | null>(null);

  const hideToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const showToast = useCallback((toast: AdminToastData) => {
    // Audio and haptic feedback for admin alert
    playNotificationChime();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const toastWithId: AdminToastData = {
      ...toast,
      id: toast.id || `toast-${Date.now()}`,
    };

    setActiveToast(toastWithId);
  }, []);

  return (
    <AdminToastContext.Provider value={{ activeToast, showToast, hideToast }}>
      {children}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const context = useContext(AdminToastContext);
  if (!context) {
    throw new Error('useAdminToast must be used within an AdminToastProvider');
  }
  return context;
}
