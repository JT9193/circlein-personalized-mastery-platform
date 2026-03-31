import { Router, Request, Response } from 'express';
import { getStudentProgress, getProgressSummary } from '../services/progress.js';

export const studentRoutes = Router();

// Get full student progress for a graph
studentRoutes.get('/:studentId/progress/:graphId', (req: Request, res: Response) => {
  try {
    const progress = getStudentProgress(req.params.studentId, req.params.graphId);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get progress summary
studentRoutes.get('/:studentId/progress/:graphId/summary', (req: Request, res: Response) => {
  try {
    const summary = getProgressSummary(req.params.studentId, req.params.graphId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});
