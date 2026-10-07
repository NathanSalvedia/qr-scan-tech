import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { distributionBoxes, clientConnections } from '../db/schema.js';

const router = Router();

router.get('/stats', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const boxes = await db.select().from(distributionBoxes);
    const clients = await db.select().from(clientConnections);
    
    let mainBoxes = 0;
    let subBoxes = 0;
    let activeCount = 0;
    let needsTagCount = 0;
    let issuesCount = 0;
    let totalPortsCapacity = 0;

    for (const box of boxes) {
      if (box.category === 'MAIN_BOX') mainBoxes++;
      if (box.category === 'SUB_BOX') subBoxes++;
      
      if (box.status === 'ACTIVE') activeCount++;
      if (box.status === 'NEEDS_TAG') needsTagCount++;
      if (box.status === 'ISSUE') issuesCount++;

      totalPortsCapacity += (box.totalPorts || 0);
    }

    const totalClients = clients.length;
    const totalPortsUsed = clients.filter(
      (c) => c.status === 'CONNECTED' || c.status === 'ACTIVE'
    ).length;

    const totalBoxes = boxes.length;
    // Verified = ACTIVE boxes (tagged with QR and operational)
    const verifiedPercentage = totalBoxes > 0 ? ((activeCount / totalBoxes) * 100).toFixed(1) : "0.0";

    return res.json({
      success: true,
      stats: {
        totalBoxes,
        mainBoxes,
        subBoxes,
        activeCount,
        needsTagCount,
        issuesCount,
        verifiedPercentage,
        totalClients,
        totalPortsUsed,
        totalPortsCapacity,
        highTempAlerts: 0,
        portDegraded: 0,
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

export default router;
