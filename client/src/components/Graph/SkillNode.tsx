import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SkillNodeData } from './graphLayout';
import type { MasteryStatus } from '@mastery/shared';

const STATUS_COLORS: Record<MasteryStatus, { bg: string; border: string; text: string }> = {
  not_started: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600' },
  in_progress: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800' },
  mastered: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-800' },
  tested_weak: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800' },
};

function SkillNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SkillNodeData;
  const colors = STATUS_COLORS[nodeData.status] || STATUS_COLORS.not_started;
  const isInferred = nodeData.source === 'inferred_from_dependent' || nodeData.source === 'inferred_at_risk';

  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-sm cursor-pointer transition-all duration-200
        ${colors.bg} ${colors.border} ${colors.text}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md' : 'hover:shadow-md'}
        ${isInferred ? 'border-dashed' : ''}
      `}
      style={{ width: 200, minHeight: 50 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />

      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold bg-white/60 px-1.5 py-0.5 rounded">
          {nodeData.code}
        </span>
        {nodeData.level > 0 && (
          <span className="text-xs font-medium">
            {nodeData.level}%
          </span>
        )}
      </div>

      <div className="text-xs font-medium leading-tight truncate" title={nodeData.title}>
        {nodeData.title}
      </div>

      {/* Mini progress bar */}
      {nodeData.level > 0 && (
        <div className="mt-1.5 h-1 bg-white/40 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              nodeData.status === 'mastered' ? 'bg-emerald-500' :
              nodeData.status === 'tested_weak' ? 'bg-red-400' : 'bg-amber-400'
            }`}
            style={{ width: `${nodeData.level}%` }}
          />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
    </div>
  );
}

export const SkillNode = memo(SkillNodeComponent);
