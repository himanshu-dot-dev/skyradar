import React, { useState, useEffect } from 'react';
import { useAircraftStore } from '../../store/aircraftStore';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';

interface HeaderProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const Header: React.FC<HeaderProps> = () => {
  const [utcTime, setUtcTime] = useState<string>('');
  const totalCount = useAircraftStore((s) => s.totalCount);
  const isSimulatedMode = useAircraftStore((s) => s.isSimulatedMode);
  const setSimulatedMode = useAircraftStore((s) => s.setSimulatedMode);

  // Aviation ZULU Clock (UTC)
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
    <header className="top-header">
      {/* Brand Identity & Fleet Metrics */}
      <div className="header-left">
        <div className="brand-logo">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m4.93 4.93 4.24 4.24" />
            <path d="m14.83 9.17 4.24-4.24" />
            <path d="m14.83 14.83 4.24 4.24" />
            <path d="m9.17 14.83-4.24 4.24" />
            <circle cx="12" cy="2" r="1.5" fill="currentColor" />
          </svg>
          <span>SKYRADAR</span>
        </div>

        <div className="header-divider" />

        {/* Flight Counter Capsule */}
        <div className="flight-counter">
          <span className="num font-mono">{totalCount > 0 ? totalCount.toLocaleString() : '0'}</span>
          <span className="label">Flights</span>
        </div>

        <div className="header-divider" />

        {/* Segmented Mode Switcher [ LIVE | SIM ] */}
        <div className="mode-switch">
          <button
            className={`mode-tab ${!isSimulatedMode ? 'active' : ''}`}
            onClick={() => setSimulatedMode(false)}
            title="Live ADS-B Radar tracking feed"
          >
            <span className="mode-dot live" />
            <span>LIVE</span>
          </button>
          <button
            className={`mode-tab ${isSimulatedMode ? 'active' : ''}`}
            onClick={() => setSimulatedMode(true)}
            title="Simulated Global Corridor flight feed"
          >
            <span className="mode-dot sim" />
            <span>SIM</span>
          </button>
        </div>
      </div>

      {/* Right: Aviation UTC Clock */}
      <div className="header-right">
        <div className="utc-clock font-mono">{utcTime || '--:--:-- UTC'}</div>
      </div>
    </header>
  );
};
