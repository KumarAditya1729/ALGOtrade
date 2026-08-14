import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSummary } from '../api/portfolio';

export const PortfolioSummary: React.FC = () => {
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['portfolioSummary'],
    queryFn: fetchSummary,
    refetchInterval: 10000, // Poll every 10s
  });

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-800 rounded animate-pulse"></div>)}
    </div>;
  }

  if (isError || !summary) {
    return <div className="p-4 bg-red-900/30 text-red-400 rounded border border-red-800 mb-6">Failed to load portfolio summary</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
        <h4 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Equity</h4>
        <div className="text-2xl font-bold text-white">₹{(summary.total_market_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
        <h4 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Unrealized P&L</h4>
        <div className={`text-2xl font-bold ${(summary.total_pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {(summary.total_pnl ?? 0) >= 0 ? '+' : ''}₹{(summary.total_pnl ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
        <h4 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Cost</h4>
        <div className="text-2xl font-bold text-blue-400">₹{(summary.total_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
    </div>
  );
};
