import { create } from 'zustand';

export type WorldMode = 'Golden Day' | 'Blood Sunset' | 'Deep Night' | 'Eclipse';

export type MarblePortal = {
  id: string;
  title: string;
  description: string;
};

type WorldState = {
  mode: WorldMode;
  performanceMode: boolean;
  activePortal: MarblePortal | null;
  marbleSeed: number;
  playerPosition: [number, number, number];
  cycleMode: () => void;
  togglePerformanceMode: () => void;
  regenerateMarbles: () => void;
  openPortal: (portal: MarblePortal) => void;
  closePortal: () => void;
  setPlayerPosition: (position: [number, number, number]) => void;
};

const modes: WorldMode[] = ['Golden Day', 'Blood Sunset', 'Deep Night', 'Eclipse'];

export const useWorldStore = create<WorldState>((set) => ({
  mode: 'Golden Day',
  performanceMode: false,
  activePortal: null,
  marbleSeed: 7,
  playerPosition: [0, 0, 0],
  cycleMode: () =>
    set((state) => {
      const index = modes.indexOf(state.mode);
      return { mode: modes[(index + 1) % modes.length] };
    }),
  togglePerformanceMode: () => set((state) => ({ performanceMode: !state.performanceMode })),
  regenerateMarbles: () => set((state) => ({ marbleSeed: state.marbleSeed + 1 })),
  openPortal: (portal) => set({ activePortal: portal }),
  closePortal: () => set({ activePortal: null }),
  setPlayerPosition: (playerPosition) => set({ playerPosition }),
}));
