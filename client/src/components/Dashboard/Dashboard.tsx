import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGraphs, fetchProgressSummary } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

interface GraphInfo {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAppStore();
  const [graphs, setGraphs] = useState<GraphInfo[]>([]);
  const [summaries, setSummaries] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const g = await fetchGraphs();
        setGraphs(g);
        const sums: Record<string, any> = {};
        for (const graph of g) {
          try {
            sums[graph.id] = await fetchProgressSummary(graph.id);
          } catch { /* no progress yet */ }
        }
        setSummaries(sums);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mastery Platform</h1>
            <p className="text-gray-500 mt-1">Track your learning progress with interactive knowledge graphs</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading your courses...</p>
          </div>
        ) : graphs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-800">No courses available yet</h2>
            <p className="text-gray-500 mt-2">Knowledge graphs will appear here once loaded.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {graphs.map(graph => {
              const summary = summaries[graph.id];
              const progress = summary?.overallProgress || 0;
              const mastered = summary?.mastered || 0;
              const total = summary?.totalSkills || graph.nodeCount;

              return (
                <div key={graph.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{graph.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">{graph.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{total} skills</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{progress}%</div>
                      <div className="text-xs text-gray-500">{mastered}/{total} mastered</div>
                    </div>
                  </div>

                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>

                  {summary?.byCategory && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                      {Object.entries(summary.byCategory as Record<string, { total: number; mastered: number }>).slice(0, 6).map(([cat, data]) => (
                        <div key={cat} className="text-xs bg-gray-50 rounded-lg p-2">
                          <div className="text-gray-500 truncate" title={cat}>{cat.replace(/^(Calculus III|Calculus II|Calculus I)\s*:?\s*/, '')}</div>
                          <div className="font-medium text-gray-700">{data.mastered}/{data.total}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {summary?.suggestedNext?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Recommended next:</p>
                      <div className="flex flex-wrap gap-1">
                        {summary.suggestedNext.slice(0, 3).map((s: any) => (
                          <span key={s.code} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            {s.code}: {s.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/graph/${graph.id}`)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      {progress > 0 ? 'Continue Learning' : 'Start Learning'}
                    </button>
                    <button
                      onClick={() => navigate(`/graph/${graph.id}?diagnostic=true`)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
                    >
                      Diagnostic Test
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
