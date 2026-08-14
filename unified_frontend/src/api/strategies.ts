import { apiClient } from './client';

export interface Strategy {
  id: number;
  user_id: number;
  strategy_name: string;
  strategy_type: string;
  market_category: string;
  execution_mode: string;
  status: string;
  symbol: string | null;
  symbol_canonical: string;
  timeframe: string | null;
  initial_capital: string;
  leverage: number;
  market_type: string;
  created_at: string;
  updated_at: string;
  runtime_health: Record<string, any>;
}

export const fetchStrategies = async (): Promise<Strategy[]> => {
  const response = await apiClient.get('/api/v1/strategies');
  return response.data.data || [];
};

export const startStrategy = async (id: number) => {
  const response = await apiClient.post(`/api/v1/strategies/${id}/start`);
  return response.data;
};

export const stopStrategy = async (id: number, closePositions: boolean = false) => {
  const response = await apiClient.post(`/api/v1/strategies/${id}/stop`, { close_positions: closePositions });
  return response.data;
};

export const fetchStrategyLogs = async (id: number) => {
  const response = await apiClient.get(`/api/v1/strategies/logs?id=${id}&limit=100`);
  return response.data.data || [];
};

export const fetchStrategyPositions = async (id: number) => {
  const response = await apiClient.get(`/api/v1/strategies/positions?id=${id}`);
  return response.data.data?.positions || [];
};
