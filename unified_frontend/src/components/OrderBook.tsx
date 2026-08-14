import React from 'react';
import { motion } from 'framer-motion';

export const OrderBook: React.FC = () => {
  // Static placeholder data for Market Depth as requested by TRADING_TERMINAL_SPEC
  const bids = [
    { qty: 1200, price: 25010 },
    { qty: 800, price: 25009 },
    { qty: 1500, price: 25008 },
    { qty: 300, price: 25007 },
    { qty: 2100, price: 25006 },
  ];

  const asks = [
    { qty: 900, price: 25011 },
    { qty: 1100, price: 25012 },
    { qty: 700, price: 25013 },
    { qty: 450, price: 25014 },
    { qty: 3000, price: 25015 },
  ];

  const totalBidQty = bids.reduce((sum, b) => sum + b.qty, 0);
  const totalAskQty = asks.reduce((sum, a) => sum + a.qty, 0);
  const maxQty = Math.max(...bids.map(b => b.qty), ...asks.map(a => a.qty));

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden p-3 font-mono text-sm">
      <div className="flex justify-between items-center mb-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
        <span>Order Book (Level 2)</span>
        <span className="text-gray-400">Spread: ₹1.00</span>
      </div>

      {/* Header Row */}
      <div className="flex text-xs font-bold text-gray-500 mb-2 border-b border-gray-800 pb-2 uppercase tracking-wider">
        <div className="w-1/4 text-right">Bid Qty</div>
        <div className="w-1/4 text-right pr-2">Bid Price</div>
        <div className="w-1/4 text-right pl-2">Ask Price</div>
        <div className="w-1/4 text-right">Ask Qty</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 relative">
        {/* Render pairs of bid/ask rows */}
        {Array.from({ length: 5 }).map((_, i) => {
          const bid = bids[i];
          const ask = asks[i];
          const bidWidth = bid ? (bid.qty / maxQty) * 100 : 0;
          const askWidth = ask ? (ask.qty / maxQty) * 100 : 0;

          return (
            <div key={i} className="flex relative items-center py-1 group hover:bg-white/[0.02] cursor-pointer">
              {/* Bid Side */}
              <div className="w-1/2 flex relative pr-2">
                {/* Visual Depth Bar */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${bidWidth}%` }}
                  className="absolute right-2 top-0 bottom-0 bg-[#00B852]/10 z-0 rounded-l"
                />
                <div className="w-1/2 text-right text-gray-300 z-10">{bid?.qty || '-'}</div>
                <div className="w-1/2 text-right font-bold text-[#00B852] z-10">
                  {bid ? `₹${bid.price.toLocaleString()}` : '-'}
                </div>
              </div>

              {/* Ask Side */}
              <div className="w-1/2 flex relative pl-2">
                 {/* Visual Depth Bar */}
                 <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${askWidth}%` }}
                  className="absolute left-2 top-0 bottom-0 bg-[#FF4A4A]/10 z-0 rounded-r"
                />
                <div className="w-1/2 text-right font-bold text-[#FF4A4A] z-10">
                  {ask ? `₹${ask.price.toLocaleString()}` : '-'}
                </div>
                <div className="w-1/2 text-right text-gray-300 z-10">{ask?.qty || '-'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals Footer */}
      <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between text-xs">
        <div className="flex flex-col">
          <span className="text-gray-500 font-bold uppercase">Total Bid</span>
          <span className="text-gray-300">{totalBidQty.toLocaleString()}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-gray-500 font-bold uppercase">Total Ask</span>
          <span className="text-gray-300">{totalAskQty.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
