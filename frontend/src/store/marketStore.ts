import { create } from 'zustand';

interface MarketState {
  currentVolatility: number;
  setVolatility: (val: number) => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  currentVolatility: 1.0, 
  setVolatility: (val) => set({ currentVolatility: val }),
}));
