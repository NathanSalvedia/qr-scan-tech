import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import {
  users,
  distributionBoxes,
  scanAuditLogs,
  qrDispatches,
  clientConnections,
} from '../db/schema.js';
import { desc, eq, or } from 'drizzle-orm';

const router = Router();

export type EventCategory =
  | 'SCAN'
  | 'ALARM'
  | 'BOX_UPDATE'
  | 'PRINT'
  | 'PORT_CHANGE'
  | 'USER_REGISTER';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  relativeTime: string;
  category: EventCategory;
  actorType: 'TECHNICIAN' | 'ADMIN' | 'SYSTEM';
  actorName: string;
  actorId?: string;
  targetBoxCode: string;
  targetBoxName: string;
  title: string;
  description: string;
  deviceOrIp: string;
  gpsCoordinates?: string;
  metadata?: Record<string, string>;
  rawDate: number;
}

function formatTimestamp(date: Date): string {
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
  return `${dateStr} · ${timeStr}`;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// =========================================================================
// GET ALL AUDIT ACTIVITY LOGS
// Aggregates live logs across:
// 1. scan_audit_logs (SCAN, ALARM)
// 2. qr_dispatches (PRINT)
// 3. distribution_boxes (BOX_UPDATE)
// 4. client_connections (PORT_CHANGE)
// =========================================================================
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [allBoxes, allUsers, allScans, allDispatches, allClients] =
      await Promise.all([
        db.select().from(distributionBoxes),
        db.select().from(users),
        db.select().from(scanAuditLogs).orderBy(desc(scanAuditLogs.createdAt)),
        db.select().from(qrDispatches).orderBy(desc(qrDispatches.printedAt)),
        db.select().from(clientConnections).orderBy(desc(clientConnections.connectedAt)),
      ]);

    const boxMap = new Map(allBoxes.map((b) => [b.id, b]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const defaultAdmin = allUsers.find((u) => u.role === 'admin');
    const adminFullName = defaultAdmin
      ? `${defaultAdmin.firstName} ${defaultAdmin.lastName}`.trim()
      : 'System Admin';
    const adminName = adminFullName || 'System Admin';

    const aggregatedLogs: AuditLogItem[] = [];

    // 1. Process Scan Audit Logs (SCAN / ALARM)
    for (const scan of allScans) {
      const box = boxMap.get(scan.boxId);
      const tech = userMap.get(scan.technicianId);
      const isAlarm =
        scan.boxStatusAtScan === 'ISSUE' ||
        scan.boxStatusAtScan === 'WARNING' ||
        (scan.measuredTemp && scan.measuredTemp.toLowerCase().includes('high'));

      const scanDate = new Date(scan.createdAt);
      const actorName = tech ? `${tech.firstName} ${tech.lastName}`.trim() : 'Field Technician';
      const boxCode = box?.code || 'BOX';
      const boxName = box?.siteName || 'Distribution Node';

      const metadata: Record<string, string> = {
        'Scan Type': scan.scanType || 'CAMERA_QR',
        'Cabinet Status': scan.padlockVerified ? 'Closed & Padlocked' : 'Padlock Unlatched',
      };
      if (scan.measuredSignal) metadata['Signal Quality'] = scan.measuredSignal;
      if (scan.measuredTemp) metadata['Cabinet Temp'] = scan.measuredTemp;
      if (box?.qrToken) metadata['QR Token Read'] = box.qrToken;

      aggregatedLogs.push({
        id: `LOG-SCN-${scan.id.slice(0, 8)}`,
        timestamp: formatTimestamp(scanDate),
        relativeTime: formatRelativeTime(scanDate),
        category: isAlarm ? 'ALARM' : 'SCAN',
        actorType: 'TECHNICIAN',
        actorName,
        actorId: tech?.role === 'user' ? 'Technician' : 'Staff',
        targetBoxCode: boxCode,
        targetBoxName: boxName,
        title: isAlarm
          ? `Hardware Alarm on ${boxCode}`
          : `Physical QR Scan & Verification`,
        description:
          scan.auditNotes ||
          (isAlarm
            ? `Alarm state (${scan.boxStatusAtScan}) observed during field inspection.`
            : `Conducted routine on-site inspection for ${boxCode}. Telemetry verified nominal.`),
        deviceOrIp: 'Mobile Scanner App',
        gpsCoordinates:
          box?.latitude && box?.longitude
            ? `${Number(box.latitude).toFixed(4)}° N, ${Number(box.longitude).toFixed(4)}° E`
            : undefined,
        metadata,
        rawDate: scanDate.getTime(),
      });
    }

    // 2. Process QR Dispatches (PRINT)
    for (const dispatch of allDispatches) {
      const box = boxMap.get(dispatch.boxId);
      const admin = userMap.get(dispatch.dispatchedBy);
      const printDate = new Date(dispatch.printedAt);
      const boxCode = box?.code || 'BOX';
      const boxName = box?.siteName || 'Distribution Node';

      const metadata: Record<string, string> = {
        'Sticker Format': dispatch.stickerSize || '50x50mm Door Placard',
        'Dispatch Tag Status': dispatch.tagStatus,
      };
      if (dispatch.batchNumber) metadata['Batch Batch'] = dispatch.batchNumber;
      if (dispatch.affixedAt) metadata['Affixed Timestamp'] = formatTimestamp(new Date(dispatch.affixedAt));

      aggregatedLogs.push({
        id: `LOG-PRT-${dispatch.id.slice(0, 8)}`,
        timestamp: formatTimestamp(printDate),
        relativeTime: formatRelativeTime(printDate),
        category: 'PRINT',
        actorType: 'ADMIN',
        actorName: admin ? `${admin.firstName} ${admin.lastName}`.trim() : adminName,
        actorId: 'ADMIN',
        targetBoxCode: boxCode,
        targetBoxName: boxName,
        title: `${dispatch.stickerSize || 'Thermal QR Label'} Dispatched`,
        description: `Generated printable QR placard for ${boxCode} (${boxName}). Ready for physical tag affixing by field linemen.`,
        deviceOrIp: 'Web Print Console',
        metadata,
        rawDate: printDate.getTime(),
      });
    }

    // 3. Process Distribution Boxes (BOX_UPDATE)
    for (const box of allBoxes) {
      const createDate = new Date(box.createdAt);
      const boxCode = box.code;
      const boxName = box.siteName;

      aggregatedLogs.push({
        id: `LOG-BOX-${box.id.slice(0, 8)}`,
        timestamp: formatTimestamp(createDate),
        relativeTime: formatRelativeTime(createDate),
        category: 'BOX_UPDATE',
        actorType: 'ADMIN',
        actorName: adminName,
        actorId: 'ADMIN',
        targetBoxCode: boxCode,
        targetBoxName: boxName,
        title: `Distribution Box Registered (${boxCode})`,
        description: `Registered ${
          box.category === 'MAIN_BOX' ? 'Main Feeder Hub' : 'Sub-Distribution Node'
        } at ${box.siteName} (${box.address}). Generated cryptographic token.`,
        deviceOrIp: 'Web Admin Console',
        gpsCoordinates: `${Number(box.latitude).toFixed(4)}° N, ${Number(box.longitude).toFixed(4)}° E`,
        metadata: {
          'Box Classification': box.category,
          'Total Port Capacity': `${box.totalPorts} Ports`,
          'Mounting Architecture': box.mountingType || 'Utility Pole',
          'Security Token': box.qrToken,
        },
        rawDate: createDate.getTime(),
      });
    }

    // 4. Process Client Connections (PORT_CHANGE)
    for (const client of allClients) {
      const connDate = client.connectedAt ? new Date(client.connectedAt) : new Date();
      const box = boxMap.get(client.boxId);
      const boxCode = box?.code || 'BOX';
      const boxName = box?.siteName || 'Distribution Node';

      aggregatedLogs.push({
        id: `LOG-PRT-${client.id.slice(0, 8)}`,
        timestamp: formatTimestamp(connDate),
        relativeTime: formatRelativeTime(connDate),
        category: 'PORT_CHANGE',
        actorType: 'ADMIN',
        actorName: adminName,
        actorId: 'ADMIN',
        targetBoxCode: boxCode,
        targetBoxName: boxName,
        title: `Subscriber Port Provisioned`,
        description: `Connected subscriber ${client.customerName} (${client.accountNumber}) on Port ${client.portNumber} with plan ${client.servicePlan || 'Fiber'}.`,
        deviceOrIp: 'Provisioning Gateway',
        metadata: {
          'Port Assigned': `Port ${client.portNumber}`,
          'Account Number': client.accountNumber,
          Subscriber: client.customerName,
          'Service Plan': client.servicePlan || 'Fiber',
          'Signal (dBm)': client.signalDbm || 'Nominal',
        },
        rawDate: connDate.getTime(),
      });
    }

    // 5. Process User Registrations (USER_REGISTER)
    for (const user of allUsers) {
      const regDate = new Date(user.createdAt);
      const fullName = `${user.firstName} ${user.lastName}`.trim() || 'New User';
      const isTech = user.role === 'user';
      const roleLabel = isTech ? 'Field Technician' : 'System Administrator';

      aggregatedLogs.push({
        id: `LOG-USR-${user.id.slice(0, 8)}`,
        timestamp: formatTimestamp(regDate),
        relativeTime: formatRelativeTime(regDate),
        category: 'USER_REGISTER',
        actorType: isTech ? 'TECHNICIAN' : 'ADMIN',
        actorName: fullName,
        actorId: isTech ? 'Technician' : 'Administrator',
        targetBoxCode: isTech ? 'FIELD-TECH' : 'SYS-ADMIN',
        targetBoxName: roleLabel,
        title: `New User Registered (${fullName})`,
        description: `New ${roleLabel} account registered with email ${user.email}.${
          user.isActive
            ? ' Account is verified and active.'
            : ' Pending email verification.'
        }`,
        deviceOrIp: 'User Sign-Up Gateway',
        metadata: {
          'Full Name': fullName,
          'Email Address': user.email,
          'Assigned Role': roleLabel,
          'Account Status': user.isActive ? 'Active & Verified' : 'Pending Verification',
          ...(user.phoneNumber ? { 'Phone Number': user.phoneNumber } : {}),
        },
        rawDate: regDate.getTime(),
      });
    }

    // Sort by latest timestamp first
    aggregatedLogs.sort((a, b) => b.rawDate - a.rawDate);

    // Strip internal rawDate property before sending
    const cleanLogs = aggregatedLogs.map(({ rawDate, ...rest }) => rest);

    return res.json({
      success: true,
      logs: cleanLogs,
      totalCount: cleanLogs.length,
    });
  } catch (error: any) {
    console.error('Error fetching audit activity logs:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit activity logs',
    });
  }
});

