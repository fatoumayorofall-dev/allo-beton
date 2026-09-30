import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, Heart, KeyRound, Loader2, Lock, LogOut, MapPin, MessageCircle, Package, Pencil, RotateCcw, Ruler, ShieldCheck, ShoppingBag, Smartphone, Sparkles, UserRound, Volume2, Zap } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { useStore } from '../context/StoreContext';
import { DELIVERY_ZONES, SHOP_LOCATION, buildWhatsAppLink, zoneForPoint } from '../config/site';
import { LocationPicker } from '../components/LocationPicker';
import { usePageTitle } from '../utils/usePageTitle';
import { speak } from '../utils/speak';
import { InstallButton } from '../components/InstallApp';
import { ProductImage } from '../components/ProductImage';
import { BrandMark } from '../components/Logo';
import { Twinkles } from '../components/Magic';
import { ForYou, pickForHer } from '../components/ForYou';
import { canBuy } from '../utils/stock';
import type { Product } from '../data/types';
import { formatPrice } from '../utils/format';
import type { DeliveryLocation, OrderStatus } from '../data/types';
import { WhatsAppGlyph } from '../components/BrandLogos';

/** Numéro saisi → 9 chiffres (on accepte « 77 123 45 67 », « +221 77… », « 00221… »). */
const localDigits = (v: string) => {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('00221')) d = d.slice(5);
  else if (d.startsWith('221') && d.length > 9) d = d.slice(3);
  return d.slice(0, 9);
};
const pretty = (d: string) => d.replace(/^(\d{2})(\d{0,3})(\d{0,2})(\d{0,2}).*/, (_, a, b, c, e) => [a, b, c, e].filter(Boolean).join(' '));
const validLocal = (d: string) => /^7[05678]\d{7}$/.test(d);

const HELP_PHONE = 'Pour entrer dans votre espace Maefa, écrivez votre numéro de téléphone, puis touchez le bouton Continuer.';
const HELP_CODE = 'Ouvrez WhatsApp. Maefa vous a envoyé un code de quatre chiffres. Écrivez ces quatre chiffres dans les cases.';
const HELP_PIN = 'Votre code secret, ce sont quatre chiffres que vous choisissez vous-même. Il protège votre compte : ne le donnez à personne.';
/** Codes trop faciles à deviner */
const WEAK_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '1212', '2580']);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-[2rem] shadow-soft border border-ink/[0.05] p-6 sm:p-8">{children}</div>
);

const HelpVoice: React.FC<{ text: string }> = ({ text }) => (
  <button type="button" onClick={() => speak(text)} aria-label="Écouter l'explication"
    className="shrink-0 w-11 h-11 grid place-items-center rounded-full border border-ink/15 text-gold-dark hover:border-ink transition-colors">
    <Volume2 className="w-4 h-4" strokeWidth={1.5} />
  </button>
);

/** 4 grosses cases pour un code (un seul champ caché : copier-coller et remplissage automatique marchent). */
const DigitBoxes = React.forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; error?: boolean; disabled?: boolean; secret?: boolean; label: string; id: string; autoComplete?: string }>(
  ({ value, onChange, error, disabled, secret, label, id, autoComplete = 'one-time-code' }, ref) => (
    <label className="relative block" htmlFor={id}>
      <span className="sr-only">{label}</span>
      <input id={id} ref={ref} value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete={autoComplete}
        maxLength={4} disabled={disabled} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" data-testid={`${id}-input`} />
      <span className="grid grid-cols-4 gap-3" aria-hidden>
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={`h-[4.5rem] sm:h-20 rounded-2xl border-2 grid place-items-center font-display text-4xl bg-ivory/40 transition-all duration-300 ${
            error ? 'border-wine/70 bg-wine/[0.03]' : value.length === i && !disabled ? 'border-ink bg-white shadow-[0_0_0_5px_rgba(196,138,130,.16)]' : value[i] ? 'border-gold/70 bg-white' : 'border-ink/[0.1]'}`}>
            {value[i] ? (secret ? <span className="w-3.5 h-3.5 rounded-full bg-ink" /> : value[i]) : ''}
          </span>
        ))}
      </span>
    </label>
  ),
);

type Step = 'phone' | 'code' | 'pin' | 'pin-new' | 'pin-confirm' | 'locked';

