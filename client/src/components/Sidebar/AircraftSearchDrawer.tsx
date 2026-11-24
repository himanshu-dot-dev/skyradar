import React, { useMemo } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  Plane,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { useAircraftStore, matchesFilters } from '../../store/aircraftStore';
import { formatAltitude } from '../../utils/geoMath';
import type { CesiumGlobeHandle } from '../CesiumGlobe/CesiumGlobe';
import type { NormalizedAircraft } from '@shared/types';

interface AircraftSearchDrawerProps {
  globeHandle: CesiumGlobeHandle | null;
}

export const AircraftSearchDrawer: React.FC<AircraftSearchDrawerProps> = ({ globeHandle }) => {
  const isDrawerOpen = useAircraftStore((s) => s.isDrawerOpen);
  const setDrawerOpen = useAircraftStore((s) => s.setDrawerOpen);
  const toggleDrawer = useAircraftStore((s) => s.toggleDrawer);
  const aircraftList = useAircraftStore((s) => s.aircraftList);
  const totalCount = useAircraftStore((s) => s.totalCount);
  const selectedAircraftId = useAircraftStore((s) => s.selectedAircraftId);
  const selectedAircraft = useAircraftStore((s) => s.selectedAircraft);
  const selectAircraft = useAircraftStore((s) => s.selectAircraft);

  const filters = useAircraftStore((s) => s.filters);
  const setSearchQuery = useAircraftStore((s) => s.setSearchQuery);
  const setFilters = useAircraftStore((s) => s.setFilters);
  const resetFilters = useAircraftStore((s) => s.resetFilters);

  // Compute filtered aircraft list
  const filteredAircraft = useMemo(() => {
    return aircraftList.filter((ac) => matchesFilters(ac, filters));
  }, [aircraftList, filters]);

  const handleSelectAircraft = (ac: NormalizedAircraft) => {
    selectAircraft(ac.id);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setDrawerOpen(false);
    }
    if (globeHandle) {
      globeHandle.flyToHub(
        ac.position.latitude,
        ac.position.longitude,
        Math.max(250000, ac.position.altitudeMeters * 15)
      );
    }
  };

  return (
    <>
      {/* Mobile Floating Thumb Trigger Button (Hidden when inspector or drawer is open) */}
      {!isDrawerOpen && !selectedAircraft && (
        <button
          className="mobile-flight-btn font-mono"
          onClick={() => setDrawerOpen(true)}
          title="Open Flight Directory"
        >
          <Plane size={14} color="var(--accent-blue)" />
          <span>{totalCount > 0 ? `${totalCount.toLocaleString()} FLIGHTS` : 'FLIGHTS'}</span>
        </button>
      )}

      <aside className={`sidebar-panel ${!isDrawerOpen ? 'collapsed' : ''}`}>
      {/* 1. Collapsed 48px Rail View */}
      {!isDrawerOpen ? (
        <div className="sidebar-rail-content">
          <button
            className="rail-icon-btn"
            title="Open Flight Directory"
            onClick={() => setDrawerOpen(true)}
          >
            <Search size={15} />
          </button>
        </div>
      ) : (
        /* 2. Expanded 320px Directory View */
        <div className="sidebar-content">
          {/* Top Control Bar */}
          <div className="sidebar-top">
            <div className="sidebar-title-row">
              <span className="sidebar-title">Flight Directory</span>
              <button
                className="collapse-btn"
                title="Collapse Directory"
                onClick={toggleDrawer}
              >
                <ChevronLeft size={15} />
              </button>
            </div>

            {/* Integrated Search Input */}
            <div className="search-box">
              <Search size={12} />
              <input
                type="text"
                placeholder="Search callsign, hex, type..."
                value={filters.searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {filters.searchQuery && (
                <button
                  className="clear-btn"
                  title="Clear search"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Segmented Filter Tabs */}
            <div className="filter-tabs">
              <button
                className={`filter-btn ${
                  filters.altitudePreset === 'all' && filters.verticalProfile === 'all' && !filters.emergencyOnly ? 'active' : ''
                }`}
                onClick={() => {
                  setFilters({ altitudePreset: 'all', verticalProfile: 'all', emergencyOnly: false });
                }}
              >
                All ({filteredAircraft.length})
              </button>
              <button
                className={`filter-btn ${filters.altitudePreset === 'high' ? 'active' : ''}`}
                onClick={() => {
                  setFilters({
                    altitudePreset: filters.altitudePreset === 'high' ? 'all' : 'high',
                  });
                }}
              >
                &gt;FL360
              </button>
              <button
                className={`filter-btn ${filters.verticalProfile === 'climbing' ? 'active' : ''}`}
                onClick={() => {
                  setFilters({
                    verticalProfile: filters.verticalProfile === 'climbing' ? 'all' : 'climbing',
                  });
                }}
              >
                Climb
              </button>
              <button
                className={`filter-btn ${filters.emergencyOnly ? 'active' : ''}`}
                style={{
                  color: filters.emergencyOnly ? 'var(--accent-red)' : undefined,
                  borderColor: filters.emergencyOnly ? 'rgba(184, 60, 72, 0.4)' : undefined,
                }}
                onClick={() => {
                  setFilters({ emergencyOnly: !filters.emergencyOnly });
                }}
              >
                7700
              </button>
            </div>
          </div>

          {/* High-Density Flight List */}
          <div className="flight-list">
            {filteredAircraft.length === 0 ? (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--text-muted)',
                }}
              >
                <Plane size={24} style={{ opacity: 0.4 }} />
                <div style={{ fontSize: 12, color: 'var(--text-medium)', fontWeight: 600 }}>
                  No Flights Found
                </div>
                <div style={{ fontSize: 11, maxWidth: 200, lineHeight: 1.4 }}>
                  No active flights match the current query or filter criteria.
                </div>
                <button
                  className="filter-btn active"
                  style={{ padding: '4px 12px', marginTop: 4 }}
                  onClick={resetFilters}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredAircraft.slice(0, 150).map((ac) => {
                const isSelected = ac.id === selectedAircraftId;
                const altInfo = formatAltitude(ac.position.altitudeMeters);
                const isClimbing = ac.movement.verticalRateFpm > 250;
                const isDescending = ac.movement.verticalRateFpm < -250;

                return (
                  <div
                    key={ac.id}
                    className={`flight-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectAircraft(ac)}
                  >
                    {/* Left Column: Ident & Route */}
                    <div className="flight-col-info">
                      <div className="flight-callsign-bar">
                        <span className="callsign-text font-mono">
                          {ac.callsign || ac.id.toUpperCase()}
                        </span>
                        {ac.aircraftType && (
                          <span className="type-text font-mono">{ac.aircraftType}</span>
                        )}
                        {ac.squawk === '7700' && (
                          <span
                            style={{
                              backgroundColor: 'rgba(184, 60, 72, 0.2)',
                              color: 'var(--accent-red)',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 3px',
                              borderRadius: 2,
                            }}
                          >
                            7700
                          </span>
                        )}
                      </div>

                      <div className="operator-text">
                        {ac.operator || (ac.isSimulated ? 'Corridor Flight' : 'En-route')}
                      </div>

                      {ac.route ? (
                        <div className="route-text font-mono">
                          {ac.route.originCode} ──✈── {ac.route.destinationCode}
                        </div>
                      ) : null}
                    </div>

                    {/* Right Column: FL & Ground Speed */}
                    <div className="flight-col-metrics">
                      <div className="fl-pill font-mono">{altInfo.flightLevel}</div>
                      <div className="speed-text font-mono">
                        <span>{Math.round(ac.movement.speedKnots)} kts</span>
                        {isClimbing ? (
                          <ArrowUpRight size={10} color="var(--accent-green)" />
                        ) : isDescending ? (
                          <ArrowDownRight size={10} color="var(--accent-amber)" />
                        ) : (
                          <Minus size={10} color="var(--text-muted)" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
    </>
  );
};
