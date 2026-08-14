import { apiClient } from './client';

export interface BrokerCredential {
  id: number;
  name: string;
  exchange_id: string;
  api_key_hint: string;
  is_valid?: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchBrokers = async (): Promise<BrokerCredential[]> => {
  const response = await apiClient.get('/api/v1/credentials/list');
  // Backend returns { code, msg, data: { items: [] } }
  const data = response.data?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

export const deleteBroker = async (id: number) => {
  const response = await apiClient.delete(`/api/v1/credentials/delete?id=${id}`);
  return response.data;
};

export const addBroker = async (payload: {
  name: string;
  exchange_id: string;
  api_key: string;
  api_secret: string;
  passphrase?: string;
}) => {
  const response = await apiClient.post('/api/v1/credentials/create', payload);
  return response.data;
};
