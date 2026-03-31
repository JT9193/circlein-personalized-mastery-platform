import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { fetchGraph, fetchProgress } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { SkillGraph } from '../components/Graph/SkillGraph';
import { SkillPanel } from '../components/SkillPanel/SkillPanel';
import { QuizContainer } from '../components/Quiz/QuizContainer';

export function GraphView() {
  const { graphId } = useParams<{ graphId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setGraph, setProgress, selectedSkillCode } = useAppStore();

  const [quizState, setQuizState] = useState<{
    open: boolean;
    mode: 'diagnostic' | 'skill';
    skillCode?: string;
  }>({ open: false, mode: 'diagnostic' });

  // Fetch graph
  const { data: graph, isLoading: graphLoading } = useQuery({
    queryKey: ['graph', graphId],
    queryFn: () => fetchGraph(graphId!),
    enabled: !!graphId,
  });

  // Fetch progress
  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ['progress', graphId],
    queryFn: () => fetchProgress(graphId!),
    enabled: !!graphId,
  });

  // Sync to store
  useEffect(() => {
    if (graph) setGraph(graph);
  }, [graph, setGraph]);

  useEffect(() => {
    if (progress) setProgress(progress);
  }, [progress, setProgress]);

  // Auto-open diagnostic if query param
  useEffect(() => {
    if (searchParams.get('diagnostic') === 'true' && graphId) {
      setQuizState({ open: true, mode: 'diagnostic' });
    }
  }, [searchParams, graphId]);

  const handleDiagnostic = useCallback(() => {
    setQuizState({ open: true, mode: 'diagnostic' });
  }, []);

  const handleSkillQuiz = useCallback((skillCode: string) => {
    setQuizState({ open: true, mode: 'skill', skillCode });
  }, []);

  const handleQuizComplete = useCallback(() => {
    refetchProgress();
  }, [refetchProgress]);

  if (graphLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">Graph not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Dashboard
        </button>
        <h1 className="text-sm font-semibold text-gray-800">{graph.name}</h1>
        <span className="text-xs text-gray-400">{graph.nodes.length} skills</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <ReactFlowProvider>
            <SkillGraph onDiagnostic={handleDiagnostic} onSkillQuiz={handleSkillQuiz} />
          </ReactFlowProvider>
        </div>

        {/* Side panel */}
        {selectedSkillCode && (
          <SkillPanel onSkillQuiz={handleSkillQuiz} />
        )}
      </div>

      {/* Quiz overlay */}
      {quizState.open && graphId && (
        <QuizContainer
          graphId={graphId}
          mode={quizState.mode}
          skillCode={quizState.skillCode}
          onClose={() => setQuizState({ open: false, mode: 'diagnostic' })}
          onComplete={handleQuizComplete}
        />
      )}
    </div>
  );
}
