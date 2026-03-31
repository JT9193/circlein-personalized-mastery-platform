import { create } from 'zustand';
import type { KnowledgeGraph, StudentProgress, MasteryStatus, SkillMastery } from '@mastery/shared';
import { getMasteryStatus } from '@mastery/shared';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;

  // Graph
  graph: KnowledgeGraph | null;
  setGraph: (graph: KnowledgeGraph) => void;

  // Selection
  selectedSkillCode: string | null;
  selectSkill: (code: string | null) => void;

  // Filters
  filterCategory: string | null;
  filterStatus: MasteryStatus | null;
  setFilterCategory: (cat: string | null) => void;
  setFilterStatus: (status: MasteryStatus | null) => void;

  // Progress
  progress: StudentProgress | null;
  setProgress: (progress: StudentProgress) => void;
  getMastery: (skillCode: string) => SkillMastery | null;
  getStatus: (skillCode: string) => MasteryStatus;

  // Quiz
  activeQuizId: string | null;
  setActiveQuizId: (id: string | null) => void;
}

function loadAuth(): { user: User | null; token: string | null } {
  const token = localStorage.getItem('mastery_token');
  const userStr = localStorage.getItem('mastery_user');
  if (token && userStr) {
    try {
      return { user: JSON.parse(userStr), token };
    } catch {
      return { user: null, token: null };
    }
  }
  return { user: null, token: null };
}

export const useAppStore = create<AppState>((set, get) => {
  const initial = loadAuth();

  return {
    user: initial.user,
    token: initial.token,

    setAuth: (user, token) => {
      localStorage.setItem('mastery_token', token);
      localStorage.setItem('mastery_user', JSON.stringify(user));
      set({ user, token });
    },

    logout: () => {
      localStorage.removeItem('mastery_token');
      localStorage.removeItem('mastery_user');
      set({ user: null, token: null, progress: null, graph: null, selectedSkillCode: null });
    },

    isAuthenticated: () => !!get().token,

    graph: null,
    setGraph: (graph) => set({ graph }),

    selectedSkillCode: null,
    selectSkill: (code) => set({ selectedSkillCode: code }),

    filterCategory: null,
    filterStatus: null,
    setFilterCategory: (cat) => set({ filterCategory: cat }),
    setFilterStatus: (status) => set({ filterStatus: status }),

    progress: null,
    setProgress: (progress) => set({ progress }),

    getMastery: (skillCode) => {
      const { progress } = get();
      if (!progress) return null;
      return progress.skillMasteries[skillCode] || null;
    },

    getStatus: (skillCode) => {
      const mastery = get().getMastery(skillCode);
      if (!mastery) return 'not_started';
      if (mastery.source === 'inferred_at_risk') return 'tested_weak';
      return getMasteryStatus(mastery.level);
    },

    activeQuizId: null,
    setActiveQuizId: (id) => set({ activeQuizId: id }),
  };
});
