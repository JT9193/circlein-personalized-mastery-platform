/**
 * Parse a markdown knowledge graph into structured JSON.
 * Usage: npx tsx scripts/parse-graph.ts <path-to-markdown> [output-name]
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { SkillNode, SkillEdge, KnowledgeGraph } from '../shared/src/types/graph';

const inputPath = process.argv[2] || path.join(__dirname, '..', '..', 'Downloads', 'calculus_skills_graph.md');
const outputName = process.argv[3] || 'calculus';

function parseMarkdownGraph(markdown: string): KnowledgeGraph {
  const lines = markdown.split('\n');
  const nodes: SkillNode[] = [];
  const edges: SkillEdge[] = [];
  const categories = new Set<string>();

  let currentCategory = '';
  let currentSubcategory = '';
  let currentSkillCode = '';
  let currentSkillTitle = '';
  let currentSkillDesc = '';
  let currentSkillDeps: string[] = [];
  let collectingDescription = false;

  function flushSkill() {
    if (currentSkillCode) {
      nodes.push({
        id: currentSkillCode,
        code: currentSkillCode,
        title: currentSkillTitle,
        description: currentSkillDesc.trim(),
        dependencies: currentSkillDeps,
        category: currentCategory,
        subcategory: currentSubcategory,
      });
      for (const dep of currentSkillDeps) {
        edges.push({ source: dep, target: currentSkillCode });
      }
      categories.add(currentCategory);
    }
    currentSkillCode = '';
    currentSkillTitle = '';
    currentSkillDesc = '';
    currentSkillDeps = [];
    collectingDescription = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Top-level section (# N. Title)
    const sectionMatch = trimmed.match(/^#\s+(\d+)\.\s+(.+)/);
    if (sectionMatch) {
      flushSkill();
      currentCategory = sectionMatch[2].trim();
      currentSubcategory = '';
      continue;
    }

    // Also handle "# How to read this graph" etc
    if (trimmed.startsWith('# ') && !sectionMatch) {
      flushSkill();
      currentCategory = trimmed.replace(/^#\s+/, '').trim();
      currentSubcategory = '';
      continue;
    }

    // Subcategory (## A. Title)
    const subcatMatch = trimmed.match(/^##\s+([A-Z])\.\s+(.+)/);
    if (subcatMatch) {
      flushSkill();
      currentSubcategory = subcatMatch[2].trim();
      continue;
    }

    // Skill header (### CODE. Title)
    const skillMatch = trimmed.match(/^###\s+([A-Z0-9]+-[A-Z0-9]+)\.\s+(.+)/);
    if (skillMatch) {
      flushSkill();
      currentSkillCode = skillMatch[1];
      currentSkillTitle = skillMatch[2].trim();
      collectingDescription = true;
      continue;
    }

    // Also handle practice skills (### M1. etc)
    const practiceMatch = trimmed.match(/^###\s+(M\d+)\.\s+(.+)/);
    if (practiceMatch) {
      flushSkill();
      currentSkillCode = practiceMatch[1];
      currentSkillTitle = practiceMatch[2].trim();
      collectingDescription = true;
      continue;
    }

    // Dependency line
    if (trimmed.startsWith('- Depends on:') || trimmed.startsWith('Depends on:')) {
      const depStr = trimmed.replace(/^-?\s*Depends on:\s*/, '');
      if (depStr.toLowerCase() !== 'none' && depStr.trim() !== '') {
        // Parse dependencies: handle "F-A1, F-A2" and "C2-E4 through C2-E11"
        const depParts = depStr.split(/,\s*/);
        for (const part of depParts) {
          const throughMatch = part.match(/([A-Z0-9]+-[A-Z0-9]+)\s+through\s+([A-Z0-9]+-[A-Z0-9]+)/);
          if (throughMatch) {
            // Expand range: e.g., C2-E4 through C2-E11
            const prefix = throughMatch[1].replace(/\d+$/, '');
            const startNum = parseInt(throughMatch[1].match(/\d+$/)?.[0] || '0');
            const endNum = parseInt(throughMatch[2].match(/\d+$/)?.[0] || '0');
            for (let i = startNum; i <= endNum; i++) {
              currentSkillDeps.push(`${prefix}${i}`);
            }
          } else {
            const dep = part.trim();
            if (dep && dep !== 'none') {
              currentSkillDeps.push(dep);
            }
          }
        }
      }
      collectingDescription = false;
      continue;
    }

    // Description lines (indented under skill, starting with -)
    if (collectingDescription && trimmed.startsWith('-') && !trimmed.startsWith('- Depends')) {
      currentSkillDesc += (currentSkillDesc ? ' ' : '') + trimmed.replace(/^-\s*/, '');
      continue;
    }

    // Plain description line after skill header
    if (collectingDescription && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      currentSkillDesc += (currentSkillDesc ? ' ' : '') + trimmed;
      continue;
    }
  }

  flushSkill();

  // Filter out non-skill nodes (sections like "How to read this graph")
  const validNodes = nodes.filter(n => n.code.match(/^[A-Z0-9]+-[A-Z0-9]+$|^M\d+$/));

  // Validate: check for missing dependency references
  const codeSet = new Set(validNodes.map(n => n.code));
  for (const node of validNodes) {
    node.dependencies = node.dependencies.filter(dep => {
      if (!codeSet.has(dep)) {
        console.warn(`Warning: ${node.code} depends on ${dep} which doesn't exist in graph`);
        return false;
      }
      return true;
    });
  }

  // Rebuild edges after filtering
  const validEdges: SkillEdge[] = [];
  for (const node of validNodes) {
    for (const dep of node.dependencies) {
      validEdges.push({ source: dep, target: node.code });
    }
  }

  return {
    id: outputName,
    name: `Calculus Skills Graph`,
    description: 'Comprehensive calculus skills graph spanning Foundations, Precalculus, Calc I, II, and III',
    nodes: validNodes,
    edges: validEdges,
    categories: Array.from(categories),
  };
}

// Main
const markdown = fs.readFileSync(inputPath, 'utf-8');
const graph = parseMarkdownGraph(markdown);

console.log(`Parsed ${graph.nodes.length} skills and ${graph.edges.length} edges`);
console.log(`Categories: ${graph.categories.join(', ')}`);

// Write output
const outputDir = path.join(__dirname, '..', 'server', 'data', 'graphs');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${outputName}.json`);
fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
console.log(`Written to ${outputPath}`);
