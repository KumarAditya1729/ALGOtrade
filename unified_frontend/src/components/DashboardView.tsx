// @ts-nocheck
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary } from '../api/dashboard';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number, decimals = 2) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
  delay?: number;
}> = ({ label, value, sub, color = 'text-white', icon, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    className="relative group bg-[#0a0a0a]/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-2 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:border-gray-700/80"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-widest relative z-10">
      <span>{label}</span>
      <span className="w-8 h-8 flex items-center justify-center bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-inner group-hover:text-blue-400 transition-colors duration-300">
        {icon}
      </span>
    </div>
    <div className={`text-3xl font-black tracking-tight ${color} relative z-10 font-mono mt-1`}>{value}</div>
    {sub && <div className="text-xs text-gray-500 font-medium relative z-10">{sub}</div>}
  </motion.div>
);

const EmptyChart: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
    <div className="p-4 rounded-full bg-gray-900/50 border border-gray-800">
      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    </div>
    <div className="text-center">
      <p className="text-sm font-semibold text-gray-300">{message}</p>
      <p className="text-xs text-gray-500 mt-1">Data will populate once algorithms are active</p>
    </div>
  </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a]/90 backdrop-blur-md border border-gray-700 rounded-xl px-4 py-3 text-sm shadow-[0_8px_30px_rgb(0,0,0,0.8)]">
      <div className="text-gray-400 mb-2 font-medium">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }} className="font-bold flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-mono">{p.value >= 0 ? '+' : ''}₹{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const DashboardView: React.FC = () => {
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 15000,
  });

  // Build cumulative equity curve from daily_pnl_chart
  const equityCurve = useMemo(() => {
    if (!summary?.daily_pnl_chart?.length) return [];
    let cum = summary.total_equity - (summary.total_pnl || 0);
    return summary.daily_pnl_chart.map(d => {
      cum += d.pnl;
      return { date: d.date, equity: parseFloat(cum.toFixed(2)), pnl: d.pnl };
    });
  }, [summary]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-pulse">
        <div className="h-10 w-64 bg-gray-800/50 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-800/40 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[350px] bg-gray-800/40 rounded-2xl" />
          <div className="h-[350px] bg-gray-800/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm backdrop-blur-md">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Failed to load dashboard metrics — please check your backend connection.
      </div>
    );
  }

  const perf = summary.performance || {} as any;
  const winRate = (perf.win_rate || 0) * 100;
  const activeStrategies = (summary.running_strategy_count || 0) + (summary.running_script_count || 0) + (summary.running_bot_count || 0);
  const equityColor = summary.total_pnl >= 0 ? '#00B852' : '#FF4A4A'; // Angel One Colors
  const pnlColor = summary.total_realized_pnl >= 0 ? 'text-[#00B852]' : 'text-[#FF4A4A]';

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-black text-white tracking-tight">Dashboard Overview</h2>
        <p className="text-gray-400 text-sm mt-1 font-medium">Real-time snapshot of your algorithmic performance</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Equity"
          value={`₹${fmt(summary.total_equity)}`}
          sub={`Margin utilized: ₹${fmt(summary.total_used_margin)}`}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          delay={0.1}
        />
        <StatCard
          label="Total P&L"
          value={`${summary.total_pnl >= 0 ? '+' : ''}₹${fmt(summary.total_pnl)}`}
          sub={`Realized: ₹${fmt(summary.total_realized_pnl)} · Unrealized: ₹${fmt(summary.total_unrealized_pnl)}`}
          color={summary.total_pnl >= 0 ? 'text-[#00B852] drop-shadow-[0_0_8px_rgba(0,184,82,0.5)]' : 'text-[#FF4A4A] drop-shadow-[0_0_8px_rgba(255,74,74,0.5)]'}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          delay={0.2}
        />
        <StatCard
          label="Active Algos"
          value={String(activeStrategies)}
          sub={`AI: ${summary.ai_strategy_count} · Bots: ${summary.running_bot_count} · Scripts: ${summary.running_script_count}`}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
          delay={0.3}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          sub={`${perf.winning_trades || 0}W / ${perf.losing_trades || 0}L · ${perf.total_trades || 0} Total`}
          color={winRate >= 50 ? 'text-[#00B852]' : winRate > 0 ? 'text-yellow-400' : 'text-white'}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          delay={0.4}
        />
      </div>

      {/* Charts Row 1 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Equity Curve */}
        <div className="lg:col-span-2 bg-[#0a0a0a]/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          {/* Subtle background glow based on equity */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full opacity-10 blur-3xl transition-colors duration-1000" style={{ backgroundColor: equityColor }} />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h3 className="text-white font-bold text-lg">Portfolio Equity</h3>
              <p className="text-gray-500 text-xs mt-1 font-medium tracking-wide">CUMULATIVE ACCOUNT VALUE</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black font-mono tracking-tight ${equityColor === '#00B852' ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                {summary.total_pnl >= 0 ? '+' : ''}₹{fmt(summary.total_pnl)}
              </span>
            </div>
          </div>
          <div className="h-64 relative z-10">
            {equityCurve.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurve} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={equityColor} stopOpacity={0.4} />
                      <stop offset="50%" stopColor={equityColor} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={equityColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v.toLocaleString()}`} width={80} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="equity" name="Equity" stroke={equityColor}
                    strokeWidth={3} fill="url(#eqGrad)" dot={false} activeDot={{ r: 6, fill: equityColor, stroke: '#1a1a1a', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Awaiting Trade Data" />
            )}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-white font-bold text-lg mb-6">Performance Metrics</h3>
          <div className="space-y-1 flex-1">
            {[
              { label: 'Profit Factor', value: perf.profit_factor ? perf.profit_factor.toFixed(2) : '—', color: 'text-white' },
              { label: 'Avg Win', value: perf.avg_win ? `₹${fmt(perf.avg_win)}` : '—', color: 'text-[#00B852]' },
              { label: 'Avg Loss', value: perf.avg_loss ? `₹${fmt(perf.avg_loss)}` : '—', color: 'text-[#FF4A4A]' },
              { label: 'Max Drawdown', value: perf.max_drawdown_pct ? `${(perf.max_drawdown_pct * 100).toFixed(1)}%` : '—', color: 'text-[#FF4A4A]' },
              { label: 'Best Day', value: perf.best_day ? `₹${fmt(perf.best_day)}` : '—', color: 'text-[#00B852]' },
              { label: 'Worst Day', value: perf.worst_day ? `₹${fmt(perf.worst_day)}` : '—', color: 'text-[#FF4A4A]' },
            ].map((m, idx) => (
              <div key={m.label} className="flex items-center justify-between py-3.5 border-b border-gray-800/50 last:border-0 hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                <span className="text-gray-400 text-sm font-medium">{m.label}</span>
                <span className={`text-sm font-mono font-bold ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Daily P&L Bar */}
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-6 shadow-xl">
          <h3 className="text-white font-bold text-lg mb-1">Daily Realized P&L</h3>
          <p className="text-gray-500 text-xs mb-6 font-medium tracking-wide uppercase">Performance by Day</p>
          <div className="h-56">
            {summary.daily_pnl_chart?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.daily_pnl_chart} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v}`} width={80} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="pnl" name="Daily P&L" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {summary.daily_pnl_chart.map((d, i) => (
                      <Cell key={i} fill={d.pnl >= 0 ? '#00B852' : '#FF4A4A'} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Awaiting Trade Data" />
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-white font-bold text-lg mb-6">Recent Executions</h3>
          {summary.recent_trades?.length > 0 ? (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider font-bold border-b border-gray-800/60">
                    <th className="text-left pb-3 pr-3">Symbol</th>
                    <th className="text-left pb-3 pr-3">Side</th>
                    <th className="text-right pb-3 pr-3">P&L</th>
                    <th className="text-right pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {summary.recent_trades.slice(0, 10).map((t: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group cursor-default">
                      <td className="py-3 pr-3 font-medium text-white">{t.symbol || t.symbol_canonical || '—'}</td>
                      <td className={`py-3 pr-3 font-bold ${t.side === 'long' || t.signal_type === 'long' ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                        {(t.side || t.signal_type || '—').toUpperCase()}
                      </td>
                      <td className={`py-3 pr-3 text-right font-bold font-mono ${(t.pnl || 0) >= 0 ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                        {(t.pnl || 0) >= 0 ? '+' : ''}₹{fmt(t.pnl || 0)}
                      </td>
                      <td className="py-3 text-right text-gray-500 font-mono text-xs">
                        {t.closed_at || t.created_at ? new Date((t.closed_at || t.created_at) * 1000 || t.closed_at || t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyChart message="No recent trades" />
          )}
        </div>
      </motion.div>

      {/* Current Positions */}
      <AnimatePresence>
        {summary.current_positions?.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-6 shadow-xl mb-10"
          >
            <h3 className="text-white font-bold text-lg mb-6">Live Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider font-bold border-b border-gray-800/60">
                    <th className="text-left pb-3 pr-4">Symbol</th>
                    <th className="text-left pb-3 pr-4">Side</th>
                    <th className="text-right pb-3 pr-4">Size</th>
                    <th className="text-right pb-3 pr-4">Entry</th>
                    <th className="text-right pb-3 pr-4">LTP</th>
                    <th className="text-right pb-3">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {summary.current_positions.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group cursor-default">
                      <td className="py-4 pr-4 font-bold text-white">{p.symbol || p.symbol_canonical}</td>
                      <td className={`py-4 pr-4 font-bold ${p.side === 'long' ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                        {(p.side || '').toUpperCase()}
                      </td>
                      <td className="py-4 pr-4 text-right text-gray-300 font-mono">{p.size || p.quantity || '—'}</td>
                      <td className="py-4 pr-4 text-right text-gray-300 font-mono">₹{fmt(p.entry_price || 0)}</td>
                      <td className="py-4 pr-4 text-right text-gray-300 font-mono">₹{fmt(p.current_price || p.mark_price || 0)}</td>
                      <td className={`py-4 text-right font-black font-mono ${(p.unrealized_pnl || 0) >= 0 ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                        {(p.unrealized_pnl || 0) >= 0 ? '+' : ''}₹{fmt(p.unrealized_pnl || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
