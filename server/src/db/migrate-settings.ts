import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('📦 Creating system_settings table if not exists...');
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS system_settings (
      id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
      company_name VARCHAR(150) NOT NULL DEFAULT 'MultiFactors Network Infrastructure',
      branch_name VARCHAR(150) NOT NULL DEFAULT 'Iligan City Operations',
      office_address TEXT NOT NULL DEFAULT 'Aguinaldo St, Poblacion, Iligan City, 9200',
      hotline VARCHAR(50) NOT NULL DEFAULT '(063) 221-4400',
      mobile_dispatch VARCHAR(50) NOT NULL DEFAULT '+63 917 800 9000',
      placard_header VARCHAR(150) NOT NULL DEFAULT 'MULTIFACTORS · ILIGAN',
      paper_format VARCHAR(100) NOT NULL DEFAULT 'A4 Bondpaper (2 Placards / Sheet)',
      auto_fill_duplicate BOOLEAN NOT NULL DEFAULT true,
      token_prefix VARCHAR(50) NOT NULL DEFAULT 'ScanOps-Box-',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    INSERT INTO system_settings (
      id, company_name, branch_name, office_address, hotline, mobile_dispatch, placard_header, paper_format, auto_fill_duplicate, token_prefix
    ) VALUES (
      'default',
      'MultiFactors Network Infrastructure',
      'Iligan City Operations',
      'Aguinaldo St, Poblacion, Iligan City, 9200',
      '(063) 221-4400',
      '+63 917 800 9000',
      'MULTIFACTORS · ILIGAN',
      'A4 Bondpaper (2 Placards / Sheet)',
      true,
      'ScanOps-Box-'
    ) ON CONFLICT (id) DO NOTHING;
  `);

  const result = await db.execute(sql`SELECT * FROM system_settings WHERE id = 'default'`);
  console.log('✅ system_settings table ready. Current settings:', result.rows[0]);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
