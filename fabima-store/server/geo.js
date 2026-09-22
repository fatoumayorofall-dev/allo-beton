// ============================================================
//  RECHERCHE D'ADRESSE (OpenStreetMap, gratuit, sans clé)
//  - recherche au fil de la frappe : Photon (komoot)
//  - adresse d'un point GPS : Nominatim
//  Les résultats sont mis en cache ; les URL sont réglables (PHOTON_URL, NOMINATIM_URL)
//  pour utiliser un service payant ou auto-hébergé en production.
// ============================================================
const PHOTON_URL = process.env.PHOTON_URL || 'https://photon.komoot.io';
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const UA = `FabimaStore/1.0 (${process.env.SITE_URL || 'https://fabimastore.sn'})`;
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

/** Temps d'arrivée estimé en minutes (trajet ~1,4 × la ligne droite, ~18 km/h en ville). */
export function etaMinutes(from, to) {
  return Math.max(1, Math.round(((distanceM(from, to) * 1.4) / 1000 / 18) * 60));
}

export const validPoint = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
