import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Heart, Loader2, LogOut, MapPin, MessageCircle, Package, Pencil, Ruler, ShieldCheck, Smartphone, Sparkles, Volume2, Zap } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { useStore } from '../context/StoreContext';
import { DELIVERY_ZONES, buildWhatsAppLink } from '../config/site';
import { usePageTitle } from '../utils/usePageTitle';
import { speak } from '../utils/speak';
import { InstallButton } from '../components/InstallApp';
import { ProductImage } from '../components/ProductImage';
import { BrandMark } from '../components/Logo';
import { Twinkles } from '../components/Magic';
import { formatPrice } from '../utils/format';
import type { OrderStatus } from '../data/types';

/** Numéro saisi → 9 chiffres (on accepte « 77 123 45 67 », « +221 77… », « 00221… »). */
const localDigits = (v: string) => {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('00221')) d = d.slice(5);
  else if (d.startsWith('221') && d.length > 9) d = d.slice(3);
  return d.slice(0, 9);
};
const pretty = (d: string) => d.replace(/^(\d{2})(\d{0,3})(\d{0,2})(\d{0,2}).*/, (_, a, b, c, e) => [a, b, c, e].filter(Boolean).join(' '));
const validLocal = (d: string) => /^7[05678]\d{7}$/.test(d);

const HELP_PHONE = 'Pour créer votre compte Fabima, écrivez votre numéro de téléphone, puis touchez le bouton vert. Vous allez recevoir un code de quatre chiffres sur WhatsApp.';
const HELP_CODE = 'Ouvrez WhatsApp. Fabima vous a envoyé un code de quatre chiffres. Écrivez ces quatre chiffres dans les cases.';

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-[2rem] shadow-soft border border-ink/[0.05] p-6 sm:p-8">{children}</div>
);

const HelpVoice: React.FC<{ text: string }> = ({ text }) => (
  <button type="button" onClick={() => speak(text)} className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-blush/60 text-sm">
    <Volume2 className="w-4 h-4 text-wine" /> Écouter
  </button>
);

/* ------------------------------------------------------------------ */
/*  Connexion / inscription                                            */
/* ------------------------------------------------------------------ */

