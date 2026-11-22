import React, { useState, useEffect } from 'react';
import { Radio, Clock, ShieldCheck, Plane } from 'lucide-react';
import { useGlobeStore, AVIATION_HUBS, type AviationHub } from '../../store/globeStore';
import { useAircraftStore } from '../../store/aircraftStore';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';

interface HeaderProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const Header: React.FC<HeaderProps> = ({ globeHandle }) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const selectedHub = useGlobeStore((s) => s.selectedHub);
  const selectHub = useGlobeStore((s) => s.selectHub);
  const totalCount = useAircraftStore((s) => s.totalCount);
  const isSimulatedMode = useAircraftStore((s) => s.isSimulatedMode);

  // Live UTC Clock for aviation standards (ZULU time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().substring(11, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleHubClick = (hub: AviationHub) => {
    selectHub(hub);
    if (globeHandle) {
      globeHandle.flyToHub(hub.latitude, hub.longitude, hub.cameraHeight);
    }
  };

  return (
    <header
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 14,
        left: 20,
        right: 20,
        height: 52,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        border: '1px solid var(--border-cyan)',
      }}
    >
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="radar-indicator" />
          <h1
            style={{
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: 1.4,
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>SKY</span>
            <span style={{ color: 'var(--accent-cyan)' }}>RADAR</span>
          </h1>
        </div>

        <div
          style={{
            height: 18,
            width: 1,
            backgroundColor: 'var(--border-cyan)',
          }}
        />

        {/* Live Aircraft Count Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--accent-cyan)',
            backgroundColor: 'rgba(0, 240, 255, 0.08)',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-cyan)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Plane size={14} />
          <span>{totalCount} TRACKED</span>
        </div>
      </div>

      {/* Quick Hub Airport Shortcuts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Aviation Hubs:
        </span>
        {AVIATION_HUBS.slice(0, 5).map((hub) => (
          <button
            key={hub.id}
            className={`glass-btn ${selectedHub?.id === hub.id ? 'active' : ''}`}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
            onClick={() => handleHubClick(hub)}
          >
            {hub.code}
          </button>
        ))}
      </div>

      {/* Mode Indicator & UTC Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Simulation / Live Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: isSimulatedMode ? 'var(--accent-amber)' : 'var(--accent-emerald)',
            backgroundColor: isSimulatedMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${isSimulatedMode ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
          }}
        >
          <Radio size={12} />
          <span>{isSimulatedMode ? 'SIMULATED DATA' : 'LIVE ADS-B'}</span>
        </div>

        {/* UTC Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(0, 240, 255, 0.08)',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-cyan)',
          }}
        >
          <Clock size={13} color="var(--accent-cyan)" />
          <span className="font-mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent-cyan)' }}>
            {utcTime}
          </span>
        </div>
      </div>
    </header>
  );
};
