export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'worked_problem';

export interface Question {
  id: string;
  skillId: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
  source: 'bank' | 'ai_generated';
}

export type QuizType = 'diagnostic' | 'skill_quiz';

export interface Quiz {
  id: string;
  type: QuizType;
  graphId: string;
  skillIds: string[];
  questions: Question[];
  createdAt: string;
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
}

export interface QuizSubmission {
  quizId: string;
  studentId: string;
  graphId: string;
  answers: QuizAnswer[];
}

export interface SkillScore {
  skillId: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface QuizResult {
  quizId: string;
  overallScore: number;
  perSkillScores: SkillScore[];
  masteryUpdates: Record<string, { level: number; source: string }>;
  timestamp: string;
}
