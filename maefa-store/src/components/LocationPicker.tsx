import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin, Search, Volume2, X } from 'lucide-react';
import type { DeliveryLocation } from '../data/types';
import { reverseGeocode, searchPlaces, type PlaceResult } from '../services/api';
import { speak } from '../utils/speak';
import { locatePrecisely, type LocateHandle, type PreciseResult } from '../utils/preciseGps';
import type { LatLng } from './MapView';

const MapView = lazy(() => import('./MapView'));

interface Props {
  value?: DeliveryLocation;
  onChange: (loc: DeliveryLocation | undefined) => void;
  /** Centre de la carte tant qu'aucun point n'est choisi (zone mémorisée, sinon Dakar) */
  initialCenter: LatLng;
  error?: string;
}

const KIND_ICONS: Record<string, string> = {
  place_of_worship: '🕌', mosque: '🕌', pharmacy: '💊', school: '🏫', hospital: '🏥', clinic: '🏥', marketplace: '🛒', supermarket: '🛒',
  restaurant: '🍽️', fuel: '⛽', bus_station: '🚌', bank: '🏦', hotel: '🏨', stadium: '🏟️', university: '🎓',
};

const HELP = 'Pour la livraison, touchez le gros bouton « Je suis ici » : nous trouvons votre maison tout seuls. '
  + 'Sinon, écrivez votre quartier ou un lieu connu près de chez vous, comme une mosquée, une école ou une pharmacie. '
  + 'Vous pouvez aussi faire glisser la carte avec le doigt pour mettre la maison rose sur votre porte.';

/**
 * Choix du point de livraison, sans avoir à expliquer le chemin :
 * 1. « Je suis ici » (GPS du téléphone) ;
 * 2. ou recherche d'un quartier, d'un lieu connu ;
 * 3. puis on ajuste en faisant glisser la carte sous l'épingle.
 */
