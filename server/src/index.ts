import express from 'express';
import cors from 'cors';
import { graphRoutes } from './routes/graphs.js';
import { assessmentRoutes } from './routes/assessment.js';
import { studentRoutes } from './routes/student.js';
import { initDb } from './services/db.js';
import { seedGraphs } from './seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/graphs', graphRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/student', studentRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize DB, seed data, and start
initDb();
seedGraphs();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
