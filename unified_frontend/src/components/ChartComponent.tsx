// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import type { Chart, KLineData } from 'klinecharts';
import { useTradingStore } from '../store/tradingStore';
import { calculateIndicator, fetchAvailableIndicators } from '../api/indicators';
import { fetchKlines, getWatchlistPrices, type WatchlistPrice } from '../api/market';
import { Activity, PenTool, MousePointer2, Move, Type, Eraser, LineChart, Square, Triangle } from 'lucide-react';

export const ChartComponent: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  
  const symbol = useTradingStore((state) => state.symbol);
  
  const [availableIndicators, setAvailableIndicators] = useState<any[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [isLoadingIndicator, setIsLoadingIndicator] = useState(false);
  const [timeframe, setTimeframe] = useState<string>('1d');
  const [quote, setQuote] = useState<WatchlistPrice | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentTool, setCurrentTool] = useState<string>('');

  // Fetch current quote
  useEffect(() => {
    if (!symbol) return;
    let isSubscribed = true;
    const fetchQuote = async () => {
      try {
        const prices = await getWatchlistPrices();
        if (isSubscribed && prices[symbol]) {
          setQuote(prices[symbol]);
        }
      } catch (err) {}
    };
    fetchQuote();
    const interval = setInterval(fetchQuote, 5000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [symbol]);

  useEffect(() => {
    fetchAvailableIndicators()
      .then(res => {
        if(Array.isArray(res)) setAvailableIndicators(res);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize KlineChart
    const chart = init(chartContainerRef.current, {
      grid: {
        show: true,
        horizontal: {
          show: true,
          size: 1,
          color: '#2a2a35',
          style: 'solid',
        },
        vertical: {
          show: true,
          size: 1,
          color: '#2a2a35',
          style: 'solid',
        }
      },
      candle: {
        type: 'candle_solid',
        bar: {
          upColor: '#26a69a',
          downColor: '#ef5350',
          noChangeColor: '#888888',
          upBorderColor: '#26a69a',
          downBorderColor: '#ef5350',
          noChangeBorderColor: '#888888',
          upWickColor: '#26a69a',
          downWickColor: '#ef5350',
          noChangeWickColor: '#888888'
        }
      },
      yAxis: {
        position: 'right',
      }
    });

    if (chart) {
      chartRef.current = chart;
      
      // Override default background to match theme
      chart.setStyles({
        chart: {
          crosshair: {
            horizontal: {
              line: { color: '#ffffff', style: 'dashed' },
              text: { backgroundColor: '#3b82f6' }
            },
            vertical: {
              line: { color: '#ffffff', style: 'dashed' },
              text: { backgroundColor: '#3b82f6' }
            }
          }
        }
      });
    }

    let isSubscribed = true;
    
    const loadKlines = async () => {
      try {
        const marketName = symbol.includes('-') ? 'India' : 'Crypto';
        const data = await fetchKlines(marketName, symbol, timeframe, 500);
        
        if (!isSubscribed || !chart) return;
        
        if (data && data.length > 0) {
          const formattedData: Kline[] = data.map(k => ({
            timestamp: k.time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume || 0,
            turnover: 0
          })).sort((a, b) => a.timestamp - b.timestamp);
          
          chart.applyNewData(formattedData);
        } else {
          chart.applyNewData([]);
        }
      } catch (err) {
        console.error("Failed to load klines:", err);
      }
    };
    
    loadKlines();

    const handleResize = () => {
      if (chart) chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isSubscribed = false;
      window.removeEventListener('resize', handleResize);
      if (chartContainerRef.current) {
        dispose(chartContainerRef.current);
      }
      chartRef.current = null;
    };
  }, [symbol, timeframe]);

  const handleApplyIndicator = async () => {
    if (!selectedIndicator || !chartRef.current) return;
    setIsLoadingIndicator(true);
    
    try {
      const res = await calculateIndicator({
        symbol,
        indicator_id: parseInt(selectedIndicator, 10),
        timeframe: timeframe,
        market: 'Crypto',
        limit: 100,
        params: {}
      });

      if (res.plots && res.plots.length > 0) {
        const indicatorName = availableIndicators.find(i => i.id.toString() === selectedIndicator)?.name || 'MA';
        chartRef.current.createIndicator(indicatorName, true, { id: `pane_${indicatorName}` });
      }

    } catch (err) {
      console.error('Failed to load indicator:', err);
    } finally {
      setIsLoadingIndicator(false);
    }
  };

  const setDrawingTool = (toolName: string) => {
    if (!chartRef.current) return;
    
    if (toolName === 'clear') {
      chartRef.current.clearOverlay();
      setCurrentTool('');
      return;
    }
    
    if (toolName === currentTool) {
      chartRef.current.createOverlay({ name: 'none' } as any);
      setCurrentTool('');
      return;
    }

    setCurrentTool(toolName);
    chartRef.current.createOverlay(toolName);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border border-gray-800/60 rounded-xl overflow-hidden relative">
      {/* Market Header Row */}
      <div className="p-3 border-b border-gray-800/60 flex flex-wrap gap-4 justify-between items-center bg-[#0a0a0a]/90 z-10 relative shadow-sm">
        
        {/* Left Side: Symbol & Quote */}
        <div className="flex items-center space-x-6">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-xl tracking-tight text-white">{symbol}</h3>
              <span className="text-[10px] uppercase tracking-widest font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                {symbol.includes('-') ? 'NSE' : 'CRYPTO'}
              </span>
            </div>
            <div className="text-xs text-gray-400 font-medium">Auto-Routed</div>
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-2xl font-black font-mono tracking-tighter text-white">
              {quote ? `₹${quote.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '---'}
            </span>
            {quote && (
              <div className={`flex items-center font-bold text-sm font-mono ${quote.change_24h >= 0 ? 'text-[#00B852]' : 'text-[#FF4A4A]'}`}>
                <span>{quote.change_24h > 0 ? '+' : ''}{quote.change_24h.toFixed(2)}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-sm bg-black/20 text-xs">
                  {quote.change_pct_24h > 0 ? '+' : ''}{quote.change_pct_24h.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Tools & Status */}
        <div className="flex items-center space-x-4">
          <div className="flex bg-[#111] p-1 rounded-lg border border-gray-800">
            {['1m', '5m', '15m', '1h', '1d', '1w'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${timeframe === tf ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 border-l border-gray-800/60 pl-4">
            <select
              className="bg-[#111] border border-gray-800 rounded-lg text-xs font-medium px-3 py-1.5 text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
            >
              <option value="">Add Indicator...</option>
              {availableIndicators.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </select>
            <button 
              onClick={handleApplyIndicator}
              disabled={!selectedIndicator || isLoadingIndicator}
              className="bg-[#111] hover:bg-[#222] border border-gray-800 text-blue-400 p-1.5 rounded-lg disabled:opacity-30 transition-colors flex items-center justify-center h-[30px] w-[30px]"
              title="Apply Indicator"
            >
              <Activity size={16} />
            </button>
          </div>
          
          <button 
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
              isDrawingMode 
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                : 'bg-[#111] text-gray-400 border-gray-800 hover:text-gray-200'
            }`}
          >
            <PenTool size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Draw</span>
          </button>
        </div>
      </div>
      
      {/* Drawing Toolbar & Chart Area */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Drawing Toolbar */}
        {isDrawingMode && (
          <div className="w-12 border-r border-gray-800/60 bg-[#0f0f0f] flex flex-col items-center py-2 space-y-2 z-10">
            {[
              { id: 'segment', icon: <LineChart size={18} />, tooltip: 'Trend Line' },
              { id: 'horizontalStraightLine', icon: <div className="w-4 h-0.5 bg-current" />, tooltip: 'Horizontal Line' },
              { id: 'verticalStraightLine', icon: <div className="h-4 w-0.5 bg-current" />, tooltip: 'Vertical Line' },
              { id: 'rayLine', icon: <Move size={18} />, tooltip: 'Ray' },
              { id: 'rect', icon: <Square size={18} />, tooltip: 'Rectangle' },
              { id: 'fibonacciLine', icon: <Type size={18} />, tooltip: 'Fibonacci Retracement' },
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => setDrawingTool(tool.id)}
                className={`p-2 rounded-lg transition-colors ${
                  currentTool === tool.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                title={tool.tooltip}
              >
                {tool.icon}
              </button>
            ))}
            
            <div className="h-px w-8 bg-gray-800 my-2" />
            
            <button
              onClick={() => setDrawingTool('clear')}
              className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Clear All Drawings"
            >
              <Eraser size={18} />
            </button>
          </div>
        )}

        {/* Chart Canvas */}
        <div className="flex-1 h-full bg-transparent" ref={chartContainerRef} />
      </div>
    </div>
  );
};
