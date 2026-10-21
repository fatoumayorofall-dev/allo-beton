import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Loader2, MapPin, Pencil, Phone, Plus, Store, Trash2, Wallet } from 'lucide-react';
import {
  confirmPayout,
  fetchConfig,
  fetchRelays,
  fetchMyListings,
  fetchMySeller,
  fetchSales,
  moveSale,
  removeListing,
  requestPro,
  saveMySeller,
  type Balance,
  type MpCategory,
  type MpOrder,
  type MpSettings,
  type MyListing,
  type MySeller,
  type OrderStatus,
  type PickupMode,
  type Relay,
} from './api';
import { ListingForm } from './ListingForm';
import { MP, mpPath } from './config';
import { recall, remember } from './offline';
import { F, PAYMENT_LABELS, STATUS_LABELS, STATUS_STYLES, ago } from './format';
import { useAccount } from '../context/AccountContext';
import { DELIVERY_ZONES, SITE_CONFIG } from '../config/site';
import type { DeliveryLocation } from '../data/types';
import { usePageTitle } from '../utils/usePageTitle';

const LocationPicker = lazy(() => import('../components/LocationPicker'));
const DAKAR = { lat: 14.7167, lng: -17.4677 };
const LISTING_STATUS: Record<MyListing['status'], [string, string]> = {
  en_attente: ['En vérification', 'bg-amber-100 text-amber-900'],
  publiee: ['En ligne', 'bg-emerald-100 text-emerald-900'],
  refusee: ['Refusé', 'bg-red-100 text-red-900'],
  retiree: ['Retiré', 'bg-ink/10 text-ink/70'],
};
/** Boutons d'action du vendeur à chaque étape d'une commande */
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string; danger?: boolean }[]>> = {
  nouvelle: [
    { to: 'acceptee', label: 'Accepter' },
    { to: 'refusee', label: 'Refuser', danger: true },
  ],
  acceptee: [
    { to: 'prete', label: 'Colis prêt' },
    { to: 'annulee', label: 'Annuler', danger: true },
  ],
  prete: [
    { to: 'en_livraison', label: 'Parti en livraison' },
    { to: 'annulee', label: 'Annuler', danger: true },
  ],
  en_livraison: [{ to: 'livree', label: 'Livrée et payée' }],
};
/** Livraison par un livreur de la plateforme : le vendeur prépare le colis, le livreur fait le reste */
const NEXT_DRIVER: Partial<Record<OrderStatus, { to: OrderStatus; label: string; danger?: boolean }[]>> = {
  nouvelle: NEXT.nouvelle,
  acceptee: NEXT.acceptee,
  prete: [{ to: 'annulee', label: 'Annuler', danger: true }],
};
const byDriver = (o: MpOrder) => o.delivery.mode === 'express' || o.delivery.mode === 'partagee';
const nextFor = (o: MpOrder) => (byDriver(o) ? NEXT_DRIVER : NEXT)[o.status];

