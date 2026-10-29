import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { db, withDbRetry } from '../db/index.js';
import {
  distributionBoxes,
  clientConnections,
  boxEquipment,
  equipmentCatalog,
  qrDispatches,
  users,
  zones,
  scanAuditLogs,
  subscribers,
  systemSettings,
} from '../db/schema.js';
import { eq, and, desc, or, sql } from 'drizzle-orm';

const router = Router();

// =========================================================================
// 1. GET ALL BOXES
// =========================================================================
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rawBoxes, rawClients, rawEquipment, catalogRows, scanRows, userRows } =
      await withDbRetry(async () => {
        const [rawBoxes, rawClients, rawEquipment, catalogRows, scanRows, userRows] =
          await Promise.all([
            db.select().from(distributionBoxes),
            db.select().from(clientConnections),
            db.select().from(boxEquipment),
            db.select().from(equipmentCatalog),
            db.select().from(scanAuditLogs).orderBy(desc(scanAuditLogs.createdAt)),
            db.select().from(users),
          ]);
        return { rawBoxes, rawClients, rawEquipment, catalogRows, scanRows, userRows };
      });

    const boxCodeMap = new Map(rawBoxes.map((b) => [b.id, b.code]));
    const userMap = new Map(userRows.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

    const boxes = rawBoxes.map((box) => {
      const boxClients = rawClients
        .filter((c) => c.boxId === box.id)
        .sort((a, b) => (a.portNumber || 0) - (b.portNumber || 0))
        .map((c) => ({
          id: c.id,
          port: `Port ${c.portNumber}`,
          portNumber: c.portNumber,
          accountNumber: c.accountNumber,
          name: c.customerName,
          clientType: c.clientType || 'Residential',
          plan: c.servicePlan || '100 Mbps Fiber Plan',
          signalDbm: c.signalDbm || null,
          status: c.status,
        }));

      const activePorts = boxClients.filter(
        (c) => c.status === 'CONNECTED' || c.status === 'ACTIVE'
      ).length;

      const equipList = rawEquipment
        .filter((e) => e.boxId === box.id)
        .map((e) => {
          const match = catalogRows.find((c) => c.id === e.catalogId);
          return {
            id: e.id,
            name: match ? match.name : (e.catalogId || 'Hardware Equipment'),
            type: match ? match.equipmentType || 'Hardware' : 'Hardware',
            status: e.status || 'OPERATIONAL',
          };
        });

      const parentCode = box.parentBoxId ? boxCodeMap.get(box.parentBoxId) || null : null;
      const zoneName = box.address.split(',')[1]?.trim() || 'Iligan City';
      const tier = box.category === 'MAIN_BOX' ? 'Tier 1 · Main Feeder' : 'Tier 2 · Sub-Distribution';
      const latestScan = scanRows.find((s) => s.boxId === box.id);

      const opticalLoss = box.status === 'ISSUE' ? 'Degraded' : 'Nominal';
      const temperature = box.status === 'ISSUE' ? 'Elevated' : 'Normal';
      const circuitBreaker = box.category === 'MAIN_BOX' ? '63A 2P MCB' : '20A 1P MCB';
      const voltage = box.status === 'ISSUE' ? '219.2 V (Low)' : '228.4 V';
      const lastScannedBy = latestScan ? (userMap.get(latestScan.technicianId) || 'Field Technician') : 'Unverified';
      const lastScannedAt = latestScan
        ? new Date(latestScan.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
        : 'Pending Field Audit';
      const equipmentItems =
        equipList.length > 0
          ? equipList.map((e) => e.name)
          : ['Optical Splitter', 'Terminal Block', 'Surge Protector'];
      const issueScan =
        scanRows.find(
          (s) =>
            s.boxId === box.id &&
            (s.boxStatusAtScan === 'ISSUE' || s.boxStatusAtScan === 'WARNING')
        ) || (box.status === 'ISSUE' ? latestScan : null);
      const latestIssue =
        box.status === 'ISSUE' && issueScan
          ? {
              notes:
                issueScan.auditNotes ||
                'Hardware issue reported during field inspection',
              reportedBy:
                userMap.get(issueScan.technicianId) || 'Field Technician',
              reportedAt: new Date(issueScan.createdAt).toLocaleDateString(
                'en-US',
                { month: 'short', day: '2-digit', year: 'numeric' }
              ),
              padlockVerified: issueScan.padlockVerified,
            }
          : null;

      const rawLng = Number(box.longitude);
      const safeLng = rawLng >= 20 && rawLng <= 35 ? rawLng + 100 : rawLng;

      return {
        ...box,
        latitude: Number(box.latitude),
        longitude: safeLng,
        activePorts,
        portsUsed: activePorts,
        clientsCount: boxClients.length,
        clients: boxClients,
        equipment: equipList,
        equipmentItems,
        parentCode,
        zone: zoneName,
        tier,
        opticalLoss,
        temperature,
        circuitBreaker,
        voltage,
        lastScannedBy,
        lastScannedAt,
        latestScanDistanceMeters: latestScan?.distanceMeters !== undefined && latestScan?.distanceMeters !== null ? Number(latestScan.distanceMeters) : null,
        latestScanLocationVerified: latestScan?.locationVerified !== undefined && latestScan?.locationVerified !== null ? Boolean(latestScan.locationVerified) : true,
        latestIssue,
      };
    });

    return res.json({
      success: true,
      boxes,
    });
  } catch (error: any) {
    console.error('Error fetching boxes:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// =========================================================================
// 2. GET SINGLE BOX BY ID
// =========================================================================
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let box: any;
    if (isUuid) {
      const [found] = await db.select().from(distributionBoxes).where(eq(distributionBoxes.id, id));
      box = found;
    } else {
      const [found] = await db
        .select()
        .from(distributionBoxes)
        .where(
          or(
            eq(distributionBoxes.code, id.toUpperCase().trim()),
            eq(distributionBoxes.qrToken, id.trim())
          )
        );
      box = found;
    }

    if (!box) {
      return res.status(404).json({ success: false, message: 'Box not found' });
    }

    const boxId = box.id;

    const [allBoxes, boxClients, rawEquipment, catalogRows, /* zoneRows */, scanRows, userRows] = await Promise.all([
      db.select().from(distributionBoxes),
      db.select().from(clientConnections).where(eq(clientConnections.boxId, boxId)),
      db.select().from(boxEquipment).where(eq(boxEquipment.boxId, boxId)),
      db.select().from(equipmentCatalog),
      db.select().from(zones),
      db.select().from(scanAuditLogs).where(eq(scanAuditLogs.boxId, boxId)).orderBy(desc(scanAuditLogs.createdAt)),
      db.select().from(users),
    ]);

    const mappedClients = boxClients
      .slice()
      .sort((a, b) => (a.portNumber || 0) - (b.portNumber || 0))
      .map((c) => ({
        id: c.id,
        port: `Port ${c.portNumber}`,
        portNumber: c.portNumber,
        accountNumber: c.accountNumber,
        name: c.customerName,
        clientType: c.clientType || 'Residential',
        plan: c.servicePlan || '100 Mbps Fiber Plan',
        status: c.status,
      }));

    const equipList = rawEquipment.map((e) => {
      const match = catalogRows.find((c) => c.id === e.catalogId);
      return {
        id: e.id,
        name: match ? match.name : (e.catalogId || 'Hardware Equipment'),
        type: match ? match.equipmentType || 'Hardware' : 'Hardware',
        status: e.status || 'OPERATIONAL',
      };
    });

    const parentBox = box.parentBoxId ? allBoxes.find((b) => b.id === box.parentBoxId) : null;
    const parentCode = parentBox ? parentBox.code : null;
    const zoneName = box.address.split(',')[1]?.trim() || 'Iligan City';
    const tier = box.category === 'MAIN_BOX' ? 'Tier 1 · Main Feeder' : 'Tier 2 · Sub-Distribution';
    const latestScan = scanRows[0];
    const userMap = new Map(userRows.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

    const opticalLoss = box.status === 'ISSUE' ? 'Degraded' : 'Nominal';
    const temperature = box.status === 'ISSUE' ? 'Elevated' : 'Normal';
    const circuitBreaker = box.category === 'MAIN_BOX' ? '63A 2P MCB' : '20A 1P MCB';
    const voltage = box.status === 'ISSUE' ? '219.2 V (Low)' : '228.4 V';
    const activePorts = mappedClients.filter(
      (c) => c.status === 'CONNECTED' || c.status === 'ACTIVE'
    ).length;
    const equipmentItems =
      equipList.length > 0
        ? equipList.map((e) => e.name)
        : ['Optical Splitter', 'Terminal Block', 'Surge Protector'];
    const lastScannedBy = latestScan ? (userMap.get(latestScan.technicianId) || 'Field Technician') : 'Unverified';
    const lastScannedAt = latestScan
      ? new Date(latestScan.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      : 'Pending Field Audit';
    const issueScan =
      scanRows.find(
        (s) => s.boxStatusAtScan === 'ISSUE' || s.boxStatusAtScan === 'WARNING'
      ) || (box.status === 'ISSUE' ? latestScan : null);
    const latestIssue =
      box.status === 'ISSUE' && issueScan
        ? {
            notes:
              issueScan.auditNotes ||
              'Hardware issue reported during field inspection',
            reportedBy:
              userMap.get(issueScan.technicianId) || 'Field Technician',
            reportedAt: new Date(issueScan.createdAt).toLocaleDateString(
              'en-US',
              { month: 'short', day: '2-digit', year: 'numeric' }
            ),
            padlockVerified: issueScan.padlockVerified,
          }
        : null;

    return res.json({
      success: true,
      box: {
        ...box,
        latitude: Number(box.latitude),
        longitude: Number(box.longitude),
        activePorts,
        portsUsed: activePorts,
        clientsCount: mappedClients.length,
        clients: mappedClients,
        equipment: equipList,
        equipmentItems,
        parentCode,
        zone: zoneName,
        tier,
        opticalLoss,
        temperature,
        circuitBreaker,
        voltage,
        lastScannedBy,
        lastScannedAt,
        latestScanDistanceMeters: latestScan?.distanceMeters !== undefined && latestScan?.distanceMeters !== null ? Number(latestScan.distanceMeters) : null,
        latestScanLocationVerified: latestScan?.locationVerified !== undefined && latestScan?.locationVerified !== null ? Boolean(latestScan.locationVerified) : true,
        latestIssue,
      },
    });
  } catch (error: any) {
    console.error('Error fetching box:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// =========================================================================
// 3. CREATE / REGISTER A NEW DISTRIBUTION BOX
// =========================================================================
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      code,
      category,
      parentCode,
      parentBoxId,
      siteName,
      address,
      mountingType,
      latitude,
      longitude,
      totalPorts,
      notes,
      equipment,
    } = req.body;

    if (!code || !siteName || !address) {
      return res.status(400).json({
        success: false,
        message: 'Box Code, Site Name, and Address are required.',
      });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check for duplicate code
    const existing = await db
      .select({ id: distributionBoxes.id })
      .from(distributionBoxes)
      .where(eq(distributionBoxes.code, cleanCode));

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A distribution box with code "${cleanCode}" already exists.`,
      });
    }

    // Resolve parentBoxId if parentCode is provided
    let resolvedParentBoxId: string | null = parentBoxId || null;
    if (!resolvedParentBoxId && parentCode) {
      const [parentBox] = await db
        .select({ id: distributionBoxes.id })
        .from(distributionBoxes)
        .where(eq(distributionBoxes.code, parentCode.trim().toUpperCase()));
      if (parentBox) {
        resolvedParentBoxId = parentBox.id;
      }
    }

    let tokenPrefix = 'ScanOps-Box-';
    try {
      const [st] = await db
        .select({ tokenPrefix: systemSettings.tokenPrefix })
        .from(systemSettings)
        .limit(1);
      if (st?.tokenPrefix) tokenPrefix = st.tokenPrefix;
    } catch {
      // Fallback to ScanOps-Box-
    }

    const qrToken = `${tokenPrefix}${cleanCode}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [newBox] = await db
      .insert(distributionBoxes)
      .values({
        code: cleanCode,
        category: category || 'SUB_BOX',
        parentBoxId: resolvedParentBoxId,
        siteName: siteName.trim(),
        address: address.trim(),
        mountingType: mountingType || 'Utility Pole',
        latitude: String(latitude || 8.232),
        longitude: String(
          Number(longitude) >= 20 && Number(longitude) <= 35
            ? Number(longitude) + 100
            : longitude || 124.248
        ),
        status: 'NEEDS_TAG',
        totalPorts: Number(totalPorts) || 24,
        qrToken,
        notes: notes ? notes.trim() : null,
      })
      .returning();

    // If equipment items provided, insert into box_equipment
    if (Array.isArray(equipment) && equipment.length > 0) {
      try {
        const catalogRows = await db.select().from(equipmentCatalog);
        for (const item of equipment) {
          const itemName = typeof item === 'object' && item !== null ? item.name : String(item);
          const catId = typeof item === 'object' && item !== null ? item.catalogId : null;
          const catalogMatch = catalogRows.find(
            (c) =>
              (catId && c.id === catId) ||
              (itemName && c.name.toLowerCase() === itemName.toLowerCase())
          );
          if (catalogMatch) {
            await db.insert(boxEquipment).values({
              boxId: newBox.id,
              catalogId: catalogMatch.id,
              status: 'OPERATIONAL',
            });
          }
        }
      } catch (equipErr) {
        console.warn('Warning: Non-critical failure saving box_equipment:', equipErr);
      }
    }

    // Automatically record QR dispatch for physical field tagging
    try {
      let adminId = req.user?.id;
      if (!adminId) {
        const [adminRow] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, 'admin'))
          .limit(1);
        adminId = adminRow?.id;
      }

      if (adminId) {
        const batchNumber = `BATCH-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        await db.insert(qrDispatches).values({
          boxId: newBox.id,
          dispatchedBy: adminId,
          batchNumber,
          stickerSize: '50x50mm Door Placard',
          tagStatus: 'PENDING_AFFIX',
        });
      }
    } catch (dispatchErr) {
      console.warn('Warning: Non-critical failure saving initial qr_dispatch:', dispatchErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Distribution box created successfully.',
      box: {
        ...newBox,
        latitude: Number(newBox.latitude),
        longitude: Number(newBox.longitude),
        parentCode: parentCode || null,
        activePorts: 0,
        clients: [],
        equipment: equipment || [],
      },
    });
  } catch (error: any) {
    console.error('Error creating box:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create box.' });
  }
});

// =========================================================================
// 4. UPDATE BOX DETAILS
// =========================================================================
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let targetBoxId = id;
    if (!isUuid) {
      const [matched] = await db
        .select()
        .from(distributionBoxes)
        .where(
          or(
            eq(distributionBoxes.code, id.toUpperCase().trim()),
            eq(distributionBoxes.qrToken, id.trim())
          )
        );
      if (!matched) {
        return res.status(404).json({ success: false, message: 'Box not found' });
      }
      targetBoxId = matched.id;
    }

    const {
      code,
      category,
      parentCode,
      parentBoxId,
      siteName,
      address,
      mountingType,
      latitude,
      longitude,
      totalPorts,
      status,
      notes,
      equipment,
    } = req.body;

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (code) updatePayload.code = code.trim().toUpperCase();
    if (category) updatePayload.category = category;
    if (parentBoxId !== undefined) {
      updatePayload.parentBoxId = parentBoxId;
    } else if (parentCode !== undefined) {
      if (!parentCode || category === 'MAIN_BOX') {
        updatePayload.parentBoxId = null;
      } else {
        const [parentBox] = await db
          .select({ id: distributionBoxes.id })
          .from(distributionBoxes)
          .where(eq(distributionBoxes.code, String(parentCode).trim().toUpperCase()));
        if (parentBox) {
          updatePayload.parentBoxId = parentBox.id;
        }
      }
    }
    if (siteName) updatePayload.siteName = siteName.trim();
    if (address) updatePayload.address = address.trim();
    if (mountingType) updatePayload.mountingType = mountingType;
    if (latitude !== undefined) updatePayload.latitude = String(latitude);
    if (longitude !== undefined) {
      const numLng = Number(longitude);
      updatePayload.longitude = String(
        numLng >= 20 && numLng <= 35 ? numLng + 100 : longitude
      );
    }
    if (totalPorts !== undefined) updatePayload.totalPorts = Number(totalPorts);
    if (status) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes ? notes.trim() : null;

    const [updatedBox] = await db
      .update(distributionBoxes)
      .set(updatePayload)
      .where(eq(distributionBoxes.id, targetBoxId))
      .returning();

    if (!updatedBox) {
      return res.status(404).json({ success: false, message: 'Box not found' });
    }

    if (Array.isArray(equipment)) {
      try {
        await db.delete(boxEquipment).where(eq(boxEquipment.boxId, targetBoxId));
        const catalogRows = await db.select().from(equipmentCatalog);
        for (const item of equipment) {
          const itemName = typeof item === 'object' && item !== null ? item.name : String(item);
          const catId = typeof item === 'object' && item !== null ? item.catalogId : null;
          const catalogMatch = catalogRows.find(
            (c) =>
              (catId && c.id === catId) ||
              (itemName && c.name.toLowerCase() === itemName.toLowerCase())
          );
          await db.insert(boxEquipment).values({
            boxId: targetBoxId,
            catalogId: catalogMatch ? catalogMatch.id : itemName,
            status: 'OPERATIONAL',
          });
        }
      } catch (equipErr) {
        console.warn('Warning: Non-critical failure updating box_equipment:', equipErr);
      }
    }

    return res.json({
      success: true,
      message: 'Box updated successfully.',
      box: updatedBox,
    });
  } catch (error: any) {
    console.error('Error updating box:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update box.' });
  }
});

// =========================================================================
// 5. ASSIGN CLIENT TO PORT
// =========================================================================
router.post('/:id/clients', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { port, accountNumber, name, plan, clientType } = req.body;

    if (!port || !accountNumber || !name) {
      return res.status(400).json({
        success: false,
        message: 'Port, Account Number, and Client Name are required.',
      });
    }

    const [box] = await db.select().from(distributionBoxes).where(eq(distributionBoxes.id, id));
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box not found' });
    }

    // Extract numeric port from "Port 5" or "5"
    const portNum = typeof port === 'number' ? port : parseInt(String(port).replace(/\D/g, ''), 10) || 1;

    // Check if port is already occupied when preventOverwrite is requested (prevents two technicians from double-patching the same port)
    const [existingOnPort] = await db
      .select()
      .from(clientConnections)
      .where(and(eq(clientConnections.boxId, id), eq(clientConnections.portNumber, portNum)))
      .limit(1);

    if (existingOnPort && req.body.preventOverwrite) {
      return res.status(409).json({
        success: false,
        message: `Port ${portNum} was already assigned to ${existingOnPort.customerName} (${existingOnPort.accountNumber}). Please select another available port.`,
      });
    }

    // Delete any existing client on this port for this box
    await db
      .delete(clientConnections)
      .where(and(eq(clientConnections.boxId, id), eq(clientConnections.portNumber, portNum)));

    // Insert new client connection
    const [newClient] = await db
      .insert(clientConnections)
      .values({
        boxId: id,
        portNumber: portNum,
        accountNumber: String(accountNumber).trim(),
        customerName: String(name).trim(),
        clientType: clientType || 'RESIDENTIAL',
        servicePlan: plan || '100 Mbps Fiber Plan',
        signalDbm: req.body.signalDbm ? String(req.body.signalDbm).trim() : null,
        status: 'CONNECTED',
      })
      .returning();

    // Sync central subscribers directory (upsert so it is always maintained in subscribers table)
    try {
      const cleanAcc = String(accountNumber).trim();
      const cleanName = String(name).trim();
      const cleanType = clientType || 'Residential';
      const cleanPlan = plan || '100 Mbps Fiber Plan';
      await db.execute(sql`
        INSERT INTO subscribers (
          account_number, customer_name, subscriber_type, service_plan, status, assigned_box_id, assigned_port
        )
        VALUES (
          ${cleanAcc}, ${cleanName}, ${cleanType}, ${cleanPlan}, 'ACTIVE', ${id}, ${`Port ${portNum}`}
        )
        ON CONFLICT (account_number) DO UPDATE
        SET 
          customer_name = EXCLUDED.customer_name,
          subscriber_type = EXCLUDED.subscriber_type,
          service_plan = EXCLUDED.service_plan,
          status = 'ACTIVE',
          assigned_box_id = EXCLUDED.assigned_box_id,
          assigned_port = EXCLUDED.assigned_port,
          updated_at = NOW();
      `);
    } catch (subErr) {
      console.warn('Non-fatal: could not upsert into subscribers table', subErr);
    }

    return res.json({
      success: true,
      message: `Client ${name} assigned to Port ${portNum} successfully.`,
      client: newClient,
    });
  } catch (error: any) {
    console.error('Error assigning client:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to assign client.' });
  }
});

// =========================================================================
// 6. TOGGLE CLIENT CONNECTION STATUS (CONNECTED <-> DISCONNECTED)
// =========================================================================
router.patch('/:id/clients/:port', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, port } = req.params;
    const portNum = typeof port === 'number' ? port : parseInt(String(port).replace(/\D/g, ''), 10) || 1;

    const [existing] = await db
      .select()
      .from(clientConnections)
      .where(and(eq(clientConnections.boxId, id), eq(clientConnections.portNumber, portNum)));

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client not found on this port' });
    }

    const nextStatus = existing.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
    const [updated] = await db
      .update(clientConnections)
      .set({ status: nextStatus })
      .where(eq(clientConnections.id, existing.id))
      .returning();

    return res.json({
      success: true,
      client: updated,
    });
  } catch (error: any) {
    console.error('Error toggling client status:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to toggle client status.' });
  }
});

// =========================================================================
// 6b. UPDATE OPTICAL SIGNAL (dBm) READING
// =========================================================================
router.patch('/:id/clients/:port/signal', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, port } = req.params;
    const { signalDbm } = req.body;
    const portNum = typeof port === 'number' ? port : parseInt(String(port).replace(/\D/g, ''), 10) || 1;

    const [existing] = await db
      .select()
      .from(clientConnections)
      .where(and(eq(clientConnections.boxId, id), eq(clientConnections.portNumber, portNum)));

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client not found on this port' });
    }

    const cleanSignal = signalDbm ? String(signalDbm).trim() : null;

    const [updated] = await db
      .update(clientConnections)
      .set({ signalDbm: cleanSignal })
      .where(eq(clientConnections.id, existing.id))
      .returning();

    return res.json({
      success: true,
      message: `Optical signal updated to ${cleanSignal || 'N/A'} for Port ${portNum}.`,
      client: updated,
    });
  } catch (error: any) {
    console.error('Error updating optical signal:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update optical signal.' });
  }
});

// =========================================================================
// 7. REMOVE CLIENT FROM PORT
// =========================================================================
router.delete('/:id/clients/:port', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, port } = req.params;
    const portNum = typeof port === 'number' ? port : parseInt(String(port).replace(/\D/g, ''), 10) || 1;

    // Find client connection before deleting so we can reset subscriber status
    const [existingClient] = await db
      .select()
      .from(clientConnections)
      .where(and(eq(clientConnections.boxId, id), eq(clientConnections.portNumber, portNum)))
      .limit(1);

    await db
      .delete(clientConnections)
      .where(and(eq(clientConnections.boxId, id), eq(clientConnections.portNumber, portNum)));

    if (existingClient?.accountNumber) {
      try {
        await db
          .update(subscribers)
          .set({
            status: 'PENDING_PROVISIONING',
            assignedBoxId: null,
            assignedPort: null,
            updatedAt: new Date(),
          })
          .where(eq(subscribers.accountNumber, existingClient.accountNumber));
      } catch (subErr) {
        console.warn('Non-fatal: could not reset subscribers table', subErr);
      }
    }

    return res.json({
      success: true,
      message: `Client removed from port ${portNum} successfully.`,
    });
  } catch (error: any) {
    console.error('Error removing client:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to remove client.' });
  }
});

// =========================================================================
// 8. DELETE A BOX (Admin only)
// =========================================================================
router.delete('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Delete related rows first to satisfy foreign keys
    await db.delete(clientConnections).where(eq(clientConnections.boxId, id));
    await db.delete(boxEquipment).where(eq(boxEquipment.boxId, id));
    await db.delete(qrDispatches).where(eq(qrDispatches.boxId, id));
    await db.delete(distributionBoxes).where(eq(distributionBoxes.id, id));

    return res.json({
      success: true,
      message: 'Distribution box deleted successfully.',
    });
  } catch (error: any) {
    console.error('Error deleting box:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete box.' });
  }
});

// =========================================================================
// 9. RECORD SINGLE QR DISPATCH / PRINT
// =========================================================================
router.post('/:id/dispatch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stickerSize, batchNumber } = req.body || {};

    let adminId = req.user?.id;
    if (!adminId) {
      const [adminRow] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);
      adminId = adminRow?.id;
    }

    if (!adminId) {
      return res.status(400).json({ success: false, message: 'Valid admin dispatcher not found.' });
    }

    const currentBatch =
      batchNumber ||
      `BATCH-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const [dispatch] = await db
      .insert(qrDispatches)
      .values({
        boxId: id,
        dispatchedBy: adminId,
        batchNumber: currentBatch,
        stickerSize: stickerSize || '50x50mm Door Placard',
        tagStatus: 'PENDING_AFFIX',
        printedAt: new Date(),
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: 'QR sticker dispatch logged successfully.',
      dispatch,
    });
  } catch (error: any) {
    console.error('Error logging QR dispatch:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to log QR dispatch.' });
  }
});

// =========================================================================
// 10. RECORD BATCH QR DISPATCH (A4 Sheet Print Queue)
// =========================================================================
router.post('/dispatch-batch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { boxIds, stickerSize, batchNumber } = req.body || {};

    if (!Array.isArray(boxIds) || boxIds.length === 0) {
      return res.status(400).json({ success: false, message: 'boxIds array is required.' });
    }

    let adminId = req.user?.id;
    if (!adminId) {
      const [adminRow] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);
      adminId = adminRow?.id;
    }

    if (!adminId) {
      return res.status(400).json({ success: false, message: 'Valid admin dispatcher not found.' });
    }

    const currentBatch =
      batchNumber ||
      `BATCH-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const records = [];
    for (const bId of boxIds) {
      const [entry] = await db
        .insert(qrDispatches)
        .values({
          boxId: bId,
          dispatchedBy: adminId,
          batchNumber: currentBatch,
          stickerSize: stickerSize || 'A4 Bondpaper Placard',
          tagStatus: 'PENDING_AFFIX',
          printedAt: new Date(),
        })
        .returning();
      records.push(entry);
    }

    return res.status(201).json({
      success: true,
      message: `Batch QR dispatch logged for ${records.length} boxes.`,
      dispatches: records,
    });
  } catch (error: any) {
    console.error('Error logging batch QR dispatch:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to log batch dispatch.' });
  }
});

export default router;
