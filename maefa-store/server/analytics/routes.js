// ============================================================
//  DONNÉES ET RECOMMANDATIONS : routes HTTP
//  POST /api/events            collecte anonyme (vue, favori, panier, demande)
//  GET  /api/reco/:productId   « Vous aimerez aussi » (modèle collaboratif, repli par contenu)
//  GET  /api/admin/analytics   rapport du pipeline (gérante)
// ============================================================
import { cached, cacheStats, forget } from '../cache.js';
import { isPaused } from '../catalog.js';
import { appendEvents, runPipeline } from './pipeline.js';

const PIPELINE_EVERY_MS = 3600e3;

export function registerAnalyticsRoutes(app, { limit, isAdmin, store, dataDir }) {
  let report = null;
  let running = null;

  const catalog = () => (store.getCatalog() ?? []).filter(p => !isPaused(p));

  async function refresh() {
    if (running) return running;
    running = (async () => {
      const known = store.getCatalog() ? new Set(store.getCatalog().map(p => p.id)) : null;
      report = await runPipeline(dataDir, { knownProducts: known });
      await forget('reco:');
      return report;
    })()
      .catch(e => console.error('Pipeline de données :', e.message))
      .finally(() => (running = null));
    return running;
  }
  setTimeout(refresh, 5000).unref();
  setInterval(refresh, PIPELINE_EVERY_MS).unref();

  app.post('/api/events', (req, res) => {
    if (!limit(`events:${req.ip}`, 600, 3600e3)) return res.status(429).json({ error: 'Trop de demandes' });
    const kept = appendEvents(dataDir, req.body?.visitor, req.body?.events);
    res.status(202).json({ kept });
  });

  /** Recommandations : voisines dans le modèle, complétées par des pièces proches par le contenu. */
  app.get('/api/reco/:productId', async (req, res) => {
    const id = String(req.params.productId).slice(0, 40);
    const k = Math.min(8, Number(req.query.k) || 4);
    const ids = await cached(`reco:${id}:${k}`, 10 * 60e3, async () => {
      const list = catalog();
      const self = list.find(p => p.id === id);
      const available = new Map(list.filter(p => p.id !== id && (p.stock > 0 || p.preorderDays)).map(p => [p.id, p]));
      const fromModel = (report?._model?.similar[id] ?? []).map(n => n.id).filter(x => available.has(x));
      const out = [...fromModel];
      if (self && out.length < k) {
        const colors = new Set((self.colors ?? []).map(c => c.name));
        const byContent = [...available.values()]
          .filter(p => !out.includes(p.id))
          .map(p => ({
            id: p.id,
            score:
              (p.category === self.category ? 2 : 0) +
              (p.subcategory && p.subcategory === self.subcategory ? 1 : 0) +
              (p.colors ?? []).filter(c => colors.has(c.name)).length * 0.5 +
              (p.isBestseller ? 0.3 : 0),
          }))
          .sort((a, b) => b.score - a.score);
        for (const p of byContent) if (out.length < k) out.push(p.id);
      }
      return { ids: out.slice(0, k), source: fromModel.length ? 'collaboratif' : 'contenu' };
    });
    res.set('Cache-Control', 'public, max-age=300');
    res.json(ids);
  });

  app.get('/api/admin/analytics', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    if (req.query.refresh === '1' || !report) await refresh();
    const { _model: _m, ...publicReport } = report ?? {};
    res.json({ report: publicReport, cache: cacheStats() });
  });
}
