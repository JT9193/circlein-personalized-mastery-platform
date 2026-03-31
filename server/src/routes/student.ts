import { Router, Request, Response } from 'express';
import { getStudentProgress, getProgressSummary } from '../services/progress.js';

export const studentRoutes = Router();

// Get full student progress for a graph
studentRoutes.get('/progress/:graphId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const progress = await getStudentProgress(userId, req.params.graphId as string);
    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get progress summary
studentRoutes.get('/progress/:graphId/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const summary = await getProgressSummary(userId, req.params.graphId as string);
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});
