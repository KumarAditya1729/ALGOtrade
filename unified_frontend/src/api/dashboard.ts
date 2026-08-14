import { apiClient } from './client';

export interface DashboardSummary {
  // Strategy counts
  running_strategy_count: number;
  running_script_count: number;
  running_bot_count: number;
  ai_strategy_count: number;
  // Finance
  total_equity: number;
  total_pnl: number;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  total_used_margin: number;
  // Performance
  performance: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    total_profit: number;
    total_loss: number;
    profit_factor: number;
    avg_win: number;
    avg_loss: number;
    max_drawdown: number;
    max_drawdown_pct: number;
    best_day: number;
    worst_day: number;
  };
  // Chart data
  daily_pnl_chart: { date: string; pnl: number }[];
  strategy_pnl_chart: { name: string; pnl: number }[];
  monthly_returns: { month: string; return: number }[];
  hourly_distribution: { hour: number; count: number; profit: number }[];
  // Lists
  recent_trades: any[];
  current_positions: any[];
  strategy_stats: any[];
}

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await apiClient.get('/api/v1/dashboard/summary');
  return response.data.data;
};
