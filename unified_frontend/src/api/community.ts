import { apiClient } from './client';

export interface MarketplaceIndicator {
  id: number;
  title: string;
  description: string;
  author_id: number;
  author_name: string;
  price_monthly: number;
  price_lifetime: number;
  status: string;
  average_rating: number;
  purchase_count: number;
  created_at: string;
}

export interface PurchaseRecord {
  id: number;
  indicator_id: number;
  indicator_title: string;
  plan_type: string;
  expires_at: string | null;
  status: string;
  purchased_at: string;
}

export const fetchIndicators = async (): Promise<MarketplaceIndicator[]> => {
  const response = await apiClient.get('/api/v1/community/indicators');
  return response.data?.data?.items || [];
};

export const purchaseIndicator = async (indicatorId: number, planType: 'monthly' | 'lifetime'): Promise<void> => {
  await apiClient.post(`/api/v1/community/indicators/${indicatorId}/purchase`, {
    plan_type: planType,
  });
};

export const fetchMyPurchases = async (): Promise<PurchaseRecord[]> => {
  const response = await apiClient.get('/api/v1/community/my-purchases');
  return response.data?.data?.items || [];
};
