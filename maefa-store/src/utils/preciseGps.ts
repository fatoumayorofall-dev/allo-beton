/**
 * GPS plus précis, sans service payant.
 *
 * Un téléphone donne d'abord une position grossière (Wi-Fi, antennes : ± 100 m à 2 km), puis l'affine
 * en quelques secondes quand la puce GPS capte les satellites. On écoute donc la position pendant un
 * moment au lieu de prendre la première, on écarte les mesures anciennes ou aberrantes, et on fait la
 * moyenne des meilleures (chacune pèse selon sa précision).
 */

export interface Fix { lat: number; lng: number; accuracy: number; at: number }
export interface PreciseResult { lat: number; lng: number; accuracy: number; samples: number }

/** Distance en mètres entre deux points. */
export function meters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, toRad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Moyenne pondérée des meilleures mesures : celles dont la précision est proche de la meilleure
 * et qui tombent près d'elle. Le poids d'une mesure est 1 / précision².
 */
export function combine(fixes: Fix[]): PreciseResult | null {
  if (!fixes.length) return null;
  const best = fixes.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
  const good = fixes.filter(f => f.accuracy <= Math.max(best.accuracy * 1.6, best.accuracy + 8) && meters(f, best) <= Math.max(best.accuracy * 1.5, 12));
  let w = 0, lat = 0, lng = 0;
  for (const f of good) { const k = 1 / (f.accuracy * f.accuracy); w += k; lat += f.lat * k; lng += f.lng * k; }
  // Plusieurs bonnes mesures concordantes : l'incertitude de la moyenne baisse (sans descendre sous 3 m)
  const acc = Math.max(3, best.accuracy / Math.sqrt(Math.min(good.length, 4)));
  return { lat: lat / w, lng: lng / w, accuracy: Math.round(acc), samples: good.length };
}

export interface LocateOptions {
  /** Précision visée en mètres : on s'arrête dès qu'elle est atteinte deux fois de suite */
  target?: number;
  /** Durée maximale d'écoute */
  maxMs?: number;
  onProgress?: (r: PreciseResult, elapsedMs: number) => void;
}

export interface LocateHandle {
  promise: Promise<PreciseResult>;
  /** Arrêter tout de suite et garder la meilleure position trouvée */
  finish: () => void;
  cancel: () => void;
}

/** Écoute le GPS jusqu'à obtenir une position précise (ou jusqu'à la fin du temps imparti). */
export function locatePrecisely({ target = 12, maxMs = 25000, onProgress }: LocateOptions = {}): LocateHandle {
  let finish = () => {};
  let cancel = () => {};
  const promise = new Promise<PreciseResult>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) { reject(Object.assign(new Error('unsupported'), { code: 2 })); return; }
    const start = Date.now();
    const fixes: Fix[] = [];
    let goodInARow = 0;
    let firstGoodAt = 0;
    let done = false;
    const stop = () => { done = true; navigator.geolocation.clearWatch(id); clearTimeout(timer); clearInterval(check); };
    finish = () => {
      if (done) return;
      const r = combine(fixes);
      stop();
      if (r) resolve(r); else reject(Object.assign(new Error('timeout'), { code: 3 }));
    };
    cancel = () => { if (!done) { stop(); reject(Object.assign(new Error('cancelled'), { code: 0 })); } };
    const id = navigator.geolocation.watchPosition(
      pos => {
        if (done) return;
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        // maximumAge: 0 demande déjà une mesure fraîche ; l'heure donnée par certains GPS est décalée,
        // donc on n'écarte que les mesures vraiment anciennes (plus de 2 minutes)
        if (pos.timestamp && pos.timestamp < start - 120000) return;
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !(accuracy > 0)) return;
        fixes.push({ lat, lng, accuracy, at: Date.now() });
        const r = combine(fixes)!;
        onProgress?.(r, Date.now() - start);
        goodInARow = accuracy <= target ? goodInARow + 1 : 0;
        if (goodInARow >= 2) finish();
        else if (accuracy <= target && !firstGoodAt) firstGoodAt = Date.now();
      },
      err => {
        if (done) return;
        // Raté passager (signal, délai) : l'écoute continue jusqu'à la fin du temps imparti.
        // Seul un refus d'autorisation arrête tout.
        if (err.code !== err.PERMISSION_DENIED) return;
        stop();
        reject(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxMs },
    );
    const timer = setTimeout(finish, maxMs);
    // Certains téléphones n'envoient plus rien une fois la position stable : on n'attend pas pour rien
    const check = setInterval(() => {
      const r = combine(fixes);
      if (!r) return;
      const elapsed = Date.now() - start;
      if ((firstGoodAt && Date.now() - firstGoodAt > 3000) || (r.accuracy <= target * 2 && elapsed > 10000)) finish();
    }, 500);
  });
  return { promise, finish: () => finish(), cancel: () => cancel() };
}

/**
 * Filtre pour la position du livreur en route : écarte les sauts impossibles et les mesures
 * très imprécises, et lisse légèrement le tracé (le point ne « saute » plus sur la carte).
 */
export function makeTrackFilter({ maxSpeed = 40, maxAccuracy = 80 } = {}) {
  let last: Fix | null = null;
  // Mesures écartées d'affilée : si le GPS insiste, c'est que le livreur est vraiment ailleurs
  // (première position fausse, GPS coupé un moment…) : on le croit plutôt que de le perdre.
  let rejected = 0;
  const reject = () => { rejected += 1; return null; };
  return (f: Fix): Fix | null => {
    if (!(f.accuracy > 0)) return null;
    if (!last || (rejected >= 2 && f.accuracy <= maxAccuracy)) {
      if (!last && f.accuracy > maxAccuracy * 3) return null;
      last = f; rejected = 0; return f;
    }
    const dt = Math.max(0.5, (f.at - last.at) / 1000);
    const d = meters(last, f);
    // Plus de 40 m/s (144 km/h) en ville : saut de mesure, pas un vrai déplacement
    if (d - f.accuracy - last.accuracy > maxSpeed * dt) return reject();
    // Mesure beaucoup moins bonne que la précédente : bruit
    if (f.accuracy > maxAccuracy && f.accuracy > last.accuracy * 2) return reject();
    rejected = 0;
    // Lissage pondéré par la précision (la mesure la plus sûre pèse le plus)
    const k = (last.accuracy * last.accuracy) / (last.accuracy * last.accuracy + f.accuracy * f.accuracy);
    const moving = d > Math.max(f.accuracy, 15);
    const w = moving ? Math.max(k, 0.7) : k; // en mouvement on suit vite la nouvelle position
    const out: Fix = { lat: last.lat + (f.lat - last.lat) * w, lng: last.lng + (f.lng - last.lng) * w, accuracy: Math.min(f.accuracy, Math.round(Math.sqrt((1 - w) * last.accuracy ** 2 + w * f.accuracy ** 2))), at: f.at };
    last = out;
    return out;
  };
}
