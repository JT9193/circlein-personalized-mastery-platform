import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './services/db.js';
import type { KnowledgeGraph } from '@mastery/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function seedGraphs(): Promise<void> {
  const graphsDir = path.join(__dirname, '..', 'data', 'graphs');

  if (!fs.existsSync(graphsDir)) {
    console.log('No graphs directory found, skipping seed');
    return;
  }

  const files = fs.readdirSync(graphsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const graphJson = fs.readFileSync(path.join(graphsDir, file), 'utf-8');
    const graph: KnowledgeGraph = JSON.parse(graphJson);

    await query(
      `INSERT INTO graphs (id, name, description, graph_json)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = $2, description = $3, graph_json = $4`,
      [graph.id, graph.name, graph.description, graphJson]
    );
    console.log(`Seeded graph: ${graph.name} (${graph.nodes.length} skills)`);
  }
}
