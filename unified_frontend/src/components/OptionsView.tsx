import React, { useState } from 'react';
import { simulateStraddle } from '../api/options';
import type { StraddleSimulationConfig, StraddleSimulationResponse } from '../api/options';
import { LineChart, Activity, DollarSign, RefreshCw, AlertTriangle } from 'lucide-react';

export const OptionsView: React.FC = () => {
  const [config, setConfig] = useState<StraddleSimulationConfig>({
    underlying_price: 150.0,
    strike: 150.0,
    expiry_days: 30,
    implied_volatility: 0.25, // 25%
  });
  
  const [result, setResult] = useState<StraddleSimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await simulateStraddle(config);
      setResult(res);
    } catch (err: any) {
      console.error('Simulation failed', err);
      setError(err.response?.data?.msg || 'Failed to simulate straddle. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LineChart className="text-pink-400" />
          Straddle Analytics Simulator
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity className="text-blue-400" size={20} />
            Simulation Inputs
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Underlying Price ($)</label>
              <input 
                type="number" 
                value={config.underlying_price}
                onChange={e => setConfig({...config, underlying_price: parseFloat(e.target.value) || 0})}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Strike Price ($)</label>
              <input 
                type="number" 
                value={config.strike}
                onChange={e => setConfig({...config, strike: parseFloat(e.target.value) || 0})}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Days to Expiry</label>
              <input 
                type="number" 
                value={config.expiry_days}
                onChange={e => setConfig({...config, expiry_days: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                step="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Implied Volatility (e.g. 0.25 = 25%)</label>
              <input 
                type="number" 
                value={config.implied_volatility}
                onChange={e => setConfig({...config, implied_volatility: parseFloat(e.target.value) || 0})}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                step="0.01"
              />
            </div>
            
            <button 
              onClick={handleSimulate}
              disabled={isLoading}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <LineChart size={18} />}
              {isLoading ? 'Simulating...' : 'Run Simulation'}
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded flex items-start gap-2 text-red-400 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 lg:col-span-2 flex flex-col">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <DollarSign className="text-green-400" size={20} />
            Simulation Results
          </h2>
          
          {result ? (
            <div className="space-y-6 flex-grow">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Total Premium</div>
                  <div className="text-2xl font-bold text-white">${result.total_premium.toFixed(2)}</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Call Premium</div>
                  <div className="text-lg font-medium text-gray-300">${result.call_premium.toFixed(2)}</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Put Premium</div>
                  <div className="text-lg font-medium text-gray-300">${result.put_premium.toFixed(2)}</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Breakeven Range</div>
                  <div className="text-sm font-medium text-blue-400">
                    ${result.lower_breakeven.toFixed(2)} - ${result.upper_breakeven.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="flex-grow bg-gray-900 rounded-lg border border-gray-700 p-4 relative min-h-[300px]">
                {/* A basic visual representation of the payoff table */}
                <h3 className="text-sm font-medium text-gray-400 mb-4 border-b border-gray-800 pb-2">Estimated Payoff Profile</h3>
                <div className="overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-900">
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="py-2 text-left font-medium">Underlying Price at Expiry</th>
                        <th className="py-2 text-right font-medium">Estimated P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {result.payoff_points?.map((point, i) => (
                        <tr key={i}>
                          <td className="py-2 text-gray-300">${point.price.toFixed(2)}</td>
                          <td className={`py-2 text-right font-medium ${point.pnl > 0 ? 'text-green-400' : point.pnl < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {point.pnl > 0 ? '+' : ''}{point.pnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-12 border-2 border-dashed border-gray-700 rounded-lg">
              <LineChart size={48} className="mb-4 opacity-20" />
              <p>Run a simulation to view options straddle analytics.</p>
              <p className="text-sm mt-2 opacity-60 max-w-md text-center">
                This tool uses Black-Scholes modeling to estimate the premiums and payoff profile of an ATM straddle strategy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
