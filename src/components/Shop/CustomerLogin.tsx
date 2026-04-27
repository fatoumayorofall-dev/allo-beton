/**
 * ALLO BETON - CUSTOMER LOGIN / REGISTER
 * Modern split-screen design with tabbed forms and smooth animations.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Eye,
  EyeOff,
  Shield,
  Truck,
  HeadphonesIcon,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Package,
  Star,
  ArrowRight,
  FileText,
  X,
  Loader2,
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useEcommerce } from '../../contexts/EcommerceContext';
import ShopLogo from './ShopLogo';

/* ─────────────────────────── TYPES ─────────────────────────── */

interface CustomerLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify_pending';
type CustomerType = 'particulier' | 'entreprise';

interface LoginFormData {
  login: string;
  password: string;
}

interface RegisterFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  company_name: string;
  company_ninea: string;
  customer_type: CustomerType;
}

/* ─────────────────────── SHARED STYLES ─────────────────────── */

const inputBase = [
  'w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200',
  'rounded-xl text-sm text-gray-900 placeholder:text-gray-400',
  'focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
  'outline-none transition-all duration-200',
].join(' ');

const inputWithRight = [
  'w-full pl-11 pr-12 py-3 bg-gray-50/80 border border-gray-200',
  'rounded-xl text-sm text-gray-900 placeholder:text-gray-400',
  'focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
  'outline-none transition-all duration-200',
].join(' ');

const inputWhiteBg = [
  'w-full pl-11 pr-4 py-3 bg-white border border-gray-200',
  'rounded-xl text-sm text-gray-900 placeholder:text-gray-400',
  'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
  'outline-none transition-all duration-200',
].join(' ');

/* ─────────────────── REUSABLE FIELD WRAPPER ────────────────── */

const FormField: React.FC<{
  label: string;
  icon: React.ElementType;
  required?: boolean;
  rightLabel?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, icon: Icon, required, rightLabel, children }) => (
  <div className="group">
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-orange-600 ml-0.5">*</span>}
      </label>
      {rightLabel}
    </div>
    <div className="relative">
      <Icon
        className={[
          'absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px]',
          'text-gray-400 group-focus-within:text-orange-600',
          'transition-colors duration-200 pointer-events-none z-10',
        ].join(' ')}
      />
      {children}
    </div>
  </div>
);

/* ──────────────── PASSWORD STRENGTH HELPERS ────────────────── */

function getPasswordStrength(pw: string): number {
  if (pw.length === 0) return 0;
  if (pw.length < 8) return 1;
  if (pw.length < 10) return 2;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return 2 + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpecial ? 1 : 0);
}

const STR_LABELS = ['', 'Trop court (min 8)', 'Faible', 'Correct', 'Bon', 'Excellent'];
const STR_BAR_COLORS = ['', 'bg-red-400', 'bg-orange-500', 'bg-orange-500', 'bg-emerald-400', 'bg-emerald-500'];
const STR_TEXT_COLORS = ['', 'text-red-500', 'text-orange-600', 'text-orange-600', 'text-emerald-600', 'text-emerald-600'];

/* ─────────────── SENEGAL FLAG MINI COMPONENT ───────────────── */

const SenegalFlag: React.FC = () => (
  <div className="w-5 h-3.5 rounded-[2px] overflow-hidden flex border border-gray-200/60 flex-shrink-0">
    <div className="flex-1 bg-green-600" />
    <div className="flex-1 bg-yellow-400 relative flex items-center justify-center">
      <div className="w-1 h-1 bg-green-700 rounded-full" />
    </div>
    <div className="flex-1 bg-red-500" />
  </div>
);

/* ─────────────────── TRUST BADGE DATA ──────────────────────── */

const TRUST_BADGES = [
  { icon: Shield, label: 'Paiement securise', color: 'text-emerald-500' },
  { icon: Truck, label: 'Livraison rapide', color: 'text-orange-600' },
  { icon: HeadphonesIcon, label: 'Support 7j/7', color: 'text-orange-500' },
] as const;

