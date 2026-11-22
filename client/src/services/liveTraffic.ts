import type { NormalizedAircraft } from '@shared/types';

export class LiveTrafficService {
  private liveAircraft: NormalizedAircraft[] = [];
  private isFetching = false;
  private lastFetchTime = 0;

  /**
   * Fetches latest live ADS-B state vectors from SkyRadar backend proxy
   */
  public async fetchLive(): Promise<NormalizedAircraft[]> {
    if (this.isFetching) return this.liveAircraft;
    this.isFetching = true;

    try {
      const res = await fetch('/api/aircraft/live?limit=1200');
      if (!res.ok) {
        throw new Error(`Live API responded with status ${res.status}`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.aircraft) && data.aircraft.length > 0) {
        this.liveAircraft = data.aircraft;
        this.lastFetchTime = Date.now();
      }
    } catch (err) {
      console.warn('[LiveTrafficService] Error fetching live aircraft:', err);
    } finally {
      this.isFetching = false;
    }

    return this.liveAircraft;
  }

  /**
   * Smooth dead-reckoning extrapolation between API poll cycles
   */
  public updatePositions(deltaSeconds: number): NormalizedAircraft[] {
    for (const ac of this.liveAircraft) {
      if (ac.position.isGround || ac.movement.speedKnots < 30) continue;

      const speedMs = ac.movement.speedKnots * 0.514444;
      const distM = speedMs * deltaSeconds;
      const headingRad = (ac.movement.heading * Math.PI) / 180;

      // Delta degrees
      const dLat = (distM * Math.cos(headingRad)) / 111320;
      const cosLat = Math.cos((ac.position.latitude * Math.PI) / 180);
      const dLon = (distM * Math.sin(headingRad)) / (111320 * (Math.abs(cosLat) > 0.01 ? cosLat : 1.0));

      ac.position.latitude += dLat;
      ac.position.longitude += dLon;
    }

    return this.liveAircraft;
  }

  public getAircraftList(): NormalizedAircraft[] {
    return this.liveAircraft;
  }
}
