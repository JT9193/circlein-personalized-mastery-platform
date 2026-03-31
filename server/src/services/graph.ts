import { query } from './db.js';
import type { KnowledgeGraph, SkillNode } from '@mastery/shared';

export async function getAllGraphs(): Promise<KnowledgeGraph[]> {
  const result = await query('SELECT graph_json FROM graphs');
  return result.rows.map(r => r.graph_json);
}

export async function getGraphById(id: string): Promise<KnowledgeGraph | null> {
  const result = await query('SELECT graph_json FROM graphs WHERE id = $1', [id]);
  return result.rows[0]?.graph_json ?? null;
}

export async function getSkillWithContext(graphId: string, skillCode: string) {
  const graph = await getGraphById(graphId);
  if (!graph) return null;

  const skill = graph.nodes.find(n => n.code === skillCode);
  if (!skill) return null;

  const prerequisites = graph.nodes.filter(n => skill.dependencies.includes(n.code));
  const dependents = graph.nodes.filter(n => n.dependencies.includes(skillCode));

  return { skill, prerequisites, dependents };
}

export function getTransitivePrerequisites(graph: KnowledgeGraph, skillCode: string): string[] {
  const nodeMap = new Map(graph.nodes.map(n => [n.code, n]));
  const visited = new Set<string>();
  const queue = [skillCode];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodeMap.get(current);
    if (!node) continue;

    for (const dep of node.dependencies) {
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
      }
    }
  }

  return Array.from(visited);
}

export function getTransitiveDependents(graph: KnowledgeGraph, skillCode: string): string[] {
  const visited = new Set<string>();
  const queue = [skillCode];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const node of graph.nodes) {
      if (node.dependencies.includes(current) && !visited.has(node.code)) {
        visited.add(node.code);
        queue.push(node.code);
      }
    }
  }

  return Array.from(visited);
}

export function topologicalSort(graph: KnowledgeGraph): string[] {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inDegree.set(node.code, 0);
    adjList.set(node.code, []);
  }

  for (const node of graph.nodes) {
    for (const dep of node.dependencies) {
      if (adjList.has(dep)) {
        adjList.get(dep)!.push(node.code);
        inDegree.set(node.code, (inDegree.get(node.code) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [code, degree] of inDegree) {
    if (degree === 0) queue.push(code);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjList.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return sorted;
}

export async function getLearningPath(
  graphId: string,
  targetCode: string,
  userId?: string
): Promise<{ path: SkillNode[]; totalSkills: number }> {
  const graph = await getGraphById(graphId);
  if (!graph) return { path: [], totalSkills: 0 };

  let masteredSkills = new Set<string>();
  if (userId) {
    const result = await query(
      'SELECT masteries_json FROM student_progress WHERE user_id = $1 AND graph_id = $2',
      [userId, graphId]
    );
    if (result.rows[0]) {
      const masteries = result.rows[0].masteries_json as Record<string, { level: number }>;
      for (const [code, mastery] of Object.entries(masteries)) {
        if (mastery.level >= 80) {
          masteredSkills.add(code);
        }
      }
    }
  }

  const prereqs = getTransitivePrerequisites(graph, targetCode);
  prereqs.push(targetCode);

  const topoOrder = topologicalSort(graph);
  const orderMap = new Map(topoOrder.map((code, i) => [code, i]));

  const nodeMap = new Map(graph.nodes.map(n => [n.code, n]));
  const unmastered = prereqs
    .filter(code => !masteredSkills.has(code))
    .sort((a, b) => (orderMap.get(a) || 0) - (orderMap.get(b) || 0))
    .map(code => nodeMap.get(code)!)
    .filter(Boolean);

  return { path: unmastered, totalSkills: prereqs.length };
}
