export type MasterySource =
  | 'direct_test'
  | 'inferred_from_dependent'
  | 'inferred_at_risk'
  | 'not_assessed';

export type MasteryStatus =
  | 'not_started'
  | 'in_progress'
  | 'mastered'
  | 'tested_weak';

export interface AttemptRecord {
  timestamp: string;
  quizId: string;
  score: number;
  questionsAnswered: number;
}

export interface SkillMastery {
  skillId: string;
  level: number; // 0-100
  source: MasterySource;
  confidence: number; // 0-1
  lastTestedAt: string | null;
  attempts: AttemptRecord[];
}

export interface StudentProgress {
  studentId: string;
  graphId: string;
  skillMasteries: Record<string, SkillMastery>;
  overallProgress: number; // 0-100
  lastUpdated: string;
}

/**
 * Compute display status from mastery level
 */
export function getMasteryStatus(level: number): MasteryStatus {
  if (level === 0) return 'not_started';
  if (level < 40) return 'tested_weak';
  if (level < 80) return 'in_progress';
  return 'mastered';
}
