import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MessageCircle, Navigation, Phone, Play } from 'lucide-react';
import { googleMapsDirections, wazeDirections } from '../config/site';
import { driverDelivered, driverPosition, driverStart, fetchDriverJob, type DriverJob, type GpsFix } from '../services/api';
import { VEHICLE_ICONS, VEHICLE_LABELS, formatDistance, formatEta, formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { waNumber } from '../utils/whatsappMessages';
import type { MapMarker } from '../components/MapView';

const MapView = lazy(() => import('../components/MapView'));

// Position envoyée toutes les 4 s à moto en ville, toutes les 15 s sur la route (économise la batterie)
const SEND_EVERY_MS = { moto: 4000, voiture: 15000, car: 15000 } as const;

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
 * Très simple : gros boutons, itinéraire Google Maps / Waze, appels,
 * et sa position envoyée automatiquement pendant la course.
 * En relais, chaque livreur ne voit que son étape : de qui il reçoit le colis, à qui il le remet.
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

  const load = useCallback(() => fetchDriverJob(token).then(r => (r.ok ? setJob(r.data) : setError(r.error))), [token]);
  useEffect(() => { load(); }, [load]);

  const state = job?.leg.state;
  const driving = state === 'en_route';
  const every = SEND_EVERY_MS[job?.leg.vehicle ?? 'moto'];
  useWakeLock(driving);

  // En attente du colis : on suit le livreur précédent (actualisé toutes les 10 s)
  useEffect(() => {
    if (state !== 'attente' || !job?.prev) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 10000);
    return () => clearInterval(t);
  }, [state, !!job?.prev, load]);

  // Suivi GPS continu pendant la course : au plus une position par intervalle, la plus récente
  const pending = useRef<GpsFix | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const send = useCallback((fix: GpsFix) => {
    pending.current = fix;
    if (timer.current) return;
    const flush = async () => {
      timer.current = undefined;
      const next = pending.current;
      if (!next) return;
      pending.current = null;
      lastPost.current = Date.now();
      const r = await driverPosition(token, next);
      if (r.ok) { setLastSent(Date.now()); setLive(r.data); }
    };
    timer.current = setTimeout(flush, Math.max(0, lastPost.current + every - Date.now()));
  }, [token, every]);
  useEffect(() => () => clearTimeout(timer.current), []);

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
    const who = job?.next ? job.next.driverName : 'la cliente';
    if (!window.confirm(`Le colis est bien remis à ${who} ?`)) return;
    setBusy('done');
    const r = await driverDelivered(token);
    setBusy('');
    if (r.ok) setJob(r.data); else setError(r.error);
  };

  const target = job?.leg.target ?? null;
  const pickup = job?.leg.pickup?.lat != null ? job.leg.pickup : null;
  const prevPos = state === 'attente' ? job?.prev?.position ?? null : null;
  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (state === 'attente' && job?.prev) {
      // Rendez-vous : le point de relais et le livreur précédent qui arrive
      if (pickup) list.push({ id: 'relay', kind: 'relay', lat: pickup.lat!, lng: pickup.lng!, label: pickup.label });
      if (prevPos) list.push({ id: 'driver', kind: 'driver', lat: prevPos.lat, lng: prevPos.lng, label: job?.prev?.driverName, icon: VEHICLE_ICONS[job!.prev!.vehicle] });
      return list;
    }
    if (target) list.push({ id: 'dest', kind: job?.leg.final ? 'home' : 'relay', lat: target.lat, lng: target.lng, label: target.label ?? job?.order.customer.firstName });
    if (me && driving) list.push({ id: 'driver', kind: 'driver', lat: me.lat, lng: me.lng, icon: VEHICLE_ICONS[job!.leg.vehicle] });
    return list;
  }, [state, target?.lat, target?.lng, pickup?.lat, pickup?.lng, prevPos?.lat, prevPos?.lng, me?.lat, me?.lng, driving]);

  if (error && !job) {
    return <div className="min-h-screen grid place-items-center p-6 text-center"><div><p className="text-5xl">🛵</p><p className="font-display text-3xl mt-4">{error}</p><p className="text-ink/60 mt-2">Demandez un nouveau lien à la boutique.</p></div></div>;
  }
  if (!job) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-ink/40" /></div>;

  const c = job.order.customer;
  const { leg, prev, next } = job;
  const relay = leg.total > 1;
  const toCollect = job.order.paymentStatus !== 'paye';
  const secondsAgo = lastSent ? Math.round((Date.now() - lastSent) / 1000) : null;
  const call = (phone: string, label: string) => (
    <div className="grid grid-cols-2 gap-3">
      <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 h-16 rounded-2xl bg-emerald-700 text-white text-lg font-semibold"><Phone className="w-5 h-5" /> {label}</a>
      <a href={`https://wa.me/${waNumber(phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-16 rounded-2xl bg-[#25D366] text-white text-lg font-semibold"><MessageCircle className="w-5 h-5" /> WhatsApp</a>
    </div>
  );
  const mapCenter = markers[0] ?? target ?? c.location;

  return (
    <div className="min-h-screen bg-ivory pb-10" data-testid="driver-page">
      <header className="bg-ink text-ivory px-5 py-4 flex items-center justify-between">
        <span className="font-script text-3xl">Fabima</span>
        <span className="text-sm text-right">Livraison {job.order.id}{relay && <><br />🔁 Étape {leg.index + 1} sur {leg.total}</>}</span>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {relay && (
          <div className="bg-white rounded-[1.5rem] p-5 shadow-soft space-y-3" data-testid="driver-mission">
            <p className="text-sm text-ink/55">Votre mission · {VEHICLE_LABELS[leg.vehicle]}</p>
            <p className="text-lg"><span className="text-2xl">📦</span> {prev ? <>Recevoir le colis de <strong>{prev.driverName}</strong>{leg.pickup && <> à <strong>{leg.pickup.label}</strong></>}</> : <>Prendre le colis <strong>à la boutique</strong></>}</p>
            <p className="text-lg"><span className="text-2xl">{leg.final ? '🏠' : '🤝'}</span> {leg.final ? <>Le livrer à <strong>{c.firstName} {c.lastName}</strong></> : <>Le remettre à <strong>{next?.driverName}</strong> à <strong>{leg.to?.label}</strong></>}</p>
          </div>
        )}

        {leg.final && (
          <>
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
            {state !== 'remis' && call(c.phone, 'Appeler')}
          </>
        )}

        {/* En attente : le livreur précédent arrive avec le colis */}
        {state === 'attente' && prev && (
          <div className="bg-white rounded-[1.5rem] p-5 border border-ink/10 space-y-3" data-testid="driver-waiting">
            <p className="font-semibold text-lg">{VEHICLE_ICONS[prev.vehicle]} {prev.driverName} {prev.state === 'en_route' ? 'arrive avec le colis' : 'n\'est pas encore parti'}</p>
            {prev.state === 'en_route' && prev.etaMin != null && <p className="text-ink/60">Au point de relais dans ~{formatEta(prev.etaMin)}</p>}
            {call(prev.driverPhone, `Appeler ${prev.driverName}`)}
          </div>
        )}

        {mapCenter && markers.length > 0 && (
          <Suspense fallback={<div className="h-72 rounded-[1.5rem] bg-blush/30 animate-pulse" />}>
            <MapView center={mapCenter} zoom={15} markers={markers} fitMarkers className="h-72 rounded-[1.5rem] border border-ink/10" />
          </Suspense>
        )}
        {state === 'attente' && prev && pickup && (
          <div className="grid grid-cols-2 gap-3">
            <a href={googleMapsDirections(pickup as { lat: number; lng: number })} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-ink/15 font-semibold"><Navigation className="w-5 h-5 text-[#1a73e8]" /> Aller au relais</a>
            <a href={wazeDirections(pickup as { lat: number; lng: number })} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-ink/15 font-semibold"><Navigation className="w-5 h-5 text-[#33ccff]" /> Waze</a>
          </div>
        )}
        {state !== 'remis' && !(state === 'attente' && prev) && target && (
          <div className="grid grid-cols-2 gap-3">
            <a href={googleMapsDirections(target)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-ink/15 font-semibold"><Navigation className="w-5 h-5 text-[#1a73e8]" /> Google Maps</a>
            <a href={wazeDirections(target)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-ink/15 font-semibold"><Navigation className="w-5 h-5 text-[#33ccff]" /> Waze</a>
          </div>
        )}

        {state === 'attente' && (
          <button onClick={start} disabled={!!busy} className="w-full flex items-center justify-center gap-3 h-20 rounded-[1.5rem] bg-wine text-white text-xl font-bold active:scale-[.98] transition-transform">
            {busy === 'start' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />} {prev ? 'J\'ai reçu le colis, je pars' : 'Démarrer la course'}
          </button>
        )}

        {driving && (
          <>
            <div className="p-4 rounded-2xl bg-white border border-ink/10 text-sm" aria-live="polite">
              <p className="flex items-center gap-2 font-semibold">
                <span className={`w-3 h-3 rounded-full ${secondsAgo !== null && secondsAgo < every / 1000 + 30 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {secondsAgo !== null && secondsAgo < every / 1000 + 30 ? 'La cliente vous voit sur la carte' : 'En attente du GPS…'}
              </p>
              {live?.distanceM != null && live.etaMin != null && <p className="mt-1 text-ink/60">Encore {formatDistance(live.distanceM)} · ~{formatEta(live.etaMin)}</p>}
              {gpsError && <p className="mt-1 text-amber-800">{gpsError}</p>}
              <p className="mt-1 text-ink/45 text-xs">Gardez cette page ouverte pendant le trajet{leg.vehicle !== 'moto' && ' (téléphone branché si le trajet est long)'}.</p>
            </div>
            {next && call(next.driverPhone, `Appeler ${next.driverName}`)}
            <button onClick={delivered} disabled={!!busy} className="w-full flex items-center justify-center gap-3 h-20 rounded-[1.5rem] bg-emerald-700 text-white text-xl font-bold active:scale-[.98] transition-transform">
              {busy === 'done' ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />} {next ? `Colis remis à ${next.driverName}` : 'Colis remis'}
            </button>
          </>
        )}

        {state === 'remis' && (
          <div className="text-center p-8 rounded-[1.5rem] bg-emerald-50 text-emerald-900">
            <p className="text-5xl">✅</p>
            <p className="font-display text-3xl mt-3">{leg.final ? 'Livraison terminée' : 'Relais passé'}</p>
            <p className="mt-1">{leg.final ? 'Merci ! La cliente a été prévenue.' : `Merci ! ${next?.driverName} continue la livraison.`}</p>
          </div>
        )}
        {error && <p className="text-center text-wine">{error}</p>}
      </div>
    </div>
  );
};

export default Driver;
