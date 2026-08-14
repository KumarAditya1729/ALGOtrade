import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrders, cancelOrder } from '../api/orders';
import type { Order } from '../api/orders';
import { wsClient } from '../api/websocket';
import { motion, AnimatePresence } from 'framer-motion';

const tableVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 }
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  filled: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  complete: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  canceled: 'bg-gray-700/50 text-gray-400 border-gray-600/50',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export const OrdersTable: React.FC = () => {
  const queryClient = useQueryClient();
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = wsClient.on('order_update', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });
    return () => unsubscribe();
  }, [queryClient]);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders(1, 50),
    refetchInterval: 5000,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onSettled: () => setCancelingId(null),
  });

  const handleCancel = (orderId: number) => {
    if (confirm('Cancel this order?')) {
      setCancelingId(orderId);
      cancelMutation.mutate(orderId);
    }
  };

  if (isLoading) return <div className="h-64 bg-gray-900/50 rounded-xl animate-pulse border border-gray-800" />;
  if (isError) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/30">Failed to load orders</div>;

  const orders: Order[] = response?.list || [];

  const formatTime = (order: Order) => {
    if (order.signal_ts) return new Date(order.signal_ts * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    if (order.created_at) return new Date(order.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return '—';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-950/80">
            <tr>
              {['Time', 'Symbol', 'Type', 'Side', 'Amount', 'Price', 'Mode', 'Status', 'Action'].map(h => (
                <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === 'Amount' || h === 'Price' ? 'text-right' : h === 'Status' ? 'text-center' : h === 'Action' ? 'text-right' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody variants={tableVariants} initial="hidden" animate="show" className="divide-y divide-gray-800/50">
            {orders.length === 0 ? (
              <motion.tr variants={rowVariants}>
                <td colSpan={9} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm">No orders found</span>
                    <span className="text-xs text-gray-700">Pending and recent orders will appear here</span>
                  </div>
                </td>
              </motion.tr>
            ) : (
              orders.map((order) => {
                const isBuy = order.signal_type === 'long';
                const statusClass = statusColors[order.status] || 'bg-gray-700/50 text-gray-400 border-gray-600/50';
                return (
                  <motion.tr variants={rowVariants} key={order.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{formatTime(order)}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-white whitespace-nowrap">
                      {order.symbol || order.symbol_canonical || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-300 font-mono uppercase">{order.order_type}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {isBuy ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right font-mono">{parseFloat(order.amount).toFixed(4)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right font-mono">
                      {parseFloat(order.price) > 0 ? `₹${parseFloat(order.price).toLocaleString('en-IN')}` : 'MKT'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      <span className={`px-2 py-0.5 rounded text-xs ${order.execution_mode === 'paper' ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
                        {order.execution_mode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${statusClass}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <AnimatePresence>
                        {order.status === 'pending' && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => handleCancel(order.id)}
                            disabled={cancelingId === order.id}
                            className="text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/30 text-xs transition-all disabled:opacity-50"
                          >
                            {cancelingId === order.id ? 'Canceling...' : 'Cancel'}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </motion.tbody>
        </table>
      </div>
      {orders.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          <span className="text-xs text-gray-600">Auto-refreshes every 5s</span>
        </div>
      )}
    </div>
  );
};
