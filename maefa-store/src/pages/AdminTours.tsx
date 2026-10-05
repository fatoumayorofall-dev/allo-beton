import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Loader2, MessageCircle, Route, Send, Sparkles, Trash2, Truck } from 'lucide-react';
import type { AdminTour, Order, TourPlan, TourStopState, Vehicle } from '../data/types';
import { cancelTour, createTour, fetchAdminOrders, fetchTours, planTour } from '../services/api';
import { useStore } from '../context/StoreContext';
import { VEHICLE_ICONS, VEHICLE_LABELS, formatPrice } from '../utils/format';
import { waNumber } from '../utils/whatsappMessages';
import type { MapMarker } from '../components/MapView';

const MapView = lazy(() => import('../components/MapView'));

const DRIVERS_KEY = 'maefa_drivers';
type DriverInfo = { name: string; phone: string; vehicle?: Vehicle };
const loadDrivers = (): DriverInfo[] => {
  try {
    return JSON.parse(localStorage.getItem(DRIVERS_KEY) || '[]');
  } catch {
    return [];
  }
};
const rememberDriver = (d: DriverInfo) => {
  try {
    localStorage.setItem(
      DRIVERS_KEY,
      JSON.stringify([d, ...loadDrivers().filter(x => x.phone !== d.phone)].slice(0, 8)),
    );
  } catch {
    /* ignore */
  }
};

const km = (m: number) => `${(m / 1000).toFixed(1).replace('.', ',')} km`;
const duration = (min: number) =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

const STATE: Record<TourStopState, { label: string; tone: string }> = {
  attente: { label: 'À livrer', tone: 'bg-ink/[0.06] text-ink/75' },
  en_route: { label: 'En route', tone: 'bg-wine text-white' },
  livree: { label: 'Livrée', tone: 'bg-emerald-700 text-white' },
  reportee: { label: 'Reportée', tone: 'bg-amber-100 text-amber-900' },
  annulee: { label: 'Annulée', tone: 'bg-ink/10 text-ink/50 line-through' },
};

/** Une commande peut partir en tournée : point sur la carte, pas livrée/annulée, livreur pas encore parti. */
const canTour = (o: Order) =>
  !!o.customer.location &&
  o.status !== 'livree' &&
  o.status !== 'annulee' &&
  (!o.delivery || o.delivery.state === 'assignee');

/**
 * Tournées du jour : la gérante coche les commandes, choisit le livreur, et l'application
 * calcule l'ordre de passage le plus court (départ de la boutique, sans allers-retours).
 */
