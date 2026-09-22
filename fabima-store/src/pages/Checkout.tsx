import React, { Suspense, lazy, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote, Check, ChevronDown, ChevronLeft, CreditCard, Gift, Loader2, Lock, MapPin, Smartphone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { DELIVERY_ZONES, SHOP_LOCATION, zoneForPoint } from '../config/site';
import type { DeliveryLocation, PaymentMethod } from '../data/types';
import { formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductImage } from '../components/ProductImage';
import { PromoBox } from './Cart';
import { createOrder } from '../services/api';
import { useAccount } from '../context/AccountContext';

const LocationPicker = lazy(() => import('../components/LocationPicker'));

const PAYMENT_METHODS: { id: PaymentMethod; name: string; desc: string; color: string; Icon: typeof Smartphone }[] = [
  { id: 'wave', name: 'Wave', desc: 'Instantané, sans frais', color: '#1dc4ff', Icon: Smartphone },
  { id: 'orange_money', name: 'Orange Money', desc: 'Validation par code secret', color: '#ff7900', Icon: Smartphone },
  { id: 'free_money', name: 'Free Money', desc: 'Paiement mobile Free', color: '#cd0f2d', Icon: Smartphone },
  { id: 'card', name: 'Carte bancaire', desc: 'Visa, Mastercard', color: '#16120f', Icon: CreditCard },
  { id: 'cash', name: 'À la livraison', desc: 'Espèces ou Wave à la réception', color: '#11694f', Icon: Banknote },
];

const PHONE_RE = /^(\+?221)?\s?(7[05678])\s?\d{3}\s?\d{2}\s?\d{2}$/;

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  zone: string;
  address: string;
  notes: string;
  location?: DeliveryLocation;
}

