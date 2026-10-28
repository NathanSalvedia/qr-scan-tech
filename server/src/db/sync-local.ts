import { syncNeonToLocal } from './index.js';

async function runSync() {
  console.log('🔄 Starting manual database mirror sync (Neon Cloud -> Local qr_scan_tech)...');
  const ok = await syncNeonToLocal(true);
  if (ok) {
    console.log('✅ Local database (qr_scan_tech) is now 100% in sync with Neon Cloud (neondb)!');
    process.exit(0);
  } else {
    console.error('❌ Sync failed. Make sure PostgreSQL 18 is running locally and LOCAL_DATABASE_URL is set in .env.');
    process.exit(1);
  }
}

runSync();
