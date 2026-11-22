export interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | number[] | null)[][] | null;
}

export interface AircraftQueryFilter {
  limit?: number;
  minAltitudeFeet?: number;
  maxAltitudeFeet?: number;
  minSpeedKnots?: number;
  search?: string;
  bbox?: {
    lamin: number;
    lomin: number;
    lamax: number;
    lomax: number;
  };
}
