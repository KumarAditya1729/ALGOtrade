import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../store/tradingStore';
import { placeQuickOrder } from '../api/trading';
import { placeOpenAlgoOrder } from '../api/openalgo';
import { fetchBrokers } from '../api/brokers';
import type { BrokerCredential } from '../api/brokers';
import { wsClient } from '../api/websocket';
import { motion, AnimatePresence } from 'framer-motion';

export const OrderEntryForm: React.FC = () => {
  const { 
    symbol, setSymbol, 
    orderType, setOrderType, 
    side, setSide, 
    quantity, setQuantity, 
    price, setPrice, 
    status, setStatus, errorMessage,
    credentialId, setCredentialId,
    exchangeId, setExchangeId,
    marketType, setMarketType
  } = useTradingStore();
  
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [brokers, setBrokers] = useState<BrokerCredential[]>([]);

  useEffect(() => {
    fetchBrokers().then(data => {
      setBrokers(data);
      if (data.length > 0 && !credentialId) {
        setCredentialId(data[0].id);
        setExchangeId(data[0].exchange_id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!symbol) return;
    const unsubscribe = wsClient.on('tick', (data: any) => {
      if (data && data.symbol === symbol && data.price) {
        setLivePrice(data.price);
      }
    });
    return () => unsubscribe();
  }, [symbol]);

  const handleBrokerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    const broker = brokers.find(b => b.id === id);
    if (broker) {
      setCredentialId(id);
      setExchangeId(broker.exchange_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialId) {
      setStatus('error', 'Please select a broker account first');
      return;
    }
    if (quantity <= 0) {
      setStatus('error', 'Quantity must be greater than 0');
      return;
    }
    if (orderType === 'limit' && price <= 0) {
      setStatus('error', 'Limit price must be greater than 0');
      return;
    }

    setLoading(true);
    setStatus('submitting');
    
    try {
      let response;
      const isOpenAlgo = exchangeId.toLowerCase().includes('openalgo') || exchangeId.toLowerCase().includes('nse');
      
      if (isOpenAlgo) {
        const broker = brokers.find(b => b.id === credentialId);
        response = await placeOpenAlgoOrder({
          client_code: broker?.name || 'unknown',
          symbol,
          exchange: 'NSE', // Simplification, could be a field
          transaction_type: side.toUpperCase() as 'BUY' | 'SELL',
          product: marketType === 'margin' ? 'MIS' : 'CNC',
          order_type: orderType.toUpperCase() as 'MARKET' | 'LIMIT',
          quantity,
          price: orderType === 'limit' ? price : undefined,
        });
      } else {
        response = await placeQuickOrder({
          symbol,
          order_type: orderType,
          side,
          qty: quantity,
          limit_price: orderType === 'limit' ? price : undefined,
          credential_id: credentialId,
          exchange_id: exchangeId,
          market_type: marketType,
        });
      }
      
      if (response.status === 'success' || response.code === 0 || response.data) {
        setStatus('success');
      } else {
        setStatus('error', response.message || response.msg || 'Order rejected by backend');
      }
    } catch (err: any) {
      setStatus('error', err.response?.data?.message || err.response?.data?.msg || err.message || 'Failed to place order');
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (useTradingStore.getState().status === 'success') {
           setStatus('idle');
        }
      }, 3000);
    }
  };

  return (
    <div className="p-5 h-full flex flex-col relative overflow-hidden bg-transparent">
      {/* Top Gradient Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-30" />
      
      <h3 className="text-lg font-bold text-white mb-5 tracking-tight flex justify-between items-center">
        <span>Order Entry</span>
        {status === 'submitting' && (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"
          />
        )}
      </h3>
      
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-5">
        
        {/* Account Selection */}
        <div className="relative">
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-bold">Account / Broker</label>
          <select 
            className="w-full bg-[#1e1e1e]/80 border border-gray-700/80 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none shadow-inner"
            value={credentialId || ''}
            onChange={handleBrokerChange}
          >
            <option value="" disabled>Select Account...</option>
            {brokers.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.exchange_id})</option>
            ))}
          </select>
        </div>

        {/* Symbol Input */}
        <div className="relative group">
          <div className="flex justify-between items-end mb-1.5">
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold">Symbol</label>
            <AnimatePresence mode="popLayout">
              {livePrice !== null && (
                <motion.span 
                  key={livePrice}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-xs font-mono text-emerald-400 font-bold tracking-tight bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-500/20"
                >
                  ₹{livePrice.toFixed(2)}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <input 
            type="text" 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full bg-[#1e1e1e]/80 border border-gray-700/80 rounded-lg p-3 text-white font-mono text-lg font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none shadow-inner uppercase tracking-wider"
            placeholder="e.g. INFY"
            required
          />
        </div>

        {/* MarketType (Product) Toggle */}
        <div className="flex bg-[#1e1e1e]/80 rounded-lg p-1 border border-gray-700/80 relative shadow-inner mt-2">
          <motion.div 
            layout
            className="absolute bg-gray-700/50 rounded shadow-md top-1 bottom-1 w-[calc(50%-4px)] border border-gray-600/50"
            initial={false}
            animate={{ 
              x: marketType === 'spot' ? 0 : '100%',
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          <button
            type="button"
            onClick={() => setMarketType('spot')}
            className={`flex-1 text-xs py-2 rounded-md transition-colors relative z-10 font-bold tracking-widest ${marketType === 'spot' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            DELIVERY
          </button>
          <button
            type="button"
            onClick={() => setMarketType('margin')}
            className={`flex-1 text-xs py-2 rounded-md transition-colors relative z-10 font-bold tracking-widest ${marketType === 'margin' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            INTRADAY
          </button>
        </div>

        {/* Order Type Toggle */}
        <div className="flex bg-[#1e1e1e]/80 rounded-lg p-1 border border-gray-700/80 relative shadow-inner">
          <motion.div 
            layout
            className="absolute bg-gray-700/50 rounded shadow-md top-1 bottom-1 w-[calc(50%-4px)] border border-gray-600/50"
            initial={false}
            animate={{ 
              x: orderType === 'market' ? 0 : '100%',
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`flex-1 text-sm py-2 rounded-md transition-colors relative z-10 font-bold tracking-wide ${orderType === 'market' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`flex-1 text-sm py-2 rounded-md transition-colors relative z-10 font-bold tracking-wide ${orderType === 'limit' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Limit
          </button>
        </div>

        {/* Quantity and Price */}
        <div className="flex space-x-3">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-bold">Qty</label>
            <input 
              type="number" 
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-[#1e1e1e]/80 border border-gray-700/80 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none font-mono text-base font-bold shadow-inner"
              required
            />
          </div>
          <AnimatePresence>
            {orderType === 'limit' && (
              <motion.div 
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: '100%', marginLeft: 12 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                className="flex-1 overflow-hidden"
              >
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-bold">Price</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.05"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-[#1e1e1e]/80 border border-gray-700/80 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none font-mono text-base font-bold shadow-inner"
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1"></div>

        {/* Status Messages */}
        <AnimatePresence mode="popLayout">
          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg backdrop-blur-sm"
            >
              {errorMessage}
            </motion.div>
          )}
          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg backdrop-blur-sm font-medium flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Order placed successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2 mt-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            onClick={() => setSide('buy')}
            disabled={loading}
            className="flex-1 bg-[#00B852] hover:bg-[#00d15e] text-white font-black tracking-widest text-sm py-4 px-4 rounded-xl focus:outline-none disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(0,184,82,0.3)] hover:shadow-[0_0_30px_rgba(0,184,82,0.5)] border border-[#00B852]/50"
          >
            BUY
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            onClick={() => setSide('sell')}
            disabled={loading}
            className="flex-1 bg-[#FF4A4A] hover:bg-[#ff6161] text-white font-black tracking-widest text-sm py-4 px-4 rounded-xl focus:outline-none disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,74,74,0.3)] hover:shadow-[0_0_30px_rgba(255,74,74,0.5)] border border-[#FF4A4A]/50"
          >
            SELL
          </motion.button>
        </div>
      </form>
    </div>
  );
};
