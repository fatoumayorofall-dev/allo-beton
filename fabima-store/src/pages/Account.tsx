import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Heart, Loader2, LogOut, MapPin, MessageCircle, Package, Pencil, Volume2 } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { useStore } from '../context/StoreContext';
import { DELIVERY_ZONES, buildWhatsAppLink } from '../config/site';
import { usePageTitle } from '../utils/usePageTitle';
import { speak } from '../utils/speak';
import { InstallButton } from '../components/InstallApp';

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
            <p className="text-4xl">📱</p>
            <h1 className="font-display text-4xl mt-2 leading-tight">Mon compte Fabima</h1>
            <p className="text-ink/60 mt-2">Juste votre numéro. Pas de mot de passe.</p>
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
        <ul className="mt-7 grid grid-cols-3 gap-3 text-center text-xs text-ink/65">
          <li className="p-3 rounded-2xl bg-ivory-deep/60"><span className="block text-2xl">📦</span>Suivre mes commandes</li>
          <li className="p-3 rounded-2xl bg-ivory-deep/60"><span className="block text-2xl">❤️</span>Garder mes favoris</li>
          <li className="p-3 rounded-2xl bg-ivory-deep/60"><span className="block text-2xl">⚡</span>Commander plus vite</li>
        </ul>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-4xl">💬</p>
          <h1 className="font-display text-3xl mt-2 leading-tight">Écrivez le code reçu sur WhatsApp</h1>
          <p className="text-ink/60 mt-2">Envoyé au <strong className="text-ink">+221 {pretty(digits)}</strong></p>
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
        <button onClick={() => { setStep('phone'); setError(''); }} className="text-ink/60">Changer de numéro</button>
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
      <p className="text-4xl">🌸</p>
      <h1 className="font-display text-4xl mt-2">Bienvenue chez Fabima !</h1>
      <p className="text-ink/60 mt-2">Comment vous appelez-vous ?</p>
      <form onSubmit={async e => { e.preventDefault(); if (name.trim()) await saveProfile({ firstName: name.trim() }); onDone(); }} className="mt-6">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre prénom" aria-label="Votre prénom" autoFocus autoComplete="given-name"
          className="w-full h-16 px-5 rounded-2xl border-2 border-ink/15 focus:border-ink outline-none text-2xl" />
        <button className="mt-5 w-full h-16 rounded-full bg-ink text-ivory text-lg font-bold inline-flex items-center justify-center gap-2">Continuer <ArrowRight className="w-5 h-5" /></button>
        <button type="button" onClick={onDone} className="mt-3 w-full text-sm text-ink/55">Plus tard</button>
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

const Dashboard: React.FC = () => {
  const { user, remoteOrders, logout } = useAccount();
  const { orders, wishlist } = useStore();
  const [editing, setEditing] = useState(false);
  const allOrders = [...new Map([...remoteOrders, ...orders].map(o => [o.id, o])).values()];
  const pending = allOrders.filter(o => !['livree', 'annulee'].includes(o.status)).length;
  if (!user) return null;

  const tiles = [
    { to: '/mes-commandes', emoji: '📦', label: 'Mes commandes', hint: pending ? `${pending} en cours` : `${allOrders.length} commande(s)`, Icon: Package },
    { to: '/favoris', emoji: '❤️', label: 'Mes favoris', hint: `${wishlist.length} pièce(s)`, Icon: Heart },
    { to: '/s', emoji: '✨', label: 'Nouveautés', hint: 'Vues sur le statut', Icon: ArrowRight },
    { href: buildWhatsAppLink(`Bonjour Fabima 🌸 C'est ${user.firstName || 'une cliente'} (+221 ${user.phone.replace(/^\+221/, '')}).`), emoji: '💬', label: 'Aide', hint: 'Sur WhatsApp', Icon: MessageCircle },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <p className="font-script text-4xl text-gold-dark leading-none">Bonjour</p>
        <h1 className="font-display text-4xl mt-1">{user.firstName || 'chère cliente'} 🌸</h1>
        <p className="text-ink/60 mt-1">+221 {pretty(user.phone.replace(/^\+221/, ''))}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map(t => {
          const inner = (
            <>
              <span className="text-4xl">{t.emoji}</span>
              <span className="mt-3 block text-lg font-bold leading-tight">{t.label}</span>
              <span className="text-sm text-ink/55">{t.hint}</span>
            </>
          );
          const cls = 'block p-5 rounded-[1.75rem] bg-white shadow-sm border border-ink/[0.05] active:scale-[.98] transition-transform';
          return t.to
            ? <Link key={t.label} to={t.to} className={cls}>{inner}</Link>
            : <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
        })}
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-start gap-3"><MapPin className="w-6 h-6 text-gold-dark shrink-0" />
            <span><strong className="block">Mon adresse de livraison</strong>
              <span className="text-sm text-ink/60">{user.address ? `${user.address}, ${user.zone}` : 'Pas encore enregistrée'}</span></span>
          </p>
          <button onClick={() => setEditing(e => !e)} aria-label="Modifier mon adresse" className="w-11 h-11 rounded-full bg-ivory-deep grid place-items-center shrink-0"><Pencil className="w-4 h-4" /></button>
        </div>
        {editing && <AddressEditor onClose={() => setEditing(false)} />}
      </Card>

      <InstallButton big />

      <button onClick={logout} className="w-full h-14 rounded-full border border-ink/15 text-ink/70 inline-flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Me déconnecter</button>
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
    <div className="bg-petal min-h-[80vh]">
      <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
        {status === 'loading' && <div className="grid place-items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>}
        {status === 'off' && (
          <Card>
            <p className="text-4xl">📱</p>
            <h1 className="font-display text-3xl mt-2">Mon compte Fabima</h1>
            <p className="text-ink/60 mt-2">La création de compte n'est pas disponible pour le moment. Vous pouvez tout de même commander et suivre vos commandes depuis ce téléphone.</p>
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
