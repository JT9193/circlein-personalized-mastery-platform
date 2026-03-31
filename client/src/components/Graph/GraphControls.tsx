import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { MasteryStatus } from '@mastery/shared';

interface Props {
  onDiagnostic: () => void;
  onFitView: () => void;
}

export function GraphControls({ onDiagnostic, onFitView }: Props) {
  const { graph, filterCategory, filterStatus, setFilterCategory, setFilterStatus, progress } = useAppStore();

  const categories = graph?.categories || [];
  const statusOptions: Array<{ value: MasteryStatus | null; label: string }> = [
    { value: null, label: 'All statuses' },
    { value: 'not_started', label: 'Not started' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'mastered', label: 'Mastered' },
    { value: 'tested_weak', label: 'Needs work' },
  ];

  const totalSkills = graph?.nodes.length ?? 0;
  const masteredCount = progress
    ? Object.values(progress.skillMasteries).filter(m => m.level >= 80).length
    : 0;
  const progressPct = totalSkills > 0 ? Math.round((masteredCount / totalSkills) * 100) : 0;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-wrap">
      {/* Progress summary */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {masteredCount}/{totalSkills} mastered ({progressPct}%)
        </span>
      </div>

      {/* Category filter */}
      <select
        value={filterCategory || ''}
        onChange={e => setFilterCategory(e.target.value || null)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white"
      >
        <option value="">All categories</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={filterStatus || ''}
        onChange={e => setFilterStatus((e.target.value || null) as MasteryStatus | null)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white"
      >
        {statusOptions.map(opt => (
          <option key={opt.value ?? 'all'} value={opt.value ?? ''}>{opt.label}</option>
        ))}
      </select>

      <div className="flex-1" />

      {/* Actions */}
      <button
        onClick={onFitView}
        className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
      >
        Fit View
      </button>

      <button
        onClick={onDiagnostic}
        className="text-sm px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors font-medium"
      >
        Take Diagnostic Test
      </button>
    </div>
  );
}
