import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { subscribers, clientConnections } from '../db/schema.js';
import { eq, or, ilike, sql, desc } from 'drizzle-orm';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Calculates standard Luhn check digit for a 9-digit string so the resulting
 * 10-digit number satisfies the Luhn algorithm.
 */
export function calculateLuhnCheckDigit(partial9Digits: string): number {
  let sum = 0;
  let alternate = true;
  for (let i = partial9Digits.length - 1; i >= 0; i--) {
    let n = parseInt(partial9Digits[i], 10);
    if (isNaN(n)) n = 0;
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Formats a 10-digit telecom subscriber account number:
 * [Year 2 digits] + [Branch 2 digits] + [Sequence 5 digits] + [Luhn 1 digit] = 10 digits
 * e.g. 26 + 08 + 00015 + 4 -> 2608000154
 */
export function format10DigitAccount(seqNumber: number, branchCode: string = '08'): string {
  const yearPrefix = String(new Date().getFullYear()).slice(-2);
  const branch = branchCode.padStart(2, '0').slice(0, 2);
  const seqStr = String(seqNumber % 100000).padStart(5, '0');
  const partial = `${yearPrefix}${branch}${seqStr}`;
  const checkDigit = calculateLuhnCheckDigit(partial);
  return `${partial}${checkDigit}`;
}

// =========================================================================
// 1. GENERATE NEXT ATOMIC 10-DIGIT ACCOUNT NUMBER
// =========================================================================
router.get('/next-account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let nextAcc = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      // Atomically fetch next sequence number from PostgreSQL
      const seqResult: any = await db.execute(sql`SELECT nextval('subscriber_account_seq') AS seq`);
      const rawSeq = seqResult.rows ? seqResult.rows[0]?.seq : seqResult[0]?.seq;
      const seqNum = Number(rawSeq || 1);

      nextAcc = format10DigitAccount(seqNum, '08');

      // Check if already in subscribers table or client_connections
      const [existingSub] = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.accountNumber, nextAcc))
        .limit(1);

      const [existingClient] = await db
        .select()
        .from(clientConnections)
        .where(eq(clientConnections.accountNumber, nextAcc))
        .limit(1);

      if (!existingSub && !existingClient) {
        isUnique = true;
      }
    }

    return res.json({
      success: true,
      accountNumber: nextAcc,
      format: '10-digit (Year + Branch + Sequence + Checksum)',
    });
  } catch (error: any) {
    console.error('Error generating 10-digit account number:', error);
    // Fallback generation based on timestamp if sequence fails
    const fallbackSeq = (Date.now() % 90000) + 10000;
    const fallbackAcc = format10DigitAccount(fallbackSeq, '08');
    return res.json({
      success: true,
      accountNumber: fallbackAcc,
      fallback: true,
    });
  }
});

// =========================================================================
// 2. LIVE LOOKUP SUBSCRIBER BY 10-DIGIT ACCOUNT NUMBER
// =========================================================================
router.get('/lookup/:accountNumber', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawAccount = String(req.params.accountNumber || '').trim();
    if (!rawAccount) {
      return res.status(400).json({ success: false, message: 'Account number is required.' });
    }

    // 1. Search in Central Subscribers Table
    const [sub] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.accountNumber, rawAccount))
      .limit(1);

    if (sub) {
      return res.json({
        success: true,
        matched: true,
        subscriber: {
          id: sub.id,
          accountNumber: sub.accountNumber,
          customerName: sub.customerName,
          name: sub.customerName,
          subscriberType: sub.subscriberType,
          category: sub.subscriberType,
          servicePlan: sub.servicePlan,
          plan: sub.servicePlan,
          contactNumber: sub.contactNumber,
          address: sub.address,
          status: sub.status,
          assignedBoxId: sub.assignedBoxId,
          assignedPort: sub.assignedPort,
        },
      });
    }

    // 2. Search in existing Client Connections (already connected clients)
    const [clientConn] = await db
      .select()
      .from(clientConnections)
      .where(eq(clientConnections.accountNumber, rawAccount))
      .limit(1);

    if (clientConn) {
      return res.json({
        success: true,
        matched: true,
        subscriber: {
          accountNumber: clientConn.accountNumber,
          customerName: clientConn.customerName,
          name: clientConn.customerName,
          subscriberType: clientConn.clientType || 'Residential',
          category: clientConn.clientType || 'Residential',
          servicePlan: clientConn.servicePlan || '200 Mbps Fiber Pro',
          plan: clientConn.servicePlan || '200 Mbps Fiber Pro',
          status: clientConn.status === 'CONNECTED' ? 'ACTIVE' : 'DISCONNECTED',
          assignedBoxId: clientConn.boxId,
          assignedPort: `Port ${clientConn.portNumber}`,
        },
      });
    }

    return res.json({
      success: true,
      matched: false,
      message: 'No subscriber matched with this 10-digit account number.',
    });
  } catch (error: any) {
    console.error('Error looking up subscriber:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lookup failed.' });
  }
});

// =========================================================================
// 3. LIST / SEARCH CENTRAL SUBSCRIBERS DIRECTORY
// =========================================================================
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status } = req.query;

    let query = db.select().from(subscribers);

    let allSubs = await query.orderBy(desc(subscribers.createdAt));



    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      allSubs = allSubs.filter(
        (s) =>
          s.customerName.toLowerCase().includes(q) ||
          s.accountNumber.includes(q) ||
          s.servicePlan.toLowerCase().includes(q) ||
          s.subscriberType.toLowerCase().includes(q)
      );
    }

    if (status && typeof status === 'string') {
      allSubs = allSubs.filter((s) => s.status === status);
    }

    return res.json({
      success: true,
      subscribers: allSubs.map((s) => ({
        id: s.id,
        accountNumber: s.accountNumber,
        name: s.customerName,
        customerName: s.customerName,
        category: s.subscriberType,
        subscriberType: s.subscriberType,
        plan: s.servicePlan,
        servicePlan: s.servicePlan,
        contactNumber: s.contactNumber,
        address: s.address,
        status: s.status,
      })),
    });
  } catch (error: any) {
    console.error('Error listing subscribers:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to list subscribers.' });
  }
});

// =========================================================================
// 4. CREATE NEW SUBSCRIBER
// =========================================================================
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { accountNumber, customerName, subscriberType, servicePlan, contactNumber, email, address } = req.body;

    if (!accountNumber || !customerName) {
      return res.status(400).json({ success: false, message: 'Account number and customer name are required.' });
    }

    const [newSub] = await db
      .insert(subscribers)
      .values({
        accountNumber: String(accountNumber).trim(),
        customerName: String(customerName).trim(),
        subscriberType: subscriberType || 'Residential',
        servicePlan: servicePlan || '200 Mbps Fiber Pro',
        contactNumber,
        email,
        address,
        status: 'PENDING_PROVISIONING',
      })
      .returning();

    return res.json({
      success: true,
      message: 'Subscriber created successfully.',
      subscriber: newSub,
    });
  } catch (error: any) {
    console.error('Error creating subscriber:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create subscriber.' });
  }
});

export default router;
