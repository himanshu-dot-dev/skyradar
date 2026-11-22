import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Compass,
  Plus,
  Minus,
  RotateCcw,
  Layers,
  MapPin,
  Route,
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
  const selectedHub = useGlobeStore((s) => s.selectedHub);
  const setImageryLayer = useGlobeStore((s) => s.setImageryLayer);
  const toggleLighting = useGlobeStore((s) => s.toggleLighting);
  const toggleFlightPaths = useGlobeStore((s) => s.toggleFlightPaths);
  const selectHub = useGlobeStore((s) => s.selectHub);
  const selectedAircraft = useAircraftStore((s) => s.selectedAircraft);

  // Monitor live globe heading to dynamically rotate the Compass icon
  useEffect(() => {
    if (!globeHandle) return;
    const viewer = globeHandle.getViewer();
    if (!viewer || viewer.isDestroyed()) return;

    const updateHeading = () => {
      if (!viewer.isDestroyed()) {
        const deg = Math.round((viewer.camera.heading * 180) / Math.PI);
        setCameraHeadingDeg((deg % 360 + 360) % 360);
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
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetHeading = () => {
    if (globeHandle) {
      globeHandle.resetHeading();
      showToast('🧭 Orientation Re-aligned: True North (0°)');
    }
  };

  const handleToggleFlightPaths = () => {
    const nextState = !showFlightPaths;
    toggleFlightPaths();
    if (nextState) {
      if (selectedAircraft) {
        showToast(`🔀 Trajectory Trails Active: Showing route for ${selectedAircraft.callsign || selectedAircraft.id.toUpperCase()}`);
      } else {
        showToast('🔀 Trajectory Trails Enabled: Click any aircraft on the globe to inspect its 3D flight path');
      }
    } else {
      showToast('🔀 Trajectory Trails Disabled');
    }
  };

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
    <div
      style={{
        position: 'absolute',
        right: 20,
        top: 80,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Consolidated Glassmorphic Flight Instruments HUD */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 6,
          gap: 6,
          position: 'relative',
        }}
      >
        {/* Zoom Controls */}
        <button
          className="glass-btn"
          style={{ width: 38, height: 38 }}
          title="Zoom In (or double-click on Earth)"
          onClick={() => globeHandle?.zoomIn()}
        >
          <Plus size={18} />
        </button>

        <button
          className="glass-btn"
          style={{ width: 38, height: 38 }}
          title="Zoom Out (or scroll mouse wheel)"
          onClick={() => globeHandle?.zoomOut()}
        >
          <Minus size={18} />
        </button>

        {/* Live Rotating Heading Compass */}
        <button
          className="glass-btn"
          style={{ width: 38, height: 38 }}
          title={`Reset Orientation: North Up (Current Heading: ${cameraHeadingDeg}°)`}
          onClick={handleResetHeading}
        >
          <Compass
            size={18}
            style={{
              transform: `rotate(${-cameraHeadingDeg}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
          />
        </button>

        <div style={{ height: 1, backgroundColor: 'rgba(0, 240, 255, 0.2)', margin: '2px 4px' }} />

        {/* Flight Trajectory Paths Toggle */}
        <button
          className={`glass-btn ${showFlightPaths ? 'active' : ''}`}
          style={{ width: 38, height: 38 }}
          title={
            showFlightPaths
              ? selectedAircraft
                ? `Hide Flight Trajectory Trails (Active for ${selectedAircraft.callsign || selectedAircraft.id.toUpperCase()})`
                : 'Flight Trajectories: Enabled (Click any flight to view trajectory)'
              : 'Show Flight Trajectory Trails'
          }
          onClick={handleToggleFlightPaths}
        >
          <Route size={18} color={showFlightPaths ? 'var(--accent-cyan)' : 'inherit'} />
        </button>

        {/* Tactical HUD Toast Banner for Instruments Feedback */}
        {toastMessage && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              right: 56,
              top: 90,
              padding: '8px 14px',
              fontSize: 12,
              fontFamily: '"JetBrains Mono", monospace',
              color: '#00f0ff',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 240, 255, 0.25)',
              border: '1px solid rgba(0, 240, 255, 0.45)',
              zIndex: 30,
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Day / Night Sun Terminator */}
        <button
          className={`glass-btn ${enableLighting ? 'active' : ''}`}
          style={{ width: 38, height: 38 }}
          title={enableLighting ? 'Disable Sun Terminator (Full Daytime)' : 'Enable Real-Time Sun Terminator (Day/Night Shadow)'}
          onClick={toggleLighting}
        >
          {enableLighting ? <Sun size={18} color="var(--accent-amber)" /> : <Sun size={18} />}
        </button>

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

        {/* Major Aviation Hubs Menu */}
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

        <div style={{ height: 1, backgroundColor: 'rgba(0, 240, 255, 0.2)', margin: '2px 4px' }} />

        {/* Reset Global Camera Home */}
        <button
          className="glass-btn"
          style={{ width: 38, height: 38 }}
          title="Reset Global View"
          onClick={handleResetHome}
        >
          <RotateCcw size={17} />
        </button>

        {/* Popup: Imagery Layers Menu */}
        {showLayerMenu && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              right: 50,
              top: 140,
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
              <Sun size={15} />
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
              <span>Natural Earth II</span>
            </button>
          </div>
        )}

        {/* Popup: Aviation Hubs Menu */}
        {showHubMenu && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              right: 50,
              top: 180,
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
