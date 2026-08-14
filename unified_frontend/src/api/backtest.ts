import { apiClient } from './client';

export interface BacktestParams {
  strategy_id: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  params: Record<string, any>;
}

export interface BacktestResult {
  id: string;
  metrics: {
    total_return: number;
    sharpe_ratio: number;
    max_drawdown: number;
    win_rate: number;
  };
  equity_curve: { date: string; value: number }[];
  trades: any[];
}

export const runBacktest = async (params: BacktestParams): Promise<BacktestResult> => {
  const payload = {
    strategyId: params.strategy_id,
    startDate: params.start_date,
    endDate: params.end_date,
    initialCapital: params.initial_capital,
    params: params.params,
    code: 'def on_tick(ctx, tick):\n    pass\n' // Temporary stub if code is not provided by source
  };
  const response = await apiClient.post('/api/v1/backtest/run', payload);
  return response.data;
};

export const fetchBacktestHistory = async (): Promise<BacktestResult[]> => {
  const response = await apiClient.get('/api/v1/backtest/history');
  return response.data;
};
