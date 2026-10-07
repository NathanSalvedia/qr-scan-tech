import { useState, useEffect, useCallback } from 'react';
import { dashboardService, DashboardStats, BoxData } from '@/services/dashboard';

const emptyStats: DashboardStats = {
  totalBoxes: 0,
  mainBoxes: 0,
  subBoxes: 0,
  activeCount: 0,
  needsTagCount: 0,
  issuesCount: 0,
  verifiedPercentage: '0',
  totalClients: 0,
  totalPortsUsed: 0,
  totalPortsCapacity: 0,
  highTempAlerts: 0,
  portDegraded: 0,
};

const calculateStatsFromBoxes = (boxList: BoxData[]): DashboardStats => {
  const total = boxList.length;
  const active = boxList.filter((b) => b.status === 'ACTIVE').length;
  const needsTag = boxList.filter((b) => b.status === 'NEEDS_TAG').length;
  const issues = boxList.filter((b) => b.status === 'ISSUE').length;
  const mainBoxes = boxList.filter((b) => b.category === 'MAIN_BOX').length;

  return {
    totalBoxes: total,
    mainBoxes,
    subBoxes: total - mainBoxes,
    activeCount: active,
    needsTagCount: needsTag,
    issuesCount: issues,
    verifiedPercentage: total > 0 ? ((active / total) * 100).toFixed(1) : '0',
    totalClients: boxList.reduce((sum, b) => sum + (b.clientsCount || 0), 0),
    totalPortsUsed: boxList.reduce((sum, b) => sum + (b.portsUsed || 0), 0),
    totalPortsCapacity: boxList.reduce((sum, b) => sum + (b.totalPorts || 0), 0),
    highTempAlerts: 0,
    portDegraded: 0,
  };
};

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, boxesRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getBoxes(),
      ]);

      const fetchedBoxes =
        boxesRes.success && Array.isArray(boxesRes.boxes) ? boxesRes.boxes : [];
      setBoxes(fetchedBoxes);

      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      } else if (fetchedBoxes.length > 0) {
        setStats(calculateStatsFromBoxes(fetchedBoxes));
      } else {
        setStats(emptyStats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      setBoxes([]);
      setStats(emptyStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const [statsRes, boxesRes] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getBoxes(),
        ]);

        if (!isMounted) return;

        const fetchedBoxes =
          boxesRes.success && Array.isArray(boxesRes.boxes) ? boxesRes.boxes : [];
        setBoxes(fetchedBoxes);

        if (statsRes.success && statsRes.stats) {
          setStats(statsRes.stats);
        } else if (fetchedBoxes.length > 0) {
          setStats(calculateStatsFromBoxes(fetchedBoxes));
        } else {
          setStats(emptyStats);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load dashboard data');
        setBoxes([]);
        setStats(emptyStats);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    stats,
    boxes,
    loading,
    error,
    refresh,
  };
}
