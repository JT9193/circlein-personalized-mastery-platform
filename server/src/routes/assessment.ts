import { Router, Request, Response } from 'express';
import { createDiagnosticQuiz, createSkillQuiz, submitQuiz } from '../services/assessment.js';

export const assessmentRoutes = Router();

// Start diagnostic test
assessmentRoutes.post('/diagnostic', async (req: Request, res: Response) => {
  try {
    const { graphId, studentId } = req.body;
    if (!graphId || !studentId) {
      res.status(400).json({ error: 'graphId and studentId required' });
      return;
    }
    const quiz = await createDiagnosticQuiz(graphId, studentId);
    res.json(quiz);
  } catch (err) {
    console.error('Diagnostic quiz error:', err);
    res.status(500).json({ error: 'Failed to create diagnostic quiz' });
  }
});

// Start skill-specific quiz
assessmentRoutes.post('/skill-quiz', async (req: Request, res: Response) => {
  try {
    const { graphId, skillId, studentId } = req.body;
    if (!graphId || !skillId || !studentId) {
      res.status(400).json({ error: 'graphId, skillId, and studentId required' });
      return;
    }
    const quiz = await createSkillQuiz(graphId, skillId, studentId);
    res.json(quiz);
  } catch (err) {
    console.error('Skill quiz error:', err);
    res.status(500).json({ error: 'Failed to create skill quiz' });
  }
});

// Submit quiz answers
assessmentRoutes.post('/submit', async (req: Request, res: Response) => {
  try {
    const result = await submitQuiz(req.body);
    res.json(result);
  } catch (err) {
    console.error('Quiz submission error:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});
