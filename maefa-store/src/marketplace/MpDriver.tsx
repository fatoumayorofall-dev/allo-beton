import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, Car, CheckCircle2, Footprints, Loader2, MapPin, Package, Phone, RefreshCw, Wallet } from 'lucide-react';
import {
  acceptTrip,
  deliveryFailed,
  fetchMyDriver,
  fetchTripOffers,
  payoutSent,
  saveMyDriver,
  setPresence,
  stopDone,
  type Driver,
  type DriverBalance,
  type DriverCash,
  type DriverTrip,
  type TripOffer,
  type TripStop,
} from './api';
import { MP, mpPath } from './config';
import { F, PAYMENT_LABELS } from './format';
import { useAccount } from '../context/AccountContext';
import { usePageTitle } from '../utils/usePageTitle';

const VEHICLES = [
  { id: 'moto', label: 'Moto', Icon: Bike },
  { id: 'voiture', label: 'Voiture', Icon: Car },
  { id: 'velo', label: 'Vélo', Icon: Bike },
  { id: 'pied', label: 'À pied', Icon: Footprints },
] as const;
const mapsLink = (at: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${at.lat},${at.lng}`;

/** Position du téléphone, si le livreur l'accepte (pour lui proposer les courses les plus proches). */
const here = () =>
  new Promise<{ lat: number; lng: number } | undefined>(resolve => {
    if (!navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(undefined),
      { timeout: 8000, maximumAge: 60000 },
    );
  });

const SignupForm: React.FC<{ initial?: Driver; onSaved: () => void }> = ({ initial, onSaved }) => {
  const { user } = useAccount();
  const [name, setName] = useState(initial?.name ?? [user?.firstName, user?.lastName].filter(Boolean).join(' '));
  const [vehicle, setVehicle] = useState<string>(initial?.vehicle ?? 'moto');
  const [zone, setZone] = useState(initial?.zone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="bg-white rounded-3xl border border-ink/[0.06] p-5 space-y-4"
      data-testid="mp-driver-form"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        const r = await saveMyDriver({ name, vehicle, zone });
        setBusy(false);
        if (!r.ok) return setError(r.error);
        onSaved();
      }}
    >
      <h1 className="font-display text-3xl">Devenir livreur</h1>
      <p className="text-sm text-ink/70">
        Livrez quand vous voulez. Vous gardez votre part de chaque course ({MP.name} prend une petite commission) et, en
        moitié-moitié, une course à plusieurs colis vous rapporte plus qu'une course seule.
      </p>
      <label className="block">
        <span className="field-label">Nom et prénom *</span>
        <input value={name} onChange={e => setName(e.target.value)} className="field" maxLength={60} />
      </label>
      <fieldset>
        <legend className="field-label">Je livre en *</legend>
        <div className="grid grid-cols-4 gap-2">
          {VEHICLES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={vehicle === id}
              onClick={() => setVehicle(id)}
              className={`h-16 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 ${vehicle === id ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}
            >
              <Icon className="w-5 h-5" /> {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="field-label">Quartier où vous êtes le plus souvent</span>
        <input value={zone} onChange={e => setZone(e.target.value)} className="field" placeholder="Médina" />
      </label>
      {error && (
        <p className="text-sm text-wine" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} className="btn-dark w-full !h-12" data-testid="mp-driver-save">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : initial ? 'Enregistrer' : "M'inscrire"}
      </button>
    </form>
  );
};

