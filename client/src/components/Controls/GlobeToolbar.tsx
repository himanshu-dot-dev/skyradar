import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Compass,
  Plus,
  Minus,
  RotateCcw,
  Layers,
  MapPin,
  Route,
  CloudRain,
} from 'lucide-react';
import { useGlobeStore, AVIATION_HUBS, type AviationHub } from '../../store/globeStore';
import { useAircraftStore } from '../../store/aircraftStore';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';

interface GlobeToolbarProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const GlobeToolbar: React.FC<GlobeToolbarProps> = ({ globeHandle }) => {
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showHubMenu, setShowHubMenu] = useState(false);
  const [cameraHeadingDeg, setCameraHeadingDeg] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const imageryLayer = useGlobeStore((s) => s.imageryLayer);
  const enableLighting = useGlobeStore((s) => s.enableLighting);
  const showFlightPaths = useGlobeStore((s) => s.showFlightPaths);
  const showWeatherRadar = useGlobeStore((s) => s.showWeatherRadar);
  const selectedHub = useGlobeStore((s) => s.selectedHub);
  const setImageryLayer = useGlobeStore((s) => s.setImageryLayer);
  const toggleLighting = useGlobeStore((s) => s.toggleLighting);
  const toggleFlightPaths = useGlobeStore((s) => s.toggleFlightPaths);
  const toggleWeatherRadar = useGlobeStore((s) => s.toggleWeatherRadar);
  const selectHub = useGlobeStore((s) => s.selectHub);
  const selectedAircraft = useAircraftStore((s) => s.selectedAircraft);

  // Dynamically track camera heading for the compass
  useEffect(() => {
    if (!globeHandle) return;
    const viewer = globeHandle.getViewer();
    if (!viewer || viewer.isDestroyed()) return;

    const updateHeading = () => {
      if (!viewer.isDestroyed()) {
        const deg = Math.round((viewer.camera.heading * 180) / Math.PI);
        setCameraHeadingDeg(((deg % 360) + 360) % 360);
      }
    };

    updateHeading();
    const removeListener = viewer.camera.changed.addEventListener(updateHeading);
    return () => {
      if (!viewer.isDestroyed()) {
        removeListener();
      }
    };
  }, [globeHandle]);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetHeading = () => {
    if (globeHandle) {
      globeHandle.resetHeading();
      showToast('Orientation: True North (0°)');
    }
  };

  const handleToggleFlightPaths = () => {
    toggleFlightPaths();
    showToast(!showFlightPaths ? 'Flight Trajectories: On' : 'Flight Trajectories: Off');
  };

  const handleToggleWeather = () => {
    toggleWeatherRadar();
    showToast(!showWeatherRadar ? 'Weather Doppler: Active' : 'Weather Doppler: Off');
  };

  const handleSelectHub = (hub: AviationHub) => {
    selectHub(hub);
    setShowHubMenu(false);
    if (globeHandle) {
      globeHandle.flyToHub(hub.latitude, hub.longitude, hub.cameraHeight);
      showToast(`Navigating to ${hub.code} (${hub.city})`);
    }
  };

  const handleResetHome = () => {
    selectHub(null);
    if (globeHandle) {
      globeHandle.flyToHome();
      showToast('Camera reset to global view');
    }
  };

  return (
    <aside
      className="globe-tools"
      style={{
        right: typeof window !== 'undefined' && window.innerWidth <= 768 ? 10 : (selectedAircraft ? 374 : 14),
      }}
    >
      {/* Zoom In */}
      <button
        className="tool-btn"
        title="Zoom In (+)"
        onClick={() => globeHandle?.zoomIn()}
      >
        <Plus size={15} />
      </button>

      {/* Zoom Out */}
      <button
        className="tool-btn"
        title="Zoom Out (-)"
        onClick={() => globeHandle?.zoomOut()}
      >
        <Minus size={15} />
      </button>

      {/* Compass Orientation */}
      <button
        className="tool-btn"
        title={`Reset North (Heading: ${cameraHeadingDeg}°)`}
        onClick={handleResetHeading}
      >
        <Compass
          size={15}
          style={{
            transform: `rotate(${-cameraHeadingDeg}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
        />
      </button>

      <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '2px 0' }} />

      {/* Flight Paths / Arcs */}
      <button
        className={`tool-btn ${showFlightPaths ? 'active' : ''}`}
        title={showFlightPaths ? 'Hide Flight Trajectories' : 'Show Flight Trajectories'}
        onClick={handleToggleFlightPaths}
      >
        <Route size={15} />
      </button>

      {/* Weather Doppler Radar */}
      <button
        className={`tool-btn ${showWeatherRadar ? 'active' : ''}`}
        title={showWeatherRadar ? 'Hide Weather Radar' : 'Show Weather Radar'}
        onClick={handleToggleWeather}
      >
        <CloudRain size={15} />
      </button>

      {/* Day / Night Terminator */}
      <button
        className={`tool-btn ${enableLighting ? 'active' : ''}`}
        title={enableLighting ? 'Disable Sun Shadow' : 'Enable Real-time Sun Shadow'}
        onClick={toggleLighting}
      >
        <Sun size={15} color={enableLighting ? 'var(--accent-amber)' : 'inherit'} />
      </button>

      {/* Satellite Imagery Menu Toggle */}
      <button
        className={`tool-btn ${showLayerMenu ? 'active' : ''}`}
        title="Satellite Imagery Layers"
        onClick={() => {
          setShowLayerMenu(!showLayerMenu);
          setShowHubMenu(false);
        }}
      >
        <Layers size={15} />
      </button>

      {/* Aviation Hubs Menu Toggle */}
      <button
        className={`tool-btn ${showHubMenu || selectedHub ? 'active' : ''}`}
        title="Aviation Hub Teleport"
        onClick={() => {
          setShowHubMenu(!showHubMenu);
          setShowLayerMenu(false);
        }}
      >
        <MapPin size={15} />
      </button>

      <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '2px 0' }} />

      {/* Reset Camera View */}
      <button
        className="tool-btn"
        title="Reset Global View"
        onClick={handleResetHome}
      >
        <RotateCcw size={14} />
      </button>

      {/* Toast Feedback */}
      {toastMessage && <div className="hud-toast">{toastMessage}</div>}

      {/* Dropdown: Imagery Layers */}
      {showLayerMenu && (
        <div className="tool-dropdown" style={{ top: 140, width: 170 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '2px 6px' }}>
            Base Layer
          </div>
          {[
            { id: 'blue-marble', label: 'NASA Blue Marble' },
            { id: 'dark-radar', label: 'Tactical Dark' },
            { id: 'natural-earth', label: 'Natural Earth II' },
          ].map((layer) => (
            <button
              key={layer.id}
              className={`filter-btn ${imageryLayer === layer.id ? 'active' : ''}`}
              style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11 }}
              onClick={() => {
                setImageryLayer(layer.id as any);
                setShowLayerMenu(false);
              }}
            >
              {layer.label}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown: Aviation Hubs */}
      {showHubMenu && (
        <div className="tool-dropdown" style={{ top: 180, width: 200, maxHeight: 300, overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '2px 6px' }}>
            Major Hubs
          </div>
          {AVIATION_HUBS.map((hub) => (
            <button
              key={hub.id}
              className={`filter-btn ${selectedHub?.id === hub.id ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                fontSize: 11,
              }}
              onClick={() => handleSelectHub(hub)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="font-mono" style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                  {hub.code}
                </span>
                <span>{hub.city}</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{hub.country}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};
