/**
 * Global Aviation Metadata Enrichment
 * Maps 3-letter ICAO airline prefixes to real airline names,
 * and extracts aircraft model descriptors.
 */

export interface AirlineInfo {
  name: string;
  country: string;
  callsignName?: string;
}

export const AIRLINE_REGISTRY: Record<string, AirlineInfo> = {
  // Europe
  BAW: { name: 'British Airways', country: 'United Kingdom', callsignName: 'Speedbird' },
  DLH: { name: 'Lufthansa', country: 'Germany', callsignName: 'Lufthansa' },
  AFR: { name: 'Air France', country: 'France', callsignName: 'Airfrance' },
  KLM: { name: 'KLM Royal Dutch Airlines', country: 'Netherlands', callsignName: 'KLM' },
  IBE: { name: 'Iberia', country: 'Spain', callsignName: 'Iberia' },
  SWR: { name: 'Swiss International Air Lines', country: 'Switzerland', callsignName: 'Swiss' },
  AUA: { name: 'Austrian Airlines', country: 'Austria', callsignName: 'Austrian' },
  SAS: { name: 'Scandinavian Airlines', country: 'Sweden/Denmark/Norway', callsignName: 'Scandinavian' },
  FIN: { name: 'Finnair', country: 'Finland', callsignName: 'Finnair' },
  ITY: { name: 'ITA Airways', country: 'Italy', callsignName: 'Itarrow' },
  TAP: { name: 'TAP Air Portugal', country: 'Portugal', callsignName: 'Air Portugal' },
  EZY: { name: 'easyJet', country: 'United Kingdom', callsignName: 'Easy' },
  EJU: { name: 'easyJet Europe', country: 'Austria', callsignName: 'Alpine' },
  RYR: { name: 'Ryanair', country: 'Ireland', callsignName: 'Ryanair' },
  WZZ: { name: 'Wizz Air', country: 'Hungary', callsignName: 'Wizz Air' },
  VIR: { name: 'Virgin Atlantic', country: 'United Kingdom', callsignName: 'Virgin' },
  THY: { name: 'Turkish Airlines', country: 'Turkey', callsignName: 'Turkair' },

  // Americas
  AAL: { name: 'American Airlines', country: 'United States', callsignName: 'American' },
  DAL: { name: 'Delta Air Lines', country: 'United States', callsignName: 'Delta' },
  UAL: { name: 'United Airlines', country: 'United States', callsignName: 'United' },
  SWA: { name: 'Southwest Airlines', country: 'United States', callsignName: 'Southwest' },
  JBU: { name: 'JetBlue Airways', country: 'United States', callsignName: 'JetBlue' },
  ASA: { name: 'Alaska Airlines', country: 'United States', callsignName: 'Alaska' },
  ACA: { name: 'Air Canada', country: 'Canada', callsignName: 'Air Canada' },
  AMX: { name: 'Aeromexico', country: 'Mexico', callsignName: 'Aeromexico' },
  LAN: { name: 'LATAM Airlines', country: 'Chile', callsignName: 'Lan' },
  GLO: { name: 'Gol Transportes Aéreos', country: 'Brazil', callsignName: 'Gol' },

  // Middle East & Africa
  UAE: { name: 'Emirates', country: 'United Arab Emirates', callsignName: 'Emirates' },
  ETD: { name: 'Etihad Airways', country: 'United Arab Emirates', callsignName: 'Etihad' },
  QTR: { name: 'Qatar Airways', country: 'Qatar', callsignName: 'Qatari' },
  SVA: { name: 'Saudia', country: 'Saudi Arabia', callsignName: 'Saudia' },
  MSR: { name: 'EgyptAir', country: 'Egypt', callsignName: 'Egyptair' },
  ETH: { name: 'Ethiopian Airlines', country: 'Ethiopia', callsignName: 'Ethiopian' },
  SAA: { name: 'South African Airways', country: 'South Africa', callsignName: 'Springbok' },

  // Asia & Oceania
  SIA: { name: 'Singapore Airlines', country: 'Singapore', callsignName: 'Singapore' },
  ANA: { name: 'All Nippon Airways', country: 'Japan', callsignName: 'All Nippon' },
  JAL: { name: 'Japan Airlines', country: 'Japan', callsignName: 'Japanair' },
  KAL: { name: 'Korean Air', country: 'South Korea', callsignName: 'Koreanair' },
  AAR: { name: 'Asiana Airlines', country: 'South Korea', callsignName: 'Asiana' },
  CPA: { name: 'Cathay Pacific', country: 'Hong Kong', callsignName: 'Cathay' },
  CCA: { name: 'Air China', country: 'China', callsignName: 'Air China' },
  CSN: { name: 'China Southern Airlines', country: 'China', callsignName: 'China Southern' },
  CES: { name: 'China Eastern Airlines', country: 'China', callsignName: 'China Eastern' },
  AIC: { name: 'Air India', country: 'India', callsignName: 'Airindia' },
  IGO: { name: 'IndiGo', country: 'India', callsignName: 'Ifly' },
  THA: { name: 'Thai Airways', country: 'Thailand', callsignName: 'Thai' },
  MAS: { name: 'Malaysia Airlines', country: 'Malaysia', callsignName: 'Malaysian' },
  QFA: { name: 'Qantas', country: 'Australia', callsignName: 'Qantas' },
  ANZ: { name: 'Air New Zealand', country: 'New Zealand', callsignName: 'New Zealand' },
};

/**
 * Enriches callsign with airline and operator details
 */
export function enrichAirline(callsign: string | null): { operator: string | null; country: string | null } {
  if (!callsign) return { operator: null, country: null };

  const trimmed = callsign.trim().toUpperCase();
  const prefix = trimmed.substring(0, 3);

  const matched = AIRLINE_REGISTRY[prefix];
  if (matched) {
    return {
      operator: matched.name,
      country: matched.country,
    };
  }

  return { operator: null, country: null };
}
