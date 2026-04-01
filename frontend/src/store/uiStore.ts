import { create } from 'zustand';

interface UIState {
  hoveredNavElement: string | null;
  setHoveredNavElement: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hoveredNavElement: null,
  setHoveredNavElement: (id) => set({ hoveredNavElement: id }),
}));
