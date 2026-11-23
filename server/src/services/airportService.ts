import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AirportRecord {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

let airportsMap: Record<string, AirportRecord> | null = null;

function loadAirports(): Record<string, AirportRecord> {
  if (airportsMap) return airportsMap;
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.resolve(currentDir, '../data/airports.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      airportsMap = JSON.parse(raw);
    } else {
      console.warn('[AirportService] airports.json not found at:', filePath);
      airportsMap = {};
    }
  } catch (err) {
    console.warn('[AirportService] Failed to load airports.json:', err);
    airportsMap = {};
  }
  return airportsMap || {};
}

/**
 * Looks up airport metadata by 3-letter IATA code (e.g. 'JFK', 'LHR', 'HND')
 */
export function getAirport(iataCode: string | null | undefined): AirportRecord | null {
  if (!iataCode || typeof iataCode !== 'string') return null;
  const map = loadAirports();
  const code = iataCode.trim().toUpperCase();
  return map[code] || null;
}

const TO_RAD = Math.PI / 180;

/**
 * Calculates great-circle distance between two coordinates in kilometers (Haversine)
 */
export function calculateDistanceKm(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number }
): number {
  const lat1 = p1.lat * TO_RAD;
  const lon1 = p1.lon * TO_RAD;
  const lat2 = p2.lat * TO_RAD;
  const lon2 = p2.lon * TO_RAD;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371.0 * c;
}

/**
 * Calculates estimated flight progress (0.01 to 0.99) between origin and destination
 */
export function calculateFlightProgress(
  origin: { lat: number; lon: number },
  dest: { lat: number; lon: number },
  current: { latitude: number; longitude: number }
): number {
  const totalDist = calculateDistanceKm(origin, dest);
  if (totalDist <= 1) return 0.5;

  const currentDist = calculateDistanceKm(origin, { lat: current.latitude, lon: current.longitude });
  const remainingDist = calculateDistanceKm({ lat: current.latitude, lon: current.longitude }, dest);

  // Projection ratio along the path
  const progress = currentDist / (currentDist + remainingDist);
  return Math.max(0.01, Math.min(0.99, Number(progress.toFixed(4))));
}
