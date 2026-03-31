import { Router, Request, Response } from 'express';
import { query } from '../services/db.js';
import { getGraphById, getAllGraphs, getSkillWithContext, getLearningPath } from '../services/graph.js';
import type { KnowledgeGraph } from '@mastery/shared';

export const graphRoutes = Router();

// List all graphs
graphRoutes.get('/', async (_req: Request, res: Response) => {
  try {
    const graphs = await getAllGraphs();
    res.json(graphs.map(g => ({ id: g.id, name: g.name, description: g.description, nodeCount: g.nodes.length })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch graphs' });
  }
});

// Get full graph
graphRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const graph = await getGraphById(req.params.id as string);
    if (!graph) { res.status(404).json({ error: 'Graph not found' }); return; }
    res.json(graph);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

// Get skill details with context
graphRoutes.get('/:id/skills/:skillCode', async (req: Request, res: Response) => {
  try {
    const result = await getSkillWithContext(req.params.id as string, req.params.skillCode as string);
    if (!result) { res.status(404).json({ error: 'Skill or graph not found' }); return; }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
});

// Get learning path to a target skill
graphRoutes.get('/:id/learning-path', async (req: Request, res: Response) => {
  try {
    const target = req.query.target as string;
    const userId = (req as any).user?.id;
    if (!target) { res.status(400).json({ error: 'target query param required' }); return; }
    const path = await getLearningPath(req.params.id as string, target, userId);
    res.json(path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute learning path' });
  }
});

// Create a new graph
graphRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const graph: KnowledgeGraph = { ...req.body, id: req.body.id || crypto.randomUUID() };
    await query(
      'INSERT INTO graphs (id, name, description, graph_json) VALUES ($1, $2, $3, $4)',
      [graph.id, graph.name, graph.description, JSON.stringify(graph)]
    );
    res.status(201).json(graph);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create graph' });
  }
});
