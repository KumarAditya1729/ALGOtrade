import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StrategiesTable } from './StrategiesTable';

export const StrategiesView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Algorithmic Strategies</h2>
          <p className="text-gray-400">Manage, configure, and monitor your trading algorithms.</p>
        </div>
        <button 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors"
          onClick={() => navigate('/app/strategy-builder')}
        >
          + New Strategy
        </button>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <StrategiesTable />
      </div>
    </div>
  );
};
