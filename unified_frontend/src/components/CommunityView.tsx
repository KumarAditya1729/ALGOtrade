// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { fetchIndicators, purchaseIndicator, fetchMyPurchases } from '../api/community';
import type { MarketplaceIndicator, PurchaseRecord } from '../api/community';
import { Store, ShoppingCart, Star, Lock, Unlock, Clock } from 'lucide-react';

export const CommunityView: React.FC = () => {
  const [indicators, setIndicators] = useState<MarketplaceIndicator[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'purchases'>('marketplace');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        if (activeTab === 'marketplace') {
          const data = await fetchIndicators();
          setIndicators(data);
        } else {
          const data = await fetchMyPurchases();
          setPurchases(data);
        }
      } catch (error) {
        console.error('Failed to load community data', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  const handlePurchase = async (indicatorId: number, plan: 'monthly' | 'lifetime') => {
    try {
      await purchaseIndicator(indicatorId, plan);
      // Refresh
      alert('Purchase successful!');
      setActiveTab('purchases');
    } catch (err) {
      console.error('Purchase failed', err);
      alert('Purchase failed. Make sure you have enough balance or try again.');
    }
  };

  const isPurchased = (indicatorId: number) => {
    return purchases.some(p => p.indicator_id === indicatorId && p.status === 'active');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="text-purple-400" />
          Indicator Marketplace
        </h1>
      </div>

      <div className="flex space-x-4 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`pb-2 px-1 font-medium transition-colors ${activeTab === 'marketplace' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          Explore Marketplace
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-2 px-1 font-medium transition-colors ${activeTab === 'purchases' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          My Purchases
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Loading data...</div>
      ) : activeTab === 'marketplace' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {indicators.length === 0 ? (
            <div className="col-span-full py-8 text-center text-gray-500">No indicators available in the marketplace yet.</div>
          ) : (
            indicators.map(ind => (
              <div key={ind.id} className="bg-gray-800 rounded-lg border border-gray-700 p-5 hover:border-gray-600 transition-colors flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-200">{ind.title}</h3>
                    <div className="text-sm text-gray-400 mt-1">by {ind.author_name}</div>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-900 px-2 py-1 rounded text-sm text-yellow-400">
                    <Star size={14} fill="currentColor" />
                    <span>{ind.average_rating ? ind.average_rating.toFixed(1) : 'New'}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 flex-grow mb-4 line-clamp-3">
                  {ind.description || "No description provided."}
                </p>
                
                <div className="border-t border-gray-700 pt-4 mt-auto">
                  {isPurchased(ind.id) ? (
                    <button disabled className="w-full py-2 bg-gray-700 text-gray-300 rounded font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                      <Unlock size={16} />
                      Already Purchased
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      {ind.price_monthly > 0 && (
                        <button 
                          onClick={() => handlePurchase(ind.id, 'monthly')}
                          className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm font-medium transition-colors"
                        >
                          ${ind.price_monthly}/mo
                        </button>
                      )}
                      <button 
                        onClick={() => handlePurchase(ind.id, 'lifetime')}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <ShoppingCart size={14} />
                        ${ind.price_lifetime} Lifetime
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-900/50">
                <tr className="text-gray-400 text-sm">
                  <th className="py-3 px-4 font-medium">Indicator</th>
                  <th className="py-3 px-4 font-medium">Plan Type</th>
                  <th className="py-3 px-4 font-medium">Purchased At</th>
                  <th className="py-3 px-4 font-medium">Expires At</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50 text-sm">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">You haven't purchased any indicators yet.</td>
                  </tr>
                ) : (
                  purchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-200">{p.indicator_title}</td>
                      <td className="py-3 px-4 text-gray-300 capitalize">{p.plan_type}</td>
                      <td className="py-3 px-4 text-gray-400">{new Date(p.purchased_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : <span className="text-purple-400">Lifetime</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${p.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
