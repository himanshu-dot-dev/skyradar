import React, { useState, useEffect } from 'react';
import { Clock, Plane } from 'lucide-react';
import { useAircraftStore } from '../../store/aircraftStore';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';

interface HeaderProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const Header: React.FC<HeaderProps> = () => {
  const [utcTime, setUtcTime] = useState<string>('');
  const totalCount = useAircraftStore((s) => s.totalCount);
  const isDrawerOpen = useAircraftStore((s) => s.isDrawerOpen);
  const toggleDrawer = useAircraftStore((s) => s.toggleDrawer);

  // Live UTC Clock for aviation standards (ZULU time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
      {/* Brand Identity & Live Fleet Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="radar-indicator" />
          <h1
            style={{
              fontSize: 18,
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

        {/* Unified Flight Directory & Count Badge */}
        <button
          className={`glass-btn ${isDrawerOpen ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 12px',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Click to toggle Flight Directory & Filters"
          onClick={toggleDrawer}
        >
          <Plane size={14} color="var(--accent-cyan)" />
          <span>{totalCount > 0 ? `${totalCount.toLocaleString()} LIVE FLIGHTS` : 'RADAR ACTIVE'}</span>
        </button>
      </div>

      {/* Right: Live Radar Status & UTC Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Live Signal Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: 'var(--accent-emerald)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-emerald)',
              boxShadow: '0 0 6px var(--accent-emerald)',
            }}
          />
          <span>LIVE RADAR</span>
        </div>

        {/* UTC Aviation Clock */}
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
