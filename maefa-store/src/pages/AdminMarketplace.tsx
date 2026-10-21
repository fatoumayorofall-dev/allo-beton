import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import type { DeliveryLocation } from '../data/types';
import { BadgeCheck, ExternalLink, Loader2 } from 'lucide-react';
import {
  adminRelays,
  adminSaveRelay,
  type AdminRelay,
  adminDisputes,
  adminResolveDispute,
  type AdminDispute,
  adminActivatePro,
  adminBoost,
  adminLives,
  adminSellerDashboard,
  type DashboardDays,
  adminStopLive,
  type AdminLive,
  adminCloseTrip,
  adminDriverPayment,
  adminDrivers,
  adminPatchDriver,
  adminTrips,
  type AdminDriver,
  type AdminTrip,
  adminListings,
  adminModerate,
  adminOrders,
  adminOverview,
  adminPatchSeller,
  adminPayment,
  adminSellers,
  adminSettings,
  type AdminSeller,
  type MpOrder,
  type MyListing,
  type MpSeller,
  type Overview,
} from '../marketplace/api';
import { MP, mpPath } from '../marketplace/config';
import { SellerDashboard } from '../marketplace/SellerDashboard';
import { PaymentsTab } from './AdminPayments';
import { F, STATUS_LABELS, STATUS_STYLES, ago } from '../marketplace/format';

type Sub =
  | 'verifier'
  | 'lives'
  | 'litiges'
  | 'vendeurs'
  | 'livreurs'
  | 'courses'
  | 'relais'
  | 'securite'
  | 'paiements'
  | 'commandes'
  | 'reglages';
const LocationPicker = lazy(() => import('../components/LocationPicker'));
const SecurityPanel = lazy(() => import('./AdminSecurity'));

/** Ajouter un point relais : boutique partenaire où les vendeurs déposent leurs colis. */
const RelayForm: React.FC<{ pin: string; onSaved: () => void }> = ({ pin, onSaved }) => {
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [hours, setHours] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<DeliveryLocation | undefined>();
  const [error, setError] = useState('');
  return (
    <form
      className="bg-white rounded-2xl border border-ink/[0.06] p-5 space-y-3"
      data-testid="admin-mp-relay-form"
      onSubmit={async e => {
        e.preventDefault();
        const r = await adminSaveRelay(pin, { name, zone, hours, phone: phone || null, location });
        if (!r.ok) return setError(r.error);
        setName('');
        setZone('');
        setHours('');
        setPhone('');
        setLocation(undefined);
        setError('');
        onSaved();
      }}
    >
      <h3 className="font-display text-xl">Nouveau point relais</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">Nom *</span>
          <input value={name} onChange={e => setName(e.target.value)} className="field" placeholder="Boutique Fatou" />
        </label>
        <label className="block">
          <span className="field-label">Quartier</span>
          <input value={zone} onChange={e => setZone(e.target.value)} className="field" placeholder="Médina" />
        </label>
        <label className="block">
          <span className="field-label">Horaires</span>
          <input value={hours} onChange={e => setHours(e.target.value)} className="field" placeholder="9 h – 20 h" />
        </label>
        <label className="block">
          <span className="field-label">Téléphone (pour les livreurs)</span>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="field" inputMode="tel" />
        </label>
      </div>
      <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin text-ink/40" />}>
        <LocationPicker
          label="Emplacement *"
          value={location}
          onChange={setLocation}
          initialCenter={location ?? { lat: 14.6937, lng: -17.4441 }}
        />
      </Suspense>
      {error && (
        <p className="text-sm text-wine" role="alert">
          {error}
        </p>
      )}
      <button className="btn-dark !h-11 !px-6">Ajouter</button>
    </form>
  );
};
/** Tableau de bord d'une boutique, ouvert par la gérante pour l'aider */
const SellerDashboardFor: React.FC<{ pin: string; id: string }> = ({ pin, id }) => {
  const load = useCallback((days: DashboardDays) => adminSellerDashboard(pin, id, days), [pin, id]);
  return (
    <div className="mt-4 rounded-2xl bg-ivory p-3" data-testid="admin-mp-seller-dashboard">
      <SellerDashboard load={load} />
    </div>
  );
};
type PendingListing = MyListing & { seller: (MpSeller & { status: string }) | null };
const SELLER_STATUS: Record<string, [string, string]> = {
  en_attente: ['À valider', 'bg-amber-100 text-amber-900'],
  active: ['Validée', 'bg-emerald-100 text-emerald-900'],
  suspendue: ['Suspendue', 'bg-red-100 text-red-900'],
  fermee: ['Fermée', 'bg-ink/10 text-ink/70'],
};

