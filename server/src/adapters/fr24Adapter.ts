import type { NormalizedAircraft } from '../../../shared/types.js';
import { enrichAirline } from '../services/aircraftEnricher.js';
import { getAirport, calculateFlightProgress } from '../services/airportService.js';

export class FR24Adapter {
  /**
   * Fetches live worldwide aircraft telemetry from FlightRadar24 cloud feed
   */
  public static async fetchLive(limit = 1500): Promise<NormalizedAircraft[]> {
    const url = `https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=75,-75,-180,180&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=1&limit=${limit}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`FR24 feed responded with status ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalize(data);
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Normalizes raw FR24 feed data into NormalizedAircraft records
   */
  public static normalize(data: Record<string, any>): NormalizedAircraft[] {
    const results: NormalizedAircraft[] = [];
    const keys = Object.keys(data).filter(
      (k) => !['full_count', 'version', 'stats'].includes(k)
    );

    const now = Date.now();

    for (const key of keys) {
      const raw = data[key];
      if (!Array.isArray(raw) || raw.length < 14) continue;

      const hex = (raw[0] || key).toLowerCase().trim();
      const lat = typeof raw[1] === 'number' ? raw[1] : null;
      const lon = typeof raw[2] === 'number' ? raw[2] : null;

      // Coordinate validity check
      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) continue;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

      const track = typeof raw[3] === 'number' ? (raw[3] + 360) % 360 : 0;
      const altFeet = typeof raw[4] === 'number' ? Math.max(0, raw[4]) : 0;
      const altMeters = altFeet / 3.28084;
      const speedKnots = typeof raw[5] === 'number' ? Math.max(0, raw[5]) : 0;
      const squawk = raw[6] ? String(raw[6]).trim() : null;
      const aircraftType = raw[8] ? String(raw[8]).trim().toUpperCase() : null;
      const registration = raw[9] ? String(raw[9]).trim().toUpperCase() : null;
      const timestampSec = typeof raw[10] === 'number' ? raw[10] : Math.floor(now / 1000);
      const isGround = raw[14] === 1 || altFeet <= 100;
      const verticalRateFpm = typeof raw[15] === 'number' ? raw[15] : 0;
      const callsign = (raw[16] || raw[13] || hex).toString().trim().toUpperCase();

      // Check emergency squawk codes
      let emergency: NormalizedAircraft['emergency'] = 'none';
      if (squawk === '7700') emergency = 'general';
      else if (squawk === '7600') emergency = 'reserved';
      else if (squawk === '7500') emergency = 'unlawful';

      // Airline operator enrichment
      const { operator } = enrichAirline(callsign);

      // Origin and destination route enrichment (IATA codes in raw[11] and raw[12])
      const originCode = typeof raw[11] === 'string' && raw[11].trim().length === 3 ? raw[11].trim().toUpperCase() : null;
      const destCode = typeof raw[12] === 'string' && raw[12].trim().length === 3 ? raw[12].trim().toUpperCase() : null;

      let route: NormalizedAircraft['route'] = null;
      if (originCode && destCode) {
        const originAirport = getAirport(originCode);
        const destAirport = getAirport(destCode);
        if (originAirport && destAirport) {
          const progress = calculateFlightProgress(
            originAirport,
            destAirport,
            { latitude: lat, longitude: lon }
          );
          route = {
            originCode,
            originCity: originAirport.city,
            originPosition: { latitude: originAirport.lat, longitude: originAirport.lon },
            destinationCode: destCode,
            destinationCity: destAirport.city,
            destinationPosition: { latitude: destAirport.lat, longitude: destAirport.lon },
            progress,
          };
        }
      }

      const aircraft: NormalizedAircraft = {
        id: hex,
        callsign,
        registration,
        aircraftType,
        modelDescription: aircraftType ? `${aircraftType} Commercial Jet` : null,
        operator: operator || (registration ? `Civil Aviation (${registration})` : null),
        squawk,
        emergency,
        position: {
          latitude: lat,
          longitude: lon,
          altitudeMeters: Math.round(altMeters),
          altitudeFeet: Math.round(altFeet),
          isGround,
        },
        movement: {
          speedKnots: Math.round(speedKnots),
          heading: Math.round(track),
          verticalRateFpm: Math.round(verticalRateFpm),
          rollAngle: null,
        },
        route,
        lastSeenSecAgo: Math.max(0, Math.floor((now - timestampSec * 1000) / 1000)),
        lastUpdateTimestamp: now,
        source: 'fr24',
        isSimulated: false,
      };

      results.push(aircraft);
    }

    return results;
  }
}
