import { getDb } from './db.js';
import type { KnowledgeGraph, SkillNode } from '@mastery/shared';

export function getAllGraphs(): KnowledgeGraph[] {
  const db = getDb();
  const rows = db.prepare('SELECT graph_json FROM graphs').all() as { graph_json: string }[];
  return rows.map(r => JSON.parse(r.graph_json));
}

export function getGraphById(id: string): KnowledgeGraph | null {
  const db = getDb();
  const row = db.prepare('SELECT graph_json FROM graphs WHERE id = ?').get(id) as { graph_json: string } | undefined;
  return row ? JSON.parse(row.graph_json) : null;
}

export function getSkillWithContext(graphId: string, skillCode: string) {
  const graph = getGraphById(graphId);
  if (!graph) return null;

  const skill = graph.nodes.find(n => n.code === skillCode);
  if (!skill) return null;

  const prerequisites = graph.nodes.filter(n => skill.dependencies.includes(n.code));
  const dependents = graph.nodes.filter(n => n.dependencies.includes(skillCode));

  return {
    skill,
    prerequisites,
    dependents,
  };
}

/**
 * Get all transitive prerequisites of a skill (BFS downward through dependencies)
 */
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

/**
 * Get all transitive dependents of a skill (BFS upward through reverse deps)
 */
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

/**
 * Topological sort of graph nodes (Kahn's algorithm)
 */
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

/**
 * Find learning path: unmastered prerequisites in topological order to reach target
 */
export function getLearningPath(
  graphId: string,
  targetCode: string,
  studentId?: string
): { path: SkillNode[]; totalSkills: number } {
  const graph = getGraphById(graphId);
  if (!graph) return { path: [], totalSkills: 0 };

  // Get student progress if available
  let masteredSkills = new Set<string>();
  if (studentId) {
    const db = getDb();
    const row = db.prepare('SELECT masteries_json FROM student_progress WHERE student_id = ? AND graph_id = ?').get(studentId, graphId) as { masteries_json: string } | undefined;
    if (row) {
      const masteries = JSON.parse(row.masteries_json);
      for (const [code, mastery] of Object.entries(masteries)) {
        if ((mastery as { level: number }).level >= 80) {
          masteredSkills.add(code);
        }
      }
    }
  }

  // Get transitive prerequisites
  const prereqs = getTransitivePrerequisites(graph, targetCode);
  prereqs.push(targetCode);

  // Filter to unmastered and sort topologically
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