/* ---------- Ouvrir / modifier sa boutique ---------- */
const ShopForm: React.FC<{
  categories: MpCategory[];
  sellerRate: number;
  initial?: MySeller;
  onSaved: (s: MySeller) => void;
  onCancel?: () => void;
}> = ({ categories, sellerRate, initial, onSaved, onCancel }) => {
  const [shopName, setShopName] = useState(initial?.shopName ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [zone, setZone] = useState(initial?.zone ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [location, setLocation] = useState<DeliveryLocation | undefined>(initial?.location);
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone?.replace(/^\+221/, '') ?? '');
  const [pickupMode, setPickupMode] = useState<PickupMode>(initial?.pickupMode ?? 'fixe');
  const [relayId, setRelayId] = useState(initial?.relay?.id ?? '');
  const [relays, setRelays] = useState<Relay[]>([]);
  useEffect(() => {
    fetchRelays().then(r => r.ok && setRelays(r.data.relays));
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupMode === 'relais' && !relayId) return setError('Choisissez votre point relais');
    if (pickupMode !== 'relais' && !location)
      return setError(
        pickupMode === 'variable'
          ? 'Indiquez votre quartier sur la carte (approximatif)'
          : 'Indiquez sur la carte où le livreur récupère les colis',
      );
    setBusy(true);
    setError('');
    const r = await saveMySeller({
      shopName,
      category,
      zone,
      description,
      ...(pickupMode === 'relais' ? {} : { location }),
      contactPhone: contactPhone || undefined,
      pickupMode,
      ...(pickupMode === 'relais' ? { relayId } : {}),
    } as Partial<MySeller>);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onSaved(r.data.seller);
  };
  return (
    <form
      onSubmit={save}
      className="bg-white rounded-3xl border border-ink/[0.06] p-5 space-y-4"
      data-testid="mp-shop-form"
    >
      <h2 className="font-display text-2xl">{initial ? 'Ma boutique' : 'Ouvrir ma boutique'}</h2>
      {!initial && (
        <p className="text-sm text-ink/70">
          Gratuit : vous ne payez qu'une commission de {Math.round(sellerRate * 100)} % sur ce que vous vendez,
          seulement quand la commande est livrée. Votre boutique est vérifiée par notre équipe avant d'apparaître.
        </p>
      )}
      <label className="block">
        <span className="field-label">Nom de la boutique *</span>
        <input
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          maxLength={60}
          placeholder="Ex. : Chez Awa Mode"
          className="field"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">Ce que vous vendez *</span>
          <select value={category} onChange={e => setCategory(e.target.value)} className="field">
            <option value="">Choisir…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Quartier / ville</span>
          <input
            value={zone}
            onChange={e => setZone(e.target.value)}
            list="mp-zones"
            placeholder="Médina"
            className="field"
          />
          <datalist id="mp-zones">
            {DELIVERY_ZONES.filter(z => z.center).map(z => (
              <option key={z.name} value={z.name} />
            ))}
          </datalist>
        </label>
      </div>
      <label className="block">
        <span className="field-label">Présentation</span>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          maxLength={600}
          placeholder="Ce que vous proposez, vos horaires…"
          className="field resize-none"
        />
      </label>
      <label className="block">
        <span className="field-label">Téléphone pour les commandes (si différent de votre compte)</span>
        <input
          value={contactPhone}
          onChange={e => setContactPhone(e.target.value)}
          inputMode="tel"
          placeholder="77 123 45 67"
          className="field"
        />
      </label>
      <fieldset className="space-y-2" data-testid="mp-pickup-mode">
        <legend className="field-label">Remise des colis au livreur *</legend>
        <p className="text-xs text-ink/65">
          Votre adresse n'est jamais montrée aux clients : seul le livreur la voit, le temps de la course.
        </p>
        {(
          [
            ['fixe', 'À mon adresse', 'Le livreur vient chercher les colis chez vous ou à votre boutique.'],
            [
              'variable',
              "Je n'ai pas d'adresse fixe",
              'Quand un colis est prêt, vous indiquez où vous êtes ; le livreur vient à ce point. Le quartier sert juste au prix.',
            ],
            [
              'relais',
              'Je dépose mes colis dans un point relais',
              'Une boutique partenaire garde vos colis : le livreur les récupère là-bas, il ne vous voit jamais.',
            ],
          ] as [PickupMode, string, string][]
        ).map(([id, title, text]) => (
          <button
            key={id}
            type="button"
            aria-pressed={pickupMode === id}
            onClick={() => setPickupMode(id)}
            data-testid={`mp-pickup-${id}`}
            className={`w-full text-left p-3 rounded-2xl border-2 ${pickupMode === id ? 'border-ink bg-ivory' : 'border-ink/10'}`}
          >
            <span className="font-semibold text-sm">{title}</span>
            <span className="block text-xs text-ink/70 mt-0.5">{text}</span>
          </button>
        ))}
      </fieldset>
      {pickupMode === 'relais' ? (
        <label className="block">
          <span className="field-label">Point relais *</span>
          <select
            value={relayId}
            onChange={e => setRelayId(e.target.value)}
            className="field"
            data-testid="mp-relay-select"
          >
            <option value="">{relays.length ? 'Choisir…' : 'Aucun point relais pour le moment'}</option>
            {relays.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.zone} {r.hours && `· ${r.hours}`}
              </option>
            ))}
          </select>
          {relays.find(r => r.id === relayId) && (
            <span className="block text-xs text-ink/65 mt-1">
              {relays.find(r => r.id === relayId)!.address} {relays.find(r => r.id === relayId)!.landmark}
            </span>
          )}
        </label>
      ) : (
        <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin text-ink/40" />}>
          <LocationPicker
            label={pickupMode === 'variable' ? 'Votre quartier (approximatif) *' : 'Où récupérer les colis ? *'}
            value={location}
            onChange={setLocation}
            initialCenter={location ?? DAKAR}
          />
        </Suspense>
      )}
      {error && (
        <p className="text-sm text-wine" role="alert">
          {error}
        </p>
      )}
      <div className={`grid gap-3 ${onCancel ? 'grid-cols-2' : ''}`}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline !h-12">
            Annuler
          </button>
        )}
        <button disabled={busy} className="btn-dark !h-12" data-testid="mp-shop-save">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : initial ? 'Enregistrer' : 'Ouvrir ma boutique'}
        </button>
      </div>
    </form>
  );
};

