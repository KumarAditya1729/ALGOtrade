import { apiClient } from './client';

export interface OrderRequest {
  symbol: string;
  order_type: 'market' | 'limit';
  side: 'buy' | 'sell';
  qty: number;
  limit_price?: number;
  credential_id?: number;
  market_type?: 'spot' | 'futures' | 'margin';
  exchange_id?: string;
}

export const placeQuickOrder = async (order: OrderRequest) => {
  const response = await apiClient.post('/api/v1/quick-trade/place-order', order);
  return response.data;
};

export const fetchBalances = async (exchange_id: string, market_type: string = 'spot', credential_id?: number) => {
  const params: any = { exchange_id, market_type };
  if (credential_id) params.credential_id = credential_id;
  const response = await apiClient.get('/api/v1/quick-trade/balance', { params });
  return response.data;
};

export const fetchPositions = async (exchange_id: string, market_type: string = 'spot', symbol?: string, credential_id?: number) => {
  const params: any = { exchange_id, market_type };
  if (symbol) params.symbol = symbol;
  if (credential_id) params.credential_id = credential_id;
  const response = await apiClient.get('/api/v1/quick-trade/position', { params });
  return response.data;
};

export const closePosition = async (exchange_id: string, symbol: string, market_type: string = 'spot', credential_id?: number) => {
  const payload: any = { exchange_id, symbol, market_type };
  if (credential_id) payload.credential_id = credential_id;
  const response = await apiClient.post('/api/v1/quick-trade/close-position', payload);
  return response.data;
};

export const fetchTradeHistory = async (exchange_id: string, market_type: string = 'spot', limit: number = 50, credential_id?: number) => {
  const params: any = { exchange_id, market_type, limit };
  if (credential_id) params.credential_id = credential_id;
  const response = await apiClient.get('/api/v1/quick-trade/history', { params });
  return response.data;
};

// Angel One Portfolio Fetchers
export const fetchAngelHoldings = async () => {
  const response = await apiClient.get('/api/v1/portfolio/angel-one/holdings');
  return response.data;
};

export const fetchAngelPositions = async () => {
  const response = await apiClient.get('/api/v1/portfolio/angel-one/positions');
  return response.data;
};
