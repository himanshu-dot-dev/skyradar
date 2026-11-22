import React, { useEffect } from 'react';
import {
  X,
  Plane,
  Gauge,
  Navigation,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Radio,
  Eye,
  MapPin,
  Compass,
  Crosshair,
} from 'lucide-react';
import { useAircraftStore } from '../../store/aircraftStore';
import { formatAltitude, headingToCompass } from '../../utils/geoMath';
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

  const handleFlyTo = () => {
    if (globeHandle) {
      globeHandle.flyToHub(
        position.latitude,
        position.longitude,
        Math.max(350000, position.altitudeMeters * 18)
      );
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 80,
        right: 80,
        width: 340,
        zIndex: 15,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        border: '1px solid var(--border-cyan-active)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65), 0 0 20px rgba(0, 240, 255, 0.15)',
      }}
    >
      {/* Header: Callsign & Close Button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plane size={18} color="var(--accent-cyan)" />
            <span
              className="font-mono"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: 1,
              }}
            >
              {selectedAircraft.callsign || 'N/A'}
            </span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {selectedAircraft.operator || 'Unknown Operator'}
          </div>
        </div>

        <button
          className="glass-btn"
          style={{ width: 30, height: 30 }}
          title="Close (Esc)"
          onClick={clearSelection}
        >
          <X size={16} />
        </button>
      </div>

      {/* Simulated or Live Data Badge */}
      {selectedAircraft.isSimulated ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            padding: '5px 10px',
            borderRadius: 6,
            fontSize: 11,
          }}
        >
          <span style={{ color: 'var(--accent-amber)', fontWeight: 600, letterSpacing: 0.5 }}>
            SIMULATED FLIGHT
          </span>
          <span style={{ color: 'var(--text-muted)' }}>Global Corridor Model</span>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            padding: '5px 10px',
            borderRadius: 6,
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-emerald)', boxShadow: '0 0 6px var(--accent-emerald)' }} />
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, letterSpacing: 0.5 }}>
              LIVE RADAR
            </span>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>LIVE ADS-B</span>
        </div>
      )}

      {/* Aircraft Type & Registration Card */}
      <div
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          padding: '10px',
          borderRadius: 6,
          border: '1px solid var(--border-cyan)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Aircraft Type:</span>
          <strong style={{ color: 'var(--text-primary)' }}>
            {selectedAircraft.modelDescription || selectedAircraft.aircraftType || 'Commercial Aircraft'}
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>ICAO Code:</span>
          <span className="font-mono" style={{ color: 'var(--accent-blue)' }}>
            {selectedAircraft.aircraftType || 'N/A'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Registration:</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {selectedAircraft.registration || 'N/A'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Mode-S Hex:</span>
          <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
            {selectedAircraft.id.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Flight Route Corridor & Waypoints or Live Flight Vector */}
      {selectedAircraft.route ? (
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            padding: '12px',
            borderRadius: 6,
            border: '1px solid var(--border-cyan)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--accent-emerald)', fontWeight: 600 }}>DEP</span>
                <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedAircraft.route.originCode}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedAircraft.route.originCity}
              </div>
            </div>

            <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
                {/* Dotted route baseline */}
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    background: 'repeating-linear-gradient(90deg, rgba(0, 240, 255, 0.4), rgba(0, 240, 255, 0.4) 4px, transparent 4px, transparent 8px)',
                  }}
                />
                {/* Progress plane icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.round(selectedAircraft.route.progress * 100)}%`,
                    transform: 'translate(-50%, 0)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.8))',
                  }}
                >
                  <Plane size={15} style={{ transform: 'rotate(90deg)' }} />
                </div>
              </div>

              <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent-cyan)', fontWeight: 600 }}>
                {Math.round(selectedAircraft.route.progress * 100)}% EN ROUTE
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedAircraft.route.destinationCode}
                </span>
                <span style={{ fontSize: 10, color: 'var(--accent-amber)', fontWeight: 600 }}>ARR</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedAircraft.route.destinationCity}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid var(--border-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Navigation size={16} color="var(--accent-cyan)" />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Heading</div>
              <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {movement.heading}° {compassText}
              </div>
            </div>
          </div>

          <div style={{ height: 24, width: 1, backgroundColor: 'rgba(0, 240, 255, 0.2)' }} />

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ground Track</div>
            <div className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)' }}>
              {movement.speedKnots} KTS
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Altitude */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-cyan)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Gauge size={12} color="var(--accent-cyan)" />
            <span>ALTITUDE</span>
          </div>
          <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)', marginTop: 2 }}>
            {altitude.flightLevel}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {altitude.metersText}
          </div>
        </div>

        {/* Speed */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-cyan)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Navigation size={12} color="var(--accent-blue)" />
            <span>GROUND SPEED</span>
          </div>
          <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
            {movement.speedKnots} <span style={{ fontSize: 12, fontWeight: 400 }}>kts</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {speedKmh} km/h
          </div>
        </div>

        {/* Heading */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-cyan)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Compass size={12} color="var(--accent-emerald)" />
            <span>TRACK / HEADING</span>
          </div>
          <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
            {movement.heading}°
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {compassText}
          </div>
        </div>

        {/* Vertical Rate & Squawk */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-cyan)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Radio size={12} color="var(--accent-amber)" />
            <span>TRANSPONDER</span>
          </div>
          <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-amber)', marginTop: 2 }}>
            {selectedAircraft.squawk || '1200'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            {movement.verticalRateFpm > 50 ? (
              <>
                <ArrowUpRight size={12} color="var(--accent-emerald)" />
                <span>+{movement.verticalRateFpm} fpm</span>
              </>
            ) : movement.verticalRateFpm < -50 ? (
              <>
                <ArrowDownRight size={12} color="var(--accent-rose)" />
                <span>{movement.verticalRateFpm} fpm</span>
              </>
            ) : (
              <>
                <Minus size={12} />
                <span>Level flight</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Position Coordinates */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--text-muted)',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          padding: '6px 10px',
          borderRadius: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={12} />
          <span>Coordinates:</span>
        </div>
        <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
          {position.latitude >= 0 ? `${position.latitude.toFixed(4)}°N` : `${Math.abs(position.latitude).toFixed(4)}°S`},{' '}
          {position.longitude >= 0 ? `${position.longitude.toFixed(4)}°E` : `${Math.abs(position.longitude).toFixed(4)}°W`}
        </span>
      </div>

      {/* Action Buttons: Center & Follow */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          className="glass-btn"
          style={{ padding: '8px 12px', fontSize: 12, gap: 6 }}
          onClick={handleFlyTo}
        >
          <Crosshair size={14} color="var(--accent-cyan)" />
          <span>Focus Camera</span>
        </button>

        <button
          className={`glass-btn ${isFollowing ? 'active' : ''}`}
          style={{ padding: '8px 12px', fontSize: 12, gap: 6 }}
          onClick={toggleFollow}
        >
          <Eye size={14} color={isFollowing ? 'var(--accent-cyan)' : 'inherit'} />
          <span>{isFollowing ? 'Tracking Locked' : 'Follow Flight'}</span>
        </button>
      </div>
    </div>
  );
};
