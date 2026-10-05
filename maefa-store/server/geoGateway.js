// ============================================================
//  PASSERELLE GÉOLOCALISATION ET TOURNÉES
//  Les routes du serveur ne parlent qu'à cette interface (injection de dépendance) :
//  - mode intégré : les fonctions de geo.js et tourPlanner.js sont appelées directement ;
//  - mode microservice (GEO_SERVICE_URL) : appels HTTP au service « geo » (services/geo/),
//    avec repli sur le mode intégré si le service ne répond pas (le site ne s'arrête jamais).
// ============================================================
import * as geo from './geo.js';
import { bestOrder } from './tourPlanner.js';

/** Implémentation dans le même processus. */
export const localGeo = {
  kind: 'intégré',
  searchPlaces: (q, near) => geo.searchPlaces(q, near),
  reverseGeocode: (lat, lng) => geo.reverseGeocode(lat, lng),
  roadRoute: (from, to) => geo.roadRoute(from, to),
  roadTable: points => geo.roadTable(points),
  nearbyPlaces: (lat, lng, radius) => geo.nearbyPlaces(lat, lng, radius),
  bestOrder: async matrix => bestOrder(matrix),
};

/** Client HTTP du microservice ; chaque appel retombe sur l'implémentation locale en cas d'échec. */
export function remoteGeo(baseUrl, { timeoutMs = 8000, log = console } = {}) {
  const base = baseUrl.replace(/\/$/, '');
  const call = async (path, init, fallback) => {
    try {
      const res = await fetch(base + path, {
        ...init,
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      log.warn?.(`Service geo indisponible (${path}) : ${e.message} → calcul local`);
      return fallback();
    }
  };
  const post = (path, body, fallback) => call(path, { method: 'POST', body: JSON.stringify(body) }, fallback);
  const qs = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined)).toString();
  return {
    kind: `microservice (${base})`,
    searchPlaces: (q, near) =>
      call(`/search?${qs({ q, lat: near?.lat, lng: near?.lng })}`, {}, () => localGeo.searchPlaces(q, near)).then(
        r => r.results ?? r,
      ),
    reverseGeocode: (lat, lng) => call(`/reverse?${qs({ lat, lng })}`, {}, () => localGeo.reverseGeocode(lat, lng)),
    roadRoute: (from, to) => post('/route', { from, to }, () => localGeo.roadRoute(from, to)).then(r => r?.route ?? r),
    roadTable: points => post('/table', { points }, () => localGeo.roadTable(points)),
    nearbyPlaces: (lat, lng, radius) =>
      call(`/nearby?${qs({ lat, lng, r: radius })}`, {}, () => localGeo.nearbyPlaces(lat, lng, radius)).then(
        r => r.places ?? r,
      ),
    bestOrder: matrix => post('/optimize', { matrix }, () => localGeo.bestOrder(matrix)).then(r => r.order ?? r),
  };
}

/** Choix de l'implémentation selon la configuration (racine de composition). */
export const createGeoGateway = (url = process.env.GEO_SERVICE_URL) => (url ? remoteGeo(url) : localGeo);
