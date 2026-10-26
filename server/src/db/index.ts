import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
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
