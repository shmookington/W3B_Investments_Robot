import { create } from 'zustand';

/* ─── App-Level UI State ─── */
export interface AppState {
    /** Whether the cinematic boot sequence has completed */
    bootComplete: boolean;
    setBootComplete: (done: boolean) => void;

    /** Current page/section for navigation state */
    activePage: string;
    setActivePage: (page: string) => void;

    /** Sidebar collapsed state */
    sidebarOpen: boolean;
    toggleSidebar: () => void;

    /** Reduced motion preference (respects prefers-reduced-motion) */
    reducedMotion: boolean;
    setReducedMotion: (reduced: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    bootComplete: false,
    setBootComplete: (done) => set({ bootComplete: done }),

    activePage: 'dashboard',
    setActivePage: (page) => set({ activePage: page }),

    sidebarOpen: true,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

    reducedMotion: false,
    setReducedMotion: (reduced) => set({ reducedMotion: reduced }),
}));