const PERKS = [
  {
    icon: Truck,
    label: 'Livraison chantier',
    sub: 'Partout au Senegal',
    gradient: 'from-teal-500/10 to-cyan-500/10',
    iconColor: 'text-teal-500',
    border: 'border-teal-100',
  },
  {
    icon: Shield,
    label: 'Paiement securise',
    sub: 'Wave, Orange Money, CB',
    gradient: 'from-emerald-500/10 to-green-500/10',
    iconColor: 'text-emerald-500',
    border: 'border-emerald-100',
  },
  {
    icon: Package,
    label: '28 produits BTP',
    sub: 'Beton, Acier, Agregats',
    gradient: 'from-orange-500/10 to-orange-600/10',
    iconColor: 'text-orange-600',
    border: 'border-slate-100',
  },
  {
    icon: HeadphonesIcon,
    label: 'Support expert',
    sub: 'Conseils BTP gratuits',
    gradient: 'from-violet-500/10 to-purple-500/10',
    iconColor: 'text-violet-500',
    border: 'border-violet-100',
  },
] as const;

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

const CustomerLogin: React.FC<CustomerLoginProps> = ({ onSuccess, onBack }) => {
  const { login, register, loginWithGoogle, loginWithFacebook, loginWithApple, forgotPassword, resetPassword } = useEcommerce();

  /* ── State ── */
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const [loginForm, setLoginForm] = useState<LoginFormData>({
    login: '',
    password: '',
  });

  const [pendingEmail, setPendingEmail] = useState('');

  // Forgot / reset password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);
  const [resetForm, setResetForm] = useState({ customer_id: '', token: '', password: '', confirm: '' });
  const [resetSuccess, setResetSuccess] = useState(false);

  // Auto-détecter token dans l'URL (?token=...&id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const id = params.get('id');
    if (token && id) {
      setResetForm((p) => ({ ...p, token, customer_id: id }));
      setMode('reset');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: '',
    company_name: '',
    company_ninea: '',
    customer_type: 'particulier',
  });

  const formRef = useRef<HTMLDivElement>(null);

  /* ── Apple Sign In helper ── */
  const handleAppleSignIn = async () => {
    const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    if (!appleClientId || appleClientId === 'METTRE_APPLE_CLIENT_ID_ICI') {
      setError('Apple Sign In non configuré (VITE_APPLE_CLIENT_ID manquant)');
      return;
    }
    try {
      setLoading(true); setError('');
      await new Promise<void>((resolve) => {
        if ((window as any).AppleID) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        s.onload = () => resolve();
        document.head.appendChild(s);
      });
      (window as any).AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: window.location.origin + '/shop',
        usePopup: true,
      });
      const res = await (window as any).AppleID.auth.signIn();
      const id_token = res?.authorization?.id_token;
      if (!id_token) { setError('Token Apple non reçu'); setLoading(false); return; }
      const userData = res?.user || undefined;
      await loginWithApple(id_token, userData);
      onSuccess();
    } catch (err: any) {
      if (err?.error !== 'popup_closed_by_user') {
        setError(err?.message || 'Connexion Apple annulée');
      }
    } finally { setLoading(false); }
  };

  /* ── Switch mode with animation trigger ── */
  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
    setShowPassword(false);
    setShowConfirm(false);
    setFadeKey((k) => k + 1);
  };

  /* ── Scroll form to top on mode switch ── */
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollTop = 0;
    }
  }, [mode]);

  /* ── Validation helpers ── */
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidSenegalPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 9 && /^(70|76|77|78|75|33)/.test(cleaned);
  };

  /* ── Login handler ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = loginForm.login.trim();
    if (!id || !loginForm.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    const looksLikeEmail = isValidEmail(id);
    const looksLikePhone = /^[0-9+\s\-]{7,}$/.test(id);
    if (!looksLikeEmail && !looksLikePhone) {
      setError('Entrez un numéro de téléphone ou une adresse email valide');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login(id, loginForm.password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Identifiant ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  /* ── Register handler ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      !registerForm.first_name ||
      !registerForm.last_name ||
      !registerForm.phone ||
      !registerForm.password
    ) {
      setError('Prénom, nom, téléphone et mot de passe sont obligatoires');
      return;
    }
    if (registerForm.first_name.length < 2 || /\d/.test(registerForm.first_name)) {
      setError('Le prenom doit contenir au moins 2 caracteres et ne pas inclure de chiffres');
      return;
    }
    if (registerForm.last_name.length < 2 || /\d/.test(registerForm.last_name)) {
      setError('Le nom doit contenir au moins 2 caracteres et ne pas inclure de chiffres');
      return;
    }
    if (registerForm.email && !isValidEmail(registerForm.email)) {
      setError('Format d\'email invalide');
      return;
    }
    if (!isValidSenegalPhone(registerForm.phone)) {
      setError('Veuillez entrer un numero de telephone senegalais valide (ex: 77 123 45 67)');
      return;
    }
    if (registerForm.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (registerForm.password !== registerForm.password_confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (registerForm.customer_type === 'entreprise' && !registerForm.company_name) {
      setError("Le nom de l'entreprise est requis pour un compte professionnel");
      return;
    }

    try {
      setLoading(true);
      const { password_confirm, ...data } = registerForm;
      const result = await register(data);
      if (result.needs_verification) {
        setPendingEmail(result.email || registerForm.email);
        switchMode('verify_pending');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Password strength ── */
  const strLevel = getPasswordStrength(registerForm.password);

  /* ── Confirm match state ── */
  const confirmTouched = registerForm.password_confirm.length > 0;
  const confirmMatch = registerForm.password === registerForm.password_confirm;

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="shop-root relative min-h-screen shop-mesh-light flex flex-col">
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 shop-grid-light opacity-40 pointer-events-none" />
      {/* Glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-orange-100/50 rounded-full blur-3xl" />
      </div>
      {/* ────────────────────────────────────────── */}
      {/* TOP NAVIGATION BAR                          */}
      {/* ────────────────────────────────────────── */}
      <div className="relative z-10 border-b border-slate-200/60 shop-glass sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 group transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-slate-100 group-hover:text-orange-800 flex items-center justify-center transition-all duration-200">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline">Retour à la boutique</span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <ShopLogo size={36} tagline="MATÉRIAUX BTP · SÉNÉGAL" />
        </div>
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* MAIN CONTENT: SPLIT SCREEN                  */}
      {/* ──────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-start justify-center py-8 md:py-12 px-4">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_460px] gap-8 items-start">

          {/* ════════════════════════════════════════ */}
          {/* LEFT PANEL -- Branding (hidden mobile)  */}
          {/* ════════════════════════════════════════ */}
          <div className="hidden lg:flex flex-col gap-5 cl-fade-slide-up">

            {/* Hero card */}
            <div className="relative shop-mesh rounded-3xl p-8 text-white overflow-hidden shadow-2xl shadow-orange-900/20">
              {/* Decorative grid */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(251,191,36,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,.4) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              {/* Glow orbs */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-orange-600/15 rounded-full blur-3xl" />

              {/* Construction worker image */}
              <div className="absolute top-0 right-0 w-40 h-full opacity-20">
                <img
                  src="https://images.pexels.com/photos/19982408/pexels-photo-19982408.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-orange-600/15 border border-orange-500/20 rounded-full px-3.5 py-1.5 text-xs font-semibold text-orange-300 mb-6">
                  <Star className="w-3.5 h-3.5" />
                  N&deg;1 des materiaux BTP au Senegal
                </div>

                <h1 className="text-3xl font-black leading-tight tracking-tight mb-3">
                  Bienvenue chez
                  <br />
                  <span className="bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                    Allo Beton
                  </span>
                </h1>

                <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                  Creez votre compte pour commander des materiaux de construction
                  et les faire livrer directement sur votre chantier.
                </p>

                {/* Social proof */}
                <div className="mt-8 flex items-center gap-3">
                  <div className="flex -space-x-2.5">
                    {['AM', 'SK', 'CD', 'MB'].map((initials, i) => (
                      <div
                        key={i}
                        className={[
                          'w-9 h-9 rounded-full border-2 border-gray-900 flex items-center justify-center',
                          'text-[10px] font-bold text-white',
                          ['bg-orange-600', 'bg-emerald-500', 'bg-teal-500', 'bg-orange-600'][i],
                        ].join(' ')}
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className="font-bold text-white">+2 500</span> clients actifs
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative">
              <div className="absolute top-4 right-4 text-orange-500 opacity-20">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  AD
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Abdou Diallo</p>
                  <p className="text-[10px] text-gray-400">Chef de chantier, Dakar</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-orange-500 fill-orange-500" />)}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed italic">
                "Depuis que j'utilise Allo Beton, je gagne un temps precieux. La livraison sur chantier est toujours ponctuelle et les prix sont tres competitifs."
              </p>
            </div>

            {/* Perks grid */}
            <div className="grid grid-cols-2 gap-3">
              {PERKS.map((p, i) => (
                <div
                  key={i}
                  className={[
                    'bg-white rounded-2xl p-4 border shadow-sm',
                    'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
                    p.border,
                  ].join(' ')}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className={[
                      'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                      `bg-gradient-to-br ${p.gradient}`,
                    ].join(' ')}
                  >
                    <p.icon className={`w-5 h-5 ${p.iconColor}`} />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{p.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.sub}</p>
                </div>
              ))}
            </div>

            {/* Trust strip */}
            <div className="flex items-center gap-3 text-xs text-gray-400 px-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Inscription gratuite &middot; Aucun abonnement &middot; Annulation a tout moment</span>
            </div>
          </div>

          {/* ════════════════════════════════════════ */}
          {/* RIGHT PANEL -- Form Card                */}
          {/* ════════════════════════════════════════ */}
          <div className="shop-glass rounded-3xl shadow-2xl shadow-orange-900/10 overflow-hidden cl-fade-slide-up">

            {/* ── Tab Toggle (hidden on forgot/reset/verify_pending) ── */}
            {(mode === 'login' || mode === 'register') && (
            <div className="p-1.5 mx-5 mt-5 bg-gray-100 rounded-xl flex gap-1 relative">
              {/* Sliding background indicator */}
              <div
                className="absolute top-1.5 bottom-1.5 rounded-lg bg-white shadow-sm transition-all duration-300 ease-out"
                style={{
                  left: mode === 'login' ? '6px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 8px)',
                }}
              />
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={[
                    'flex-1 relative z-10 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200',
                    mode === m ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {m === 'login' ? 'Connexion' : 'Creer un compte'}
                </button>
              ))}
            </div>
            )}

            {/* ── Form Content ── */}
            <div ref={formRef} className="p-5 sm:p-6 pt-5 overflow-y-auto max-h-[calc(100vh-220px)]">
              {/* Animated wrapper */}
              <div key={fadeKey} className="cl-fade-in">

                {/* Header */}
                <div className="mb-5">
                  {mode === 'verify_pending' ? null : (
                  <>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    {mode === 'login' && 'Bon retour !'}
                    {mode === 'register' && 'Creez votre compte'}
                    {mode === 'forgot' && 'Mot de passe oublié ?'}
                    {mode === 'reset' && 'Nouveau mot de passe'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {mode === 'login' && 'Connectez-vous pour acceder a vos commandes'}
                    {mode === 'register' && 'Rejoignez +2 500 clients et commandez en ligne'}
                    {mode === 'forgot' && 'Nous vous enverrons un lien par email'}
                    {mode === 'reset' && 'Choisissez un mot de passe sécurisé'}
                  </p>
                  </>)}
                  {/* ══ VERIFY PENDING SCREEN ══ */}
                {mode === 'verify_pending' && (
                  <div className="flex flex-col items-center text-center py-6 px-2">
                    <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-5">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 mb-2">Vérifiez votre email</h2>
                    <p className="text-sm text-gray-500 mb-1">Un email de confirmation a été envoyé à :</p>
                    <p className="font-bold text-orange-700 text-sm mb-4 break-all">{pendingEmail}</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-5 w-full">
                      <p className="text-xs font-bold text-amber-800 mb-1">📌 Étapes à suivre :</p>
                      <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                        <li>Ouvrez votre boîte mail Gmail</li>
                        <li>Vérifiez aussi le <strong>dossier SPAM</strong></li>
                        <li>Cliquez sur <strong>"Confirmer mon email"</strong></li>
                        <li>Revenez ici et connectez-vous</li>
                      </ol>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                    >
                      Aller à la connexion
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Recommencer l'inscription
                    </button>
                  </div>
                )}

                {mode === 'register' && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-slate-50 to-slate-50 border border-slate-200/50 rounded-xl flex items-center gap-3 cl-scale-in">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-xs text-orange-900 font-medium">
                        <span className="font-bold">Offre bienvenue :</span> 5% de reduction sur votre premiere commande avec un code parrainage !
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Error Banner ── */}
                {error && (
                  <div className="mb-5 p-3.5 bg-red-50 border border-red-200/60 rounded-xl flex items-start gap-3 cl-slide-down">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-700">Erreur</p>
                      <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{error}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="flex-shrink-0 w-6 h-6 rounded-md hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                )}

                {/* ══════════════════════════════════ */}
                {/* LOGIN FORM                        */}
                {/* ══════════════════════════════════ */}
                {mode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Tél / Email unifié */}
                    <FormField label="Téléphone ou email" icon={Phone} required>
                      <input
                        type="text"
                        value={loginForm.login}
                        onChange={(e) => setLoginForm((p) => ({ ...p, login: e.target.value }))}
                        placeholder="77 123 45 67 ou votre@email.com"
                        className={inputBase}
                        autoFocus
                        autoComplete="username"
                        inputMode="text"
                      />
                    </FormField>

                    {/* Password */}
                    <FormField
                      label="Mot de passe"
                      icon={Lock}
                      required
                      rightLabel={
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail('');
                            switchMode('forgot');
                          }}
                          className="text-[11px] font-medium text-orange-700 hover:text-orange-800 transition-colors"
                        >
                          Mot de passe oublie ?
                        </button>
                      }
                    >
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Votre mot de passe"
                        className={inputWithRight}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </FormField>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className={[
                        'shop-shine group w-full py-3.5 mt-2 rounded-xl font-bold text-[15px] text-white',
                        'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600',
                        'shadow-lg shadow-orange-600/30',
                        'hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5',
                        'active:translate-y-0 active:shadow-orange-600/20',
                        'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0',
                        'transition-all duration-300',
                        'flex items-center justify-center gap-2.5',
                      ].join(' ')}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>Se connecter</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Divider social */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                      <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-gray-400 font-medium">ou continuer avec</span></div>
                    </div>

                    {/* Social buttons */}
                    <div className="space-y-2.5">
                      {/* Google */}
                      <div className="flex justify-center">
                        <GoogleLogin
                          onSuccess={async (credentialResponse) => {
                            if (!credentialResponse.credential) return;
                            try {
                              setLoading(true); setError('');
                              await loginWithGoogle(credentialResponse.credential);
                              onSuccess();
                            } catch (err: any) { setError(err.message || 'Erreur connexion Google'); }
                            finally { setLoading(false); }
                          }}
                          onError={() => setError('Connexion Google annulée ou échouée')}
                          width="380"
                          text="signin_with"
                          shape="rectangular"
                          theme="outline"
                        />
                      </div>

                      {/* Facebook */}
                      <button
                        type="button"
                        onClick={async () => {
                          const fbId = import.meta.env.VITE_FACEBOOK_APP_ID;
                          if (!fbId || fbId === 'METTRE_FACEBOOK_APP_ID_ICI') {
                            setError('Facebook non configuré (VITE_FACEBOOK_APP_ID manquant)');
                            return;
                          }
                          try {
                            setLoading(true); setError('');
                            await new Promise<void>((resolve) => {
                              if ((window as any).FB) { resolve(); return; }
                              const script = document.createElement('script');
                              script.src = 'https://connect.facebook.net/fr_FR/sdk.js';
                              script.onload = () => {
                                (window as any).FB.init({ appId: fbId, version: 'v19.0', cookie: true, xfbml: false });
                                resolve();
                              };
                              document.head.appendChild(script);
                            });
                            (window as any).FB.login(async (res: any) => {
                              if (res.authResponse?.accessToken) {
                                try {
                                  await loginWithFacebook(res.authResponse.accessToken);
                                  onSuccess();
                                } catch (err: any) { setError(err.message || 'Erreur connexion Facebook'); }
                              } else { setError('Connexion Facebook annulée'); }
                              setLoading(false);
                            }, { scope: 'public_profile,email' });
                          } catch (err: any) { setError('Erreur chargement Facebook SDK'); setLoading(false); }
                        }}
                        className="w-full py-2.5 flex items-center justify-center gap-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-800 transition-all"
                      >
                        <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Continuer avec Facebook
                      </button>

                      {/* Apple */}
                      <button
                        type="button"
                        onClick={handleAppleSignIn}
                        className="w-full py-2.5 flex items-center justify-center gap-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.42.07 2.4.83 3.23.88.97-.18 1.9-.97 3.15-.89 1.6.12 2.8.76 3.57 1.93-3.25 2.01-2.66 6.07.61 7.43-.6 1.56-1.38 3.12-2.56 3.51zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                        Continuer avec Apple
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                      <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-gray-400 font-medium">ou</span></div>
                    </div>

                    {/* Switch to register */}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className={[
                        'w-full py-3.5 border-2 border-gray-200 rounded-xl',
                        'text-sm font-semibold text-gray-700',
                        'hover:border-orange-500 hover:text-orange-800 hover:bg-slate-50/40',
                        'transition-all duration-200',
                      ].join(' ')}
                    >
                      Creer un compte gratuit
                    </button>
                  </form>
                )}

                {/* ══════════════════════════════════ */}
                {/* FORGOT PASSWORD FORM             */}
                {/* ══════════════════════════════════ */}
                {mode === 'forgot' && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!isValidEmail(forgotEmail)) { setError('Email invalide'); return; }
                      try {
                        setLoading(true);
                        setError('');
                        const res: any = await forgotPassword(forgotEmail);
                        setForgotSent(true);
                        if (res?.dev_reset_link) setDevResetLink(res.dev_reset_link);
                      } catch (err: any) {
                        setError(err.message || 'Erreur serveur');
                      } finally { setLoading(false); }
                    }}
                    className="space-y-4"
                  >
                    {forgotSent ? (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-emerald-800">
                            <p className="font-semibold">Demande envoyée</p>
                            <p className="text-emerald-700 mt-1">Si ce compte existe, vous recevrez un lien pour réinitialiser votre mot de passe.</p>
                          </div>
                        </div>
                        {devResetLink && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                            <p className="font-semibold text-orange-900 mb-1">Mode dev — lien de réinitialisation :</p>
                            <a href={devResetLink} className="text-orange-800 hover:text-orange-950 break-all underline">{devResetLink}</a>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => { setForgotSent(false); setDevResetLink(null); switchMode('login'); }}
                          className="w-full py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-orange-500 hover:text-orange-800 hover:bg-slate-50/40 transition-all"
                        >
                          Retour à la connexion
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500 -mt-2">Entrez votre email, nous vous enverrons un lien de réinitialisation.</p>
                        <FormField label="Adresse email" icon={Mail} required>
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="vous@exemple.com"
                            className={inputBase}
                            autoComplete="email"
                          />
                        </FormField>
                        <button
                          type="submit"
                          disabled={loading}
                          className={[
                            'w-full py-3.5 mt-2 rounded-xl font-bold text-[15px] text-white',
                            'bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg shadow-orange-600/25',
                            'hover:shadow-orange-600/40 hover:-translate-y-0.5',
                            'disabled:opacity-60 disabled:cursor-not-allowed',
                            'transition-all duration-200 flex items-center justify-center gap-2',
                          ].join(' ')}
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><span>Envoyer le lien</span><ArrowRight className="w-4 h-4" /></>)}
                        </button>
                        <button
                          type="button"
                          onClick={() => switchMode('login')}
                          className="w-full py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Retour à la connexion
                        </button>
                      </>
                    )}
                  </form>
                )}

                {/* ══════════════════════════════════ */}
                {/* RESET PASSWORD FORM              */}
                {/* ══════════════════════════════════ */}
                {mode === 'reset' && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (resetForm.password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères'); return; }
                      if (resetForm.password !== resetForm.confirm) { setError('Les mots de passe ne correspondent pas'); return; }
                      try {
                        setLoading(true);
                        setError('');
                        await resetPassword(resetForm.customer_id, resetForm.token, resetForm.password);
                        setResetSuccess(true);
                      } catch (err: any) {
                        setError(err.message || 'Token invalide ou expiré');
                      } finally { setLoading(false); }
                    }}
                    className="space-y-4"
                  >
                    {resetSuccess ? (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-emerald-800">
                            <p className="font-semibold">Mot de passe réinitialisé !</p>
                            <p className="text-emerald-700 mt-1">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setResetSuccess(false); setResetForm({ customer_id:'', token:'', password:'', confirm:'' }); switchMode('login'); }}
                          className="w-full py-3.5 rounded-xl font-bold text-[15px] text-white bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg shadow-orange-600/25 hover:shadow-orange-600/40 transition-all flex items-center justify-center gap-2"
                        >
                          Se connecter <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500 -mt-2">Choisissez un nouveau mot de passe (8 caractères minimum).</p>
                        <FormField label="Nouveau mot de passe" icon={Lock} required>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={resetForm.password}
                            onChange={(e) => setResetForm((p) => ({ ...p, password: e.target.value }))}
                            placeholder="Au moins 8 caractères"
                            className={inputWithRight}
                            autoComplete="new-password"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </FormField>
                        <FormField label="Confirmer le mot de passe" icon={Lock} required>
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            value={resetForm.confirm}
                            onChange={(e) => setResetForm((p) => ({ ...p, confirm: e.target.value }))}
                            placeholder="Retapez le mot de passe"
                            className={inputWithRight}
                            autoComplete="new-password"
                          />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </FormField>
                        <button
                          type="submit"
                          disabled={loading}
                          className={[
                            'w-full py-3.5 mt-2 rounded-xl font-bold text-[15px] text-white',
                            'bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg shadow-orange-600/25',
                            'hover:shadow-orange-600/40 hover:-translate-y-0.5',
                            'disabled:opacity-60 disabled:cursor-not-allowed',
                            'transition-all duration-200 flex items-center justify-center gap-2',
                          ].join(' ')}
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><span>Réinitialiser</span><ArrowRight className="w-4 h-4" /></>)}
                        </button>
                        <button
                          type="button"
                          onClick={() => switchMode('login')}
                          className="w-full py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                  </form>
                )}

                {/* ══════════════════════════════════ */}
                {/* REGISTER FORM                     */}
                {/* ══════════════════════════════════ */}
                {mode === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-4">

                    {/* ── Customer Type Pills ── */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                        Type de compte
                      </p>
                      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                        {([
                          { val: 'particulier' as CustomerType, icon: User, label: 'Particulier' },
                          { val: 'entreprise' as CustomerType, icon: Building2, label: 'Entreprise' },
                        ]).map((opt) => {
                          const active = registerForm.customer_type === opt.val;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() =>
                                setRegisterForm((p) => ({ ...p, customer_type: opt.val }))
                              }
                              className={[
                                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg',
                                'text-sm font-semibold transition-all duration-200',
                                active
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700',
                              ].join(' ')}
                            >
                              <opt.icon className={`w-4 h-4 ${active ? 'text-orange-600' : ''}`} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── First / Last name ── */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Prenom" icon={User} required>
                        <input
                          type="text"
                          value={registerForm.first_name}
                          onChange={(e) =>
                            setRegisterForm((p) => ({ ...p, first_name: e.target.value }))
                          }
                          placeholder="Mamadou"
                          className={inputBase}
                          autoComplete="given-name"
                        />
                      </FormField>
                      <FormField label="Nom" icon={User} required>
                        <input
                          type="text"
                          value={registerForm.last_name}
                          onChange={(e) =>
                            setRegisterForm((p) => ({ ...p, last_name: e.target.value }))
                          }
                          placeholder="Diallo"
                          className={inputBase}
                          autoComplete="family-name"
                        />
                      </FormField>
                    </div>

                    {/* ── Email (optionnel) ── */}
                    <FormField
                      label="Adresse email"
                      icon={Mail}
                      rightLabel={
                        <span className="text-[11px] text-gray-400 italic">(optionnel)</span>
                      }
                    >
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) =>
                          setRegisterForm((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="votre@email.com"
                        className={inputBase}
                        autoComplete="email"
                      />
                    </FormField>

                    {/* ── Phone (Senegal) ── */}
                    <FormField label="Telephone" icon={Phone} required>
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                        <SenegalFlag />
                      </div>
                      <input
                        type="tel"
                        value={registerForm.phone}
                        onChange={(e) =>
                          setRegisterForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="77 123 45 67"
                        className={[
                          'w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200',
                          'rounded-xl text-sm text-gray-900 placeholder:text-gray-400',
                          'focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
                          'outline-none transition-all duration-200',
                        ].join(' ')}
                        autoComplete="tel"
                      />
                    </FormField>

                    {/* ── Company fields (enterprise only) ── */}
                    {registerForm.customer_type === 'entreprise' && (
                      <div className="p-4 bg-slate-50/40 border border-slate-200/40 rounded-xl space-y-3 cl-scale-in">
                        <p className="text-[11px] font-semibold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          Informations entreprise
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label="Nom entreprise" icon={Building2}>
                            <input
                              type="text"
                              value={registerForm.company_name}
                              onChange={(e) =>
                                setRegisterForm((p) => ({ ...p, company_name: e.target.value }))
                              }
                              placeholder="SARL Construction..."
                              className={inputWhiteBg}
                            />
                          </FormField>
                          <FormField label="NINEA" icon={FileText}>
                            <input
                              type="text"
                              value={registerForm.company_ninea}
                              onChange={(e) =>
                                setRegisterForm((p) => ({ ...p, company_ninea: e.target.value }))
                              }
                              placeholder="0012345678"
                              className={inputWhiteBg}
                            />
                          </FormField>
                        </div>
                      </div>
                    )}

                    {/* ── Password ── */}
                    <FormField
                      label="Mot de passe"
                      icon={Lock}
                      required
                      rightLabel={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      }
                    >
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm((p) => ({ ...p, password: e.target.value }))
                        }
                        placeholder="Minimum 6 caracteres"
                        className={inputBase}
                        autoComplete="new-password"
                      />
                    </FormField>

                    {/* Password strength meter */}
                    {registerForm.password.length > 0 && (
                      <div className="space-y-1.5 cl-fade-in">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={[
                                'flex-1 h-1.5 rounded-full transition-all duration-300',
                                i <= strLevel ? STR_BAR_COLORS[strLevel] : 'bg-gray-200',
                              ].join(' ')}
                            />
                          ))}
                        </div>
                        <p className={`text-[11px] font-medium ${STR_TEXT_COLORS[strLevel]}`}>
                          {STR_LABELS[strLevel]}
                          {strLevel >= 4 && (
                            <CheckCircle2 className="w-3 h-3 inline ml-1 -mt-0.5" />
                          )}
                        </p>
                      </div>
                    )}

                    {/* ── Confirm Password ── */}
                    <FormField
                      label="Confirmer le mot de passe"
                      icon={Lock}
                      required
                      rightLabel={
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirm ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      }
                    >
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={registerForm.password_confirm}
                        onChange={(e) =>
                          setRegisterForm((p) => ({ ...p, password_confirm: e.target.value }))
                        }
                        placeholder="Retapez votre mot de passe"
                        className={[
                          inputBase,
                          confirmTouched && !confirmMatch
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                            : '',
                          confirmTouched && confirmMatch
                            ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-400/20'
                            : '',
                        ].join(' ')}
                        autoComplete="new-password"
                      />
                      {/* Match indicator */}
                      {confirmTouched && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {confirmMatch ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      )}
                    </FormField>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className={[
                        'shop-shine group w-full py-3.5 mt-2 rounded-xl font-bold text-[15px] text-white',
                        'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600',
                        'shadow-lg shadow-orange-600/30',
                        'hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5',
                        'active:translate-y-0 active:shadow-orange-600/20',
                        'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0',
                        'transition-all duration-300',
                        'flex items-center justify-center gap-2.5',
                      ].join(' ')}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>Creer mon compte</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Divider social */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                      <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-gray-400 font-medium">ou s'inscrire avec</span></div>
                    </div>

                    {/* Social buttons */}
                    <div className="space-y-2.5">
                      <div className="flex justify-center">
                        <GoogleLogin
                          onSuccess={async (credentialResponse) => {
                            if (!credentialResponse.credential) return;
                            try {
                              setLoading(true); setError('');
                              await loginWithGoogle(credentialResponse.credential);
                              onSuccess();
                            } catch (err: any) { setError(err.message || 'Erreur connexion Google'); }
                            finally { setLoading(false); }
                          }}
                          onError={() => setError('Connexion Google annulée ou échouée')}
                          width="380"
                          text="signup_with"
                          shape="rectangular"
                          theme="outline"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const fbId = import.meta.env.VITE_FACEBOOK_APP_ID;
                          if (!fbId || fbId === 'METTRE_FACEBOOK_APP_ID_ICI') { setError('Facebook non configuré'); return; }
                          try {
                            setLoading(true); setError('');
                            await new Promise<void>((resolve) => {
                              if ((window as any).FB) { resolve(); return; }
                              const s = document.createElement('script');
                              s.src = 'https://connect.facebook.net/fr_FR/sdk.js';
                              s.onload = () => { (window as any).FB.init({ appId: fbId, version: 'v19.0', cookie: true, xfbml: false }); resolve(); };
                              document.head.appendChild(s);
                            });
                            (window as any).FB.login(async (res: any) => {
                              if (res.authResponse?.accessToken) {
                                try { await loginWithFacebook(res.authResponse.accessToken); onSuccess(); }
                                catch (err: any) { setError(err.message || 'Erreur Facebook'); }
                              } else { setError('Connexion Facebook annulée'); }
                              setLoading(false);
                            }, { scope: 'public_profile,email' });
                          } catch { setError('Erreur Facebook SDK'); setLoading(false); }
                        }}
                        className="w-full py-2.5 flex items-center justify-center gap-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-800 transition-all"
                      >
                        <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        S'inscrire avec Facebook
                      </button>

                      {/* Apple */}
                      <button
                        type="button"
                        onClick={handleAppleSignIn}
                        className="w-full py-2.5 flex items-center justify-center gap-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.42.07 2.4.83 3.23.88.97-.18 1.9-.97 3.15-.89 1.6.12 2.8.76 3.57 1.93-3.25 2.01-2.66 6.07.61 7.43-.6 1.56-1.38 3.12-2.56 3.51zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                        S'inscrire avec Apple
                      </button>
                    </div>

                    {/* Switch to login */}
                    <p className="text-center text-xs text-gray-400 pt-2">
                      Deja inscrit ?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="text-orange-700 font-semibold hover:underline"
                      >
                        Se connecter
                      </button>
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* ── Trust Footer ── */}
            <div className="px-5 sm:px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-center gap-4 sm:gap-6">
              {TRUST_BADGES.map((badge, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="w-px h-3.5 bg-gray-200" />}
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                    <badge.icon className={`w-3.5 h-3.5 ${badge.color}`} />
                    <span className="hidden sm:inline">{badge.label}</span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
