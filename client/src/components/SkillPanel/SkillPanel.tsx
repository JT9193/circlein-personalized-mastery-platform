import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMasteryStatus } from '@mastery/shared';
import type { MasteryStatus } from '@mastery/shared';

const STATUS_LABELS: Record<MasteryStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'text-gray-500' },
  in_progress: { label: 'In Progress', color: 'text-amber-600' },
  mastered: { label: 'Mastered', color: 'text-emerald-600' },
  tested_weak: { label: 'Needs Work', color: 'text-red-600' },
};

const SOURCE_LABELS: Record<string, string> = {
  direct_test: 'Directly tested',
  inferred_from_dependent: 'Inferred (passed a dependent skill)',
  inferred_at_risk: 'At risk (failed a prerequisite)',
  not_assessed: 'Not yet assessed',
};

interface Props {
  onSkillQuiz: (skillCode: string) => void;
}

export function SkillPanel({ onSkillQuiz }: Props) {
  const { selectedSkillCode, selectSkill, graph, getMastery, getStatus } = useAppStore();

  if (!selectedSkillCode || !graph) return null;

  const skill = graph.nodes.find(n => n.code === selectedSkillCode);
  if (!skill) return null;

  const mastery = getMastery(selectedSkillCode);
  const status = getStatus(selectedSkillCode);
  const statusInfo = STATUS_LABELS[status];
  const prerequisites = graph.nodes.filter(n => skill.dependencies.includes(n.code));
  const dependents = graph.nodes.filter(n => n.dependencies.includes(selectedSkillCode));

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            {skill.code}
          </span>
          <button
            onClick={() => selectSkill(null)}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            x
          </button>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{skill.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{skill.category}</p>
      </div>

      {/* Mastery */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Mastery Level</h3>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                status === 'mastered' ? 'bg-emerald-500' :
                status === 'tested_weak' ? 'bg-red-400' :
                status === 'in_progress' ? 'bg-amber-400' : 'bg-gray-300'
              }`}
              style={{ width: `${mastery?.level ?? 0}%` }}
            />
          </div>
          <span className="text-sm font-bold">{mastery?.level ?? 0}%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          {mastery && (
            <span className="text-gray-400">
              {SOURCE_LABELS[mastery.source] || mastery.source}
              {mastery.source !== 'direct_test' && mastery.confidence < 1 &&
                ` (${Math.round(mastery.confidence * 100)}% confidence)`
              }
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
        <p className="text-sm text-gray-600">{skill.description || 'No description available.'}</p>
      </div>

      {/* Take Quiz */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={() => onSkillQuiz(selectedSkillCode)}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          {mastery?.source === 'direct_test' ? 'Retake Quiz' : 'Take Quiz'} for {skill.code}
        </button>
      </div>

      {/* Prerequisites */}
      {prerequisites.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Prerequisites ({prerequisites.length})
          </h3>
          <div className="space-y-1.5">
            {prerequisites.map(prereq => {
              const pStatus = getStatus(prereq.code);
              const pColor = STATUS_LABELS[pStatus].color;
              return (
                <button
                  key={prereq.code}
                  onClick={() => selectSkill(prereq.code)}
                  className="w-full text-left p-2 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    pStatus === 'mastered' ? 'bg-emerald-500' :
                    pStatus === 'tested_weak' ? 'bg-red-400' :
                    pStatus === 'in_progress' ? 'bg-amber-400' : 'bg-gray-300'
                  }`} />
                  <span className="font-mono text-xs text-gray-500">{prereq.code}</span>
                  <span className="text-gray-700 truncate">{prereq.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dependents */}
      {dependents.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Unlocks ({dependents.length})
          </h3>
          <div className="space-y-1.5">
            {dependents.slice(0, 10).map(dep => {
              const dStatus = getStatus(dep.code);
              return (
                <button
                  key={dep.code}
                  onClick={() => selectSkill(dep.code)}
                  className="w-full text-left p-2 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    dStatus === 'mastered' ? 'bg-emerald-500' :
                    dStatus === 'tested_weak' ? 'bg-red-400' :
                    dStatus === 'in_progress' ? 'bg-amber-400' : 'bg-gray-300'
                  }`} />
                  <span className="font-mono text-xs text-gray-500">{dep.code}</span>
                  <span className="text-gray-700 truncate">{dep.title}</span>
                </button>
              );
            })}
            {dependents.length > 10 && (
              <p className="text-xs text-gray-400 pl-2">+{dependents.length - 10} more</p>
            )}
          </div>
        </div>
      )}

      {/* Attempt History */}
      {mastery && mastery.attempts.length > 0 && (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Attempt History</h3>
          <div className="space-y-1">
            {mastery.attempts.map((attempt, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-gray-500 p-1.5 bg-gray-50 rounded">
                <span>{new Date(attempt.timestamp).toLocaleDateString()}</span>
                <span className={`font-medium ${attempt.score >= 80 ? 'text-emerald-600' : attempt.score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {attempt.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
