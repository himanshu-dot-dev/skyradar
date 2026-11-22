/**
 * Unified Aircraft Telemetry & Position Schema for SkyRadar
 */

export type EmergencyStatus =
  | 'none'
  | 'general'
  | 'lifeguard'
  | 'minfuel'
  | 'unlawful'
  | 'downed'
  | 'reserved';

export type DataSourceType =
  | 'airplanes.live'
  | 'adsb.lol'
  | 'opensky'
  | 'flyitalyadsb'
  | 'simulated';

export interface AircraftPosition {
  latitude: number; // Decimal degrees [-90, 90]
  longitude: number; // Decimal degrees [-180, 180]
  altitudeMeters: number; // Altitude in meters (true / geodetic)
  altitudeFeet: number; // Standard aviation altitude in feet
  isGround: boolean; // True if aircraft is on runway / ground
}

export interface AircraftMovement {
  speedKnots: number; // Ground speed in knots
  heading: number; // Track over ground in degrees [0, 360)
  verticalRateFpm: number; // Climb / descent rate in ft/min
  rollAngle?: number | null; // Roll angle in degrees if available
}

export interface FlightRouteInfo {
  originCode: string;
  originCity: string;
  originPosition: { latitude: number; longitude: number };
  destinationCode: string;
  destinationCity: string;
  destinationPosition: { latitude: number; longitude: number };
  progress: number; // 0.0 to 1.0
}

export interface NormalizedAircraft {
  id: string; // Mode-S 24-bit hex code (e.g., "4ca123")
  callsign: string | null; // Flight callsign (e.g., "BAW123")
  registration: string | null; // Tail registration (e.g., "G-XWBA")
  aircraftType: string | null; // ICAO type code (e.g., "A35K", "B789")
  modelDescription?: string | null; // e.g., "Airbus A350-1041"
  operator?: string | null; // e.g., "British Airways"
  squawk: string | null; // 4-digit transponder code
  emergency: EmergencyStatus;
  position: AircraftPosition;
  movement: AircraftMovement;
  route?: FlightRouteInfo | null; // Origin, destination & great-circle route
  lastSeenSecAgo: number; // Seconds since last message received
  lastUpdateTimestamp: number; // Unix epoch ms
  source: DataSourceType;
  isSimulated: boolean;
}

export interface AircraftPositionHistoryPoint {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  timestamp: number;
}

export interface AircraftFilterOptions {
  searchQuery: string; // Filter by callsign, reg, or hex
  minAltitudeFeet: number;
  maxAltitudeFeet: number;
  minSpeedKnots: number;
  maxSpeedKnots: number;
  aircraftTypeCategory?: string;
  showSimulated: boolean;
  showLive: boolean;
  emergencyOnly: boolean;
}

export interface SystemStatus {
  totalAircraftCount: number;
  liveAircraftCount: number;
  simulatedAircraftCount: number;
  activeProvider: DataSourceType | 'hybrid';
  lastProviderFetchTimestamp: number;
  isProviderConnected: boolean;
  cacheTtlSeconds: number;
}
