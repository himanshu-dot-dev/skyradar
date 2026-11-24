/**
 * Aircraft Classification & Livery Engine
 * Maps real ADS-B ICAO aircraft types and callsign/airline prefixes
 * to physical airframe archetypes, proportional scales, and authentic liveries.
 */

export type AircraftCategory =
  | 'super'       // 4-engine Super Heavy (A380, B747, A340, AN-124)
  | 'heavy'       // Twin-aisle Widebody (B777, B787, A350, A330, B767)
  | 'narrow'      // Single-aisle Commercial Airliner (A320, B737, A220, C919)
  | 'regional'    // Regional Jet / BizJet with rear engines & T-tail (CRJ, ERJ, Gulfstream, Citation)
  | 'turboprop'   // Twin Turboprop Commuter (ATR-72, Dash 8, King Air)
  | 'light'       // Light Single-Engine Propeller GA (Cessna 172, Piper, Cirrus)
  | 'heli';       // Rotorcraft / Helicopter

export interface AircraftCategoryDetails {
  category: AircraftCategory;
  label: string;
  shortTag: string;
  engineCount: number;
  engineType: 'jet' | 'turboprop' | 'piston' | 'rotor';
  baseScale: number;
  selectedScale: number;
}

export interface AirlineLivery {
  name: string;
  tailColor: string;       // Primary vertical stabilizer color
  accentColor: string;     // Wingtip / logo highlight
  secondaryColor?: string; // Optional trim / speedmark
}

// 1. ICAO Aircraft Type Code Registry
const SUPER_HEAVIES = new Set([
  'A388', 'A380', 'B744', 'B748', 'B741', 'B742', 'B743', 'B74R', 'B74S',
  'A342', 'A343', 'A345', 'A346', 'A124', 'A225', 'IL76', 'IL96', 'C5', 'C17'
]);

const WIDEBODY_HEAVIES = new Set([
  'B772', 'B773', 'B77W', 'B77L', 'B778', 'B779', 'B77X',
  'B788', 'B789', 'B78X', 'B781',
  'A359', 'A35K', 'A350',
  'A332', 'A333', 'A338', 'A339', 'A330',
  'B762', 'B763', 'B764',
  'MD11', 'DC10', 'A306', 'A310'
]);

const REGIONAL_TTAILS = new Set([
  // Bombardier / Canadair Regional Jets
  'CRJ1', 'CRJ2', 'CRJ7', 'CRJ9', 'CRJX', 'CL60',
  // Embraer ERJ
  'E135', 'E145', 'E140',
  // Gulfstream Business Jets
  'GLF4', 'GLF5', 'GLF6', 'GLEX', 'GL5T', 'GL6T', 'GL7T',
  // Cessna Citation Jets
  'C500', 'C510', 'C525', 'C550', 'C560', 'C56X', 'C680', 'C700', 'C750',
  // Dassault Falcon
  'FA50', 'FA7X', 'FA8X', 'F2TH', 'F900',
  // Learjet & Hawker
  'LJ35', 'LJ45', 'LJ60', 'LJ75', 'H25B'
]);

const TURBOPROPS = new Set([
  // ATR
  'AT43', 'AT45', 'AT72', 'AT75', 'AT76',
  // Dash 8
  'DH8A', 'DH8B', 'DH8C', 'DH8D', 'DHC8',
  // Beechcraft / King Air
  'BE20', 'BE9L', 'B350', 'B190',
  // Saab & Others
  'SF34', 'SB20', 'SW4', 'PC12', 'C208', 'D228'
]);

const LIGHT_GA = new Set([
  'C150', 'C152', 'C172', 'C182', 'C206', 'C210',
  'P28A', 'P28B', 'PA28', 'PA32', 'PA34', 'PA44',
  'SR20', 'SR22', 'DA40', 'DA42', 'DA62',
  'BE33', 'BE36', 'BE58', 'M20P', 'RV7', 'RV8'
]);

const HELICOPTERS = new Set([
  'B06', 'B407', 'B412', 'B429', 'B212',
  'EC35', 'EC45', 'H135', 'H145', 'H125', 'H160', 'AS50', 'AS55',
  'S76', 'S92', 'UH60', 'R22', 'R44', 'R66', 'A109', 'A139', 'A169'
]);

/**
 * Classifies an aircraft into one of 7 physical airframe archetypes
 */