/* ---------- Commandes reçues ---------- */
const SaleCard: React.FC<{
  order: MpOrder;
  onMove: (o: MpOrder, to: OrderStatus) => void;
  onReceived: (o: MpOrder, missing?: boolean) => void;
  busy: boolean;
}> = ({ order: o, onMove, onReceived, busy }) => (
  <article className="bg-white rounded-2xl border border-ink/[0.06] p-4" data-testid="mp-sale">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-semibold">
        {o.buyer.name}{' '}
        <span className="text-ink/50 font-normal text-sm">
          · {o.id} · {ago(o.createdAt)}
        </span>
      </p>
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
        {STATUS_LABELS[o.status]}
      </span>
    </div>
    <ul className="mt-2 text-sm space-y-0.5">
      {o.lines.map(l => (
        <li key={`${l.listingId}-${l.variant}`}>
          {l.qty} × {l.title}
          {l.variant && ` (${l.variantLabel} : ${l.variant})`} — {F(l.price * l.qty)}
        </li>
      ))}
    </ul>
    {byDriver(o) ? (
      <div className="mt-2 text-sm space-y-1 text-ink/80" data-testid="mp-sale-driver">
        <p>
          🛵 Livraison {o.delivery.mode === 'partagee' ? 'moitié-moitié' : 'express'} par un livreur {MP.name} :
          préparez le colis, il vient le chercher. {o.driver && <strong>Livreur : {o.driver.name}</strong>}
        </p>
        {o.delivery.relay && ['acceptee', 'prete'].includes(o.status) && (
          <p className="text-emerald-900" data-testid="mp-sale-relay">
            Déposez le colis au point relais <strong>{o.delivery.relay.name}</strong> (avec le numéro {o.id}), puis
            touchez « Colis prêt ».
          </p>
        )}
        {o.pickupCode && (
          <p className="rounded-xl bg-ivory px-3 py-2" data-testid="mp-pickup-code">
            Code de remise : <strong className="text-lg tracking-[0.3em]">{o.pickupCode}</strong>
            <span className="block text-xs text-ink/65">
              {o.status === 'retour'
                ? 'La cliente n’a pas pris le colis : quand le livreur vous le rend, vérifiez-le puis donnez-lui ce code.'
                : 'Donnez-le au livreur seulement quand il prend le colis : c’est la preuve que vous le lui avez remis.'}
            </span>
          </p>
        )}
        {o.delivery.relay && ['prete', 'retour'].includes(o.status) && (
          <p className="text-xs text-ink/65">Le point relais a reçu le code de remise à donner au livreur.</p>
        )}
        {o.delivery.pickupMode === 'variable' && o.status === 'acceptee' && (
          <p className="text-ink/70">
            En touchant « Colis prêt », votre position actuelle est envoyée au livreur seulement (jamais à la cliente).
          </p>
        )}
        <p>
          Le livreur vous enverra <strong data-testid="mp-seller-gets">{F(o.sellerGets ?? 0)}</strong> (articles moins
          la commission de {F(o.platformFee ?? 0)}) dès la livraison.
        </p>
        {o.driver && !['livree', 'annulee', 'refusee'].includes(o.status) && (
          <a
            href={`tel:${o.driver.phone}`}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-ink/15 font-semibold"
          >
            <Phone className="w-3.5 h-3.5" /> Appeler le livreur
          </a>
        )}
        {o.status === 'livree' &&
          (o.payout?.receivedAt ? (
            <p className="text-emerald-800 font-semibold">✓ Argent reçu</p>
          ) : o.payout?.missing ? (
            <p className="text-wine font-semibold" data-testid="mp-payout-missing">
              Signalé : argent pas reçu. L'équipe s'en occupe.
            </p>
          ) : o.payout?.sentAt ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onReceived(o)} className="btn-dark !h-10 !px-5" data-testid="mp-payout-received">
                J'ai bien reçu {F(o.sellerGets ?? 0)}
              </button>
              <button
                onClick={() => window.confirm('Signaler que vous n’avez pas reçu cet argent ?') && onReceived(o, true)}
                className="h-10 px-4 rounded-full border border-wine/30 text-wine font-semibold"
                data-testid="mp-payout-not-received"
              >
                Pas reçu
              </button>
            </div>
          ) : (
            <p className="text-amber-900">En attente de l'envoi du livreur</p>
          ))}
      </div>
    ) : (
      <div className="mt-2 text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1 text-ink/80">
        <p>
          À encaisser : <strong>{F(o.total)}</strong> ({PAYMENT_LABELS[o.payment]})
        </p>
        <p>
          Dont livraison {F(o.delivery.fee)} · {o.delivery.km.toLocaleString('fr-FR')} km
        </p>
        <p>
          Commission {MP.name} : {F((o.platformFee ?? 0) + (o.buyerFeeToPay ?? 0))}
        </p>
      </div>
    )}
    {o.status === 'nouvelle' && !byDriver(o) && (
      <p className="mt-2 text-xs text-ink/60">
        Le numéro et l'adresse de l'acheteur s'affichent dès que vous acceptez la commande.
      </p>
    )}
    {o.buyer.phone && o.delivery.to && (
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <a
          href={`tel:${o.buyer.phone}`}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-ink/15 font-semibold"
        >
          <Phone className="w-3.5 h-3.5" /> {o.buyer.phone}
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${o.delivery.to.lat},${o.delivery.to.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-ink/15 font-semibold"
        >
          <MapPin className="w-3.5 h-3.5" /> Itinéraire
        </a>
        <span className="text-ink/70 self-center">
          {o.delivery.to.label}
          {o.delivery.to.landmark && ` · ${o.delivery.to.landmark}`}
        </span>
      </div>
    )}
    {o.note && <p className="mt-2 text-sm italic text-ink/75">« {o.note} »</p>}
    {o.reason && <p className="mt-2 text-sm text-wine">Raison : {o.reason}</p>}
    {nextFor(o) && (
      <div className="mt-3 flex flex-wrap gap-2">
        {nextFor(o)!.map(a => (
          <button
            key={a.to}
            disabled={busy}
            onClick={() => onMove(o, a.to)}
            data-testid={`mp-sale-${a.to}`}
            className={
              a.danger
                ? 'h-10 px-4 rounded-full border border-wine/30 text-wine text-sm font-semibold'
                : 'btn-dark !h-10 !px-5'
            }
          >
            {a.label}
          </button>
        ))}
      </div>
    )}
  </article>
);

