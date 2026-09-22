import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MessageCircle, Navigation, Phone, Play } from 'lucide-react';
import { googleMapsDirections, wazeDirections } from '../config/site';
import { driverDelivered, driverPosition, driverStart, fetchDriverJob, type DriverJob, type GpsFix } from '../services/api';
import { formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { waNumber } from '../utils/whatsappMessages';
import type { MapMarker } from '../components/MapView';

const MapView = lazy(() => import('../components/MapView'));

const SEND_EVERY_MS = 4000;

/** Garde l'écran allumé pendant la course (sinon le téléphone se met en veille et le GPS s'arrête). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
    request();
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); lock?.release().catch(() => {}); };
  }, [active]);
}

/**
 * Page du livreur (lien secret reçu sur WhatsApp).
 * Très simple : gros boutons, itinéraire Google Maps / Waze, appel de la cliente,
 * et sa position envoyée automatiquement pendant la course.
 */
export const Driver: React.FC = () => {
  usePageTitle('Livraison');
  const { token = '' } = useParams();
  const [job, setJob] = useState<DriverJob | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'' | 'start' | 'done'>('');
  const [me, setMe] = useState<GpsFix | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [lastSent, setLastSent] = useState<number | null>(null);
  const [live, setLive] = useState<{ distanceM: number | null; etaMin: number | null } | null>(null);
  const [, tick] = useState(0);
  const lastPost = useRef(0);

  useEffect(() => {
    fetchDriverJob(token).then(r => (r.ok ? setJob(r.data) : setError(r.error)));
  }, [token]);

  const state = job?.delivery.state;
  const driving = state === 'en_route';
  useWakeLock(driving);

  // Suivi GPS continu pendant la course
  const send = useCallback(async (fix: GpsFix) => {
    const now = Date.now();
    if (now - lastPost.current < SEND_EVERY_MS) return;
    lastPost.current = now;
    const r = await driverPosition(token, fix);
    if (r.ok) { setLastSent(Date.now()); setLive(r.data); }
  }, [token]);

  useEffect(() => {
    if (!driving || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      pos => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading, speed: pos.coords.speed };
        setMe(fix);
        setGpsError('');
        send(fix);
      },
      err => setGpsError(err.code === err.PERMISSION_DENIED ? 'Autorisez la localisation pour que la cliente vous voie sur la carte.' : 'Signal GPS faible…'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
    const t = setInterval(() => tick(n => n + 1), 5000);
    return () => { navigator.geolocation.clearWatch(id); clearInterval(t); };
  }, [driving, send]);

  const start = () => {
    setBusy('start');
    const go = async (fix?: GpsFix) => {
      const r = await driverStart(token, fix);
      setBusy('');
      if (r.ok) { setJob(r.data); if (fix) { setMe(fix); setLastSent(Date.now()); lastPost.current = Date.now(); } } else setError(r.error);
    };
    if (!('geolocation' in navigator)) { go(); return; }
    navigator.geolocation.getCurrentPosition(
      pos => go({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading, speed: pos.coords.speed }),
      () => go(),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const delivered = async () => {
    if (!window.confirm('Le colis est bien remis à la cliente ?')) return;
    setBusy('done');
    const r = await driverDelivered(token);
    setBusy('');
    if (r.ok) setJob(r.data); else setError(r.error);
  };

  const dest = job?.order.customer.location ?? null;
  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (dest) list.push({ id: 'home', kind: 'home', lat: dest.lat, lng: dest.lng, label: job?.order.customer.firstName });
    if (me && driving) list.push({ id: 'driver', kind: 'driver', lat: me.lat, lng: me.lng });
    return list;
  }, [dest?.lat, dest?.lng, me?.lat, me?.lng, driving]);

  if (error && !job) {
    return <div className="min-h-screen grid place-items-center p-6 text-center"><div><p className="text-5xl">🛵</p><p className="font-display text-3xl mt-4">{error}</p><p className="text-ink/60 mt-2">Demandez un nouveau lien à la boutique.</p></div></div>;
  }
  if (!job) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-ink/40" /></div>;

  const c = job.order.customer;
  const toCollect = job.order.paymentStatus !== 'paye';
  const secondsAgo = lastSent ? Math.round((Date.now() - lastSent) / 1000) : null;

  return (
    <div className="min-h-screen bg-ivory pb-10" data-testid="driver-page">
      <header className="bg-ink text-ivory px-5 py-4 flex items-center justify-between">
        <span className="font-script text-3xl">Fabima</span>
        <span className="text-sm">Livraison {job.order.id}</span>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="bg-white rounded-[1.5rem] p-5 shadow-soft">
          <p className="text-sm text-ink/55">Cliente</p>
          <p className="font-display text-3xl leading-tight">{c.firstName} {c.lastName}</p>
          <p className="mt-1">{c.location?.label || c.zone}</p>
          {c.location?.landmark && <p className="mt-1 font-semibold">🔎 Repère : {c.location.landmark}</p>}
          {c.address && <p className="mt-1 text-ink/70">{c.address}</p>}
          {c.notes && <p className="mt-2 italic text-ink/60">« {c.notes} »</p>}
          <p className={`mt-3 inline-flex px-4 py-2 rounded-full text-lg font-bold ${toCollect ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
            {toCollect ? `💰 À encaisser : ${formatPrice(job.order.total)}` : '✅ Déjà payé'}
          </p>
          <p className="text-sm text-ink/55 mt-2">{job.order.items} article(s)</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a href={`tel:${c.phone}`} className="flex items-center justify-center gap-2 h-16 rounded-2xl bg-emerald-700 text-white text-lg font-semibold"><Phone className="w-5 h-5" /> Appeler</a>
          <a href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-16 rounded-2xl bg-[#25D366] text-white text-lg font-semibold"><MessageCircle className="w-5 h-5" /> WhatsApp</a>
        </div>

        {dest && (
          <>
            <Suspense fallback={<div className="h-72 rounded-[1.5rem] bg-blush/30 animate-pulse" />}>
              <MapView center={dest} zoom={16} markers={markers} fitMarkers className="h-72 rounded-[1.5rem] border border-ink/10" />
            </Suspense>
            <div className="grid grid-cols-2 gap-3">
              <a href={googleMapsDirections(dest)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-ink/15 font-semibold"><Navigation className="w-5 h-5 text-[#1a73e8]" /> Google Maps</a>
              <a href={wazeDirections(dest)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-ink/15 font-semibold"><Navigation className="w-5 h-5 text-[#33ccff]" /> Waze</a>
            </div>
          </>
        )}

        {state === 'assignee' && (
          <button onClick={start} disabled={!!busy} className="w-full flex items-center justify-center gap-3 h-20 rounded-[1.5rem] bg-wine text-white text-xl font-bold active:scale-[.98] transition-transform">
            {busy === 'start' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />} Démarrer la course
          </button>
        )}

        {driving && (
          <>
            <div className="p-4 rounded-2xl bg-white border border-ink/10 text-sm" aria-live="polite">
              <p className="flex items-center gap-2 font-semibold">
                <span className={`w-3 h-3 rounded-full ${secondsAgo !== null && secondsAgo < 30 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {secondsAgo !== null && secondsAgo < 30 ? 'La cliente vous voit sur la carte' : 'En attente du GPS…'}
              </p>
              {live?.distanceM != null && <p className="mt-1 text-ink/60">Encore {live.distanceM < 1000 ? `${live.distanceM} m` : `${(live.distanceM / 1000).toFixed(1)} km`} · ~{live.etaMin} min</p>}
              {gpsError && <p className="mt-1 text-amber-800">{gpsError}</p>}
              <p className="mt-1 text-ink/45 text-xs">Gardez cette page ouverte pendant le trajet.</p>
            </div>
            <button onClick={delivered} disabled={!!busy} className="w-full flex items-center justify-center gap-3 h-20 rounded-[1.5rem] bg-emerald-700 text-white text-xl font-bold active:scale-[.98] transition-transform">
              {busy === 'done' ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />} Colis remis
            </button>
          </>
        )}

        {state === 'livree' && (
          <div className="text-center p-8 rounded-[1.5rem] bg-emerald-50 text-emerald-900">
            <p className="text-5xl">✅</p>
            <p className="font-display text-3xl mt-3">Livraison terminée</p>
            <p className="mt-1">Merci ! La cliente a été prévenue.</p>
          </div>
        )}
        {error && <p className="text-center text-wine">{error}</p>}
      </div>
    </div>
  );
};

export default Driver;
