import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { users, distributionBoxes, scanAuditLogs } from '../db/schema.js';
import { eq, ne, desc, and } from 'drizzle-orm';

const router = Router();

const AVATAR_COLORS = [
  'bg-[#4d6029]',
  'bg-sky-700',
  'bg-emerald-700',
  'bg-indigo-700',
  'bg-teal-700',
  'bg-amber-700',
  'bg-rose-700',
  'bg-slate-700',
];

const ROLES_POOL = [
  'Field Optical Technician',
  'Senior Maintenance Lineman',
  'Field Network Specialist',
  'Optical Fiber Splicer',
  'Emergency Dispatch Lineman',
  'Field QA & Compliance Specialist',
  'Network Infrastructure Technician',
];

function formatScanTime(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }) + ` · ${timeStr}`;
}

// =========================================================================
// GET ALL TECHNICIANS (Excludes Admins)
// =========================================================================
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Fetch only users who are NOT admin (role = 'user')
    const rawTechnicians = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(ne(users.role, 'admin'))
      .orderBy(users.createdAt);

    // 2. Fetch all scan audit logs & boxes to build dynamic activity
    const allAudits = await db
      .select()
      .from(scanAuditLogs)
      .orderBy(desc(scanAuditLogs.createdAt));

    const allBoxes = await db.select().from(distributionBoxes);
    const boxMap = new Map(allBoxes.map((b) => [b.id, b]));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // 3. Map each technician to full frontend schema
    const technicians = rawTechnicians.map((user, index) => {
      const techAudits = allAudits.filter((a) => a.technicianId === user.id);
      const latestAudit = techAudits[0] || null;

      let lastBoxCode = 'None';
      let lastBoxName = 'No boxes scanned yet';
      let lastScanTime = 'No recent activity';

      if (latestAudit) {
        const box = boxMap.get(latestAudit.boxId);
        lastBoxCode = box?.code || 'N/A';
        lastBoxName = box?.siteName || 'Scanned Node';
        lastScanTime = formatScanTime(new Date(latestAudit.createdAt));
      }

      // Count metrics
      const todayScansCount = techAudits.filter(
        (a) => new Date(a.createdAt).getTime() >= startOfToday
      ).length;

      const totalScansThisMonth = techAudits.filter(
        (a) => new Date(a.createdAt).getTime() >= startOfMonth
      ).length;

      const activeAlarmsCount = techAudits.filter(
        (a) => a.boxStatusAtScan === 'ISSUE' || a.boxStatusAtScan === 'WARNING'
      ).length;

      // Scan history logs
      const scanHistory = techAudits.slice(0, 15).map((audit) => {
        const box = boxMap.get(audit.boxId);
        return {
          id: audit.id,
          boxCode: box?.code || 'BOX',
          siteName: box?.siteName || 'Enclosure Node',
          timestamp: formatScanTime(new Date(audit.createdAt)),
          status:
            audit.boxStatusAtScan === 'ISSUE'
              ? ('ALARM' as const)
              : audit.boxStatusAtScan === 'MAINTENANCE'
              ? ('MAINTENANCE_DONE' as const)
              : ('NORMAL' as const),
          notes:
            audit.auditNotes ||
            `Physical inspection performed. Padlock verified: ${
              audit.padlockVerified ? 'Yes' : 'No'
            }. Signal: ${audit.measuredSignal || 'Nominal'}.`,
        };
      });

      const dutyStatus: 'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY' = !user.isActive
        ? 'OFF_DUTY'
        : 'ON_DUTY';

      return {
        id: user.id,
        employeeId: `TECH-ILG-${(index + 1).toString().padStart(2, '0')}`,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: ROLES_POOL[index % ROLES_POOL.length],
        avatarBg: AVATAR_COLORS[index % AVATAR_COLORS.length],
        phone: user.phoneNumber || '+63 917 000 0000',
        email: user.email,
        dutyStatus,
        lastBoxCode,
        lastBoxName,
        lastScanTime,
        todayScansCount,
        totalScansThisMonth,
        activeAlarmsCount,
        appVersion: 'v2.4.0 (Build 58)',
        deviceModel: 'Mobile Scanner',
        lastBatteryLevel: user.isActive ? '88%' : '—',
        scanHistory,
        maintenanceActions: [],
      };
    });

    return res.json({
      success: true,
      technicians,
      totalCount: technicians.length,
    });
  } catch (error: any) {
    console.error('Error fetching technicians:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch technicians',
    });
  }
});

// =========================================================================
// GET SINGLE TECHNICIAN BY ID
// =========================================================================
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, id), ne(users.role, 'admin')));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found',
      });
    }

    const techAudits = await db
      .select()
      .from(scanAuditLogs)
      .where(eq(scanAuditLogs.technicianId, user.id))
      .orderBy(desc(scanAuditLogs.createdAt));

    const allBoxes = await db.select().from(distributionBoxes);
    const boxMap = new Map(allBoxes.map((b) => [b.id, b]));

    const scanHistory = techAudits.map((audit) => {
      const box = boxMap.get(audit.boxId);
      return {
        id: audit.id,
        boxCode: box?.code || 'BOX',
        siteName: box?.siteName || 'Enclosure Node',
        timestamp: formatScanTime(new Date(audit.createdAt)),
        status:
          audit.boxStatusAtScan === 'ISSUE'
            ? ('ALARM' as const)
            : ('NORMAL' as const),
        notes: audit.auditNotes || 'Routine physical inspection.',
      };
    });

    return res.json({
      success: true,
      technician: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phoneNumber || '+63 917 000 0000',
        isActive: user.isActive,
        dutyStatus: user.isActive ? 'ON_DUTY' : 'OFF_DUTY',
        scanHistory,
      },
    });
  } catch (error: any) {
    console.error('Error fetching technician detail:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch technician detail',
    });
  }
});

export default router;
