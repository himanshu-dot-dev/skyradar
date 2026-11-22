import type { NormalizedAircraft } from '@shared/types';
import {
  calculateBearingDegrees,
  calculateGreatCircleDistanceKm,
  interpolateGreatCircle,
  type LatLon,
} from '../utils/geoMath';

interface RouteDefinition {
  originCode: string;
  originCity: string;
  originPos: LatLon;
  destCode: string;
  destCity: string;
  destPos: LatLon;
  callsign: string;
  operator: string;
  aircraftType: string;
  modelDescription: string;
  registration: string;
  hex: string;
  cruisingAltitudeMeters: number;
  speedKnots: number;
  squawk: string;
  initialProgress: number;
}

const GLOBAL_ROUTES: RouteDefinition[] = [
  // --- North Atlantic Tracks ---
  {
    originCode: 'LHR', originCity: 'London', originPos: { latitude: 51.47, longitude: -0.45 },
    destCode: 'JFK', destCity: 'New York', destPos: { latitude: 40.64, longitude: -73.78 },
    callsign: 'BAW177', operator: 'British Airways', aircraftType: 'B77W', modelDescription: 'Boeing 777-300ER',
    registration: 'G-STBA', hex: '4005aa', cruisingAltitudeMeters: 11277, speedKnots: 490, squawk: '7412', initialProgress: 0.42
  },
  {
    originCode: 'JFK', originCity: 'New York', originPos: { latitude: 40.64, longitude: -73.78 },
    destCode: 'LHR', destCity: 'London', destPos: { latitude: 51.47, longitude: -0.45 },
    callsign: 'VIR45', operator: 'Virgin Atlantic', aircraftType: 'A35K', modelDescription: 'Airbus A350-1000',
    registration: 'G-VPRD', hex: '407519', cruisingAltitudeMeters: 11887, speedKnots: 515, squawk: '5230', initialProgress: 0.68
  },
  {
    originCode: 'CDG', originCity: 'Paris', originPos: { latitude: 49.01, longitude: 2.55 },
    destCode: 'IAD', destCity: 'Washington', destPos: { latitude: 38.95, longitude: -77.46 },
    callsign: 'AFR026', operator: 'Air France', aircraftType: 'B789', modelDescription: 'Boeing 787-9 Dreamliner',
    registration: 'F-HRBA', hex: '39bb40', cruisingAltitudeMeters: 10668, speedKnots: 480, squawk: '6311', initialProgress: 0.28
  },
  {
    originCode: 'FRA', originCity: 'Frankfurt', originPos: { latitude: 50.04, longitude: 8.56 },
    destCode: 'ORD', destCity: 'Chicago', destPos: { latitude: 41.97, longitude: -87.91 },
    callsign: 'DLH430', operator: 'Lufthansa', aircraftType: 'B748', modelDescription: 'Boeing 747-8 Intercontinental',
    registration: 'D-ABYA', hex: '3c1521', cruisingAltitudeMeters: 10972, speedKnots: 495, squawk: '2105', initialProgress: 0.55
  },
  {
    originCode: 'MAD', originCity: 'Madrid', originPos: { latitude: 40.48, longitude: -3.57 },
    destCode: 'MIA', destCity: 'Miami', destPos: { latitude: 25.79, longitude: -80.29 },
    callsign: 'IBE6123', operator: 'Iberia', aircraftType: 'A333', modelDescription: 'Airbus A330-300',
    registration: 'EC-MJA', hex: '34438b', cruisingAltitudeMeters: 11582, speedKnots: 475, squawk: '4420', initialProgress: 0.35
  },
  {
    originCode: 'AMS', originCity: 'Amsterdam', originPos: { latitude: 52.31, longitude: 4.76 },
    destCode: 'BOS', destCity: 'Boston', destPos: { latitude: 42.36, longitude: -71.01 },
    callsign: 'KLM617', operator: 'KLM Royal Dutch Airlines', aircraftType: 'A332', modelDescription: 'Airbus A330-200',
    registration: 'PH-AOD', hex: '484084', cruisingAltitudeMeters: 11277, speedKnots: 480, squawk: '3152', initialProgress: 0.51
  },
  {
    originCode: 'LHR', originCity: 'London', originPos: { latitude: 51.47, longitude: -0.45 },
    destCode: 'YYZ', destCity: 'Toronto', destPos: { latitude: 43.68, longitude: -79.63 },
    callsign: 'ACA857', operator: 'Air Canada', aircraftType: 'B77W', modelDescription: 'Boeing 777-300ER',
    registration: 'C-FIVQ', hex: 'c01925', cruisingAltitudeMeters: 10972, speedKnots: 485, squawk: '5521', initialProgress: 0.39
  },

  // --- Transpacific Corridors ---
  {
    originCode: 'HND', originCity: 'Tokyo', originPos: { latitude: 35.55, longitude: 139.78 },
    destCode: 'SFO', destCity: 'San Francisco', destPos: { latitude: 37.62, longitude: -122.38 },
    callsign: 'ANA108', operator: 'All Nippon Airways', aircraftType: 'B77W', modelDescription: 'Boeing 777-300ER',
    registration: 'JA795A', hex: '86e241', cruisingAltitudeMeters: 10668, speedKnots: 510, squawk: '3241', initialProgress: 0.48
  },
  {
    originCode: 'LAX', originCity: 'Los Angeles', originPos: { latitude: 33.94, longitude: -118.41 },
    destCode: 'HND', destCity: 'Tokyo', destPos: { latitude: 35.55, longitude: 139.78 },
    callsign: 'JAL061', operator: 'Japan Airlines', aircraftType: 'A35K', modelDescription: 'Airbus A350-1000',
    registration: 'JA01WJ', hex: '861a29', cruisingAltitudeMeters: 11277, speedKnots: 470, squawk: '6712', initialProgress: 0.62
  },
  {
    originCode: 'SYD', originCity: 'Sydney', originPos: { latitude: -33.94, longitude: 151.18 },
    destCode: 'LAX', destCity: 'Los Angeles', destPos: { latitude: 33.94, longitude: -118.41 },
    callsign: 'QFA011', operator: 'Qantas', aircraftType: 'A388', modelDescription: 'Airbus A380-800',
    registration: 'VH-OQA', hex: '7c4581', cruisingAltitudeMeters: 11887, speedKnots: 495, squawk: '1432', initialProgress: 0.73
  },
  {
    originCode: 'ICN', originCity: 'Seoul', originPos: { latitude: 37.47, longitude: 126.44 },
    destCode: 'SEA', destCity: 'Seattle', destPos: { latitude: 47.45, longitude: -122.31 },
    callsign: 'KAL019', operator: 'Korean Air', aircraftType: 'B789', modelDescription: 'Boeing 787-9 Dreamliner',
    registration: 'HL8081', hex: '71c261', cruisingAltitudeMeters: 11582, speedKnots: 490, squawk: '4217', initialProgress: 0.31
  },
  {
    originCode: 'HKG', originCity: 'Hong Kong', originPos: { latitude: 22.31, longitude: 113.91 },
    destCode: 'YVR', destCity: 'Vancouver', destPos: { latitude: 49.19, longitude: -123.18 },
    callsign: 'CPA888', operator: 'Cathay Pacific', aircraftType: 'B77W', modelDescription: 'Boeing 777-300ER',
    registration: 'B-KPM', hex: '7801df', cruisingAltitudeMeters: 10972, speedKnots: 505, squawk: '3601', initialProgress: 0.58
  },

  // --- Europe - Asia - Middle East ---
  {
    originCode: 'LHR', originCity: 'London', originPos: { latitude: 51.47, longitude: -0.45 },
    destCode: 'SIN', destCity: 'Singapore', destPos: { latitude: 1.36, longitude: 103.99 },
    callsign: 'SIA317', operator: 'Singapore Airlines', aircraftType: 'A388', modelDescription: 'Airbus A380-800',
    registration: '9V-SKZ', hex: '76ce0a', cruisingAltitudeMeters: 11887, speedKnots: 510, squawk: '7021', initialProgress: 0.58
  },
  {
    originCode: 'DXB', originCity: 'Dubai', originPos: { latitude: 25.25, longitude: 55.37 },
    destCode: 'LHR', destCity: 'London', destPos: { latitude: 51.47, longitude: -0.45 },
    callsign: 'UAE001', operator: 'Emirates', aircraftType: 'A388', modelDescription: 'Airbus A380-800',
    registration: 'A6-EVN', hex: '8964e5', cruisingAltitudeMeters: 12192, speedKnots: 485, squawk: '2411', initialProgress: 0.44
  },
  {
    originCode: 'DOH', originCity: 'Doha', originPos: { latitude: 25.27, longitude: 51.61 },
    destCode: 'CDG', destCity: 'Paris', destPos: { latitude: 49.01, longitude: 2.55 },
    callsign: 'QTR039', operator: 'Qatar Airways', aircraftType: 'A35K', modelDescription: 'Airbus A350-1000',
    registration: 'A7-ANA', hex: '06a201', cruisingAltitudeMeters: 11277, speedKnots: 490, squawk: '3514', initialProgress: 0.65
  },
  {
    originCode: 'FRA', originCity: 'Frankfurt', originPos: { latitude: 50.04, longitude: 8.56 },
    destCode: 'DEL', destCity: 'New Delhi', destPos: { latitude: 28.56, longitude: 77.10 },
    callsign: 'DLH760', operator: 'Lufthansa', aircraftType: 'A359', modelDescription: 'Airbus A350-900',
    registration: 'D-AIXD', hex: '3c65c4', cruisingAltitudeMeters: 10972, speedKnots: 505, squawk: '4120', initialProgress: 0.38
  },
  {
    originCode: 'DXB', originCity: 'Dubai', originPos: { latitude: 25.25, longitude: 55.37 },
    destCode: 'SYD', destCity: 'Sydney', destPos: { latitude: -33.94, longitude: 151.18 },
    callsign: 'UAE414', operator: 'Emirates', aircraftType: 'B77W', modelDescription: 'Boeing 777-300ER',
    registration: 'A6-EGO', hex: '896172', cruisingAltitudeMeters: 11277, speedKnots: 495, squawk: '5516', initialProgress: 0.82
  },
  {
    originCode: 'DEL', originCity: 'New Delhi', originPos: { latitude: 28.56, longitude: 77.10 },
    destCode: 'LHR', destCity: 'London', destPos: { latitude: 51.47, longitude: -0.45 },
    callsign: 'AIC161', operator: 'Air India', aircraftType: 'B788', modelDescription: 'Boeing 787-8 Dreamliner',
    registration: 'VT-ANQ', hex: '8008a1', cruisingAltitudeMeters: 11582, speedKnots: 485, squawk: '1254', initialProgress: 0.52
  },
  {
    originCode: 'SIN', originCity: 'Singapore', originPos: { latitude: 1.36, longitude: 103.99 },
    destCode: 'SYD', destCity: 'Sydney', destPos: { latitude: -33.94, longitude: 151.18 },
    callsign: 'SIA221', operator: 'Singapore Airlines', aircraftType: 'A359', modelDescription: 'Airbus A350-900',
    registration: '9V-SHD', hex: '76b424', cruisingAltitudeMeters: 12192, speedKnots: 480, squawk: '6102', initialProgress: 0.39
  },
  {
    originCode: 'BKK', originCity: 'Bangkok', originPos: { latitude: 13.69, longitude: 100.75 },
    destCode: 'FRA', destCity: 'Frankfurt', destPos: { latitude: 50.04, longitude: 8.56 },
    callsign: 'THA920', operator: 'Thai Airways', aircraftType: 'A359', modelDescription: 'Airbus A350-900',
    registration: 'HS-THD', hex: '8851c4', cruisingAltitudeMeters: 11277, speedKnots: 495, squawk: '3142', initialProgress: 0.71
  },

  // --- North America Transcontinental & Regional ---
  {
    originCode: 'JFK', originCity: 'New York', originPos: { latitude: 40.64, longitude: -73.78 },
    destCode: 'LAX', destCity: 'Los Angeles', destPos: { latitude: 33.94, longitude: -118.41 },
    callsign: 'DAL312', operator: 'Delta Air Lines', aircraftType: 'B763', modelDescription: 'Boeing 767-300ER',
    registration: 'N171DN', hex: 'a123f8', cruisingAltitudeMeters: 10363, speedKnots: 460, squawk: '4720', initialProgress: 0.56
  },
  {
    originCode: 'LAX', originCity: 'Los Angeles', originPos: { latitude: 33.94, longitude: -118.41 },
    destCode: 'JFK', destCity: 'New York', destPos: { latitude: 40.64, longitude: -73.78 },
    callsign: 'AAL002', operator: 'American Airlines', aircraftType: 'A321', modelDescription: 'Airbus A321T',
    registration: 'N102NN', hex: 'a012ab', cruisingAltitudeMeters: 10668, speedKnots: 510, squawk: '2214', initialProgress: 0.33
  },
  {
    originCode: 'ORD', originCity: 'Chicago', originPos: { latitude: 41.97, longitude: -87.91 },
    destCode: 'SFO', destCity: 'San Francisco', destPos: { latitude: 37.62, longitude: -122.38 },
    callsign: 'UAL485', operator: 'United Airlines', aircraftType: 'B739', modelDescription: 'Boeing 737-900ER',
    registration: 'N69818', hex: 'a94832', cruisingAltitudeMeters: 9753, speedKnots: 445, squawk: '1540', initialProgress: 0.45
  },
  {
    originCode: 'MIA', originCity: 'Miami', originPos: { latitude: 25.79, longitude: -80.29 },
    destCode: 'SEA', destCity: 'Seattle', destPos: { latitude: 47.45, longitude: -122.31 },
    callsign: 'AAL124', operator: 'American Airlines', aircraftType: 'A321', modelDescription: 'Airbus A321neo',
    registration: 'N400AN', hex: 'a4a902', cruisingAltitudeMeters: 10668, speedKnots: 455, squawk: '3310', initialProgress: 0.64
  },
  {
    originCode: 'DFW', originCity: 'Dallas', originPos: { latitude: 32.90, longitude: -97.04 },
    destCode: 'JFK', destCity: 'New York', destPos: { latitude: 40.64, longitude: -73.78 },
    callsign: 'AAL1140', operator: 'American Airlines', aircraftType: 'B738', modelDescription: 'Boeing 737-800',
    registration: 'N908AN', hex: 'ac8112', cruisingAltitudeMeters: 9448, speedKnots: 450, squawk: '2710', initialProgress: 0.72
  },

  // --- Europe Busy Airspace ---
  {
    originCode: 'LHR', originCity: 'London', originPos: { latitude: 51.47, longitude: -0.45 },
    destCode: 'FRA', destCity: 'Frankfurt', destPos: { latitude: 50.04, longitude: 8.56 },
    callsign: 'BAW904', operator: 'British Airways', aircraftType: 'A320', modelDescription: 'Airbus A320neo',
    registration: 'G-TTNA', hex: '40733a', cruisingAltitudeMeters: 8534, speedKnots: 420, squawk: '5120', initialProgress: 0.45
  },
  {
    originCode: 'AMS', originCity: 'Amsterdam', originPos: { latitude: 52.31, longitude: 4.76 },
    destCode: 'CDG', destCity: 'Paris', destPos: { latitude: 49.01, longitude: 2.55 },
    callsign: 'KLM123', operator: 'KLM Royal Dutch Airlines', aircraftType: 'E295', modelDescription: 'Embraer E195-E2',
    registration: 'PH-NXA', hex: '485b01', cruisingAltitudeMeters: 7315, speedKnots: 390, squawk: '2301', initialProgress: 0.60
  },
  {
    originCode: 'FCO', originCity: 'Rome', originPos: { latitude: 41.80, longitude: 12.24 },
    destCode: 'LHR', destCity: 'London', destPos: { latitude: 51.47, longitude: -0.45 },
    callsign: 'ITY204', operator: 'ITA Airways', aircraftType: 'A320', modelDescription: 'Airbus A320-200',
    registration: 'EI-DTB', hex: '4ca642', cruisingAltitudeMeters: 10058, speedKnots: 440, squawk: '7104', initialProgress: 0.38
  },
  {
    originCode: 'MAD', originCity: 'Madrid', originPos: { latitude: 40.48, longitude: -3.57 },
    destCode: 'FRA', destCity: 'Frankfurt', destPos: { latitude: 50.04, longitude: 8.56 },
    callsign: 'DLH1115', operator: 'Lufthansa', aircraftType: 'A321', modelDescription: 'Airbus A321-200',
    registration: 'D-AIDV', hex: '3c6595', cruisingAltitudeMeters: 10668, speedKnots: 450, squawk: '1410', initialProgress: 0.52
  },
  {
    originCode: 'ZRH', originCity: 'Zurich', originPos: { latitude: 47.46, longitude: 8.55 },
    destCode: 'LHR', destCity: 'London', destPos: { latitude: 51.47, longitude: -0.45 },
    callsign: 'SWR316', operator: 'Swiss International Air Lines', aircraftType: 'BCS3', modelDescription: 'Airbus A220-300',
    registration: 'HB-JCA', hex: '4b1a01', cruisingAltitudeMeters: 9753, speedKnots: 430, squawk: '4502', initialProgress: 0.68
  },

  // --- Asia Domestic & Regional ---
  {
    originCode: 'HND', originCity: 'Tokyo', originPos: { latitude: 35.55, longitude: 139.78 },
    destCode: 'FUK', destCity: 'Fukuoka', destPos: { latitude: 33.58, longitude: 130.45 },
    callsign: 'JAL315', operator: 'Japan Airlines', aircraftType: 'A359', modelDescription: 'Airbus A350-900',
    registration: 'JA08XJ', hex: '861a08', cruisingAltitudeMeters: 10972, speedKnots: 460, squawk: '1201', initialProgress: 0.44
  },
  {
    originCode: 'DEL', originCity: 'New Delhi', originPos: { latitude: 28.56, longitude: 77.10 },
    destCode: 'BOM', destCity: 'Mumbai', destPos: { latitude: 19.09, longitude: 72.87 },
    callsign: 'IGO2132', operator: 'IndiGo', aircraftType: 'A321', modelDescription: 'Airbus A321neo',
    registration: 'VT-IBB', hex: '800cd2', cruisingAltitudeMeters: 9753, speedKnots: 440, squawk: '3210', initialProgress: 0.55
  },
  {
    originCode: 'SIN', originCity: 'Singapore', originPos: { latitude: 1.36, longitude: 103.99 },
    destCode: 'CGK', destCity: 'Jakarta', destPos: { latitude: -6.13, longitude: 106.66 },
    callsign: 'GIA821', operator: 'Garuda Indonesia', aircraftType: 'B738', modelDescription: 'Boeing 737-800',
    registration: 'PK-GMC', hex: '8a0112', cruisingAltitudeMeters: 8534, speedKnots: 410, squawk: '4201', initialProgress: 0.63
  },

  // --- South America & Africa ---
  {
    originCode: 'GRU', originCity: 'Sao Paulo', originPos: { latitude: -23.43, longitude: -46.47 },
    destCode: 'EZE', destCity: 'Buenos Aires', destPos: { latitude: -34.82, longitude: -58.53 },
    callsign: 'TAM8001', operator: 'LATAM Brasil', aircraftType: 'A321', modelDescription: 'Airbus A321-200',
    registration: 'PR-XPB', hex: 'e48a12', cruisingAltitudeMeters: 9753, speedKnots: 435, squawk: '3412', initialProgress: 0.51
  },
  {
    originCode: 'JNB', originCity: 'Johannesburg', originPos: { latitude: -26.13, longitude: 28.24 },
    destCode: 'CPT', destCity: 'Cape Town', destPos: { latitude: -33.96, longitude: 18.60 },
    callsign: 'SAA323', operator: 'South African Airways', aircraftType: 'A333', modelDescription: 'Airbus A330-300',
    registration: 'ZS-SXJ', hex: '0085a1', cruisingAltitudeMeters: 10668, speedKnots: 450, squawk: '4203', initialProgress: 0.44
  },
  {
    originCode: 'CAI', originCity: 'Cairo', originPos: { latitude: 30.12, longitude: 31.41 },
    destCode: 'DXB', destCity: 'Dubai', destPos: { latitude: 25.25, longitude: 55.37 },
    callsign: 'MSR912', operator: 'EgyptAir', aircraftType: 'B789', modelDescription: 'Boeing 787-9 Dreamliner',
    registration: 'SU-GER', hex: '01017e', cruisingAltitudeMeters: 11277, speedKnots: 470, squawk: '1615', initialProgress: 0.58
  },
];