export const Checkout: React.FC = () => {
  usePageTitle('Commande');
  const { cart, computeTotals, placeOrder, clearCart, promoCode, notify, savedCustomer, saveCustomer, giftWrap, logNotification } = useStore();
  const navigate = useNavigate();
  const account = useAccount();
  const me = account.user;

  const [step, setStep] = useState<1 | 2>(1);
  // Préremplissage : coordonnées mémorisées sur ce téléphone, sinon celles du compte
  const [form, setForm] = useState<FormState>(() => ({
    firstName: savedCustomer?.firstName || me?.firstName || '', lastName: savedCustomer?.lastName || me?.lastName || '',
    phone: savedCustomer?.phone || me?.phone.replace(/^\+221/, '') || '',
    email: savedCustomer?.email ?? '', zone: savedCustomer?.zone || me?.zone || DELIVERY_ZONES[0].name, address: savedCustomer?.address || me?.address || '', notes: '',
    location: savedCustomer?.location || me?.location || undefined,
  }));
  const [zoneAuto, setZoneAuto] = useState(!!(savedCustomer?.location || me?.location));
  const [zonesOpen, setZonesOpen] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [method, setMethod] = useState<PaymentMethod>('wave');
  const [payPhone, setPayPhone] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });
  const [processing, setProcessing] = useState(false);

  if (cart.length === 0 && !processing) return <Navigate to="/panier" replace />;

  const zone = DELIVERY_ZONES.find(z => z.name === form.zone) ?? DELIVERY_ZONES[0];
  const t = computeTotals(zone.fee);
  const isMobile = method === 'wave' || method === 'orange_money' || method === 'free_money';

  /** Point choisi sur la carte : la zone et les frais de livraison se règlent tout seuls. */
  const setLocation = (location: DeliveryLocation | undefined) => {
    setForm(f => ({ ...f, location, zone: location ? zoneForPoint(location) : f.zone }));
    setZoneAuto(!!location);
    setErrors(er => ({ ...er, location: undefined, address: undefined }));
  };
  const zoneCenter = DELIVERY_ZONES.find(z => z.name === form.zone)?.center ?? SHOP_LOCATION;

  const set = (key: Exclude<keyof FormState, 'location'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setErrors(er => ({ ...er, [key]: undefined }));
  };

  const validateInfo = () => {
    const er: typeof errors = {};
    if (!form.firstName.trim()) er.firstName = 'Prénom requis';
    if (!form.lastName.trim()) er.lastName = 'Nom requis';
    if (!PHONE_RE.test(form.phone.trim())) er.phone = 'Numéro sénégalais invalide (ex : 77 123 45 67)';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'E-mail invalide';
    // Avec un point sur la carte, l'adresse écrite n'est plus nécessaire
    if (!form.location && form.address.trim().length < 5) er.location = 'Touchez « Je suis ici » ou placez la maison sur la carte (ou écrivez votre adresse plus bas)';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const goToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInfo()) {
      notify('Merci de compléter les champs indiqués', 'error');
      return;
    }
    const { notes: _notes, ...profile } = form;
    saveCustomer(remember ? { ...profile, email: profile.email || undefined } : null);
    if (!payPhone) setPayPhone(form.phone);
    if (me) account.saveProfile({ firstName: form.firstName, lastName: form.lastName, zone: form.zone, address: form.address, location: form.location ?? null });
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pay = async () => {
    if (isMobile && !PHONE_RE.test(payPhone.trim())) { notify('Numéro de paiement invalide', 'error'); return; }
    if (method === 'card' && (card.number.replace(/\s/g, '').length < 16 || !/^\d{2}\/\d{2}$/.test(card.expiry) || card.cvc.length < 3)) {
      notify('Informations de carte incomplètes', 'error'); return;
    }
    setProcessing(true);
    // Simulation de la passerelle de paiement (à brancher sur l'API Wave / Orange Money / PayDunya en production)
    await new Promise(r => setTimeout(r, method === 'cash' ? 600 : 2200));
    const order = placeOrder({
      customer: { ...form, email: form.email || undefined, notes: form.notes || undefined, location: form.location },
      items: cart,
      subtotal: t.subtotal,
      discount: t.discount,
      deliveryFee: t.deliveryFee,
      giftFee: t.giftFee,
      giftMessage: t.giftFee && giftWrap.message.trim() ? giftWrap.message.trim() : undefined,
      total: t.total,
      promoCode: t.discount > 0 || (promoCode && t.promoShortfall === 0) ? promoCode ?? undefined : undefined,
      paymentMethod: method,
      paymentStatus: method === 'cash' ? 'en_attente' : 'paye',
    });
    // Messages WhatsApp automatiques (gérante + cliente) si le serveur est configuré ; sinon la page
    // de confirmation propose l'envoi manuel du récapitulatif.
    account.recordOrder(order); // retrouvable depuis n'importe quel téléphone
    // Commande enregistrée sur le serveur : la gérante la voit, le livreur y sera rattaché
    createOrder(order).then(r => {
      if (!r) return;
      if (!r.owner.simulated) logNotification(order.id, { event: 'nouvelle', to: 'gerante', channel: r.owner.ok ? 'auto' : 'echec' });
      if (!r.customer.simulated) logNotification(order.id, { event: 'nouvelle', to: 'cliente', channel: r.customer.ok ? 'auto' : 'echec' });
    });
    navigate(`/confirmation/${order.id}`, { replace: true });
    clearCart();
  };

  const input = (key: Exclude<keyof FormState, 'location'>, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="field-label">{label}</span>
      <input value={form[key]} onChange={set(key)} aria-invalid={!!errors[key]} {...props} className={`field ${errors[key] ? '!border-wine' : ''}`} />
      {errors[key] && <span className="text-xs text-wine mt-1.5 block">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 pt-10">
      <Link to="/panier" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-ink/55 hover:text-ink"><ChevronLeft className="w-3.5 h-3.5" /> Panier</Link>
      <div className="flex flex-wrap items-end justify-between gap-6 mt-4 mb-12 pb-8 border-b border-ink/10">
        <h1 className="font-display text-5xl sm:text-6xl">Commande</h1>
        <ol className="flex items-center gap-4 text-[11px] uppercase tracking-[0.2em]">
          {['Livraison', 'Paiement', 'Confirmation'].map((label, i) => {
            const n = i + 1;
            return (
              <li key={label} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full grid place-items-center text-[11px] border ${step > n ? 'bg-ink border-ink text-ivory' : step === n ? 'border-ink' : 'border-ink/20 text-ink/35'}`}>
                  {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                </span>
                <span className={`hidden sm:inline ${step >= n ? 'font-semibold' : 'text-ink/35'}`}>{label}</span>
                {n < 3 && <span className="w-6 sm:w-10 h-px bg-ink/20" />}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-12 items-start">
        <div className="min-w-0">
          {step === 1 ? (
            <form onSubmit={goToPayment} className="space-y-10 animate-fade-in" noValidate>
              <fieldset className="space-y-5 min-w-0">
                <legend className="font-display text-3xl mb-6">Vos coordonnées</legend>
                {(savedCustomer || me?.firstName) && <p className="text-xs text-ink/55 -mt-3">Bon retour parmi nous, {savedCustomer?.firstName || me?.firstName} : vos coordonnées ont été préremplies.</p>}
                {account.status === 'guest' && !savedCustomer && (
                  <Link to="/compte?retour=/commande" className="flex items-center gap-3 p-4 -mt-1 rounded-2xl bg-blush/40 text-sm">
                    <span className="text-2xl">📱</span><span><strong>Déjà cliente ?</strong> Connectez-vous avec votre numéro pour tout préremplir.</span>
                  </Link>
                )}
                <div className="grid sm:grid-cols-2 gap-5">
                  {input('firstName', 'Prénom *', { autoComplete: 'given-name' })}
                  {input('lastName', 'Nom *', { autoComplete: 'family-name' })}
                  {input('phone', 'Téléphone *', { type: 'tel', placeholder: '77 123 45 67', autoComplete: 'tel' })}
                  {input('email', 'E-mail (facultatif)', { type: 'email', autoComplete: 'email', placeholder: 'pour recevoir votre facture' })}
                </div>
              </fieldset>

              <fieldset className="space-y-5 min-w-0">
                <legend className="font-display text-3xl mb-6">Livraison</legend>
                <Suspense fallback={<div className="h-96 rounded-[1.5rem] bg-blush/30 animate-pulse" />}>
                  <LocationPicker value={form.location} onChange={setLocation} initialCenter={form.location ?? zoneCenter} error={errors.location} />
                </Suspense>
                <div className="rounded-2xl border border-ink/10 overflow-hidden">
                  <button type="button" onClick={() => setZonesOpen(o => !o)} aria-expanded={zonesOpen}
                    className="w-full flex items-center justify-between gap-3 px-4 h-14 bg-white text-sm text-left">
                    <span className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-ink/40 shrink-0" />
                      <span className="truncate"><span className="text-ink/55">{zoneAuto ? 'Zone reconnue : ' : 'Zone : '}</span><strong>{zone.name}</strong> · {zone.delay}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0 text-xs">
                      {t.deliveryFee === 0 ? <span className="text-emerald-800">Offerte</span> : formatPrice(zone.fee)}
                      <ChevronDown className={`w-4 h-4 transition-transform ${zonesOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {zonesOpen && (
                    <div className="grid sm:grid-cols-2 gap-2 p-3 border-t border-ink/10">
                      {DELIVERY_ZONES.map(z => (
                        <label key={z.name} className={`flex items-center justify-between gap-3 px-4 h-14 border rounded-2xl cursor-pointer transition-colors ${form.zone === z.name ? 'border-ink bg-white' : 'border-ink/10 hover:border-ink/40'}`}>
                          <span className="flex items-center gap-3">
                            <input type="radio" name="zone" value={z.name} checked={form.zone === z.name} onChange={e => { set('zone')(e); setZoneAuto(false); }} className="accent-ink" />
                            <span className="text-sm">{z.name}<span className="block text-[11px] text-ink/45">{z.delay}</span></span>
                          </span>
                          <span className="text-xs">{computeTotals(z.fee).deliveryFee === 0 ? <span className="text-emerald-800">Offerte</span> : formatPrice(z.fee)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {input('address', form.location ? 'Précisions (facultatif)' : 'Adresse écrite (si vous ne pouvez pas utiliser la carte)', { placeholder: form.location ? 'Villa n°, étage, appartement…' : 'Quartier, rue, n° de villa, point de repère…', autoComplete: 'street-address' })}
                <label className="block">
                  <span className="field-label">Instructions au livreur (facultatif)</span>
                  <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Ex : appeler avant de passer, livrer après 17h…" className="field resize-none" />
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-ink w-4 h-4" />
                  Mémoriser mes coordonnées sur cet appareil pour mes prochaines commandes
                </label>
              </fieldset>
              <button className="btn-dark w-full">Continuer vers le paiement</button>
            </form>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-start justify-between gap-4 p-5 border border-ink/10 bg-white rounded-2xl">
                <div className="text-sm">
                  <p className="field-label !mb-1.5">Livraison à</p>
                  <p className="font-semibold">{form.firstName} {form.lastName} · {form.phone}</p>
                  <p className="text-ink/60">{[form.location?.label, form.location?.landmark, form.address].filter(Boolean).join(' · ') || form.zone} — {form.zone}, {zone.delay}</p>
                  {form.location && <p className="text-xs text-emerald-800 mt-1">📍 Point de livraison enregistré sur la carte : le livreur viendra directement.</p>}
                </div>
                <button onClick={() => setStep(1)} className="text-[11px] uppercase tracking-[0.2em] link-luxe shrink-0">Modifier</button>
              </div>

              <fieldset>
                <legend className="font-display text-3xl mb-6">Mode de paiement</legend>
                <div className="grid sm:grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <label key={m.id} className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-colors ${method === m.id ? 'border-ink bg-white' : 'border-ink/10 hover:border-ink/40'}`}>
                      <input type="radio" name="payment" checked={method === m.id} onChange={() => setMethod(m.id)} className="sr-only" />
                      <span className="w-11 h-11 rounded-full grid place-items-center text-white shrink-0" style={{ background: m.color }}><m.Icon className="w-5 h-5" strokeWidth={1.5} /></span>
                      <span className="flex-1"><strong className="block text-sm font-semibold">{m.name}</strong><span className="text-xs text-ink/55">{m.desc}</span></span>
                      <span className={`w-4 h-4 rounded-full border grid place-items-center ${method === m.id ? 'border-ink' : 'border-ink/25'}`}>{method === m.id && <span className="w-2 h-2 rounded-full bg-ink" />}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {isMobile && (
                <label className="block animate-fade-in">
                  <span className="field-label">Numéro {PAYMENT_METHODS.find(m => m.id === method)?.name}</span>
                  <input value={payPhone} onChange={e => setPayPhone(e.target.value)} type="tel" placeholder="77 123 45 67" className="field" />
                  <span className="text-xs text-ink/55 mt-2 block">Vous recevrez une demande de validation de {formatPrice(t.total)} sur votre téléphone.</span>
                </label>
              )}
              {method === 'card' && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <input value={card.number} placeholder="Numéro de carte" inputMode="numeric" aria-label="Numéro de carte" autoComplete="cc-number"
                    onChange={e => setCard(c => ({ ...c, number: e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ') }))} className="field col-span-2" />
                  <input value={card.expiry} placeholder="MM/AA" inputMode="numeric" aria-label="Date d'expiration" autoComplete="cc-exp"
                    onChange={e => setCard(c => ({ ...c, expiry: e.target.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/, '$1/') }))} className="field" />
                  <input value={card.cvc} placeholder="CVC" inputMode="numeric" aria-label="Cryptogramme" autoComplete="cc-csc"
                    onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))} className="field" />
                </div>
              )}
              {method === 'cash' && (
                <p className="text-sm p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 animate-fade-in">
                  Préparez <strong>{formatPrice(t.total)}</strong>. Notre livreur vous remettra un reçu ; vous pouvez aussi régler par Wave à la réception.
                </p>
              )}

              <button onClick={pay} disabled={processing} className="btn-dark w-full !h-14">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> {method === 'cash' ? 'Validation…' : 'En attente de validation…'}</>
                  : <><Lock className="w-3.5 h-3.5" /> {method === 'cash' ? 'Confirmer la commande' : `Payer ${formatPrice(t.total)}`}</>}
              </button>
              <p className="text-[11px] text-center text-ink/45 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" /> Paiement chiffré · Vos données bancaires ne sont jamais conservées</p>
            </div>
          )}
        </div>

        {/* Récapitulatif */}
        <aside className="bg-white border border-ink/[0.06] rounded-[2rem] p-7 sm:p-8 space-y-6 lg:sticky lg:top-36">
          <h2 className="font-display text-3xl">Votre sélection</h2>
          <ul className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {cart.map(i => (
              <li key={i.key} className="flex gap-4">
                <div className="relative shrink-0">
                  <ProductImage src={i.image} alt={i.name} label="" className="w-16 h-20 rounded-xl" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-ivory text-[10px] grid place-items-center">{i.quantity}</span>
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-display text-lg leading-tight line-clamp-1">{i.name}</p>
                  <p className="text-xs text-ink/50">{[i.color, i.size && `T. ${i.size}`].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="text-sm whitespace-nowrap">{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <PromoBox />
          <dl className="space-y-3 text-sm border-t border-ink/10 pt-5">
            <div className="flex justify-between"><dt className="text-ink/65">Sous-total</dt><dd>{formatPrice(t.subtotal)}</dd></div>
            {t.discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Réduction</dt><dd>-{formatPrice(t.discount)}</dd></div>}
            {t.giftFee > 0 && <div className="flex justify-between"><dt className="text-ink/65 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" strokeWidth={1.5} /> Emballage cadeau</dt><dd>{formatPrice(t.giftFee)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink/65">Livraison · {zone.name}</dt><dd>{t.deliveryFee === 0 ? <span className="text-emerald-800">Offerte</span> : formatPrice(t.deliveryFee)}</dd></div>
          </dl>
          <div className="flex justify-between items-baseline border-t border-ink/10 pt-5"><span className="text-[11px] uppercase tracking-[0.22em] font-semibold">Total</span><span className="font-display text-4xl">{formatPrice(t.total)}</span></div>
        </aside>
      </div>
    </div>
  );
};