export const LocationPicker: React.FC<Props> = ({ value, onChange, initialCenter, error }) => {
  const [center, setCenter] = useState<LatLng>(value ?? initialCenter);
  const [gps, setGps] = useState<'idle' | 'locating' | 'denied' | 'error'>('idle');
  // Mesure en cours : précision atteinte et temps écoulé (le GPS s'affine en quelques secondes)
  const [progress, setProgress] = useState<{ accuracy: number; ms: number } | null>(null);
  const locating = useRef<LocateHandle | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchDown, setSearchDown] = useState(false);
  const latest = useRef(value);
  latest.current = value;
  const reverseTimer = useRef<ReturnType<typeof setTimeout>>();

  /** Enregistre le point puis cherche son adresse lisible. */
  const commit = (p: LatLng, source: DeliveryLocation['source'], extra: Partial<DeliveryLocation> = {}) => {
    const next: DeliveryLocation = { lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6), landmark: latest.current?.landmark, source, ...extra };
    onChange(next);
    if (extra.label) return;
    clearTimeout(reverseTimer.current);
    setResolving(true);
    reverseTimer.current = setTimeout(async () => {
      const r = await reverseGeocode(next);
      setResolving(false);
      const cur = latest.current;
      if (r?.label && cur && cur.lat === next.lat && cur.lng === next.lng) onChange({ ...cur, label: r.label });
    }, 450);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) { setGps('error'); return; }
    locating.current?.cancel();
    setGps('locating');
    setProgress(null);
    let shown = false;
    const show = (r: PreciseResult) => {
      const p = { lat: r.lat, lng: r.lng };
      setCenter(p);
      commit(p, 'gps', { accuracy: r.accuracy });
    };
    const h = locatePrecisely({
      target: 12,
      maxMs: 25000,
      onProgress: (r, ms) => {
        setProgress({ accuracy: r.accuracy, ms });
        // On montre tout de suite un premier point sur la carte, puis on l'affine
        if (!shown || r.accuracy <= 60) { shown = true; show(r); }
      },
    });
    locating.current = h;
    h.promise.then(
      r => { if (locating.current !== h) return; locating.current = null; setGps('idle'); setProgress(null); show(r); },
      err => {
        if (locating.current !== h) return;
        locating.current = null;
        setProgress(null);
        if (err?.code === 0) { setGps('idle'); return; }
        setGps(err?.code === 1 ? 'denied' : 'error');
      },
    );
  };
  useEffect(() => () => locating.current?.cancel(), []);

  // Recherche au fil de la frappe
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await searchPlaces(q, center, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setSearching(false);
      setSearchDown(r === null);
      setResults(r ?? []);
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  const pick = (r: PlaceResult) => {
    setQuery('');
    setResults(null);
    const p = { lat: r.lat, lng: r.lng };
    setCenter(p);
    commit(p, 'recherche', { label: r.label });
  };

  const onMapMove = (c: LatLng, byUser: boolean) => {
    if (!byUser) return;
    if (locating.current) { locating.current.cancel(); locating.current = null; setGps('idle'); setProgress(null); }
    commit(c, 'carte');
  };

  useEffect(() => () => clearTimeout(reverseTimer.current), []);

  const circle = value?.source === 'gps' && value.accuracy ? { lat: value.lat, lng: value.lng, radius: value.accuracy } : undefined;

  return (
    <div className="space-y-3" data-testid="location-picker">
      <div className="flex items-center justify-between gap-3">
        <span className="field-label !mb-0">Où livrer ? *</span>
        <button type="button" onClick={() => speak(HELP)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-ink/15 text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/70 hover:border-ink hover:text-ink transition-colors">
          <Volume2 className="w-3.5 h-3.5 text-gold-dark" strokeWidth={1.5} /> Écouter
        </button>
      </div>

      <button type="button" onClick={locate} disabled={gps === 'locating'}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-ink text-ivory text-left hover:bg-ink-soft active:scale-[.98] transition-all disabled:opacity-80">
        <span className="w-12 h-12 rounded-full border border-gold/50 text-gold-light grid place-items-center shrink-0">
          {gps === 'locating' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Crosshair className="w-6 h-6" strokeWidth={1.3} />}
        </span>
        <span>
          <strong className="block font-display font-normal text-xl leading-tight">{gps === 'locating' ? (progress ? 'Le GPS s\'affine…' : 'Recherche de votre position…') : 'Je suis ici, livrez-moi ici'}</strong>
          <span className="text-[13px] text-ivory/70">{gps === 'locating' && progress ? `Précision : ± ${progress.accuracy} m` : 'Le GPS de votre téléphone trouve votre maison'}</span>
        </span>
      </button>
      {gps === 'locating' && (
        <div className="p-3 rounded-2xl bg-white border border-ink/10 space-y-2" data-testid="gps-progress" aria-live="polite">
          <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-gold to-emerald-600 transition-all duration-700"
              style={{ width: `${progress ? Math.min(100, Math.max(8, 100 * (1 - Math.log(Math.max(progress.accuracy, 12) / 12) / Math.log(200 / 12)))) : 5}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-ink/75">
            <span>Restez dehors ou près d'une fenêtre quelques secondes : la position devient plus précise.</span>
            {progress && <button type="button" onClick={() => locating.current?.finish()} className="shrink-0 px-3 h-8 rounded-full bg-ink text-ivory text-[11px] font-semibold">C'est bon</button>}
          </div>
        </div>
      )}
      {gps === 'denied' && (
        <p className="text-sm p-3 rounded-2xl bg-amber-50 text-amber-900">
          La localisation est bloquée. Autorisez-la dans votre navigateur (icône 🔒 à côté de l'adresse du site), ou cherchez votre quartier ci-dessous.
        </p>
      )}
      {gps === 'error' && <p className="text-sm p-3 rounded-2xl bg-amber-50 text-amber-900">Position introuvable pour le moment. Cherchez votre quartier ci-dessous ou déplacez la carte.</p>}

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
        <input value={query} onChange={e => setQuery(e.target.value)} type="search" enterKeyHint="search"
          placeholder="Quartier, rue, mosquée, école, pharmacie…" aria-label="Rechercher un lieu"
          className="field !pl-11 !pr-10" />
        {searching && <Loader2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-ink/40" />}
        {!searching && query && (
          <button type="button" onClick={() => { setQuery(''); setResults(null); }} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center text-ink/70">
            <X className="w-4 h-4" />
          </button>
        )}
        {results && (
          <ul className="absolute z-[600] left-0 right-0 mt-2 bg-white rounded-2xl shadow-luxe border border-ink/[0.06] overflow-hidden max-h-72 overflow-y-auto" role="listbox">
            {results.length === 0 && (
              <li className="px-4 py-3 text-sm text-ink/70">{searchDown ? 'Recherche indisponible : déplacez la carte jusqu\'à votre maison.' : 'Aucun lieu trouvé. Essayez le nom du quartier.'}</li>
            )}
            {results.map(r => (
              <li key={`${r.lat},${r.lng},${r.label}`}>
                <button type="button" onClick={() => pick(r)} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-ivory">
                  <span className="text-lg w-6 text-center shrink-0">{KIND_ICONS[r.kind] ?? '📍'}</span>
                  <span className="line-clamp-2">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Suspense fallback={<div className="h-72 rounded-[1.5rem] bg-ivory-deep animate-pulse" />}>
        <MapView center={center} zoom={value ? 18 : 13} pinCenter onCenterChange={onMapMove} circle={circle} satellite={satellite}
          className={`h-72 sm:h-80 rounded-[1.5rem] border ${error ? 'border-wine' : 'border-ink/10'}`}>
          <div className="absolute bottom-3 left-3 z-[500] inline-flex p-1 rounded-full bg-white/95 shadow-md text-[11px] font-semibold" role="group" aria-label="Fond de carte">
            <button type="button" onClick={() => setSatellite(false)} aria-pressed={!satellite} className={`px-3 h-8 rounded-full ${!satellite ? 'bg-ink text-ivory' : 'text-ink/75'}`}>Plan</button>
            <button type="button" onClick={() => setSatellite(true)} aria-pressed={satellite} data-testid="map-satellite" className={`px-3 h-8 rounded-full ${satellite ? 'bg-ink text-ivory' : 'text-ink/75'}`}>Satellite</button>
          </div>
          {!value && (
            <p className="absolute top-3 left-3 right-3 z-[500] text-center text-xs px-3 py-2 rounded-full bg-white/95 shadow-sm pointer-events-none">
              Faites glisser la carte pour placer la maison sur votre porte
            </p>
          )}
        </MapView>
      </Suspense>

      <div className={`flex items-start gap-3 p-4 rounded-2xl ${value ? 'bg-white border border-ink/10' : 'bg-ivory'}`}>
        <MapPin className={`w-5 h-5 shrink-0 mt-0.5 ${value ? 'text-wine' : 'text-ink/30'}`} />
        <div className="text-sm min-w-0" aria-live="polite">
          {value ? (
            <>
              <p className="font-semibold">{value.label || (resolving ? 'Recherche de l\'adresse…' : 'Point choisi sur la carte')}</p>
              <p className="text-xs text-ink/70 mt-0.5">
                {value.source === 'gps' ? `Position GPS${value.accuracy ? ` (précision ± ${value.accuracy} m)` : ''}` : value.source === 'recherche' ? 'Lieu trouvé' : 'Point placé à la main'}
                {' · '}Pour être exacte : touchez « Satellite » et mettez l'épingle sur votre toit.
              </p>
              {value.source === 'gps' && (value.accuracy ?? 0) > 50 && gps !== 'locating' && (
                <p className="text-xs text-amber-800 mt-1">Le GPS n'est pas très précis ici : touchez « Satellite » et faites glisser la carte pour mettre l'épingle sur votre maison.</p>
              )}
            </>
          ) : (
            <p className="text-ink/70">Aucun point choisi pour l'instant.</p>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-wine">{error}</p>}

      {value && (
        <label className="block">
          <span className="field-label">Un repère pour le livreur (facultatif)</span>
          <input value={value.landmark ?? ''} onChange={e => onChange({ ...value, landmark: e.target.value.slice(0, 160) })}
            placeholder="Ex : portail vert, en face de la boutique Wave…" className="field" />
        </label>
      )}
    </div>
  );
};

export default LocationPicker;
