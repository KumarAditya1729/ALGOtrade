import { apiClient } from './client';

export interface StrategyTemplate {
  key: string;
  name: string;
  description: string;
  default_config: Record<string, any>;
  parameters: any[];
}

export interface ExecutorStrategyPayload {
  strategy_name: string;
  template_key: string;
  symbol: string;
  timeframe: string;
  market_category: 'crypto' | 'indian_stock' | 'indian_derivative';
  initial_capital: number;
  trade_direction: 'LONG' | 'SHORT' | 'BOTH';
  execution_mode: 'PAPER' | 'LIVE';
  leverage_enabled: boolean;
  leverage: number;
  trading_config: Record<string, any>;
  exchange_config?: {
    credential_id?: number;
  };
  notification_config?: {
    channels: string[];
    targets: Record<string, any>;
  };
}

export const fetchExecutorTemplates = async (): Promise<{items: StrategyTemplate[]}> => {
  const response = await apiClient.get('/api/v1/strategies/executors/templates');
  return response.data;
};

export const createExecutorStrategy = async (payload: ExecutorStrategyPayload) => {
  const response = await apiClient.post('/api/v1/strategies/executors/create', payload);
  return response.data;
};
