import type { KnowledgeGraph, SkillMastery, StudentProgress } from '@mastery/shared';
import { getTransitivePrerequisites, getTransitiveDependents } from './graph.js';

const MASTERY_THRESHOLD = 80;
const FAILURE_THRESHOLD = 40;
const DECAY_FACTOR = 0.8;
const MAX_INFERENCE_DEPTH = 5;

/**
 * Forward inference: When a student masters skill X,
 * infer that its prerequisites are also mastered (with decaying confidence)
 */
export function runForwardInference(
  graph: KnowledgeGraph,
  progress: StudentProgress,
  testedSkillCode: string,
  score: number
): void {
  if (score < MASTERY_THRESHOLD) return;

  const nodeMap = new Map(graph.nodes.map(n => [n.code, n]));
  const visited = new Set<string>();
  const queue: Array<{ code: string; depth: number }> = [];

  // Seed with direct dependencies of the tested skill
  const testedNode = nodeMap.get(testedSkillCode);
  if (!testedNode) return;

  for (const dep of testedNode.dependencies) {
    queue.push({ code: dep, depth: 1 });
  }

  while (queue.length > 0) {
    const { code, depth } = queue.shift()!;

    if (visited.has(code) || depth > MAX_INFERENCE_DEPTH) continue;
    visited.add(code);

    const existing = progress.skillMasteries[code];

    // Direct test always wins — never overwrite
    if (existing?.source === 'direct_test') continue;

    const inferredLevel = Math.round(score * Math.pow(DECAY_FACTOR, depth));
    const inferredConfidence = (score / 100) * Math.pow(DECAY_FACTOR, depth);

    // Only upgrade, never downgrade
    if (inferredLevel > (existing?.level ?? 0)) {
      progress.skillMasteries[code] = {
        skillId: code,
        level: inferredLevel,
        source: 'inferred_from_dependent',
        confidence: Math.round(inferredConfidence * 100) / 100,
        lastTestedAt: existing?.lastTestedAt ?? null,
        attempts: existing?.attempts ?? [],
      };
    }

    // Continue BFS through prerequisites of this node
    const node = nodeMap.get(code);
    if (node) {
      for (const dep of node.dependencies) {
        if (!visited.has(dep)) {
          queue.push({ code: dep, depth: depth + 1 });
        }
      }
    }
  }
}

/**
 * Backward inference: When a student fails a foundational skill,
 * mark dependent skills as "at risk"
 */
export function runBackwardInference(
  graph: KnowledgeGraph,
  progress: StudentProgress,
  failedSkillCode: string,
  score: number
): void {
  if (score >= FAILURE_THRESHOLD) return;

  const dependents = getTransitiveDependents(graph, failedSkillCode);

  for (const depCode of dependents) {
    const existing = progress.skillMasteries[depCode];

    // Direct test always wins
    if (existing?.source === 'direct_test') continue;

    progress.skillMasteries[depCode] = {
      skillId: depCode,
      level: existing?.level ?? 0,
      source: 'inferred_at_risk',
      confidence: 0.3,
      lastTestedAt: existing?.lastTestedAt ?? null,
      attempts: existing?.attempts ?? [],
    };
  }
}

/**
 * Run both inference passes after a quiz result
 */
export function runFullInference(
  graph: KnowledgeGraph,
  progress: StudentProgress,
  skillScores: Record<string, number>
): void {
  for (const [skillCode, score] of Object.entries(skillScores)) {
    // Update the directly tested skill
    const existing = progress.skillMasteries[skillCode];
    progress.skillMasteries[skillCode] = {
      skillId: skillCode,
      level: Math.round(score),
      source: 'direct_test',
      confidence: 1.0,
      lastTestedAt: new Date().toISOString(),
      attempts: [
        ...(existing?.attempts ?? []),
        {
          timestamp: new Date().toISOString(),
          quizId: '', // filled by caller
          score: Math.round(score),
          questionsAnswered: 0, // filled by caller
        },
      ],
    };

    // Run inference
    runForwardInference(graph, progress, skillCode, score);
    runBackwardInference(graph, progress, skillCode, score);
  }
}
