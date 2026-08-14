import { apiClient } from './client';

export interface SignalAlert {
  id: number;
  indicator_id: number;
  indicator_name: string;
  market: string;
  symbol: string;
  timeframe: string;
  signal_keys: string[];
  channels: string[];
  status: 'running' | 'paused';
  created_at?: string;
}

export const fetchSignalAlerts = async (): Promise<SignalAlert[]> => {
  const response = await apiClient.get('/api/v1/indicator_signal_alerts/signal-alerts');
  return response.data?.data || [];
};

export const createSignalAlert = async (alert: Partial<SignalAlert>) => {
  const response = await apiClient.post('/api/v1/indicator_signal_alerts/signal-alerts', alert);
  return response.data?.data;
};

export const updateSignalAlert = async (id: number, alert: Partial<SignalAlert>) => {
  const response = await apiClient.put(`/api/v1/indicator_signal_alerts/signal-alerts/${id}`, alert);
  return response.data?.data;
};

export const deleteSignalAlert = async (id: number) => {
  const response = await apiClient.delete(`/api/v1/indicator_signal_alerts/signal-alerts/${id}`);
  return response.data?.data;
};

export const pauseSignalAlert = async (id: number) => {
  const response = await apiClient.post(`/api/v1/indicator_signal_alerts/signal-alerts/${id}/pause`);
  return response.data?.data;
};

export const resumeSignalAlert = async (id: number) => {
  const response = await apiClient.post(`/api/v1/indicator_signal_alerts/signal-alerts/${id}/resume`);
  return response.data?.data;
};

export const testSignalAlert = async (id: number) => {
  const response = await apiClient.post(`/api/v1/indicator_signal_alerts/signal-alerts/${id}/test`);
  return response.data?.data;
};
