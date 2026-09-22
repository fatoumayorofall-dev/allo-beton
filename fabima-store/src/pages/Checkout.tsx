import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote, Check, ChevronLeft, CreditCard, Loader2, Lock, Smartphone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { DELIVERY_ZONES } from '../config/site';
import type { PaymentMethod } from '../data/types';
import { formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductImage } from '../components/ProductImage';
import { PromoBox } from './Cart';

const PAYMENT_METHODS: { id: PaymentMethod; name: string; desc: string; color: string; Icon: typeof Smartphone }[] = [
  { id: 'wave', name: 'Wave', desc: 'Paiement instantané, sans frais', color: '#1dc4ff', Icon: Smartphone },
  { id: 'orange_money', name: 'Orange Money', desc: 'Validation par code secret', color: '#ff7900', Icon: Smartphone },
  { id: 'free_money', name: 'Free Money', desc: 'Paiement mobile Free', color: '#cd0f2d', Icon: Smartphone },
  { id: 'card', name: 'Carte bancaire', desc: 'Visa, Mastercard', color: '#14110f', Icon: CreditCard },
  { id: 'cash', name: 'Paiement à la livraison', desc: 'Espèces à la réception', color: '#11694f', Icon: Banknote },
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
}

export const Checkout: React.FC = () => {
  usePageTitle('Commande');
  const { cart, computeTotals, placeOrder, clearCart, promoCode, notify } = useStore();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>({ firstName: '', lastName: '', phone: '', email: '', zone: DELIVERY_ZONES[0].name, address: '', notes: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [method, setMethod] = useState<PaymentMethod>('wave');
  const [payPhone, setPayPhone] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });
  const [processing, setProcessing] = useState(false);

  if (cart.length === 0 && !processing) return <Navigate to="/panier" replace />;

  const zone = DELIVERY_ZONES.find(z => z.name === form.zone) ?? DELIVERY_ZONES[0];
  const t = computeTotals(zone.fee);
  const isMobile = method === 'wave' || method === 'orange_money' || method === 'free_money';

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setErrors(er => ({ ...er, [key]: undefined }));
  };

  const validateInfo = () => {
    const er: typeof errors = {};
    if (!form.firstName.trim()) er.firstName = 'Prénom requis';
    if (!form.lastName.trim()) er.lastName = 'Nom requis';
    if (!PHONE_RE.test(form.phone.trim())) er.phone = 'Numéro sénégalais invalide (ex : 77 123 45 67)';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'E-mail invalide';
    if (form.address.trim().length < 5) er.address = 'Adresse trop courte';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const goToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInfo()) return;
    if (!payPhone) setPayPhone(form.phone);
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
      customer: { ...form, email: form.email || undefined, notes: form.notes || undefined },
      items: cart,
      subtotal: t.subtotal,
      discount: t.discount,
      deliveryFee: t.deliveryFee,
      total: t.total,
      promoCode: promoCode ?? undefined,
      paymentMethod: method,
      paymentStatus: method === 'cash' ? 'en_attente' : 'paye',
    });
    navigate(`/confirmation/${order.id}`, { replace: true });
    clearCart();
  };

  const input = (key: keyof FormState, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input value={form[key]} onChange={set(key)} {...props}
        className={`mt-1.5 w-full px-4 py-3 rounded-xl border bg-white outline-none focus:border-ink ${errors[key] ? 'border-[#a3142b]' : 'border-ink/15'}`} />
      {errors[key] && <span className="text-xs text-[#a3142b] mt-1 block">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <Link to="/panier" className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink"><ChevronLeft className="w-4 h-4" /> Retour au panier</Link>
      <h1 className="font-display text-4xl sm:text-5xl mt-4">Finaliser ma commande</h1>

      {/* Étapes */}
      <ol className="flex items-center gap-3 mt-6 mb-10 text-sm">
        {['Livraison', 'Paiement'].map((label, i) => {
          const n = i + 1;
          const done = step > n;
          return (
            <li key={label} className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full grid place-items-center font-semibold ${step >= n ? 'bg-ink text-ivory' : 'bg-ink/10 text-ink/50'}`}>
                {done ? <Check className="w-4 h-4" /> : n}
              </span>
              <span className={step >= n ? 'font-medium' : 'text-ink/50'}>{label}</span>
              {n === 1 && <span className="w-12 h-px bg-ink/20" />}
            </li>
          );
        })}
      </ol>

      <div className="grid lg:grid-cols-[1fr_400px] gap-10 items-start">
        <div>
          {step === 1 ? (
            <form onSubmit={goToPayment} className="bg-white rounded-3xl p-6 sm:p-8 space-y-5" noValidate>
              <h2 className="font-display text-2xl">Vos coordonnées</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {input('firstName', 'Prénom *', { autoComplete: 'given-name' })}
                {input('lastName', 'Nom *', { autoComplete: 'family-name' })}
                {input('phone', 'Téléphone *', { type: 'tel', placeholder: '77 123 45 67', autoComplete: 'tel' })}
                {input('email', 'E-mail (facultatif)', { type: 'email', autoComplete: 'email' })}
              </div>

              <h2 className="font-display text-2xl pt-4">Adresse de livraison</h2>
              <label className="block">
                <span className="text-sm font-medium">Zone de livraison *</span>
                <select value={form.zone} onChange={set('zone')} className="mt-1.5 w-full px-4 py-3 rounded-xl border border-ink/15 bg-white outline-none focus:border-ink">
                  {DELIVERY_ZONES.map(z => <option key={z.name} value={z.name}>{z.name} — {formatPrice(z.fee)} · {z.delay}</option>)}
                </select>
              </label>
              {input('address', 'Adresse précise *', { placeholder: 'Quartier, rue, n° de villa, point de repère…', autoComplete: 'street-address' })}
              <label className="block">
                <span className="text-sm font-medium">Instructions (facultatif)</span>
                <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Ex : appeler avant de passer, livrer après 17h…"
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-ink/15 bg-white outline-none focus:border-ink resize-none" />
              </label>
              <button className="w-full py-4 rounded-full bg-ink text-ivory font-semibold hover:bg-ink-soft">Continuer vers le paiement</button>
            </form>
          ) : (
            <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-ivory">
                <div className="text-sm">
                  <p className="font-semibold">{form.firstName} {form.lastName} · {form.phone}</p>
                  <p className="text-ink/60">{form.address}, {form.zone}</p>
                </div>
                <button onClick={() => setStep(1)} className="text-sm underline underline-offset-4 shrink-0">Modifier</button>
              </div>

              <h2 className="font-display text-2xl">Mode de paiement</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-colors ${method === m.id ? 'border-ink bg-ivory' : 'border-ink/10 hover:border-ink/30'}`}>
                    <span className="w-11 h-11 rounded-xl grid place-items-center text-white shrink-0" style={{ background: m.color }}><m.Icon className="w-5 h-5" /></span>
                    <span className="flex-1"><strong className="block text-sm">{m.name}</strong><span className="text-xs text-ink/55">{m.desc}</span></span>
                    <span className={`w-5 h-5 rounded-full border-2 grid place-items-center ${method === m.id ? 'border-ink' : 'border-ink/20'}`}>
                      {method === m.id && <span className="w-2.5 h-2.5 rounded-full bg-ink" />}
                    </span>
                  </button>
                ))}
              </div>

              {isMobile && (
                <label className="block">
                  <span className="text-sm font-medium">Numéro {PAYMENT_METHODS.find(m => m.id === method)?.name}</span>
                  <input value={payPhone} onChange={e => setPayPhone(e.target.value)} type="tel" placeholder="77 123 45 67"
                    className="mt-1.5 w-full px-4 py-3 rounded-xl border border-ink/15 outline-none focus:border-ink" />
                  <span className="text-xs text-ink/55 mt-1.5 block">Vous recevrez une demande de validation de {formatPrice(t.total)} sur votre téléphone.</span>
                </label>
              )}
              {method === 'card' && (
                <div className="grid grid-cols-2 gap-3">
                  <input value={card.number} placeholder="Numéro de carte" inputMode="numeric" aria-label="Numéro de carte"
                    onChange={e => setCard(c => ({ ...c, number: e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ') }))}
                    className="col-span-2 px-4 py-3 rounded-xl border border-ink/15 outline-none focus:border-ink" />
                  <input value={card.expiry} placeholder="MM/AA" inputMode="numeric" aria-label="Date d'expiration"
                    onChange={e => setCard(c => ({ ...c, expiry: e.target.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/, '$1/') }))}
                    className="px-4 py-3 rounded-xl border border-ink/15 outline-none focus:border-ink" />
                  <input value={card.cvc} placeholder="CVC" inputMode="numeric" aria-label="Cryptogramme"
                    onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className="px-4 py-3 rounded-xl border border-ink/15 outline-none focus:border-ink" />
                </div>
              )}
              {method === 'cash' && (
                <p className="text-sm p-4 rounded-2xl bg-emerald-50 text-emerald-900">
                  Préparez <strong>{formatPrice(t.total)}</strong> en espèces. Notre livreur vous remettra un reçu. Vous pouvez aussi payer par Wave à la réception.
                </p>
              )}

              <button onClick={pay} disabled={processing}
                className="w-full py-4 rounded-full bg-ink text-ivory font-semibold hover:bg-ink-soft disabled:opacity-70 flex items-center justify-center gap-2">
                {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> {method === 'cash' ? 'Validation…' : 'En attente de validation…'}</>
                  : <><Lock className="w-4 h-4" /> {method === 'cash' ? 'Confirmer la commande' : `Payer ${formatPrice(t.total)}`}</>}
              </button>
              <p className="text-xs text-center text-ink/50 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" /> Paiement 100 % sécurisé · Vos données ne sont jamais stockées</p>
            </div>
          )}
        </div>

        {/* Récapitulatif */}
        <aside className="bg-white rounded-3xl p-6 sm:p-7 space-y-5 lg:sticky lg:top-28">
          <h2 className="font-display text-2xl">Votre commande</h2>
          <ul className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {cart.map(i => (
              <li key={i.key} className="flex gap-3">
                <div className="relative shrink-0">
                  <ProductImage src={i.image} alt={i.name} className="w-16 h-20 rounded-xl" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-ivory text-[10px] grid place-items-center">{i.quantity}</span>
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-medium line-clamp-1">{i.name}</p>
                  <p className="text-xs text-ink/50">{[i.color, i.size && `T. ${i.size}`].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <PromoBox />
          <div className="space-y-2 text-sm border-t border-ink/10 pt-4">
            <div className="flex justify-between"><span>Sous-total</span><span>{formatPrice(t.subtotal)}</span></div>
            {t.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Réduction</span><span>-{formatPrice(t.discount)}</span></div>}
            <div className="flex justify-between"><span>Livraison ({zone.name})</span><span>{t.deliveryFee === 0 ? <strong className="text-emerald-700">Offerte</strong> : formatPrice(t.deliveryFee)}</span></div>
          </div>
          <div className="flex justify-between text-xl border-t border-ink/10 pt-4"><span>Total</span><strong>{formatPrice(t.total)}</strong></div>
        </aside>
      </div>
    </div>
  );
};
