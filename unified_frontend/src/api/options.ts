import { apiClient } from './client';

export interface StraddleSimulationConfig {
  underlying_price: number;
  strike: number;
  expiry_days: number;
  implied_volatility: number;
}

export interface StraddleSimulationResponse {
  call_premium: number;
  put_premium: number;
  total_premium: number;
  upper_breakeven: number;
  lower_breakeven: number;
  payoff_points: Array<{
    price: number;
    pnl: number;
  }>;
}

export const simulateStraddle = async (payload: StraddleSimulationConfig): Promise<StraddleSimulationResponse> => {
  const response = await apiClient.post('/api/v1/tools/straddle/simulate', payload);
  // Backend returns under response.data.data assuming standard envelope
  return response.data?.data || response.data;
};
