import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MessageCircle, Navigation, Phone, Play, SkipForward } from 'lucide-react';
import { googleMapsDirections, wazeDirections } from '../config/site';
import {
  driverDelivered,
  driverPosition,
  driverStart,
  fetchDriverTour,
  skipTourStop,
  type GpsFix,
} from '../services/api';
import type { DriverTour as Tour, DriverTourStop } from '../data/types';
import { VEHICLE_ICONS, formatDistance, formatEta, formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { waNumber } from '../utils/whatsappMessages';
import { makeTrackFilter } from '../utils/preciseGps';
import type { MapMarker } from '../components/MapView';
import { BrandMark, Wordmark } from '../components/Logo';
import { useWakeLock } from './Driver';

const MapView = lazy(() => import('../components/MapView'));
const SEND_EVERY_MS = { moto: 4000, voiture: 15000, car: 15000 } as const;
const km = (m: number) => `${(m / 1000).toFixed(1).replace('.', ',')} km`;

/**
 * Tournée du livreur (lien secret reçu sur WhatsApp) : toutes ses livraisons du jour,
 * déjà rangées dans l'ordre le plus court. Une seule livraison à la fois à l'écran ;
 * dès que le code de la cliente est validé, la suivante démarre et sa cliente est prévenue.
 */
export const DriverTour: React.FC = () => {
  usePageTitle('Tournée');
  const { token = '' } = useParams();
  const [tour, setTour] = useState<Tour | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'' | 'start' | 'done' | 'skip'>('');
  const [code, setCode] = useState('');
  const [me, setMe] = useState<GpsFix | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [lastSent, setLastSent] = useState<number | null>(null);
  const [live, setLive] = useState<{
    distanceM: number | null;
    etaMin: number | null;
    route?: [number, number][] | null;
  } | null>(null);
  const [flash, setFlash] = useState('');
  const [, tick] = useState(0);

  const load = useCallback(
    () => fetchDriverTour(token).then(r => (r.ok ? setTour(r.data) : setError(r.error))),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);

  const cur: DriverTourStop | null = tour && tour.current >= 0 ? tour.stops[tour.current] : null;
  const driving = cur?.state === 'en_route';
  const every = SEND_EVERY_MS[tour?.vehicle ?? 'moto'];
  useWakeLock(!!tour?.startedAt && !tour.doneAt);

  // GPS pendant toute la tournée ; la position part vers la livraison en cours
  const legToken = useRef<string | null>(null);
  legToken.current = driving ? (cur?.legToken ?? null) : null;
  const lastPost = useRef(0);
  const pending = useRef<GpsFix | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const send = useCallback(
    (fix: GpsFix) => {
      pending.current = fix;
      if (timer.current) return;
      const flush = async () => {
        timer.current = undefined;
        const next = pending.current;
        const t = legToken.current;
        if (!next || !t) return;
        pending.current = null;
        lastPost.current = Date.now();
        const r = await driverPosition(t, next);
        if (r.ok) {
          setLastSent(Date.now());
          setLive(r.data);
        }
      };
      timer.current = setTimeout(flush, Math.max(0, lastPost.current + every - Date.now()));
    },
    [every],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  const tracking = !!tour?.startedAt && !tour.doneAt;
  useEffect(() => {
    if (!tracking || !('geolocation' in navigator)) return;
    const filter = makeTrackFilter();
    const id = navigator.geolocation.watchPosition(
      pos => {
        const f = filter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: Date.now(),
        });
        if (!f) return;
        const fix = {
          lat: +f.lat.toFixed(6),
          lng: +f.lng.toFixed(6),
          accuracy: Math.round(f.accuracy),
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        };
        setMe(fix);
        setGpsError('');
        send(fix);
      },
      err =>
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Autorisez la localisation pour que les clientes vous voient sur la carte.'
            : 'Signal GPS faible…',
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    const t = setInterval(() => tick(n => n + 1), 5000);
    return () => {
      navigator.geolocation.clearWatch(id);
      clearInterval(t);
    };
  }, [tracking, send]);

  /** Démarrer la livraison en cours (1re de la tournée, ou reprise) : sa cliente est prévenue. */
  const start = () => {
    if (!cur?.legToken) return;
    setBusy('start');
    setError('');
    const go = async (fix?: GpsFix) => {
      const r = await driverStart(cur.legToken!, fix);
      setBusy('');
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (fix) {
        setMe(fix);
        setLastSent(Date.now());
        lastPost.current = Date.now();
      }
      load();
    };
    if (me || !('geolocation' in navigator)) {
      go(me ?? undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        go({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        }),
      () => go(),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  };

  const delivered = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!cur?.legToken) return;
    if (!cur.needsCode && !window.confirm(`Le colis est bien remis à ${cur.customer.firstName} ?`)) return;
    setBusy('done');
    setError('');
    const r = await driverDelivered(cur.legToken, cur.needsCode ? code : undefined);
    setBusy('');
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setCode('');
    setLive(null);
    const fresh = await fetchDriverTour(token);
    if (fresh.ok) {
      setTour(fresh.data);
      const nxt = fresh.data.current >= 0 ? fresh.data.stops[fresh.data.current] : null;
      setFlash(
        nxt
          ? `✅ ${cur.customer.firstName} livrée. En route vers ${nxt.customer.firstName} : elle vient d'être prévenue.`
          : '✅ Dernière livraison faite !',
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const skip = async () => {
    if (
      !cur ||
      !window.confirm(
        `${cur.customer.firstName} est absente ou injoignable ? La livraison sera reportée et la cliente prévenue.`,
      )
    )
      return;
    setBusy('skip');
    setError('');
    const r = await skipTourStop(token, cur.orderId);
    setBusy('');
    if (r.ok) {
      setTour(r.data);
      setCode('');
      setLive(null);
      setFlash(`↪️ ${cur.customer.firstName} reportée. Livraison suivante démarrée.`);
    } else setError(r.error);
  };

  const markers = useMemo<MapMarker[]>(() => {
    if (!tour) return [];
    const list: MapMarker[] = tour.stops
      .filter(s => s.customer.location)
      .map(s => ({
        id: s.orderId,
        kind: 'stop',
        lat: s.customer.location!.lat,
        lng: s.customer.location!.lng,
        label: String(s.index + 1),
        title: `${s.index + 1}. ${s.customer.firstName}`,
        tone:
          s.state === 'livree'
            ? 'done'
            : s.state === 'reportee' || s.state === 'annulee'
              ? 'skipped'
              : s.index === tour.current
                ? 'current'
                : 'next',
      }));
    if (!tour.startedAt)
      list.unshift({ id: 'shop', kind: 'shop', lat: tour.shop.lat, lng: tour.shop.lng, title: 'Boutique' });
    if (me) list.push({ id: 'driver', kind: 'driver', lat: me.lat, lng: me.lng, icon: VEHICLE_ICONS[tour.vehicle] });
    return list;
  }, [tour, me?.lat, me?.lng]);

  if (error && !tour) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <p className="text-5xl">🛵</p>
          <p className="font-display text-3xl mt-4">{error}</p>
          <p className="text-ink/75 mt-2">Demandez un nouveau lien à la boutique.</p>
        </div>
      </div>
    );
  }
  if (!tour)
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink/40" />
      </div>
    );

  const doneCount = tour.stops.filter(s => s.state === 'livree').length;
  const skipped = tour.stops.filter(s => s.state === 'reportee').length;
  const finished = tour.current < 0;
  const secondsAgo = lastSent ? Math.round((Date.now() - lastSent) / 1000) : null;
  const c = cur?.customer;
  const target = c?.location ?? null;
  const toCollect = cur && cur.paymentStatus !== 'paye';
  const upcoming = tour.stops.filter(s => s.index > tour.current && (s.state === 'attente' || s.state === 'en_route'));

  return (
    <div className="min-h-screen bg-ivory pb-10" data-testid="driver-tour">
      <header className="bg-ink text-ivory px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <BrandMark light compact className="h-8 w-auto" />
            <Wordmark tagline={false} className="h-4 w-auto" />
          </span>
          <span className="text-sm text-right">
            Tournée · {tour.stops.length} livraisons
            <br />
            <span className="text-ivory/70">{km(tour.totalM)}</span>
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: `${(doneCount / tour.stops.length) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-ivory/75" data-testid="tour-progress">
          {doneCount} livrée{doneCount > 1 ? 's' : ''} sur {tour.stops.length}
          {skipped ? ` · ${skipped} reportée${skipped > 1 ? 's' : ''}` : ''}
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {flash && (
          <p
            className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 text-sm font-semibold"
            role="status"
            data-testid="tour-flash"
          >
            {flash}
          </p>
        )}

        {markers.length > 0 && (
          <Suspense fallback={<div className="h-72 rounded-[1.5rem] bg-blush/30 animate-pulse" />}>
            <MapView
              center={target ?? tour.shop}
              zoom={13}
              markers={markers}
              path={driving ? (live?.route ?? null) : null}
              fitMarkers
              className="h-72 rounded-[1.5rem] border border-ink/10"
            />
          </Suspense>
        )}

        {/* Avant le départ : l'ordre de passage */}
        {!tour.startedAt && !finished && cur && (
          <>
            <div className="bg-white rounded-[1.5rem] p-5 shadow-soft">
              <p className="font-display text-2xl">Votre tournée est prête</p>
              <p className="text-sm text-ink/70 mt-1">
                Rangée pour le trajet le plus court : {km(tour.totalM)} au lieu de {km(tour.roundTripsM)} en
                allers-retours. Prenez tous les colis avant de partir.
              </p>
              <ol className="mt-4 space-y-2">
                {tour.stops.map(s => (
                  <li key={s.orderId} className="flex items-center gap-3 text-sm">
                    <span className="w-7 h-7 rounded-full bg-ink text-ivory grid place-items-center text-xs font-bold shrink-0">
                      {s.index + 1}
                    </span>
                    <span className="min-w-0 truncate">
                      <strong>{s.customer.firstName}</strong> · {s.customer.location?.label || s.customer.zone}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <button
              onClick={start}
              disabled={!!busy}
              data-testid="tour-start"
              className="w-full flex items-center justify-center gap-3 h-20 rounded-[1.5rem] bg-wine text-white text-xl font-bold active:scale-[.98] transition-transform"
            >
              {busy === 'start' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />} Démarrer
              la tournée
            </button>
          </>
        )}

        {/* Livraison en cours */}
        {tour.startedAt && cur && c && (
          <>
            <div className="bg-white rounded-[1.5rem] p-5 shadow-soft" data-testid="tour-current">
              <p className="text-sm text-ink/70 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-wine text-white grid place-items-center text-xs font-bold">
                  {cur.index + 1}
                </span>{' '}
                Livraison {cur.index + 1} sur {tour.stops.length} · {cur.orderId}
              </p>
              <p className="font-display text-3xl leading-tight mt-2">
                {c.firstName} {c.lastName}
              </p>
              <p className="mt-1">{c.location?.label || c.zone}</p>
              {c.location?.landmark && <p className="mt-1 font-semibold">🔎 Repère : {c.location.landmark}</p>}
              {c.address && <p className="mt-1 text-ink/70">{c.address}</p>}
              {c.notes && <p className="mt-2 italic text-ink/75">« {c.notes} »</p>}
              <p
                className={`mt-3 inline-flex px-4 py-2 rounded-full text-lg font-bold ${toCollect ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}
              >
                {toCollect ? `💰 À encaisser : ${formatPrice(cur.total)}` : '✅ Déjà payé'}
              </p>
              <p className="text-sm text-ink/70 mt-2">{cur.items} article(s)</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`tel:${c.phone}`}
                className="flex items-center justify-center gap-2 h-16 rounded-2xl bg-emerald-700 text-white text-lg font-semibold"
              >
                <Phone className="w-5 h-5" /> Appeler
              </a>
              <a
                href={`https://wa.me/${waNumber(c.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-16 rounded-2xl bg-[#25D366] text-white text-lg font-semibold"
              >
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </a>
            </div>
            {target && (
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={googleMapsDirections(target)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-ink/15 font-semibold"
                >
                  <Navigation className="w-5 h-5 text-[#1a73e8]" /> Google Maps
                </a>
                <a
                  href={wazeDirections(target)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-ink/15 font-semibold"
                >
                  <Navigation className="w-5 h-5 text-[#33ccff]" /> Waze
                </a>
              </div>
            )}

            {driving ? (
              <>
                <div className="p-4 rounded-2xl bg-white border border-ink/10 text-sm" aria-live="polite">
                  <p className="flex items-center gap-2 font-semibold">
                    <span
                      className={`w-3 h-3 rounded-full ${secondsAgo !== null && secondsAgo < every / 1000 + 30 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
                    />
                    {secondsAgo !== null && secondsAgo < every / 1000 + 30
                      ? `${c.firstName} vous voit sur la carte`
                      : 'En attente du GPS…'}
                  </p>
                  {live?.distanceM != null && live.etaMin != null && (
                    <p className="mt-1 text-ink/75">
                      Encore {formatDistance(live.distanceM)} · ~{formatEta(live.etaMin)}
                    </p>
                  )}
                  {gpsError && <p className="mt-1 text-amber-800">{gpsError}</p>}
                  <p className="mt-1 text-ink/70 text-xs">Gardez cette page ouverte pendant toute la tournée.</p>
                </div>
                {cur.needsCode ? (
                  <form
                    onSubmit={delivered}
                    className="bg-white rounded-[1.5rem] p-5 shadow-soft space-y-3"
                    data-testid="tour-code"
                  >
                    <label htmlFor="tour-code" className="block font-semibold text-lg">
                      🔐 Code de remise de {c.firstName}
                    </label>
                    <p className="text-sm text-ink/70">
                      Remettez le colis, puis demandez le code à 4 chiffres reçu sur WhatsApp.
                    </p>
                    <input
                      id="tour-code"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{4}"
                      required
                      placeholder="• • • •"
                      className="w-full h-16 rounded-2xl border border-ink/15 text-center font-display text-4xl tracking-[0.5em] tabular-nums focus:outline-none focus:border-ink"
                    />
                    <button
                      disabled={!!busy || code.length !== 4}
                      className="w-full flex items-center justify-center gap-3 h-20 rounded-[1.5rem] bg-emerald-700 text-white text-xl font-bold active:scale-[.98] transition-transform disabled:opacity-50"
                    >
                      {busy === 'done' ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6" />
                      )}{' '}
                      Colis remis{upcoming.length ? ' · livraison suivante' : ''}
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => delivered()}
                    disabled={!!busy}
                    className="w-full flex items-center justify-center gap-3 h-20 rounded-[1.5rem] bg-emerald-700 text-white text-xl font-bold"
                  >
                    {busy === 'done' ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}{' '}
                    Colis remis
                  </button>
                )}
                <button
                  onClick={skip}
                  disabled={!!busy}
                  data-testid="tour-skip"
                  className="w-full h-12 rounded-2xl border border-amber-300 text-amber-900 text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  {busy === 'skip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}{' '}
                  Cliente absente : reporter et passer à la suivante
                </button>
              </>
            ) : (
              <button
                onClick={start}
                disabled={!!busy}
                className="w-full flex items-center justify-center gap-3 h-20 rounded-[1.5rem] bg-wine text-white text-xl font-bold"
              >
                {busy === 'start' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />} Partir
                chez {c.firstName}
              </button>
            )}

            {upcoming.length > 0 && (
              <div className="bg-white rounded-[1.5rem] p-5 border border-ink/[0.07]">
                <p className="text-sm font-semibold mb-3">Ensuite</p>
                <ol className="space-y-2">
                  {upcoming.map(s => (
                    <li key={s.orderId} className="flex items-center gap-3 text-sm">
                      <span className="w-7 h-7 rounded-full bg-ink text-ivory grid place-items-center text-xs font-bold shrink-0">
                        {s.index + 1}
                      </span>
                      <span className="min-w-0 truncate">
                        <strong>{s.customer.firstName}</strong> · {s.customer.location?.label || s.customer.zone}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}

        {finished && (
          <div className="text-center p-8 rounded-[1.5rem] bg-emerald-50 text-emerald-900" data-testid="tour-finished">
            <p className="text-5xl">🎉</p>
            <p className="font-display text-3xl mt-3">{tour.cancelled ? 'Tournée annulée' : 'Tournée terminée'}</p>
            <p className="mt-1">
              {doneCount} livraison{doneCount > 1 ? 's' : ''} faite{doneCount > 1 ? 's' : ''}
              {skipped ? `, ${skipped} reportée${skipped > 1 ? 's' : ''} (la boutique s'en occupe)` : ''}. Merci !
            </p>
          </div>
        )}
        {error && <p className="text-center text-wine">{error}</p>}
      </div>
    </div>
  );
};

export default DriverTour;
