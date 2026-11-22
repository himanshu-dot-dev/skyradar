import type { NormalizedAircraft, SystemStatus } from '../../../shared/types.js';
import type { AircraftQueryFilter, OpenSkyResponse } from '../types/providers.js';
import { OpenSkyAdapter } from '../adapters/openSkyAdapter.js';

export class AircraftCacheService {
  private cache: NormalizedAircraft[] = [];
  private cacheMap: Map<string, NormalizedAircraft> = new Map();
  private lastFetchTimestamp = 0;
  private readonly ttlMs = 12000; // 12 seconds cache TTL to respect OpenSky rate limits
  private isFetching = false;
  private fetchPromise: Promise<NormalizedAircraft[]> | null = null;
  private isConnected = true;

  /**
   * Retrieves active live aircraft, using in-memory cache or fetching fresh data
   */
  public async getAircraft(filter?: AircraftQueryFilter): Promise<NormalizedAircraft[]> {
    const now = Date.now();
    const isExpired = now - this.lastFetchTimestamp > this.ttlMs;

    if ((isExpired || this.cache.length === 0) && !this.isFetching) {
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

      const limit = Math.min(filter.limit || 800, 3000);
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Fetches fresh state vectors from OpenSky Network
   */
  private async fetchFromProvider(): Promise<NormalizedAircraft[]> {
    this.isFetching = true;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      const url = 'https://opensky-network.org/api/states/all';
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SkyRadar/1.0 (FlightTrackerApp; https://github.com/himanshu-dot-dev/skyradar)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
      }

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
        console.log(`[AircraftCacheService] Cache refreshed: ${normalized.length} live aircraft loaded.`);
      }

      return this.cache;
    } catch (error) {
      console.warn('[AircraftCacheService] Failed to fetch live data from OpenSky:', error);
      this.isConnected = false;
      // Retain previous cache if available
      return this.cache;
    } finally {
      this.isFetching = false;
      this.fetchPromise = null;
    }
  }

  /**
   * Retrieves single aircraft by 24-bit Mode-S Hex ID
   */
  public getById(id: string): NormalizedAircraft | null {
    return this.cacheMap.get(id.toLowerCase().trim()) || null;
  }

  /**
   * Returns current health & system status
   */
  public getStatus(): SystemStatus {
    return {
      totalAircraftCount: this.cache.length,
      liveAircraftCount: this.cache.length,
      simulatedAircraftCount: 0,
      activeProvider: 'opensky',
      lastProviderFetchTimestamp: this.lastFetchTimestamp,
      isProviderConnected: this.isConnected,
      cacheTtlSeconds: Math.round(this.ttlMs / 1000),
    };
  }
}

export const aircraftCache = new AircraftCacheService();
