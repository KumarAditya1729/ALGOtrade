import { apiClient } from './client';

export interface WatchlistItem {
  symbol: string;
  market: string;
}

export interface SymbolSearchResult {
  symbol: string;
  market: string;
  name?: string;
  type?: string;
  exchange?: string;
}

export const searchSymbols = async (market: string, query: string, limit: number = 20): Promise<SymbolSearchResult[]> => {
  if (!query) return [];
  try {
    const res = await apiClient.get('/market/symbols/search', { params: { market, q: query, limit } });
    if (res.data && res.data.data) {
      return res.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error searching symbols:', error);
    return [];
  }
};

export const getWatchlist = async (): Promise<WatchlistItem[]> => {
  try {
    const res = await apiClient.get('/market/watchlist/get');
    if (res.data && res.data.data) {
      return res.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }
};

export const addWatchlistItem = async (market: string, symbol: string): Promise<boolean> => {
  try {
    const res = await apiClient.post('/market/watchlist/add', { market, symbol });
    return res.data && res.data.status === 'success';
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return false;
  }
};

export const removeWatchlistItem = async (market: string, symbol: string): Promise<boolean> => {
  try {
    const res = await apiClient.post('/market/watchlist/remove', { market, symbol });
    return res.data && res.data.status === 'success';
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return false;
  }
};

export interface WatchlistPrice {
  symbol: string;
  price: number;
  change_24h: number;
  change_pct_24h: number;
}

export const getWatchlistPrices = async (): Promise<Record<string, WatchlistPrice>> => {
  try {
    const res = await apiClient.get('/market/watchlist/prices');
    if (res.data && res.data.data) {
      return res.data.data;
    }
    return {};
  } catch (error) {
    console.error('Error fetching watchlist prices:', error);
    return {};
  }
};

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const fetchKlines = async (market: string, symbol: string, timeframe: string = '1D', limit: number = 300, exchangeId?: string, marketType?: string): Promise<KlineData[]> => {
  try {
    const params: any = { market, symbol, timeframe, limit };
    if (exchangeId) params.exchange_id = exchangeId;
    if (marketType) params.market_type = marketType;
    
    const res = await apiClient.get('/api/v1/indicator/kline', { params });
    if (res.data && res.data.data) {
      // Backend may return time as unix timestamp in ms or s, ensure we format correctly for lightweight-charts
      return res.data.data.map((k: any) => ({
        time: k.timestamp || k.time, // Usually ms
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume || 0
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching klines:', error);
    return [];
  }
};
