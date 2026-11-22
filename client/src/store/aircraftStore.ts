import { create } from 'zustand';
import type { NormalizedAircraft } from '@shared/types';

interface AircraftStoreState {
  aircraftList: NormalizedAircraft[];
  aircraftMap: Map<string, NormalizedAircraft>;
  selectedAircraftId: string | null;
  selectedAircraft: NormalizedAircraft | null;
  isFollowing: boolean;
  isSimulatedMode: boolean;
  totalCount: number;
  liveCount: number;
  simulatedCount: number;

  setAircraftList: (list: NormalizedAircraft[]) => void;
  selectAircraft: (id: string | null) => void;
  toggleFollow: () => void;
  setFollowing: (following: boolean) => void;
  setSimulatedMode: (enabled: boolean) => void;
  clearSelection: () => void;
}

export const useAircraftStore = create<AircraftStoreState>((set) => ({
  aircraftList: [],
  aircraftMap: new Map(),
  selectedAircraftId: null,
  selectedAircraft: null,
  isFollowing: false,
  isSimulatedMode: false,
  totalCount: 0,
  liveCount: 0,
  simulatedCount: 0,

  setAircraftList: (list) => {
    const map = new Map<string, NormalizedAircraft>();
    let simCount = 0;
    let liveCount = 0;

    for (const ac of list) {
      map.set(ac.id, ac);
      if (ac.isSimulated) simCount++;
      else liveCount++;
    }

    set((state) => {
      const selected = state.selectedAircraftId ? map.get(state.selectedAircraftId) || null : null;
      return {
        aircraftList: list,
        aircraftMap: map,
        selectedAircraft: selected,
        totalCount: list.length,
        simulatedCount: simCount,
        liveCount: liveCount,
      };
    });
  },

  selectAircraft: (id) =>
    set((state) => {
      const selected = id ? state.aircraftMap.get(id) || null : null;
      return {
        selectedAircraftId: id,
        selectedAircraft: selected,
        // Stop following if deselected
        isFollowing: id ? state.isFollowing : false,
      };
    }),

  toggleFollow: () =>
    set((state) => ({
      isFollowing: state.selectedAircraftId ? !state.isFollowing : false,
    })),

  setFollowing: (following) =>
    set((state) => ({
      isFollowing: state.selectedAircraftId ? following : false,
    })),

  setSimulatedMode: (enabled) => set({ isSimulatedMode: enabled }),

  clearSelection: () =>
    set({
      selectedAircraftId: null,
      selectedAircraft: null,
      isFollowing: false,
    }),
}));
