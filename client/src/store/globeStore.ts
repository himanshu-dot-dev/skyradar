import { create } from 'zustand';

export type ImageryLayerType = 'blue-marble' | 'dark-radar' | 'natural-earth';

export interface AviationHub {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  cameraHeight: number;
}

export const AVIATION_HUBS: AviationHub[] = [
  { id: 'lhr', name: 'Heathrow Airport', code: 'LHR', city: 'London', country: 'United Kingdom', latitude: 51.4700, longitude: -0.4543, cameraHeight: 180000 },
  { id: 'jfk', name: 'John F. Kennedy Intl', code: 'JFK', city: 'New York', country: 'United States', latitude: 40.6413, longitude: -73.7781, cameraHeight: 180000 },
  { id: 'hnd', name: 'Tokyo Haneda Airport', code: 'HND', city: 'Tokyo', country: 'Japan', latitude: 35.5494, longitude: 139.7798, cameraHeight: 180000 },
  { id: 'dxb', name: 'Dubai International', code: 'DXB', city: 'Dubai', country: 'United Arab Emirates', latitude: 25.2532, longitude: 55.3657, cameraHeight: 180000 },
  { id: 'fra', name: 'Frankfurt Airport', code: 'FRA', city: 'Frankfurt', country: 'Germany', latitude: 50.0379, longitude: 8.5622, cameraHeight: 180000 },
  { id: 'sin', name: 'Singapore Changi', code: 'SIN', city: 'Singapore', country: 'Singapore', latitude: 1.3644, longitude: 103.9915, cameraHeight: 180000 },
  { id: 'syd', name: 'Sydney Kingsford Smith', code: 'SYD', city: 'Sydney', country: 'Australia', latitude: -33.9399, longitude: 151.1753, cameraHeight: 180000 },
  { id: 'cdg', name: 'Charles de Gaulle', code: 'CDG', city: 'Paris', country: 'France', latitude: 49.0097, longitude: 2.5479, cameraHeight: 180000 },
];

interface GlobeState {
  imageryLayer: ImageryLayerType;
  enableLighting: boolean;
  showAtmosphere: boolean;
  selectedHub: AviationHub | null;
  setImageryLayer: (layer: ImageryLayerType) => void;
  toggleLighting: () => void;
  toggleAtmosphere: () => void;
  selectHub: (hub: AviationHub | null) => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  imageryLayer: 'blue-marble',
  enableLighting: false,
  showAtmosphere: true,
  selectedHub: null,
  setImageryLayer: (layer) => set({ imageryLayer: layer }),
  toggleLighting: () => set((state) => ({ enableLighting: !state.enableLighting })),
  toggleAtmosphere: () => set((state) => ({ showAtmosphere: !state.showAtmosphere })),
  selectHub: (hub) => set({ selectedHub: hub }),
}));
