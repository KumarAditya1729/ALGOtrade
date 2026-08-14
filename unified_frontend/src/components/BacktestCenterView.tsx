import React, { useState } from 'react';
import { runBacktest } from '../api/backtest';
import type { BacktestParams, BacktestResult } from '../api/backtest';
import { Play, TrendingUp, AlertTriangle } from 'lucide-react';

export const BacktestCenterView: React.FC = () => {
  const [params, setParams] = useState<BacktestParams>({
    strategy_id: '',
    start_date: '2023-01-01',
    end_date: '2023-12-31',
    initial_capital: 100000,
    params: {}
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params.strategy_id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await runBacktest(params);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to run backtest');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Backtesting Center</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-gray-800 rounded-lg p-6 border border-gray-700 h-fit">
          <h2 className="text-lg font-semibold mb-4">Run Simulation</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Strategy ID</label>
              <input
                type="text"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                value={params.strategy_id}
                onChange={e => setParams({...params, strategy_id: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Initial Capital</label>
              <input
                type="number"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                value={params.initial_capital}
                onChange={e => setParams({...params, initial_capital: Number(e.target.value)})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                  value={params.start_date}
                  onChange={e => setParams({...params, start_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                  value={params.end_date}
                  onChange={e => setParams({...params, end_date: e.target.value})}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !params.strategy_id}
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
            >
              <Play size={18} />
              <span>{isLoading ? 'Running...' : 'Run Backtest'}</span>
            </button>
            {error && (
              <div className="text-red-400 text-sm flex items-center space-x-1 mt-2">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        <div className="lg:col-span-2">
          {result ? (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Total Return</div>
                  <div className={`text-xl font-bold ${result.metrics.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(result.metrics.total_return * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Sharpe Ratio</div>
                  <div className="text-xl font-bold text-white">{result.metrics.sharpe_ratio.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Max Drawdown</div>
                  <div className="text-xl font-bold text-red-400">
                    {(result.metrics.max_drawdown * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                  <div className="text-xl font-bold text-white">
                    {(result.metrics.win_rate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp size={18} className="text-blue-400" />
                  <h3 className="text-lg font-semibold">Equity Curve</h3>
                </div>
                <div className="h-64 flex items-center justify-center border border-gray-700 rounded bg-gray-900/50">
                  <span className="text-gray-500">Chart visualization placeholder (Recharts/Chart.js)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-lg p-12 bg-gray-800/30">
              <TrendingUp size={48} className="mb-4 opacity-50" />
              <p>Configure parameters and run a backtest to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