export function getAircraftCategoryDetails(icaoType: string | null | undefined): AircraftCategoryDetails {
  const type = (icaoType || '').trim().toUpperCase();

  if (SUPER_HEAVIES.has(type)) {
    return {
      category: 'super',
      label: 'SUPER HEAVY (4x JET)',
      shortTag: 'SUPER',
      engineCount: 4,
      engineType: 'jet',
      baseScale: 0.52,
      selectedScale: 0.62,
    };
  }

  if (WIDEBODY_HEAVIES.has(type)) {
    return {
      category: 'heavy',
      label: 'WIDEBODY HEAVY',
      shortTag: 'HEAVY',
      engineCount: 2,
      engineType: 'jet',
      baseScale: 0.44,
      selectedScale: 0.54,
    };
  }

  if (REGIONAL_TTAILS.has(type)) {
    return {
      category: 'regional',
      label: 'REGIONAL T-TAIL',
      shortTag: 'REGIONAL',
      engineCount: 2,
      engineType: 'jet',
      baseScale: 0.33,
      selectedScale: 0.42,
    };
  }

  if (TURBOPROPS.has(type)) {
    return {
      category: 'turboprop',
      label: 'TWIN TURBOPROP',
      shortTag: 'PROP',
      engineCount: 2,
      engineType: 'turboprop',
      baseScale: 0.32,
      selectedScale: 0.40,
    };
  }

  if (LIGHT_GA.has(type)) {
    return {
      category: 'light',
      label: 'LIGHT GA PROP',
      shortTag: 'LIGHT',
      engineCount: 1,
      engineType: 'piston',
      baseScale: 0.25,
      selectedScale: 0.33,
    };
  }

  if (HELICOPTERS.has(type)) {
    return {
      category: 'heli',
      label: 'ROTORCRAFT',
      shortTag: 'HELI',
      engineCount: 1,
      engineType: 'rotor',
      baseScale: 0.28,
      selectedScale: 0.35,
    };
  }

  // Default: Commercial Narrowbody Airliner (A320, B737, etc.)
  return {
    category: 'narrow',
    label: 'COMMERCIAL AIRLINER',
    shortTag: 'AIRLINER',
    engineCount: 2,
    engineType: 'jet',
    baseScale: 0.38,
    selectedScale: 0.48,
  };
}

