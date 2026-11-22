import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Plane,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  Radio,
  Eye,
  Filter,
} from 'lucide-react';
import { useAircraftStore, matchesFilters, type AircraftFilters } from '../../store/aircraftStore';
import { formatAltitude, headingToCompass, getAltitudeColor } from '../../utils/geoMath';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';
import type { NormalizedAircraft } from '@shared/types';

interface AircraftSearchDrawerProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const AircraftSearchDrawer: React.FC<AircraftSearchDrawerProps> = ({ globeHandle }) => {
  const isDrawerOpen = useAircraftStore((s) => s.isDrawerOpen);
  const toggleDrawer = useAircraftStore((s) => s.toggleDrawer);
  const setDrawerOpen = useAircraftStore((s) => s.setDrawerOpen);
  const aircraftList = useAircraftStore((s) => s.aircraftList);
  const totalCount = useAircraftStore((s) => s.totalCount);
  const selectedAircraftId = useAircraftStore((s) => s.selectedAircraftId);
  const selectAircraft = useAircraftStore((s) => s.selectAircraft);

  const filters = useAircraftStore((s) => s.filters);
  const setSearchQuery = useAircraftStore((s) => s.setSearchQuery);
  const setFilters = useAircraftStore((s) => s.setFilters);
  const resetFilters = useAircraftStore((s) => s.resetFilters);

  const [showFilterSettings, setShowFilterSettings] = useState(false);

