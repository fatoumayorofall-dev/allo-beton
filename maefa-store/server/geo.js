// ============================================================
//  RECHERCHE D'ADRESSE (OpenStreetMap, gratuit, sans clé)
//  - recherche au fil de la frappe : Photon (komoot)
//  - adresse d'un point GPS : Nominatim
//  Les résultats sont mis en cache ; les URL sont réglables (PHOTON_URL, NOMINATIM_URL)
//  pour utiliser un service payant ou auto-hébergé en production.
// ============================================================
const PHOTON_URL = process.env.PHOTON_URL || 'https://photon.komoot.io';
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const UA = `MaefaStore/1.0 (${process.env.SITE_URL || 'https://maefastore.sn'})`;
// Sénégal : ouest, sud, est, nord
const SN_BBOX = [-17.7, 12.2, -11.3, 16.8];
const DAKAR = { lat: 14.7167, lng: -17.4677 };

const cache = new Map();
function cached(key, ms, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.value;
  const value = fn().catch(err => { cache.delete(key); throw err; });
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return value;
}

const round = (n, d = 5) => Math.round(n * 10 ** d) / 10 ** d;

function photonLabel(p) {
  const parts = [p.name, p.street && `${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}`, p.district || p.locality, p.city || p.county]
    .filter(Boolean);
  return [...new Set(parts)].join(', ');
}

/** Recherche de lieux au Sénégal (quartier, rue, mosquée, école, pharmacie…). */
export function searchPlaces(q, near) {
  const query = String(q || '').trim().slice(0, 120);
  if (query.length < 2) return Promise.resolve([]);
  const bias = near && Number.isFinite(near.lat) ? near : DAKAR;
  return cached(`s:${query.toLowerCase()}:${round(bias.lat, 2)},${round(bias.lng, 2)}`, 24 * 3600e3, async () => {
    const url = `${PHOTON_URL}/api/?q=${encodeURIComponent(query)}&lang=fr&limit=8&lat=${bias.lat}&lon=${bias.lng}&bbox=${SN_BBOX.join(',')}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`photon ${res.status}`);
    const data = await res.json();
    return (data.features || [])
      .filter(f => f.properties?.countrycode ? f.properties.countrycode === 'SN' : true)
      .map(f => ({ label: photonLabel(f.properties), kind: f.properties.osm_value || f.properties.type || '', lat: round(f.geometry.coordinates[1]), lng: round(f.geometry.coordinates[0]) }))
      .filter(r => r.label);
  });
}

/** Adresse lisible d'un point GPS (« Rue 10, Sacré-Cœur 3, Dakar »). */
export function reverseGeocode(lat, lng) {
  return cached(`r:${round(lat, 4)},${round(lng, 4)}`, 7 * 24 * 3600e3, async () => {
    const url = `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1&accept-language=fr`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const d = await res.json();
    const a = d.address || {};
    const street = a.road && `${a.road}${a.house_number ? ` ${a.house_number}` : ''}`;
    const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
    const city = a.city || a.town || a.village || a.county;
    const label = [...new Set([street, area, city].filter(Boolean))].join(', ') || d.display_name || '';
    return { label, area: area || '', city: city || '' };
  });
}

/** Distance en mètres entre deux points (formule de haversine). */
export function distanceM(a, b) {
  const R = 6371e3, toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Vitesse moyenne (km/h) et détour de la route par rapport à la ligne droite, selon le véhicule. */
const SPEEDS = { moto: [18, 1.4], voiture: [55, 1.3], car: [50, 1.3] };

/** Temps d'arrivée estimé en minutes (moto en ville ~18 km/h ; voiture ou car sur la route ~50-55 km/h). */
export function etaMinutes(from, to, vehicle = 'moto') {
  const [kmh, detour] = SPEEDS[vehicle] ?? SPEEDS.moto;
  return Math.max(1, Math.round(((distanceM(from, to) * detour) / 1000 / kmh) * 60));
}

export const validPoint = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

/* ---------- Itinéraire par la route (OSRM, gratuit, sans clé) ----------
 * Le vrai chemin du livreur (pas la ligne droite) : distance et durée par les rues,
 * puis corrigées selon l'heure (embouteillages de Dakar) et le véhicule.
 * OSRM_URL pour un serveur auto-hébergé en production ; ROUTING=off pour s'en passer.
 */
const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';
const ROUTING = process.env.ROUTING !== 'off';

/**
 * Embouteillages : coefficient appliqué à la durée « route libre » d'OSRM.
 * Heures de pointe à Dakar (heure GMT = heure de Dakar) : 7 h-10 h et 17 h-20 h 30 en semaine.
 * La moto se faufile ; la voiture et le car subissent le trafic.
 */
export function trafficFactor(vehicle = 'moto', date = new Date()) {
  const h = date.getUTCHours() + date.getUTCMinutes() / 60;
  const day = date.getUTCDay();
  const weekday = day >= 1 && day <= 5;
  const rush = weekday && ((h >= 7 && h < 10) || (h >= 17 && h < 20.5));
  const busy = !rush && h >= 10 && h < 17;
  if (vehicle === 'moto') return rush ? 1.25 : busy ? 1.1 : 1;
  return rush ? 1.9 : busy ? 1.35 : 1.15;
}

/** Garde au plus `max` points du tracé (assez pour la carte, léger pour le téléphone). */
function thin(coords, max = 220) {
  if (coords.length <= max) return coords;
  const step = (coords.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, k) => coords[Math.round(k * step)]);
}

/**
 * Itinéraire routier : { path: [[lat, lng]…], distanceM, durationS } ou null si indisponible.
 * Mis en cache par points arrondis (~50 m) pendant 2 minutes.
 */
export function roadRoute(from, to) {
  if (!ROUTING) return Promise.resolve(null);
  const k = `rt:${round(from.lat, 3.3)},${round(from.lng, 3.3)}>${round(to.lat, 4)},${round(to.lng, 4)}`;
  return cached(k, 120e3, async () => {
    const url = `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`osrm ${res.status}`);
    const r = (await res.json()).routes?.[0];
    if (!r?.geometry?.coordinates?.length) return null;
    return {
      path: thin(r.geometry.coordinates.map(([lng, lat]) => [round(lat), round(lng)])),
      distanceM: Math.round(r.distance),
      durationS: Math.round(r.duration),
    };
  }).catch(() => null);
}

/** Durée par la route en minutes, embouteillages compris. */
export function routeEtaMinutes(route, vehicle = 'moto', date = new Date()) {
  const [kmh] = SPEEDS[vehicle] ?? SPEEDS.moto;
  // OSRM compte en voiture ; à moto en ville on ne dépasse guère 25 km/h de moyenne
  const floor = vehicle === 'moto' ? (route.distanceM / 1000 / Math.max(kmh, 22)) * 3600 * 0.85 : 0;
  const s = Math.max(route.durationS, floor) * trafficFactor(vehicle, date);
  return Math.max(1, Math.round(s / 60));
}
