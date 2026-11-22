import React, { useState, useEffect } from 'react';
import { CesiumGlobe, type CesiumGlobeHandle } from './components/CesiumGlobe/CesiumGlobe';
import { GlobeToolbar } from './components/Controls/GlobeToolbar';
import { Header } from './components/Header/Header';
import { AircraftTelemetryCard } from './components/Sidebar/AircraftTelemetryCard';
import { AircraftSearchDrawer } from './components/Sidebar/AircraftSearchDrawer';
import { Navigation, Plane } from 'lucide-react';
import { useAircraftStore } from './store/aircraftStore';

export const App: React.FC = () => {
  const [globeHandle, setGlobeHandle] = useState<CesiumGlobeHandle | null>(null);

  // Expose store for debugging & verification
  useEffect(() => {
    (window as any).useAircraftStore = useAircraftStore;
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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

      {/* Bottom Status / Navigation Hints */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 11,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Navigation size={13} color="var(--accent-cyan)" />
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>Left Drag:</strong> Rotate |{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Scroll / Right Drag:</strong> Zoom |{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Double Click:</strong> Zoom In |{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Middle Drag:</strong> Tilt
          </span>
        </div>

        <div style={{ height: 12, width: 1, backgroundColor: 'var(--border-cyan)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plane size={13} color="var(--accent-cyan)" />
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>Click an aircraft</strong> to inspect telemetry & follow
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
