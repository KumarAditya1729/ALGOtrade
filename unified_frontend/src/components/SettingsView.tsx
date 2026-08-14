import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBrokers, deleteBroker, addBroker } from '../api/brokers';
import type { BrokerCredential } from '../api/brokers';
import { apiClient } from '../api/client';

const tabs = ['Broker Connections', 'Watchlist', 'Brand', 'About'] as const;
type Tab = typeof tabs[number];

// ─── Broker Panel ───────────────────────────────────────────────────────────
const AddBrokerModal: React.FC<{ onClose: () => void; onAdded: () => void }> = ({ onClose, onAdded }) => {
  const [form, setForm] = useState({ name: '', exchange_id: 'angel', api_key: '', api_secret: '', passphrase: '', client_id: '', pin: '', totp_secret: '' });
  const [status, setStatus] = useState<'idle' | 'saving' | 'verifying' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const exchanges = ['binance', 'bybit', 'okx', 'kucoin', 'coinbase', 'kraken', 'huobi', 'alpaca', 'ibkr', 'zerodha', 'upstox', 'angel', 'aliceblue', 'dhan', 'fyers', 'groww'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.exchange_id === 'angel') {
      setStatus('verifying');
      setErrMsg('');
      try {
        const res = await apiClient.post('/api/v1/brokers/verify', form);
        if (res.data?.code === 1) { 
          onAdded(); 
          onClose(); 
        } else { 
          setErrMsg(res.data?.msg || 'Verification failed'); 
          setStatus('error'); 
        }
      } catch (err: any) {
        setErrMsg(err.response?.data?.msg || err.message || 'Verification failed');
        setStatus('error');
      }
      return;
    }

    setStatus('saving');
    setErrMsg('');
    try {
      const res = await addBroker(form);
      if (res.code === 1) { onAdded(); onClose(); }
      else { setErrMsg(res.msg || 'Failed to add broker'); setStatus('error'); }
    } catch (err: any) {
      setErrMsg(err.response?.data?.msg || 'Network error');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-5">Connect New Broker</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Exchange</label>
            <select value={form.exchange_id} onChange={e => setForm(f => ({ ...f, exchange_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              {exchanges.map(ex => <option key={ex} value={ex}>{ex.charAt(0).toUpperCase() + ex.slice(1)}</option>)}
            </select>
          </div>
          {form.exchange_id === 'angel' ? (
            <>
              {[
                { label: 'Credential Name', key: 'name', placeholder: 'e.g. My Angel Main' },
                { label: 'Client ID', key: 'client_id', placeholder: 'Angel One Client ID (e.g. S12345)' },
                { label: 'PIN', key: 'pin', placeholder: 'Angel One Login PIN', type: 'password' },
                { label: 'API Key (SmartAPI)', key: 'api_key', placeholder: 'SmartAPI Key' },
                { label: 'TOTP Secret', key: 'totp_secret', placeholder: '16-char TOTP Secret (for auto-login)', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                { label: 'Credential Name', key: 'name', placeholder: 'e.g. My Binance Main' },
                { label: 'API Key', key: 'api_key', placeholder: 'Your API key' },
                { label: 'API Secret', key: 'api_secret', placeholder: 'Your API secret', type: 'password' },
                { label: 'Passphrase (if required)', key: 'passphrase', placeholder: 'OKX / KuCoin passphrase', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} required={f.key !== 'passphrase'}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
            </>
          )}
          {status === 'error' && <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{errMsg}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={status === 'saving' || status === 'verifying'} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              {status === 'saving' ? 'Saving...' : status === 'verifying' ? 'Verifying Login...' : 'Connect & Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BrokerPanel: React.FC = () => {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: brokers = [], isLoading, isError } = useQuery({
    queryKey: ['brokers'],
    queryFn: fetchBrokers,
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBroker,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brokers'] }),
    onSettled: () => setDeletingId(null),
  });

  if (isLoading) return <div className="h-40 bg-gray-800 rounded-xl animate-pulse" />;
  if (isError) return <div className="p-4 bg-red-900/20 text-red-400 rounded-xl border border-red-800">Failed to load broker connections</div>;

  const exchangeColors: Record<string, string> = {
    binance: 'from-yellow-600 to-amber-500', bybit: 'from-orange-600 to-red-500', okx: 'from-blue-700 to-blue-500',
    kucoin: 'from-green-700 to-emerald-500', coinbase: 'from-blue-600 to-indigo-500', kraken: 'from-purple-700 to-violet-500',
    alpaca: 'from-pink-700 to-rose-500', ibkr: 'from-red-800 to-red-600', zerodha: 'from-indigo-700 to-blue-600',
  };

  return (
    <>
      {showAdd && <AddBrokerModal onClose={() => setShowAdd(false)} onAdded={() => qc.invalidateQueries({ queryKey: ['brokers'] })} />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(brokers as BrokerCredential[]).map(broker => {
          const grad = exchangeColors[broker.exchange_id] || 'from-gray-700 to-gray-600';
          return (
            <div key={broker.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
              <div className={`h-2 bg-gradient-to-r ${grad}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold capitalize text-lg">{broker.exchange_id}</h3>
                    <p className="text-gray-400 text-sm">{broker.name}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-900/30 text-green-400 border border-green-800 text-xs rounded-full font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Connected
                  </span>
                </div>
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 text-xs w-16">API Key</span>
                    <span className="text-gray-300 font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{broker.api_key_hint || '****'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-16">Added</span>
                    <span>{new Date(broker.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <button onClick={() => { if (confirm(`Disconnect ${broker.name}?`)) { setDeletingId(broker.id); deleteMutation.mutate(broker.id); }}}
                  disabled={deletingId === broker.id}
                  className="w-full text-red-400 border border-red-900 hover:bg-red-900/30 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                  {deletingId === broker.id ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          );
        })}
        <div onClick={() => setShowAdd(true)}
          className="bg-gray-900/50 border-2 border-dashed border-gray-700 hover:border-blue-600 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[220px] group">
          <div className="w-12 h-12 rounded-xl bg-gray-800 group-hover:bg-blue-900/30 border border-gray-700 group-hover:border-blue-700 flex items-center justify-center mb-3 transition-all">
            <svg className="w-6 h-6 text-gray-500 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span className="text-gray-400 group-hover:text-white font-medium text-sm transition-colors">Connect New Broker</span>
          <span className="text-gray-600 text-xs mt-1">Binance, Bybit, OKX, IBKR...</span>
        </div>
      </div>
    </>
  );
};

// ─── Watchlist Panel ─────────────────────────────────────────────────────────
const WatchlistPanel: React.FC = () => {
  const [addSymbol, setAddSymbol] = useState('');
  const qc = useQueryClient();

  const { data: prices, isLoading } = useQuery({
    queryKey: ['watchlistPrices'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/market/watchlist/prices');
      return res.data?.data || [];
    },
    refetchInterval: 10000,
  });

  const handleAdd = async () => {
    if (!addSymbol.trim()) return;
    try {
      await apiClient.post('/api/v1/market/watchlist/add', { symbol: addSymbol.trim().toUpperCase() });
      setAddSymbol('');
      qc.invalidateQueries({ queryKey: ['watchlistPrices'] });
    } catch {}
  };

  const handleRemove = async (symbol: string, market: string) => {
    try {
      await apiClient.post('/api/v1/market/watchlist/remove', { symbol, market });
      qc.invalidateQueries({ queryKey: ['watchlistPrices'] });
    } catch {}
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-white font-semibold">My Watchlist</h3>
        <div className="flex gap-2">
          <input value={addSymbol} onChange={e => setAddSymbol(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add symbol..." className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-40" />
          <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Add</button>
        </div>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-gray-500 animate-pulse">Loading watchlist...</div>
      ) : (
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-950/60">
            <tr>
              {['Symbol', 'Market', 'Price', 'Change', 'Action'].map(h => (
                <th key={h} className={`px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === 'Price' || h === 'Change' ? 'text-right' : h === 'Action' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {!prices || prices.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-600 text-sm">No symbols in watchlist</td></tr>
            ) : (
              prices.map((p: any, i: number) => {
                const isUp = (p.changePercent || p.change || 0) >= 0;
                return (
                  <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white text-sm">{p.symbol}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{p.market || '—'}</td>
                    <td className="px-5 py-3.5 text-right text-sm font-mono text-gray-200">
                      {typeof p.price === 'number' ? p.price.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}
                    </td>
                    <td className={`px-5 py-3.5 text-right text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{typeof p.changePercent === 'number' ? p.changePercent.toFixed(2) : '0.00'}%
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleRemove(p.symbol, p.market)} className="text-gray-600 hover:text-red-400 transition-colors text-xs">✕ Remove</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ─── Brand Panel ─────────────────────────────────────────────────────────────
const BrandPanel: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['brandConfig'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/settings/brand-config');
      return res.data?.data || {};
    },
  });

  if (isLoading) return <div className="h-40 bg-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
      <h3 className="text-white font-semibold">Platform Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'App Name', value: data?.app_name },
          { label: 'Version', value: data?.app_version },
          { label: 'Copyright', value: data?.copyright },
          { label: 'Support Email', value: data?.contact?.email },
          { label: 'Support URL', value: data?.contact?.support_url },
          { label: 'Telegram', value: data?.contact?.telegram },
        ].filter(item => item.value).map(item => (
          <div key={item.label} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</label>
            <div className="text-sm text-white">{item.value}</div>
          </div>
        ))}
      </div>
      {data?.socials && Object.keys(data.socials).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Social Links</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.socials).filter(([, v]) => v).map(([k, v]: any) => (
              <a key={k} href={v} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-gray-600 rounded-lg transition-colors capitalize">
                {k}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Broker Connections');

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-gray-400 text-sm mt-1">Manage broker connections, watchlist, and platform configuration</p>
      </div>
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            {tab}
          </button>
        ))}
      </div>
      {activeTab === 'Broker Connections' && <BrokerPanel />}
      {activeTab === 'Watchlist' && <WatchlistPanel />}
      {activeTab === 'Brand' && <BrandPanel />}
      {activeTab === 'About' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-white font-bold text-2xl">CalculatedRisk</h3>
          <p className="text-gray-400 mt-2">Algorithmic Trading Platform</p>
          <p className="text-gray-600 text-sm mt-4">Professional-grade trading infrastructure for quantitative strategies, automated execution, and portfolio management.</p>
        </div>
      )}
    </div>
  );
};
