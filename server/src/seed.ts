/**
 * Seed the database with the parsed calculus graph
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getDb } from './services/db.js';
import type { KnowledgeGraph } from '@mastery/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function seedGraphs(): void {
  const db = getDb();
  const graphsDir = path.join(__dirname, '..', 'data', 'graphs');

  if (!fs.existsSync(graphsDir)) {
    console.log('No graphs directory found, skipping seed');
    return;
  }

  const files = fs.readdirSync(graphsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const graphJson = fs.readFileSync(path.join(graphsDir, file), 'utf-8');
    const graph: KnowledgeGraph = JSON.parse(graphJson);

    // Upsert
    const existing = db.prepare('SELECT id FROM graphs WHERE id = ?').get(graph.id);
    if (existing) {
      db.prepare('UPDATE graphs SET name = ?, description = ?, graph_json = ? WHERE id = ?').run(
        graph.name, graph.description, graphJson, graph.id
      );
      console.log(`Updated graph: ${graph.name} (${graph.nodes.length} skills)`);
    } else {
      db.prepare('INSERT INTO graphs (id, name, description, graph_json) VALUES (?, ?, ?, ?)').run(
        graph.id, graph.name, graph.description, graphJson
      );
      console.log(`Seeded graph: ${graph.name} (${graph.nodes.length} skills)`);
    }
  }
}
