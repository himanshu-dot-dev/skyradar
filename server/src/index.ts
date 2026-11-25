import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { aircraftCache } from './services/aircraftCache.js';
import type { AircraftQueryFilter } from './types/providers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Production: Serve the built Vite client SPA if client/dist exists
const clientDistCandidates = [
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(__dirname, '../../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
];

const clientDistPath = clientDistCandidates.find((p) => fs.existsSync(p));

if (clientDistPath) {
  console.log(`🌐 [SkyRadar Server] Serving client static files from: ${clientDistPath}`);
  app.use(
    express.static(clientDistPath, {
      maxAge: '7d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`📡 [SkyRadar Server] Live ADS-B backend running on port ${PORT}`);
  // Pre-warm the cache immediately
  aircraftCache.getAircraft().catch((e) => console.error('Initial cache warm-up error:', e));
});

const shutdown = (signal: string) => {
  console.log(`🛑 [SkyRadar Server] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
