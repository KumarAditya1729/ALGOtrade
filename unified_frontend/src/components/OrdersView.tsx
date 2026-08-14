import React from 'react';
import { OrdersTable } from './OrdersTable';

export const OrdersView: React.FC = () => {
  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Order History</h2>
        <p className="text-gray-400">View and manage your active and completed orders.</p>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <OrdersTable />
        </div>
      </div>
    </div>
  );
};
