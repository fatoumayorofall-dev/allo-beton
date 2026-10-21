import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, CheckCircle2, Loader2, Minus, Plus, ShoppingBag, Trash2, Users } from 'lucide-react';
import { fetchQuote, placeOrders, type MpOrder, type QuoteOrder } from './api';
import { useMpCart } from './cart';
import { MP, mpPath } from './config';
import { F, PAYMENT_LABELS } from './format';
import { useAccount } from '../context/AccountContext';
import type { DeliveryLocation } from '../data/types';
import { usePageTitle } from '../utils/usePageTitle';

const LocationPicker = lazy(() => import('../components/LocationPicker'));
const DAKAR = { lat: 14.7167, lng: -17.4677 };
const hour = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'l’heure prévue';

export default function MpCart() {
  usePageTitle(`Panier · ${MP.name}`);
  const { items, setQty, remove, clear } = useMpCart();
  const { status, user } = useAccount();
  const navigate = useNavigate();
  const [to, setTo] = useState<DeliveryLocation | undefined>(user?.location ?? undefined);
  const [quote, setQuote] = useState<{ drivers: boolean; orders: QuoteOrder[]; total: number } | null>(null);
  // Livraison par les livreurs : moitié-moitié (par défaut, moins cher) ou express
  const [mode, setMode] = useState<'partagee' | 'express'>('partagee');
  const [wait, setWait] = useState(60);
  const [quoteError, setQuoteError] = useState('');
  const [name, setName] = useState('');
  const [payment, setPayment] = useState<MpOrder['payment']>('especes');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<MpOrder[] | null>(null);

  useEffect(() => {
    if (user && !name) setName([user.firstName, user.lastName].filter(Boolean).join(' '));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = useMemo(() => items.map(i => ({ listingId: i.listingId, qty: i.qty, variant: i.variant })), [items]);
  useEffect(() => {
    if (!to || !lines.length) return setQuote(null);
    let alive = true;
    const t = setTimeout(() => {
      fetchQuote(lines, to, wait).then(r => {
        if (!alive) return;
        if (r.ok) {
          setQuote(r.data);
          setQuoteError('');
        } else {
          setQuote(null);
          setQuoteError(r.error);
        }
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [lines, to, wait]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof items>();
    for (const i of items) m.set(i.shopName, [...(m.get(i.shopName) ?? []), i]);
    return [...m];
  }, [items]);

  if (done)
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center" data-testid="mp-order-done">
        <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-700" strokeWidth={1.4} />
        <h1 className="font-display text-3xl mt-4">Commande envoyée !</h1>
        <p className="text-ink/75 mt-2">
          {done.length > 1
            ? `${done.length} commandes ont été envoyées (une par vendeur).`
            : 'Le vendeur a reçu votre commande.'}{' '}
          Vous serez prévenu(e) sur WhatsApp dès qu'il l'accepte. Vous payez à la livraison.
        </p>
        <ul className="mt-5 text-sm space-y-1">
          {done.map(o => (
            <li key={o.id}>
              <strong>{o.id}</strong> · {o.shopName} · {F(o.total)}
              {o.delivery.mode === 'partagee' && (o.delivery.share ?? o.delivery.fee) < o.delivery.fee && (
                <span className="text-emerald-800">
                  {' '}
                  (livraison partagée : −{F(o.delivery.fee - (o.delivery.share ?? 0))})
                </span>
              )}
            </li>
          ))}
        </ul>
        {done.some(o => o.delivery.mode === 'partagee') && (
          <p className="mt-4 text-sm text-ink/75 bg-emerald-50 rounded-2xl p-3">
            Livraison moitié-moitié : votre prix peut encore baisser si d'autres commandes partent dans votre direction
            d'ici {hour(done.find(o => o.delivery.deadline)?.delivery.deadline)}. Il ne montera jamais au-dessus du prix
            affiché.
          </p>
        )}
        <Link to={mpPath('/commandes')} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Suivre mes commandes
        </Link>
      </div>
    );

  if (!items.length)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto text-ink/30" strokeWidth={1.3} />
        <p className="font-display text-3xl mt-4">Votre panier est vide</p>
        <Link to={mpPath()} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Voir les articles
        </Link>
      </div>
    );

  const submit = async () => {
    if (status !== 'user') return navigate(mpPath(`/compte?retour=${encodeURIComponent(mpPath('/panier'))}`));
    if (!to) return setError('Choisissez le point de livraison sur la carte');
    if (name.trim().length < 2) return setError('Indiquez votre prénom');
    setBusy(true);
    setError('');
    const r = await placeOrders({
      items: lines,
      to,
      name: name.trim(),
      payment,
      note,
      ...(quote?.drivers ? { mode, wait } : {}),
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    clear();
    setDone(r.data.orders);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-5 grid lg:grid-cols-[1fr_380px] gap-6" data-testid="mp-cart">
      <div className="space-y-5">
        <h1 className="font-display text-3xl">Mon panier</h1>
        {groups.map(([shop, list]) => (
          <section key={shop} className="bg-white rounded-2xl border border-ink/[0.06] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-ink/55 font-semibold">Vendu par {shop}</p>
            <ul className="mt-2 divide-y divide-ink/[0.06]">
              {list.map(i => (
                <li key={`${i.listingId}-${i.variant}`} className="py-3 flex gap-3">
                  <img src={i.photo} alt="" className="w-16 h-16 rounded-xl object-cover bg-ivory" />
                  <div className="flex-1 min-w-0">
                    <Link to={mpPath(`/annonce/${i.listingId}`)} className="text-sm font-semibold line-clamp-2">
                      {i.title}
                    </Link>
                    {i.variant && (
                      <p className="text-xs text-ink/60">
                        {i.variantLabel} : {i.variant}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-full border border-ink/15">
                        <button
                          onClick={() => setQty(i.listingId, i.variant, i.qty - 1)}
                          className="w-8 h-8 grid place-items-center"
                          aria-label="Moins"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{i.qty}</span>
                        <button
                          onClick={() => setQty(i.listingId, i.variant, i.qty + 1)}
                          className="w-8 h-8 grid place-items-center"
                          aria-label="Plus"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-bold text-sm">{F(i.price * i.qty)}</span>
                      <button
                        onClick={() => remove(i.listingId, i.variant)}
                        aria-label={`Retirer ${i.title}`}
                        className="w-8 h-8 grid place-items-center text-ink/50 hover:text-wine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="bg-white rounded-2xl border border-ink/[0.06] p-4">
          <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin text-ink/40" />}>
            <LocationPicker value={to} onChange={setTo} initialCenter={to ?? DAKAR} />
          </Suspense>
        </section>
      </div>

      <aside className="lg:sticky lg:top-20 self-start bg-white rounded-2xl border border-ink/[0.06] p-5 space-y-4">
        <h2 className="font-display text-2xl">Récapitulatif</h2>
        {!to && (
          <p className="text-sm text-ink/70">Choisissez le point de livraison pour voir le prix de la livraison.</p>
        )}
        {quoteError && (
          <p className="text-sm text-wine" role="alert">
            {quoteError}
          </p>
        )}
        {quote && (
          <div className="space-y-3 text-sm" data-testid="mp-quote">
            {quote.orders.map(o => (
              <div key={o.seller.id} className="pb-3 border-b border-ink/[0.06]">
                <p className="font-semibold">{o.seller.shopName}</p>
                <p className="flex justify-between">
                  <span>Articles</span>
                  <span>{F(o.subtotal)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Livraison ({o.delivery.km.toLocaleString('fr-FR')} km)</span>
                  {quote.drivers && mode === 'partagee' && o.shared ? (
                    <span>
                      <s className="text-ink/45 mr-1.5">{F(o.delivery.fee)}</s>
                      <strong className="text-emerald-800" data-testid="mp-delivery-fee">
                        {F(o.shared.share)}
                      </strong>
                    </span>
                  ) : (
                    <span data-testid="mp-delivery-fee">
                      {quote.drivers && mode === 'partagee' && 'au plus '}
                      {F(o.delivery.fee)}
                    </span>
                  )}
                </p>
                <p className="flex justify-between">
                  <span>Frais de service</span>
                  <span>{F(o.buyerFee)}</span>
                </p>
              </div>
            ))}
            <p className="flex justify-between text-lg font-bold">
              <span>{quote.drivers && mode === 'partagee' ? 'Total, au plus' : 'Total à payer'}</span>
              <span data-testid="mp-total">
                {F(
                  quote.total -
                    (quote.drivers && mode === 'partagee'
                      ? quote.orders.reduce((t, o) => t + (o.shared ? o.delivery.fee - o.shared.share : 0), 0)
                      : 0),
                )}
              </span>
            </p>
          </div>
        )}

        {quote?.drivers && (
          <fieldset className="space-y-2" data-testid="mp-delivery-mode">
            <legend className="field-label">Livraison</legend>
            <button
              type="button"
              aria-pressed={mode === 'partagee'}
              onClick={() => setMode('partagee')}
              data-testid="mp-mode-partagee"
              className={`w-full text-left p-3 rounded-2xl border-2 ${mode === 'partagee' ? 'border-emerald-700 bg-emerald-50' : 'border-ink/10'}`}
            >
              <span className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" /> Moitié-moitié (moins cher)
              </span>
              <span className="block text-xs text-ink/70 mt-1">
                {quote.orders.some(o => o.shared)
                  ? (n =>
                      `Déjà ${n} commande${n > 1 ? 's' : ''} sur votre trajet : vous partagez le livreur et payez moins.`)(
                      Math.max(...quote.orders.map(o => o.shared?.with ?? 0)),
                    )
                  : "On attend d'autres commandes qui vont dans votre direction : le prix baisse pour chacun. Jamais plus que le prix affiché."}
              </span>
            </button>
            {mode === 'partagee' && (
              <div className="flex flex-wrap gap-1.5 pl-1" role="group" aria-label="Départ au plus tard">
                {[30, 60, 120, 240].map(m => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={wait === m}
                    onClick={() => setWait(m)}
                    className={`px-3 h-8 rounded-full text-xs font-semibold border ${wait === m ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}
                  >
                    Départ au plus tard {m < 60 ? `${m} min` : `${m / 60} h`}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              aria-pressed={mode === 'express'}
              onClick={() => setMode('express')}
              data-testid="mp-mode-express"
              className={`w-full text-left p-3 rounded-2xl border-2 ${mode === 'express' ? 'border-ink bg-ivory' : 'border-ink/10'}`}
            >
              <span className="font-semibold flex items-center gap-2">
                <Bike className="w-4 h-4" /> Express
              </span>
              <span className="block text-xs text-ink/70 mt-1">Le livreur part dès que le colis est prêt.</span>
            </button>
          </fieldset>
        )}

        <label className="block">
          <span className="field-label">Votre prénom</span>
          <input value={name} onChange={e => setName(e.target.value)} className="field" autoComplete="given-name" />
        </label>
        <fieldset>
          <legend className="field-label">Paiement à la livraison</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PAYMENT_LABELS) as MpOrder['payment'][]).map(p => (
              <button
                key={p}
                type="button"
                aria-pressed={payment === p}
                onClick={() => setPayment(p)}
                className={`h-11 rounded-xl border text-xs font-semibold ${payment === p ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}
              >
                {PAYMENT_LABELS[p]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="field-label">Message au vendeur (facultatif)</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            className="field resize-none"
          />
        </label>
        {error && (
          <p className="text-sm text-wine" role="alert">
            {error}
          </p>
        )}
        <button
          onClick={submit}
          disabled={busy || (status === 'user' && (!quote || !!quoteError))}
          className="btn-dark w-full !h-14"
          data-testid="mp-confirm"
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : status === 'user' ? (
            'Valider la commande'
          ) : (
            'Me connecter pour commander'
          )}
        </button>
        <p className="text-[11px] text-ink/60 text-center">
          Vous ne payez rien maintenant : vous réglez le livreur ou le vendeur à la réception.
        </p>
      </aside>
    </div>
  );
}
