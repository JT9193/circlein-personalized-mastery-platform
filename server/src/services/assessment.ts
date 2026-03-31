import { v4 as uuid } from 'uuid';
import { query } from './db.js';
import { getGraphById } from './graph.js';
import { getStudentProgress, saveStudentProgress } from './progress.js';
import { getOrGenerateQuestions } from './questions.js';
import { runFullInference } from './inference.js';
import type { Quiz, QuizSubmission, QuizResult, Question, SkillScore, SkillNode } from '@mastery/shared';

/**
 * Create a diagnostic quiz that tests across multiple skill levels.
 */
export async function createDiagnosticQuiz(graphId: string, userId: string): Promise<Quiz> {
  const graph = await getGraphById(graphId);
  if (!graph) throw new Error('Graph not found');

  const bySubcategory = new Map<string, SkillNode[]>();
  for (const node of graph.nodes) {
    const key = `${node.category}::${node.subcategory}`;
    if (!bySubcategory.has(key)) bySubcategory.set(key, []);
    bySubcategory.get(key)!.push(node);
  }

  const selectedSkills: SkillNode[] = [];
  for (const [, skills] of bySubcategory) {
    const sorted = skills.sort((a: SkillNode, b: SkillNode) => a.dependencies.length - b.dependencies.length);
    const midIdx = Math.floor(sorted.length / 2);
    selectedSkills.push(sorted[midIdx]);
    if (sorted.length > 3) {
      const highIdx = Math.floor(sorted.length * 0.75);
      selectedSkills.push(sorted[highIdx]);
    }
  }

  const diagnosticSkills: SkillNode[] = selectedSkills.slice(0, 20);

  const allQuestions: Question[] = [];
  for (const skill of diagnosticSkills) {
    const questions = await getOrGenerateQuestions(skill, 1);
    allQuestions.push(...questions);
  }

  const quiz: Quiz = {
    id: uuid(),
    type: 'diagnostic',
    graphId,
    skillIds: diagnosticSkills.map((s: SkillNode) => s.code),
    questions: allQuestions,
    createdAt: new Date().toISOString(),
  };

  await query(
    'INSERT INTO quiz_history (id, user_id, graph_id, quiz_json) VALUES ($1, $2, $3, $4)',
    [quiz.id, userId, graphId, JSON.stringify(quiz)]
  );

  return quiz;
}

/**
 * Create a quiz for a specific skill
 */
export async function createSkillQuiz(graphId: string, skillCode: string, userId: string): Promise<Quiz> {
  const graph = await getGraphById(graphId);
  if (!graph) throw new Error('Graph not found');

  const skill = graph.nodes.find(n => n.code === skillCode);
  if (!skill) throw new Error('Skill not found');

  const prereqDescriptions = skill.dependencies
    .map((code: string) => graph.nodes.find((n: SkillNode) => n.code === code))
    .filter((n: SkillNode | undefined): n is SkillNode => !!n)
    .map((n: SkillNode) => `${n.code}: ${n.title} - ${n.description}`);

  const questions = await getOrGenerateQuestions(skill, 4, prereqDescriptions);

  const quiz: Quiz = {
    id: uuid(),
    type: 'skill_quiz',
    graphId,
    skillIds: [skillCode],
    questions,
    createdAt: new Date().toISOString(),
  };

  await query(
    'INSERT INTO quiz_history (id, user_id, graph_id, quiz_json) VALUES ($1, $2, $3, $4)',
    [quiz.id, userId, graphId, JSON.stringify(quiz)]
  );

  return quiz;
}

/**
 * Submit quiz answers, grade, run inference, and return results
 */
export async function submitQuiz(submission: QuizSubmission): Promise<QuizResult> {
  // Fetch the quiz
  const quizResult = await query(
    'SELECT quiz_json FROM quiz_history WHERE id = $1', [submission.quizId]
  );
  if (!quizResult.rows[0]) throw new Error('Quiz not found');

  const quiz: Quiz = quizResult.rows[0].quiz_json as Quiz;
  const graph = await getGraphById(submission.graphId);
  if (!graph) throw new Error('Graph not found');

  // Grade: compute per-skill scores
  const questionMap = new Map(quiz.questions.map((q: Question) => [q.id, q]));
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

    const isCorrect = normalizeAnswer(answer.answer) === normalizeAnswer(question.correctAnswer);
    if (isCorrect) {
      skillCorrect[question.skillId]++;
    }
  }

  const perSkillScores: SkillScore[] = [];
  const skillScoreMap: Record<string, number> = {};

  for (const skillId of Object.keys(skillTotal)) {
    const correct = skillCorrect[skillId] || 0;
    const total = skillTotal[skillId];
    const percentage = Math.round((correct / total) * 100);
    perSkillScores.push({ skillId, correct, total, percentage });
    skillScoreMap[skillId] = percentage;
  }

  const totalCorrect = Object.values(skillCorrect).reduce((a, b) => a + b, 0);
  const totalQuestions = Object.values(skillTotal).reduce((a, b) => a + b, 0);
  const overallScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Run inference engine
  const progress = await getStudentProgress(submission.studentId, submission.graphId);
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

  await saveStudentProgress(progress);

  const result: QuizResult = {
    quizId: submission.quizId,
    overallScore,
    perSkillScores,
    masteryUpdates: Object.fromEntries(
      Object.entries(progress.skillMasteries).map(([code, m]: [string, any]) => [code, { level: m.level, source: m.source }])
    ),
    timestamp: new Date().toISOString(),
  };

  await query('UPDATE quiz_history SET result_json = $1 WHERE id = $2',
    [JSON.stringify(result), submission.quizId]
  );

  return result;
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/^[a-d]\)\s*/i, '');
}
