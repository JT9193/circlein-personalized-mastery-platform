import { v4 as uuid } from 'uuid';
import { getDb } from './db.js';
import { getGraphById } from './graph.js';
import { getStudentProgress, saveStudentProgress } from './progress.js';
import { getOrGenerateQuestions } from './questions.js';
import { runFullInference } from './inference.js';
import type { Quiz, QuizSubmission, QuizResult, Question, SkillScore } from '@mastery/shared';

/**
 * Create a diagnostic quiz that tests across multiple skill levels.
 * Strategy: pick 1-2 skills per subcategory, prioritizing mid-level skills.
 */
export async function createDiagnosticQuiz(graphId: string, studentId: string): Promise<Quiz> {
  const graph = getGraphById(graphId);
  if (!graph) throw new Error('Graph not found');

  // Group skills by subcategory
  const bySubcategory = new Map<string, typeof graph.nodes>();
  for (const node of graph.nodes) {
    const key = `${node.category}::${node.subcategory}`;
    if (!bySubcategory.has(key)) bySubcategory.set(key, []);
    bySubcategory.get(key)!.push(node);
  }

  // Select 1-2 representative skills per subcategory
  const selectedSkills: typeof graph.nodes = [];
  for (const [, skills] of bySubcategory) {
    // Pick from the middle (not too easy, not too hard)
    const sorted = skills.sort((a, b) => a.dependencies.length - b.dependencies.length);
    const midIdx = Math.floor(sorted.length / 2);
    selectedSkills.push(sorted[midIdx]);
    if (sorted.length > 3) {
      // Also pick one from the higher end
      const highIdx = Math.floor(sorted.length * 0.75);
      selectedSkills.push(sorted[highIdx]);
    }
  }

  // Limit to ~20 skills for a reasonable diagnostic length
  const diagnosticSkills = selectedSkills.slice(0, 20);

  // Get 1 question per skill for diagnostic (keep it manageable)
  const allQuestions: Question[] = [];
  for (const skill of diagnosticSkills) {
    const questions = await getOrGenerateQuestions(skill, 1);
    allQuestions.push(...questions);
  }

  const quiz: Quiz = {
    id: uuid(),
    type: 'diagnostic',
    graphId,
    skillIds: diagnosticSkills.map(s => s.code),
    questions: allQuestions,
    createdAt: new Date().toISOString(),
  };

  // Store quiz in DB
  const db = getDb();
  db.prepare('INSERT INTO quiz_history (id, student_id, graph_id, quiz_json) VALUES (?, ?, ?, ?)').run(
    quiz.id, studentId, graphId, JSON.stringify(quiz)
  );

  return quiz;
}

/**
 * Create a quiz for a specific skill
 */
export async function createSkillQuiz(graphId: string, skillCode: string, studentId: string): Promise<Quiz> {
  const graph = getGraphById(graphId);
  if (!graph) throw new Error('Graph not found');

  const skill = graph.nodes.find(n => n.code === skillCode);
  if (!skill) throw new Error('Skill not found');

  // Get prerequisite descriptions for context
  const prereqDescriptions = skill.dependencies
    .map(code => graph.nodes.find(n => n.code === code))
    .filter(Boolean)
    .map(n => `${n!.code}: ${n!.title} - ${n!.description}`);

  const questions = await getOrGenerateQuestions(skill, 4, prereqDescriptions);

  const quiz: Quiz = {
    id: uuid(),
    type: 'skill_quiz',
    graphId,
    skillIds: [skillCode],
    questions,
    createdAt: new Date().toISOString(),
  };

  // Store quiz in DB
  const db = getDb();
  db.prepare('INSERT INTO quiz_history (id, student_id, graph_id, quiz_json) VALUES (?, ?, ?, ?)').run(
    quiz.id, studentId, graphId, JSON.stringify(quiz)
  );

  return quiz;
}

/**
 * Submit quiz answers, grade, run inference, and return results
 */
export async function submitQuiz(submission: QuizSubmission): Promise<QuizResult> {
  const db = getDb();

  // Fetch the quiz
  const quizRow = db.prepare('SELECT quiz_json FROM quiz_history WHERE id = ?').get(submission.quizId) as { quiz_json: string } | undefined;
  if (!quizRow) throw new Error('Quiz not found');

  const quiz: Quiz = JSON.parse(quizRow.quiz_json);
  const graph = getGraphById(submission.graphId);
  if (!graph) throw new Error('Graph not found');

  // Grade: compute per-skill scores
  const questionMap = new Map(quiz.questions.map(q => [q.id, q]));
  const skillCorrect: Record<string, number> = {};
  const skillTotal: Record<string, number> = {};

  for (const answer of submission.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    if (!skillTotal[question.skillId]) {
      skillTotal[question.skillId] = 0;
      skillCorrect[question.skillId] = 0;
    }
    skillTotal[question.skillId]++;

    // Normalize comparison for grading
    const isCorrect = normalizeAnswer(answer.answer) === normalizeAnswer(question.correctAnswer);
    if (isCorrect) {
      skillCorrect[question.skillId]++;
    }
  }

  // Compute percentage scores per skill
  const perSkillScores: SkillScore[] = [];
  const skillScoreMap: Record<string, number> = {};

  for (const skillId of Object.keys(skillTotal)) {
    const correct = skillCorrect[skillId] || 0;
    const total = skillTotal[skillId];
    const percentage = Math.round((correct / total) * 100);

    perSkillScores.push({ skillId, correct, total, percentage });
    skillScoreMap[skillId] = percentage;
  }

  // Overall score
  const totalCorrect = Object.values(skillCorrect).reduce((a, b) => a + b, 0);
  const totalQuestions = Object.values(skillTotal).reduce((a, b) => a + b, 0);
  const overallScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Run inference engine
  const progress = getStudentProgress(submission.studentId, submission.graphId);
  runFullInference(graph, progress, skillScoreMap);

  // Update attempt records with quiz info
  for (const skillId of Object.keys(skillScoreMap)) {
    const mastery = progress.skillMasteries[skillId];
    if (mastery && mastery.attempts.length > 0) {
      const lastAttempt = mastery.attempts[mastery.attempts.length - 1];
      lastAttempt.quizId = submission.quizId;
      lastAttempt.questionsAnswered = skillTotal[skillId];
    }
  }

  // Save progress
  saveStudentProgress(progress);

  const result: QuizResult = {
    quizId: submission.quizId,
    overallScore,
    perSkillScores,
    masteryUpdates: Object.fromEntries(
      Object.entries(progress.skillMasteries).map(([code, m]) => [code, { level: m.level, source: m.source }])
    ),
    timestamp: new Date().toISOString(),
  };

  // Update quiz history with result
  db.prepare('UPDATE quiz_history SET result_json = ? WHERE id = ?').run(
    JSON.stringify(result), submission.quizId
  );

  return result;
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/^[a-d]\)\s*/i, '');
}
