import { query } from './db.js';
import { getGraphById } from './graph.js';
import type { StudentProgress, SkillMastery } from '@mastery/shared';

export async function getStudentProgress(userId: string, graphId: string): Promise<StudentProgress> {
  const result = await query(
    'SELECT masteries_json, overall_progress, updated_at FROM student_progress WHERE user_id = $1 AND graph_id = $2',
    [userId, graphId]
  );

  if (result.rows[0]) {
    return {
      studentId: userId,
      graphId,
      skillMasteries: result.rows[0].masteries_json as Record<string, SkillMastery>,
      overallProgress: result.rows[0].overall_progress,
      lastUpdated: result.rows[0].updated_at,
    };
  }

  return {
    studentId: userId,
    graphId,
    skillMasteries: {},
    overallProgress: 0,
    lastUpdated: new Date().toISOString(),
  };
}

export async function saveStudentProgress(progress: StudentProgress): Promise<void> {
  const graph = await getGraphById(progress.graphId);
  const totalSkills = graph?.nodes.length || 1;

  const masteredCount = Object.values(progress.skillMasteries)
    .filter(m => m.level >= 80).length;
  progress.overallProgress = Math.round((masteredCount / totalSkills) * 100);
  progress.lastUpdated = new Date().toISOString();

  await query(
    `INSERT INTO student_progress (user_id, graph_id, masteries_json, overall_progress, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, graph_id) DO UPDATE SET
       masteries_json = $3, overall_progress = $4, updated_at = $5`,
    [progress.studentId, progress.graphId, JSON.stringify(progress.skillMasteries), progress.overallProgress, progress.lastUpdated]
  );
}

export async function getProgressSummary(userId: string, graphId: string) {
  const progress = await getStudentProgress(userId, graphId);
  const graph = await getGraphById(graphId);
  if (!graph) return null;

  const totalSkills = graph.nodes.length;
  const masteries = progress.skillMasteries;

  let mastered = 0, inProgress = 0, testedWeak = 0, notStarted = 0, atRisk = 0;
  const byCategory: Record<string, { total: number; mastered: number }> = {};

  for (const node of graph.nodes) {
    const cat = node.category;
    if (!byCategory[cat]) byCategory[cat] = { total: 0, mastered: 0 };
    byCategory[cat].total++;

    const m = masteries[node.code];
    if (!m || m.level === 0) { notStarted++; }
    else if (m.source === 'inferred_at_risk') { atRisk++; }
    else if (m.level >= 80) { mastered++; byCategory[cat].mastered++; }
    else if (m.level >= 40) { inProgress++; }
    else { testedWeak++; }
  }

  const masteredCodes = new Set(
    Object.entries(masteries).filter(([, m]) => m.level >= 80).map(([code]) => code)
  );
  const suggestedNext = graph.nodes
    .filter(n => !masteredCodes.has(n.code) && n.dependencies.every(d => masteredCodes.has(d)))
    .slice(0, 5);

  return {
    totalSkills, mastered, inProgress, testedWeak, notStarted, atRisk,
    overallProgress: progress.overallProgress,
    byCategory, suggestedNext,
  };
}
