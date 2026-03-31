import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { startDiagnostic, startSkillQuiz, submitQuiz as submitQuizApi } from '../../services/api';
import { QuestionCard } from './QuestionCard';
import { QuizResults } from './QuizResults';
import type { Quiz, QuizAnswer, QuizResult } from '@mastery/shared';

interface Props {
  graphId: string;
  mode: 'diagnostic' | 'skill';
  skillCode?: string;
  onClose: () => void;
  onComplete: () => void;
}

type Phase = 'loading' | 'intro' | 'questions' | 'submitting' | 'results';

export function QuizContainer({ graphId, mode, skillCode, onClose, onComplete }: Props) {
  const { studentId } = useAppStore();
  const [phase, setPhase] = useState<Phase>(mode === 'diagnostic' ? 'intro' : 'loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load quiz
  const loadQuiz = async () => {
    setPhase('loading');
    setError(null);
    try {
      const q = mode === 'diagnostic'
        ? await startDiagnostic(graphId, studentId)
        : await startSkillQuiz(graphId, skillCode!, studentId);
      setQuiz(q);
      setPhase('questions');
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
      setPhase('intro');
    }
  };

  useEffect(() => {
    if (mode === 'skill') loadQuiz();
  }, []);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setPhase('submitting');
    try {
      const quizAnswers: QuizAnswer[] = quiz.questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));
      const r = await submitQuizApi({
        quizId: quiz.id,
        studentId,
        graphId,
        answers: quizAnswers,
      });
      setResult(r);
      setPhase('results');
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz');
      setPhase('questions');
    }
  };

  const currentQuestion = quiz?.questions[currentIndex];
  const totalQuestions = quiz?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === 'diagnostic' ? 'Diagnostic Assessment' : `Quiz: ${skillCode}`}
            </h2>
            {quiz && (
              <p className="text-sm text-gray-500">
                Question {currentIndex + 1} of {totalQuestions} | {answeredCount} answered
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            x
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Intro (diagnostic only) */}
          {phase === 'intro' && (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-semibold">Diagnostic Assessment</h3>
              <p className="text-gray-600">
                This test will assess your knowledge across multiple skill areas.
                It covers topics from foundational skills to advanced calculus.
              </p>
              <p className="text-sm text-gray-500">
                It's okay to skip questions you don't know. The results will help
                us understand where you are and create a personalized learning path.
              </p>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                onClick={loadQuiz}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start Assessment
              </button>
            </div>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Preparing your quiz...</p>
              <p className="text-xs text-gray-400 mt-1">This may take a moment if we're generating questions</p>
            </div>
          )}

          {/* Questions */}
          {phase === 'questions' && currentQuestion && (
            <div>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <QuestionCard
                question={currentQuestion}
                answer={answers[currentQuestion.id] || ''}
                onAnswer={(ans) => handleAnswer(currentQuestion.id, ans)}
                index={currentIndex}
                total={totalQuestions}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>

                {/* Question dots */}
                <div className="flex gap-1 flex-wrap justify-center max-w-xs">
                  {quiz?.questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        i === currentIndex ? 'bg-blue-600' :
                        answers[q.id] ? 'bg-emerald-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(i => Math.min(totalQuestions - 1, i + 1))}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={answeredCount === 0}
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
                  >
                    Submit ({answeredCount}/{totalQuestions})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submitting */}
          {phase === 'submitting' && (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Analyzing your answers...</p>
            </div>
          )}

          {/* Results */}
          {phase === 'results' && result && (
            <QuizResults
              result={result}
              quiz={quiz!}
              onClose={() => { onComplete(); onClose(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