/** Un arrêt de la course : ce qu'il faut faire, qui appeler, combien encaisser et envoyer. */
const StopCard: React.FC<{
  stop: TripStop;
  index: number;
  onDone: (code: string) => void;
  onFail: (reason: 'absent' | 'refus') => void;
  busy: boolean;
}> = ({ stop: s, index, onDone, onFail, busy }) => {
  const [code, setCode] = useState('');
  const title = { enlevement: 'Récupérer', depot: 'Livrer', retour: 'Rapporter au vendeur' }[s.kind];
  const ready = !s.needsCode || code.length === 4;
  return (
    <li
      className={`rounded-2xl border p-4 ${s.done ? 'bg-ivory border-transparent opacity-70' : 'bg-white border-ink/[0.08]'}`}
      data-testid="mp-stop"
    >
      <p className="text-xs uppercase tracking-[0.16em] font-semibold text-ink/55">
        Arrêt {index + 1} · {title}
      </p>
      <p className="mt-1 font-semibold text-lg">
        {s.kind === 'depot' ? `🏠 ${s.buyerName}` : `${s.kind === 'retour' ? '↩️' : '📦'} ${s.shopName}`}
      </p>
      <p className="text-sm text-ink/75">
        {s.at.label}
        {s.at.landmark && ` · ${s.at.landmark}`}
      </p>
      {s.items && <p className="text-sm mt-1">{s.items.join(', ')}</p>}
      {s.money && s.kind === 'depot' && !s.failed && (
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm" data-testid="mp-stop-money">
          <div className="rounded-xl bg-emerald-50 p-2">
            <dt className="text-xs text-ink/60">À encaisser ({PAYMENT_LABELS[s.payment ?? 'especes']})</dt>
            <dd className="font-bold text-lg">{F(s.money.collect)}</dd>
          </div>
          <div className="rounded-xl bg-ivory p-2">
            <dt className="text-xs text-ink/60">À envoyer au vendeur</dt>
            <dd className="font-bold">{F(s.money.sellerGets)}</dd>
          </div>
          <div className="rounded-xl bg-ivory p-2">
            <dt className="text-xs text-ink/60">Vous gardez</dt>
            <dd className="font-bold">{F(s.money.driverKeeps)}</dd>
          </div>
          <div className="rounded-xl bg-ivory p-2">
            <dt className="text-xs text-ink/60">Pour {MP.name}</dt>
            <dd className="font-bold">{F(s.money.platformGets)}</dd>
          </div>
        </dl>
      )}
      {s.note && <p className="mt-2 text-sm italic">« {s.note} »</p>}
      {!s.done && (
        <>
          {s.needsCode && (
            <label className="mt-3 block">
              <span className="block text-sm text-ink/75">
                {s.kind === 'depot'
                  ? 'Donnez le colis, puis demandez le code de remise à la personne (il est sur son téléphone).'
                  : s.kind === 'retour'
                    ? 'Rendez le colis, puis demandez le code de remise au vendeur (ou au point relais).'
                    : 'En prenant le colis, demandez le code de remise au vendeur (ou au point relais).'}
              </span>
              <input
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="····"
                aria-label="Code de remise"
                className="field mt-1 !w-44 tracking-[0.4em] text-center text-lg"
                data-testid="mp-stop-code"
              />
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {s.phone && (
              <a
                href={`tel:${s.phone}`}
                className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Phone className="w-4 h-4" /> Appeler
              </a>
            )}
            <a
              href={mapsLink(s.at)}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4" /> Itinéraire
            </a>
            <button
              disabled={busy || !ready}
              onClick={() => onDone(code)}
              className="btn-dark !h-10 !px-5"
              data-testid={`mp-stop-${s.kind}`}
            >
              {s.kind === 'enlevement'
                ? 'Colis récupéré'
                : s.kind === 'retour'
                  ? 'Colis rendu'
                  : `Livré, ${F(s.money?.collect ?? 0)} encaissés`}
            </button>
          </div>
          {s.kind === 'depot' && (
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {(
                [
                  ['absent', 'Client absent'],
                  ['refus', 'Refuse le colis'],
                ] as const
              ).map(([reason, label]) => (
                <button
                  key={reason}
                  disabled={busy}
                  onClick={() =>
                    window.confirm(`${label} : le colis sera rapporté au vendeur. Vous l'avez bien appelé ?`) &&
                    onFail(reason)
                  }
                  className="h-9 px-3 rounded-full border border-wine/30 text-wine font-semibold"
                  data-testid={`mp-stop-${reason}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {s.done &&
        (s.failed ? (
          <p className="mt-2 text-sm text-wine font-semibold">
            ✗ Non livré ({s.failed === 'absent' ? 'client absent' : 'refus'}) : colis à rapporter
          </p>
        ) : (
          <p className="mt-2 text-sm text-emerald-800 font-semibold">✓ Fait</p>
        ))}
    </li>
  );
};

/**
 * Espace livreur : disponibilité, courses proposées (express ou moitié-moitié), arrêts dans l'ordre,
 * argent à encaisser et à envoyer (méthode A), solde dû à la plateforme.
 */
export default function MpDriver() {
  usePageTitle(`Livreur · ${MP.name}`);
  const { status } = useAccount();
  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const [balance, setBalance] = useState<DriverBalance | null>(null);
  const [cash, setCash] = useState<DriverCash | null>(null);
  const [trip, setTrip] = useState<DriverTrip | null>(null);
  const [offers, setOffers] = useState<TripOffer[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const r = await fetchMyDriver();
    if (!r.ok) return setDriver(null);
    setDriver(r.data.driver);
    setBalance(r.data.balance ?? null);
    setCash(r.data.cash ?? null);
    setTrip(r.data.trip ?? null);
    if (r.data.driver?.status === 'active') {
      const o = await fetchTripOffers();
      if (o.ok) setOffers(o.data.trips);
    }
  }, []);
  useEffect(() => {
    if (status === 'user') load();
  }, [status, load]);
  // Pendant une course : la position est envoyée (au plus toutes les 20 s) pour que la cliente suive son livreur
  useEffect(() => {
    if (!trip || !navigator.geolocation) return;
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      p => {
        if (Date.now() - last < 20000) return;
        last = Date.now();
        setPresence(true, { lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [trip]);

  // Nouvelles courses toutes les 20 secondes quand on est disponible
  useEffect(() => {
    if (!driver?.online || trip) return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [driver?.online, trip, load]);

  if (status !== 'user')
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Bike className="w-12 h-12 mx-auto text-ink/30" strokeWidth={1.3} />
        <h1 className="font-display text-3xl mt-4">Livrez avec {MP.name}</h1>
        <p className="text-ink/70 mt-2">Inscrivez-vous avec votre numéro de téléphone.</p>
        <Link
          to={mpPath(`/compte?retour=${encodeURIComponent(mpPath('/livreur'))}`)}
          className="btn-dark mt-6 inline-flex !h-12 !px-6"
        >
          Me connecter
        </Link>
      </div>
    );
  if (driver === undefined)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  if (!driver)
    return (
      <div className="max-w-xl mx-auto px-4 pt-6">
        <SignupForm onSaved={load} />
      </div>
    );
  if (driver.status !== 'active')
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" data-testid="mp-driver-pending">
        <p className="font-display text-3xl">
          {driver.status === 'suspendue' ? 'Compte suspendu' : 'Inscription reçue'}
        </p>
        <p className="text-ink/70 mt-2">
          {driver.status === 'suspendue'
            ? 'Contactez-nous pour en savoir plus.'
            : 'Notre équipe vérifie votre inscription (pièce d’identité à montrer). Vous serez prévenu sur WhatsApp.'}
        </p>
      </div>
    );

  const toggle = async () => {
    setBusy(true);
    const r = await setPresence(!driver.online, !driver.online ? await here() : undefined);
    setBusy(false);
    if (r.ok) {
      setDriver(r.data.driver);
      load();
    }
  };
  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setMessage('');
    const r = await fn();
    setBusy(false);
    if (!r.ok) setMessage(r.error ?? 'Erreur');
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4" data-testid="mp-driver">
      <section className="bg-white rounded-3xl border border-ink/[0.06] p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-ink/55 font-semibold">Livreur</p>
          <h1 className="font-display text-3xl">{driver.name}</h1>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          aria-pressed={driver.online}
          data-testid="mp-driver-online"
          className={`h-12 px-5 rounded-full font-semibold text-sm ${driver.online ? 'bg-emerald-700 text-white' : 'border border-ink/20'}`}
        >
          {driver.online ? '● Disponible' : 'Je suis disponible'}
        </button>
      </section>
      {message && (
        <p className="text-sm text-wine" role="alert">
          {message}
        </p>
      )}

      {trip ? (
        <section className="space-y-3" data-testid="mp-driver-trip">
          <h2 className="font-display text-2xl">
            Course en cours · {trip.mode === 'partagee' ? 'moitié-moitié' : 'express'} ·{' '}
            {trip.km.toLocaleString('fr-FR')} km
          </h2>
          <ol className="space-y-3">
            {trip.stops.map((s, i) => (
              <StopCard
                key={`${s.orderId}-${s.kind}`}
                stop={s}
                index={i}
                busy={busy}
                onDone={code => act(() => stopDone(trip.id, s.orderId, s.kind, code))}
                onFail={reason => act(() => deliveryFailed(trip.id, s.orderId, reason))}
              />
            ))}
          </ol>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Courses disponibles</h2>
            <button
              onClick={load}
              aria-label="Actualiser"
              className="w-10 h-10 rounded-full border border-ink/15 grid place-items-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {cash?.blocked && (
            <p className="rounded-2xl bg-amber-50 text-amber-950 p-3 text-sm" data-testid="mp-driver-blocked">
              Vous gardez {F(cash.held)} (plafond {F(cash.cap)}) : envoyez leur part aux vendeurs et versez les
              commissions à {MP.name} pour recevoir de nouvelles courses.
            </p>
          )}
          {!offers.length && (
            <p className="text-sm text-ink/70">
              Aucune course prête pour l'instant.{' '}
              {driver.online ? 'La liste se met à jour toute seule.' : 'Passez en « disponible ».'}
            </p>
          )}
          {offers.map(o => (
            <article key={o.id} className="bg-white rounded-2xl border border-ink/[0.07] p-4" data-testid="mp-offer">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${o.mode === 'partagee' ? 'bg-emerald-100 text-emerald-900' : 'bg-ink/10'}`}
                >
                  {o.mode === 'partagee' ? `Moitié-moitié · ${o.orders} colis` : 'Express'}
                </span>
                <span className="text-xl font-bold" data-testid="mp-offer-earn">
                  +{F(o.earn)}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink/75 flex items-center gap-1.5">
                <Package className="w-4 h-4" /> {o.shops.join(', ')} · {o.km.toLocaleString('fr-FR')} km
                {o.toFirstKm !== null && ` · à ${o.toFirstKm.toLocaleString('fr-FR')} km de vous`}
              </p>
              <button
                disabled={busy}
                onClick={() => act(() => acceptTrip(o.id))}
                className="btn-dark w-full !h-12 mt-3"
                data-testid="mp-offer-accept"
              >
                Accepter la course
              </button>
            </article>
          ))}
        </section>
      )}

      {balance && (
        <section
          className="bg-white rounded-3xl border border-ink/[0.06] p-5 space-y-3"
          data-testid="mp-driver-balance"
        >
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Mon argent
          </h2>
          <dl className="grid grid-cols-3 gap-2">
            {[
              ['Livraisons', String(balance.deliveries)],
              ['Gagné', F(balance.earned)],
              [`Dû à ${MP.name}`, F(balance.balance)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-ivory p-3">
                <dt className="text-xs text-ink/60">{k}</dt>
                <dd className="text-lg font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {balance.payoutsToSend.length > 0 && (
            <div>
              <h3 className="font-semibold">À envoyer aux vendeurs (Wave ou Orange Money)</h3>
              <ul className="mt-2 space-y-2">
                {balance.payoutsToSend.map(p => (
                  <li key={p.orderId} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {p.shopName} · {p.orderId} : <strong>{F(p.amount)}</strong>
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => act(() => payoutSent(p.orderId))}
                      className="h-9 px-4 rounded-full border border-ink/15 font-semibold"
                      data-testid="mp-payout-sent"
                    >
                      <CheckCircle2 className="w-4 h-4 inline mr-1" /> Envoyé
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cash && (
            <p className="text-sm" data-testid="mp-driver-cash">
              Argent que vous gardez pour les autres : <strong>{F(cash.held)}</strong> sur {F(cash.cap)} autorisés.
            </p>
          )}
          <p className="text-xs text-ink/60">
            Réglez ce que vous devez à {MP.name} par Wave chaque semaine ; la gérante l'enregistre à réception. Au-delà
            du plafond, vous ne recevez plus de course.
          </p>
        </section>
      )}
    </div>
  );
}
