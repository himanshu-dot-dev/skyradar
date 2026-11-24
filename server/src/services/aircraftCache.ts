import type { NormalizedAircraft, SystemStatus, DataSourceType } from '../../../shared/types.js';
import type { AircraftQueryFilter, OpenSkyResponse } from '../types/providers.js';
import { OpenSkyAdapter } from '../adapters/openSkyAdapter.js';
import { FR24Adapter } from '../adapters/fr24Adapter.js';

export class AircraftCacheService {
  private cache: NormalizedAircraft[] = [];
  private cacheMap: Map<string, NormalizedAircraft> = new Map();
  private lastFetchTimestamp = 0;
  private readonly ttlMs = 8000; // 8 seconds cache TTL
  private isFetching = false;
  private fetchPromise: Promise<NormalizedAircraft[]> | null = null;
  private isConnected = true;
  private activeProvider: DataSourceType = 'fr24';

  constructor() {
    // Populate initial fallback flights so server has data immediately
    this.cache = this.generateFallbackFlights();
    for (const ac of this.cache) {
      this.cacheMap.set(ac.id, ac);
    }
  }

  /**
   * Retrieves active live aircraft, using in-memory cache or fetching fresh data
   */
  public async getAircraft(filter?: AircraftQueryFilter): Promise<NormalizedAircraft[]> {
    const now = Date.now();
    const isExpired = now - this.lastFetchTimestamp > this.ttlMs;

    if (isExpired && !this.isFetching) {
      this.fetchPromise = this.fetchFromProvider();
    }

    if (this.fetchPromise) {
      try {
        await this.fetchPromise;
      } catch (err) {
        console.error('[AircraftCacheService] Fetch error:', err);
      }
    }

    let results = this.cache;

    // Apply Filters if provided
    if (filter) {
      if (filter.search) {
        const query = filter.search.toLowerCase().trim();
        results = results.filter(
          (ac) =>
            (ac.callsign && ac.callsign.toLowerCase().includes(query)) ||
            ac.id.toLowerCase().includes(query) ||
            (ac.operator && ac.operator.toLowerCase().includes(query))
        );
      }

      if (filter.minAltitudeFeet !== undefined) {
        results = results.filter((ac) => ac.position.altitudeFeet >= filter.minAltitudeFeet!);
      }

      if (filter.maxAltitudeFeet !== undefined) {
        results = results.filter((ac) => ac.position.altitudeFeet <= filter.maxAltitudeFeet!);
      }

      if (filter.bbox) {
        const { lamin, lomin, lamax, lomax } = filter.bbox;
        results = results.filter(
          (ac) =>
            ac.position.latitude >= lamin &&
            ac.position.latitude <= lamax &&
            ac.position.longitude >= lomin &&
            ac.position.longitude <= lomax
        );
      }

      const limit = Math.min(filter.limit || 1200, 3000);
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Multi-Provider Failover Sequence:
   * 1. Primary: Global Live Feed (FR24 cloud gateway, ~1,500 real flights)
   * 2. Secondary: OpenSky Network API
   * 3. Fallback: Retained cache or simulated corridors
   */
  private async fetchFromProvider(): Promise<NormalizedAircraft[]> {
    this.isFetching = true;

    try {
      // --- Stage 1: Try Primary Global Live Feed ---
      try {
        const liveList = await FR24Adapter.fetchLive(1500);
        if (liveList && liveList.length > 0) {
          this.cache = liveList;
          this.cacheMap.clear();
          for (const ac of liveList) {
            this.cacheMap.set(ac.id, ac);
          }
          this.lastFetchTimestamp = Date.now();
          this.isConnected = true;
          this.activeProvider = 'fr24';
          console.log(`[AircraftCacheService] Live fleet refreshed: ${liveList.length} real aircraft loaded from primary feed.`);
          return this.cache;
        }
      } catch (primaryErr: any) {
        console.warn('[AircraftCacheService] Primary feed unavailable, failing over to OpenSky:', primaryErr?.message || primaryErr);
      }

      // --- Stage 2: Secondary Failover (OpenSky Network) ---
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const url = 'https://opensky-network.org/api/states/all';
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'SkyRadar/1.0 (FlightTrackerApp; https://github.com/himanshu-dot-dev/skyradar)',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const rawData = (await response.json()) as OpenSkyResponse;
          const normalized = OpenSkyAdapter.normalize(rawData);

          if (normalized.length > 0) {
            this.cache = normalized;
            this.cacheMap.clear();
            for (const ac of normalized) {
              this.cacheMap.set(ac.id, ac);
            }
            this.lastFetchTimestamp = Date.now();
            this.isConnected = true;
            this.activeProvider = 'opensky';
            console.log(`[AircraftCacheService] OpenSky secondary feed refreshed: ${normalized.length} live aircraft loaded.`);
            return this.cache;
          }
        } else {
          console.warn(`[AircraftCacheService] OpenSky returned HTTP ${response.status}`);
        }
      } catch (openSkyErr: any) {
        console.warn('[AircraftCacheService] OpenSky secondary failover failed:', openSkyErr?.message || openSkyErr);
      }

      // --- Stage 3: Offline / Retained Fallback ---
      this.isConnected = false;
      this.lastFetchTimestamp = Date.now() - this.ttlMs + 10000; // Retry in 10s

      // If cache is empty, ensure fallback flights exist
      if (this.cache.length === 0) {
        this.cache = this.generateFallbackFlights();
        for (const ac of this.cache) {
          this.cacheMap.set(ac.id, ac);
        }
        this.activeProvider = 'simulated';
      }

      return this.cache;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Generates initial global flights to ensure zero-downtime availability
   */
  private generateFallbackFlights(): NormalizedAircraft[] {
    const flights: NormalizedAircraft[] = [];
    const hubs = [
      { name: 'London', lat: 51.47, lon: -0.45, code: 'LHR' },
      { name: 'New York', lat: 40.64, lon: -73.78, code: 'JFK' },
      { name: 'Paris', lat: 49.01, lon: 2.55, code: 'CDG' },
      { name: 'Frankfurt', lat: 50.04, lon: 8.56, code: 'FRA' },
      { name: 'Dubai', lat: 25.25, lon: 55.36, code: 'DXB' },
      { name: 'Tokyo', lat: 35.55, lon: 139.78, code: 'HND' },
      { name: 'Singapore', lat: 1.36, lon: 103.99, code: 'SIN' },
      { name: 'Sydney', lat: -33.94, lon: 151.18, code: 'SYD' },
      { name: 'Delhi', lat: 28.56, lon: 77.1, code: 'DEL' },
      { name: 'Los Angeles', lat: 33.94, lon: -118.41, code: 'LAX' },
    ];

    const airlines = [
      { prefix: 'BAW', op: 'British Airways', type: 'B77W' },
      { prefix: 'AFR', op: 'Air France', type: 'A359' },
      { prefix: 'DLH', op: 'Lufthansa', type: 'A35K' },
      { prefix: 'UAE', op: 'Emirates', type: 'A388' },
      { prefix: 'SIA', op: 'Singapore Airlines', type: 'A359' },
      { prefix: 'QFA', op: 'Qantas', type: 'B789' },
      { prefix: 'AIC', op: 'Air India', type: 'B788' },
      { prefix: 'UAL', op: 'United Airlines', type: 'B772' },
      { prefix: 'DAL', op: 'Delta Air Lines', type: 'A339' },
      { prefix: 'ANA', op: 'All Nippon Airways', type: 'B789' },
    ];

    let count = 0;
    for (let i = 0; i < hubs.length; i++) {
      for (let j = 0; j < hubs.length; j++) {
        if (i === j) continue;
        const origin = hubs[i];
        const dest = hubs[j];
        const airline = airlines[(i + j) % airlines.length];
        const flightNum = 100 + ((i * 10 + j * 7) % 890);
        const callsign = `${airline.prefix}${flightNum}`;
        const hex = (4000000 + i * 100000 + j * 1000 + count).toString(16);

        const progress = 0.15 + (((i * 13 + j * 17) % 70) / 100);
        const lat = origin.lat + (dest.lat - origin.lat) * progress;
        const lon = origin.lon + (dest.lon - origin.lon) * progress;
        const altFt = 30000 + ((i * 1000 + j * 500) % 11000);
        const altM = altFt / 3.28084;
        const speedKts = 460 + ((i * 7 + j * 11) % 50);

        const dLon = dest.lon - origin.lon;
        const dLat = dest.lat - origin.lat;
        const heading = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;

        flights.push({
          id: hex,
          callsign,
          registration: `N${hex.slice(0, 4).toUpperCase()}`,
          aircraftType: airline.type,
          modelDescription: `${airline.type} Commercial Airliner`,
          operator: airline.op,
          squawk: '2000',
          emergency: 'none',
          position: {
            latitude: lat,
            longitude: lon,
            altitudeMeters: altM,
            altitudeFeet: altFt,
            isGround: false,
          },
          movement: {
            speedKnots: speedKts,
            heading: Math.round(heading),
            verticalRateFpm: 0,
            rollAngle: 0,
          },
          lastSeenSecAgo: 1,
          lastUpdateTimestamp: Date.now(),
          source: 'simulated',
          isSimulated: true,
        });

        count++;
        if (count >= 100) break;
      }
      if (count >= 100) break;
    }

    return flights;
  }

  /**
   * Retrieves single aircraft by 24-bit Mode-S Hex ID
   */
  public getById(id: string): NormalizedAircraft | null {
    return this.cacheMap.get(id.toLowerCase().trim()) || null;
  }

  /**
   * Returns health status of the cache service
   */
  public getStatus(): SystemStatus {
    return {
      totalAircraftCount: this.cache.length,
      liveAircraftCount: this.cache.filter((a) => !a.isSimulated).length,
      simulatedAircraftCount: this.cache.filter((a) => a.isSimulated).length,
      activeProvider: this.activeProvider,
      lastProviderFetchTimestamp: this.lastFetchTimestamp,
      isProviderConnected: this.isConnected,
      cacheTtlSeconds: Math.round(this.ttlMs / 1000),
    };
  }
}

export const aircraftCache = new AircraftCacheService();
