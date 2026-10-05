// ============================================================
//  MICROSERVICE « GEO » : adresses, itinéraires, lieux connus, optimisation des tournées
//  Service HTTP indépendant (sans état, sans base de données) : on peut le déployer, le
//  redémarrer ou le multiplier sans toucher au serveur principal, qui l'appelle via
//  GEO_SERVICE_URL (server/geoGateway.js).
//  Lancement : node services/geo/server.js   (port GEO_PORT, 8790 par défaut)
// ============================================================
import express from 'express';
import { nearbyPlaces, reverseGeocode, roadRoute, roadTable, searchPlaces, validPoint } from '../../server/geo.js';
import { bestOrder } from '../../server/tourPlanner.js';

export function createGeoService() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  const point = q => ({ lat: Number(q.lat), lng: Number(q.lng) });
  const bad = (res, error) => res.status(400).json({ error });

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'geo' }));

  app.get('/search', async (req, res) => {
    const q = String(req.query.q || '').slice(0, 120);
    if (q.trim().length < 2) return bad(res, 'Recherche trop courte');
    const near = point(req.query);
    res.json({ results: await searchPlaces(q, validPoint(near) ? near : undefined) });
  });

  app.get('/reverse', async (req, res) => {
    const p = point(req.query);
    if (!validPoint(p)) return bad(res, 'Point invalide');
    res.json(await reverseGeocode(p.lat, p.lng));
  });

  app.get('/nearby', async (req, res) => {
    const p = point(req.query);
    if (!validPoint(p)) return bad(res, 'Point invalide');
    res.json({ places: await nearbyPlaces(p.lat, p.lng, Math.min(1000, Number(req.query.r) || 350)) });
  });

  app.post('/route', async (req, res) => {
    const { from, to } = req.body || {};
    if (!validPoint(from) || !validPoint(to)) return bad(res, 'Points invalides');
    res.json({ route: await roadRoute(from, to) });
  });

  app.post('/table', async (req, res) => {
    const pts = req.body?.points;
    if (!Array.isArray(pts) || pts.length < 1 || pts.length > 60 || !pts.every(validPoint))
      return bad(res, 'Points invalides');
    res.json(await roadTable(pts));
  });

  /** Ordre de passage optimal à partir d'une matrice de distances (index 0 = départ). */
  app.post('/optimize', (req, res) => {
    const m = req.body?.matrix;
    const n = Array.isArray(m) ? m.length : 0;
    if (n < 1 || n > 61 || !m.every(r => Array.isArray(r) && r.length === n && r.every(Number.isFinite)))
      return bad(res, 'Matrice invalide');
    res.json({ order: bestOrder(m) });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.GEO_PORT) || 8790;
  createGeoService().listen(port, () => console.log(`Service geo — http://localhost:${port}`));
}
