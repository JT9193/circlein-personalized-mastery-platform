import React, { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SkillNode } from './SkillNode';
import { GraphControls } from './GraphControls';
import { layoutGraph } from './graphLayout';
import { useAppStore } from '../../store/useAppStore';
import type { MasteryStatus } from '@mastery/shared';

const nodeTypes: NodeTypes = {
  skillNode: SkillNode as any,
};

const STATUS_MINIMAP_COLORS: Record<MasteryStatus, string> = {
  not_started: '#e5e7eb',
  in_progress: '#fbbf24',
  mastered: '#10b981',
  tested_weak: '#f87171',
};

interface Props {
  onDiagnostic: () => void;
  onSkillQuiz: (skillCode: string) => void;
}

export function SkillGraph({ onDiagnostic, onSkillQuiz }: Props) {
  const { graph, progress, filterCategory, filterStatus, selectSkill, getStatus, getMastery } = useAppStore();
  const rfInstance = useRef<any>(null);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return layoutGraph(
      graph,
      getStatus,
      (code) => {
        const m = getMastery(code);
        return m ? { level: m.level, confidence: m.confidence, source: m.source } : null;
      },
      filterCategory,
      filterStatus
    );
    // progress included to trigger re-layout when mastery data changes
  }, [graph, progress, filterCategory, filterStatus, getStatus, getMastery]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync layout changes
  React.useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    selectSkill(node.id);
  }, [selectSkill]);

  const handleFitView = useCallback(() => {
    rfInstance.current?.fitView({ padding: 0.1, duration: 300 });
  }, []);

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading graph...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <GraphControls onDiagnostic={onDiagnostic} onFitView={handleFitView} />

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onInit={(instance) => { rfInstance.current = instance; }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          nodesDraggable={false}
          minZoom={0.05}
          maxZoom={2}
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background color="#e2e8f0" gap={20} style={{ backgroundColor: '#f8fafc' }} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as any;
              return STATUS_MINIMAP_COLORS[data?.status as MasteryStatus] || '#e5e7eb';
            }}
            style={{ width: 150, height: 100 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
