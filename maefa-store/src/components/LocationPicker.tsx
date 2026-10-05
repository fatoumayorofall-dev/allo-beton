import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Crosshair,
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  PencilLine,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import type { DeliveryLocation, NearbyPlace, SavedAddress } from '../data/types';
import { ADDRESS_NAMES, useSavedAddresses } from '../utils/savedAddresses';
import { fetchNearby, reverseGeocode, searchPlaces, type PlaceResult } from '../services/api';
import { speak } from '../utils/speak';
import { useEscape, useLockBody } from '../utils/hooks';
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
  place_of_worship: '🕌',
  mosque: '🕌',
  pharmacy: '💊',
  school: '🏫',
  hospital: '🏥',
  clinic: '🏥',
  marketplace: '🛒',
  supermarket: '🛒',
  restaurant: '🍽️',
  fuel: '⛽',
  bus_station: '🚌',
  bank: '🏦',
  hotel: '🏨',
  stadium: '🏟️',
  university: '🎓',
};

const HELP =
  "Pour la livraison, touchez le gros bouton « Je suis ici » : la carte s'ouvre et trouve votre maison toute seule. " +
  "Faites glisser la carte avec le doigt pour mettre l'épingle sur votre porte, puis touchez « Confirmer ce point ». " +
  'Vous pouvez aussi écrire votre quartier ou un lieu connu, comme une mosquée, une école ou une pharmacie.';

const sourceText = (v: DeliveryLocation) =>
  v.source === 'gps'
    ? `Position GPS${v.accuracy ? ` (précision ± ${v.accuracy} m)` : ''}`
    : v.source === 'recherche'
      ? 'Lieu trouvé'
      : 'Point placé à la main';

/**
 * Choix du point de livraison, comme dans les applications de VTC (Yango) :
 * une carte plein écran avec une épingle fixe au centre, on fait glisser la carte dessous,
 * l'adresse s'affiche en direct en bas, puis on confirme.
 * Sur la page, un résumé (aperçu de la carte + adresse) avec « Modifier ».
 */
