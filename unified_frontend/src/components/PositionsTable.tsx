import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPositions, closePosition } from '../api/portfolio';
import type { Position } from '../api/portfolio';
import { motion, AnimatePresence } from 'framer-motion';

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
};

export const PositionsTable: React.FC = () => {
  const queryClient = useQueryClient();
  const [closingId, setClosingId] = useState<number | null>(null);

  const { data: positions, isLoading, isError } = useQuery({
    queryKey: ['portfolioPositions'],
    queryFn: fetchPositions,
    refetchInterval: 5000, // Poll every 5s
  });

  const closeMutation = useMutation({
    mutationFn: closePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolioPositions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioSummary'] });
    },
    onSettled: () => setClosingId(null),
  });

  const handleClose = (positionId: number) => {
    if (confirm('Are you sure you want to close this position?')) {
      setClosingId(positionId);
      closeMutation.mutate(positionId);
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-gray-900/50 rounded-xl animate-pulse border border-gray-800"></div>;
  }

  if (isError) {
    return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/30">Failed to load positions</div>;
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden relative">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-950/80 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Side</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Entry Px</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Px</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">P&L</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <motion.tbody 
            variants={tableVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-gray-800/50 bg-gray-900/30"
          >
            {(!positions || positions.length === 0) ? (
              <motion.tr variants={rowVariants}>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No open positions
                </td>
              </motion.tr>
            ) : (
              positions.map((pos: Position) => (
                <motion.tr 
                  variants={rowVariants}
                  key={pos.id} 
                  className="hover:bg-gray-800/50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-200">
                    {pos.symbol} <span className="text-xs font-normal text-gray-500 ml-1">{pos.exchange}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${pos.side.toLowerCase() === 'buy' || pos.side.toLowerCase() === 'long' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {pos.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right font-mono">{pos.size}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right font-mono">{pos.avg_price.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right font-mono">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={pos.current_price}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                      >
                        {(pos.current_price ?? pos.mark_price ?? pos.avg_price).toFixed(2)}
                      </motion.span>
                    </AnimatePresence>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold font-mono">
                    <div className={pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {pos.unrealized_pnl >= 0 ? '+' : ''}{pos.unrealized_pnl.toFixed(2)}
                      <span className="text-xs ml-1 font-normal opacity-70">({(pos.unrealized_pnl_pct ?? 0).toFixed(2)}%)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleClose(pos.id)}
                      disabled={closingId === pos.id}
                      className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 px-4 py-1.5 rounded-lg border border-red-500/30 hover:border-red-600 transition-all disabled:opacity-50 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      {closingId === pos.id ? 'Closing...' : 'Close'}
                    </motion.button>
                  </td>
                </motion.tr>
              ))
            )}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
};
