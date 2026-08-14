import { apiClient } from './client';

export interface Order {
  id: number;
  symbol: string;
  symbol_canonical?: string;
  signal_type: string;    // 'long' | 'short'
  order_type: string;     // 'market' | 'limit'
  amount: string;
  price: string;
  status: string;
  execution_mode: string;
  market_type: string;
  created_at?: string;
  signal_ts?: number;
}

export interface OrdersResponse {
  list: Order[];
  total: number;
}

export const fetchOrders = async (page = 1, pageSize = 50): Promise<OrdersResponse> => {
  const response = await apiClient.get(`/api/v1/dashboard/pendingOrders?page=${page}&pageSize=${pageSize}`);
  return response.data.data || { list: [], total: 0 };
};

export const cancelOrder = async (orderId: number) => {
  const response = await apiClient.delete(`/api/v1/dashboard/pendingOrders/${orderId}`);
  return response.data;
};