  // Compute filtered aircraft list
  const filteredAircraft = useMemo(() => {
    return aircraftList.filter((ac) => matchesFilters(ac, filters));
  }, [aircraftList, filters]);

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.altitudePreset !== 'all') count++;
    if (filters.minAltitudeFt > 0 || filters.maxAltitudeFt < 50000) count++;
    if (filters.minSpeedKnots > 0) count++;
    if (filters.verticalProfile !== 'all') count++;
    if (filters.emergencyOnly) count++;
    if (filters.filterOnGlobe) count++;
    return count;
  }, [filters]);

  const handleSelectAircraft = (ac: NormalizedAircraft) => {
    selectAircraft(ac.id);
    if (globeHandle) {
      globeHandle.flyToHub(
        ac.position.latitude,
        ac.position.longitude,
        Math.max(250000, ac.position.altitudeMeters * 15)
      );
    }
  };

  // When drawer is collapsed, show floating trigger button
  if (!isDrawerOpen) {
    return (
      <button
        className="glass-panel"
        style={{
          position: 'absolute',
          top: 76,
          left: 20,
          zIndex: 15,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.5,
          transition: 'all 0.2s ease',
        }}
        onClick={() => setDrawerOpen(true)}
        title="Open Flight Directory & Radar Search"
      >
        <Search size={15} color="var(--accent-cyan)" />
        <span style={{ fontFamily: 'var(--font-mono)' }}>FLIGHTS ({totalCount})</span>
        {activeFilterCount > 0 && (
          <span
            style={{
              backgroundColor: 'var(--accent-cyan)',
              color: '#020617',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 8,
            }}
          >
            {activeFilterCount}
          </span>
        )}
        <ChevronRight size={14} color="var(--text-secondary)" />
      </button>
    );
  }

  return (
    <aside
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 76,
        left: 20,
        bottom: 24,
        width: 360,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-cyan)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65), 0 0 20px rgba(0, 240, 255, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
          backgroundColor: 'rgba(3, 7, 18, 0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="radar-indicator" />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
              }}
            >
              Flight Directory
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                marginTop: 1,
              }}
            >
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                {filteredAircraft.length}
              </span>{' '}
              of {totalCount} active
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className={`glass-btn ${showFilterSettings ? 'active' : ''}`}
            style={{ width: 28, height: 28, position: 'relative' }}
            title="Toggle Filter Options"
            onClick={() => setShowFilterSettings(!showFilterSettings)}
          >
            <SlidersHorizontal size={14} />
            {activeFilterCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-cyan)',
                }}
              />
            )}
          </button>

          <button
            className="glass-btn"
            style={{ width: 28, height: 28 }}
            title="Collapse Sidebar"
            onClick={toggleDrawer}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* 2. Instant Search Input */}
      <div style={{ padding: '12px 14px 8px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-cyan)',
            borderRadius: 6,
            padding: '6px 10px',
          }}
        >
          <Search size={15} color="var(--accent-cyan)" />
          <input
            type="text"
            placeholder="Search callsign, hex, operator..."
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              width: '100%',
            }}
          />
          {filters.searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Collapsible Filter Control Panel */}
      {showFilterSettings && (
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'rgba(6, 12, 24, 0.85)',
            borderBottom: '1px solid var(--border-cyan)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontSize: 11,
          }}
        >
          {/* Altitude Presets */}
          <div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Altitude Range
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'ground', label: 'Gnd' },
                  { id: 'low', label: '<FL100' },
                  { id: 'mid', label: 'FL100+' },
                  { id: 'high', label: '>FL280' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  className={`glass-btn ${filters.altitudePreset === preset.id ? 'active' : ''}`}
                  style={{ padding: '4px 2px', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  onClick={() => setFilters({ altitudePreset: preset.id })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vertical Profile Presets */}
          <div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Vertical Movement
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'climbing', label: 'Climb ↑' },
                  { id: 'cruising', label: 'Level —' },
                  { id: 'descending', label: 'Desc ↓' },
                ] as const
              ).map((vp) => (
                <button
                  key={vp.id}
                  className={`glass-btn ${filters.verticalProfile === vp.id ? 'active' : ''}`}
                  style={{ padding: '4px 2px', fontSize: 10 }}
                  onClick={() => setFilters({ verticalProfile: vp.id })}
                >
                  {vp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Special Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* Emergency Squawk Filter */}
            <button
              className={`glass-btn ${filters.emergencyOnly ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '5px 8px',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                borderColor: filters.emergencyOnly ? 'var(--accent-rose)' : undefined,
                color: filters.emergencyOnly ? 'var(--accent-rose)' : undefined,
              }}
              onClick={() => setFilters({ emergencyOnly: !filters.emergencyOnly })}
            >
              <AlertTriangle size={13} />
              <span>Squawk 7700</span>
            </button>

            {/* Filter 3D Globe Sync */}
            <button
              className={`glass-btn ${filters.filterOnGlobe ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '5px 8px',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="When enabled, non-matching aircraft are also hidden on the 3D globe"
              onClick={() => setFilters({ filterOnGlobe: !filters.filterOnGlobe })}
            >
              <Eye size={13} />
              <span>Filter Globe</span>
            </button>

            {/* Reset Filters */}
            <button
              className="glass-btn"
              style={{ padding: '5px 8px', width: 28 }}
              title="Reset All Filters"
              onClick={resetFilters}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Aircraft List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {filteredAircraft.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <Plane size={32} color="var(--border-cyan)" />
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
              No Flights Found
            </div>
            <div style={{ fontSize: 11, maxWidth: 220, lineHeight: 1.4 }}>
              No active aircraft match the specified search query or filter thresholds.
            </div>
            <button
              className="glass-btn active"
              style={{ padding: '6px 14px', fontSize: 11, marginTop: 4 }}
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredAircraft.slice(0, 150).map((ac) => {
            const isSelected = ac.id === selectedAircraftId;
            const altInfo = formatAltitude(ac.position.altitudeMeters);
            const altColor = getAltitudeColor(ac.position.altitudeFeet);
            const compass = headingToCompass(ac.movement.heading);
            const isClimbing = ac.movement.verticalRateFpm > 250;
            const isDescending = ac.movement.verticalRateFpm < -250;

            return (
              <div
                key={ac.id}
                onClick={() => handleSelectAircraft(ac)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  backgroundColor: isSelected
                    ? 'rgba(0, 240, 255, 0.16)'
                    : 'rgba(15, 23, 42, 0.45)',
                  border: `1px solid ${
                    isSelected ? 'var(--accent-cyan)' : 'rgba(0, 240, 255, 0.12)'
                  }`,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.45)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.12)';
                  }
                }}
              >
                {/* Left: Callsign & Operator */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                        letterSpacing: 0.5,
                      }}
                    >
                      {ac.callsign || ac.id.toUpperCase()}
                    </span>

                    {ac.squawk === '7700' && (
                      <span
                        style={{
                          backgroundColor: 'rgba(244, 63, 94, 0.25)',
                          color: 'var(--accent-rose)',
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: 4,
                          border: '1px solid var(--accent-rose)',
                        }}
                      >
                        EMERGENCY 7700
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      maxWidth: 150,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {ac.operator || (ac.isSimulated ? 'Corridor Flight' : 'En-route')}
                  </div>
                </div>

                {/* Right: Altitude & Telemetry */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: altColor,
                      backgroundColor: `${altColor}18`,
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: `1px solid ${altColor}40`,
                    }}
                  >
                    {altInfo.flightLevel}
                  </div>

                  <div
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{Math.round(ac.movement.speedKnots)} kts</span>
                    <span>•</span>
                    <span>{compass}</span>
                    {isClimbing ? (
                      <ArrowUpRight size={11} color="var(--accent-emerald)" />
                    ) : isDescending ? (
                      <ArrowDownRight size={11} color="var(--accent-amber)" />
                    ) : (
                      <Minus size={11} color="var(--text-muted)" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Footer info */}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundColor: 'rgba(3, 7, 18, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--text-muted)',
        }}
      >
        <span>Click aircraft to track & follow</span>
        <span className="font-mono">
          {filteredAircraft.length > 150 ? `Showing 150 of ${filteredAircraft.length}` : `${filteredAircraft.length} items`}
        </span>
      </div>
    </aside>
  );
};
