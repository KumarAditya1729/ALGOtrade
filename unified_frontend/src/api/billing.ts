import { apiClient } from './client';

export interface MembershipPlan {
  id: string;
  name: string;
  price_usdt: number;
  duration_days: number;
  features: string[];
}

export interface BillingSnapshot {
  current_plan: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface USDTChain {
  network: string;
  address: string;
}

export const fetchBillingPlans = async () => {
  const response = await apiClient.get('/api/v1/billing/plans');
  return response.data?.data || { plans: [], billing: {} };
};

export const fetchUSDTChains = async () => {
  const response = await apiClient.get('/api/v1/billing/usdt/chains');
  return response.data?.data || { chains: [], billing_enabled: false };
};

export const createUSDTOrder = async (plan: string, chain: string) => {
  const response = await apiClient.post('/api/v1/billing/usdt/create', { plan, chain });
  return response.data?.data;
};

export const fetchUSDTOrder = async (orderId: number, refresh: boolean = true) => {
  const response = await apiClient.get(`/api/v1/billing/usdt/order/${orderId}?refresh=${refresh}`);
  return response.data?.data;
};
