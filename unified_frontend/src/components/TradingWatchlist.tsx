// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '../store/tradingStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getWatchlist, 
  getWatchlistPrices, 
  searchSymbols, 
  addWatchlistItem, 
  removeWatchlistItem,
  type SymbolSearchResult
} from '../api/market';
import { wsClient } from '../api/websocket';

export interface LiveWatchlistItem {
  symbol: string;
  market: string;
  ltp: number;
  change: number;
  pChange: number;
}

export const TradingWatchlist: React.FC = () => {
  const { symbol: activeSymbol, setSymbol, setOrderSide } = useTradingStore();
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  
  const [items, setItems] = useState<LiveWatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const list = await getWatchlist();
      const prices = await getWatchlistPrices();
      
      const merged: LiveWatchlistItem[] = list.map(item => {
        const p = prices[item.symbol];
        return {
          symbol: item.symbol,
          market: item.market || 'NSE',
          ltp: p?.price || 0,
          change: p?.change_24h || 0,
          pChange: p?.change_pct_24h || 0
        };
      });
      setItems(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  useEffect(() => {
    const handleTick = (data: any) => {
      if (!data || !data.symbol || !data.price) return;
      setItems(prev => prev.map(item => {
        if (item.symbol === data.symbol) {
          return {
            ...item,
            ltp: data.price,
            change: data.change_24h !== undefined ? data.change_24h : item.change,
            pChange: data.change_pct_24h !== undefined ? data.change_pct_24h : item.pChange
          };
        }
        return item;
      }));
    };
    
    wsClient.on('tick', handleTick);
    return () => {
      wsClient.off('tick', handleTick);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (val.trim().length > 1) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchSymbols('India', val.trim(), 10);
        setSearchResults(results);
        setIsSearching(false);
      }, 500);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleAddSymbol = async (symbol: string, market: string) => {
    setSearchQuery('');
    setSearchResults([]);
    await addWatchlistItem(market, symbol);
    loadWatchlist();
  };

  const handleRemoveSymbol = async (symbol: string, market: string) => {
    await removeWatchlistItem(market, symbol);
    loadWatchlist();
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header Tabs (Condensed to 1) */}
      <div className="flex border-b border-gray-800/60 overflow-x-auto hide-scrollbar bg-white/[0.02]">
        <button className="px-4 py-3.5 text-xs font-bold whitespace-nowrap transition-colors relative text-blue-400">
          Watchlist
          <motion.div layoutId="wlTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-800/60 bg-black/20 relative z-20">
        <div className="relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search eg: INFY, RELIANCE" 
            className="w-full bg-[#1e1e1e]/80 border border-gray-700/80 text-white rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
          />
          {isSearching ? (
            <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-gray-500 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {searchResults.length > 0 && searchQuery.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-3 right-3 top-[calc(100%-8px)] mt-2 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto"
            >
              {searchResults.map((res, i) => (
                <div 
                  key={`${res.symbol}-${i}`}
                  onClick={() => handleAddSymbol(res.symbol, res.market || 'NSE')}
                  className="px-4 py-3 border-b border-gray-800/50 hover:bg-white/[0.05] cursor-pointer flex justify-between items-center group transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-sm tracking-tight">{res.symbol}</span>
                    <span className="text-gray-500 text-[10px]">{res.name || res.symbol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-900/50 px-1 rounded border border-gray-800">{res.market || 'NSE'}</span>
                    <button className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto z-10 relative">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
             <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
             <div className="text-xs">Loading Watchlist...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3 p-6 text-center">
             <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
             <div className="text-sm font-semibold text-gray-400">Watchlist is empty</div>
             <div className="text-xs text-gray-500">Search for symbols above to add them.</div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.symbol}
              onMouseEnter={() => setHoveredSymbol(item.symbol)}
              onMouseLeave={() => setHoveredSymbol(null)}
              onClick={() => setSymbol(item.symbol)}
              className={`relative px-4 py-3 border-b border-gray-800/40 cursor-pointer group transition-all duration-300 ${
                activeSymbol === item.symbol 
                  ? 'bg-blue-900/20 border-l-2 border-l-blue-500 pl-[14px]' 
                  : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-bold tracking-tight ${activeSymbol === item.symbol ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-gray-200 group-hover:text-white transition-colors'}`}>
                  {item.symbol}
                </span>
                <span className={`text-sm font-black font-mono tracking-tight ${item.change >= 0 ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                  {item.ltp.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-600 bg-gray-900/50 px-1 rounded border border-gray-800">{item.market}</span>
                <span className={`text-[11px] font-mono font-bold ${item.change >= 0 ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.change >= 0 ? '+' : ''}{item.pChange.toFixed(2)}%)
                </span>
              </div>

              {/* Hover Actions */}
              <AnimatePresence>
                {hoveredSymbol === item.symbol && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-[#0a0a0a]/90 backdrop-blur-md pl-4 py-2 rounded-l-xl shadow-[-10px_0_15px_rgba(0,0,0,0.5)]"
                  >
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 bg-[#00B852] hover:bg-[#00d15e] text-white rounded-lg text-xs font-black flex items-center justify-center shadow-[0_0_10px_rgba(0,184,82,0.4)] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSymbol(item.symbol);
                        setOrderSide('buy');
                      }}
                    >
                      B
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 bg-[#FF4A4A] hover:bg-[#ff6161] text-white rounded-lg text-xs font-black flex items-center justify-center shadow-[0_0_10px_rgba(255,74,74,0.4)] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSymbol(item.symbol);
                        setOrderSide('sell');
                      }}
                    >
                      S
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-black flex items-center justify-center transition-colors ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSymbol(item.symbol, item.market);
                      }}
                      title="Remove from Watchlist"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
