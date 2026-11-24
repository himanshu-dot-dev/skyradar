import { create } from 'zustand';
import type { NormalizedAircraft } from '@shared/types';

export interface AircraftFilters {
  searchQuery: string;
  altitudePreset: 'all' | 'ground' | 'low' | 'mid' | 'high';
  minAltitudeFt: number;
  maxAltitudeFt: number;
  minSpeedKnots: number;
  verticalProfile: 'all' | 'climbing' | 'descending' | 'cruising';
  emergencyOnly: boolean;
}

export const DEFAULT_FILTERS: AircraftFilters = {
  searchQuery: '',
  altitudePreset: 'all',
  minAltitudeFt: 0,
  maxAltitudeFt: 50000,
  minSpeedKnots: 0,
  verticalProfile: 'all',
  emergencyOnly: false,
};

export function matchesFilters(ac: NormalizedAircraft, filters: AircraftFilters): boolean {
  // 1. Text Search query (callsign, hex id, operator, registration, type)
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim().toLowerCase();
    const callsign = (ac.callsign || '').toLowerCase();
    const id = ac.id.toLowerCase();
    const operator = (ac.operator || '').toLowerCase();
    const reg = (ac.registration || '').toLowerCase();
    const type = (ac.aircraftType || '').toLowerCase();

    const matchesText =
      callsign.includes(q) ||
      id.includes(q) ||
      operator.includes(q) ||
      reg.includes(q) ||
      type.includes(q);

    if (!matchesText) return false;
  }

  // 2. Altitude Filter
  const altFt = ac.position.altitudeFeet;
  if (altFt < filters.minAltitudeFt || altFt > filters.maxAltitudeFt) {
    return false;
  }

  // Altitude Presets
  if (filters.altitudePreset === 'ground' && altFt > 1000) return false;
  if (filters.altitudePreset === 'low' && (altFt <= 1000 || altFt > 10000)) return false;
  if (filters.altitudePreset === 'mid' && (altFt <= 10000 || altFt > 28000)) return false;
  if (filters.altitudePreset === 'high' && altFt <= 28000) return false;

  // 3. Ground Speed Filter
  if (ac.movement.speedKnots < filters.minSpeedKnots) {
    return false;
  }

  // 4. Vertical Profile Filter
  if (filters.verticalProfile === 'climbing' && ac.movement.verticalRateFpm <= 250) return false;
  if (filters.verticalProfile === 'descending' && ac.movement.verticalRateFpm >= -250) return false;
  if (filters.verticalProfile === 'cruising' && Math.abs(ac.movement.verticalRateFpm) > 250) return false;

  // 5. Emergency Squawk Filter
  if (filters.emergencyOnly) {
    const isEmerg =
      ac.emergency !== 'none' ||
      ac.squawk === '7700' ||
      ac.squawk === '7600' ||
      ac.squawk === '7500';
    if (!isEmerg) return false;
  }

  return true;
}

interface AircraftStoreState {
  aircraftList: NormalizedAircraft[];
  aircraftMap: Map<string, NormalizedAircraft>;
  selectedAircraftId: string | null;
  selectedAircraft: NormalizedAircraft | null;
  isFollowing: boolean;
  totalCount: number;
  liveCount: number;
  simulatedCount: number;

  // Filter & Left Drawer State
  filters: AircraftFilters;
  isDrawerOpen: boolean;

  setAircraftList: (list: NormalizedAircraft[]) => void;
  selectAircraft: (id: string | null) => void;
  toggleFollow: () => void;
  setFollowing: (following: boolean) => void;
  clearSelection: () => void;

  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<AircraftFilters>) => void;
  resetFilters: () => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
}

export const useAircraftStore = create<AircraftStoreState>((set) => ({
  aircraftList: [],
  aircraftMap: new Map(),
  selectedAircraftId: null,
  selectedAircraft: null,
  isFollowing: false,
  totalCount: 0,
  liveCount: 0,
  simulatedCount: 0,

  filters: DEFAULT_FILTERS,
  isDrawerOpen: false,

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
      let selected = state.selectedAircraft;
      if (state.selectedAircraftId) {
        const found = map.get(state.selectedAircraftId);
        if (found) {
          selected = found;
        }
        // Retain existing selected aircraft if not in new batch so card doesn't close abruptly
      } else {
        selected = null;
      }

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

  clearSelection: () =>
    set({
      selectedAircraftId: null,
      selectedAircraft: null,
      isFollowing: false,
    }),

  setSearchQuery: (query) =>
    set((state) => ({
      filters: { ...state.filters, searchQuery: query },
    })),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () =>
    set({
      filters: DEFAULT_FILTERS,
    }),

  setDrawerOpen: (open) => set({ isDrawerOpen: open }),

  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
}));
