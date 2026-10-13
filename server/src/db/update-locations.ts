import 'dotenv/config';
import { db } from './index';
import { distributionBoxes } from './schema';
import { eq } from 'drizzle-orm';

async function updateLocations() {
  console.log('Updating coordinates and addresses for distribution boxes...');

  // 1. Update Iligan City National High School (DB-MN-01)
  // Entrance on General Wood Street, Mahayahay -> Lat: 8.225963, Lng: 124.238820
  const res1 = await db
    .update(distributionBoxes)
    .set({
      siteName: 'Iligan City National High School',
      address: 'General Wood Street, Brgy. Mahayahay, Iligan City, 9200 Lanao del Norte',
      latitude: '8.225963',
      longitude: '124.238820',
      updatedAt: new Date(),
    })
    .where(eq(distributionBoxes.code, 'DB-MN-01'))
    .returning();

  console.log('Updated DB-MN-01:', res1);

  // 2. Update Multifactors Sales Automation Inc. (DB-MN-02)
  // No. 0005 Juan C. Legaspi Street, Ubaldo D. Laya -> Lat: 8.224150, Lng: 124.243500
  const res2 = await db
    .update(distributionBoxes)
    .set({
      siteName: 'Multifactors Sales Automation Inc.',
      address: 'No. 0005 Juan C. Legaspi Street, Ubaldo D. Laya, Iligan City, 9200 Lanao del Norte',
      latitude: '8.224150',
      longitude: '124.243500',
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
