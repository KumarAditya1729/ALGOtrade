import { create } from 'zustand';

interface TradingState {
  symbol: string;
  orderType: 'market' | 'limit';
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  credentialId: number | null;
  exchangeId: string;
  marketType: 'spot' | 'futures' | 'margin';
  status: 'idle' | 'submitting' | 'success' | 'error';
  errorMessage: string | null;
  setSymbol: (sym: string) => void;
  setOrderType: (type: 'market' | 'limit') => void;
  setSide: (side: 'buy' | 'sell') => void;
  setQuantity: (qty: number) => void;
  setPrice: (px: number) => void;
  setCredentialId: (id: number | null) => void;
  setExchangeId: (exch: string) => void;
  setMarketType: (type: 'spot' | 'futures' | 'margin') => void;
  setStatus: (status: 'idle' | 'submitting' | 'success' | 'error', message?: string) => void;
}

export const useTradingStore = create<TradingState>((set: any) => ({
  symbol: 'NIFTY',
  orderType: 'market',
  side: 'buy',
  quantity: 1,
  price: 0,
  credentialId: null,
  exchangeId: 'binance',
  marketType: 'spot',
  status: 'idle',
  errorMessage: null,
  setSymbol: (symbol) => set({ symbol }),
  setOrderType: (orderType) => set({ orderType }),
  setSide: (side) => set({ side }),
  setQuantity: (quantity) => set({ quantity }),
  setPrice: (price) => set({ price }),
  setCredentialId: (credentialId) => set({ credentialId }),
  setExchangeId: (exchangeId) => set({ exchangeId }),
  setMarketType: (marketType) => set({ marketType }),
  setStatus: (status, message) => set({ status, errorMessage: message || null }),
}));
