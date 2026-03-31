export interface SkillNode {
  id: string;
  code: string;
  title: string;
  description: string;
  dependencies: string[]; // codes of prerequisite skills
  category: string;
  subcategory: string;
}

export interface SkillEdge {
  source: string; // prerequisite skill code
  target: string; // dependent skill code
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  description: string;
  nodes: SkillNode[];
  edges: SkillEdge[];
  categories: string[];
}
