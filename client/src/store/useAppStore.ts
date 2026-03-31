import { create } from 'zustand';
import type { KnowledgeGraph, StudentProgress, MasteryStatus, SkillMastery } from '@mastery/shared';
import { getMasteryStatus } from '@mastery/shared';

interface AppState {
  // Student
  studentId: string;

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

function getOrCreateStudentId(): string {
  const key = 'mastery_student_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export const useAppStore = create<AppState>((set, get) => ({
  studentId: getOrCreateStudentId(),

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
}));