const Login: React.FC<{ onDone: (isNew: boolean) => void }> = ({ onDone }) => {
  const { startLogin, verifyCode, loginWithPin } = useAccount();
  const [step, setStep] = useState<Step>('phone');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const phone = `+221${digits}`;
  const forgotLink = buildWhatsAppLink(`Bonjour Maefa Store 🌸 J'ai oublié le code secret de mon compte. Mon numéro : +221 ${pretty(digits)}`);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const go = (next: Step) => { setStep(next); setCode(''); setError(''); setTimeout(() => codeRef.current?.focus(), 120); };

  const send = async () => {
    if (!validLocal(digits)) { setError('Écrivez un numéro sénégalais : 70, 75, 76, 77 ou 78 suivi de 7 chiffres'); return; }
    setBusy(true);
    setError('');
    const r = await startLogin(phone);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    if (r.data.mode === 'pin') { go(r.data.locked ? 'locked' : r.data.hasPin ? 'pin' : 'pin-new'); return; }
    setDevCode(r.data.devCode ?? '');
    setWait(30);
    go('code');
  };

  const finish = async (fn: () => Promise<{ ok: boolean; error?: string; isNew?: boolean }>, onFail: () => void) => {
    setBusy(true);
    setError('');
    const r = await fn();
    setBusy(false);
    if (r.ok) onDone(!!r.isNew);
    else { setError(r.error ?? 'Code incorrect'); if (/bloqué/i.test(r.error ?? '')) setStep('locked'); else onFail(); }
  };

  const onDigits = (v: string) => {
    setCode(v);
    setError('');
    if (v.length < 4) return;
    if (step === 'code') finish(() => verifyCode(phone, v), () => { setCode(''); codeRef.current?.focus(); });
    else if (step === 'pin') finish(() => loginWithPin(phone, v), () => { setCode(''); codeRef.current?.focus(); });
    else if (step === 'pin-new') {
      if (WEAK_PINS.has(v)) { setError('Ce code est trop facile à deviner : choisissez-en un autre'); setCode(''); return; }
      setFirstPin(v);
      go('pin-confirm');
    } else if (step === 'pin-confirm') {
      if (v !== firstPin) { setError('Les deux codes ne sont pas pareils. Recommencez.'); setFirstPin(''); setStep('pin-new'); setCode(''); codeRef.current?.focus(); return; }
      finish(() => loginWithPin(phone, v), () => { setCode(''); setStep('pin-new'); });
    }
  };

  const back = (
    <button type="button" onClick={() => { setStep('phone'); setError(''); setCode(''); }} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] font-semibold text-ink/65 hover:text-ink">
      <ChevronLeft className="w-4 h-4" /> +221 {pretty(digits)} · changer
    </button>
  );
  const status = (
    <p className="mt-3 min-h-6 text-sm text-center" role="alert" id="code-error">
      {busy ? <Loader2 className="w-5 h-5 animate-spin inline text-gold" /> : error && <span className="text-wine">{error}</span>}
    </p>
  );

  if (step === 'phone') {
    return (
      <div data-testid="login-phone">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Espace cliente</p>
            <h1 className="font-display text-4xl sm:text-[2.75rem] mt-3 leading-[1.05]">Bienvenue chez <em className="text-gold-dark">Maefa</em></h1>
            <p className="text-ink/70 mt-3 leading-relaxed">Connexion ou création de compte : il suffit de votre numéro.</p>
          </div>
          <HelpVoice text={HELP_PHONE} />
        </div>
        <form className="mt-8" onSubmit={e => { e.preventDefault(); send(); }}>
          <label htmlFor="phone" className="field-label">Numéro de téléphone</label>
          <div className={`flex items-center rounded-2xl border bg-white overflow-hidden transition-[border-color,box-shadow] duration-300 ${error ? 'border-wine' : 'border-ink/[0.14] hover:border-ink/30 focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(196,138,130,.18)]'}`}>
            <span className="pl-4 pr-3 h-16 flex items-center gap-2 text-lg font-semibold border-r border-ink/10 bg-ivory-deep/50">🇸🇳 +221</span>
            <input id="phone" value={pretty(digits)} onChange={e => { setDigits(localDigits(e.target.value)); setError(''); }}
              inputMode="numeric" autoComplete="tel-national" placeholder="77 123 45 67" autoFocus
              className="flex-1 min-w-0 h-16 px-4 text-2xl font-semibold tracking-wider outline-none bg-transparent" />
          </div>
          {error && <p className="mt-2 text-sm text-wine" role="alert">{error}</p>}
          <button disabled={busy || !digits} className="btn-dark mt-6 w-full !h-16 !text-[13px]">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ink/70"><Lock className="w-3.5 h-3.5" /> Vos informations restent privées et ne sont jamais revendues.</p>
      </div>
    );
  }

  if (step === 'locked') {
    return (
      <div data-testid="login-locked">
        {back}
        <span className="mt-6 w-14 h-14 rounded-full bg-wine/10 text-wine grid place-items-center"><Lock className="w-6 h-6" strokeWidth={1.5} /></span>
        <h1 className="font-display text-3xl mt-4 leading-tight">Compte protégé</h1>
        <p className="text-ink/75 mt-3 leading-relaxed">Trop de codes incorrects ont été saisis. Pour votre sécurité, le compte est bloqué. Écrivez-nous : nous le débloquons en quelques minutes.</p>
        <a href={forgotLink} target="_blank" rel="noopener noreferrer" className="mt-6 w-full h-14 rounded-full bg-[#177a41] text-white font-semibold inline-flex items-center justify-center gap-2.5"><WhatsAppGlyph className="w-5 h-5" /> Débloquer sur WhatsApp</a>
      </div>
    );
  }

  const titles: Record<Exclude<Step, 'phone' | 'locked'>, { icon: React.ReactNode; title: string; text: React.ReactNode; help: string }> = {
    code: { icon: <MessageCircle className="w-5 h-5" strokeWidth={1.4} />, title: 'Le code reçu sur WhatsApp', text: <>Nous venons de l'envoyer au <strong className="text-ink">+221 {pretty(digits)}</strong>.</>, help: HELP_CODE },
    pin: { icon: <KeyRound className="w-5 h-5" strokeWidth={1.4} />, title: 'Votre code secret', text: 'Les 4 chiffres choisis lors de votre inscription.', help: HELP_PIN },
    'pin-new': { icon: <Sparkles className="w-5 h-5" strokeWidth={1.4} />, title: 'Créez votre code secret', text: 'Première visite : choisissez 4 chiffres faciles à retenir pour vous, difficiles à deviner pour les autres.', help: HELP_PIN },
    'pin-confirm': { icon: <ShieldCheck className="w-5 h-5" strokeWidth={1.4} />, title: 'Confirmez votre code', text: 'Écrivez les mêmes 4 chiffres une seconde fois.', help: HELP_PIN },
  };
  const t = titles[step];

  return (
    <div data-testid={`login-${step}`}>
      {back}
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <span className="w-12 h-12 rounded-full bg-blush/60 grid place-items-center text-gold-dark">{t.icon}</span>
          <h1 className="font-display text-3xl sm:text-4xl mt-4 leading-tight">{t.title}</h1>
          <p className="text-ink/70 mt-2 leading-relaxed">{t.text}</p>
        </div>
        <HelpVoice text={t.help} />
      </div>

      {step === 'pin-new' || step === 'pin-confirm' ? (
        <ol className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold" aria-label="Étapes">
          <li className={`flex-1 h-1 rounded-full ${step === 'pin-new' ? 'bg-ink' : 'bg-gold'}`} />
          <li className={`flex-1 h-1 rounded-full ${step === 'pin-confirm' ? 'bg-ink' : 'bg-ink/10'}`} />
        </ol>
      ) : null}

      {devCode && step === 'code' && (
        <div className="mt-5 p-4 rounded-2xl bg-amber-50 text-amber-900 text-sm flex items-center justify-between gap-3">
          <span>Mode test : votre code est <strong className="text-lg tracking-widest">{devCode}</strong></span>
          <button onClick={() => onDigits(devCode)} className="px-3 h-9 rounded-full bg-amber-900 text-white text-xs font-semibold shrink-0">Remplir</button>
        </div>
      )}

      <div className="mt-7">
        <DigitBoxes key={step} ref={codeRef} id={step === 'code' ? 'otp' : 'pin'} label={t.title} value={code} onChange={onDigits} error={!!error} disabled={busy}
          secret={step !== 'code'} autoComplete={step === 'code' ? 'one-time-code' : 'off'} />
      </div>
      {status}

      <div className="mt-4 flex flex-col items-center gap-3 text-sm">
        {step === 'code' && (
          <>
            <a href="whatsapp://" className="inline-flex items-center gap-2 px-5 h-12 rounded-full bg-[#177a41]/10 text-[#177a41] font-semibold"><WhatsAppGlyph className="w-5 h-5" /> Ouvrir WhatsApp</a>
            <button onClick={send} disabled={wait > 0 || busy} className="underline underline-offset-4 disabled:no-underline disabled:text-ink/40">
              {wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Je n\'ai rien reçu : renvoyer le code'}
            </button>
          </>
        )}
        {step === 'pin' && (
          <a href={forgotLink} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 text-ink/75 hover:text-ink">J'ai oublié mon code secret</a>
        )}
        {step === 'pin-new' && <p className="text-xs text-ink/60 text-center">Évitez 0000, 1234 ou votre année de naissance.</p>}
      </div>
    </div>
  );
};

