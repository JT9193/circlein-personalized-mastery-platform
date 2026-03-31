import { Router, Request, Response } from 'express';
import { getDb } from '../services/db.js';
import { getGraphById, getAllGraphs, getSkillWithContext, getLearningPath } from '../services/graph.js';
import type { KnowledgeGraph } from '@mastery/shared';
import { v4 as uuid } from 'uuid';

export const graphRoutes = Router();

// List all graphs
graphRoutes.get('/', (_req: Request, res: Response) => {
  try {
    const graphs = getAllGraphs();
    res.json(graphs.map(g => ({ id: g.id, name: g.name, description: g.description, nodeCount: g.nodes.length })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch graphs' });
  }
});

// Get full graph
graphRoutes.get('/:id', (req: Request, res: Response) => {
  try {
    const graph = getGraphById(req.params.id);
    if (!graph) {
      res.status(404).json({ error: 'Graph not found' });
      return;
    }
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

// Get skill details with context
graphRoutes.get('/:id/skills/:skillCode', (req: Request, res: Response) => {
  try {
    const result = getSkillWithContext(req.params.id, req.params.skillCode);
    if (!result) {
      res.status(404).json({ error: 'Skill or graph not found' });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
});

// Get learning path to a target skill
graphRoutes.get('/:id/learning-path', (req: Request, res: Response) => {
  try {
    const target = req.query.target as string;
    const studentId = req.query.studentId as string;
    if (!target) {
      res.status(400).json({ error: 'target query param required' });
      return;
    }
    const path = getLearningPath(req.params.id, target, studentId);
    res.json(path);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute learning path' });
  }
});

// Create a new graph
graphRoutes.post('/', (req: Request, res: Response) => {
  try {
    const graph: KnowledgeGraph = { ...req.body, id: req.body.id || uuid() };
    const db = getDb();
    db.prepare('INSERT INTO graphs (id, name, description, graph_json) VALUES (?, ?, ?, ?)').run(
      graph.id,
      graph.name,
      graph.description,
      JSON.stringify(graph)
    );
    res.status(201).json(graph);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create graph' });
  }
});
