import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { systemSettings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

export const DEFAULT_SYSTEM_SETTINGS = {
  id: 'default',
  companyName: 'MultiFactors Network Infrastructure',
  branchName: 'Iligan City Operations',
  officeAddress: 'Aguinaldo St, Poblacion, Iligan City, 9200',
  hotline: '(063) 221-4400',
  mobileDispatch: '+63 917 800 9000',
  placardHeader: 'MULTIFACTORS · ILIGAN',
  paperFormat: 'A4 Bondpaper (2 Placards / Sheet)',
  autoFillDuplicate: true,
  tokenPrefix: 'QRTECH-BOX-',
};

// =================================================================
// 1. GET SYSTEM SETTINGS (Public/Authenticated)
// =================================================================
router.get('/', async (req, res: Response) => {
  try {
    let settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'default'),
    });

    if (!settings) {
      const [created] = await db
        .insert(systemSettings)
        .values(DEFAULT_SYSTEM_SETTINGS)
        .returning();
      settings = created;
    }

    return res.json({
      success: true,
      settings: {
        id: settings.id,
        companyName: settings.companyName,
        branchName: settings.branchName,
        officeAddress: settings.officeAddress,
        hotline: settings.hotline,
        mobileDispatch: settings.mobileDispatch,
        placardHeader: settings.placardHeader,
        paperFormat: settings.paperFormat,
        autoFillDuplicate: settings.autoFillDuplicate,
        tokenPrefix: settings.tokenPrefix,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (err: any) {
    console.error('Get settings error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch settings',
      settings: DEFAULT_SYSTEM_SETTINGS,
    });
  }
});

// =================================================================
// 2. UPDATE SYSTEM SETTINGS (Authenticated Session)
// =================================================================
router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      companyName,
      branchName,
      officeAddress,
      hotline,
      mobileDispatch,
      placardHeader,
      paperFormat,
      autoFillDuplicate,
      tokenPrefix,
    } = req.body;

    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'default'),
    });

    const updateData = {
      companyName:
        companyName !== undefined
          ? String(companyName).trim()
          : existing?.companyName ?? DEFAULT_SYSTEM_SETTINGS.companyName,
      branchName:
        branchName !== undefined
          ? String(branchName).trim()
          : existing?.branchName ?? DEFAULT_SYSTEM_SETTINGS.branchName,
      officeAddress:
        officeAddress !== undefined
          ? String(officeAddress).trim()
          : existing?.officeAddress ?? DEFAULT_SYSTEM_SETTINGS.officeAddress,
      hotline:
        hotline !== undefined
          ? String(hotline).trim()
          : existing?.hotline ?? DEFAULT_SYSTEM_SETTINGS.hotline,
      mobileDispatch:
        mobileDispatch !== undefined
          ? String(mobileDispatch).trim()
          : existing?.mobileDispatch ?? DEFAULT_SYSTEM_SETTINGS.mobileDispatch,
      placardHeader:
        placardHeader !== undefined
          ? String(placardHeader).trim()
          : existing?.placardHeader ?? DEFAULT_SYSTEM_SETTINGS.placardHeader,
      paperFormat:
        paperFormat !== undefined
          ? String(paperFormat).trim()
          : existing?.paperFormat ?? DEFAULT_SYSTEM_SETTINGS.paperFormat,
      autoFillDuplicate:
        autoFillDuplicate !== undefined
          ? Boolean(autoFillDuplicate)
          : existing?.autoFillDuplicate ?? DEFAULT_SYSTEM_SETTINGS.autoFillDuplicate,
      tokenPrefix:
        tokenPrefix !== undefined
          ? String(tokenPrefix).trim()
          : existing?.tokenPrefix ?? DEFAULT_SYSTEM_SETTINGS.tokenPrefix,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(systemSettings)
        .set(updateData)
        .where(eq(systemSettings.id, 'default'));
    } else {
      await db.insert(systemSettings).values({ id: 'default', ...updateData });
    }

    return res.json({
      success: true,
      message: 'System settings updated successfully!',
      settings: { id: 'default', ...updateData },
    });
  } catch (err: any) {
    console.error('Update settings error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// 3. RESET SYSTEM SETTINGS (Authenticated Session)
// =================================================================
router.post('/reset', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'default'),
    });

    const resetData = {
      ...DEFAULT_SYSTEM_SETTINGS,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(systemSettings)
        .set(resetData)
        .where(eq(systemSettings.id, 'default'));
    } else {
      await db.insert(systemSettings).values(resetData);
    }

    return res.json({
      success: true,
      message: 'Settings have been reset to factory defaults.',
      settings: resetData,
    });
  } catch (err: any) {
    console.error('Reset settings error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