/** Colonne d'accueil (ordinateur) / bandeau (téléphone) : ce que le compte apporte. */
const Welcome: React.FC = () => (
  <aside className="relative overflow-hidden rounded-[2rem] bg-ink text-ivory min-h-[13rem] lg:min-h-full" data-testid="account-welcome">
    <ProductImage src="/produits/sac-awa-taupe-1.jpg" alt="" label="" className="absolute inset-0 w-full h-full opacity-70 object-[50%_24%] lg:object-[50%_35%]" sizes="(min-width: 1024px) 40vw, 100vw" />
    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/20" aria-hidden />
    <div className="relative h-full flex flex-col justify-end p-6 sm:p-8 lg:p-10">
      <BrandMark light className="h-10 w-auto self-start" />
      <p className="font-display text-3xl lg:text-4xl leading-tight mt-5">Votre espace <em className="text-gold-light">privé</em></p>
      <ul className="mt-6 space-y-3.5 text-sm text-ivory/85 hidden sm:block">
        {[
          [Package, 'Suivez vos commandes et votre livreur en direct'],
          [Heart, 'Retrouvez vos favoris sur tous vos téléphones'],
          [Zap, 'Commandez en un geste : adresse et point GPS mémorisés'],
          [ShieldCheck, 'Sans mot de passe compliqué'],
        ].map(([Icon, text]) => {
          const I = Icon as typeof Package;
          return <li key={text as string} className="flex items-center gap-3"><span className="w-8 h-8 rounded-full border border-gold-light/40 grid place-items-center shrink-0"><I className="w-4 h-4 text-gold-light" strokeWidth={1.5} /></span>{text as string}</li>;
        })}
      </ul>
    </div>
  </aside>
);

