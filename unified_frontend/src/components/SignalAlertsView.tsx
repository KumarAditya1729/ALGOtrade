import React, { useState, useEffect } from 'react';
import { fetchSignalAlerts, createSignalAlert, deleteSignalAlert, pauseSignalAlert, resumeSignalAlert, testSignalAlert } from '../api/alerts';
import type { SignalAlert } from '../api/alerts';
import { fetchAvailableIndicators } from '../api/indicators';
import { Bell, Plus, Play, Pause, Trash2, Activity } from 'lucide-react';

export const SignalAlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<SignalAlert[]>([]);
  const [availableIndicators, setAvailableIndicators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSymbol, setNewSymbol] = useState('BTC/USDT');
  const [newIndicatorId, setNewIndicatorId] = useState<number | ''>('');
  const [newTimeframe, setNewTimeframe] = useState('1D');
  const [newSignalKey, setNewSignalKey] = useState('any');

  const loadAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSignalAlerts();
      setAlerts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadIndicators = async () => {
    try {
      const data = await fetchAvailableIndicators();
      setAvailableIndicators(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setNewIndicatorId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load indicators:', err);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadIndicators();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIndicatorId) return;
    setIsCreating(true);
    try {
      await createSignalAlert({
        indicator_id: Number(newIndicatorId),
        market: 'Crypto',
        symbol: newSymbol,
        timeframe: newTimeframe,
        signal_keys: [newSignalKey],
        channels: ['browser'],
        status: 'running'
      });
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || 'Failed to create alert');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (alert: SignalAlert) => {
    try {
      if (alert.status === 'running') {
        await pauseSignalAlert(alert.id);
      } else {
        await resumeSignalAlert(alert.id);
      }
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle alert');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSignalAlert(id);
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || 'Failed to delete alert');
    }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await testSignalAlert(id);
      alert(`Test Result for Alert ${id}:\n\n${JSON.stringify(res, null, 2)}`);
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="text-yellow-400" />
          Signal Alerts
        </h1>
      </div>

      {error && (
        <div className="bg-red-900/30 text-red-400 border border-red-800 p-4 rounded text-sm">
          {error}
        </div>
      )}

      {/* Create Alert Form */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus size={20} className="text-blue-400" />
          Create New Alert
        </h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Symbol</label>
            <input 
              type="text" 
              value={newSymbol} 
              onChange={e => setNewSymbol(e.target.value.toUpperCase())}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Indicator</label>
            <select 
              value={newIndicatorId} 
              onChange={e => setNewIndicatorId(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              required
            >
              <option value="" disabled>Select Indicator...</option>
              {availableIndicators.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Timeframe</label>
            <select 
              value={newTimeframe} 
              onChange={e => setNewTimeframe(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1H">1H</option>
              <option value="1D">1D</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Signal Key</label>
            <input 
              type="text" 
              value={newSignalKey} 
              onChange={e => setNewSignalKey(e.target.value)}
              placeholder="e.g. buy, sell, any"
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isCreating || !newIndicatorId}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded disabled:opacity-50"
          >
            {isCreating ? 'Adding...' : 'Add Alert'}
          </button>
        </form>
      </div>

      {/* Alerts List */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <Bell size={48} className="mb-4 opacity-20" />
            <p>No active signal alerts.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-gray-400 text-sm">
              <tr>
                <th className="p-4 font-medium">Symbol</th>
                <th className="p-4 font-medium">Details</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {alerts.map(alert => (
                <tr key={alert.id} className="hover:bg-gray-700/30">
                  <td className="p-4 font-bold text-white">
                    {alert.symbol}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-mono text-sm">{alert.indicator_name || alert.indicator_id}</span>
                        <span className="text-gray-400 text-xs">{alert.timeframe}</span>
                      </div>
                      <span className="text-yellow-400 font-mono text-xs">Keys: {alert.signal_keys?.join(', ')}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      alert.status === 'running' 
                        ? 'bg-green-900/30 text-green-400 border border-green-800' 
                        : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
                    }`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => handleTest(alert.id)}
                      className="p-2 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                      title="Test Alert Evaluation"
                    >
                      <Activity size={18} />
                    </button>
                    <button 
                      onClick={() => handleToggle(alert)}
                      className={`p-2 rounded transition-colors ${
                        alert.status === 'running' ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-green-400 hover:bg-green-400/10'
                      }`}
                      title={alert.status === 'running' ? 'Pause' : 'Resume'}
                    >
                      {alert.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(alert.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      title="Delete Alert"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

