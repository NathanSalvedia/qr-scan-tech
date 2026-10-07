import { db } from './index.js';
import { qrDispatches, distributionBoxes, users } from './schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  if (!admin) {
    console.error('No admin found.');
    process.exit(1);
  }

  const boxes = await db.select().from(distributionBoxes);
  console.log(`Found ${boxes.length} boxes.`);

  for (const box of boxes) {
    const existing = await db.select().from(qrDispatches).where(eq(qrDispatches.boxId, box.id));
    if (existing.length === 0) {
      await db.insert(qrDispatches).values({
        boxId: box.id,
        dispatchedBy: admin.id,
        batchNumber: 'BATCH-2026-10',
        stickerSize: '50x50mm Door Placard',
        tagStatus: 'PENDING_AFFIX',
        printedAt: new Date(),
      });
      console.log(`Inserted dispatch record for ${box.code}`);
    } else {
      console.log(`Dispatch record already exists for ${box.code}`);
    }
  }

  const all = await db.select().from(qrDispatches);
  console.log('Current rows in qr_dispatches:');
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
