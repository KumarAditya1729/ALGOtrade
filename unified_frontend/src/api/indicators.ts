import { apiClient } from './client';

export interface IndicatorCalculationParams {
  symbol: string;
  indicator_id: number;
  timeframe: string;
  market?: string;
  limit?: number;
  params: Record<string, any>;
}

export interface IndicatorResult {
  indicator: { id: number; name: string; };
  market: string;
  symbol: string;
  timeframe: string;
  candles: any[];
  plots: any[];
  layers: any[];
  signals: any[];
  latest_signal: any;
}

export const calculateIndicator = async (params: IndicatorCalculationParams): Promise<IndicatorResult> => {
  const response = await apiClient.post('/api/v1/indicators/chart-preview', params);
  return response.data.data; // backend returns { code: 1, data: {...} }
};

export const fetchAvailableIndicators = async (): Promise<any[]> => {
  const response = await apiClient.get('/api/v1/indicators/getIndicators');
  return response.data.data; // backend returns { code: 1, data: [...] }
};
