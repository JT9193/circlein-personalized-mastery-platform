import type { KnowledgeGraph, StudentProgress, Quiz, QuizSubmission, QuizResult } from '@mastery/shared';

const BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Graphs
export const fetchGraphs = () =>
  fetchJSON<Array<{ id: string; name: string; description: string; nodeCount: number }>>('/graphs');

export const fetchGraph = (id: string) =>
  fetchJSON<KnowledgeGraph>(`/graphs/${id}`);

export const fetchSkillContext = (graphId: string, skillCode: string) =>
  fetchJSON<{ skill: any; prerequisites: any[]; dependents: any[] }>(`/graphs/${graphId}/skills/${skillCode}`);

export const fetchLearningPath = (graphId: string, target: string, studentId: string) =>
  fetchJSON<{ path: any[]; totalSkills: number }>(`/graphs/${graphId}/learning-path?target=${target}&studentId=${studentId}`);

// Student progress
export const fetchProgress = (studentId: string, graphId: string) =>
  fetchJSON<StudentProgress>(`/student/${studentId}/progress/${graphId}`);

export const fetchProgressSummary = (studentId: string, graphId: string) =>
  fetchJSON<any>(`/student/${studentId}/progress/${graphId}/summary`);

// Assessment
export const startDiagnostic = (graphId: string, studentId: string) =>
  fetchJSON<Quiz>('/assessment/diagnostic', {
    method: 'POST',
    body: JSON.stringify({ graphId, studentId }),
  });

export const startSkillQuiz = (graphId: string, skillId: string, studentId: string) =>
  fetchJSON<Quiz>('/assessment/skill-quiz', {
    method: 'POST',
    body: JSON.stringify({ graphId, skillId, studentId }),
  });

export const submitQuiz = (submission: QuizSubmission) =>
  fetchJSON<QuizResult>('/assessment/submit', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
