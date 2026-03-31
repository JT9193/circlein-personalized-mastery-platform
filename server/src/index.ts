import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRoutes } from './routes/auth.js';
import { graphRoutes } from './routes/graphs.js';
import { assessmentRoutes } from './routes/assessment.js';
import { studentRoutes } from './routes/student.js';
import { requireAuth } from './middleware/auth.js';
import { initDb } from './services/db.js';
import { seedGraphs } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// CORS: allow localhost in dev, any origin in prod (served from same origin)
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [] // same origin, no CORS needed
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check (no auth)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Graph listing (no auth — so login page can preview)
app.use('/api/graphs', graphRoutes);

// Protected routes (require auth)
app.use('/api/assessment', requireAuth, assessmentRoutes);
app.use('/api/student', requireAuth, studentRoutes);

// Serve client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize DB, seed data, and start
async function start() {
  await initDb();
  await seedGraphs();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
