import { Router, Request, Response } from 'express';
import { createDiagnosticQuiz, createSkillQuiz, submitQuiz } from '../services/assessment.js';

export const assessmentRoutes = Router();

// Start diagnostic test
assessmentRoutes.post('/diagnostic', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { graphId } = req.body;
    if (!graphId) { res.status(400).json({ error: 'graphId required' }); return; }
    const quiz = await createDiagnosticQuiz(graphId, userId);
    res.json(quiz);
  } catch (err) {
    console.error('Diagnostic quiz error:', err);
    res.status(500).json({ error: 'Failed to create diagnostic quiz' });
  }
});

// Start skill-specific quiz
assessmentRoutes.post('/skill-quiz', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { graphId, skillId } = req.body;
    if (!graphId || !skillId) { res.status(400).json({ error: 'graphId and skillId required' }); return; }
    const quiz = await createSkillQuiz(graphId, skillId, userId);
    res.json(quiz);
  } catch (err) {
    console.error('Skill quiz error:', err);
    res.status(500).json({ error: 'Failed to create skill quiz' });
  }
});

// Submit quiz answers
assessmentRoutes.post('/submit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    // Override studentId with authenticated user
    const submission = { ...req.body, studentId: userId };
    const result = await submitQuiz(submission);
    res.json(result);
  } catch (err) {
    console.error('Quiz submission error:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});
