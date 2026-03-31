import { getDb } from './db.js';
import { getGraphById } from './graph.js';
import type { StudentProgress, SkillMastery } from '@mastery/shared';
import { v4 as uuid } from 'uuid';

export function getStudentProgress(studentId: string, graphId: string): StudentProgress {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM student_progress WHERE student_id = ? AND graph_id = ?'
  ).get(studentId, graphId) as { masteries_json: string; overall_progress: number; updated_at: string } | undefined;

  if (row) {
    return {
      studentId,
      graphId,
      skillMasteries: JSON.parse(row.masteries_json),
      overallProgress: row.overall_progress,
      lastUpdated: row.updated_at,
    };
  }

  // Return empty progress
  return {
    studentId,
    graphId,
    skillMasteries: {},
    overallProgress: 0,
    lastUpdated: new Date().toISOString(),
  };
}

export function saveStudentProgress(progress: StudentProgress): void {
  const db = getDb();
  const graph = getGraphById(progress.graphId);
  const totalSkills = graph?.nodes.length || 1;

  // Calculate overall progress
  const masteredCount = Object.values(progress.skillMasteries)
    .filter(m => m.level >= 80).length;
  progress.overallProgress = Math.round((masteredCount / totalSkills) * 100);
  progress.lastUpdated = new Date().toISOString();

  db.prepare(`
    INSERT INTO student_progress (id, student_id, graph_id, masteries_json, overall_progress, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, graph_id) DO UPDATE SET
      masteries_json = excluded.masteries_json,
      overall_progress = excluded.overall_progress,
      updated_at = excluded.updated_at
  `).run(
    uuid(),
    progress.studentId,
    progress.graphId,
    JSON.stringify(progress.skillMasteries),
    progress.overallProgress,
    progress.lastUpdated
  );
}

export function getProgressSummary(studentId: string, graphId: string) {
  const progress = getStudentProgress(studentId, graphId);
  const graph = getGraphById(graphId);
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

  // Suggest next skills: unmastered skills whose prerequisites are all mastered
  const masteredCodes = new Set(
    Object.entries(masteries).filter(([, m]) => m.level >= 80).map(([code]) => code)
  );
  const suggestedNext = graph.nodes
    .filter(n => !masteredCodes.has(n.code) && n.dependencies.every(d => masteredCodes.has(d)))
    .slice(0, 5);

  return {
    totalSkills,
    mastered,
    inProgress,
    testedWeak,
    notStarted,
    atRisk,
    overallProgress: progress.overallProgress,
    byCategory,
    suggestedNext,
  };
}
