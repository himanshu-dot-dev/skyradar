/**
 * Geodesic & Great-Circle Navigation Mathematics for Aircraft Trajectories
 */

export interface LatLon {
  latitude: number;
  longitude: number;
}

const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates great-circle distance between two points in kilometers (Haversine)
 */
export function calculateGreatCircleDistanceKm(p1: LatLon, p2: LatLon): number {
  const lat1 = p1.latitude * TO_RAD;
  const lon1 = p1.longitude * TO_RAD;
  const lat2 = p2.latitude * TO_RAD;
  const lon2 = p2.longitude * TO_RAD;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates true initial bearing (forward azimuth) from p1 to p2 in degrees [0, 360)
 */
export function calculateBearingDegrees(p1: LatLon, p2: LatLon): number {
  const lat1 = p1.latitude * TO_RAD;
  const lon1 = p1.longitude * TO_RAD;
  const lat2 = p2.latitude * TO_RAD;
  const lon2 = p2.longitude * TO_RAD;

  const dLon = lon2 - lon1;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * TO_DEG;
  return (bearing + 360) % 360;
}

/**
 * Computes an intermediate point along the great circle between p1 and p2
 * fraction f: 0 = p1, 1 = p2
 */
export function interpolateGreatCircle(p1: LatLon, p2: LatLon, f: number): LatLon {
  const lat1 = p1.latitude * TO_RAD;
  const lon1 = p1.longitude * TO_RAD;
  const lat2 = p2.latitude * TO_RAD;
  const lon2 = p2.longitude * TO_RAD;

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat2 - lat1) / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
    )
  );

  if (d < 1e-6) {
    return { latitude: p1.latitude, longitude: p1.longitude };
  }

  const a = Math.sin((1 - f) * d) / Math.sin(d);
  const b = Math.sin(f * d) / Math.sin(d);

  const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
  const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);

  return {
    latitude: lat * TO_DEG,
    longitude: ((lon * TO_DEG + 540) % 360) - 180,
  };
}

/**
 * Formats heading into standard 16-point cardinal compass text (e.g. 270 -> 'W')
 */
export function headingToCompass(heading: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(((heading % 360) / 22.5)) % 16;
  return directions[index];
}

/**
 * Formats altitude in feet and meters
 */
export function formatAltitude(meters: number): { feetText: string; metersText: string; flightLevel: string } {
  const feet = Math.round(meters * 3.28084);
  const flNumber = Math.round(feet / 100);
  const flightLevel = feet >= 10000 ? `FL${flNumber.toString().padStart(3, '0')}` : `${feet.toLocaleString()} ft`;
  return {
    feetText: `${feet.toLocaleString()} ft`,
    metersText: `${Math.round(meters).toLocaleString()} m`,
    flightLevel,
  };
}
