import React from 'react';
import { BrokerList } from './BrokerList';

export const BrokerSettings: React.FC = () => {
  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Broker Connections</h2>
        <p className="text-gray-400">Manage your connected exchange and broker accounts.</p>
      </div>
      
      <div className="flex-1">
        <BrokerList />
      </div>
    </div>
  );
};
