import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { KnowledgeGraph, MasteryStatus } from '@mastery/shared';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

export interface SkillNodeData {
  code: string;
  title: string;
  category: string;
  status: MasteryStatus;
  level: number;
  confidence: number;
  source: string;
  [key: string]: unknown;
}

export function layoutGraph(
  graph: KnowledgeGraph,
  getStatus: (code: string) => MasteryStatus,
  getMastery: (code: string) => { level: number; confidence: number; source: string } | null,
  filterCategory?: string | null,
  filterStatus?: MasteryStatus | null
): { nodes: Node<SkillNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 });

  // Filter nodes
  let filteredNodes = graph.nodes;
  if (filterCategory) {
    filteredNodes = filteredNodes.filter(n => n.category === filterCategory);
  }
  if (filterStatus) {
    filteredNodes = filteredNodes.filter(n => getStatus(n.code) === filterStatus);
  }

  const nodeCodeSet = new Set(filteredNodes.map(n => n.code));

  // Add nodes to dagre
  for (const node of filteredNodes) {
    g.setNode(node.code, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add edges (only between visible nodes)
  const edges: Edge[] = [];
  for (const edge of graph.edges) {
    if (nodeCodeSet.has(edge.source) && nodeCodeSet.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
      edges.push({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      });
    }
  }

  dagre.layout(g);

  // Convert to React Flow nodes
  const nodes: Node<SkillNodeData>[] = filteredNodes.map(node => {
    const position = g.node(node.code);
    const mastery = getMastery(node.code);
    const status = getStatus(node.code);

    return {
      id: node.code,
      type: 'skillNode',
      position: {
        x: (position?.x ?? 0) - NODE_WIDTH / 2,
        y: (position?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: {
        code: node.code,
        title: node.title,
        category: node.category,
        status,
        level: mastery?.level ?? 0,
        confidence: mastery?.confidence ?? 0,
        source: mastery?.source ?? 'not_assessed',
      },
    };
  });

  return { nodes, edges };
}
