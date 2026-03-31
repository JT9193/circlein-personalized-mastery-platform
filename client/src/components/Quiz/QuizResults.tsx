import React from 'react';
import type { QuizResult, Quiz } from '@mastery/shared';

interface Props {
  result: QuizResult;
  quiz: Quiz;
  onClose: () => void;
}

export function QuizResults({ result, quiz, onClose }: Props) {
  const scoreColor = result.overallScore >= 80 ? 'text-emerald-600' : result.overallScore >= 40 ? 'text-amber-600' : 'text-red-600';

  const newlyMastered = result.perSkillScores.filter(s => s.percentage >= 80);
  const needsWork = result.perSkillScores.filter(s => s.percentage < 40);

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <div className="text-center">
        <div className={`text-5xl font-bold ${scoreColor}`}>
          {result.overallScore}%
        </div>
        <p className="text-gray-500 mt-1">Overall Score</p>
      </div>

      {/* Per-skill breakdown */}
      {result.perSkillScores.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Skill Breakdown</h3>
          <div className="space-y-2">
            {result.perSkillScores.map(skill => (
              <div key={skill.skillId} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 w-16">{skill.skillId}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      skill.percentage >= 80 ? 'bg-emerald-500' :
                      skill.percentage >= 40 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${skill.percentage}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-12 text-right">
                  {skill.correct}/{skill.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Newly mastered */}
      {newlyMastered.length > 0 && (
        <div className="bg-emerald-50 p-3 rounded-lg">
          <h3 className="text-sm font-semibold text-emerald-800 mb-1">
            Skills Mastered! ({newlyMastered.length})
          </h3>
          <p className="text-xs text-emerald-600">
            {newlyMastered.map(s => s.skillId).join(', ')}
          </p>
          <p className="text-xs text-emerald-500 mt-1">
            Prerequisite skills may also have been inferred as mastered.
          </p>
        </div>
      )}

      {/* Needs work */}
      {needsWork.length > 0 && (
        <div className="bg-red-50 p-3 rounded-lg">
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            Needs Review ({needsWork.length})
          </h3>
          <p className="text-xs text-red-600">
            {needsWork.map(s => s.skillId).join(', ')}
          </p>
          <p className="text-xs text-red-500 mt-1">
            We recommend reviewing prerequisite skills for these topics.
          </p>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Return to Knowledge Graph
      </button>
    </div>
  );
}
