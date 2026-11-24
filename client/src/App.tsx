import React, { useState, useEffect } from 'react';
import { CesiumGlobe, type CesiumGlobeHandle } from './components/CesiumGlobe/CesiumGlobe';
import { GlobeToolbar } from './components/Controls/GlobeToolbar';
import { Header } from './components/Header/Header';
import { AircraftTelemetryCard } from './components/Sidebar/AircraftTelemetryCard';
import { AircraftSearchDrawer } from './components/Sidebar/AircraftSearchDrawer';
import { SkyPreloader } from './components/Preloader/SkyPreloader';
import { useAircraftStore } from './store/aircraftStore';
import { useGlobeStore } from './store/globeStore';

export const App: React.FC = () => {
  const [globeHandle, setGlobeHandle] = useState<CesiumGlobeHandle | null>(null);

  // Expose store for debugging & verification
  useEffect(() => {
    (window as any).useAircraftStore = useAircraftStore;
    (window as any).useGlobeStore = useGlobeStore;
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Full-Screen Fast Cloud & Airliner Preloader */}
      <SkyPreloader isGlobeReady={globeHandle !== null} />

      {/* 3D Cesium Earth Canvas */}
      <CesiumGlobe onViewerReady={setGlobeHandle} />

      {/* Top Glassmorphic Navigation Header */}
      <Header globeHandle={globeHandle} />

      {/* Left-Hand Aircraft Directory & Radar Search Drawer */}
      <AircraftSearchDrawer globeHandle={globeHandle} />

      {/* Floating HUD Camera & Layer Toolbar */}
      <GlobeToolbar globeHandle={globeHandle} />

      {/* Selected Aircraft Telemetry Inspector Card */}
      <AircraftTelemetryCard globeHandle={globeHandle} />
    </div>
  );
};

export default App;
