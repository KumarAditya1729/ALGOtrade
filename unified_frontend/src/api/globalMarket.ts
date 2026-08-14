import { apiClient } from './client';

export interface MarketOverview {
  indices: any[];
  forex: any[];
  crypto: any[];
}

export interface MarketNews {
  id: string;
  title: string;
  url: string;
  source: string;
  published_at: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  date: string;
  impact: 'High' | 'Medium' | 'Low';
  country: string;
}

export const fetchMarketOverview = async () => {
  const response = await apiClient.get('/api/v1/global-market/overview?force=true');
  return response.data;
};

export const fetchMarketHeatmap = async () => {
  const response = await apiClient.get('/api/v1/global-market/heatmap?force=true');
  return response.data;
};

export const fetchMarketNews = async (lang: string = 'en'): Promise<MarketNews[]> => {
  const response = await apiClient.get(`/api/v1/global-market/news?lang=${lang}&force=true`);
  const data = response.data?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data[lang] || [];
  }
  return Array.isArray(data) ? data : [];
};

export const fetchEconomicCalendar = async (): Promise<EconomicEvent[]> => {
  const response = await apiClient.get('/api/v1/global-market/calendar?force=true');
  return response.data?.data || [];
};

export const fetchMarketSentiment = async () => {
  const response = await apiClient.get('/api/v1/global-market/sentiment?force=true');
  return response.data;
};

export const fetchTradingOpportunities = async () => {
  const response = await apiClient.get('/api/v1/global-market/opportunities?force=true');
  return response.data?.data || [];
};