const Login: React.FC<{ onDone: (isNew: boolean) => void }> = ({ onDone }) => {
  const { startLogin, verifyCode } = useAccount();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    if (!validLocal(digits)) { setError('Écrivez un numéro sénégalais : 70, 75, 76, 77 ou 78 suivi de 7 chiffres'); return; }
    setBusy(true);
    setError('');
    const r = await startLogin(`+221${digits}`);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setDevCode(r.data.devCode ?? '');
    setCode('');
    setStep('code');
    setWait(30);
    setTimeout(() => codeRef.current?.focus(), 100);
  };

  const check = async (value: string) => {
    setBusy(true);
    setError('');
    const r = await verifyCode(`+221${digits}`, value);
    setBusy(false);
    if (r.ok) onDone(!!r.isNew);
    else { setError(r.error ?? 'Code incorrect'); setCode(''); codeRef.current?.focus(); }
  };

  const onCode = (v: string) => {
    const c = v.replace(/\D/g, '').slice(0, 4);
    setCode(c);
    setError('');
    if (c.length === 4) check(c);
  };

  if (step === 'phone') {
    return (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="w-12 h-12 rounded-full border border-gold/50 grid place-items-center text-gold-dark"><Smartphone className="w-5 h-5" strokeWidth={1.3} /></span>
            <h1 className="font-display text-4xl mt-4 leading-tight">Mon compte Fabima</h1>
            <p className="text-ink/75 mt-2">Juste votre numéro. Pas de mot de passe.</p>
          </div>
          <HelpVoice text={HELP_PHONE} />
        </div>
        <form className="mt-7" onSubmit={e => { e.preventDefault(); send(); }}>
          <label htmlFor="phone" className="field-label">Mon numéro de téléphone</label>
          <div className={`flex items-center rounded-2xl border-2 bg-white overflow-hidden ${error ? 'border-wine' : 'border-ink/15 focus-within:border-ink'}`}>
            <span className="pl-4 pr-3 h-16 flex items-center gap-2 text-xl font-semibold border-r border-ink/10 bg-ivory-deep/60">🇸🇳 +221</span>
            <input id="phone" value={pretty(digits)} onChange={e => { setDigits(localDigits(e.target.value)); setError(''); }}
              inputMode="numeric" autoComplete="tel-national" placeholder="77 123 45 67" autoFocus
              className="flex-1 min-w-0 h-16 px-4 text-2xl font-semibold tracking-wider outline-none bg-transparent" />
          </div>
          {error && <p className="mt-2 text-sm text-wine" role="alert">{error}</p>}
          <button disabled={busy || !digits} className="mt-6 w-full h-16 rounded-full bg-[#1f8f4e] text-white text-lg font-extrabold inline-flex items-center justify-center gap-3 disabled:opacity-40">
            {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <MessageCircle className="w-6 h-6" />} Recevoir mon code sur WhatsApp
          </button>
        </form>
        <ul className="mt-7 grid grid-cols-3 gap-3 text-center text-xs text-ink/75">
          <li className="p-3 rounded-2xl border border-ink/[0.07]"><Package className="mx-auto mb-2 w-5 h-5 text-gold-dark" strokeWidth={1.3} />Suivre mes commandes</li>
          <li className="p-3 rounded-2xl border border-ink/[0.07]"><Heart className="mx-auto mb-2 w-5 h-5 text-gold-dark" strokeWidth={1.3} />Garder mes favoris</li>
          <li className="p-3 rounded-2xl border border-ink/[0.07]"><Zap className="mx-auto mb-2 w-5 h-5 text-gold-dark" strokeWidth={1.3} />Commander plus vite</li>
        </ul>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="w-12 h-12 rounded-full border border-gold/50 grid place-items-center text-gold-dark"><MessageCircle className="w-5 h-5" strokeWidth={1.3} /></span>
          <h1 className="font-display text-3xl mt-4 leading-tight">Écrivez le code reçu sur WhatsApp</h1>
          <p className="text-ink/75 mt-2">Envoyé au <strong className="text-ink">+221 {pretty(digits)}</strong></p>
        </div>
        <HelpVoice text={HELP_CODE} />
      </div>

      {devCode && (
        <div className="mt-5 p-4 rounded-2xl bg-amber-50 text-amber-900 text-sm flex items-center justify-between gap-3">
          <span>Mode test (WhatsApp non configuré) : votre code est <strong className="text-lg tracking-widest">{devCode}</strong></span>
          <button onClick={() => onCode(devCode)} className="px-3 h-9 rounded-full bg-amber-900 text-white text-xs font-semibold shrink-0">Remplir</button>
        </div>
      )}

      {/* Un seul champ (remplissage automatique du code), affiché en 4 grosses cases */}
      <label className="relative mt-7 block" htmlFor="otp">
        <span className="sr-only">Code à 4 chiffres</span>
        <input id="otp" ref={codeRef} value={code} onChange={e => onCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code"
          maxLength={4} disabled={busy} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-describedby="otp-error" />
        <span className="grid grid-cols-4 gap-3" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={`h-20 rounded-2xl border-2 grid place-items-center text-4xl font-extrabold bg-white transition-colors ${
              error ? 'border-wine' : code.length === i ? 'border-ink' : 'border-ink/15'}`}>
              {code[i] ?? ''}
            </span>
          ))}
        </span>
      </label>
      <p id="otp-error" className="mt-3 min-h-5 text-sm text-center" role="alert">
        {busy ? <Loader2 className="w-5 h-5 animate-spin inline text-gold" /> : error && <span className="text-wine">{error}</span>}
      </p>

      <div className="mt-4 flex flex-col items-center gap-3 text-sm">
        <a href="whatsapp://" className="inline-flex items-center gap-2 px-5 h-12 rounded-full bg-[#1f8f4e]/10 text-[#1f8f4e] font-semibold"><MessageCircle className="w-5 h-5" /> Ouvrir WhatsApp</a>
        <button onClick={send} disabled={wait > 0 || busy} className="underline disabled:no-underline disabled:text-ink/40">
          {wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Je n\'ai rien reçu : renvoyer le code'}
        </button>
        <button onClick={() => { setStep('phone'); setError(''); }} className="text-ink/75">Changer de numéro</button>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Prénom (première connexion)                                        */
/* ------------------------------------------------------------------ */