export const LocationPicker: React.FC<Props> = ({ value, onChange, initialCenter, error }) => {
  const [open, setOpen] = useState<null | { locate: boolean }>(null);
  const { addresses, save } = useSavedAddresses();
  const same = (a: { lat: number; lng: number }) =>
    !!value && Math.abs(a.lat - value.lat) < 1e-5 && Math.abs(a.lng - value.lng) < 1e-5;
  const choose = (a: SavedAddress) => {
    const { id: _id, name: _n, icon: _i, ...loc } = a;
    onChange(loc);
  };

  return (
    <div className="space-y-3" data-testid="location-picker">
      <div className="flex items-center justify-between gap-3">
        <span className="field-label !mb-0">Où livrer ? *</span>
        <button
          type="button"
          onClick={() => speak(HELP)}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-ink/15 text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/70 hover:border-ink hover:text-ink transition-colors"
        >
          <Volume2 className="w-3.5 h-3.5 text-gold-dark" strokeWidth={1.5} /> Écouter
        </button>
      </div>

      {/* Adresses enregistrées : un seul geste, même sans connaître le nom du quartier */}
      {addresses.length > 0 && (
        <div data-testid="saved-addresses">
          <p className="text-xs text-ink/70 mb-2">Mes adresses</p>
          <div className="grid grid-cols-2 gap-2">
            {addresses.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => choose(a)}
                aria-pressed={same(a)}
                className={`min-w-0 text-left px-3.5 py-2.5 rounded-2xl border transition-colors ${same(a) ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/10'}`}
              >
                <span className="block text-sm font-semibold">
                  {a.icon} {a.name}
                </span>
                <span className={`block text-[11px] truncate ${same(a) ? 'text-ivory/70' : 'text-ink/60'}`}>
                  {a.landmark || a.label || 'Point sur la carte'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {value ? (
        <div
          className={`rounded-[1.5rem] bg-white border overflow-hidden ${error ? 'border-wine' : 'border-ink/10'}`}
          data-testid="location-summary"
        >
          <button
            type="button"
            onClick={() => setOpen({ locate: false })}
            className="block w-full relative"
            aria-label="Modifier le point sur la carte"
          >
            <Suspense fallback={<div className="h-36 bg-ivory-deep animate-pulse" />}>
              <MapView
                center={value}
                zoom={17}
                interactive={false}
                markers={[{ id: 'home', kind: 'home', lat: value.lat, lng: value.lng }]}
                className="h-36"
              />
            </Suspense>
            <span className="absolute right-3 top-3 z-[500] inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-white/95 shadow text-[11px] font-semibold">
              <PencilLine className="w-3.5 h-3.5" /> Modifier
            </span>
          </button>
          <div className="flex items-start gap-3 p-4" aria-live="polite">
            <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-wine" />
            <div className="text-sm min-w-0">
              <p className="font-semibold">{value.label || 'Point choisi sur la carte'}</p>
              <p className="text-xs text-ink/70 mt-0.5">{sourceText(value)}</p>
              {value.landmark && <p className="text-xs text-ink/80 mt-1">Repère : {value.landmark}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setOpen({ locate: true })}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-ink text-ivory text-left hover:bg-ink-soft active:scale-[.98] transition-all"
          >
            <span className="w-12 h-12 rounded-full border border-gold/50 text-gold-light grid place-items-center shrink-0">
              <Crosshair className="w-6 h-6" strokeWidth={1.3} />
            </span>
            <span>
              <strong className="block font-display font-normal text-xl leading-tight">
                Je suis ici, livrez-moi ici
              </strong>
              <span className="text-[13px] text-ivory/70">La carte s'ouvre et trouve votre maison</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOpen({ locate: false })}
            className={`w-full flex items-center gap-3 px-4 h-14 rounded-2xl bg-white border text-sm font-semibold ${error ? 'border-wine' : 'border-ink/10'}`}
          >
            <MapPin className="w-5 h-5 text-wine" /> Choisir sur la carte ou chercher un lieu
          </button>
        </div>
      )}
      {error && <p className="text-xs text-wine">{error}</p>}

      {/* Rendue directement dans la page : jamais rétrécie par un bloc parent (fiche, formulaire animé) */}
      {open &&
        createPortal(
          <MapSheet
            initial={value}
            initialCenter={value ?? initialCenter}
            autoLocate={open.locate}
            onClose={() => setOpen(null)}
            onConfirm={(loc, keep) => {
              if (keep) save(loc, keep.name, keep.icon);
              onChange(loc);
              setOpen(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Carte plein écran                                                   */
/* ------------------------------------------------------------------ */

const MapSheet: React.FC<{
  initial?: DeliveryLocation;
  initialCenter: LatLng;
  autoLocate: boolean;
  onClose: () => void;
  /** `keep` : nom donné à l'adresse pour la retrouver la prochaine fois */
  onConfirm: (loc: DeliveryLocation, keep?: { name: string; icon: string }) => void;
}> = ({ initial, initialCenter, autoLocate, onClose, onConfirm }) => {
  useLockBody(true);
  useEscape(true, onClose);
  const [center, setCenter] = useState<LatLng>(initialCenter);
  const [draft, setDraft] = useState<DeliveryLocation | undefined>(initial);
  const [moving, setMoving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [gps, setGps] = useState<'idle' | 'locating' | 'denied' | 'error'>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [me, setMe] = useState<PreciseResult | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchDown, setSearchDown] = useState(false);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [keep, setKeep] = useState<{ name: string; icon: string } | null>(null);
  const [otherName, setOtherName] = useState('');
  const locating = useRef<LocateHandle | null>(null);
  const latest = useRef(draft);
  latest.current = draft;
  const reverseTimer = useRef<ReturnType<typeof setTimeout>>();

  /** Nouveau point sous l'épingle : on garde le repère, puis on cherche l'adresse lisible. */
  const commit = (p: LatLng, source: DeliveryLocation['source'], extra: Partial<DeliveryLocation> = {}) => {
    // Le repère suit l'épingle ; celui choisi parmi les lieux connus est oublié si on s'éloigne (plus de ~80 m)
    const prev = latest.current;
    const far = prev && (Math.abs(prev.lat - p.lat) > 0.0007 || Math.abs(prev.lng - p.lng) > 0.0007);
    const keepLandmark = prev?.landmark && !(far && prev.landmark.startsWith('À côté de ')) ? prev.landmark : undefined;
    const next: DeliveryLocation = {
      lat: +p.lat.toFixed(6),
      lng: +p.lng.toFixed(6),
      landmark: keepLandmark,
      source,
      ...extra,
    };
    // Même point qu'affiché (le GPS confirme) : on garde l'adresse déjà trouvée, sans clignotement
    const cur = latest.current;
    if (cur && cur.lat === next.lat && cur.lng === next.lng && cur.label && !extra.label) {
      setDraft({ ...next, label: cur.label });
      return;
    }
    setDraft(next);
    if (extra.label) {
      setResolving(false);
      return;
    }
    clearTimeout(reverseTimer.current);
    setResolving(true);
    reverseTimer.current = setTimeout(async () => {
      const r = await reverseGeocode(next);
      const cur = latest.current;
      if (cur && cur.lat === next.lat && cur.lng === next.lng) {
        setResolving(false);
        if (r?.label) setDraft({ ...cur, label: r.label });
      }
    }, 350);
  };

  const stopLocating = () => {
    locating.current?.cancel();
    locating.current = null;
    setGps('idle');
    setProgress(null);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGps('error');
      return;
    }
    locating.current?.cancel();
    setGps('locating');
    setProgress(null);
    let shown = false;
    const show = (r: PreciseResult) => {
      setMe(r);
      setCenter({ lat: r.lat, lng: r.lng });
      commit(r, 'gps', { accuracy: r.accuracy });
    };
    const h = locatePrecisely({
      target: 12,
      maxMs: 25000,
      onProgress: r => {
        setProgress(r.accuracy);
        setMe(r);
        if (!shown || r.accuracy <= 60) {
          shown = true;
          show(r);
        }
      },
    });
    locating.current = h;
    h.promise.then(
      r => {
        if (locating.current !== h) return;
        locating.current = null;
        setGps('idle');
        setProgress(null);
        show(r);
      },
      err => {
        if (locating.current !== h) return;
        locating.current = null;
        setProgress(null);
        setGps(err?.code === 0 ? 'idle' : err?.code === 1 ? 'denied' : 'error');
      },
    );
  };
  useEffect(() => {
    if (autoLocate) locate();
    return () => {
      locating.current?.cancel();
      clearTimeout(reverseTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recherche au fil de la frappe
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await searchPlaces(q, center, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setSearching(false);
      setSearchDown(r === null);
      setResults(r ?? []);
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lieux connus autour de l'épingle (mosquée, pharmacie, école…), quand elle ne bouge plus
  useEffect(() => {
    if (!draft || moving) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const list = await fetchNearby(draft, ctrl.signal);
      if (!ctrl.signal.aborted) setPlaces(list.slice(0, 12));
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [draft?.lat, draft?.lng, moving]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Le lieu touché devient le repère du livreur (« À côté de la Mosquée X, 60 m »). */
  const landmarkOf = (pl: NearbyPlace) => `À côté de ${pl.name}${pl.distanceM < 15 ? '' : `, à ${pl.distanceM} m`}`;
  const pickPlace = (pl: NearbyPlace) => {
    if (draft) setDraft({ ...draft, landmark: landmarkOf(pl) });
  };

  const pick = (r: PlaceResult) => {
    stopLocating();
    setQuery('');
    setResults(null);
    setCenter({ lat: r.lat, lng: r.lng });
    commit(r, 'recherche', { label: r.label });
  };

  const onMoveStart = () => {
    setMoving(true);
    if (locating.current) stopLocating();
  };
  const onMapMove = (c: LatLng, byUser: boolean) => {
    setMoving(false);
    if (!byUser) return;
    commit(c, 'carte');
  };

  const circle =
    draft?.source === 'gps' && draft.accuracy && !moving
      ? { lat: draft.lat, lng: draft.lng, radius: draft.accuracy }
      : undefined;
  const busy = gps === 'locating';

  return (
    <div
      className="fixed inset-0 z-[90] bg-ivory flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Choisir le point de livraison"
      data-testid="map-sheet"
    >
      {/* Carte : prend tout l'espace au-dessus de la fiche */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <Suspense fallback={<div className="h-full bg-ivory-deep animate-pulse" />}>
            <MapView
              center={center}
              zoom={draft ? 18 : 15}
              zoomButtons={false}
              pinCenter
              pinLifted={moving}
              onMoveStart={onMoveStart}
              onCenterChange={onMapMove}
              circle={circle}
              satellite={satellite}
              className="h-full w-full"
              markers={[
                ...places.map(pl => ({
                  id: `poi:${pl.name}`,
                  kind: 'poi' as const,
                  lat: pl.lat,
                  lng: pl.lng,
                  icon: pl.icon,
                  title: `${pl.name} · ${pl.kind}`,
                  tone: draft?.landmark === landmarkOf(pl) ? ('current' as const) : undefined,
                })),
                ...(me ? [{ id: 'me', kind: 'me' as const, lat: me.lat, lng: me.lng }] : []),
              ]}
              onMarkerClick={id => {
                const pl = places.find(x => `poi:${x.name}` === id);
                if (pl) pickPlace(pl);
              }}
            />
          </Suspense>
        </div>

        {/* Haut : retour + recherche */}
        <div className="absolute top-0 inset-x-0 z-[600] p-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] flex items-start gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Retour"
            className="w-12 h-12 shrink-0 rounded-full bg-white shadow-lg grid place-items-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink/45" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="search"
              enterKeyHint="search"
              placeholder="Quartier, mosquée, école, pharmacie…"
              aria-label="Rechercher un lieu"
              className="w-full h-12 rounded-full bg-white shadow-lg pl-11 pr-10 text-[15px] outline-none focus:ring-2 focus:ring-gold"
            />
            {searching && (
              <Loader2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-ink/40" />
            )}
            {!searching && query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults(null);
                }}
                aria-label="Effacer"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center text-ink/70"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {results && (
              <ul
                className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-luxe overflow-hidden max-h-[50vh] overflow-y-auto"
                role="listbox"
              >
                {results.length === 0 && (
                  <li className="px-4 py-3 text-sm text-ink/70">
                    {searchDown
                      ? "Recherche indisponible : faites glisser la carte jusqu'à votre maison."
                      : 'Aucun lieu trouvé. Essayez le nom du quartier.'}
                  </li>
                )}
                {results.map(r => (
                  <li key={`${r.lat},${r.lng},${r.label}`}>
                    <button
                      type="button"
                      onClick={() => pick(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-ivory"
                    >
                      <span className="text-lg w-6 text-center shrink-0">{KIND_ICONS[r.kind] ?? '📍'}</span>
                      <span className="line-clamp-2">{r.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* GPS en cours : précision en direct */}
        {busy && (
          <div
            className="absolute top-[calc(4.5rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[550] inline-flex items-center gap-2 pl-3 pr-1.5 h-10 rounded-full bg-ink text-ivory text-xs shadow-lg whitespace-nowrap"
            data-testid="gps-progress"
            aria-live="polite"
          >
            <Loader2 className="w-4 h-4 animate-spin text-gold-light" />
            {progress ? <>Précision ± {progress} m…</> : 'Recherche de votre position…'}
            {progress && (
              <button
                type="button"
                onClick={() => locating.current?.finish()}
                className="ml-1 px-3 h-7 rounded-full bg-gold-light text-ink font-semibold"
              >
                C'est bon
              </button>
            )}
          </div>
        )}

        {/* Bas de la carte : satellite et « me localiser » */}
        <button
          type="button"
          onClick={() => setSatellite(s => !s)}
          aria-pressed={satellite}
          data-testid="map-satellite"
          className={`absolute left-3 bottom-4 z-[550] inline-flex items-center gap-1.5 px-3.5 h-11 rounded-full shadow-lg text-xs font-semibold ${satellite ? 'bg-ink text-ivory' : 'bg-white text-ink'}`}
        >
          <Layers className="w-4 h-4" /> {satellite ? 'Plan' : 'Satellite'}
        </button>
        <button
          type="button"
          onClick={locate}
          aria-label="Me localiser"
          data-testid="locate-me"
          className="absolute right-3 bottom-4 z-[550] w-14 h-14 rounded-full bg-white shadow-lg grid place-items-center text-[#2f7bff]"
        >
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <LocateFixed className="w-6 h-6" strokeWidth={1.8} />}
        </button>
      </div>

      {/* Fiche du bas : l'adresse sous l'épingle, le repère, la confirmation */}
      <div className="relative z-[600] -mt-5 bg-ivory rounded-t-[1.75rem] shadow-[0_-14px_30px_-18px_rgba(43,18,32,.5)] px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <span className="block w-10 h-1.5 rounded-full bg-ink/15 mx-auto mb-3" aria-hidden />
        <p className="eyebrow">Livrer ici</p>
        <div className="mt-1.5 min-h-[3.25rem]" aria-live="polite">
          {moving ? (
            <p className="font-display text-xl text-ink/45">Relâchez la carte sur votre porte…</p>
          ) : draft ? (
            <>
              <p className="font-display text-xl leading-snug line-clamp-2">
                {draft.label || (resolving ? "Recherche de l'adresse…" : 'Point choisi sur la carte')}
              </p>
              <p className="text-xs text-ink/65 mt-1">{sourceText(draft)}</p>
            </>
          ) : (
            <p className="font-display text-xl text-ink/60">
              Faites glisser la carte pour mettre l'épingle sur votre maison
            </p>
          )}
        </div>
        {gps === 'denied' && (
          <p className="mt-2 text-xs p-2.5 rounded-xl bg-amber-50 text-amber-900">
            Localisation bloquée : autorisez-la (icône 🔒 près de l'adresse du site) ou faites glisser la carte.
          </p>
        )}
        {gps === 'error' && (
          <p className="mt-2 text-xs p-2.5 rounded-xl bg-amber-50 text-amber-900">
            Position introuvable pour le moment : cherchez votre quartier en haut ou faites glisser la carte.
          </p>
        )}
        {draft?.source === 'gps' && (draft.accuracy ?? 0) > 50 && !busy && (
          <p className="mt-2 text-xs text-amber-800">
            Le GPS est peu précis ici : touchez « Satellite » et placez l'épingle sur votre toit.
          </p>
        )}
        {draft && !moving && places.length > 0 && (
          <div className="mt-3" data-testid="nearby-places">
            <p className="text-xs text-ink/70 mb-1.5">Quel lieu connu est à côté de chez vous ? Touchez-le :</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
              {places.map(pl => {
                const on = draft.landmark === landmarkOf(pl);
                return (
                  <button
                    key={pl.name}
                    type="button"
                    onClick={() => pickPlace(pl)}
                    aria-pressed={on}
                    className={`shrink-0 max-w-[13rem] text-left pl-2.5 pr-3 py-2 rounded-2xl border flex items-center gap-2 ${on ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/10'}`}
                  >
                    <span className="text-xl leading-none">{pl.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold truncate">{pl.name}</span>
                      <span className={`block text-[11px] ${on ? 'text-ivory/70' : 'text-ink/60'}`}>
                        {pl.kind} · {pl.distanceM < 15 ? 'juste là' : `${pl.distanceM} m`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {draft && (
          <input
            value={draft.landmark ?? ''}
            onChange={e => setDraft({ ...draft, landmark: e.target.value.slice(0, 160) })}
            placeholder="Repère : portail vert, en face de la boutique Wave…"
            aria-label="Un repère pour le livreur"
            className="field mt-3 !h-12 !text-sm"
          />
        )}
        {draft && !moving && (
          <div className="mt-3" data-testid="save-address">
            <p className="text-xs text-ink/70 mb-1.5">
              Enregistrer cette adresse pour la prochaine fois ? (facultatif)
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
              {ADDRESS_NAMES.map(n => {
                const on = keep?.name === n.name;
                return (
                  <button
                    key={n.name}
                    type="button"
                    onClick={() => setKeep(on ? null : n)}
                    aria-pressed={on}
                    className={`shrink-0 px-3.5 h-10 rounded-full border text-sm ${on ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/10'}`}
                  >
                    {n.icon} {n.name}
                  </button>
                );
              })}
              <input
                value={otherName}
                onChange={e => {
                  setOtherName(e.target.value.slice(0, 30));
                  setKeep(e.target.value.trim() ? { name: e.target.value.trim().slice(0, 30), icon: '📍' } : null);
                }}
                placeholder="✏️ Autre nom"
                aria-label="Autre nom pour cette adresse"
                className="shrink-0 w-32 h-10 rounded-full border border-ink/10 bg-white px-3.5 text-sm outline-none focus:border-ink"
              />
            </div>
          </div>
        )}
        <button
          type="button"
          disabled={!draft || moving}
          onClick={() => draft && onConfirm(draft, keep ?? undefined)}
          className="btn-dark w-full mt-3 !h-14 !text-[13px] disabled:opacity-50"
          data-testid="confirm-location"
        >
          {keep ? `Confirmer · ${keep.icon} ${keep.name}` : 'Confirmer ce point'}
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
