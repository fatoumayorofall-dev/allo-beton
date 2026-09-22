import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin, Search, Volume2, X } from 'lucide-react';
import type { DeliveryLocation } from '../data/types';
import { reverseGeocode, searchPlaces, type PlaceResult } from '../services/api';
import { speak } from '../utils/speak';
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
    setGps('locating');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGps('idle');
        setCenter(p);
        commit(p, 'gps', { accuracy: Math.round(pos.coords.accuracy) });
      },
      err => setGps(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

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
    commit(c, 'carte');
  };

  useEffect(() => () => clearTimeout(reverseTimer.current), []);

  const circle = value?.source === 'gps' && value.accuracy ? { lat: value.lat, lng: value.lng, radius: value.accuracy } : undefined;

  return (
    <div className="space-y-3" data-testid="location-picker">
      <div className="flex items-center justify-between gap-3">
        <span className="field-label !mb-0">Où livrer ? *</span>
        <button type="button" onClick={() => speak(HELP)} className="inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-full bg-blush/60">
          <Volume2 className="w-3.5 h-3.5 text-wine" /> Écouter
        </button>
      </div>

      <button type="button" onClick={locate} disabled={gps === 'locating'}
        className="w-full flex items-center gap-4 p-4 rounded-[1.5rem] bg-wine text-white text-left active:scale-[.98] transition-transform disabled:opacity-80">
        <span className="w-12 h-12 rounded-full bg-white/20 grid place-items-center shrink-0">
          {gps === 'locating' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Crosshair className="w-6 h-6" />}
        </span>
        <span>
          <strong className="block text-lg leading-tight">{gps === 'locating' ? 'Recherche de votre position…' : '📍 Je suis ici, livrez-moi ici'}</strong>
          <span className="text-sm text-white/80">Le GPS de votre téléphone trouve votre maison</span>
        </span>
      </button>
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
          <button type="button" onClick={() => { setQuery(''); setResults(null); }} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center text-ink/40">
            <X className="w-4 h-4" />
          </button>
        )}
        {results && (
          <ul className="absolute z-[600] left-0 right-0 mt-2 bg-white rounded-2xl shadow-luxe border border-ink/[0.06] overflow-hidden max-h-72 overflow-y-auto" role="listbox">
            {results.length === 0 && (
              <li className="px-4 py-3 text-sm text-ink/55">{searchDown ? 'Recherche indisponible : déplacez la carte jusqu\'à votre maison.' : 'Aucun lieu trouvé. Essayez le nom du quartier.'}</li>
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

      <Suspense fallback={<div className="h-72 rounded-[1.5rem] bg-blush/30 animate-pulse" />}>
        <MapView center={center} zoom={value ? 17 : 13} pinCenter onCenterChange={onMapMove} circle={circle}
          className={`h-72 sm:h-80 rounded-[1.5rem] border ${error ? 'border-wine' : 'border-ink/10'}`}>
          {!value && (
            <p className="absolute top-3 left-3 right-3 z-[500] text-center text-xs px-3 py-2 rounded-full bg-white/95 shadow-sm pointer-events-none">
              👆 Faites glisser la carte pour placer la maison sur votre porte
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
              <p className="text-xs text-ink/55 mt-0.5">
                {value.source === 'gps' ? `Position GPS${value.accuracy ? ` (précision ± ${value.accuracy} m)` : ''}` : value.source === 'recherche' ? 'Lieu trouvé' : 'Point placé à la main'}
                {' · '}Faites glisser la carte pour corriger.
              </p>
              {value.source === 'gps' && (value.accuracy ?? 0) > 150 && (
                <p className="text-xs text-amber-800 mt-1">Le GPS n'est pas très précis ici : vérifiez que la maison est bien sur votre porte.</p>
              )}
            </>
          ) : (
            <p className="text-ink/55">Aucun point choisi pour l'instant.</p>
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
