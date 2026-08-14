import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStrategies, startStrategy, stopStrategy, fetchStrategyLogs } from '../api/strategies';
import type { Strategy } from '../api/strategies';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  const cls = s === 'running'
    ? 'bg-green-900/30 text-green-400 border-green-800'
    : s === 'stopped'
    ? 'bg-gray-800 text-gray-400 border-gray-700'
    : 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {s === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      {status}
    </span>
  );
};

const LogsModal: React.FC<{ strategyId: number; onClose: () => void }> = ({ strategyId, onClose }) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['strategyLogs', strategyId],
    queryFn: () => fetchStrategyLogs(strategyId),
    refetchInterval: 5000,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Strategy Logs (ID: {strategyId})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-black/50 font-mono text-xs">
          {isLoading ? (
            <div className="text-gray-500 animate-pulse">Loading logs...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-gray-500">No logs found.</div>
          ) : (
            <div className="space-y-1">
              {[...logs].reverse().map((log: any, i: number) => {
                const color = log.level === 'error' ? 'text-red-400' 
                            : log.level === 'warning' ? 'text-yellow-400' 
                            : 'text-gray-300';
                return (
                  <div key={log.id || i} className="flex gap-4">
                    <span className="text-gray-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`shrink-0 uppercase w-12 ${color}`}>{log.level}</span>
                    <span className="text-gray-300 break-all">{log.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const StrategiesTable: React.FC = () => {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [logsModalId, setLogsModalId] = useState<number | null>(null);

  const { data: strategies, isLoading, isError } = useQuery({
    queryKey: ['strategies'],
    queryFn: fetchStrategies,
    refetchInterval: 10000,
  });

  const startMutation = useMutation({
    mutationFn: startStrategy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
    onSettled: () => setTogglingId(null),
  });

  const stopMutation = useMutation({
    mutationFn: (id: number) => stopStrategy(id, false),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
    onSettled: () => setTogglingId(null),
  });

  const handleToggle = (strategy: Strategy) => {
    setTogglingId(strategy.id);
    if (strategy.status.toLowerCase() === 'running') {
      stopMutation.mutate(strategy.id);
    } else {
      startMutation.mutate(strategy.id);
    }
  };

  if (isLoading) return <div className="h-64 bg-gray-900 rounded-xl animate-pulse border border-gray-800" />;
  if (isError) return <div className="p-4 bg-red-900/20 text-red-400 rounded-xl border border-red-800">Failed to load strategies</div>;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-950/80">
            <tr>
              {['Strategy', 'Type', 'Symbol', 'Capital', 'Mode', 'Status', 'Action'].map(h => (
                <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === 'Capital' ? 'text-right' : h === 'Action' ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {!strategies || strategies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="text-sm">No strategies yet</span>
                    <span className="text-xs text-gray-700">Click "+ New Strategy" to get started</span>
                  </div>
                </td>
              </tr>
            ) : (
              strategies.map((s: Strategy) => {
                const isRunning = s.status.toLowerCase() === 'running';
                return (
                  <tr key={s.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-white">{s.strategy_name}</div>
                      <div className="text-xs text-gray-500">ID: {s.id} · {s.market_category}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-300">{s.strategy_type}</td>
                    <td className="px-5 py-4 text-sm text-gray-300 font-mono">
                      {s.symbol_canonical || s.symbol || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-300 text-right font-mono">
                      ₹{parseFloat(s.initial_capital).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.execution_mode === 'paper' ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
                        {s.execution_mode}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setLogsModalId(s.id)}
                          className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-800 transition-colors"
                        >
                          Logs
                        </button>
                        <button
                          onClick={() => handleToggle(s)}
                          disabled={togglingId === s.id}
                          className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-50
                            ${isRunning
                              ? 'text-red-400 bg-red-900/20 border-red-800 hover:bg-red-600 hover:text-white hover:border-red-600'
                              : 'text-green-400 bg-green-900/20 border-green-800 hover:bg-green-600 hover:text-white hover:border-green-600'
                            }`}
                        >
                          {togglingId === s.id ? '...' : isRunning ? 'Stop' : 'Start'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {strategies && strategies.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">{strategies.length} strateg{strategies.length !== 1 ? 'ies' : 'y'}</span>
          <span className="text-xs text-gray-600">Auto-refreshes every 10s</span>
        </div>
      )}
      
      {logsModalId && (
        <LogsModal strategyId={logsModalId} onClose={() => setLogsModalId(null)} />
      )}
    </div>
  );
};