/* ------------------------------------------------------------------ */
/*  Prénom (première connexion)                                        */
/* ------------------------------------------------------------------ */

const NameStep: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { saveProfile } = useAccount();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div data-testid="name-step">
      <span className="w-12 h-12 rounded-full bg-blush/60 grid place-items-center text-gold-dark"><Sparkles className="w-5 h-5" strokeWidth={1.4} /></span>
      <p className="eyebrow mt-6">Compte créé</p>
      <h1 className="font-display text-4xl sm:text-[2.75rem] mt-3 leading-[1.05]">Enchantée ! <em className="text-gold-dark">Comment vous appelez-vous ?</em></h1>
      <p className="text-ink/70 mt-3 leading-relaxed">Votre prénom, pour que le livreur et nous sachions à qui parler.</p>
      <form onSubmit={async e => { e.preventDefault(); if (!name.trim()) return; setBusy(true); await saveProfile({ firstName: name.trim() }); setBusy(false); onDone(); }} className="mt-8">
        <label htmlFor="first-name" className="field-label">Votre prénom</label>
        <input id="first-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex. : Awa" autoFocus autoComplete="given-name" maxLength={40}
          className="field !h-16 !text-2xl font-display" />
        <button disabled={!name.trim() || busy} className="btn-dark mt-6 w-full !h-16 !text-[13px]">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Entrer dans mon espace <ArrowRight className="w-4 h-4" /></>}
        </button>
        <button type="button" onClick={onDone} className="mt-3 w-full h-11 text-sm text-ink/65 hover:text-ink">Plus tard</button>
      </form>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Espace de la cliente                                               */
/* ------------------------------------------------------------------ */

/** Mes informations : prénom, nom, point GPS de la maison, quartier et précisions. */
const ProfileEditor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, saveProfile } = useAccount();
  const { saveCustomer, savedCustomer, notify } = useStore();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [location, setLocation] = useState<DeliveryLocation | undefined>(user?.location ?? savedCustomer?.location ?? undefined);
  const [zone, setZone] = useState(user?.zone || savedCustomer?.zone || DELIVERY_ZONES[0].name);
  const [address, setAddress] = useState(user?.address ?? '');
  const [busy, setBusy] = useState(false);
  const center = location ?? DELIVERY_ZONES.find(z => z.name === zone)?.center ?? SHOP_LOCATION;
  const pick = (loc: DeliveryLocation | undefined) => { setLocation(loc); if (loc) setZone(zoneForPoint(loc)); };

  return (
    <form className="mt-6 space-y-5" data-testid="profile-editor" onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      const ok = await saveProfile({ firstName: firstName.trim(), lastName: lastName.trim(), zone, address: address.trim(), location: location ?? null });
      setBusy(false);
      if (!ok) { notify('Enregistrement impossible, vérifiez votre connexion', 'error'); return; }
      saveCustomer({ ...(savedCustomer ?? {}), firstName: firstName.trim(), lastName: lastName.trim(), phone: user!.phone.replace(/^\+221/, ''), zone, address: address.trim(), location });
      notify('Informations enregistrées');
      onClose();
    }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label htmlFor="pf-first" className="field-label">Prénom</label><input id="pf-first" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={40} autoComplete="given-name" className="field !h-14 text-lg" /></div>
        <div><label htmlFor="pf-last" className="field-label">Nom de famille</label><input id="pf-last" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={40} autoComplete="family-name" className="field !h-14 text-lg" /></div>
      </div>
      <div>
        <p className="field-label">Ma maison sur la carte</p>
        <LocationPicker value={location} onChange={pick} initialCenter={center} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label htmlFor="pf-zone" className="field-label">Quartier / ville</label>
          <select id="pf-zone" value={zone} onChange={e => setZone(e.target.value)} className="field !h-14 text-lg">
            {DELIVERY_ZONES.map(z => <option key={z.name}>{z.name}</option>)}
          </select></div>
        <div><label htmlFor="pf-address" className="field-label">Précisions</label><input id="pf-address" value={address} onChange={e => setAddress(e.target.value)} maxLength={160} placeholder="Villa n°, étage, point de repère" autoComplete="street-address" className="field !h-14 text-lg" /></div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button type="button" onClick={onClose} className="btn-outline !border-ink/15">Annuler</button>
        <button disabled={busy} className="btn-dark sm:min-w-48">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-4 h-4" /> Enregistrer</>}</button>
      </div>
    </form>
  );
};