// 2. Real Airline Livery Color Registry
const AIRLINE_LIVERIES: Record<string, AirlineLivery> = {
  // United Kingdom & Western Europe
  BAW: { name: 'British Airways', tailColor: '#0b2341', accentColor: '#eb2226', secondaryColor: '#ffffff' },
  DLH: { name: 'Lufthansa', tailColor: '#001b44', accentColor: '#ffb900', secondaryColor: '#ffffff' },
  AFR: { name: 'Air France', tailColor: '#002157', accentColor: '#ed1b24', secondaryColor: '#ffffff' },
  KLM: { name: 'KLM', tailColor: '#00a1de', accentColor: '#002b49', secondaryColor: '#ffffff' },
  IBE: { name: 'Iberia', tailColor: '#c8102e', accentColor: '#f9ba00', secondaryColor: '#ffffff' },
  SWR: { name: 'Swiss', tailColor: '#d52b1e', accentColor: '#ffffff', secondaryColor: '#ffffff' },
  AUA: { name: 'Austrian', tailColor: '#d52b1e', accentColor: '#002b49', secondaryColor: '#ffffff' },
  SAS: { name: 'Scandinavian', tailColor: '#00205b', accentColor: '#c8102e', secondaryColor: '#c0c0c0' },
  FIN: { name: 'Finnair', tailColor: '#00205b', accentColor: '#ffffff', secondaryColor: '#00205b' },
  ITY: { name: 'ITA Airways', tailColor: '#004c97', accentColor: '#009246', secondaryColor: '#ce2b37' },
  TAP: { name: 'TAP Portugal', tailColor: '#00843d', accentColor: '#da291c', secondaryColor: '#ffffff' },
  EZY: { name: 'easyJet', tailColor: '#ff6600', accentColor: '#ffffff', secondaryColor: '#ff6600' },
  EJU: { name: 'easyJet Europe', tailColor: '#ff6600', accentColor: '#ffffff', secondaryColor: '#ff6600' },
  RYR: { name: 'Ryanair', tailColor: '#0d2c6c', accentColor: '#f1c40f', secondaryColor: '#ffffff' },
  WZZ: { name: 'Wizz Air', tailColor: '#c6007e', accentColor: '#002b66', secondaryColor: '#ffffff' },
  VIR: { name: 'Virgin Atlantic', tailColor: '#c8102e', accentColor: '#4f1435', secondaryColor: '#ffffff' },
  THY: { name: 'Turkish Airlines', tailColor: '#c8102e', accentColor: '#ffffff', secondaryColor: '#1e293b' },

  // Americas
  AAL: { name: 'American Airlines', tailColor: '#0078d2', accentColor: '#c8102e', secondaryColor: '#d8dfe8' },
  DAL: { name: 'Delta Air Lines', tailColor: '#003366', accentColor: '#c8102e', secondaryColor: '#ffffff' },
  UAL: { name: 'United Airlines', tailColor: '#002244', accentColor: '#005da6', secondaryColor: '#ffffff' },
  SWA: { name: 'Southwest Airlines', tailColor: '#1a4480', accentColor: '#f9ba00', secondaryColor: '#d52b1e' },
  JBU: { name: 'JetBlue', tailColor: '#00205b', accentColor: '#0095c8', secondaryColor: '#ffffff' },
  ASA: { name: 'Alaska Airlines', tailColor: '#01426a', accentColor: '#00a3e0', secondaryColor: '#00857c' },
  ACA: { name: 'Air Canada', tailColor: '#c8102e', accentColor: '#000000', secondaryColor: '#ffffff' },
  AMX: { name: 'Aeromexico', tailColor: '#002244', accentColor: '#c8102e', secondaryColor: '#ffffff' },
  LAN: { name: 'LATAM', tailColor: '#001a49', accentColor: '#e31b23', secondaryColor: '#ffffff' },
  GLO: { name: 'Gol', tailColor: '#ff6600', accentColor: '#808080', secondaryColor: '#ffffff' },

  // Middle East & Africa
  UAE: { name: 'Emirates', tailColor: '#d71921', accentColor: '#00732f', secondaryColor: '#c5a059' },
  ETD: { name: 'Etihad', tailColor: '#9c824a', accentColor: '#786134', secondaryColor: '#ffffff' },
  QTR: { name: 'Qatar Airways', tailColor: '#5c0632', accentColor: '#c2a265', secondaryColor: '#ffffff' },
  SVA: { name: 'Saudia', tailColor: '#006233', accentColor: '#9c824a', secondaryColor: '#ffffff' },
  MSR: { name: 'EgyptAir', tailColor: '#00205b', accentColor: '#c5a059', secondaryColor: '#ffffff' },
  ETH: { name: 'Ethiopian', tailColor: '#008542', accentColor: '#e31b23', secondaryColor: '#ffcc00' },
  SAA: { name: 'South African', tailColor: '#00205b', accentColor: '#e31b23', secondaryColor: '#ffcc00' },

  // Asia & Pacific
  SIA: { name: 'Singapore Airlines', tailColor: '#00266b', accentColor: '#dfb15b', secondaryColor: '#ffffff' },
  ANA: { name: 'All Nippon Airways', tailColor: '#003893', accentColor: '#00a0e9', secondaryColor: '#ffffff' },
  JAL: { name: 'Japan Airlines', tailColor: '#cc0000', accentColor: '#ffffff', secondaryColor: '#000000' },
  KAL: { name: 'Korean Air', tailColor: '#0064d2', accentColor: '#c8102e', secondaryColor: '#ffffff' },
  AAR: { name: 'Asiana Airlines', tailColor: '#c8102e', accentColor: '#ffb900', secondaryColor: '#4a4a4a' },
  CPA: { name: 'Cathay Pacific', tailColor: '#006564', accentColor: '#ffffff', secondaryColor: '#c8102e' },
  CCA: { name: 'Air China', tailColor: '#c8102e', accentColor: '#ffb900', secondaryColor: '#ffffff' },
  CSN: { name: 'China Southern', tailColor: '#00205b', accentColor: '#0095c8', secondaryColor: '#c8102e' },
  CES: { name: 'China Eastern', tailColor: '#00205b', accentColor: '#c8102e', secondaryColor: '#ffffff' },
  AIC: { name: 'Air India', tailColor: '#e31837', accentColor: '#f8a000', secondaryColor: '#ffffff' },
  IGO: { name: 'IndiGo', tailColor: '#1a365d', accentColor: '#2b6cb0', secondaryColor: '#ffffff' },
  THA: { name: 'Thai Airways', tailColor: '#4f1b59', accentColor: '#f9ba00', secondaryColor: '#c8102e' },
  MAS: { name: 'Malaysia Airlines', tailColor: '#00205b', accentColor: '#c8102e', secondaryColor: '#ffffff' },
  QFA: { name: 'Qantas', tailColor: '#e0001b', accentColor: '#ffffff', secondaryColor: '#c0c0c0' },
  ANZ: { name: 'Air New Zealand', tailColor: '#000000', accentColor: '#00b4d8', secondaryColor: '#ffffff' },
};

const DEFAULT_LIVERY: AirlineLivery = {
  name: 'Standard Civil',
  tailColor: '#5b8cb4',   // Aero steel-blue
  accentColor: '#3b688c',
  secondaryColor: '#ffffff',
};

/**
 * Resolves airline livery by callsign prefix or operator name
 */
export function getAirlineLivery(callsign?: string | null, operator?: string | null): AirlineLivery {
  if (callsign) {
    const prefix = callsign.trim().substring(0, 3).toUpperCase();
    if (AIRLINE_LIVERIES[prefix]) {
      return AIRLINE_LIVERIES[prefix];
    }
  }

  if (operator) {
    const op = operator.trim().toLowerCase();
    for (const [code, livery] of Object.entries(AIRLINE_LIVERIES)) {
      if (op.includes(livery.name.toLowerCase()) || op.includes(code.toLowerCase())) {
        return livery;
      }
    }
  }

  return DEFAULT_LIVERY;
}