/**
 * Place de marché, côté gérante : vendeurs à valider, articles à vérifier (contrefaçons, objets interdits),
 * commandes, commissions à encaisser et réglages des taux.
 */
export const MarketplaceTab: React.FC<{ pin: string }> = ({ pin }) => {
  const [sub, setSub] = useState<Sub>('verifier');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pending, setPending] = useState<PendingListing[]>([]);
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [orders, setOrders] = useState<MpOrder[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [relays, setRelays] = useState<AdminRelay[]>([]);
  const [lives, setLives] = useState<AdminLive[]>([]);
  const [openDash, setOpenDash] = useState<string | null>(null);
  const [driversOn, setDriversOn] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [o, l, s, c, d, t] = await Promise.all([
      adminOverview(pin),
      adminListings(pin, 'en_attente'),
      adminSellers(pin),
      adminOrders(pin),
      adminDrivers(pin),
      adminTrips(pin),
    ]);
    const [dz, rl, lv] = await Promise.all([adminDisputes(pin), adminRelays(pin), adminLives(pin)]);
    if (lv.ok) setLives(lv.data.lives);
    if (dz.ok) setDisputes(dz.data.disputes);
    if (rl.ok) setRelays(rl.data.relays);
    if (d.ok) setDrivers(d.data.drivers);
    if (t.ok) setTrips(t.data.trips);
    if (o.ok) {
      setOverview(o.data);
      const st = o.data.settings;
      setForm({
        sellerRate: String(Math.round(st.sellerRate * 1000) / 10),
        buyerFee: String(st.buyerFee),
        driverRate: String(Math.round(st.driverRate * 1000) / 10),
        base: String(st.delivery.base),
        perKm: String(st.delivery.perKm),
        min: String(st.delivery.min),
        max: String(st.delivery.max),
        freeListings: String(st.freeListings),
        proPrice: String(st.proPrice),
        proRate: String(Math.round(st.proRate * 1000) / 10),
        driverCashCap: String(st.driverCashCap),
        newSellerMaxOrder: String(st.newSellerMaxOrder),
        boostPrice: String(st.boostPrice),
      });
      setDriversOn(st.drivers);
    }
    if (l.ok) setPending(l.data.listings);
    if (s.ok) setSellers(s.data.sellers);
    if (c.ok) setOrders(c.data.orders);
  }, [pin]);
  useEffect(() => {
    load();
  }, [load]);

  if (!overview)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );

  const moderate = async (l: PendingListing, status: 'publiee' | 'refusee') => {
    let reason = '';
    if (status === 'refusee') {
      reason = window.prompt('Raison du refus (envoyée au vendeur) : contrefaçon, photo floue…') ?? '';
      if (!reason) return;
    }
    const r = await adminModerate(pin, l.id, status, reason);
    if (!r.ok) return setMessage(r.error);
    load();
  };
  const patchSeller = async (v: AdminSeller, body: { status?: string; trusted?: boolean }) => {
    const r = await adminPatchSeller(pin, v.id, body);
    if (!r.ok) return setMessage(r.error);
    load();
  };
  const payment = async (v: AdminSeller) => {
    const amount = Number(window.prompt(`Montant reçu de « ${v.shopName} » (F CFA)`, String(v.balance.balance)));
    if (!amount) return;
    const r = await adminPayment(pin, v.id, amount, 'Commission reçue');
    if (!r.ok) return setMessage(r.error);
    load();
  };
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = (k: string) => Number(form[k]);
    const r = await adminSettings(pin, {
      sellerRate: n('sellerRate') / 100,
      buyerFee: n('buyerFee'),
      driverRate: n('driverRate') / 100,
      delivery: { base: n('base'), perKm: n('perKm'), min: n('min'), max: n('max') },
      freeListings: n('freeListings'),
      proPrice: n('proPrice'),
      proRate: n('proRate') / 100,
      driverCashCap: n('driverCashCap'),
      newSellerMaxOrder: n('newSellerMaxOrder'),
      boostPrice: n('boostPrice'),
      drivers: driversOn,
    });
    setMessage(r.ok ? 'Réglages enregistrés' : r.error);
    if (r.ok) load();
  };

  const cards: [string, string | number][] = [
    ['Vendeurs à valider', overview.sellers.en_attente],
    ['Articles à vérifier', overview.listingsPending],
    ['Commandes en cours', overview.ordersActive],
    ['Ventes livrées', F(overview.sales)],
    ['Commissions gagnées', F(overview.earned)],
    ['Reste à encaisser', F(overview.outstanding)],
    ['Abonnements Pro', F(overview.subscriptions)],
    ['Mises « À la une »', F(overview.boosts ?? 0)],
    ['Livreurs disponibles', `${overview.drivers.online} / ${overview.drivers.active}`],
    ['Courses en cours', overview.tripsOpen],
    ['Signalements ouverts', disputes.filter(d => d.status === 'ouvert').length],
  ];

  return (
    <div className="space-y-5" data-testid="admin-marketplace">
      <div className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">Place de marché</h2>
          <p className="text-sm text-ink/70 mt-1">
            {MP.name} (nom provisoire) · {overview.sellers.active} vendeur(s) validé(s) · {overview.listingsPublished}{' '}
            article(s) en ligne
          </p>
        </div>
        <a href={mpPath()} target="_blank" rel="noopener noreferrer" className="btn-outline !h-11 !px-5">
          <ExternalLink className="w-4 h-4" /> Ouvrir la place de marché
        </a>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl border border-ink/[0.06] p-4">
            <p className="text-xs text-ink/60">{k}</p>
            <p className="text-2xl font-bold mt-1">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            ['verifier', `À vérifier (${pending.length})`],
            ['lives', `Lives (${lives.filter(l => l.status !== 'termine').length})`],
            ['litiges', `Signalements (${disputes.filter(d => d.status === 'ouvert').length})`],
            ['vendeurs', `Vendeurs (${sellers.length})`],
            ['commandes', `Commandes (${orders.length})`],
            ['livreurs', `Livreurs (${drivers.length})`],
            ['courses', `Courses (${trips.length})`],
            ['relais', `Points relais (${relays.filter(r => r.active).length})`],
            ['paiements', 'Paiements en ligne'],
            ['securite', 'Sécurité'],
            ['reglages', 'Commissions & livraison'],
          ] as [Sub, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setSub(id);
              setMessage('');
            }}
            aria-current={sub === id ? 'page' : undefined}
            className={`shrink-0 h-10 px-4 rounded-full text-sm border ${sub === id ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/10'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p className="text-sm" role="status">
          {message}
        </p>
      )}

      {sub === 'lives' && (
        <div className="space-y-3" data-testid="admin-mp-lives">
          <p className="text-sm text-ink/70">
            Lives en cours et terminés depuis moins d'une heure. Arrêtez un live qui montre une contrefaçon, un objet
            interdit ou un contenu choquant : la vendeuse est prévenue.
          </p>
          {!lives.length && <p className="text-sm text-ink/70">Aucun live pour le moment.</p>}
          {lives.map(l => (
            <article
              key={l.id}
              className="bg-white rounded-2xl border border-ink/[0.06] p-4"
              data-testid="admin-mp-live"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {l.seller?.shopName} · « {l.title} »
                </p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${l.status === 'termine' ? 'bg-ink/10 text-ink/70' : 'bg-red-100 text-red-900'}`}
                >
                  {l.status === 'termine' ? 'Terminé' : l.status === 'coupure' ? 'Coupure réseau' : 'En direct'}
                </span>
              </div>
              <p className="text-sm text-ink/70 mt-1">
                {l.viewers} spectatrice(s) · {l.peak} au plus · {l.likes} cœur(s) · {l.sales} commande(s), {F(l.amount)}
              </p>
              {l.reports.length > 0 && (
                <ul className="mt-2 text-sm text-wine" data-testid="admin-mp-live-reports">
                  {l.reports.map((r, i) => (
                    <li key={i}>🚩 {r.reason || 'Signalé sans raison'}</li>
                  ))}
                </ul>
              )}
              {l.status !== 'termine' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={mpPath(`/live/${l.id}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold inline-flex items-center"
                  >
                    Regarder
                  </a>
                  <button
                    onClick={async () => {
                      const reason = window.prompt('Pourquoi arrêter ce live ? (la vendeuse recevra ce message)');
                      if (reason === null) return;
                      const r = await adminStopLive(pin, l.id, reason);
                      if (!r.ok) return setMessage(r.error);
                      load();
                    }}
                    className="h-10 px-4 rounded-full border border-wine/30 text-wine text-sm font-semibold"
                    data-testid="admin-mp-live-stop"
                  >
                    Arrêter le live
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {sub === 'verifier' && (
        <div className="space-y-3">
          {!pending.length && <p className="text-sm text-ink/70">Rien à vérifier pour le moment.</p>}
          {pending.map(l => (
            <article
              key={l.id}
              className="bg-white rounded-2xl border border-ink/[0.06] p-4"
              data-testid="admin-mp-pending"
            >
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {l.photos.map(p => (
                  <a key={p} href={p} target="_blank" rel="noopener noreferrer">
                    <img src={p} alt="" className="w-28 h-28 rounded-xl object-cover bg-ivory" />
                  </a>
                ))}
              </div>
              <p className="mt-2 font-semibold">
                {l.title} · {F(l.price)}{' '}
                <span className="text-ink/55 font-normal text-sm">
                  · {l.condition} · {l.seller?.shopName} ({SELLER_STATUS[l.seller?.status ?? 'en_attente'][0]})
                </span>
              </p>
              {l.description && <p className="text-sm text-ink/75 mt-1 line-clamp-3">{l.description}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => moderate(l, 'publiee')}
                  className="btn-dark !h-10 !px-5"
                  data-testid="admin-mp-publish"
                >
                  Publier
                </button>
                <button
                  onClick={() => moderate(l, 'refusee')}
                  className="h-10 px-4 rounded-full border border-wine/30 text-wine text-sm font-semibold"
                >
                  Refuser
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {sub === 'vendeurs' && (
        <div className="space-y-3">
          {sellers.map(v => (
            <article
              key={v.id}
              className="bg-white rounded-2xl border border-ink/[0.06] p-4"
              data-testid="admin-mp-seller"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold flex items-center gap-1.5">
                  {v.shopName}
                  {v.trusted && <BadgeCheck className="w-4 h-4 text-emerald-700" aria-label="De confiance" />}
                  <span className="text-ink/55 font-normal text-sm">
                    · {v.zone} · {v.ownerPhone} · {v.listings} article(s)
                  </span>
                </p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SELLER_STATUS[v.status][1]}`}>
                  {SELLER_STATUS[v.status][0]}
                </span>
              </div>
              <p className="text-sm mt-1">
                Formule :{' '}
                <strong>
                  {v.plan === 'pro'
                    ? `Pro jusqu'au ${new Date(v.planUntil!).toLocaleDateString('fr-FR')}`
                    : 'Découverte'}
                </strong>
                {v.planRequestedAt && v.plan !== 'pro' && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
                    Demande de formule Pro
                  </span>
                )}
                {v.boostUntil ? (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-gold-pale text-ink text-xs font-semibold">
                    À la une jusqu'au {new Date(v.boostUntil).toLocaleDateString('fr-FR')}
                  </span>
                ) : (
                  v.boostRequestedAt && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
                      Demande « À la une »
                    </span>
                  )
                )}
                {!!v.referrals && (
                  <span className="ml-2 text-xs text-ink/60">
                    · {v.referrals} boutique(s) parrainée(s), {v.referralMonths} mois Pro offert(s)
                  </span>
                )}
              </p>
              {v.description && <p className="text-sm text-ink/70 mt-1">{v.description}</p>}
              {v.risk.alert && (
                <p className="text-sm mt-2 text-wine font-semibold" data-testid="admin-mp-risk">
                  ⚠️ {v.risk.dropped} commandes refusées ou annulées sur {v.risk.orders} ({v.risk.rate} %) : vente hors
                  application possible. Appelez les acheteurs pour vérifier.
                </p>
              )}
              <p className="text-sm mt-2">
                Ventes livrées : {F(v.balance.sales)} · commissions dues : {F(v.balance.due)} · reste :{' '}
                <strong>{F(v.balance.balance)}</strong>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {v.status !== 'active' && v.status !== 'fermee' && (
                  <button
                    onClick={() => patchSeller(v, { status: 'active' })}
                    className="btn-dark !h-10 !px-5"
                    data-testid="admin-mp-validate"
                  >
                    Valider la boutique
                  </button>
                )}
                {v.status === 'active' && (
                  <button
                    onClick={() => patchSeller(v, { status: 'suspendue' })}
                    className="h-10 px-4 rounded-full border border-wine/30 text-wine text-sm font-semibold"
                  >
                    Suspendre
                  </button>
                )}
                <button
                  onClick={() => setOpenDash(openDash === v.id ? null : v.id)}
                  aria-expanded={openDash === v.id}
                  className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                  data-testid="admin-mp-dashboard"
                >
                  {openDash === v.id ? 'Fermer le tableau de bord' : 'Tableau de bord'}
                </button>
                <button
                  onClick={() => patchSeller(v, { trusted: !v.trusted })}
                  className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                >
                  {v.trusted ? 'Retirer la confiance' : 'Vendeur de confiance'}
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Paiement de la formule Pro reçu de « ${v.shopName} » ? (1 mois)`)) return;
                    const r = await adminActivatePro(pin, v.id, 1);
                    if (!r.ok) return setMessage(r.error);
                    load();
                  }}
                  className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                  data-testid="admin-mp-pro"
                >
                  {v.plan === 'pro' ? 'Prolonger Pro (1 mois)' : 'Activer Pro (1 mois)'}
                </button>
                {v.status === 'active' && (
                  <button
                    onClick={async () => {
                      const weeks = Number(
                        window.prompt(
                          `Paiement reçu de « ${v.shopName} » pour être à la une : combien de semaines ? (${F(overview?.settings.boostPrice ?? 0)} la semaine)`,
                          '1',
                        ),
                      );
                      if (!weeks) return;
                      const r = await adminBoost(pin, v.id, weeks);
                      if (!r.ok) return setMessage(r.error);
                      load();
                    }}
                    className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                    data-testid="admin-mp-boost"
                  >
                    {v.boostUntil ? 'Prolonger « À la une »' : 'Mettre « À la une »'}
                  </button>
                )}
                {v.balance.balance > 0 && (
                  <button
                    onClick={() => payment(v)}
                    className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                  >
                    Paiement reçu
                  </button>
                )}
              </div>
              {openDash === v.id && <SellerDashboardFor pin={pin} id={v.id} />}
            </article>
          ))}
          {!sellers.length && <p className="text-sm text-ink/70">Aucun vendeur pour le moment.</p>}
        </div>
      )}

      {sub === 'commandes' && (
        <div className="bg-white rounded-2xl border border-ink/[0.06] divide-y divide-ink/[0.06]">
          {!orders.length && <p className="p-4 text-sm text-ink/70">Aucune commande.</p>}
          {orders.map(o => (
            <div key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <strong>{o.id}</strong> · {o.shopName} → {o.buyer.name} · {ago(o.createdAt)}
              </span>
              <span className="flex items-center gap-3">
                <span>{F(o.total)}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {sub === 'litiges' && (
        <div className="space-y-3" data-testid="admin-mp-disputes">
          {!disputes.length && <p className="text-sm text-ink/70">Aucun problème signalé.</p>}
          {disputes.map(d => (
            <article
              key={d.orderId}
              className="bg-white rounded-2xl border border-ink/[0.06] p-4"
              data-testid="admin-mp-dispute"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {d.problem}{' '}
                  <span className="text-ink/55 font-normal text-sm">
                    · {d.orderId} · {d.shopName} · {d.buyer.name} ({d.buyer.phone}) · {F(d.total)} · {ago(d.at)}
                  </span>
                  {d.codeChecked && (
                    <span className="block text-xs font-normal text-emerald-800">
                      Remise confirmée avec le code de la cliente
                    </span>
                  )}
                </p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${d.status === 'ouvert' ? 'bg-amber-100 text-amber-900' : 'bg-ink/10'}`}
                >
                  {d.status === 'ouvert' ? 'À traiter' : d.status === 'resolu' ? 'Résolu' : 'Rejeté'}
                </span>
              </div>
              {d.text && <p className="text-sm mt-1">« {d.text} »</p>}
              {d.resolution && <p className="text-sm mt-1 text-ink/70">Solution : {d.resolution}</p>}
              {d.status === 'ouvert' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['resolu', 'rejete'] as const).map(st => (
                    <button
                      key={st}
                      onClick={async () => {
                        const resolution = window.prompt(
                          st === 'resolu'
                            ? 'Solution trouvée (envoyée à la cliente) : échange, remboursement par le vendeur…'
                            : 'Raison (envoyée à la cliente)',
                        );
                        if (!resolution) return;
                        const r = await adminResolveDispute(pin, d.orderId, st, resolution);
                        if (!r.ok) return setMessage(r.error);
                        load();
                      }}
                      className={
                        st === 'resolu'
                          ? 'btn-dark !h-10 !px-5'
                          : 'h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold'
                      }
                      data-testid={`admin-mp-dispute-${st}`}
                    >
                      {st === 'resolu' ? 'Résolu' : 'Rejeter'}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {sub === 'livreurs' && (
        <div className="space-y-3">
          {!drivers.length && <p className="text-sm text-ink/70">Aucun livreur inscrit.</p>}
          {drivers.map(d => (
            <article
              key={d.id}
              className="bg-white rounded-2xl border border-ink/[0.06] p-4"
              data-testid="admin-mp-driver"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {d.name}{' '}
                  <span className="text-ink/55 font-normal text-sm">
                    · {d.vehicle} · {d.zone} · {d.phone} {d.online && '· ● disponible'}
                  </span>
                </p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SELLER_STATUS[d.status][1]}`}>
                  {SELLER_STATUS[d.status][0]}
                </span>
              </div>
              <p className="text-sm mt-1">
                {d.balance.deliveries} livraison(s) · gagné {F(d.balance.earned)} · doit à la plateforme{' '}
                <strong>{F(d.balance.balance)}</strong>
                {d.balance.payoutsToSend.length > 0 && (
                  <span className="text-wine">
                    {' '}
                    · {d.balance.payoutsToSend.length} versement(s) aux vendeurs en attente
                  </span>
                )}
              </p>
              <p className={`text-sm ${d.cash.blocked ? 'text-wine font-semibold' : 'text-ink/70'}`}>
                Argent gardé : {F(d.cash.held)} sur un plafond de {F(d.cash.cap)}
                {d.cashCap != null && ' (plafond propre à ce livreur)'}
                {d.cash.blocked && ' · plus de nouvelle course'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.status !== 'active' && d.status !== 'fermee' && (
                  <button
                    onClick={async () => {
                      const r = await adminPatchDriver(pin, d.id, { status: 'active' });
                      if (!r.ok) return setMessage(r.error);
                      load();
                    }}
                    className="btn-dark !h-10 !px-5"
                    data-testid="admin-mp-driver-validate"
                  >
                    Valider (pièce d'identité vue)
                  </button>
                )}
                {d.status === 'active' && (
                  <button
                    onClick={async () => {
                      await adminPatchDriver(pin, d.id, { status: 'suspendue' });
                      load();
                    }}
                    className="h-10 px-4 rounded-full border border-wine/30 text-wine text-sm font-semibold"
                  >
                    Suspendre
                  </button>
                )}
                {d.balance.balance > 0 && (
                  <button
                    onClick={async () => {
                      const amount = Number(
                        window.prompt(`Montant reçu de ${d.name} (F CFA)`, String(d.balance.balance)),
                      );
                      if (!amount) return;
                      const r = await adminDriverPayment(pin, d.id, amount);
                      if (!r.ok) return setMessage(r.error);
                      load();
                    }}
                    className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                  >
                    Paiement reçu
                  </button>
                )}
                <button
                  onClick={async () => {
                    const cap = window.prompt(
                      `Plafond d'argent pour ${d.name} (F CFA). Laissez vide pour le plafond général.`,
                      d.cashCap != null ? String(d.cashCap) : '',
                    );
                    if (cap === null) return;
                    const r = await adminPatchDriver(pin, d.id, { cashCap: cap.trim() ? Number(cap) : null });
                    if (!r.ok) return setMessage(r.error);
                    load();
                  }}
                  className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                >
                  Plafond
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {sub === 'paiements' && <PaymentsTab pin={pin} />}

      {sub === 'securite' && (
        <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-ink/40" />}>
          <SecurityPanel pin={pin} onMessage={setMessage} />
        </Suspense>
      )}

      {sub === 'relais' && (
        <div className="space-y-3" data-testid="admin-mp-relays">
          <p className="text-sm text-ink/70">
            Boutiques partenaires où les vendeurs sans adresse fixe (ou qui veulent rester discrets) déposent leurs
            colis. Le livreur récupère le colis au relais : il ne voit jamais le vendeur.
          </p>
          {relays.map(r => (
            <article
              key={r.id}
              className="bg-white rounded-2xl border border-ink/[0.06] p-4 flex flex-wrap items-center justify-between gap-2"
            >
              <span className="text-sm">
                <strong>{r.name}</strong> · {r.zone} · {r.location.label} {r.hours && `· ${r.hours}`}{' '}
                {r.phone && `· ${r.phone}`}
              </span>
              <button
                onClick={async () => {
                  await adminSaveRelay(pin, { id: r.id, active: !r.active });
                  load();
                }}
                className="h-9 px-4 rounded-full border border-ink/15 text-sm font-semibold"
              >
                {r.active ? 'Désactiver' : 'Réactiver'}
              </button>
            </article>
          ))}
          <RelayForm pin={pin} onSaved={load} />
        </div>
      )}

      {sub === 'courses' && (
        <div
          className="bg-white rounded-2xl border border-ink/[0.06] divide-y divide-ink/[0.06]"
          data-testid="admin-mp-trips"
        >
          {!trips.length && <p className="p-4 text-sm text-ink/70">Aucune course.</p>}
          {trips.map(t => (
            <div key={t.id} className="p-4 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{t.id}</strong> ·{' '}
                {t.mode === 'partagee' ? `moitié-moitié (${t.orders.length} colis)` : 'express'} · {t.status}
                {t.price && ` · ${F(t.price.total)} · ${t.price.km.toLocaleString('fr-FR')} km`}
                {t.driver && ` · ${t.driver.name}`}
                {t.status === 'ouverte' &&
                  t.deadline &&
                  ` · départ ${new Date(t.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
              </span>
              {t.status === 'ouverte' && (
                <button
                  onClick={async () => {
                    await adminCloseTrip(pin, t.id);
                    load();
                  }}
                  className="h-9 px-4 rounded-full border border-ink/15 font-semibold"
                  data-testid="admin-mp-close-trip"
                >
                  Lancer maintenant
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {sub === 'reglages' && (
        <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-ink/[0.06] p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {(
              [
                ['sellerRate', 'Commission vendeur (%)'],
                ['buyerFee', 'Frais de service acheteur (F)'],
                ['driverRate', 'Commission livreur (%)'],
                ['base', 'Livraison : prise en charge (F)'],
                ['perKm', 'Livraison : prix au km (F)'],
                ['min', 'Livraison : minimum (F)'],
                ['max', 'Livraison : maximum (F)'],
                ['freeListings', 'Formule Découverte : articles au plus'],
                ['proPrice', 'Formule Pro : prix par mois (F)'],
                ['proRate', 'Formule Pro : commission (%)'],
                ['driverCashCap', 'Livreur : argent gardé au plus (F)'],
                ['newSellerMaxOrder', 'Nouvelle boutique : commande au plus (F)'],
                ['boostPrice', '« À la une » : prix par semaine (F)'],
              ] as [string, string][]
            ).map(([k, label]) => (
              <label key={k} className="block">
                <span className="field-label">{label}</span>
                <input
                  value={form[k] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  inputMode="decimal"
                  className="field"
                />
              </label>
            ))}
          </div>
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-ivory" data-testid="admin-mp-drivers-toggle">
            <input
              type="checkbox"
              checked={driversOn}
              onChange={e => setDriversOn(e.target.checked)}
              className="mt-1 w-5 h-5"
            />
            <span className="text-sm">
              <strong>Livreurs de la plateforme</strong> (express et moitié-moitié). Activez quand des livreurs sont
              validés : le vendeur ne voit plus le client, le livreur encaisse et vous verse les commissions. Sinon, le
              vendeur livre lui-même.
            </span>
          </label>
          <p className="text-sm text-ink/70">
            Exemple avec ces réglages : un article de 10 000 F livré à 5 km rapporte{' '}
            {F(Number(form.sellerRate) * 100 + Number(form.buyerFee))} (vendeur + acheteur), plus la commission du
            livreur sur la course.
          </p>
          <button className="btn-dark !h-11 !px-6">Enregistrer</button>
        </form>
      )}
    </div>
  );
};

export default MarketplaceTab;
