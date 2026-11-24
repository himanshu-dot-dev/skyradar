import React, { useState, useEffect, useRef } from 'react';

interface SkyPreloaderProps {
  isGlobeReady: boolean;
  onFinish?: () => void;
}

export const SkyPreloader: React.FC<SkyPreloaderProps> = ({ isGlobeReady, onFinish }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now();
    }
    const minDuration = 1500; // Snappy 1.5s duration
    const elapsed = performance.now() - startTimeRef.current;

    const complete = () => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsDestroyed(true);
        onFinish?.();
      }, 500);
    };

    if (isGlobeReady && elapsed >= minDuration) {
      complete();
    } else {
      const remaining = Math.max(0, minDuration - elapsed);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (isGlobeReady) {
          complete();
        }
      }, remaining);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isGlobeReady, onFinish]);

  if (isDestroyed) return null;

  return (
    <div className={`sky-preloader-root ${isFadingOut ? 'fade-out' : ''}`}>
      {/* 1. Starry Sky Backdrop with Scattered Small White Clouds */}
      <div className="preloader-sky-stage">
        <div className="preloader-stars" />
        <div className="preloader-corridor-line" />

        {/* Small Discrete White Clouds (Styled after attached reference) */}
        {/* Cloud 1: Classic Puffy Cumulus (Upper, Slow Drift) */}
        <svg className="preloader-cloud-item drift-slow" style={{ top: '14vh', animationDelay: '-5s' }} width="130" height="65" viewBox="0 0 140 70">
          <path fill="#ffffff" d="M 20,55 A 16,16 0 0,1 25,28 A 22,22 0 0,1 55,18 A 26,26 0 0,1 92,20 A 20,20 0 0,1 122,34 A 16,16 0 0,1 120,55 Z" />
        </svg>

        {/* Cloud 2: Fluffy Cloud with Wind Speed Lines (Mid-Upper, Fast Drift) */}
        <svg className="preloader-cloud-item drift-fast" style={{ top: '24vh', animationDelay: '-11s' }} width="150" height="70" viewBox="0 0 160 75">
          <path fill="#ffffff" d="M 22,58 A 18,18 0 0,1 32,28 A 24,24 0 0,1 72,16 A 22,22 0 0,1 106,28 A 18,18 0 0,1 114,58 Z" />
          <rect x="122" y="32" width="18" height="3" rx="1.5" fill="#ffffff" opacity="0.9" />
          <rect x="118" y="42" width="24" height="3" rx="1.5" fill="#ffffff" opacity="0.9" />
          <rect x="124" y="52" width="12" height="3" rx="1.5" fill="#ffffff" opacity="0.9" />
        </svg>

        {/* Cloud 3: Small Cute Puffy Cloud (Lower Mid, Mid Speed) */}
        <svg className="preloader-cloud-item drift-mid" style={{ top: '64vh', animationDelay: '-2s' }} width="105" height="52" viewBox="0 0 110 55">
          <path fill="#ffffff" d="M 16,44 A 14,14 0 0,1 24,22 A 18,18 0 0,1 55,14 A 18,18 0 0,1 86,22 A 14,14 0 0,1 94,44 Z" />
        </svg>

        {/* Cloud 4: Broad Multi-Bubble Cloud (Deep Lower, Slow Drift) */}
        <svg className="preloader-cloud-item drift-slow" style={{ top: '78vh', animationDelay: '-18s' }} width="165" height="78" viewBox="0 0 180 85">
          <path fill="#ffffff" d="M 20,68 A 18,18 0 0,1 30,36 A 24,24 0 0,1 68,22 A 28,28 0 0,1 115,20 A 22,22 0 0,1 148,35 A 18,18 0 0,1 160,68 Z" />
        </svg>

        {/* Cloud 5: Compact Floating Cloud (Upper Right, Fast Drift) */}
        <svg className="preloader-cloud-item drift-fast" style={{ top: '18vh', animationDelay: '-7s' }} width="115" height="58" viewBox="0 0 120 60">
          <path fill="#ffffff" d="M 18,48 A 15,15 0 0,1 26,24 A 20,20 0 0,1 60,16 A 18,18 0 0,1 94,26 A 15,15 0 0,1 102,48 Z" />
        </svg>

        {/* Cloud 6: Wind-Streak Cloud (Lower Right, Mid Speed) */}
        <svg className="preloader-cloud-item drift-mid" style={{ top: '70vh', animationDelay: '-14s' }} width="140" height="65" viewBox="0 0 150 70">
          <path fill="#ffffff" d="M 20,54 A 16,16 0 0,1 30,26 A 22,22 0 0,1 68,16 A 20,20 0 0,1 100,28 A 16,16 0 0,1 106,54 Z" />
          <rect x="114" y="32" width="20" height="3" rx="1.5" fill="#ffffff" opacity="0.9" />
          <rect x="112" y="42" width="14" height="3" rx="1.5" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>

      {/* 2. Top-View Widebody Airliner Soaring Across Cloud Deck */}
      <div className="preloader-airliner-track">
        <div className="preloader-airliner-entity">
          <svg
            width="520"
            height="260"
            viewBox="-300 -150 600 300"
            fill="none"
            className="preloader-top-plane-svg"
          >
            <defs>
              {/* Wing Surface Gradient */}
              <linearGradient id="topPreloaderWingGrad" x1="0" y1="-130" x2="0" y2="130" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="20%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="80%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>

              {/* Fuselage Cylindrical Gradient */}
              <linearGradient id="topPreloaderFuseGrad" x1="0" y1="-18" x2="0" y2="18" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="25%" stopColor="#cbd5e1" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="75%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>

              {/* Engine Cowling Gradients */}
              <linearGradient id="topPreloaderEngUpper" x1="0" y1="-58" x2="0" y2="-38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
              <linearGradient id="topPreloaderEngLower" x1="0" y1="38" x2="0" y2="58" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>

              {/* Contrail Plumes */}
              <linearGradient id="topPreloaderContrail" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                <stop offset="15%" stopColor="rgba(241, 245, 249, 0.70)" />
                <stop offset="45%" stopColor="rgba(203, 213, 225, 0.35)" />
                <stop offset="80%" stopColor="rgba(148, 163, 184, 0.12)" />
                <stop offset="100%" stopColor="rgba(148, 163, 184, 0)" />
              </linearGradient>
            </defs>

            {/* Twin Expanding Contrails (Pure gradient feathering, zero CPU blur filters) */}
            <path d="M -26,-48 C -90,-49 -180,-53 -300,-58 L -300,-38 C -180,-43 -90,-47 -26,-46 Z" fill="url(#topPreloaderContrail)" />
            <path d="M -26,48 C -90,47 -180,43 -300,38 L -300,58 C -180,53 -90,49 -26,46 Z" fill="url(#topPreloaderContrail)" />

            {/* Horizontal Stabilizers (Tailplanes) */}
            <path d="M -90,0 L -118,-65 L -128,-60 L -120,0 L -128,60 L -118,65 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="2.2" strokeLinejoin="round" />

            {/* Swept Wings with Raked Tips */}
            <path
              d="M 38,0 C 38,-10 30,-20 18,-25 L -35,-130 L -48,-125 L -20,-25 C -25,-18 -30,-10 -30,0 C -30,10 -25,18 -20,25 L -48,125 L -35,130 C 30,20 38,10 38,0 Z"
              fill="url(#topPreloaderWingGrad)"
              stroke="#334155"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />

            {/* Livery Wing Stripes */}
            <path
              d="M -28,-90 L -38,-110 L -46,-105 L -36,-85 Z M -28,90 L -38,110 L -46,105 L -36,85 Z"
              fill="#5b8cb4"
              opacity="0.85"
            />

            {/* Flap Track Fairings (Canoes) */}
            <polygon points="-24,-58 -32,-58 -32,-55 -24,-55" fill="#334155" />
            <polygon points="-28,-80 -36,-80 -36,-77 -28,-77" fill="#334155" />
            <polygon points="-24,55 -32,55 -32,58 -24,58" fill="#334155" />
            <polygon points="-28,77 -36,77 -36,80 -28,80" fill="#334155" />

            {/* Turbofan Engines */}
            {/* Port (Upper) Engine */}
            <g>
              <rect x="-18" y="-49.5" width="22" height="3" rx="1.5" fill="#64748b" />
              <ellipse cx="-4" cy="-48" rx="22" ry="10" fill="url(#topPreloaderEngUpper)" stroke="#334155" strokeWidth="1.8" />
              <ellipse cx="16" cy="-48" rx="4" ry="9" fill="#0f172a" stroke="#475569" strokeWidth="1.4" />
              <circle cx="16" cy="-48" r="2.2" fill="#f8fafc" />
              <ellipse cx="-23" cy="-48" rx="3.5" ry="6" fill="#334155" />
            </g>
            {/* Starboard (Lower) Engine */}
            <g>
              <rect x="-18" y="46.5" width="22" height="3" rx="1.5" fill="#64748b" />
              <ellipse cx="-4" cy="48" rx="22" ry="10" fill="url(#topPreloaderEngLower)" stroke="#334155" strokeWidth="1.8" />
              <ellipse cx="16" cy="48" rx="4" ry="9" fill="#0f172a" stroke="#475569" strokeWidth="1.4" />
              <circle cx="16" cy="48" r="2.2" fill="#f8fafc" />
              <ellipse cx="-23" cy="48" rx="3.5" ry="6" fill="#334155" />
            </g>

            {/* Main Fuselage Body */}
            <path
              d="M 120,0 C 120,-12 90,-16 38,-16 L -60,-16 C -95,-16 -120,-7 -130,0 C -120,7 -95,16 -60,16 L 38,16 C 90,16 120,12 120,0 Z"
              fill="url(#topPreloaderFuseGrad)"
              stroke="#334155"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />

            {/* Cockpit Visor */}
            <path d="M 100,0 C 99,-7 95,-9 88,-10 L 86,-8 C 91,-7 94,-5 95,0 C 94,5 91,7 86,8 L 88,10 C 95,9 99,7 100,0 Z" fill="#0f172a" />
            <path d="M 97,0 C 96,-4 93,-6 89,-7 L 88,-5.5 C 91,-4.5 93,-3 94,0 Z" fill="#38bdf8" opacity="0.85" />

            {/* Tail Fin Ridge Livery Ribbon */}
            <path d="M -60,0 C -75,-4 -102,-5 -128,-2 L -128,2 C -102,5 -75,4 -60,0 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.4" />
            <path d="M -75,0 C -85,-3 -105,-3.5 -125,-1.5 L -125,1.5 C -105,3.5 -85,3 -75,0 Z" fill="#5b8cb4" />

            {/* Navigation Strobes (GPU opacity-only pulsing, zero paint invalidations) */}
            <circle cx="-42" cy="-128" r="8" fill="#ef4444" className="preloader-strobe-red" />
            <circle cx="-42" cy="-128" r="3.8" fill="#ef4444" />
            <circle cx="-42" cy="128" r="8" fill="#10b981" className="preloader-strobe-green" />
            <circle cx="-42" cy="128" r="3.8" fill="#10b981" />
            <circle cx="-130" cy="0" r="7" fill="#ffffff" className="preloader-strobe-white" />
            <circle cx="-130" cy="0" r="3.5" fill="#ffffff" />
          </svg>
        </div>
      </div>
    </div>
  );
};
