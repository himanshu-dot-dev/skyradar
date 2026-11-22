import React, { useState, useEffect } from 'react';
import { Radio, Clock, ShieldCheck, Navigation } from 'lucide-react';
import { useGlobeStore, AVIATION_HUBS, type AviationHub } from '../../store/globeStore';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';

interface HeaderProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const Header: React.FC<HeaderProps> = ({ globeHandle }) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const selectedHub = useGlobeStore((s) => s.selectedHub);
  const selectHub = useGlobeStore((s) => s.selectHub);

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
          <Radio size={14} color="var(--accent-cyan)" />
          <span>3D Flight Radar</span>
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

      {/* UTC Clock & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--accent-emerald)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <ShieldCheck size={13} />
          <span>PHASE 1 ACTIVE</span>
        </div>
      </div>
    </header>
  );
};
