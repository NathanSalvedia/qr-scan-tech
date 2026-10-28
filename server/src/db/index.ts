import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
const isLocal = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool({
  connectionString,
  max: process.env.VERCEL ? 3 : 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Prevent unhandled pool idle socket disconnects (common with serverless Postgres like Neon)
pool.on('error', (err) => {
  console.warn('[DB Pool] Idle client connection error (recycled):', err.message);
});

export const db = drizzle(pool, { schema });

// Optional Local PostgreSQL Mirror (PostgreSQL 18 - qr_scan_tech)
const localConnectionString = !process.env.VERCEL ? process.env.LOCAL_DATABASE_URL : undefined;

export const localPool = localConnectionString
  ? new Pool({
      connectionString: localConnectionString,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: false,
    })
  : null;

if (localPool) {
  localPool.on('error', (err) => {
    console.warn('[Local DB Pool] Connection warning:', err.message);
  });
}

export const localDb = localPool ? drizzle(localPool, { schema }) : null;

/**
 * Retries a database operation if an idle PostgreSQL connection was recycled by the serverless host.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

let isSyncingLocal = false;

/**
 * Mirrors all tables from Neon Cloud DB (db) into Local PostgreSQL 18 (localDb)
 * so both databases in pgAdmin 4 always have identical rows.
 */
export async function syncNeonToLocal(verbose = false): Promise<boolean> {
  if (!localDb || isSyncingLocal) return false;
  isSyncingLocal = true;

  try {
    // 1. Ensure all tables exist in local qr_scan_tech database
    await localDb.execute(sql`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone_number VARCHAR(20),
        password_hash TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        mode VARCHAR(50) NOT NULL DEFAULT 'verification',
        is_used BOOLEAN NOT NULL DEFAULT false,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        city VARCHAR(100),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS distribution_boxes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(30) NOT NULL UNIQUE,
        category VARCHAR(20) NOT NULL DEFAULT 'SUB_BOX',
        parent_box_id UUID,
        site_name VARCHAR(150) NOT NULL,
        address TEXT NOT NULL,
        mounting_type VARCHAR(40) NOT NULL DEFAULT 'Utility Pole',
        latitude NUMERIC NOT NULL,
        longitude NUMERIC NOT NULL,
        total_ports INTEGER NOT NULL DEFAULT 24,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        qr_token VARCHAR(120) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS client_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        box_id UUID NOT NULL,
        port_number INTEGER NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        customer_name VARCHAR(150) NOT NULL,
        client_type VARCHAR(50) DEFAULT 'RESIDENTIAL',
        service_plan VARCHAR(100),
        signal_dbm VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
        connected_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS equipment_catalog (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50),
        equipment_type VARCHAR(50),
        specifications TEXT
      );

      CREATE TABLE IF NOT EXISTS box_equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        box_id UUID NOT NULL,
        catalog_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'OPERATIONAL',
        installed_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS qr_dispatches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        box_id UUID NOT NULL,
        dispatched_by UUID NOT NULL,
        batch_number VARCHAR(60),
        sticker_size VARCHAR(30) DEFAULT '50x50mm Door Placard',
        tag_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_AFFIX',
        printed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        affixed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS scan_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        box_id UUID NOT NULL,
        technician_id UUID NOT NULL,
        scan_type VARCHAR(50) NOT NULL DEFAULT 'CAMERA_QR',
        padlock_verified BOOLEAN NOT NULL DEFAULT true,
        audit_notes TEXT,
        box_status_at_scan VARCHAR(50) NOT NULL,
        scan_latitude NUMERIC,
        scan_longitude NUMERIC,
        distance_meters INTEGER,
        location_verified BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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
        token_prefix VARCHAR(50) NOT NULL DEFAULT 'QRTECH-BOX-',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_number VARCHAR(10) NOT NULL UNIQUE,
        customer_name VARCHAR(150) NOT NULL,
        subscriber_type VARCHAR(50) NOT NULL DEFAULT 'Residential',
        service_plan VARCHAR(100) NOT NULL,
        contact_number VARCHAR(30),
        email VARCHAR(255),
        address TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PROVISIONING',
        assigned_box_id UUID,
        assigned_port VARCHAR(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch current live data from Neon Cloud DB
    const [
      neonUsers,
      neonZones,
      neonCatalog,
      neonBoxes,
      neonClients,
      neonBoxEquip,
      neonDispatches,
      neonScanLogs,
      neonSettings,
      neonSubscribers,
    ] = await withDbRetry(() =>
      Promise.all([
        db.select().from(schema.users),
        db.select().from(schema.zones),
        db.select().from(schema.equipmentCatalog),
        db.select().from(schema.distributionBoxes),
        db.select().from(schema.clientConnections),
        db.select().from(schema.boxEquipment),
        db.select().from(schema.qrDispatches),
        db.select().from(schema.scanAuditLogs),
        db.select().from(schema.systemSettings),
        db.select().from(schema.subscribers),
      ])
    );

    // 3. Replace local tables in a transaction so local qr_scan_tech mirrors Neon 1:1
    await localDb.transaction(async (tx) => {
      await tx.execute(sql`
        TRUNCATE TABLE
          scan_audit_logs,
          qr_dispatches,
          client_connections,
          box_equipment,
          equipment_catalog,
          distribution_boxes,
          subscribers,
          zones,
          system_settings,
          users
        RESTART IDENTITY CASCADE;
      `);

      if (neonUsers.length > 0) await tx.insert(schema.users).values(neonUsers);
      if (neonZones.length > 0) await tx.insert(schema.zones).values(neonZones);
      if (neonCatalog.length > 0) await tx.insert(schema.equipmentCatalog).values(neonCatalog);
      if (neonBoxes.length > 0) await tx.insert(schema.distributionBoxes).values(neonBoxes);
      if (neonClients.length > 0) await tx.insert(schema.clientConnections).values(neonClients);
      if (neonBoxEquip.length > 0) await tx.insert(schema.boxEquipment).values(neonBoxEquip);
      if (neonDispatches.length > 0) await tx.insert(schema.qrDispatches).values(neonDispatches);
      if (neonScanLogs.length > 0) await tx.insert(schema.scanAuditLogs).values(neonScanLogs);
      if (neonSettings.length > 0) await tx.insert(schema.systemSettings).values(neonSettings);
      if (neonSubscribers.length > 0) await tx.insert(schema.subscribers).values(neonSubscribers);
    });

    if (verbose) {
      console.log(
        `🔄 [DB Mirror] Synced Neon -> Local (qr_scan_tech): ${neonBoxes.length} boxes, ${neonClients.length} clients, ${neonSubscribers.length} subscribers, ${neonUsers.length} users.`
      );
    }
    return true;
  } catch (err: any) {
    if (verbose) {
      console.warn('⚠️ [DB Mirror] Could not sync to local PostgreSQL:', err.message);
    }
    return false;
  } finally {
    isSyncingLocal = false;
  }
}