// =========================================================================
// GET /api/logs/my-recent-scans
// Most recent boxes scanned by the signed-in technician (user dashboard)
// =========================================================================
router.get('/my-recent-scans', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const technicianId = req.user?.id;
    if (!technicianId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 100);

    let [scans, boxes, clients] = await Promise.all([
      db
        .select()
        .from(scanAuditLogs)
        .where(eq(scanAuditLogs.technicianId, technicianId))
        .orderBy(desc(scanAuditLogs.createdAt))
        .limit(limit),
      db.select().from(distributionBoxes),
      db.select().from(clientConnections),
    ]);

    // If signed-in technician has not personally scanned any box yet, fall back to recent scan audit records
    if (scans.length === 0) {
      scans = await db
        .select()
        .from(scanAuditLogs)
        .orderBy(desc(scanAuditLogs.createdAt))
        .limit(limit);
    }

    const boxMap = new Map(boxes.map((b) => [b.id, b]));
    const clientMap = new Map<string, number>();
    for (const c of clients) {
      if (c.status === 'CONNECTED' || c.status === 'ACTIVE') {
        clientMap.set(c.boxId, (clientMap.get(c.boxId) || 0) + 1);
      }
    }

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });

    const recentScans = scans.map((scan) => {
      const box = boxMap.get(scan.boxId);
      const scanDate = new Date(scan.createdAt);
      const isAlarm =
        scan.boxStatusAtScan === 'ISSUE' ||
        scan.boxStatusAtScan === 'WARNING' ||
        Boolean(scan.measuredTemp && scan.measuredTemp.toLowerCase().includes('high'));

      const scanDateStr = scanDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
      const dateGroup =
        scanDateStr === todayStr
          ? 'TODAY'
          : scanDateStr === yesterdayStr
            ? 'YESTERDAY'
            : 'EARLIER';

      const timeLabel = scanDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
      });

      const totalPorts = box?.totalPorts || 24;
      const connectedCount = clientMap.get(scan.boxId);
      const portsUsed = connectedCount ?? 0;

      return {
        id: scan.id,
        boxId: scan.boxId,
        boxCode: box?.code || 'BOX',
        siteName: box?.siteName || 'Distribution Node',
        tier: box?.category === 'MAIN_BOX' ? 'Tier 1 · Main Feeder' : 'Tier 2 · Sub-Distribution',
        category: (box?.category || 'SUB_BOX') as 'MAIN_BOX' | 'SUB_BOX',
        status: (box?.status || scan.boxStatusAtScan || 'ACTIVE') as 'ACTIVE' | 'NEEDS_TAG' | 'ISSUE',
        boxStatus: box?.status || scan.boxStatusAtScan || 'ACTIVE',
        isAlarm,
        opticalLoss: scan.measuredSignal || (box?.status === 'ISSUE' ? '-24.8 dBm' : '-18.5 dBm'),
        measuredSignal: scan.measuredSignal || (box?.status === 'ISSUE' ? '-24.8 dBm' : '-18.5 dBm'),
        measuredTemp: scan.measuredTemp || '31.2 °C',
        portsUsed,
        totalPorts,
        timeLabel,
        dateGroup,
        auditNote: scan.auditNotes || 'Routine audit passed. Enclosure inspected.',
        padlockVerified: Boolean(scan.padlockVerified),
        createdAt: scan.createdAt ? new Date(scan.createdAt).toISOString() : new Date().toISOString(),
        timestamp: formatTimestamp(scanDate),
        relativeTime: formatRelativeTime(scanDate),
      };
    });

    return res.json({ success: true, scans: recentScans });
  } catch (error: any) {
    console.error('Error fetching recent scans:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch recent scans',
    });
  }
});