export const ToursTab: React.FC<{ pin: string }> = ({ pin }) => {
  const { notify } = useStore();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tours, setTours] = useState<AdminTour[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [driver, setDriver] = useState<DriverInfo>(() => loadDrivers()[0] ?? { name: '', phone: '', vehicle: 'moto' });
  const [plan, setPlan] = useState<TourPlan | null>(null);
  const [busy, setBusy] = useState<'' | 'plan' | 'send'>('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ tour: AdminTour; text: string; sent: boolean } | null>(null);

  const reload = useCallback(async () => {
    const [o, t] = await Promise.all([fetchAdminOrders(pin), fetchTours(pin)]);
    if (o) {
      setOrders(o);
      // Par défaut : toutes les commandes prêtes à partir
      setPicked(prev => (prev.size ? prev : new Set(o.filter(canTour).map(x => x.id))));
    }
    if (t) setTours(t);
  }, [pin]);
  useEffect(() => {
    reload();
  }, [reload]);
  // Les tournées en cours se mettent à jour toutes seules
  useEffect(() => {
    if (!tours.some(t => !t.doneAt)) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchTours(pin).then(t => t && setTours(t));
    }, 15000);
    return () => clearInterval(id);
  }, [tours, pin]);

  const ready = useMemo(() => (orders ?? []).filter(canTour), [orders]);
  const noPoint = useMemo(
    () => (orders ?? []).filter(o => !o.customer.location && o.status !== 'livree' && o.status !== 'annulee'),
    [orders],
  );
  const toggle = (id: string) => {
    setPlan(null);
    setPicked(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const ids = ready.filter(o => picked.has(o.id)).map(o => o.id);

  const organise = async () => {
    setBusy('plan');
    setError('');
    setCreated(null);
    const r = await planTour(pin, ids, driver.vehicle ?? 'moto');
    setBusy('');
    if (r.ok) setPlan(r.data);
    else setError(r.error);
  };

  const send = async () => {
    if (!plan) return;
    if (!driver.name.trim() || !driver.phone.trim()) {
      setError('Indiquez le nom et le téléphone du livreur.');
      return;
    }
    setBusy('send');
    setError('');
    const r = await createTour(
      pin,
      plan.stops.map(s => s.orderId),
      { name: driver.name.trim(), phone: driver.phone.trim(), vehicle: driver.vehicle ?? 'moto' },
    );
    setBusy('');
    if (!r.ok) {
      setError(r.error);
      return;
    }
    rememberDriver({ ...driver, name: driver.name.trim(), phone: driver.phone.trim() });
    const sent = !!r.data.sent?.ok && !r.data.sent.simulated;
    setCreated({ tour: r.data.tour, text: r.data.message.text, sent });
    notify(sent ? 'Tournée envoyée au livreur sur WhatsApp' : 'Tournée créée : envoyez le lien au livreur');
    setPlan(null);
    setPicked(new Set());
    reload();
  };

  const cancel = async (t: AdminTour) => {
    if (!window.confirm('Annuler cette tournée ? Les livraisons pas encore parties redeviennent libres.')) return;
    const r = await cancelTour(pin, t.id);
    if (r.ok) {
      notify('Tournée annulée');
      reload();
    } else notify(r.error, 'error');
  };

  const planMarkers = useMemo<MapMarker[]>(
    () =>
      !plan
        ? []
        : [
            { id: 'shop', kind: 'shop', lat: plan.shop.lat, lng: plan.shop.lng, title: 'Boutique (départ)' },
            ...plan.stops.map((s, k) => ({
              id: s.orderId,
              kind: 'stop' as const,
              lat: s.lat,
              lng: s.lng,
              label: String(k + 1),
              title: `${k + 1}. ${s.firstName} — ${s.label || s.zone}`,
            })),
          ],
    [plan],
  );
  const planPath = useMemo<[number, number][] | null>(
    () => (plan ? [[plan.shop.lat, plan.shop.lng], ...plan.stops.map(s => [s.lat, s.lng] as [number, number])] : null),
    [plan],
  );

  if (!orders)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );

  const saved = plan ? Math.max(0, Math.round((1 - plan.totalM / plan.roundTripsM) * 100)) : 0;
  const recent = loadDrivers();

  return (
    <div className="space-y-6" data-testid="tours-tab">
      <div className="bg-ink text-ivory rounded-[2rem] p-6 sm:p-8 relative overflow-hidden">
        <p className="eyebrow !text-gold-light">Livraisons du jour</p>
        <h2 className="font-display text-3xl sm:text-4xl mt-2">Une tournée, le chemin le plus court</h2>
        <p className="text-ivory/75 mt-3 max-w-2xl text-sm leading-relaxed">
          Cochez les commandes, choisissez le livreur : l'application range les adresses de la plus proche à la
          suivante, sans allers-retours. Dès que le livreur démarre une livraison, la cliente est prévenue sur WhatsApp
          et le suit sur la carte. À chaque colis remis, la suivante démarre toute seule.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
        {/* 1. Commandes */}
        <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl">1. Les commandes</h3>
            {ready.length > 0 && (
              <button
                onClick={() => {
                  setPlan(null);
                  setPicked(picked.size === ready.length ? new Set() : new Set(ready.map(o => o.id)));
                }}
                className="text-xs font-semibold underline"
              >
                {picked.size === ready.length ? 'Tout décocher' : 'Tout cocher'}
              </button>
            )}
          </div>
          {ready.length === 0 ? (
            <p className="mt-4 text-sm text-ink/70">Aucune commande à livrer pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-2 max-h-[28rem] overflow-y-auto pr-1" data-testid="tour-orders">
              {ready.map(o => (
                <li key={o.id}>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${picked.has(o.id) ? 'border-ink bg-ivory' : 'border-ink/10'}`}
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(o.id)}
                      onChange={() => toggle(o.id)}
                      className="w-5 h-5 accent-[#3a1f2d]"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate">
                        {o.customer.firstName} {o.customer.lastName}{' '}
                        <span className="font-normal text-ink/55">· {o.id}</span>
                      </span>
                      <span className="block text-xs text-ink/65 truncate">
                        📍 {o.customer.location?.label || o.customer.zone}
                        {isToday(o.createdAt) ? '' : " · commande d'un autre jour"}
                      </span>
                    </span>
                    <span className="text-xs font-semibold shrink-0">{formatPrice(o.total)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {noPoint.length > 0 && (
            <p className="mt-3 text-xs text-amber-800">
              {noPoint.length} commande{noPoint.length > 1 ? 's' : ''} sans point sur la carte (à livrer à part) :{' '}
              {noPoint.map(o => o.customer.firstName).join(', ')}.
            </p>
          )}
        </section>

        {/* 2. Livreur */}
        <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6 space-y-4">
          <h3 className="font-display text-2xl">2. Le livreur</h3>
          {recent.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recent.map(d => (
                <button
                  key={d.phone}
                  type="button"
                  onClick={() => setDriver({ ...d, vehicle: d.vehicle ?? 'moto' })}
                  className={`px-3 h-9 rounded-full text-xs border ${driver.phone === d.phone ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}
                >
                  {VEHICLE_ICONS[d.vehicle ?? 'moto']} {d.name}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Nom</span>
              <input
                value={driver.name}
                onChange={e => setDriver({ ...driver, name: e.target.value })}
                className="field-sm"
                placeholder="Modou"
                aria-label="Nom du livreur"
              />
            </label>
            <label className="block">
              <span className="field-label">Téléphone</span>
              <input
                value={driver.phone}
                onChange={e => setDriver({ ...driver, phone: e.target.value })}
                inputMode="tel"
                className="field-sm"
                placeholder="77 123 45 67"
                aria-label="Téléphone du livreur"
              />
            </label>
          </div>
          <div className="flex gap-2">
            {(['moto', 'voiture'] as Vehicle[]).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setDriver({ ...driver, vehicle: v });
                  setPlan(null);
                }}
                className={`flex-1 h-11 rounded-2xl text-sm border ${(driver.vehicle ?? 'moto') === v ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}
              >
                {VEHICLE_LABELS[v]}
              </button>
            ))}
          </div>
          <button
            onClick={organise}
            disabled={!ids.length || !!busy}
            data-testid="tour-organise"
            className="btn-dark w-full !h-14 disabled:opacity-50"
          >
            {busy === 'plan' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}{' '}
            Organiser la tournée ({ids.length})
          </button>
          {error && (
            <p className="text-sm text-wine" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>

      {/* 3. L'ordre de passage */}
      {plan && (
        <section
          className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6 space-y-5"
          data-testid="tour-plan"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl">3. L'ordre de passage</h3>
              <p className="text-sm text-ink/70 mt-1">
                Départ de la boutique ·{' '}
                {plan.routed ? 'distances par la route' : 'distances estimées (service de routes indisponible)'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-4 h-10 rounded-full bg-emerald-50 text-emerald-900 inline-flex items-center gap-2 font-semibold">
                <Route className="w-4 h-4" /> {km(plan.totalM)}
              </span>
              <span className="px-4 h-10 rounded-full bg-ivory-deep inline-flex items-center">
                au lieu de {km(plan.roundTripsM)} en allers-retours
              </span>
              {saved > 0 && (
                <span
                  className="px-4 h-10 rounded-full bg-gold-pale text-gold-dark inline-flex items-center font-semibold"
                  data-testid="tour-saved"
                >
                  −{saved} % de route
                </span>
              )}
              <span className="px-4 h-10 rounded-full bg-ivory-deep inline-flex items-center">
                ≈ {duration(plan.stops[plan.stops.length - 1]?.etaMin ?? 0)} en tout
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
            <Suspense fallback={<div className="h-80 rounded-[1.5rem] bg-ivory-deep animate-pulse" />}>
              <MapView
                center={plan.shop}
                zoom={12}
                markers={planMarkers}
                path={planPath}
                fitMarkers
                className="h-80 lg:h-[28rem] rounded-[1.5rem] border border-ink/10"
              />
            </Suspense>
            <ol className="space-y-2" data-testid="tour-stops">
              <li className="flex items-center gap-3 p-3 rounded-2xl bg-ivory text-sm">
                <span className="w-8 h-8 rounded-full bg-white border-2 border-ink grid place-items-center font-display italic">
                  M
                </span>{' '}
                Départ : la boutique
              </li>
              {plan.stops.map((s, k) => (
                <li key={s.orderId} className="flex items-center gap-3 p-3 rounded-2xl border border-ink/[0.07]">
                  <span className="w-8 h-8 rounded-full bg-ink text-ivory grid place-items-center text-sm font-bold shrink-0">
                    {k + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">
                      {s.firstName} <span className="font-normal text-ink/55">· {s.orderId}</span>
                    </span>
                    <span className="block text-xs text-ink/65 truncate">{s.label || s.zone}</span>
                  </span>
                  <span className="text-right text-xs shrink-0">
                    <span className="block font-semibold">+{km(s.legM)}</span>
                    <span className="text-ink/60">vers {duration(s.etaMin)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <button
            onClick={send}
            disabled={!!busy}
            data-testid="tour-send"
            className="w-full h-16 rounded-[1.5rem] bg-wine text-white text-base font-semibold inline-flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {busy === 'send' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Envoyer la
            tournée à {driver.name.trim() || 'au livreur'}
          </button>
        </section>
      )}

      {created && (
        <section
          className="rounded-[2rem] bg-emerald-50 border border-emerald-200 p-5 sm:p-6 space-y-3"
          data-testid="tour-created"
        >
          <p className="flex items-center gap-2 font-semibold text-emerald-900">
            <CheckCircle2 className="w-5 h-5" /> Tournée {created.tour.id} créée
            {created.sent ? ' et envoyée sur WhatsApp' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {!created.sent && (
              <a
                href={`https://wa.me/${waNumber(created.tour.driverPhone)}?text=${encodeURIComponent(created.text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 h-11 rounded-full bg-[#177a41] text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Envoyer à {created.tour.driverName} sur WhatsApp
              </a>
            )}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(created.tour.link);
                notify('Lien copié');
              }}
              className="px-4 h-11 rounded-full bg-white border border-ink/15 text-sm inline-flex items-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copier le lien du livreur
            </button>
          </div>
        </section>
      )}

      {/* Tournées en cours et passées */}
      {tours.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-2xl">Tournées</h3>
          {tours.map(t => {
            const done = t.stops.filter(s => s.state === 'livree').length;
            const started = !!t.startedAt;
            return (
              <article
                key={t.id}
                className="bg-white rounded-[1.5rem] border border-ink/[0.06] p-5 space-y-3"
                data-testid="tour-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold flex items-center gap-2">
                    <Truck className="w-4 h-4" /> {VEHICLE_ICONS[t.vehicle]} {t.driverName} · {t.stops.length}{' '}
                    livraisons · {km(t.totalM)}
                  </p>
                  <span
                    className={`px-3 h-8 rounded-full text-xs font-semibold inline-flex items-center ${t.cancelledAt ? 'bg-ink/10 text-ink/60' : t.doneAt ? 'bg-emerald-700 text-white' : started ? 'bg-wine text-white' : 'bg-ivory-deep'}`}
                  >
                    {t.cancelledAt
                      ? 'Annulée'
                      : t.doneAt
                        ? 'Terminée'
                        : started
                          ? `En cours · ${done}/${t.stops.length}`
                          : 'Pas encore partie'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-ink/[0.07] overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{ width: `${(done / t.stops.length) * 100}%` }}
                  />
                </div>
                <ol className="flex flex-wrap gap-1.5">
                  {t.stops.map((s, k) => (
                    <li
                      key={s.orderId}
                      className={`px-2.5 h-7 rounded-full text-[11px] inline-flex items-center ${STATE[s.state].tone}`}
                      title={`${s.orderId} · ${STATE[s.state].label}`}
                    >
                      {k + 1}. {s.firstName}
                    </li>
                  ))}
                </ol>
                {!t.doneAt && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(t.link);
                        notify('Lien copié');
                      }}
                      className="px-3 h-9 rounded-full border border-ink/15 text-xs inline-flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Lien du livreur
                    </button>
                    {!started && (
                      <button
                        onClick={() => cancel(t)}
                        className="px-3 h-9 rounded-full border border-wine/30 text-wine text-xs inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Annuler
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default ToursTab;
