import React, { useState } from 'react';
import {
  Globe,
  Sun,
  Moon,
  Compass,
  Plus,
  Minus,
  RotateCcw,
  Layers,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useGlobeStore, AVIATION_HUBS, type ImageryLayerType, type AviationHub } from '../../store/globeStore';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';

interface GlobeToolbarProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const GlobeToolbar: React.FC<GlobeToolbarProps> = ({ globeHandle }) => {
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showHubMenu, setShowHubMenu] = useState(false);

  const imageryLayer = useGlobeStore((s) => s.imageryLayer);
  const enableLighting = useGlobeStore((s) => s.enableLighting);
  const selectedHub = useGlobeStore((s) => s.selectedHub);
  const setImageryLayer = useGlobeStore((s) => s.setImageryLayer);
  const toggleLighting = useGlobeStore((s) => s.toggleLighting);
  const selectHub = useGlobeStore((s) => s.selectHub);

  const handleSelectHub = (hub: AviationHub) => {
    selectHub(hub);
    setShowHubMenu(false);
    if (globeHandle) {
      globeHandle.flyToHub(hub.latitude, hub.longitude, hub.cameraHeight);
    }
  };

  const handleResetHome = () => {
    selectHub(null);
    if (globeHandle) {
      globeHandle.flyToHome();
    }
  };

  return (
    <div style={{ position: 'absolute', right: 20, top: 80, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Primary Navigation Controls */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: 6, gap: 6 }}>
        <button
          className="glass-btn"
          style={{ width: 38, height: 38 }}
          title="Zoom In"
          onClick={() => globeHandle?.zoomIn()}
        >
          <Plus size={18} />
        </button>

        <button
          className="glass-btn"
          style={{ width: 38, height: 38 }}
          title="Zoom Out"
          onClick={() => globeHandle?.zoomOut()}
        >
          <Minus size={18} />
        </button>

        <button
          className="glass-btn"
          style={{ width: 38, height: 38 }}
          title="Reset Global View"
          onClick={handleResetHome}
        >
          <RotateCcw size={18} />
        </button>

        <button
          className="glass-btn"
          style={{ width: 38, height: 38 }}
          title="Reset Heading (North Up)"
          onClick={() => globeHandle?.resetHeading()}
        >
          <Compass size={18} />
        </button>
      </div>

      {/* Layer & Visualization Controls */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: 6, gap: 6, position: 'relative' }}>
        {/* Layer Selector */}
        <button
          className={`glass-btn ${showLayerMenu ? 'active' : ''}`}
          style={{ width: 38, height: 38 }}
          title="Earth Imagery Layers"
          onClick={() => {
            setShowLayerMenu(!showLayerMenu);
            setShowHubMenu(false);
          }}
        >
          <Layers size={18} />
        </button>

        {showLayerMenu && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              right: 50,
              top: 0,
              width: 210,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              Satellite Imagery
            </div>

            <button
              className={`glass-btn ${imageryLayer === 'blue-marble' ? 'active' : ''}`}
              style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: 13, gap: 8 }}
              onClick={() => {
                setImageryLayer('blue-marble');
                setShowLayerMenu(false);
              }}
            >
              <Globe size={15} />
              <span>NASA Blue Marble</span>
            </button>

            <button
              className={`glass-btn ${imageryLayer === 'dark-radar' ? 'active' : ''}`}
              style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: 13, gap: 8 }}
              onClick={() => {
                setImageryLayer('dark-radar');
                setShowLayerMenu(false);
              }}
            >
              <Moon size={15} />
              <span>Tactical Dark Radar</span>
            </button>

            <button
              className={`glass-btn ${imageryLayer === 'natural-earth' ? 'active' : ''}`}
              style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: 13, gap: 8 }}
              onClick={() => {
                setImageryLayer('natural-earth');
                setShowLayerMenu(false);
              }}
            >
              <Layers size={15} />
              <span>Natural Earth II (Offline)</span>
            </button>
          </div>
        )}

        {/* Day / Night Sun Terminator */}
        <button
          className={`glass-btn ${enableLighting ? 'active' : ''}`}
          style={{ width: 38, height: 38 }}
          title={enableLighting ? 'Disable Sun Lighting (Full Illumination)' : 'Enable Real-Time Sun Lighting (Day/Night Terminator)'}
          onClick={toggleLighting}
        >
          {enableLighting ? <Sun size={18} color="var(--accent-amber)" /> : <Sun size={18} />}
        </button>

        {/* Aviation Hubs Teleport Menu */}
        <button
          className={`glass-btn ${showHubMenu || selectedHub ? 'active' : ''}`}
          style={{ width: 38, height: 38 }}
          title="Teleport to Major Aviation Hub"
          onClick={() => {
            setShowHubMenu(!showHubMenu);
            setShowLayerMenu(false);
          }}
        >
          <MapPin size={18} />
        </button>

        {showHubMenu && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              right: 50,
              top: 50,
              width: 250,
              maxHeight: 380,
              overflowY: 'auto',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              Major Flight Hubs
            </div>

            {AVIATION_HUBS.map((hub) => (
              <button
                key={hub.id}
                className={`glass-btn ${selectedHub?.id === hub.id ? 'active' : ''}`}
                style={{
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  fontSize: 12,
                }}
                onClick={() => handleSelectHub(hub)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="font-mono"
                    style={{
                      backgroundColor: 'rgba(0, 240, 255, 0.15)',
                      padding: '2px 5px',
                      borderRadius: 4,
                      color: 'var(--accent-cyan)',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {hub.code}
                  </span>
                  <span>{hub.city}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hub.country}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