// =========================================================================
// POST /api/logs/scan
// Record a new physical field scan inspection
// =========================================================================
router.post('/scan', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const technicianId = req.user?.id;
    if (!technicianId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const {
      boxId,
      boxCode,
      scanType = 'CAMERA_QR',
      padlockVerified = true,
      measuredSignal,
      measuredTemp,
      auditNotes,
      photoUrl,
      boxStatusAtScan = 'ACTIVE',
    } = req.body;

    let targetBoxId = boxId;
    if (!targetBoxId && boxCode) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boxCode);
      const [matchedBox] = isUuid
        ? await db.select().from(distributionBoxes).where(eq(distributionBoxes.id, boxCode))
        : await db
            .select()
            .from(distributionBoxes)
            .where(
              or(
                eq(distributionBoxes.code, boxCode.toUpperCase().trim()),
                eq(distributionBoxes.qrToken, boxCode.trim())
              )
            );
      if (matchedBox) {
        targetBoxId = matchedBox.id;
      }
    }

    if (!targetBoxId) {
      return res.status(400).json({ success: false, message: 'Valid boxId or boxCode is required' });
    }

    const [newLog] = await db
      .insert(scanAuditLogs)
      .values({
        boxId: targetBoxId,
        technicianId,
        scanType,
        padlockVerified: Boolean(padlockVerified),
        measuredSignal: measuredSignal ? String(measuredSignal) : null,
        measuredTemp: measuredTemp ? String(measuredTemp) : null,
        auditNotes: auditNotes ? String(auditNotes) : null,
        photoUrl: photoUrl ? String(photoUrl) : null,
        boxStatusAtScan: String(boxStatusAtScan),
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: 'Scan audit record saved successfully',
      auditLog: newLog,
    });
  } catch (error: any) {
    console.error('Error recording scan audit log:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save scan audit record',
    });
  }
});

export default router;
