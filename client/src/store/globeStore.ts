import { create } from 'zustand';

export type ImageryLayerType = 'dark-radar' | 'blue-marble';

interface GlobeState {
  imageryLayer: ImageryLayerType;
  enableLighting: boolean;
  showAtmosphere: boolean;
  showFlightPaths: boolean;
  showWeatherRadar: boolean;
  activeWeatherProvider: 'rainviewer' | 'openweathermap' | 'nasa' | 'none';
  setImageryLayer: (layer: ImageryLayerType) => void;
  toggleLighting: () => void;
  toggleFlightPaths: () => void;
  toggleWeatherRadar: () => void;
  setActiveWeatherProvider: (provider: 'rainviewer' | 'openweathermap' | 'nasa' | 'none') => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  imageryLayer: 'blue-marble',
  enableLighting: false,
  showAtmosphere: true,
  showFlightPaths: true,
  showWeatherRadar: false,
  activeWeatherProvider: 'none',
  setImageryLayer: (layer) => set({ imageryLayer: layer }),
  toggleLighting: () => set((state) => ({ enableLighting: !state.enableLighting })),
  toggleFlightPaths: () => set((state) => ({ showFlightPaths: !state.showFlightPaths })),
  toggleWeatherRadar: () =>
    set((state) => ({
      showWeatherRadar: !state.showWeatherRadar,
      activeWeatherProvider: !state.showWeatherRadar ? 'rainviewer' : 'none',
    })),
  setActiveWeatherProvider: (provider) => set({ activeWeatherProvider: provider }),
}));