type Tab = 'articles' | 'commandes' | 'solde' | 'boutique';

export default function MpSell() {
  usePageTitle(`Vendre · ${MP.name}`);
  const { status } = useAccount();
  const [categories, setCategories] = useState<MpCategory[]>([]);
  const [configRate, setConfigRate] = useState(0.07);
  const [seller, setSeller] = useState<MySeller | null | undefined>(undefined);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [settings, setSettings] = useState<MpSettings | null>(null);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [sales, setSales] = useState<MpOrder[]>([]);
  const [tab, setTab] = useState<Tab>('articles');
  const [editing, setEditing] = useState<MyListing | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const r = await fetchMySeller();
    if (!r.ok && r.status === 0) {
      // Pas de réseau : la boutique et les commandes (avec les codes de remise) gardées sur ce téléphone
      const saved = recall<{ seller: MySeller; sales: MpOrder[]; listings: MyListing[] }>('vendeur');
      if (!saved) return setMessage('Pas de réseau : votre espace s’affichera dès que la connexion revient.');
      setSeller(saved.data.seller);
      setSales(saved.data.sales);
      setListings(saved.data.listings);
      return setMessage('Pas de réseau : vous voyez les informations enregistrées sur ce téléphone.');
    }
    if (!r.ok) return setSeller(null);
    setSeller(r.data.seller);
    setBalance(r.data.balance ?? null);
    setSettings(r.data.settings ?? null);
    if (!r.data.seller) return;
    const [l, s] = await Promise.all([fetchMyListings(), fetchSales()]);
    if (l.ok) setListings(l.data.listings);
    if (s.ok) {
      setSales(s.data.orders);
      setBalance(s.data.balance);
    }
    if (l.ok && s.ok) remember('vendeur', { seller: r.data.seller, sales: s.data.orders, listings: l.data.listings });
  }, []);
  useEffect(() => {
    fetchConfig().then(r => {
      if (!r.ok) return;
      setCategories(r.data.categories);
      setConfigRate(r.data.sellerRate);
    });
  }, []);
  useEffect(() => {
    if (status === 'user') load();
  }, [status, load]);

  if (status !== 'user')
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" data-testid="mp-sell-guest">
        <Store className="w-12 h-12 mx-auto text-ink/30" strokeWidth={1.3} />
        <h1 className="font-display text-3xl mt-4">Vendez sur {MP.name}</h1>
        <p className="text-ink/70 mt-2">
          Ouvrez votre boutique en 2 minutes avec votre numéro de téléphone. Publiez vos articles, recevez des commandes
          de tout le Sénégal.
        </p>
        <Link
          to={mpPath(`/compte?retour=${encodeURIComponent(mpPath('/vendre'))}`)}
          className="btn-dark mt-6 inline-flex !h-12 !px-6"
        >
          Me connecter pour commencer
        </Link>
      </div>
    );
  if (seller === undefined)
    return message ? (
      <p className="max-w-md mx-auto px-4 py-16 text-center text-ink/70">{message}</p>
    ) : (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  if (!seller)
    return (
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <ShopForm categories={categories} sellerRate={configRate} onSaved={() => load()} />
      </div>
    );

  const move = async (o: MpOrder, to: OrderStatus) => {
    let reason: string | undefined;
    if (to === 'refusee' || to === 'annulee') {
      reason = window.prompt("Expliquez la raison à l'acheteur (ex. : article épuisé)") ?? undefined;
      if (!reason) return;
    }
    // Sans adresse fixe : le livreur viendra là où se trouve le vendeur quand le colis est prêt
    let pickup: { lat: number; lng: number; landmark?: string } | undefined;
    if (
      to === 'prete' &&
      o.delivery.pickupMode === 'variable' &&
      (o.delivery.mode === 'express' || o.delivery.mode === 'partagee')
    ) {
      const landmark =
        window.prompt('Le livreur viendra là où vous êtes maintenant. Un repère pour vous trouver ?') ?? undefined;
      const pos = await new Promise<GeolocationPosition | null>(resolve =>
        navigator.geolocation
          ? navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
              enableHighAccuracy: true,
              timeout: 15000,
            })
          : resolve(null),
      );
      if (!pos) return setMessage('Autorisez la position du téléphone pour indiquer où le livreur récupère le colis.');
      pickup = { lat: pos.coords.latitude, lng: pos.coords.longitude, landmark };
    }
    setBusy(true);
    const r = await moveSale(o.id, to, reason, pickup);
    setBusy(false);
    if (!r.ok) return setMessage(r.error);
    setSales(list => list.map(x => (x.id === o.id ? r.data.order : x)));
    setBalance(r.data.balance);
  };
  const pending = sales.filter(o => o.status === 'nouvelle').length;
  const rate = Math.round((settings?.sellerRate ?? 0.07) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-5 space-y-4" data-testid="mp-seller-space">
      <section className="bg-white rounded-3xl border border-ink/[0.06] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-ink/55 font-semibold">Ma boutique</p>
          <h1 className="font-display text-3xl">{seller.shopName}</h1>
          {seller.status === 'en_attente' && (
            <p className="mt-1 text-sm text-amber-900" data-testid="mp-seller-pending">
              En cours de vérification : préparez déjà vos articles, ils apparaîtront dès la validation.
            </p>
          )}
          {seller.status === 'suspendue' && (
            <p className="mt-1 text-sm text-wine">Boutique suspendue : contactez-nous.</p>
          )}
        </div>
        {seller.status === 'active' && (
          <Link to={mpPath(`/boutique/${seller.slug}`)} className="btn-outline !h-11 !px-5">
            Voir ma boutique
          </Link>
        )}
      </section>

      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist">
        {(
          [
            ['articles', `Articles (${listings.length})`],
            ['commandes', pending ? `Commandes · ${pending} nouvelle${pending > 1 ? 's' : ''}` : 'Commandes'],
            ['solde', 'Mon solde'],
            ['boutique', 'Infos boutique'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setEditing(null);
              setMessage('');
            }}
            className={`shrink-0 h-10 px-4 rounded-full text-sm border ${tab === id ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/10'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p className="text-sm text-wine" role="alert">
          {message}
        </p>
      )}

      {tab === 'articles' &&
        (editing ? (
          <ListingForm
            categories={categories}
            initial={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onDone={l => {
              setListings(list => [l, ...list.filter(x => x.id !== l.id)]);
              setEditing(null);
              setMessage('');
            }}
          />
        ) : (
          <div className="space-y-3">
            <button onClick={() => setEditing('new')} className="btn-dark !h-12 !px-6" data-testid="mp-add-listing">
              <Plus className="w-4 h-4" /> Ajouter un article
            </button>
            {!listings.length && <p className="text-ink/70 text-sm">Aucun article pour l'instant.</p>}
            {listings.map(l => (
              <article
                key={l.id}
                className="bg-white rounded-2xl border border-ink/[0.06] p-3 flex gap-3"
                data-testid="mp-my-listing"
              >
                <img src={l.photos[0]} alt="" className="w-20 h-20 rounded-xl object-cover bg-ivory" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold truncate">{l.title}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${LISTING_STATUS[l.status][1]}`}
                    >
                      {LISTING_STATUS[l.status][0]}
                    </span>
                  </div>
                  <p className="text-sm font-bold mt-0.5">{F(l.price)}</p>
                  <p className="text-xs text-ink/60 flex items-center gap-3">
                    <span>{l.stock === null ? 'Stock non limité' : `${l.stock} en stock`}</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {l.views ?? 0}
                    </span>
                  </p>
                  {l.status === 'refusee' && l.reason && <p className="text-xs text-wine mt-1">Refusé : {l.reason}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setEditing(l)}
                    aria-label={`Modifier ${l.title}`}
                    className="w-9 h-9 rounded-full border border-ink/10 grid place-items-center"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Retirer « ${l.title} » de la vente ?`)) return;
                      const r = await removeListing(l.id);
                      if (r.ok) setListings(list => list.filter(x => x.id !== l.id));
                    }}
                    aria-label={`Retirer ${l.title}`}
                    className="w-9 h-9 rounded-full border border-ink/10 grid place-items-center text-ink/60 hover:text-wine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ))}

      {tab === 'commandes' && (
        <div className="space-y-3">
          {!sales.length && <p className="text-ink/70 text-sm">Pas encore de commande.</p>}
          {sales.map(o => (
            <SaleCard
              key={o.id}
              order={o}
              onMove={move}
              busy={busy}
              onReceived={async (x, missing) => {
                const r = await confirmPayout(x.id, missing);
                if (!r.ok) return setMessage(r.error);
                setSales(list => list.map(y => (y.id === x.id ? r.data.order : y)));
                setBalance(r.data.balance);
              }}
            />
          ))}
        </div>
      )}

      {tab === 'solde' && balance && (
        <section className="bg-white rounded-3xl border border-ink/[0.06] p-5 space-y-3" data-testid="mp-balance">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Mon solde
          </h2>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Ventes livrées', F(balance.sales)],
              ['Commandes livrées', String(balance.orders)],
              ['Commissions dues', F(balance.due)],
              ['Déjà réglé', F(balance.paid)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-ivory p-3">
                <dt className="text-xs text-ink/60">{k}</dt>
                <dd className="text-lg font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-lg">
            Reste à régler : <strong data-testid="mp-balance-due">{F(balance.balance)}</strong>
          </p>
          <p className="text-sm text-ink/70">
            {MP.name} prend {rate} % sur chaque vente livrée, plus {F(settings?.buyerFee ?? 150)} de frais de service
            payés par l'acheteur (que vous encaissez avec la commande). Réglez par Wave ou Orange Money au{' '}
            {SITE_CONFIG.phone}, en indiquant le nom de votre boutique.
          </p>
          {!!balance.payouts?.length && (
            <div>
              <h3 className="font-semibold mt-2">Envoyé par les livreurs</h3>
              <p className="text-xs text-ink/60">
                Commandes livrées par un livreur {MP.name} : la commission est déjà retirée, vous ne devez rien.
              </p>
              <ul className="text-sm divide-y divide-ink/[0.06] mt-1">
                {balance.payouts.map(p => (
                  <li key={p.orderId} className="py-2 flex justify-between gap-3">
                    <span>
                      {p.orderId} · {p.receivedAt ? '✓ reçu' : p.sentAt ? 'envoyé, à confirmer' : 'pas encore envoyé'}
                    </span>
                    <span className="font-semibold">{F(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!balance.payments.length && (
            <ul className="text-sm divide-y divide-ink/[0.06]">
              {balance.payments.map(p => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>
                    {new Date(p.at).toLocaleDateString('fr-FR')} {p.note && `· ${p.note}`}
                  </span>
                  <span className="font-semibold">{F(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {tab === 'solde' && (
        <section className="bg-white rounded-3xl border border-ink/[0.06] p-5 space-y-2" data-testid="mp-plan">
          <h2 className="font-display text-2xl">Ma formule : {seller.plan === 'pro' ? 'Pro ⭐' : 'Découverte'}</h2>
          {seller.plan === 'pro' ? (
            <p className="text-sm text-ink/75">
              Active jusqu'au {new Date(seller.planUntil!).toLocaleDateString('fr-FR')} : commission de{' '}
              {Math.round((settings?.proRate ?? 0.03) * 100)} %, articles illimités, mise en avant dans le fil « Pour
              vous ».
            </p>
          ) : (
            <>
              <p className="text-sm text-ink/75">
                Gratuite : {settings?.freeListings ?? 30} articles, commission de {rate} %. Formule Pro :{' '}
                {F(settings?.proPrice ?? 5000)} par mois, commission de {Math.round((settings?.proRate ?? 0.03) * 100)}{' '}
                %, articles illimités et mise en avant dans le fil « Pour vous ».
              </p>
              {seller.planRequestedAt ? (
                <p className="text-sm text-emerald-800">
                  Demande envoyée : réglez {F(settings?.proPrice ?? 5000)} par Wave au {SITE_CONFIG.phone}, la formule
                  sera activée à réception.
                </p>
              ) : (
                <button
                  onClick={async () => {
                    const r = await requestPro();
                    if (r.ok) setSeller(r.data.seller);
                    else setMessage(r.error);
                  }}
                  className="btn-dark !h-11 !px-5"
                  data-testid="mp-request-pro"
                >
                  Passer à la formule Pro
                </button>
              )}
            </>
          )}
        </section>
      )}

      {tab === 'boutique' && (
        <ShopForm
          categories={categories}
          sellerRate={settings?.sellerRate ?? configRate}
          initial={seller}
          onSaved={s => {
            setSeller(s);
            setTab('articles');
          }}
          onCancel={() => setTab('articles')}
        />
      )}
    </div>
  );
}
