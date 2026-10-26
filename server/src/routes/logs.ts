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
  actorType: 'TECHNICIAN' | 'USER' | 'ADMIN' | 'SYSTEM';
  actorName: string;
  actorId?: string;
  targetBoxCode: string;
  targetBoxName: string;
  title: string;
  description: string;
  deviceOrIp: string;
  gpsCoordinates?: string;
  distanceMeters?: number | null;
  locationVerified?: boolean;
  scanLatitude?: string | null;
  scanLongitude?: string | null;
  metadata?: Record<string, string>;
  rawDate: number;
}

function computeDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistanceLabel(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
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

async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      }
    }
  }
  throw lastError;
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
      await withDbRetry(() =>
        Promise.all([
          db.select().from(distributionBoxes),
          db.select().from(users),
          db.select().from(scanAuditLogs).orderBy(desc(scanAuditLogs.createdAt)),
          db.select().from(qrDispatches).orderBy(desc(qrDispatches.printedAt)),
          db.select().from(clientConnections).orderBy(desc(clientConnections.connectedAt)),
        ])
      );

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
      const scanDate = new Date(scan.createdAt);
      const actorName = tech ? `${tech.firstName} ${tech.lastName}`.trim() : 'Field Technician';
      const boxCode = box?.code || 'BOX';
      const boxName = box?.siteName || 'Distribution Node';

      const isAlarm =
        scan.boxStatusAtScan === 'ISSUE' ||
        scan.boxStatusAtScan === 'WARNING';
      const isTagAffixed = scan.scanType === 'TAG_AFFIXED';
      const isUntaggedInspect = scan.scanType === 'UNTAGGED_INSPECT';

      let logTitle = isAlarm
        ? `Hardware Alarm on ${boxCode}`
        : `Physical QR Scan & Verification`;
      let logCategory: EventCategory = isAlarm ? 'ALARM' : 'SCAN';

      if (isTagAffixed) {
        logTitle = `Box Tagged & Activated (${boxCode})`;
        logCategory = 'BOX_UPDATE';
      } else if (isUntaggedInspect) {
        logTitle = `Physical QR Placard Detected (${boxCode})`;
        logCategory = 'SCAN';
      }

      const metadata: Record<string, string> = {
        'Scan Type': scan.scanType || 'CAMERA_QR',
        'Cabinet Status': scan.padlockVerified ? 'Closed & Padlocked' : 'Padlock Unlatched',
      };
      if (box?.qrToken) metadata['QR Token Read'] = box.qrToken;
      if (scan.distanceMeters !== null && scan.distanceMeters !== undefined) {
        const distNum = Number(scan.distanceMeters);
        metadata['Pole Distance'] = formatDistanceLabel(distNum);
        metadata['Proximity Status'] = scan.locationVerified
          ? `Verified On-Site (${formatDistanceLabel(distNum)})`
          : `⚠️ Location Mismatch (${formatDistanceLabel(distNum)} away)`;
      }
      if (scan.scanLatitude && scan.scanLongitude) {
        metadata['Device GPS'] = `${Number(scan.scanLatitude).toFixed(4)}° N, ${Number(scan.scanLongitude).toFixed(4)}° E`;
      }

      aggregatedLogs.push({
        id: `LOG-SCN-${scan.id.slice(0, 8)}`,
        timestamp: formatTimestamp(scanDate),
        relativeTime: formatRelativeTime(scanDate),
        category: logCategory,
        actorType: 'USER',
        actorName,
        actorId: tech?.role === 'user' ? 'User' : 'Staff',
        targetBoxCode: boxCode,
        targetBoxName: boxName,
        title: logTitle,
        description:
          scan.auditNotes ||
          (isTagAffixed
            ? `Physical QR placard affixed and ${boxCode} (${boxName}) activated on-site.`
            : isUntaggedInspect
            ? `Physical QR placard detected for ${boxCode} (${boxName}) - awaiting on-site tag affixing.`
            : isAlarm
            ? `Alarm state (${scan.boxStatusAtScan}) observed during field inspection.`
            : `Conducted routine on-site inspection for ${boxCode}. Telemetry verified nominal.`),
        deviceOrIp: 'Mobile Scanner App',
        gpsCoordinates:
          box?.latitude && box?.longitude
            ? `${Number(box.latitude).toFixed(4)}° N, ${Number(box.longitude).toFixed(4)}° E`
            : undefined,
        distanceMeters: scan.distanceMeters ? Number(scan.distanceMeters) : null,
        locationVerified: scan.locationVerified !== null ? Boolean(scan.locationVerified) : true,
        scanLatitude: scan.scanLatitude ? String(scan.scanLatitude) : null,
        scanLongitude: scan.scanLongitude ? String(scan.scanLongitude) : null,
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
      const assignedByUser = client.signalDbm ? userMap.get(client.signalDbm) : undefined;
      const isFieldTech = assignedByUser?.role === 'user';
      const portActorName = assignedByUser
        ? `${assignedByUser.firstName} ${assignedByUser.lastName}`.trim()
        : adminName;

      aggregatedLogs.push({
        id: `LOG-PRT-${client.id.slice(0, 8)}`,
        timestamp: formatTimestamp(connDate),
        relativeTime: formatRelativeTime(connDate),
        category: 'PORT_CHANGE',
        actorType: isFieldTech ? 'USER' : 'ADMIN',
        actorName: portActorName,
        actorId: isFieldTech ? 'User' : 'ADMIN',
        targetBoxCode: boxCode,
        targetBoxName: boxName,
        title: isFieldTech
          ? `Field Drop Wire Activated (${boxCode} · P${client.portNumber})`
          : `Subscriber Port Provisioned`,
        description: isFieldTech
          ? `Field technician activated drop wire for ${client.customerName} (${client.accountNumber}) on Port ${client.portNumber} (${client.servicePlan || 'Fiber'}).`
          : `Connected subscriber ${client.customerName} (${client.accountNumber}) on Port ${client.portNumber} with plan ${client.servicePlan || 'Fiber'}.`,
        deviceOrIp: isFieldTech ? 'Mobile Scanner App' : 'Provisioning Gateway',
        metadata: {
          'Port Assigned': `Port ${client.portNumber}`,
          'Account Number': client.accountNumber,
          Subscriber: client.customerName,
          'Service Plan': client.servicePlan || 'Fiber',
          'Provisioned By': portActorName,
        },
        rawDate: connDate.getTime(),
      });
    }

    // 5. Process User Registrations (USER_REGISTER)
    for (const user of allUsers) {
      const regDate = new Date(user.createdAt);
      const fullName = `${user.firstName} ${user.lastName}`.trim() || 'New User';
      const isTech = user.role === 'user';
      const roleLabel = isTech ? 'User' : 'System Administrator';

      aggregatedLogs.push({
        id: `LOG-USR-${user.id.slice(0, 8)}`,
        timestamp: formatTimestamp(regDate),
        relativeTime: formatRelativeTime(regDate),
        category: 'USER_REGISTER',
        actorType: isTech ? 'USER' : 'ADMIN',
        actorName: fullName,
        actorId: isTech ? 'User' : 'Administrator',
        targetBoxCode: isTech ? 'USER' : 'SYS-ADMIN',
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

    let [techScans, allRecentScans, boxes, clients] = await withDbRetry(() =>
      Promise.all([
        db
          .select()
          .from(scanAuditLogs)
          .where(eq(scanAuditLogs.technicianId, technicianId))
          .orderBy(desc(scanAuditLogs.createdAt))
          .limit(Math.max(limit * 5, 100)),
        db
          .select()
          .from(scanAuditLogs)
          .orderBy(desc(scanAuditLogs.createdAt))
          .limit(Math.max(limit * 5, 150)),
        db.select().from(distributionBoxes),
        db.select().from(clientConnections),
      ])
    );

    const boxMap = new Map(boxes.map((b) => [b.id, b]));

    // Track the latest ISSUE audit scan per box so reported issue notes are always preserved
    const latestIssueScanByBox = new Map<string, (typeof allRecentScans)[number]>();
    for (const s of allRecentScans) {
      if (
        (s.boxStatusAtScan === 'ISSUE' || s.boxStatusAtScan === 'WARNING') &&
        !latestIssueScanByBox.has(s.boxId)
      ) {
        latestIssueScanByBox.set(s.boxId, s);
      }
    }

    // Combine technician's own scans with any reported ISSUE scans so reported issue boxes are always stored in Scan History
    const issueScans = allRecentScans.filter((s) => {
      const box = boxMap.get(s.boxId);
      return box?.status === 'ISSUE' || s.boxStatusAtScan === 'ISSUE';
    });

    const combinedScans =
      techScans.length > 0
        ? [...techScans, ...issueScans].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : allRecentScans;

    // Deduplicate so each box appears only once with its most recent scan
    // Include tagged (ACTIVE) and reported ISSUE boxes; exclude NEEDS_TAG boxes
    const seenBoxIds = new Set<string>();
    const uniqueScans: typeof allRecentScans = [];

    for (const scan of combinedScans) {
      const box = boxMap.get(scan.boxId);
      const effectiveStatus = box?.status || scan.boxStatusAtScan || 'ACTIVE';
      if (effectiveStatus === 'NEEDS_TAG') {
        continue;
      }

      if (!seenBoxIds.has(scan.boxId)) {
        seenBoxIds.add(scan.boxId);
        uniqueScans.push(scan);
        if (uniqueScans.length >= limit) {
          break;
        }
      }
    }

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

    const recentScans = uniqueScans.map((scan) => {
      const box = boxMap.get(scan.boxId);
      const effectiveStatus = (box?.status || scan.boxStatusAtScan || 'ACTIVE') as
        | 'ACTIVE'
        | 'NEEDS_TAG'
        | 'ISSUE';
      const issueScan = latestIssueScanByBox.get(scan.boxId);
      const scanDate = new Date(
        effectiveStatus === 'ISSUE' && issueScan ? issueScan.createdAt : scan.createdAt
      );
      const isAlarm =
        effectiveStatus === 'ISSUE' ||
        scan.boxStatusAtScan === 'ISSUE' ||
        scan.boxStatusAtScan === 'WARNING';

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

      const resolvedAuditNote =
        effectiveStatus === 'ISSUE'
          ? issueScan?.auditNotes ||
            scan.auditNotes ||
            box?.notes ||
            '[Hardware Issue] Hardware problem reported during field inspection'
          : scan.auditNotes || 'Routine audit passed. Enclosure inspected.';

      return {
        id: scan.id,
        boxId: scan.boxId,
        boxCode: box?.code || 'BOX',
        siteName: box?.siteName || 'Distribution Node',
        tier: box?.category === 'MAIN_BOX' ? 'Tier 1 · Main Feeder' : 'Tier 2 · Sub-Distribution',
        category: (box?.category || 'SUB_BOX') as 'MAIN_BOX' | 'SUB_BOX',
        status: effectiveStatus,
        boxStatus: effectiveStatus,
        isAlarm,
        portsUsed,
        totalPorts,
        timeLabel,
        dateGroup,
        auditNote: resolvedAuditNote,
        padlockVerified: Boolean(scan.padlockVerified),
        distanceMeters: scan.distanceMeters ? Number(scan.distanceMeters) : null,
        locationVerified: scan.locationVerified !== null ? Boolean(scan.locationVerified) : true,
        createdAt: scanDate.toISOString(),
        timestamp: formatTimestamp(scanDate),
        relativeTime: formatRelativeTime(scanDate),
      };
    });

    // Ensure any box in distributionBoxes with status === 'ISSUE' is included in Scan History even if not in uniqueScans yet
    for (const box of boxes) {
      if (box.status === 'ISSUE' && !seenBoxIds.has(box.id)) {
        seenBoxIds.add(box.id);
        const issueScan = latestIssueScanByBox.get(box.id);
        const scanDate = issueScan?.createdAt
          ? new Date(issueScan.createdAt)
          : box.updatedAt
            ? new Date(box.updatedAt)
            : new Date();
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
        const totalPorts = box.totalPorts || 24;
        const portsUsed = clientMap.get(box.id) ?? 0;

        recentScans.push({
          id: issueScan?.id || `issue-${box.id}`,
          boxId: box.id,
          boxCode: box.code || 'BOX',
          siteName: box.siteName || 'Distribution Node',
          tier: box.category === 'MAIN_BOX' ? 'Tier 1 · Main Feeder' : 'Tier 2 · Sub-Distribution',
          category: (box.category || 'SUB_BOX') as 'MAIN_BOX' | 'SUB_BOX',
          status: 'ISSUE',
          boxStatus: 'ISSUE',
          isAlarm: true,
          portsUsed,
          totalPorts,
          timeLabel,
          dateGroup,
          auditNote:
            issueScan?.auditNotes ||
            box.notes ||
            '[Hardware Issue] Hardware problem reported during field inspection',
          padlockVerified: issueScan ? Boolean(issueScan.padlockVerified) : false,
          distanceMeters: issueScan?.distanceMeters ? Number(issueScan.distanceMeters) : null,
          locationVerified:
            issueScan?.locationVerified !== undefined && issueScan?.locationVerified !== null
              ? Boolean(issueScan.locationVerified)
              : true,
          createdAt: scanDate.toISOString(),
          timestamp: formatTimestamp(scanDate),
          relativeTime: formatRelativeTime(scanDate),
        });
      }
    }

    recentScans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
      auditNotes,
      boxStatusAtScan = 'ACTIVE',
      scanLatitude,
      scanLongitude,
      distanceMeters,
      locationVerified,
    } = req.body;

    let targetBoxId = boxId;
    let resolvedBox: any = null;

    if (targetBoxId) {
      const [matched] = await db.select().from(distributionBoxes).where(eq(distributionBoxes.id, targetBoxId));
      resolvedBox = matched;
    } else if (boxCode) {
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
        resolvedBox = matchedBox;
      }
    }

    if (!targetBoxId) {
      return res.status(400).json({ success: false, message: 'Valid boxId or boxCode is required' });
    }

    // Geolocation Distance Proximity Guard & Anti-Cheating Verification
    let finalScanLat = scanLatitude !== undefined && scanLatitude !== null ? String(scanLatitude) : null;
    let finalScanLon = scanLongitude !== undefined && scanLongitude !== null ? String(scanLongitude) : null;
    let finalDistanceMeters: number | null = typeof distanceMeters === 'number' ? distanceMeters : null;
    let finalLocationVerified = typeof locationVerified === 'boolean' ? locationVerified : true;

    if (finalScanLat && finalScanLon && resolvedBox?.latitude && resolvedBox?.longitude) {
      const bLat = Number(resolvedBox.latitude);
      const bLon = Number(resolvedBox.longitude);
      const sLat = Number(finalScanLat);
      const sLon = Number(finalScanLon);

      if (!Number.isNaN(bLat) && !Number.isNaN(bLon) && !Number.isNaN(sLat) && !Number.isNaN(sLon)) {
        finalDistanceMeters = computeDistanceInMeters(bLat, bLon, sLat, sLon);
        // Anti-cheating guard: flagged if outside 150m tolerance threshold
        finalLocationVerified = finalDistanceMeters <= 150;
      }
    }

    let finalNotes = auditNotes ? String(auditNotes) : null;
    if (finalDistanceMeters !== null && !finalLocationVerified) {
      const distLabel = formatDistanceLabel(finalDistanceMeters);
      const flagNotice = `[⚠️ LOCATION MISMATCH: Scanned ${distLabel} away from registered pole]`;
      finalNotes = finalNotes ? `${finalNotes} ${flagNotice}` : flagNotice;
    }

    // Normalize scanType to match standard system audit types
    const rawScanType = String(scanType || 'CAMERA_QR').toUpperCase().trim();
    let safeScanType = 'CAMERA_QR';
    if (['ROUTINE_AUDIT', 'MANUAL_AUDIT', 'AUDIT'].includes(rawScanType)) {
      safeScanType = 'ROUTINE_AUDIT';
    } else if (['MANUAL_SEARCH', 'SIMULATED_SCAN', 'SIMULATION', 'MANUAL'].includes(rawScanType)) {
      safeScanType = 'MANUAL_SEARCH';
    } else if (['TAG_AFFIXED', 'UNTAGGED_INSPECT'].includes(rawScanType)) {
      safeScanType = rawScanType;
    } else if (rawScanType === 'CAMERA_QR') {
      safeScanType = 'CAMERA_QR';
    }

    // For passive camera/search scans, preserve the box's authoritative status from DB
    const isExplicitStatusChange =
      safeScanType === 'ROUTINE_AUDIT' || safeScanType === 'TAG_AFFIXED';
    const effectiveStatusAtScan = isExplicitStatusChange
      ? String(boxStatusAtScan)
      : String(resolvedBox?.status || boxStatusAtScan || 'ACTIVE');

    const [newLog] = await db
      .insert(scanAuditLogs)
      .values({
        boxId: targetBoxId,
        technicianId,
        scanType: safeScanType,
        padlockVerified: Boolean(padlockVerified),
        auditNotes: finalNotes,
        boxStatusAtScan: effectiveStatusAtScan,
        scanLatitude: finalScanLat,
        scanLongitude: finalScanLon,
        distanceMeters: finalDistanceMeters,
        locationVerified: finalLocationVerified,
      })
      .returning();

    // Automatically synchronize box status when an explicit inspection/tag audit changes it
    if (
      isExplicitStatusChange &&
      boxStatusAtScan &&
      (boxStatusAtScan === 'ACTIVE' ||
        boxStatusAtScan === 'ISSUE' ||
        boxStatusAtScan === 'NEEDS_TAG')
    ) {
      await db
        .update(distributionBoxes)
        .set({ status: boxStatusAtScan, updatedAt: new Date() })
        .where(eq(distributionBoxes.id, targetBoxId));
    }

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
