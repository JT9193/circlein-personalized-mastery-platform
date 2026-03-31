import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import type { Question, QuestionType, SkillNode } from '@mastery/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = path.join(__dirname, '..', '..', 'data', 'questions');

/**
 * Get questions from the pre-authored bank for a skill
 */
export function getQuestionsFromBank(skillCode: string): Question[] {
  const filePath = path.join(QUESTIONS_DIR, `${skillCode}.json`);
  if (!fs.existsSync(filePath)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.questions || [];
  } catch {
    return [];
  }
}

/**
 * Generate questions using Claude API (Haiku 3.5 for cost efficiency)
 */
export async function generateQuestionsWithAI(
  skill: SkillNode,
  count: number = 4,
  prerequisiteDescriptions: string[] = []
): Promise<Question[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set — cannot generate AI questions');
    return generateFallbackQuestions(skill, count);
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const prereqContext = prerequisiteDescriptions.length > 0
      ? `\nPrerequisite skills the student should already know:\n${prerequisiteDescriptions.map(d => `- ${d}`).join('\n')}`
      : '';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are generating assessment questions for an educational platform.

Skill: "${skill.title}" (${skill.code})
Description: ${skill.description}${prereqContext}

Generate exactly ${count} questions as a JSON array. Each question should test understanding of this specific skill.

Return ONLY a valid JSON array with this structure:
[{
  "type": "multiple_choice" | "true_false",
  "prompt": "question text",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": "A) ...",
  "explanation": "educational explanation",
  "difficulty": 1 | 2 | 3
}]

Requirements:
- Mix difficulty levels (1=easy, 2=medium, 3=hard)
- For multiple choice: exactly 4 options, one correct
- For true_false: options should be ["True", "False"]
- Explanations should teach the concept
- Questions should be practical and test real understanding`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('AI response did not contain valid JSON array');
      return generateFallbackQuestions(skill, count);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const questions: Question[] = parsed.map((q: any) => ({
      id: uuid(),
      skillId: skill.code,
      type: q.type || 'multiple_choice',
      prompt: q.prompt,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 2,
      source: 'ai_generated' as const,
    }));

    // Cache to bank for reuse
    cacheQuestionsToBank(skill.code, questions);

    return questions;
  } catch (err) {
    console.error('AI question generation failed:', err);
    return generateFallbackQuestions(skill, count);
  }
}

/**
 * Fallback: generate simple template questions when AI is unavailable
 */
function generateFallbackQuestions(skill: SkillNode, count: number): Question[] {
  const questions: Question[] = [];

  questions.push({
    id: uuid(),
    skillId: skill.code,
    type: 'true_false',
    prompt: `True or False: Understanding "${skill.title}" requires mastery of its prerequisite skills.`,
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: `${skill.title} builds upon foundational skills. ${skill.description}`,
    difficulty: 1,
    source: 'bank',
  });

  questions.push({
    id: uuid(),
    skillId: skill.code,
    type: 'multiple_choice',
    prompt: `Which of the following best describes the skill "${skill.title}"?`,
    options: [
      `A) ${skill.description}`,
      `B) A skill unrelated to ${skill.category}`,
      `C) An advanced topic with no prerequisites`,
      `D) A purely theoretical concept with no applications`,
    ],
    correctAnswer: `A) ${skill.description}`,
    explanation: `${skill.title}: ${skill.description}`,
    difficulty: 1,
    source: 'bank',
  });

  return questions.slice(0, count);
}

/**
 * Cache AI-generated questions back to the bank
 */
function cacheQuestionsToBank(skillCode: string, questions: Question[]): void {
  const filePath = path.join(QUESTIONS_DIR, `${skillCode}.json`);

  try {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    let existing: Question[] = [];
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      existing = data.questions || [];
    }

    const merged = [...existing, ...questions];
    fs.writeFileSync(filePath, JSON.stringify({ skillId: skillCode, questions: merged }, null, 2));
  } catch (err) {
    console.warn('Failed to cache questions:', err);
  }
}

/**
 * Get or generate questions for a skill (hybrid approach)
 */
export async function getOrGenerateQuestions(
  skill: SkillNode,
  count: number = 4,
  prerequisiteDescriptions: string[] = []
): Promise<Question[]> {
  // Try bank first
  const bankQuestions = getQuestionsFromBank(skill.code);

  if (bankQuestions.length >= count) {
    // Shuffle and return requested count
    const shuffled = bankQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // Not enough in bank — generate with AI
  const needed = count - bankQuestions.length;
  const aiQuestions = await generateQuestionsWithAI(skill, needed, prerequisiteDescriptions);

  return [...bankQuestions, ...aiQuestions].slice(0, count);
}