const NameStep: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { saveProfile } = useAccount();
  const [name, setName] = useState('');
  return (
    <Card>
      <span className="w-12 h-12 rounded-full border border-gold/50 grid place-items-center text-gold-dark"><Sparkles className="w-5 h-5" strokeWidth={1.3} /></span>
      <h1 className="font-display text-4xl mt-4">Bienvenue chez Fabima !</h1>
      <p className="text-ink/75 mt-2">Comment vous appelez-vous ?</p>
      <form onSubmit={async e => { e.preventDefault(); if (name.trim()) await saveProfile({ firstName: name.trim() }); onDone(); }} className="mt-6">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre prénom" aria-label="Votre prénom" autoFocus autoComplete="given-name"
          className="w-full h-16 px-5 rounded-2xl border-2 border-ink/15 focus:border-ink outline-none text-2xl" />
        <button className="mt-5 w-full h-16 rounded-full bg-ink text-ivory text-lg font-bold inline-flex items-center justify-center gap-2">Continuer <ArrowRight className="w-5 h-5" /></button>
        <button type="button" onClick={onDone} className="mt-3 w-full text-sm text-ink/70">Plus tard</button>
      </form>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Espace de la cliente                                               */
/* ------------------------------------------------------------------ */

const AddressEditor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, saveProfile } = useAccount();
  const { saveCustomer, savedCustomer, notify } = useStore();
  const [zone, setZone] = useState(user?.zone || DELIVERY_ZONES[0].name);
  const [address, setAddress] = useState(user?.address ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  return (
    <form className="mt-4 space-y-3" onSubmit={async e => {
      e.preventDefault();
      await saveProfile({ zone, address, lastName });
      saveCustomer({ ...(savedCustomer ?? {}), firstName: user?.firstName ?? savedCustomer?.firstName ?? '', lastName, phone: user!.phone.replace(/^\+221/, ''), zone, address });
      notify('Adresse enregistrée');
      onClose();
    }}>
      <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom de famille" aria-label="Nom de famille" className="field !h-14 text-lg" />
      <select value={zone} onChange={e => setZone(e.target.value)} aria-label="Quartier" className="field !h-14 text-lg">
        {DELIVERY_ZONES.map(z => <option key={z.name}>{z.name}</option>)}
      </select>
      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rue, villa, point de repère" aria-label="Adresse" className="field !h-14 text-lg" />
      <button className="w-full h-14 rounded-full bg-ink text-ivory font-bold">Enregistrer</button>
    </form>
  );
};

/** Étapes affichées pour la dernière commande. */
const STEPS: { status: OrderStatus[]; label: string }[] = [
  { status: ['en_attente'], label: 'Reçue' },
  { status: ['confirmee', 'en_preparation'], label: 'Préparée' },
  { status: ['expediee'], label: 'En route' },
  { status: ['livree'], label: 'Livrée' },
];

/**
 * Espace cliente : un salon à son nom.
 * - carte d'accueil prune (prénom, ancienneté, chiffres clés)
 * - la dernière commande et ses étapes, suivie en un toucher
 * - ses favoris en photos, des raccourcis utiles, son adresse
 */
