import 'dotenv/config';
import { db } from './index';
import { distributionBoxes } from './schema';
import { eq } from 'drizzle-orm';

async function updateLocations() {
  console.log('Updating coordinates and addresses for distribution boxes...');

  // 1. Update Iligan City National High School (DB-MN-01)
  // Plus Code: 66GQ+3RJ -> Lat: 8.227625, Lng: 124.238500
  const res1 = await db
    .update(distributionBoxes)
    .set({
      siteName: 'Iligan City National High School',
      address: '66GQ+3RJ, Gen. Wood Street, Corner Roxas Avenue, Brgy. Mahayahay, Iligan City, 9200 Lanao del Norte',
      latitude: '8.227625',
      longitude: '124.238500',
      updatedAt: new Date(),
    })
    .where(eq(distributionBoxes.code, 'DB-MN-01'))
    .returning();

  console.log('Updated DB-MN-01:', res1);

  // 2. Update MultiFactors Sales (DB-MN-02)
  // Crown Paper and Stationery Warehouse -> Lat: 8.227864, Lng: 124.240089
  const res2 = await db
    .update(distributionBoxes)
    .set({
      siteName: 'Multifactors Sales',
      address: 'Crown Paper and Stationery Warehouse, Iligan City, 9200 Lanao del Norte',
      latitude: '8.227864',
      longitude: '124.240089',
      updatedAt: new Date(),
    })
    .where(eq(distributionBoxes.code, 'DB-MN-02'))
    .returning();

  console.log('Updated DB-MN-02:', res2);

  console.log('Location coordinates successfully synchronized!');
  process.exit(0);
}

updateLocations().catch((err) => {
  console.error('Error updating locations:', err);
  process.exit(1);
});
