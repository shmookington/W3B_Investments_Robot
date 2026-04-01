import { create } from 'zustand';

interface EngineState {
  isConnected: boolean;
  setConnectionStatus: (status: boolean) => void;
  // High frequency arrays would be mapped here
  // executions: ExecutionOrder[];
  // setExecutions: (orders: ExecutionOrder[]) => void;
}

export const useEngineStore = create<EngineState>()((set) => ({
  isConnected: true, // Optimistically start connected
  setConnectionStatus: (status) => set({ isConnected: status }),
}));
