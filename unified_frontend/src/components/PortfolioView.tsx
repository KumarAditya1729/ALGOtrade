import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSummary, fetchPositions } from '../api/portfolio';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PortfolioView: React.FC = () => {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['portfolioSummary'],
    queryFn: fetchSummary,
    refetchInterval: 15000,
  });

  const { data: positions, isLoading: posLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    refetchInterval: 10000,
  });

  const isLoading = summaryLoading || posLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-36 bg-gray-800 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  const pnlColor = (summary?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-bold text-white">Portfolio</h2>
        <p className="text-gray-400 text-sm mt-1">Your positions and market exposure</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Market Value', value: `₹${fmt(summary?.total_market_value || 0)}`, sub: `Cost: ₹${fmt(summary?.total_cost || 0)}` },
          { label: 'Total P&L', value: `${(summary?.total_pnl || 0) >= 0 ? '+' : ''}₹${fmt(summary?.total_pnl || 0)}`, sub: `${fmt(summary?.total_pnl_percent || 0)}%`, color: pnlColor },
          { label: 'Open Positions', value: String(summary?.position_count || 0), sub: 'Active holdings' },
          { label: 'Markets', value: String(summary?.market_distribution?.length || 0), sub: 'Asset classes' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{c.label}</div>
            <div className={`text-2xl font-bold ${c.color || 'text-white'}`}>{c.value}</div>
            {c.sub && <div className="text-xs text-gray-500 mt-1">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions Table */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-white font-semibold">Open Positions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-950/60">
                <tr>
                  {['Symbol', 'Side', 'Size', 'Avg Price', 'Mark Price', 'Unrealized P&L'].map(h => (
                    <th key={h} className={`px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${['Size','Avg Price','Mark Price','Unrealized P&L'].includes(h) ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {!positions || positions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-600">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="text-sm">No open positions</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  positions.map((p) => {
                    const markPrice = p.mark_price || p.current_price || 0;
                    const pnlColor = p.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400';
                    return (
                      <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-white text-sm">{p.symbol || p.symbol_canonical}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${p.side === 'long' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {p.side?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-gray-300 font-mono">{p.size}</td>
                        <td className="px-5 py-3.5 text-right text-sm text-gray-300 font-mono">₹{fmt(p.avg_price)}</td>
                        <td className="px-5 py-3.5 text-right text-sm text-gray-300 font-mono">₹{fmt(markPrice)}</td>
                        <td className={`px-5 py-3.5 text-right text-sm font-semibold ${pnlColor}`}>
                          {p.unrealized_pnl >= 0 ? '+' : ''}₹{fmt(p.unrealized_pnl)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Market Distribution Pie */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Market Distribution</h3>
          {summary?.market_distribution && summary.market_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={summary.market_distribution} dataKey="value" nameKey="market" cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                  {summary.market_distribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `₹${fmt(v)}`} contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={10} formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <span className="text-sm">No distribution data</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
