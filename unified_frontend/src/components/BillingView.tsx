import React, { useState, useEffect } from 'react';
import { fetchBillingPlans, fetchUSDTChains, createUSDTOrder } from '../api/billing';
import { CreditCard, ShieldCheck, Zap } from 'lucide-react';

export const BillingView: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [billingInfo, setBillingInfo] = useState<any>({});
  const [chains, setChains] = useState<any[]>([]);
  const [isBillingEnabled, setIsBillingEnabled] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  
  const [orderState, setOrderState] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBilling = async () => {
      setIsLoading(true);
      try {
        const [plansRes, chainsRes] = await Promise.all([
          fetchBillingPlans(),
          fetchUSDTChains()
        ]);
        
        setPlans(plansRes.plans || []);
        setBillingInfo(plansRes.billing || {});
        setChains(chainsRes.chains || []);
        setIsBillingEnabled(chainsRes.billing_enabled);
        
        if (chainsRes.chains && chainsRes.chains.length > 0) {
          setSelectedChain(chainsRes.chains[0].network);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load billing information');
      } finally {
        setIsLoading(false);
      }
    };
    loadBilling();
  }, []);

  const handleCheckout = async () => {
    if (!selectedPlan || !selectedChain) return;
    setIsCreatingOrder(true);
    setError(null);
    try {
      const order = await createUSDTOrder(selectedPlan, selectedChain);
      setOrderState(order);
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-gray-400">Loading billing information...</div>;
  }

  if (!isBillingEnabled) {
    return (
      <div className="p-6 text-center text-gray-400">
        <CreditCard className="mx-auto mb-4 opacity-50" size={48} />
        <h2 className="text-xl font-bold mb-2">Billing is Currently Disabled</h2>
        <p>The administrator has not enabled USDT payments or membership tiers.</p>
      </div>
    );
  }

  if (orderState) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-green-400" />
          Complete Your Payment
        </h1>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <div className="bg-yellow-900/30 text-yellow-400 border border-yellow-800 p-4 rounded text-sm">
            Please send exactly <strong>{orderState.amount} USDT</strong> on the <strong>{orderState.chain}</strong> network to the address below.
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Deposit Address</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={orderState.address} 
                className="bg-gray-900 border border-gray-700 rounded p-3 text-white w-full font-mono text-sm"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(orderState.address)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded"
              >
                Copy
              </button>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-400 pt-4">
            Order ID: {orderState.id} • Status: <span className="text-blue-400 animate-pulse">Awaiting Payment...</span>
          </div>
          
          <button 
            onClick={() => setOrderState(null)} 
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded mt-4"
          >
            Cancel Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="text-yellow-400" />
            Plans & Billing
          </h1>
          <p className="text-gray-400 text-sm mt-1">Upgrade your account to unlock advanced algorithmic features.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Current Status</div>
          <div className="font-bold text-lg text-green-400">
            {billingInfo.is_active ? billingInfo.current_plan : 'Free Tier'}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900/30 text-red-400 border border-red-800 p-4 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div 
            key={plan.id}
            className={`border rounded-lg p-6 cursor-pointer transition-all ${
              selectedPlan === plan.id 
                ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
            <div className="text-3xl font-bold text-blue-400 mb-4">
              ${plan.price_usdt} <span className="text-sm text-gray-400 font-normal">/ {plan.duration_days} days</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features?.map((feat: string, idx: number) => (
                <li key={idx} className="flex items-center text-sm text-gray-300 gap-2">
                  <ShieldCheck size={16} className="text-green-400" />
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-8">
          <h3 className="font-bold mb-4">Checkout Options</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm text-gray-400 mb-2">Select USDT Network</label>
              <select 
                value={selectedChain || ''} 
                onChange={(e) => setSelectedChain(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              >
                {chains.map(chain => (
                  <option key={chain.network} value={chain.network}>{chain.network} (USDT)</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isCreatingOrder || !selectedChain}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2 rounded font-bold"
            >
              {isCreatingOrder ? 'Processing...' : 'Pay with Crypto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
