import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { logsService, AuditLogItem } from '@/services/logs';
import { useAdminToast, AdminToastCategory } from '@/context/admin-toast-context';

const POLL_INTERVAL_MS = 3500; // 3.5 seconds for snappy real-time admin notifications

export function useAdminLogWatcher() {
  const { showToast } = useAdminToast();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const processNewLogs = useCallback(
    (newLogs: AuditLogItem[]) => {
      // Find candidate logs that haven't been shown yet
      const unnotified = newLogs.filter((log) => !seenIdsRef.current.has(log.id));

      if (unnotified.length === 0) return;

      // Always mark all unnotified as seen to avoid duplicate toasts
      unnotified.forEach((log) => seenIdsRef.current.add(log.id));

      // Filter specifically for the target categories:
      // 1. User signs up an account ('USER_REGISTER')
      // 2. Boxes scanned ('SCAN' / 'ALARM')
      // 3. Physical QR placard affixing / Box activation ('BOX_UPDATE')
      // 4. Drop cable port activation ('PORT_CHANGE')
      const targetLogs = unnotified.filter(
        (log) =>
          log.category === 'USER_REGISTER' ||
          log.category === 'SCAN' ||
          log.category === 'ALARM' ||
          log.category === 'BOX_UPDATE' ||
          log.category === 'PORT_CHANGE'
      );

      if (targetLogs.length === 0) return;

      // Show the most recent event toast (or up to 2 if multiple arrived at once)
      const toShow = targetLogs.slice(0, 2);

      toShow.forEach((log, index) => {
        setTimeout(() => {
          let category: AdminToastCategory = 'INFO';
          if (log.category === 'USER_REGISTER') {
            category = 'USER_REGISTER';
          } else if (log.title.includes('Tagged') || log.title.includes('Placard')) {
            category = 'TAG_AFFIXED';
          } else if (log.category === 'SCAN') {
            category = 'SCAN';
          } else if (log.category === 'ALARM') {
            category = 'ALARM';
          } else if (log.category === 'BOX_UPDATE' || log.category === 'PORT_CHANGE') {
            category = 'BOX_UPDATE';
          }

          showToast({
            id: log.id,
            title: log.title,
            description: log.description,
            category,
            timestamp: log.relativeTime || 'Just now',
            targetBoxCode: log.targetBoxCode,
            actorName: log.actorName,
          });
        }, index * 4800);
      });
    },
    [showToast]
  );

  const fetchLogs = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      const res = await logsService.getAll();

      if (res.success && Array.isArray(res.logs)) {
        if (!isInitializedRef.current) {
          // Initial baseline: mark existing logs so we don't spam toasts for old history
          res.logs.forEach((log) => seenIdsRef.current.add(log.id));
          isInitializedRef.current = true;
        } else {
          // Process any new entries since last check
          processNewLogs(res.logs);
        }
      }
    } catch (err) {
      console.debug('useAdminLogWatcher fetch error:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [processNewLogs]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    // Run baseline check immediately on mount
    fetchLogs();

    // Start polling interval
    timer = setInterval(fetchLogs, POLL_INTERVAL_MS);

    // Also trigger on app foreground / window focus
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          fetchLogs();
        }
      }
    );

    return () => {
      if (timer) clearInterval(timer);
      subscription.remove();
    };
  }, [fetchLogs]);

  return { refreshWatcher: fetchLogs };
}
