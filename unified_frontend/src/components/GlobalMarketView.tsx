import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketOverview, fetchMarketNews, fetchEconomicCalendar, fetchTradingOpportunities } from '../api/globalMarket';

const tabs = ['Overview', 'News', 'Calendar', 'Opportunities'] as const;
type Tab = typeof tabs[number];

const ImpactBadge: React.FC<{ impact: string }> = ({ impact }) => {
  const cls = impact === 'High' || impact === 'high' || impact === '3'
    ? 'bg-red-900/30 text-red-400 border-red-800'
    : impact === 'Medium' || impact === 'medium' || impact === '2'
    ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
    : 'bg-gray-800 text-gray-400 border-gray-700';
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>{impact}</span>;
};

export const GlobalMarketView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['globalOverview', 'v2_in'],
    queryFn: () => fetchMarketOverview(),
    refetchInterval: 60000,
    enabled: activeTab === 'Overview',
  });

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ['globalNews', 'v2_in'],
    queryFn: () => fetchMarketNews('en'),
    refetchInterval: 120000,
    enabled: activeTab === 'News',
  });

  const { data: events, isLoading: calLoading } = useQuery({
    queryKey: ['economicCalendar', 'v2_in'],
    queryFn: fetchEconomicCalendar,
    refetchInterval: 300000,
    enabled: activeTab === 'Calendar',
  });

  const { data: opps, isLoading: oppsLoading } = useQuery({
    queryKey: ['opportunities', 'v2_in'],
    queryFn: fetchTradingOpportunities,
    refetchInterval: 120000,
    enabled: activeTab === 'Opportunities',
  });

  const overviewData = (overview as any)?.data;
  const indices = overviewData?.indices || [];
  const forex = overviewData?.forex || [];
  const crypto = overviewData?.crypto || [];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-bold text-white">Indian & Global Market</h2>
        <p className="text-gray-400 text-sm mt-1">Live market indices, news, economic events, and trading opportunities</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="flex flex-col gap-8">
          {overviewLoading ? (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-gray-500 text-sm">Loading market data...</div>
            </div>
          ) : (
            <>
              {/* Indian Indices */}
              {indices.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">🇮🇳 Indian Indices</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {indices.map((item: any, i: number) => {
                      const change = parseFloat(item.change || '0');
                      const isUp = change >= 0;
                      return (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="text-xs text-gray-500 font-mono">{item.symbol}</div>
                              <div className="text-sm font-semibold text-white mt-0.5">{item.name_en || item.name_cn || item.symbol}</div>
                            </div>
                            <span className="text-lg">{item.flag || '🌐'}</span>
                          </div>
                          <div className="text-xl font-bold text-white">{typeof item.price === 'number' ? item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}</div>
                          <div className={`flex items-center gap-1 mt-1 text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{isUp ? '▲' : '▼'}</span>
                            <span>{Math.abs(change).toFixed(2)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Forex */}
              {forex.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">💱 Forex</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {forex.map((item: any, i: number) => {
                      const change = parseFloat(item.change || '0');
                      const isUp = change >= 0;
                      return (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
                          <div className="text-xs text-gray-500 font-mono mb-1">{item.symbol || item.name_en}</div>
                          <div className="text-base font-bold text-white">{typeof item.price === 'number' ? item.price.toFixed(4) : '—'}</div>
                          <div className={`text-xs font-semibold mt-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Crypto */}
              {crypto.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">₿ Crypto</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {crypto.map((item: any, i: number) => {
                      const change = parseFloat(item.change || '0');
                      const isUp = change >= 0;
                      return (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
                          <div className="text-xs text-gray-500 font-mono mb-1">{item.symbol || item.name_en}</div>
                          <div className="text-base font-bold text-white">{typeof item.price === 'number' ? item.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</div>
                          <div className={`text-xs font-semibold mt-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {indices.length === 0 && forex.length === 0 && crypto.length === 0 && (
                <div className="text-center py-16 text-gray-600">No market data available</div>
              )}
            </>
          )}
        </div>
      )}

      {/* News Tab */}
      {activeTab === 'News' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {newsLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">Loading news...</div>
          ) : !news || news.length === 0 ? (
            <div className="p-12 text-center text-gray-600">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <p className="text-sm">No news available — configure a news API key in backend .env</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {news.map((item: any, i: number) => (
                <div key={i} className="p-5 hover:bg-gray-800/40 transition-colors">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium text-sm leading-snug hover:underline">
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-400">{item.source}</span>
                    <span>•</span>
                    <span>{item.published_at ? new Date(item.published_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'Calendar' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {calLoading ? (
            <div className="p-8 text-center text-gray-500">Loading calendar...</div>
          ) : !events || events.length === 0 ? (
            <div className="p-12 text-center text-gray-600">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No upcoming events — configure Trading Economics API key</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-950/60">
                <tr>
                  {['Event', 'Date', 'Country', 'Impact', 'Actual', 'Forecast'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {events.filter((evt: any) => evt.country === 'IN' || evt.country === 'India' || evt.country === 'IND' || evt.country === 'IN ').map((evt: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-white font-medium">{evt.title || evt.event || evt.name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">{evt.date ? new Date(evt.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300">{evt.country || '—'}</td>
                    <td className="px-5 py-3.5"><ImpactBadge impact={evt.impact || evt.importance || 'Low'} /></td>
                    <td className="px-5 py-3.5 text-sm font-mono text-gray-300">{evt.actual ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-gray-500">{evt.forecast ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Opportunities Tab */}
      {activeTab === 'Opportunities' && (
        <div>
          {oppsLoading ? (
            <div className="text-center py-12 text-gray-500">Scanning markets...</div>
          ) : !opps || opps.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-600">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-sm">No scanner opportunities at this time</p>
              <p className="text-xs text-gray-700 mt-1">Market scanner runs periodically — check back soon</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opps.map((opp: any, i: number) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-white text-lg">{opp.symbol}</span>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold border ${opp.signal === 'BUY' || opp.signal === 'long' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                      {(opp.signal || '').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{opp.reason || opp.description || 'Signal detected'}</p>
                  {opp.score && <div className="mt-2 text-xs text-gray-500">Confidence: {(opp.score * 100).toFixed(0)}%</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
