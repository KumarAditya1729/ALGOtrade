import { apiClient } from './client';

export interface PortfolioSummaryData {
  total_cost: number;
  total_market_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  position_count: number;
  market_distribution: { market: string; value: number }[];
}

export interface Position {
  id: number;
  symbol: string;
  symbol_canonical?: string;
  side: string;
  size: number;
  avg_price: number;
  current_price?: number;
  mark_price?: number;
  unrealized_pnl: number;
  unrealized_pnl_pct?: number;
  exchange?: string;
  strategy_id?: number;
}

export const fetchPositions = async (): Promise<Position[]> => {
  const response = await apiClient.get('/api/v1/portfolio/positions');
  return response.data.data || [];
};

export const fetchSummary = async (): Promise<PortfolioSummaryData> => {
  const response = await apiClient.get('/api/v1/portfolio/summary');
  return response.data.data || { total_cost: 0, total_market_value: 0, total_pnl: 0, total_pnl_percent: 0, position_count: 0, market_distribution: [] };
};

export const closePosition = async (positionId: number) => {
  const response = await apiClient.post('/api/v1/quick-trade/close-position', { position_id: positionId });
  return response.data;
};
