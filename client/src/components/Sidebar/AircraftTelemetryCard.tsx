import React, { useEffect } from 'react';
import { X, Crosshair, Eye } from 'lucide-react';
import { useAircraftStore } from '../../store/aircraftStore';
import { formatAltitude, headingToCompass } from '../../utils/geoMath';
import { getAircraftCategoryDetails, getAirlineLivery } from '../../utils/aircraftClassification';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';

interface AircraftTelemetryCardProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const AircraftTelemetryCard: React.FC<AircraftTelemetryCardProps> = ({ globeHandle }) => {
  const selectedAircraft = useAircraftStore((s) => s.selectedAircraft);
  const isFollowing = useAircraftStore((s) => s.isFollowing);
  const toggleFollow = useAircraftStore((s) => s.toggleFollow);
  const clearSelection = useAircraftStore((s) => s.clearSelection);

  // Keyboard shortcut: Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  if (!selectedAircraft) return null;

  const { position, movement } = selectedAircraft;
  const altitude = formatAltitude(position.altitudeMeters);
  const compassText = headingToCompass(movement.heading);
  const speedKmh = Math.round(movement.speedKnots * 1.852);
  const isClimbing = movement.verticalRateFpm > 250;
  const isDescending = movement.verticalRateFpm < -250;

  const handleFlyTo = () => {
    if (globeHandle) {
      globeHandle.flyToHub(
        position.latitude,
        position.longitude,
        Math.max(350000, position.altitudeMeters * 18)
      );
    }
  };

  const callsign = selectedAircraft.callsign || selectedAircraft.id.toUpperCase();
  const operator = selectedAircraft.operator || (selectedAircraft.isSimulated ? 'Corridor Flight' : 'En-route');
  const modelText = selectedAircraft.modelDescription || selectedAircraft.aircraftType || 'Commercial Airliner';
  const categoryDetails = getAircraftCategoryDetails(selectedAircraft.aircraftType);
  const livery = getAirlineLivery(selectedAircraft.callsign, selectedAircraft.operator);

  return (
    <aside className="inspector-panel">
      {/* 1. Header Bar: Callsign, Operator, and Close button */}
      <div className="inspector-header">
        <div className="mobile-drag-handle" />
        <div className="inspector-header-top">
          <div className="inspector-title-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="inspector-callsign font-mono">{callsign}</span>
              <span className="airframe-badge font-mono">{categoryDetails.shortTag}</span>
            </div>
            <span className="inspector-sub">
              {operator} • {selectedAircraft.aircraftType || 'Aviation'}
            </span>
          </div>
          <button
            className="close-inspector-btn"
            title="Close Inspector (Esc)"
            onClick={clearSelection}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Gate-to-Gate Route Strip */}
      {selectedAircraft.route ? (
        <div className="route-strip">
          <div className="route-endpoints">
            <div>
              <div className="endpoint-code font-mono">{selectedAircraft.route.originCode}</div>
              <div className="endpoint-city">{selectedAircraft.route.originCity}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="endpoint-code font-mono">{selectedAircraft.route.destinationCode}</div>
              <div className="endpoint-city right">{selectedAircraft.route.destinationCity}</div>
            </div>
          </div>

          <div className="route-progress-track">
            <div
              className="route-progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, Math.round(selectedAircraft.route.progress * 100)))}%` }}
            />
          </div>

          <div className="route-meta font-mono">
            <span>DEP {selectedAircraft.route.originCode}</span>
            <span style={{ color: 'var(--text-high)', fontWeight: 600 }}>
              {Math.round(selectedAircraft.route.progress * 100)}% EN ROUTE
            </span>
            <span>ARR {selectedAircraft.route.destinationCode}</span>
          </div>
        </div>
      ) : (
        <div className="route-strip">
          <div className="route-meta font-mono" style={{ justifyContent: 'space-between' }}>
            <span>DATA SOURCE</span>
            <span style={{ color: selectedAircraft.isSimulated ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
              {selectedAircraft.isSimulated ? 'SIMULATED CORRIDOR' : 'LIVE ADS-B'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Flat 2x2 Telemetry Matrix (Zero Nested Boxes) */}
      <div className="telemetry-grid">
        {/* Metric 1: Altitude */}
        <div className="metric-cell">
          <span className="metric-label">Altitude</span>
          <div className="metric-value font-mono">
            {position.altitudeFeet.toLocaleString()} <span className="unit">FT</span>
          </div>
          <div className="metric-sub font-mono">
            {altitude.flightLevel} • {altitude.metersText}
          </div>
        </div>

        {/* Metric 2: Ground Speed */}
        <div className="metric-cell">
          <span className="metric-label">Ground Speed</span>
          <div className="metric-value font-mono">
            {Math.round(movement.speedKnots)} <span className="unit">KTS</span>
          </div>
          <div className="metric-sub font-mono">{speedKmh} km/h</div>
        </div>

        {/* Metric 3: Heading & Track */}
        <div className="metric-cell">
          <span className="metric-label">Track / Heading</span>
          <div className="metric-value font-mono">
            {Math.round(movement.heading)}° <span className="unit">{compassText}</span>
          </div>
          <div className="metric-sub font-mono">
            {isClimbing
              ? `+${Math.round(movement.verticalRateFpm)} fpm`
              : isDescending
              ? `${Math.round(movement.verticalRateFpm)} fpm`
              : 'Level flight'}
          </div>
        </div>

        {/* Metric 4: Transponder */}
        <div className="metric-cell">
          <span className="metric-label">Transponder</span>
          <div
            className="metric-value font-mono"
            style={{
              color: selectedAircraft.squawk === '7700' ? 'var(--accent-red)' : 'var(--text-high)',
            }}
          >
            {selectedAircraft.squawk || '1200'}
          </div>
          <div className="metric-sub font-mono">
            Mode-S: <span style={{ color: 'var(--text-high)' }}>{selectedAircraft.id.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* 4. Technical Specs List */}
      <div className="specs-table">
        <div className="spec-row">
          <span className="spec-key">Aircraft Model</span>
          <span className="spec-val">{modelText}</span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Airframe Class</span>
          <span className="spec-val font-mono">{categoryDetails.label}</span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Operator / Livery</span>
          <span className="spec-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: livery.tailColor,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            />
            <span>{livery.name}</span>
          </span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Registration</span>
          <span className="spec-val">{selectedAircraft.registration || 'N/A'}</span>
        </div>
        <div className="spec-row">
          <span className="spec-key">Coordinates</span>
          <span className="spec-val font-mono">
            {position.latitude >= 0 ? `${position.latitude.toFixed(3)}° N` : `${Math.abs(position.latitude).toFixed(3)}° S`},{' '}
            {position.longitude >= 0 ? `${position.longitude.toFixed(3)}° E` : `${Math.abs(position.longitude).toFixed(3)}° W`}
          </span>
        </div>
      </div>

      {/* 5. Clean Action Buttons */}
      <div className="inspector-actions">
        <button className="action-btn" onClick={handleFlyTo} title="Focus camera on flight">
          <Crosshair size={13} />
          <span>Center</span>
        </button>
        <button
          className={`action-btn ${isFollowing ? 'active' : ''}`}
          onClick={toggleFollow}
          title={isFollowing ? 'Unlock camera follow' : 'Lock camera to follow flight'}
        >
          <Eye size={13} />
          <span>{isFollowing ? 'Tracking' : 'Follow'}</span>
        </button>
      </div>
    </aside>
  );
};
