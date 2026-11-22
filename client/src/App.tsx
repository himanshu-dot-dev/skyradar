import React, { useState } from 'react';
import { CesiumGlobe, type CesiumGlobeHandle } from './components/CesiumGlobe/CesiumGlobe';
import { GlobeToolbar } from './components/Controls/GlobeToolbar';
import { Header } from './components/Header/Header';
import { Navigation } from 'lucide-react';

export const App: React.FC = () => {
  const [globeHandle, setGlobeHandle] = useState<CesiumGlobeHandle | null>(null);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Cesium Earth Canvas */}
      <CesiumGlobe onViewerReady={setGlobeHandle} />

      {/* Top Glassmorphic Navigation Header */}
      <Header globeHandle={globeHandle} />

      {/* Floating HUD Camera & Layer Toolbar */}
      <GlobeToolbar globeHandle={globeHandle} />

      {/* Bottom Status / Navigation Hints */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: 14,
          left: 20,
          zIndex: 10,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 11,
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Navigation size={13} color="var(--accent-cyan)" />
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>Left Drag:</strong> Rotate Orbit |{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Right Drag / Wheel:</strong> Zoom |{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Middle Drag:</strong> Tilt
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
