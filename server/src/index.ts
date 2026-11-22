import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { aircraftCache } from './services/aircraftCache.js';
import type { AircraftQueryFilter } from './types/providers.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'SkyRadar Live ADS-B Backend' });
});

// System Status Endpoint
app.get('/api/system/status', (_req: Request, res: Response) => {
  const status = aircraftCache.getStatus();
  res.json(status);
});

// Live Aircraft Retrieval
app.get('/api/aircraft/live', async (req: Request, res: Response) => {
  try {
    const filter: AircraftQueryFilter = {};

    if (req.query.limit) {
      filter.limit = parseInt(req.query.limit as string, 10);
    }
    if (req.query.search) {
      filter.search = req.query.search as string;
    }
    if (req.query.minAlt) {
      filter.minAltitudeFeet = parseInt(req.query.minAlt as string, 10);
    }
    if (req.query.maxAlt) {
      filter.maxAltitudeFeet = parseInt(req.query.maxAlt as string, 10);
    }

    if (req.query.lamin && req.query.lomin && req.query.lamax && req.query.lomax) {
      filter.bbox = {
        lamin: parseFloat(req.query.lamin as string),
        lomin: parseFloat(req.query.lomin as string),
        lamax: parseFloat(req.query.lamax as string),
        lomax: parseFloat(req.query.lomax as string),
      };
    }

    const aircraft = await aircraftCache.getAircraft(filter);
    res.json({
      count: aircraft.length,
      timestamp: Date.now(),
      aircraft,
    });
  } catch (err: any) {
    console.error('Error fetching live aircraft:', err);
    res.status(500).json({ error: 'Failed to retrieve live aircraft telemetry' });
  }
});

// Single Aircraft Details by Mode-S Hex ID
app.get('/api/aircraft/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const aircraft = aircraftCache.getById(id);
  if (!aircraft) {
    res.status(404).json({ error: `Aircraft ${id} not found` });
    return;
  }
  res.json(aircraft);
});

app.listen(PORT, () => {
  console.log(`📡 [SkyRadar Server] Live ADS-B backend running on port ${PORT}`);
  // Pre-warm the cache immediately
  aircraftCache.getAircraft().catch((e) => console.error('Initial cache warm-up error:', e));
});