/** Changer son code secret : ancien code, nouveau, confirmation. */
const PinChanger: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, changePin } = useAccount();
  const { notify } = useStore();
  const [step, setStep] = useState<'current' | 'next' | 'confirm'>(user?.hasPin ? 'current' : 'next');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, [step]);

  const onDigits = async (v: string) => {
    setCode(v);
    setError('');
    if (v.length < 4) return;
    if (step === 'current') { setCurrent(v); setCode(''); setStep('next'); return; }
    if (step === 'next') {
      if (WEAK_PINS.has(v)) { setError('Ce code est trop facile à deviner : choisissez-en un autre'); setCode(''); return; }
      setNext(v); setCode(''); setStep('confirm'); return;
    }
    if (v !== next) { setError('Les deux codes ne sont pas pareils. Recommencez.'); setCode(''); setStep('next'); return; }
    setBusy(true);
    const r = await changePin(current, v);
    setBusy(false);
    if (r.ok) { notify('Nouveau code secret enregistré'); onClose(); return; }
    setError(r.error ?? 'Changement impossible');
    setCode('');
    setStep(/actuel/i.test(r.error ?? '') ? 'current' : 'next');
  };
  const label = { current: 'Mon code actuel', next: 'Mon nouveau code', confirm: 'Le nouveau code, une seconde fois' }[step];

  return (
    <div className="mt-5 p-5 rounded-3xl bg-ivory/70 border border-ink/[0.06]" data-testid="pin-changer">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{label}</p>
        <span className="text-[11px] text-ink/60 tabular-nums">{['current', 'next', 'confirm'].indexOf(step) + (user?.hasPin ? 1 : 0)}/{user?.hasPin ? 3 : 2}</span>
      </div>
      <div className="mt-4 max-w-xs"><DigitBoxes key={step} ref={ref} id="new-pin" label={label} value={code} onChange={onDigits} error={!!error} disabled={busy} secret autoComplete="off" /></div>
      <p className="mt-3 min-h-5 text-sm" role="alert">{busy ? <Loader2 className="w-4 h-4 animate-spin text-gold" /> : error && <span className="text-wine">{error}</span>}</p>
      <button type="button" onClick={onClose} className="mt-1 text-sm underline underline-offset-4 text-ink/65 hover:text-ink">Annuler</button>
    </div>
  );
};

/** Petit signal sur un favori : prix en baisse ou pièce sur commande (le stock n'est jamais affiché). */
const favSignal = (p: Product) =>
  p.oldPrice && p.oldPrice > p.price ? 'Prix doux' : p.stock <= 0 && p.preorderDays ? 'Sur commande' : null;

/** Étapes affichées pour la dernière commande. */
const STEPS: { status: OrderStatus[]; label: string }[] = [
  { status: ['en_attente'], label: 'Reçue' },
  { status: ['confirmee', 'en_preparation'], label: 'Préparée' },
  { status: ['expediee'], label: 'En route' },
  { status: ['livree'], label: 'Livrée' },
];

const Panel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; id?: string; className?: string }> = ({ title, action, children, id, className = '' }) => (
  <section id={id} className={`scroll-mt-28 bg-white rounded-[2rem] border border-ink/[0.06] shadow-[0_1px_2px_rgba(36,20,30,.04),0_12px_40px_-18px_rgba(36,20,30,.18)] p-6 sm:p-7 ${className}`}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-2xl">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const EmptyState: React.FC<{ Icon: typeof Package; text: string; children?: React.ReactNode }> = ({ Icon, text, children }) => (
  <div className="mt-5 rounded-3xl border border-dashed border-ink/15 bg-ivory/50 p-6 text-center">
    <span className="mx-auto w-14 h-14 rounded-full bg-white shadow-soft grid place-items-center text-gold-dark"><Icon className="w-6 h-6" strokeWidth={1.3} /></span>
    <p className="mt-4 text-sm text-ink/75 leading-relaxed max-w-xs mx-auto">{text}</p>
    {children}
  </div>
);

/**
 * Espace cliente : un salon à son nom.
 * - accueil (prénom, ancienneté, chiffres clés) avec photo
 * - profil à compléter, la dernière commande et ses étapes, ses favoris
 * - ses informations (adresse + point GPS, code secret), des raccourcis utiles
 */
