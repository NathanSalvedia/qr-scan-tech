import 'dotenv/config';
import { db } from './index';
import { distributionBoxes } from './schema';
import { eq } from 'drizzle-orm';

async function updateLocations() {
  console.log('Updating coordinates and addresses for distribution boxes...');

  // 1. Update Iligan City National High School (DB-MN-01)
  // Corner Roxas Ave & Gen Wood St -> Lat: 8.225210, Lng: 124.239519
  const res1 = await db
    .update(distributionBoxes)
    .set({
      siteName: 'Iligan City National High School',
      address: '66GQ+3RJ, Gen. Wood Street, Corner Roxas Avenue, Brgy. Mahayahay, Iligan City, 9200 Lanao del Norte',
      latitude: '8.225210',
      longitude: '124.239519',
      updatedAt: new Date(),
    })
    .where(eq(distributionBoxes.code, 'DB-MN-01'))
    .returning();

  console.log('Updated DB-MN-01:', res1);

  // 2. Update Multifactors Sales Automation Inc. (DB-MN-02)
  // Badelles Extension cor. 11th Street, Pala-o -> Lat: 8.224562, Lng: 124.250520
  const res2 = await db
    .update(distributionBoxes)
    .set({
      siteName: 'Multifactors Sales Automation Inc.',
      address: 'Badelles Extension cor. 11th Street, Pala-o, Iligan City, 9200 Lanao del Norte',
      latitude: '8.224562',
      longitude: '124.250520',
      updatedAt: new Date(),
    })
    .where(eq(distributionBoxes.code, 'DB-MN-02'))
    .returning();

  console.log('Updated DB-MN-02:', res2);

  // 3. Update Crown Paper and Stationary Warehouse (DB-SB-01)
  // 11th Street, Pala-o -> Lat: 8.222852, Lng: 124.252893
  const res3 = await db
    .update(distributionBoxes)
    .set({
      siteName: 'Crown Paper and Stationary Warehouse',
      address: '11th Street, Purok 14-A, Barangay Pala-o, Iligan City, 9200 Lanao del Norte',
      latitude: '8.222852',
      longitude: '124.252893',
      updatedAt: new Date(),
    })
    .where(eq(distributionBoxes.code, 'DB-SB-01'))
    .returning();

  console.log('Updated DB-SB-01:', res3);

  console.log('Location coordinates successfully synchronized!');
  process.exit(0);
}

updateLocations().catch((err) => {
  console.error('Error updating locations:', err);
  process.exit(1);
});
