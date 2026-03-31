import type { KnowledgeGraph, StudentProgress, Quiz, QuizSubmission, QuizResult } from '@mastery/shared';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('mastery_token');
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, { headers, ...options });

  if (res.status === 401) {
    // Token expired or invalid — clear and redirect to login
    localStorage.removeItem('mastery_token');
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const authRegister = (email: string, password: string, name?: string) =>
  fetchJSON<{ user: { id: string; email: string; name: string | null }; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });

export const authLogin = (email: string, password: string) =>
  fetchJSON<{ user: { id: string; email: string; name: string | null }; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const authMe = () =>
  fetchJSON<{ id: string; email: string; name: string | null }>('/auth/me');

// Graphs
export const fetchGraphs = () =>
  fetchJSON<Array<{ id: string; name: string; description: string; nodeCount: number }>>('/graphs');

export const fetchGraph = (id: string) =>
  fetchJSON<KnowledgeGraph>(`/graphs/${id}`);

export const fetchSkillContext = (graphId: string, skillCode: string) =>
  fetchJSON<{ skill: any; prerequisites: any[]; dependents: any[] }>(`/graphs/${graphId}/skills/${skillCode}`);

export const fetchLearningPath = (graphId: string, target: string) =>
  fetchJSON<{ path: any[]; totalSkills: number }>(`/graphs/${graphId}/learning-path?target=${target}`);

// Student progress
export const fetchProgress = (graphId: string) =>
  fetchJSON<StudentProgress>(`/student/progress/${graphId}`);

export const fetchProgressSummary = (graphId: string) =>
  fetchJSON<any>(`/student/progress/${graphId}/summary`);

// Assessment
export const startDiagnostic = (graphId: string) =>
  fetchJSON<Quiz>('/assessment/diagnostic', {
    method: 'POST',
    body: JSON.stringify({ graphId }),
  });

export const startSkillQuiz = (graphId: string, skillId: string) =>
  fetchJSON<Quiz>('/assessment/skill-quiz', {
    method: 'POST',
    body: JSON.stringify({ graphId, skillId }),
  });

export const submitQuiz = (submission: QuizSubmission) =>
  fetchJSON<QuizResult>('/assessment/submit', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