const Dashboard: React.FC = () => {
  const { user, remoteOrders, logout } = useAccount();
  const { orders, wishlist, getProduct, products, addToCart, setCartOpen, notify, openQuickView } = useStore();
  const [editing, setEditing] = useState<'profile' | 'pin' | null>(null);
  const allOrders = [...new Map([...remoteOrders, ...orders].map(o => [o.id, o])).values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = allOrders.filter(o => !['livree', 'annulee'].includes(o.status)).length;
  if (!user) return null;
  const local = user.phone.replace(/^\+221/, '');
  const last = allOrders[0];
  const stepIndex = last ? STEPS.findIndex(st => st.status.includes(last.status)) : -1;
  const favs = wishlist.map(id => getProduct(id)).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 4);
  const picks = pickForHer(products, [...allOrders.flatMap(o => o.items.map(i => i.productId)), ...wishlist], wishlist);
  const reorderable = last ? last.items.filter(i => !i.market && getProduct(i.productId) && canBuy(getProduct(i.productId)!)) : [];
  const reorder = () => {
    let n = 0;
    for (const i of reorderable) if (addToCart(getProduct(i.productId)!, { size: i.size, color: i.color, quantity: i.quantity, silent: true })) n++;
    if (n) { notify(n > 1 ? `${n} pièces remises dans votre panier` : 'Pièce remise dans votre panier'); setCartOpen(true); }
  };
  const quickBuy = (p: Product) => {
    if (p.sizes.length > 1 || p.colors.length > 1) openQuickView(p);
    else addToCart(p, { size: p.sizes[0], color: p.colors[0]?.name });
  };
  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : null;
  const open = (what: 'profile' | 'pin') => {
    setEditing(what);
    setTimeout(() => document.getElementById('mes-infos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // Profil à compléter : ce qui rend la prochaine commande plus rapide
  const todo = [
    { done: !!user.firstName, label: 'Mon prénom', act: () => open('profile') },
    { done: !!(user.location || user.address), label: 'Mon adresse', act: () => open('profile') },
    { done: wishlist.length > 0, label: 'Un coup de cœur', to: '/boutique' },
    { done: allOrders.length > 0, label: 'Ma 1re commande', to: '/boutique?tri=nouveautes' },
  ];
  const doneCount = todo.filter(t => t.done).length;

  const links = [
    { to: '/mes-commandes', Icon: Package, label: 'Mes commandes', hint: pending ? `${pending} en cours` : `${allOrders.length} au total` },
    { to: '/favoris', Icon: Heart, label: 'Mes favoris', hint: `${wishlist.length} pièce${wishlist.length > 1 ? 's' : ''}` },
    { to: '/faq#tailles', Icon: Ruler, label: 'Guide des tailles', hint: 'Trouver ma pointure' },
    { href: buildWhatsAppLink(`Bonjour Maefa, c'est ${user.firstName || 'une cliente'} (+221 ${local}).`), Icon: MessageCircle, label: 'Aide', hint: 'Sur WhatsApp' },
  ];
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const addressLine = [user.location?.label, user.address].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5 pb-24 lg:pb-0" data-testid="account-dashboard">
      {/* Accueil */}
      <section className="relative overflow-hidden rounded-[2.25rem] bg-ink text-ivory" data-dark>
        <ProductImage src="/produits/sac-awa-taupe-1.jpg" alt="" label="" className="absolute inset-y-0 right-0 w-[62%] sm:w-1/2 h-full object-[50%_30%] opacity-80" sizes="(min-width: 640px) 50vw, 62vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink from-35% via-ink/85 via-55% to-ink/10" aria-hidden />
        <Twinkles count={14} seed={5} />
        <div className="relative p-7 sm:p-10 lg:p-12 max-w-xl">
          <BrandMark light className="h-9 w-auto" />
          <p className="font-script text-4xl text-gold-light leading-none mt-7">Bonjour</p>
          <h1 className="font-display text-4xl sm:text-5xl mt-1 break-words">{user.firstName || 'chère cliente'}</h1>
          <p className="text-ivory/70 text-sm mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> +221 {pretty(local)}</span>
            {since && <span className="text-ivory/55">Cliente depuis {since}</span>}
          </p>
          <dl className="mt-7 inline-grid grid-cols-3 rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/10 divide-x divide-white/10">
            {[[String(allOrders.length), 'commande' + (allOrders.length > 1 ? 's' : '')], [String(pending), 'en cours'], [String(wishlist.length), 'favori' + (wishlist.length > 1 ? 's' : '')]].map(([n, l]) => (
              <div key={l} className="px-4 sm:px-6 py-3.5 flex flex-col-reverse">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-ivory/65 mt-1.5">{l}</dt>
                <dd className="font-display text-3xl tabular-nums leading-none">{n}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/boutique?tri=nouveautes" className="btn-light !h-12">Les nouveautés <ArrowRight className="w-4 h-4" /></Link>
            {picks.length > 0 && <a href="#pour-vous" className="btn-ghost-light !h-12">Ma sélection</a>}
          </div>
        </div>
      </section>

      {/* Profil à compléter */}
      {doneCount < todo.length && (
        <section className="rounded-[2rem] bg-blush/40 border border-gold/20 p-5 sm:p-6" data-testid="account-todo">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Mon compte est prêt à <span className="text-gold-dark tabular-nums">{Math.round((doneCount / todo.length) * 100)} %</span></p>
            <span className="text-xs text-ink/60 tabular-nums">{doneCount}/{todo.length}</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark transition-[width] duration-700" style={{ width: `${(doneCount / todo.length) * 100}%` }} /></div>
          <ul className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {todo.map(t => {
              const cls = `w-full h-full min-h-12 px-3 py-2 rounded-2xl text-sm flex items-center gap-2 text-left transition-colors ${t.done ? 'bg-white/60 text-ink/55' : 'bg-white text-ink font-semibold hover:bg-ink hover:text-ivory shadow-soft'}`;
              const inner = <>{t.done ? <Check className="w-4 h-4 text-emerald-700 shrink-0" /> : <span className="w-4 h-4 rounded-full border-2 border-gold shrink-0" />}<span className={t.done ? 'line-through decoration-ink/25' : ''}>{t.label}</span></>;
              return <li key={t.label}>{t.done ? <span className={cls}>{inner}</span> : t.to ? <Link to={t.to} className={cls}>{inner}</Link> : <button type="button" onClick={t.act} className={cls}>{inner}</button>}</li>;
            })}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-5 items-start">
        {/* Dernière commande */}
        <Panel title="Ma dernière commande" action={allOrders.length > 1 && <Link to="/mes-commandes" className="text-xs font-semibold underline underline-offset-4">Toutes</Link>}>
          {!last ? (
            <EmptyState Icon={ShoppingBag} text="Vous n'avez pas encore commandé. Livraison à Dakar en 24 h, paiement Wave, Orange Money ou à la livraison.">
              <Link to="/boutique?tri=nouveautes" className="btn-dark mt-5">Découvrir la boutique <ArrowRight className="w-4 h-4" /></Link>
            </EmptyState>
          ) : (
            <div className="mt-4" data-testid="last-order">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span><strong>{last.id}</strong> <span className="text-ink/70">· {new Date(last.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span></span>
                <span className="font-display text-2xl tabular-nums">{formatPrice(last.total)}</span>
              </div>
              {last.status === 'annulee' ? (
                <p className="mt-4 text-sm text-wine">Commande annulée.</p>
              ) : (
                <ol className="mt-6 grid grid-cols-4" aria-label="Étapes de la commande">
                  {STEPS.map((st, i) => {
                    const done = i <= stepIndex;
                    return (
                      <li key={st.label} className="relative flex flex-col items-center text-center" aria-current={i === stepIndex ? 'step' : undefined}>
                        {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= stepIndex ? 'bg-gold' : 'bg-ink/10'}`} aria-hidden />}
                        <span className={`relative w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold ${done ? 'bg-ink text-gold-light' : 'bg-white border border-ink/15 text-ink/65'} ${i === stepIndex ? 'ring-4 ring-gold/25' : ''}`}>
                          {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                        </span>
                        <span className={`mt-2 text-[11px] ${i === stepIndex ? 'font-semibold text-ink' : 'text-ink/60'}`}>{st.label}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
              <ul className="mt-6 flex gap-2">
                {last.items.slice(0, 4).map(i => (
                  <li key={i.key}><ProductImage src={i.image} alt={i.name} label="" className="w-14 h-[4.4rem] rounded-xl" /></li>
                ))}
                {last.items.length > 4 && <li className="w-14 h-[4.4rem] rounded-xl bg-ivory-deep grid place-items-center text-xs">+{last.items.length - 4}</li>}
              </ul>
              <div className="mt-6 grid sm:grid-cols-2 gap-2">
                <Link to={`/suivi?commande=${encodeURIComponent(last.id)}&tel=${encodeURIComponent(local)}`} className="btn-dark !px-5">Suivre <ArrowRight className="w-4 h-4" /></Link>
                {reorderable.length > 0 && <button onClick={reorder} className="btn-outline !px-5" data-testid="reorder"><RotateCcw className="w-4 h-4" strokeWidth={1.5} /> Recommander</button>}
              </div>
            </div>
          )}
        </Panel>

        {/* Favoris */}
        <Panel title="Mes favoris" action={favs.length > 0 && <Link to="/favoris" className="text-xs font-semibold underline underline-offset-4">Tout voir</Link>}>
          {favs.length === 0 ? (
            <EmptyState Icon={Heart} text="Touchez le cœur sur une pièce pour la garder ici, sur tous vos téléphones.">
              <Link to="/boutique" className="btn-outline mt-5 !h-11">Voir les sacs</Link>
            </EmptyState>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3" data-testid="account-favs">
              {favs.map(p => (
                <li key={p.id} className="relative">
                  <Link to={`/produit/${p.slug}`} className="group block">
                    <span className="relative block overflow-hidden rounded-2xl">
                      <ProductImage src={p.images[0]} alt={p.name} label="" className="w-full aspect-[4/5] transition-transform duration-700 group-hover:scale-[1.03]" />
                      {favSignal(p) && <span className="absolute top-2 left-2 px-2 py-1 bg-ivory/90 backdrop-blur text-[8px] uppercase tracking-[0.22em] font-semibold text-ink" data-testid="fav-signal">{favSignal(p)}</span>}
                    </span>
                    <span className="block mt-2 text-sm leading-tight line-clamp-1">{p.name}</span>
                    <span className="block text-xs text-ink/70">{formatPrice(p.price)}{p.oldPrice && <span className="ml-1.5 line-through text-ink/65">{formatPrice(p.oldPrice)}</span>}</span>
                  </Link>
                  {canBuy(p) && (
                    <button onClick={() => quickBuy(p)} aria-label={`Ajouter « ${p.name} » au panier`} data-testid="fav-buy"
                      className="absolute right-2 bottom-[3.4rem] w-10 h-10 rounded-full bg-ink text-ivory grid place-items-center shadow-soft hover:bg-gold-dark transition-colors">
                      <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Mes informations */}
      <Panel id="mes-infos" title="Mes informations" action={editing !== 'profile' && (
        <button onClick={() => open('profile')} className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-ink/15 hover:border-ink text-sm font-semibold" data-testid="edit-profile"><Pencil className="w-3.5 h-3.5" /> Modifier</button>
      )}>
        {editing === 'profile' ? <ProfileEditor onClose={() => setEditing(null)} /> : (
          <dl className="mt-5 grid sm:grid-cols-2 gap-x-8 divide-y divide-ink/[0.06] sm:divide-y-0">
            {[
              { Icon: UserRound, label: 'Nom', value: fullName || <span className="text-ink/50">À compléter</span> },
              { Icon: Smartphone, label: 'Téléphone', value: `+221 ${pretty(local)}` },
              { Icon: MapPin, label: 'Adresse de livraison', value: addressLine || user.zone ? <>{user.location?.label ? addressLine : [user.address, user.zone].filter(Boolean).join(', ')}{user.location && <span className="mt-1 flex items-center gap-1 text-xs text-emerald-800"><Check className="w-3.5 h-3.5" /> Point GPS enregistré : le livreur vient directement</span>}</> : <span className="text-ink/50">Pas encore enregistrée</span> },
              ...(user.hasPin ? [{ Icon: KeyRound, label: 'Code secret', value: <span className="flex gap-1.5 py-1.5" aria-label="Enregistré">{[0, 1, 2, 3].map(i => <span key={i} className="w-2 h-2 rounded-full bg-ink" />)}</span>, action: editing !== 'pin' && <button onClick={() => setEditing('pin')} className="text-xs font-semibold underline underline-offset-4" data-testid="change-pin">Changer</button> }] : []),
            ].map(({ Icon, label, value, action }: { Icon: typeof Package; label: string; value: React.ReactNode; action?: React.ReactNode }) => (
              <div key={label} className="py-4 flex items-start gap-3.5 sm:border-b sm:border-ink/[0.06]">
                <span className="w-10 h-10 rounded-full bg-ivory grid place-items-center shrink-0 text-gold-dark"><Icon className="w-[18px] h-[18px]" strokeWidth={1.4} /></span>
                <div className="min-w-0 flex-1"><dt className="text-[10px] uppercase tracking-[0.18em] text-ink/55 font-semibold">{label}</dt><dd className="mt-0.5 text-[15px] break-words">{value}</dd></div>
                {action}
              </div>
            ))}
          </dl>
        )}
        {editing === 'pin' && <PinChanger onClose={() => setEditing(null)} />}
      </Panel>

      {/* Raccourcis */}
      <nav aria-label="Mon compte" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {links.map(({ to, href, Icon, label, hint }) => {
          const inner = (
            <>
              <span className="w-11 h-11 rounded-full bg-ivory grid place-items-center text-gold-dark group-hover:bg-ink group-hover:text-gold-light transition-colors"><Icon className="w-5 h-5" strokeWidth={1.3} /></span>
              <span className="min-w-0"><span className="block font-semibold leading-tight">{label}</span><span className="text-xs text-ink/65">{hint}</span></span>
              <ArrowRight className="hidden sm:block w-4 h-4 ml-auto text-ink/30 group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
            </>
          );
          const cls = 'group flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 rounded-[1.5rem] bg-white border border-ink/[0.06] hover:shadow-soft hover:-translate-y-0.5 transition-all duration-500';
          return to
            ? <Link key={label} to={to} className={cls}>{inner}</Link>
            : <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
        })}
      </nav>

      {/* Sélection personnelle */}
      <ForYou id="pour-vous" className="pt-8" />

      <div className="pt-4 grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        <InstallButton big />
        <button onClick={logout} className="w-full h-14 rounded-full border border-ink/15 text-ink/70 hover:text-ink hover:border-ink/40 inline-flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Me déconnecter</button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const Account: React.FC = () => {
  usePageTitle('Mon compte', 'Créez votre compte Maefa avec votre numéro de téléphone : suivez vos commandes et gardez vos favoris.');
  const { status, user } = useAccount();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [askName, setAskName] = useState(false);
  const back = params.get('retour');

  const naming = status === 'user' && askName && !user?.firstName;
  const done = () => { setAskName(false); if (back?.startsWith('/')) navigate(back); };

  return (
    <div className="bg-ivory min-h-[80vh]">
      <div className={`${status === 'user' || status === 'guest' ? 'max-w-5xl' : 'max-w-md'} mx-auto px-4 py-8 sm:py-14`}>
        {status === 'loading' && <div className="grid place-items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>}
        {status === 'off' && (
          <Card>
            <span className="w-12 h-12 rounded-full border border-gold/50 grid place-items-center text-gold-dark"><Smartphone className="w-5 h-5" strokeWidth={1.3} /></span>
            <h1 className="font-display text-3xl mt-4">Mon compte Maefa</h1>
            <p className="text-ink/75 mt-2">La création de compte n'est pas disponible pour le moment. Vous pouvez tout de même commander et suivre vos commandes depuis ce téléphone.</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/mes-commandes" className="btn-dark w-full">Mes commandes</Link>
              <InstallButton big />
            </div>
          </Card>
        )}
        {(status === 'guest' || naming) && (
          <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-5 items-stretch">
            <Welcome />
            <div className="bg-white rounded-[2rem] shadow-soft border border-ink/[0.05] p-6 sm:p-10 flex flex-col justify-center">
              {naming ? <NameStep onDone={done} /> : <Login onDone={isNew => (isNew ? setAskName(true) : done())} />}
            </div>
          </div>
        )}
        {status === 'user' && !naming && <Dashboard />}
      </div>
    </div>
  );
};
