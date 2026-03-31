import React from 'react';
import type { Question } from '@mastery/shared';

interface Props {
  question: Question;
  answer: string;
  onAnswer: (answer: string) => void;
  index: number;
  total: number;
}

export function QuestionCard({ question, answer, onAnswer, index, total }: Props) {
  const difficultyLabel = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }[question.difficulty] || '';
  const difficultyColor = { 1: 'bg-green-100 text-green-700', 2: 'bg-amber-100 text-amber-700', 3: 'bg-red-100 text-red-700' }[question.difficulty] || '';

  return (
    <div>
      {/* Question metadata */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono text-gray-400">Q{index + 1}/{total}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor}`}>
          {difficultyLabel}
        </span>
        <span className="text-xs text-gray-400">{question.skillId}</span>
      </div>

      {/* Question prompt */}
      <p className="text-base font-medium text-gray-900 mb-4 leading-relaxed">
        {question.prompt}
      </p>

      {/* Answer input based on type */}
      {(question.type === 'multiple_choice' || question.type === 'true_false') && question.options && (
        <div className="space-y-2">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => onAnswer(option)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                answer === option
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === 'short_answer' && (
        <textarea
          value={answer}
          onChange={e => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm min-h-[100px] resize-y"
        />
      )}

      {question.type === 'worked_problem' && (
        <textarea
          value={answer}
          onChange={e => onAnswer(e.target.value)}
          placeholder="Show your work and final answer here..."
          className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm min-h-[150px] resize-y font-mono"
        />
      )}

      {/* Skip hint */}
      {!answer && (
        <p className="text-xs text-gray-400 mt-3">
          You can skip this question and come back to it later.
        </p>
      )}
    </div>
  );
}
