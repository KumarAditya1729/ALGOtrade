import { apiClient } from './client';

export interface OpenAlgoOrderRequest {
  client_code: string;
  symbol: string; // e.g. RELIANCE-EQ
  exchange: string; // NSE, BSE, NFO
  transaction_type: 'BUY' | 'SELL';
  product: 'MIS' | 'NRML' | 'CNC';
  order_type: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  quantity: number;
  price?: number;
}

export const placeOpenAlgoOrder = async (order: OpenAlgoOrderRequest) => {
  const response = await apiClient.post('/api/v1/openalgo/placeorder', order);
  return response.data;
};

export const fetchOpenAlgoOrderBook = async (client_code: string) => {
  const response = await apiClient.post('/api/v1/openalgo/orderbook', { client_code });
  return response.data;
};

export const fetchOpenAlgoTradeBook = async (client_code: string) => {
  const response = await apiClient.post('/api/v1/openalgo/tradebook', { client_code });
  return response.data;
};

export const fetchOpenAlgoPositionBook = async (client_code: string) => {
  const response = await apiClient.post('/api/v1/openalgo/positionbook', { client_code });
  return response.data;
};

export const fetchOpenAlgoHoldings = async (client_code: string) => {
  const response = await apiClient.post('/api/v1/openalgo/holdings', { client_code });
  return response.data;
};

export const fetchOpenAlgoFunds = async (client_code: string) => {
  const response = await apiClient.post('/api/v1/openalgo/funds', { client_code });
  return response.data;
};

export const cancelOpenAlgoOrder = async (client_code: string, order_id: string) => {
  const response = await apiClient.post('/api/v1/openalgo/cancel_order', { client_code, order_id });
  return response.data;
};
