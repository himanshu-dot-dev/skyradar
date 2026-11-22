import type { NormalizedAircraft, EmergencyStatus } from '../../../shared/types.js';
import type { OpenSkyResponse } from '../types/providers.js';
import { enrichAirline } from '../services/aircraftEnricher.js';

export class OpenSkyAdapter {
  /**
   * Normalizes an OpenSky API response into unified NormalizedAircraft records
   */
  public static normalize(data: OpenSkyResponse): NormalizedAircraft[] {
    if (!data || !data.states || !Array.isArray(data.states)) {
      return [];
    }

    const nowEpoch = Date.now();
    const result: NormalizedAircraft[] = [];

    for (const state of data.states) {
      if (!Array.isArray(state) || state.length < 11) continue;

      const icao24 = (state[0] as string)?.toLowerCase().trim();
      const rawCallsign = state[1] as string | null;
      const callsign = rawCallsign ? rawCallsign.trim() : null;
      const originCountry = (state[2] as string) || null;
      const timePosition = state[3] as number | null;
      const lastContact = (state[4] as number) || Math.floor(nowEpoch / 1000);
      const longitude = state[5] as number | null;
      const latitude = state[6] as number | null;
      const baroAltitudeMeters = state[7] as number | null;
      const onGround = Boolean(state[8]);
      const velocityMs = state[9] as number | null;
      const trueTrackDeg = state[10] as number | null;
      const verticalRateMs = state[11] as number | null;
      const squawk = (state[14] as string) || null;

      // Filter out aircraft with missing coordinates
      if (longitude === null || latitude === null || isNaN(longitude) || isNaN(latitude)) {
        continue;
      }

      // Convert speed from m/s to Knots (1 m/s = 1.94384 knots)
      const speedKnots = velocityMs !== null ? Math.round(velocityMs * 1.94384) : 0;

      // Convert vertical rate from m/s to feet per minute (1 m/s = 196.85 fpm)
      const verticalRateFpm = verticalRateMs !== null ? Math.round(verticalRateMs * 196.85) : 0;

      // Altitude calculations
      const altitudeMeters = baroAltitudeMeters !== null ? Math.max(0, Math.round(baroAltitudeMeters)) : 0;
      const altitudeFeet = Math.round(altitudeMeters * 3.28084);

      // Heading (0 - 360)
      const heading = trueTrackDeg !== null ? Math.round(((trueTrackDeg % 360) + 360) % 360) : 0;

      // Determine Emergency Status from squawk code
      let emergency: EmergencyStatus = 'none';
      if (squawk === '7700') emergency = 'general';
      else if (squawk === '7600') emergency = 'unlawful';
      else if (squawk === '7500') emergency = 'unlawful';

      // Airline enrichment
      const { operator, country } = enrichAirline(callsign);

      const aircraft: NormalizedAircraft = {
        id: icao24,
        callsign,
        registration: null,
        aircraftType: null,
        modelDescription: null,
        operator: operator || (originCountry ? `Operated from ${originCountry}` : country),
        squawk,
        emergency,
        position: {
          latitude,
          longitude,
          altitudeMeters,
          altitudeFeet,
          isGround: onGround,
        },
        movement: {
          speedKnots,
          heading,
          verticalRateFpm,
          rollAngle: null,
        },
        route: null,
        lastSeenSecAgo: Math.max(0, Math.floor(nowEpoch / 1000) - (timePosition || lastContact)),
        lastUpdateTimestamp: (timePosition || lastContact) * 1000,
        source: 'opensky',
        isSimulated: false,
      };

      result.push(aircraft);
    }

    return result;
  }
}
