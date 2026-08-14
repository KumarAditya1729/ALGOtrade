import { apiClient } from './client';

export interface UniverseAsset {
  id?: number;
  symbol: string;
  market?: string;
  asset_class?: string;
  source?: string;
}

export interface Universe {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
}

export const fetchUniverses = async (): Promise<Universe[]> => {
  const response = await apiClient.get('/api/v1/universes');
  return response.data?.data?.items || response.data?.data || [];
};

export const fetchUniverseMembers = async (id: number): Promise<UniverseAsset[]> => {
  const response = await apiClient.get(`/api/v1/universes/${id}/members`);
  return response.data?.data?.items || response.data?.data || [];
};

export const createUniverse = async (universe: Partial<Universe>) => {
  const response = await apiClient.post('/api/v1/universes', universe);
  return response.data?.data;
};

export const deleteUniverse = async (id: number) => {
  const response = await apiClient.delete(`/api/v1/universes/${id}`);
  return response.data?.data;
};

export const scanUniverse = async (id: number) => {
  // Not all backends might have a scan endpoint. Keeping for future compat
  const response = await apiClient.post(`/api/v1/universes/${id}/scan`);
  return response.data?.data;
};

export const addAssetToUniverse = async (id: number, symbol: string) => {
  // Note: universe_blp allows PUT to /members with {"symbols": ["AAPL"]}
  const response = await apiClient.put(`/api/v1/universes/${id}/members`, { symbols: [symbol] });
  return response.data?.data;
};

export const removeAssetFromUniverse = async (id: number, symbol: string) => {
  // Simple delete asset logic, depending on the actual members API
  // In `universe.py`, PUT /members with overwrite or we need to pass a removal intent
  const currentMembers = await fetchUniverseMembers(id);
  const updatedSymbols = currentMembers.filter(m => m.symbol !== symbol).map(m => m.symbol);
  const response = await apiClient.put(`/api/v1/universes/${id}/members`, { symbols: updatedSymbols });
  return response.data?.data;
};