export class SimulatedTrafficGenerator {
  private routes: Array<RouteDefinition & { currentProgress: number; totalDistanceKm: number }>;

  constructor() {
    this.routes = GLOBAL_ROUTES.map((route) => {
      const totalDistanceKm = calculateGreatCircleDistanceKm(route.originPos, route.destPos);
      return {
        ...route,
        currentProgress: route.initialProgress,
        totalDistanceKm: Math.max(totalDistanceKm, 100),
      };
    });
  }

  /**
   * Advances the simulation by delta seconds and returns normalized aircraft state
   */
  public update(deltaSeconds: number): NormalizedAircraft[] {
    const timestamp = Date.now();

    return this.routes.map((route) => {
      // Speed in km/s (1 knot = 1.852 km/h)
      const speedKmPerSec = (route.speedKnots * 1.852) / 3600;
      const progressDelta = (speedKmPerSec * deltaSeconds) / route.totalDistanceKm;

      route.currentProgress = (route.currentProgress + progressDelta) % 1.0;

      // Current position
      const currentPos = interpolateGreatCircle(route.originPos, route.destPos, route.currentProgress);

      // Future lookahead position for heading computation
      const lookaheadProgress = (route.currentProgress + 0.005) % 1.0;
      const nextPos = interpolateGreatCircle(route.originPos, route.destPos, lookaheadProgress);

      const heading = calculateBearingDegrees(currentPos, nextPos);

      // Altitude in meters
      const altitudeVariation = Math.sin(route.currentProgress * Math.PI * 4) * 25;
      const altitudeMeters = Math.max(1000, route.cruisingAltitudeMeters + altitudeVariation);
      const altitudeFeet = Math.round(altitudeMeters * 3.28084);

      return {
        id: route.hex,
        callsign: route.callsign,
        registration: route.registration,
        aircraftType: route.aircraftType,
        modelDescription: route.modelDescription,
        operator: route.operator,
        squawk: route.squawk,
        emergency: 'none',
        position: {
          latitude: Number(currentPos.latitude.toFixed(5)),
          longitude: Number(currentPos.longitude.toFixed(5)),
          altitudeMeters: Math.round(altitudeMeters),
          altitudeFeet,
          isGround: false,
        },
        movement: {
          speedKnots: route.speedKnots,
          heading: Math.round(heading),
          verticalRateFpm: Math.round(Math.cos(route.currentProgress * Math.PI * 4) * 40),
          rollAngle: 0,
        },
        route: {
          originCode: route.originCode,
          originCity: route.originCity,
          originPosition: route.originPos,
          destinationCode: route.destCode,
          destinationCity: route.destCity,
          destinationPosition: route.destPos,
          progress: Number(route.currentProgress.toFixed(4)),
        },
        lastSeenSecAgo: 0,
        lastUpdateTimestamp: timestamp,
        source: 'simulated',
        isSimulated: true,
      };
    });
  }
}
