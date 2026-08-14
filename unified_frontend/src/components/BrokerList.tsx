import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBrokers, deleteBroker } from '../api/brokers';
import type { BrokerCredential } from '../api/brokers';

export const BrokerList: React.FC = () => {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: brokers, isLoading, isError } = useQuery({
    queryKey: ['brokers'],
    queryFn: fetchBrokers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
    onSettled: () => setDeletingId(null),
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to disconnect ${name}?`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="h-40 bg-gray-800 rounded animate-pulse border border-gray-700"></div>;
  }

  if (isError) {
    return <div className="p-4 bg-red-900/30 text-red-400 rounded border border-red-800">Failed to load broker connections</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(!brokers || brokers.length === 0) ? (
        <div className="col-span-full p-8 text-center text-gray-500 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
          No brokers connected. Add a broker to start trading.
        </div>
      ) : (
        brokers.map((broker: BrokerCredential) => (
          <div key={broker.id} className="bg-gray-800 rounded-lg border border-gray-700 shadow-md p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white capitalize">{broker.exchange_id}</h3>
              <span className="px-2 py-1 bg-green-900/30 text-green-400 border border-green-800 text-xs rounded uppercase font-medium">Connected</span>
            </div>
            <div className="mb-6 flex-1">
              <div className="text-sm text-gray-400 mb-1">Name: <span className="text-gray-200">{broker.name}</span></div>
              <div className="text-sm text-gray-400 mb-1">API Key: <span className="text-gray-200 font-mono bg-gray-900 px-1 rounded">{broker.api_key_hint || '****'}</span></div>
              <div className="text-xs text-gray-500 mt-2">Added: {new Date(broker.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-700">
              <button
                className="text-gray-400 hover:text-white transition-colors text-sm"
                onClick={() => alert('Edit broker functionality coming soon!')}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(broker.id, broker.name)}
                disabled={deletingId === broker.id}
                className="text-red-400 hover:text-white bg-red-900/20 hover:bg-red-600 px-3 py-1 rounded border border-red-800 hover:border-red-600 transition-colors text-sm disabled:opacity-50"
              >
                {deletingId === broker.id ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        ))
      )}
      
      {/* Placeholder for Add Broker Card */}
      <div 
        className="bg-gray-800/50 rounded-lg border-2 border-gray-700 border-dashed p-6 flex flex-col items-center justify-center text-gray-400 hover:text-white hover:border-blue-500 hover:bg-gray-800 cursor-pointer transition-all min-h-[220px]"
        onClick={() => alert('Add broker modal coming soon!')}
      >
        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        <span className="font-medium">Connect New Broker</span>
      </div>
    </div>
  );
};
