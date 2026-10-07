import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import boxesRouter from './routes/boxes.js';
import techniciansRouter from './routes/technicians.js';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/boxes', boxesRouter);
app.use('/api/technicians', techniciansRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'qr-scan-tech-backend',
    timestamp: new Date().toISOString(),
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard`);
  console.log(`📦 Boxes API: http://localhost:${PORT}/api/boxes`);
  console.log(`👷 Technicians API: http://localhost:${PORT}/api/technicians`);
});