const Dashboard: React.FC = () => {
  const { user, remoteOrders, logout } = useAccount();
  const { orders, wishlist, getProduct } = useStore();
  const [editing, setEditing] = useState(false);
  const allOrders = [...new Map([...remoteOrders, ...orders].map(o => [o.id, o])).values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = allOrders.filter(o => !['livree', 'annulee'].includes(o.status)).length;
  if (!user) return null;
  const local = user.phone.replace(/^\+221/, '');
  const last = allOrders[0];
  const stepIndex = last ? STEPS.findIndex(st => st.status.includes(last.status)) : -1;
  const favs = wishlist.map(id => getProduct(id)).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 4);
  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : null;

  const links = [
    { to: '/mes-commandes', Icon: Package, label: 'Mes commandes', hint: pending ? `${pending} en cours` : `${allOrders.length} au total` },
    { to: '/favoris', Icon: Heart, label: 'Mes favoris', hint: `${wishlist.length} pièce${wishlist.length > 1 ? 's' : ''}` },
    { to: '/s', Icon: Sparkles, label: 'Nouveautés', hint: 'Vues sur le statut' },
    { to: '/authentique', Icon: ShieldCheck, label: 'Authenticité', hint: 'Vérifier une pièce' },
    { to: '/faq#tailles', Icon: Ruler, label: 'Guide des tailles', hint: 'Trouver ma pointure' },
    { href: buildWhatsAppLink(`Bonjour Fabima 🌸 C'est ${user.firstName || 'une cliente'} (+221 ${local}).`), Icon: MessageCircle, label: 'Aide', hint: 'Sur WhatsApp' },
  ];

  return (
    <div className="space-y-5 pb-24 lg:pb-0" data-testid="account-dashboard">
      {/* Accueil */}
      <section className="relative overflow-hidden rounded-[2.25rem] bg-ink text-ivory p-7 sm:p-10" data-dark>
        <Twinkles count={22} seed={5} />
        <span className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-wine/40 blur-[90px]" aria-hidden />
        <BrandMark light className="pointer-events-none absolute -bottom-8 right-6 h-44 w-auto opacity-[0.14] rotate-[8deg]" />
        <div className="relative">
          <p className="font-script text-4xl text-gold-light leading-none">Bonjour</p>
          <h1 className="font-display text-4xl sm:text-5xl mt-1">{user.firstName || 'chère cliente'}</h1>
          <p className="text-ivory/70 text-sm mt-2">+221 {pretty(local)}{since && <> · cliente Fabima depuis {since}</>}</p>
          <dl className="mt-7 grid grid-cols-3 gap-3 max-w-md">
            {[[String(allOrders.length), 'commande' + (allOrders.length > 1 ? 's' : '')], [String(pending), 'en cours'], [String(wishlist.length), 'favori' + (wishlist.length > 1 ? 's' : '')]].map(([n, l]) => (
              <div key={l} className="rounded-2xl bg-ivory/[0.07] border border-ivory/10 px-3 py-3">
                <dt className="sr-only">{l}</dt>
                <dd className="font-sans font-semibold text-2xl tabular-nums leading-none">{n}</dd>
                <dd className="text-[11px] text-ivory/70 mt-1">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5 items-start">
        {/* Dernière commande */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Ma dernière commande</h2>
            {allOrders.length > 1 && <Link to="/mes-commandes" className="text-xs font-semibold underline underline-offset-4">Toutes</Link>}
          </div>
          {!last ? (
            <div className="mt-4 text-sm text-ink/75">
              <p>Vous n'avez pas encore commandé. Nos nouveautés vous attendent.</p>
              <Link to="/boutique?tri=nouveautes" className="btn-dark mt-5">Découvrir la boutique <ArrowRight className="w-4 h-4" /></Link>
            </div>
          ) : (
            <div className="mt-4" data-testid="last-order">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span><strong>{last.id}</strong> <span className="text-ink/70">· {new Date(last.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span></span>
                <span className="font-display text-2xl tabular-nums">{formatPrice(last.total)}</span>
              </div>
              {last.status === 'annulee' ? (
                <p className="mt-4 text-sm text-wine">Commande annulée.</p>
              ) : (
                <ol className="mt-5 grid grid-cols-4" aria-label="Étapes de la commande">
                  {STEPS.map((st, i) => {
                    const done = i <= stepIndex;
                    return (
                      <li key={st.label} className="relative flex flex-col items-center text-center" aria-current={i === stepIndex ? 'step' : undefined}>
                        {i > 0 && <span className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 ${i <= stepIndex ? 'bg-wine' : 'bg-ink/10'}`} aria-hidden />}
                        <span className={`relative w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold ${done ? 'bg-wine text-white' : 'bg-white border-2 border-ink/15 text-ink/50'}`}>
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
                  <li key={i.key}><ProductImage src={i.image} alt={i.name} label="" className="w-14 h-16 rounded-xl" /></li>
                ))}
                {last.items.length > 4 && <li className="w-14 h-16 rounded-xl bg-ivory-deep grid place-items-center text-xs">+{last.items.length - 4}</li>}
              </ul>
              <Link to={`/suivi?commande=${encodeURIComponent(last.id)}&tel=${encodeURIComponent(local)}`} className="btn-dark w-full mt-6">Suivre ma commande <ArrowRight className="w-4 h-4" /></Link>
            </div>
          )}
        </Card>

        {/* Favoris */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Mes favoris</h2>
            {favs.length > 0 && <Link to="/favoris" className="text-xs font-semibold underline underline-offset-4">Tout voir</Link>}
          </div>
          {favs.length === 0 ? (
            <p className="mt-4 text-sm text-ink/75">Touchez le cœur sur une pièce pour la garder ici.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3" data-testid="account-favs">
              {favs.map(p => (
                <li key={p.id}>
                  <Link to={`/produit/${p.slug}`} className="group block">
                    <ProductImage src={p.images[0]} alt={p.name} label="" className="w-full aspect-[4/5] rounded-2xl transition-transform duration-700 group-hover:scale-[1.02]" />
                    <span className="block mt-2 text-sm leading-tight line-clamp-1">{p.name}</span>
                    <span className="block text-xs text-ink/70">{formatPrice(p.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Raccourcis */}
      <nav aria-label="Mon compte" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {links.map(({ to, href, Icon, label, hint }) => {
          const inner = (
            <>
              <span className="w-11 h-11 rounded-full bg-blush/70 grid place-items-center text-wine group-hover:bg-wine group-hover:text-white transition-colors"><Icon className="w-5 h-5" strokeWidth={1.6} /></span>
              <span className="mt-3 block font-semibold leading-tight">{label}</span>
              <span className="text-xs text-ink/70">{hint}</span>
            </>
          );
          const cls = 'group block p-5 rounded-[1.75rem] bg-white border border-ink/[0.06] hover:shadow-soft hover:-translate-y-0.5 transition-all duration-500';
          return to
            ? <Link key={label} to={to} className={cls}>{inner}</Link>
            : <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
        })}
      </nav>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-start gap-3"><span className="w-11 h-11 rounded-full bg-ivory-deep grid place-items-center shrink-0"><MapPin className="w-5 h-5 text-gold-dark" strokeWidth={1.6} /></span>
              <span><strong className="block">Mon adresse de livraison</strong>
                <span className="text-sm text-ink/75">{user.address ? `${user.address}, ${user.zone}` : 'Pas encore enregistrée'}</span></span>
            </p>
            <button onClick={() => setEditing(e => !e)} aria-label="Modifier mon adresse" className="w-11 h-11 rounded-full border border-ink/15 hover:border-ink grid place-items-center shrink-0"><Pencil className="w-4 h-4" /></button>
          </div>
          {editing && <AddressEditor onClose={() => setEditing(false)} />}
        </Card>
        <div className="space-y-3">
          <InstallButton big />
          <button onClick={logout} className="w-full h-14 rounded-full border border-ink/15 text-ink/70 hover:text-ink hover:border-ink/40 inline-flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Me déconnecter</button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const Account: React.FC = () => {
  usePageTitle('Mon compte', 'Créez votre compte Fabima avec votre numéro de téléphone : suivez vos commandes et gardez vos favoris.');
  const { status, user } = useAccount();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [askName, setAskName] = useState(false);
  const back = params.get('retour');

  const done = () => { setAskName(false); if (back?.startsWith('/')) navigate(back); };

  return (
    <div className="bg-ivory min-h-[80vh]">
      <div className={`${status === 'user' && !(askName && !user?.firstName) ? 'max-w-5xl' : 'max-w-md'} mx-auto px-4 py-10 sm:py-16`}>
        {status === 'loading' && <div className="grid place-items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>}
        {status === 'off' && (
          <Card>
            <span className="w-12 h-12 rounded-full border border-gold/50 grid place-items-center text-gold-dark"><Smartphone className="w-5 h-5" strokeWidth={1.3} /></span>
            <h1 className="font-display text-3xl mt-4">Mon compte Fabima</h1>
            <p className="text-ink/75 mt-2">La création de compte n'est pas disponible pour le moment. Vous pouvez tout de même commander et suivre vos commandes depuis ce téléphone.</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/mes-commandes" className="h-14 rounded-full bg-ink text-ivory font-bold grid place-items-center">Mes commandes</Link>
              <InstallButton big />
            </div>
          </Card>
        )}
        {status === 'guest' && <Login onDone={isNew => (isNew ? setAskName(true) : done())} />}
        {status === 'user' && (askName && !user?.firstName ? <NameStep onDone={done} /> : <Dashboard />)}
      </div>
    </div>
  );
};
