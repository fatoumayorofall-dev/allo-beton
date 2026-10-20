import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, ExternalLink, Loader2 } from 'lucide-react';
import {
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
import { F, STATUS_LABELS, STATUS_STYLES, ago } from '../marketplace/format';

type Sub = 'verifier' | 'vendeurs' | 'commandes' | 'reglages';
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
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [o, l, s, c] = await Promise.all([
      adminOverview(pin),
      adminListings(pin, 'en_attente'),
      adminSellers(pin),
      adminOrders(pin),
    ]);
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
      });
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
            ['vendeurs', `Vendeurs (${sellers.length})`],
            ['commandes', `Commandes (${orders.length})`],
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
              {v.description && <p className="text-sm text-ink/70 mt-1">{v.description}</p>}
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
                  onClick={() => patchSeller(v, { trusted: !v.trusted })}
                  className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                >
                  {v.trusted ? 'Retirer la confiance' : 'Vendeur de confiance'}
                </button>
                {v.balance.balance > 0 && (
                  <button
                    onClick={() => payment(v)}
                    className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold"
                  >
                    Paiement reçu
                  </button>
                )}
              </div>
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
