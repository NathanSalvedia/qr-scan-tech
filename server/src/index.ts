import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import boxesRouter from './routes/boxes.js';
import techniciansRouter from './routes/technicians.js';
import logsRouter from './routes/logs.js';
import settingsRouter from './routes/settings.js';
import subscribersRouter from './routes/subscribers.js';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

import { sql } from 'drizzle-orm';
import { db, syncNeonToLocal } from './db/index.js';

// Middlewares
app.use(cors());
app.use(express.json());

// Automatically mirror Neon -> Local PostgreSQL after any write operation (POST / PUT / PATCH / DELETE)
if (!process.env.VERCEL) {
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setTimeout(() => {
            syncNeonToLocal(false).catch(() => {});
          }, 200);
        }
      });
    }
    next();
  });
}

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/boxes', boxesRouter);
app.use('/api/technicians', techniciansRouter);
app.use('/api/logs', logsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/subscribers', subscribersRouter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbTest = await db.execute(sql`SELECT current_database(), current_user`);
    res.json({
      status: 'ok',
      service: 'qr-scan-tech-backend',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbInfo: dbTest.rows?.[0],
    });
  } catch (err: any) {
    res.json({
      status: 'degraded',
      service: 'qr-scan-tech-backend',
      timestamp: new Date().toISOString(),
      database: 'error',
      dbError: err.message,
      detail: err.cause?.message || err.detail,
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const dbTest = await db.execute(sql`SELECT current_database(), current_user`);
    const tablesTest = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    res.json({
      status: 'ok',
      service: 'qr-scan-tech-backend',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbInfo: dbTest.rows?.[0],
      tables: tablesTest.rows?.map((r: any) => r.table_name),
    });
  } catch (err: any) {
    res.json({
      status: 'degraded',
      service: 'qr-scan-tech-backend',
      timestamp: new Date().toISOString(),
      database: 'error',
      dbError: err.message,
      detail: err.cause?.message || err.detail,
    });
  }
});

// Start Express Server explicitly when running directly (standalone / local dev)
if (!process.env.VERCEL) {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
    console.log(`🌐 Network URL: http://192.168.111.16:${PORT}`);
    console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
    console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard`);
    console.log(`📦 Boxes API: http://localhost:${PORT}/api/boxes`);
    console.log(`👷 Technicians API: http://localhost:${PORT}/api/technicians`);
    console.log(`📋 Activity Logs API: http://localhost:${PORT}/api/logs`);

    // Initial sync from Neon Cloud -> Local PostgreSQL 18 on startup
    syncNeonToLocal(true).catch(() => {});

    // Keep Local PostgreSQL 18 in sync with Neon Cloud every 15 seconds
    setInterval(() => {
      syncNeonToLocal(false).catch(() => {});
    }, 15000);
  });
}

export default app;
