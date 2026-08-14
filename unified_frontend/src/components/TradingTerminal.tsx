import React, { useEffect, useState } from 'react';
import { ChartComponent } from './ChartComponent';
import { OrderEntryForm } from './OrderEntryForm';
import { OrderBook } from './OrderBook';
import { TradingWatchlist } from './TradingWatchlist';
import { useTradingStore } from '../store/tradingStore';
import { fetchBalances, fetchPositions, fetchAngelHoldings, fetchAngelPositions } from '../api/trading';
import { motion, AnimatePresence } from 'framer-motion';

export const TradingTerminal: React.FC = () => {
  const { exchangeId, credentialId, marketType } = useTradingStore();
  const [balances, setBalances] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [bottomTab, setBottomTab] = useState<'positions' | 'orders' | 'holdings'>('positions');
  const [rightTab, setRightTab] = useState<'order_entry' | 'order_book'>('order_entry');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (exchangeId === 'angel') {
          // Fetch Angel One specific holdings & positions
          const [angelHoldings, angelPositions] = await Promise.all([
            fetchAngelHoldings(),
            fetchAngelPositions()
          ]);
          
          if (angelHoldings && angelHoldings.data) {
            setBalances(angelHoldings.data.map((h: any) => ({
              asset: h.symbol,
              total: h.quantity,
              free: h.quantity,
              ...h
            })));
          }
          
          if (angelPositions && angelPositions.data) {
            setPositions(angelPositions.data);
          }
        } else {
          // Standard broker fetch
          const balRes = await fetchBalances(exchangeId, marketType, credentialId || undefined);
          if (balRes && balRes.data) {
            if (Array.isArray(balRes.data)) {
              setBalances(balRes.data);
            } else {
              setBalances([
                { 
                  asset: balRes.data.currency || 'USDT', 
                  total: balRes.data.total || 0, 
                  free: balRes.data.available || 0 
                }
              ]);
            }
          }
          
          const posRes = await fetchPositions(exchangeId, marketType, undefined, credentialId || undefined);
          if (posRes && posRes.data) {
            setPositions(Array.isArray(posRes.data) ? posRes.data : []);
          }
        }
      } catch (err) {
        console.error('Failed to load balances or positions', err);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [exchangeId, credentialId, marketType]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-[#050505] p-2 gap-2 text-white overflow-hidden">
      
      {/* Main Top Section (3 Columns) */}
      <div className="flex flex-1 gap-2 overflow-hidden min-h-[400px]">
        
        {/* Left Column: Watchlist */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-[320px] flex-shrink-0 h-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-gray-800/60 rounded-xl overflow-hidden shadow-2xl z-10 hidden lg:block"
        >
          <TradingWatchlist />
        </motion.div>

        {/* Center Column: Advanced Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 h-full relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-gray-800/60 rounded-xl overflow-hidden shadow-2xl z-0"
        >
          <ChartComponent />
        </motion.div>

        {/* Right Column: Order Entry & Order Book */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="w-[340px] flex-shrink-0 h-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-gray-800/60 rounded-xl flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Right Panel Tabs */}
          <div className="flex border-b border-gray-800/60 bg-[#111]">
            {[
              { id: 'order_entry', label: 'Order Entry' },
              { id: 'order_book', label: 'Order Book' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id as any)}
                className={`flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-colors relative ${
                  rightTab === tab.id 
                    ? 'text-blue-400 bg-white/[0.02]' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
              >
                {tab.label}
                {rightTab === tab.id && (
                  <motion.div layoutId="rightTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {rightTab === 'order_entry' && (
                <motion.div
                  key="order_entry"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <OrderEntryForm />
                </motion.div>
              )}
              {rightTab === 'order_book' && (
                <motion.div
                  key="order_book"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <OrderBook />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>

      {/* Bottom Drawer (Positions, Orders, Holdings) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="h-[250px] flex-shrink-0 bg-[#0a0a0a]/80 backdrop-blur-xl border border-gray-800/60 rounded-xl flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Bottom Tabs */}
        <div className="flex border-b border-gray-800/60 px-4 bg-white/[0.02]">
          {['Positions', 'Orders', 'Holdings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setBottomTab(tab.toLowerCase() as any)}
              className={`px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition-colors relative ${
                bottomTab === tab.toLowerCase() 
                  ? 'text-blue-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
              {bottomTab === tab.toLowerCase() && (
                <motion.div layoutId="bottomTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-4">
          <AnimatePresence mode="wait">
            {bottomTab === 'positions' && (
              <motion.div
                key="positions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {positions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-600 gap-3">
                    <div className="p-3 rounded-full bg-gray-900/50 border border-gray-800">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <div className="text-center text-sm font-semibold text-gray-400">You don't have any open positions yet</div>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b border-gray-800/60">
                      <tr>
                        <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">Symbol</th>
                        <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">Side</th>
                        <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px] text-right">Qty</th>
                        <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px] text-right">Avg Price</th>
                        <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px] text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {positions.map((p, i) => (
                        <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="py-3 px-2 text-white font-bold">{p.symbol}</td>
                          <td className={`py-3 px-2 font-bold ${p.side === 'buy' || p.side === 'long' ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                            {p.side.toUpperCase()}
                          </td>
                          <td className="py-3 px-2 text-gray-300 font-mono text-right">{p.size || p.qty}</td>
                          <td className="py-3 px-2 text-gray-300 font-mono text-right">₹{parseFloat(p.entry_price || 0).toFixed(2)}</td>
                          <td className={`py-3 px-2 font-black font-mono text-right ${p.pnl >= 0 || p.unrealized_pnl >= 0 ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                            {p.pnl >= 0 || p.unrealized_pnl >= 0 ? '+' : ''}{parseFloat(p.unrealized_pnl || p.pnl || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>
            )}

            {bottomTab === 'holdings' && (
              <motion.div
                key="holdings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {balances.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-600 gap-3">
                    <div className="p-3 rounded-full bg-gray-900/50 border border-gray-800">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="text-center text-sm font-semibold text-gray-400">No holdings or balances found.</div>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b border-gray-800/60">
                      <tr>
                        <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">Asset</th>
                        <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px] text-right">Total</th>
                        <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px] text-right">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {balances.map((b, i) => (
                        <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="py-3 px-2 text-white font-bold">{b.asset}</td>
                          <td className="py-3 px-2 text-gray-300 font-mono text-right">{parseFloat(b.total || 0).toFixed(4)}</td>
                          <td className="py-3 px-2 text-[#00B852] font-mono font-bold text-right">{parseFloat(b.free || 0).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>
            )}

            {bottomTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center h-40 text-gray-600 gap-3"
              >
                <div className="p-3 rounded-full bg-gray-900/50 border border-gray-800">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <div className="text-center text-sm font-semibold text-gray-400">You don't have any pending orders.</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
    </div>
  );
};
