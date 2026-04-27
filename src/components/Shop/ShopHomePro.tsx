/**
 * ALLO BETON - PAGE D'ACCUEIL BOUTIQUE PRO
 * Design moderne, structurel et professionnel
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  ShoppingCart,
  Truck,
  Shield,
  Headphones,
  Package,
  ChevronRight,
  Award,
  Phone,
  Star,
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  Layers,
  Hammer,
  Cylinder,
  Box,
  Search,
  MessageCircle,
  Sparkles,
  Calculator,
  Mail,
  Zap,
  ChevronLeft,
  MapPin,
  Brain,
  Bot,
  BarChart2,
  Lock,
  Globe,
  Activity,
  Database,
} from 'lucide-react';
import { productsAPI, Product, Category } from '../../services/ecommerce-api';
import { useEcommerce } from '../../contexts/EcommerceContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type View = 'home' | 'catalog' | 'product' | 'cart' | 'checkout' | 'success' | 'login' | 'dashboard';

interface Props {
  onNavigate: (view: View, data?: any) => void;
}

/* ------------------------------------------------------------------ */
/*  Category cover images                                              */
/* ------------------------------------------------------------------ */

const CATEGORY_COVERS: Record<string, string> = {
  'beton':    'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'béton':    'https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'granulat': 'https://images.pexels.com/photos/5582597/pexels-photo-5582597.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'sable':    'https://images.pexels.com/photos/3778786/pexels-photo-3778786.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'ciment':   'https://images.pexels.com/photos/29519165/pexels-photo-29519165.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'fer':      'https://images.pexels.com/photos/46167/iron-rods-reinforcing-bars-rods-steel-bars-46167.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'armature': 'https://images.pexels.com/photos/5623179/pexels-photo-5623179.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'bloc':     'https://images.pexels.com/photos/5691585/pexels-photo-5691585.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'parpaing': 'https://images.pexels.com/photos/5691585/pexels-photo-5691585.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
  'adjuvant': 'https://images.pexels.com/photos/6474201/pexels-photo-6474201.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop',
};

const getCategoryImage = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_COVERS)) {
    if (lower.includes(key)) return url;
  }
  return 'https://images.pexels.com/photos/2098624/pexels-photo-2098624.jpeg?auto=compress&cs=tinysrgb&w=500&h=320&fit=crop';
};

/* ------------------------------------------------------------------ */
/*  Category icon helper                                               */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'beton':    <Cylinder className="w-6 h-6" />,
  'béton':    <Cylinder className="w-6 h-6" />,
  'ciment':   <Box className="w-6 h-6" />,
  'fer':      <Hammer className="w-6 h-6" />,
  'armature': <Hammer className="w-6 h-6" />,
  'sable':    <Layers className="w-6 h-6" />,
  'granulat': <Layers className="w-6 h-6" />,
  'bloc':     <Package className="w-6 h-6" />,
  'parpaing': <Package className="w-6 h-6" />,
};

const CATEGORY_COLORS: string[] = [
  'bg-slate-100 text-orange-700',
  'bg-slate-100 text-slate-600',
  'bg-slate-100 text-orange-700',
  'bg-emerald-100 text-emerald-600',
  'bg-sky-100 text-sky-600',
  'bg-rose-100 text-rose-600',
];

const getCategoryIcon = (name: string): React.ReactNode => {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <Package className="w-6 h-6" />;
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */
const useCountUp = (end: number, duration = 2000, trigger = false) => {
  const [count, setCount] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (!trigger || ref.current) return;
    ref.current = true;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, trigger]);
  return count;
};

/* ------------------------------------------------------------------ */
/*  Promo banners data                                                 */
/* ------------------------------------------------------------------ */
const PROMO_MESSAGES = [
  { text: '🔥 -15% sur tout le ciment ce mois-ci', highlight: 'Code: CIMENT15' },
  { text: '🚚 Livraison GRATUITE des 500 000 F de commande', highlight: 'Sur Dakar' },
  { text: '⭐ Nouveau : Commandez en ligne 24h/24', highlight: 'Simple & rapide' },
  { text: '🏗️ Pack chantier : Beton + Fer + Ciment a prix reduit', highlight: 'Economisez 20%' },
];

/* ------------------------------------------------------------------ */
/*  Brand logos                                                        */
/* ------------------------------------------------------------------ */
const PARTNER_BRANDS = [
  { name: 'Sococim', desc: 'Ciment' },
  { name: 'Dangote Cement', desc: 'Ciment' },
  { name: 'Lafarge Holcim', desc: 'Beton & Ciment' },
  { name: 'Sika', desc: 'Adjuvants' },
  { name: 'ArcelorMittal', desc: 'Acier & Fer' },
  { name: 'Point P', desc: 'Distribution BTP' },
];

export const ShopHomePro: React.FC<Props> = ({ onNavigate }) => {
  const { addToCart, formatPrice } = useEcommerce();

  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  /* ---------- search ---------- */
  const [searchTerm, setSearchTerm] = useState('');

  /* ---------- promo banner ---------- */
  const [promoIdx, setPromoIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPromoIdx((i) => (i + 1) % PROMO_MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  /* ---------- calculator ---------- */
  const [calc, setCalc] = useState({ length: '', width: '', depth: '0.15' });
  const calcVolume = (() => {
    const l = parseFloat(calc.length) || 0;
    const w = parseFloat(calc.width) || 0;
    const d = parseFloat(calc.depth) || 0;
    return l * w * d;
  })();

  /* ---------- newsletter ---------- */
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  /* ---------- animated counter ---------- */
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const countClients = useCountUp(2500, 2000, statsVisible);
  const countProducts = useCountUp(28, 1500, statsVisible);

  /* ---------- search handler ---------- */
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) onNavigate('catalog', { searchTerm: searchTerm.trim() });
  }, [searchTerm, onNavigate]);

  /* ---------- newsletter handler ---------- */
  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) { setEmailSent(true); setTimeout(() => setEmailSent(false), 4000); setEmail(''); }
  };

  /* ---------- data fetch ---------- */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [featRes, bestRes, catRes] = await Promise.allSettled([
          productsAPI.getFeatured(8),
          productsAPI.getBestsellers(6),
          productsAPI.getCategories(),
        ]);
        if (cancelled) return;
        if (featRes.status === 'fulfilled') {
          const d = featRes.value;
          setFeatured(Array.isArray(d) ? d : d?.data ?? d?.products ?? []);
        }
        if (bestRes.status === 'fulfilled') {
          const d = bestRes.value;
          setBestsellers(Array.isArray(d) ? d : d?.data ?? d?.products ?? []);
        }
        if (catRes.status === 'fulfilled') {
          const d = catRes.value;
          setCategories(Array.isArray(d) ? d : d?.data ?? d?.categories ?? []);
        }
      } catch (err) {
        console.error('ShopHomePro: fetch error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  /* ---------- add to cart handler ---------- */
  const handleAddToCart = async (productId: string) => {
    try {
      setAddingId(productId);
      await addToCart(productId, 1);
    } catch {
      // handled by context
    } finally {
      setAddingId(null);
    }
  };

  /* ---------- stock indicator ---------- */
  const StockBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'out_of_stock') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
          Rupture
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        En stock
      </span>
    );
  };

  /* ================================================================ */
  /*  LOADING STATE                                                    */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ============================================================ */}
      {/*  0. PROMO BANNER                                              */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-orange-600/20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-center gap-3 relative">
          <div className="flex items-center gap-2 text-sm transition-all duration-500" key={promoIdx}>
            <span className="text-white/90 font-medium">{PROMO_MESSAGES[promoIdx].text}</span>
            <span className="text-orange-500 font-bold text-xs bg-orange-600/15 px-2 py-0.5 rounded-full">{PROMO_MESSAGES[promoIdx].highlight}</span>
          </div>
          <div className="absolute right-4 flex items-center gap-1.5">
            {PROMO_MESSAGES.map((_, i) => (
              <button key={i} onClick={() => setPromoIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === promoIdx ? 'bg-orange-500 w-4' : 'bg-white/30 hover:bg-white/50'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  1. HERO SECTION — PREMIUM                                    */}
      {/* ============================================================ */}
      <section className="relative shop-mesh overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/11321790/pexels-photo-11321790.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Ouvrier BTP africain sur chantier"
            className="w-full h-full object-cover opacity-[0.12]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-900/60" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 shop-grid-pattern opacity-60 pointer-events-none" />

        {/* Decorative glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-orange-500/15 rounded-full blur-3xl shop-float" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-700/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="shop-fade-up">
              {/* Top label */}
              <div className="inline-flex items-center gap-2.5 shop-glass-dark rounded-full px-4 py-2 mb-7 shop-pulse-glow">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                <span className="text-orange-200 text-xs font-bold tracking-[0.15em] uppercase">
                  Allo Béton · Dakar, Sénégal
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-7">
                Matériaux BTP<br />
                <span className="shop-grad-text">de qualité pro</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-slate-300/90 leading-relaxed max-w-2xl mb-10 font-light">
                Fournisseur de référence au Sénégal. <span className="text-white font-medium">Béton, ciment, fer, granulats</span> et plus encore.
                Livraison rapide sur Dakar et ses environs.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-12">
                <button
                  onClick={() => onNavigate('catalog')}
                  className="shop-shine group inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg shadow-orange-600/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
                >
                  Voir le catalogue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => window.open('tel:+221338001234')}
                  className="inline-flex items-center gap-2 shop-glass-dark hover:bg-white/10 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 border-white/20"
                >
                  <Phone className="w-5 h-5" />
                  Nous contacter
                </button>
              </div>

              {/* Search bar */}
              <form onSubmit={handleSearch} className="relative max-w-xl mb-12">
                <div className="flex items-center shop-glass-dark rounded-2xl overflow-hidden focus-within:border-orange-400/60 focus-within:shadow-lg focus-within:shadow-orange-500/20 transition-all">
                  <Search className="w-5 h-5 text-slate-400 ml-5 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un produit : béton, ciment, fer..."
                    className="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-4 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold px-6 py-4 text-sm transition-all"
                  >
                    Rechercher
                  </button>
                </div>
              </form>

              {/* Stats row - Animated counters */}
              <div ref={statsRef} className="flex flex-wrap gap-8 sm:gap-12">
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white tabular-nums">{statsVisible ? countClients.toLocaleString('fr-FR') : '0'}+</p>
                <p className="text-slate-400 text-sm mt-1">Clients satisfaits</p>
              </div>
              <div className="w-px bg-slate-700 hidden sm:block" />
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white tabular-nums">{statsVisible ? countProducts : '0'}</p>
                <p className="text-slate-400 text-sm mt-1">Produits disponibles</p>
              </div>
              <div className="w-px bg-slate-700 hidden sm:block" />
              <div>
                <p className="text-3xl sm:text-4xl font-black text-orange-500">24-48h</p>
                <p className="text-slate-400 text-sm mt-1">Livraison Dakar</p>
              </div>
            </div>
          </div>

          {/* Right: Hero image with African workers */}
          <div className="hidden lg:block relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-orange-600/10 border border-white/10">
              <img
                src="https://images.pexels.com/photos/9485313/pexels-photo-9485313.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Ouvriers africains sur un chantier de construction"
                className="w-full h-[480px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              {/* Floating badge */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <img src="https://images.pexels.com/photos/19982408/pexels-photo-19982408.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                    <img src="https://images.pexels.com/photos/8487760/pexels-photo-8487760.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                    <img src="https://images.pexels.com/photos/11321790/pexels-photo-11321790.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">+2 500 clients satisfaits</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-orange-500 text-orange-500" />)}
                      <span className="text-xs text-slate-500 ml-1">4.8/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  2. CATEGORIES SECTION                                        */}
      {/* ============================================================ */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          {/* Section header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Nos categories
              </h2>
              <p className="text-slate-500 mt-2 text-sm sm:text-base">
                Parcourez notre gamme de materiaux de construction
              </p>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="hidden sm:inline-flex items-center gap-1.5 text-orange-700 hover:text-orange-800 font-semibold text-sm transition-colors"
            >
              Tout voir
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Category grid - with cover images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {categories.slice(0, 8).map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => onNavigate('catalog', { category: cat.slug || cat.id })}
                className="shop-card group relative overflow-hidden text-left"
              >
                {/* Cover image */}
                <div className="relative h-36 shop-img-zoom">
                  <img
                    src={getCategoryImage(cat.name)}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
                  {/* Icon overlay */}
                  <div className={`absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-md ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}>
                    {getCategoryIcon(cat.name)}
                  </div>
                  {/* Product count badge */}
                  {cat.product_count !== undefined && (
                    <span className="absolute top-3 right-3 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow">
                      {cat.product_count} produit{cat.product_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {/* Text */}
                <div className="p-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-orange-700 transition-colors">
                    {cat.name}
                  </h3>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  3. FEATURED PRODUCTS                                         */}
      {/* ============================================================ */}
      {featured.length > 0 && (
        <section className="bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            {/* Section header */}
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1 mb-3">
                  <Star className="w-3.5 h-3.5 text-orange-600" />
                  <span className="text-orange-700 text-xs font-bold uppercase tracking-wide">Selection</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Produits vedettes
                </h2>
                <p className="text-slate-500 mt-2 text-sm sm:text-base">
                  Notre selection de materiaux les plus demandes
                </p>
              </div>
              <button
                onClick={() => onNavigate('catalog')}
                className="hidden sm:inline-flex items-center gap-1.5 text-orange-700 hover:text-orange-800 font-semibold text-sm transition-colors"
              >
                Voir tout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featured.slice(0, 8).map((product) => (
                <article
                  key={product.id}
                  className="shop-card group overflow-hidden flex flex-col cursor-pointer"
                  onClick={() => onNavigate('product', { id: product.slug || product.id })}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <Package className="w-12 h-12 text-slate-200" />
                      </div>
                    )}

                    {/* Badge Vedette */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 bg-orange-600 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg shadow-md">
                        <Star className="w-3 h-3 fill-white" />
                        Vedette
                      </span>
                    </div>

                    {/* Discount badge */}
                    {product.compare_price && product.compare_price > product.price && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md">
                          -{Math.round((1 - product.price / product.compare_price) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {product.category_name && (
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        {product.category_name}
                      </p>
                    )}
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors mb-auto">
                      {product.name}
                    </h3>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <p className="text-lg font-black text-slate-900 leading-none">
                            {formatPrice(product.price)}
                          </p>
                          {product.compare_price && product.compare_price > product.price && (
                            <p className="text-xs text-slate-400 line-through mt-0.5">
                              {formatPrice(product.compare_price)}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400 mt-0.5">/ {product.unit}</p>
                        </div>
                        <StockBadge status={product.stock_status} />
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product.id);
                        }}
                        disabled={addingId === product.id || product.stock_status === 'out_of_stock'}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {addingId === product.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            Ajouter au panier
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Mobile see all */}
            <div className="mt-8 text-center sm:hidden">
              <button
                onClick={() => onNavigate('catalog')}
                className="inline-flex items-center gap-2 text-orange-700 font-semibold text-sm"
              >
                Voir tous les produits
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  3.5 NOUVEAUTES - Horizontal scroll                           */}
      {/* ============================================================ */}
      {featured.length > 4 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 text-xs font-bold uppercase tracking-wide">Nouveautes</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Derniers arrivages
              </h2>
              <p className="text-slate-500 mt-2 text-sm">Decouvrez nos produits recemment ajoutes</p>
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
            {featured.slice(0, 6).map((product) => (
              <article
                key={`new-${product.id}`}
                className="shop-card group flex-shrink-0 w-[260px] snap-start overflow-hidden cursor-pointer"
                onClick={() => onNavigate('product', { id: product.slug || product.id })}
              >
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-slate-200" /></div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg shadow-md">
                      <Zap className="w-3 h-3" /> Nouveau
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {product.category_name && <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{product.category_name}</p>}
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors mb-2">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black text-slate-900">{formatPrice(product.price)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(product.id); }}
                      disabled={addingId === product.id || product.stock_status === 'out_of_stock'}
                      className="w-9 h-9 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-40"
                    >
                      {addingId === product.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  4. BESTSELLERS SECTION                                       */}
      {/* ============================================================ */}
      {bestsellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          {/* Section header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-600 text-xs font-bold uppercase tracking-wide">Populaire</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Meilleures ventes
              </h2>
              <p className="text-slate-500 mt-2 text-sm sm:text-base">
                Les produits les plus commandes par nos clients professionnels
              </p>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="hidden sm:inline-flex items-center gap-1.5 text-orange-700 hover:text-orange-800 font-semibold text-sm transition-colors"
            >
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bestsellers grid - 3 columns, larger cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bestsellers.slice(0, 6).map((product, idx) => (
              <article
                key={product.id}
                className="shop-card group overflow-hidden flex flex-col cursor-pointer"
                onClick={() => onNavigate('product', { id: product.slug || product.id })}
              >
                {/* Image */}
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <Package className="w-14 h-14 text-slate-200" />
                    </div>
                  )}

                  {/* Rank badge */}
                  {idx < 3 && (
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black text-white shadow-md ${
                          idx === 0
                            ? 'bg-orange-600'
                            : idx === 1
                            ? 'bg-slate-700'
                            : 'bg-orange-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </div>
                  )}

                  {/* Discount badge */}
                  {product.compare_price && product.compare_price > product.price && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md">
                        -{Math.round((1 - product.price / product.compare_price) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  {product.category_name && (
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {product.category_name}
                    </p>
                  )}
                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors mb-auto">
                    {product.name}
                  </h3>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-xl font-black text-slate-900 leading-none">
                          {formatPrice(product.price)}
                        </p>
                        {product.compare_price && product.compare_price > product.price && (
                          <p className="text-xs text-slate-400 line-through mt-0.5">
                            {formatPrice(product.compare_price)}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">/ {product.unit}</p>
                      </div>
                      <StockBadge status={product.stock_status} />
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product.id);
                      }}
                      disabled={addingId === product.id || product.stock_status === 'out_of_stock'}
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-orange-600 text-white text-sm font-bold py-3 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {addingId === product.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Ajouter au panier
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  5. WHY CHOOSE US SECTION                                     */}
      {/* ============================================================ */}
      <section className="bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
            {/* Left: orange card */}
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl p-8 sm:p-10 flex flex-col justify-center text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 w-fit mb-6">
                <Award className="w-4 h-4" />
                <span className="text-sm font-semibold">Pourquoi Allo Beton ?</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
                Le partenaire de confiance pour vos projets
              </h2>
              <p className="text-slate-100 text-base leading-relaxed mb-8">
                Depuis des annees, nous fournissons les meilleurs materiaux de construction
                aux professionnels du BTP a Dakar et dans tout le Senegal.
                Qualite, fiabilite et prix competitifs sont notre engagement.
              </p>
              {/* Team avatars */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex -space-x-3">
                  <img src="https://images.pexels.com/photos/8487371/pexels-photo-8487371.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" className="w-10 h-10 rounded-full border-2 border-orange-500 object-cover" />
                  <img src="https://images.pexels.com/photos/30674591/pexels-photo-30674591.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" className="w-10 h-10 rounded-full border-2 border-orange-500 object-cover" />
                  <img src="https://images.pexels.com/photos/8488038/pexels-photo-8488038.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" className="w-10 h-10 rounded-full border-2 border-orange-500 object-cover" />
                </div>
                <p className="text-slate-100 text-sm">Notre equipe d'experts a votre service</p>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-3xl font-black">98%</p>
                  <p className="text-slate-100 text-sm">Satisfaction client</p>
                </div>
                <div className="w-px h-12 bg-white/20" />
                <div>
                  <p className="text-3xl font-black">10+</p>
                  <p className="text-slate-100 text-sm">Annees d'experience</p>
                </div>
              </div>
            </div>

            {/* Right: 2x2 benefit grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Livraison rapide */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                  <Truck className="w-5 h-5 text-orange-700" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Livraison rapide</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Livraison en 24 a 48h sur Dakar et ses environs. Flotte de camions dediee.
                </p>
              </div>

              {/* Qualite NF */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Qualite NF</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Tous nos materiaux respectent les normes en vigueur. Certificats disponibles.
                </p>
              </div>

              {/* Support expert */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-sky-100 rounded-xl flex items-center justify-center mb-4">
                  <Headphones className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Support expert</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Equipe de conseillers techniques pour vous accompagner dans vos choix.
                </p>
              </div>

              {/* Prix competitifs */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle className="w-5 h-5 text-orange-700" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Prix competitifs</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Tarifs professionnels avantageux. Remises sur volume disponibles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5.5 INTELLIGENCE ARTIFICIELLE                                  */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-slate-900 via-orange-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-full px-4 py-1.5 mb-4">
              <Brain className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 text-xs font-bold uppercase tracking-widest">Intelligence Artificielle</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              L'IA au service de votre <span className="text-orange-400">chantier</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
              Allô Béton intègre l'intelligence artificielle pour vous conseiller,
              optimiser vos commandes et sécuriser chaque transaction.
            </p>
          </div>

          {/* AI features 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="font-bold text-white text-sm mb-2">Conseiller IA 24h/24</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Notre chatbot IA répond à vos questions et recommande les matériaux adaptés à votre projet en quelques secondes.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-orange-400 font-semibold">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                En ligne maintenant
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calculator className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-bold text-white text-sm mb-2">Calcul intelligent</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Entrez vos dimensions, notre IA calcule les quantités exactes et vous évite tout gaspillage de matériaux.
              </p>
              <div className="mt-4 text-xs text-cyan-400 font-semibold">→ Économisez jusqu'à 25%</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart2 className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-bold text-white text-sm mb-2">Données en temps réel</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Prix du marché, disponibilité des stocks et tendances BTP analysés en continu pour vous offrir le meilleur.
              </p>
              <div className="mt-4 text-xs text-violet-400 font-semibold">→ Prix toujours à jour</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white text-sm mb-2">Sécurité maximale</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Chiffrement SSL, paiements sécurisés Wave & Orange Money. Vos données et transactions sont protégées.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <Shield className="w-3 h-3" /> Certifié SSL/TLS
              </div>
            </div>
          </div>

          {/* Chatbot demo */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Assistant IA Allô Béton</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs">En ligne</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="bg-orange-600 text-white text-xs rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-xs">
                  J'ai besoin de béton pour une dalle de 50m²
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-orange-600/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-orange-400" />
                </div>
                <div className="bg-white/10 text-slate-200 text-xs rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-xs">
                  Pour 50m² à 15cm d'épaisseur, il vous faut <strong className="text-orange-400">7.5 m³ de béton</strong>. Je recommande notre Béton B25 à <strong className="text-white">85 000 FCFA/m³</strong>. Voulez-vous commander ?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-orange-600 text-white text-xs rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-xs">
                  Oui, et quelle armature me conseilles-tu ?
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-orange-600/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-orange-400" />
                </div>
                <div className="bg-white/10 text-slate-200 text-xs rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-xs">
                  Je recommande des <strong className="text-orange-400">barres HA10</strong> en quadrillage 15x15cm. Il vous faut environ <strong className="text-white">120 kg</strong>. Je prépare votre panier complet ? 📦
                </div>
              </div>
            </div>
          </div>

          {/* Security badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {[
              { icon: <Lock className="w-3.5 h-3.5" />, label: 'SSL 256-bit', cls: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
              { icon: <Shield className="w-3.5 h-3.5" />, label: 'Paiements sécurisés', cls: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
              { icon: <Database className="w-3.5 h-3.5" />, label: 'Données chiffrées', cls: 'text-violet-400 border-violet-400/30 bg-violet-400/10' },
              { icon: <Globe className="w-3.5 h-3.5" />, label: 'Cloud sécurisé', cls: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
            ].map((b) => (
              <div key={b.label} className={`flex items-center gap-2 border rounded-full px-4 py-2 ${b.cls}`}>
                {b.icon}
                <span className="text-xs font-bold">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6. TESTIMONIALS - Personnages africains                       */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1 mb-3">
            <Users className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-orange-700 text-xs font-bold uppercase tracking-wide">Temoignages</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Ils nous font confiance
          </h2>
          <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-xl mx-auto">
            Decouvrez ce que nos clients professionnels pensent de nos services
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Testimonial 1 - Abdou Mbaye */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-orange-500 text-orange-500" />)}
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              "Allo Beton est notre fournisseur principal depuis 4 ans. La qualite du beton est constante et la livraison toujours dans les temps. Un partenaire fiable pour nos chantiers a Dakar."
            </p>
            <div className="flex items-center gap-3">
              <img
                src="https://images.pexels.com/photos/19982408/pexels-photo-19982408.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                alt="Abdou Mbaye"
                className="w-11 h-11 rounded-full object-cover"
              />
              <div>
                <p className="font-bold text-slate-900 text-sm">Abdou Mbaye</p>
                <p className="text-slate-400 text-xs">Directeur - EGA Construction</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 - Aissatou Diallo */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-orange-500 text-orange-500" />)}
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              "Les prix sont tres competitifs et le service client reactif. J'apprecie particulierement les fiches techniques detaillees qui m'aident a choisir les bons materiaux pour mes projets."
            </p>
            <div className="flex items-center gap-3">
              <img
                src="https://images.pexels.com/photos/8487760/pexels-photo-8487760.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                alt="Aissatou Diallo"
                className="w-11 h-11 rounded-full object-cover"
              />
              <div>
                <p className="font-bold text-slate-900 text-sm">Aissatou Diallo</p>
                <p className="text-slate-400 text-xs">Architecte - Studio AD Design</p>
              </div>
            </div>
          </div>

          {/* Testimonial 3 - Cheikh Diop */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(4)].map((_, i) => <Star key={i} className="w-4 h-4 fill-orange-500 text-orange-500" />)}
              <Star className="w-4 h-4 text-slate-200" />
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              "La livraison sur chantier est un vrai plus. Les camions arrivent a l'heure et les quantites sont toujours exactes. Service professionnel du debut a la fin."
            </p>
            <div className="flex items-center gap-3">
              <img
                src="https://images.pexels.com/photos/11321790/pexels-photo-11321790.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                alt="Cheikh Diop"
                className="w-11 h-11 rounded-full object-cover"
              />
              <div>
                <p className="font-bold text-slate-900 text-sm">Cheikh Diop</p>
                <p className="text-slate-400 text-xs">Chef de chantier - SETRAB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust logos row */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Norme NF</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Certifie ISO</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Livraison Dakar 24-48h</span>
          </div>
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Support 7j/7</span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6.2 IMPACT SOCIAL — DATA                                      */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-3">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wide">Notre Impact</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Notre impact social en chiffres
          </h2>
          <p className="text-slate-500 mt-2 text-sm max-w-xl mx-auto">
            Allô Béton transforme le secteur BTP sénégalais, une commande à la fois.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 sm:p-6 text-center">
            <div className="flex justify-center mb-3"><Users className="w-6 h-6 text-orange-500" /></div>
            <p className="text-3xl sm:text-4xl font-black text-orange-700 mb-1">2 500+</p>
            <p className="font-bold text-slate-800 text-sm">Clients servis</p>
            <p className="text-slate-400 text-xs mt-0.5">Particuliers & pros</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 sm:p-6 text-center">
            <div className="flex justify-center mb-3"><TrendingUp className="w-6 h-6 text-emerald-500" /></div>
            <p className="text-3xl sm:text-4xl font-black text-emerald-700 mb-1">50+</p>
            <p className="font-bold text-slate-800 text-sm">Emplois créés</p>
            <p className="text-slate-400 text-xs mt-0.5">Directs & indirects</p>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 sm:p-6 text-center">
            <div className="flex justify-center mb-3"><BarChart2 className="w-6 h-6 text-violet-500" /></div>
            <p className="text-3xl sm:text-4xl font-black text-violet-700 mb-1">25%</p>
            <p className="font-bold text-slate-800 text-sm">Économies moyennes</p>
            <p className="text-slate-400 text-xs mt-0.5">vs achat traditionnel</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 sm:p-6 text-center">
            <div className="flex justify-center mb-3"><MapPin className="w-6 h-6 text-amber-500" /></div>
            <p className="text-3xl sm:text-4xl font-black text-amber-700 mb-1">3</p>
            <p className="font-bold text-slate-800 text-sm">Régions couvertes</p>
            <p className="text-slate-400 text-xs mt-0.5">Dakar, Thiès, St-Louis</p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6.5 PARTNER BRANDS                                           */}
      {/* ============================================================ */}
      <section className="bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
              Nos partenaires & fournisseurs
            </h2>
            <p className="text-slate-500 text-sm">Les plus grandes marques du BTP nous font confiance</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {PARTNER_BRANDS.map((brand) => (
              <div key={brand.name} className="group bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-slate-200 hover:shadow-md transition-all duration-200">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <span className="text-lg font-black text-slate-700 group-hover:text-orange-700 transition-colors">{brand.name.charAt(0)}</span>
                </div>
                <p className="text-xs font-bold text-slate-700 text-center">{brand.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{brand.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6.6 CONCRETE CALCULATOR                                      */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left info */}
          <div>
            <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-full px-3 py-1 mb-4">
              <Calculator className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-sky-600 text-xs font-bold uppercase tracking-wide">Outil gratuit</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-4">
              Calculez votre besoin en beton
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              Estimez rapidement le volume de beton necessaire pour votre dalle, fondation ou terrasse.
              Notre calculateur vous donne une estimation instantanee.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Estimation gratuite
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Resultat instantane
              </div>
            </div>
          </div>

          {/* Right calculator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg shadow-slate-200/50">
            <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sky-500" />
              Calculateur de volume
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Longueur (m)</label>
                <input
                  type="number" min="0" step="0.1" value={calc.length} onChange={(e) => setCalc({ ...calc, length: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Largeur (m)</label>
                <input
                  type="number" min="0" step="0.1" value={calc.width} onChange={(e) => setCalc({ ...calc, width: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Epaisseur (m)</label>
                <input
                  type="number" min="0" step="0.01" value={calc.depth} onChange={(e) => setCalc({ ...calc, depth: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                  placeholder="0.15"
                />
              </div>
            </div>

            {/* Result */}
            <div className={`rounded-xl p-5 text-center transition-all duration-300 ${calcVolume > 0 ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
              <p className="text-xs font-semibold mb-1 opacity-80">{calcVolume > 0 ? 'Volume estime' : 'Renseignez les dimensions'}</p>
              <p className="text-3xl sm:text-4xl font-black">{calcVolume > 0 ? `${calcVolume.toFixed(2)} m³` : '— m³'}</p>
              {calcVolume > 0 && (
                <p className="text-xs mt-2 opacity-80">≈ {Math.ceil(calcVolume / 0.035)} sacs de ciment (35 kg)</p>
              )}
            </div>

            {calcVolume > 0 && (
              <button
                onClick={() => onNavigate('catalog', { searchTerm: 'beton' })}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-900 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Commander le beton necessaire
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6.7 NEWSLETTER + WHATSAPP                                    */}
      {/* ============================================================ */}
      <section className="bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Newsletter */}
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-600/15 border border-orange-600/30 rounded-full px-3 py-1 mb-4">
                <Mail className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-orange-300 text-xs font-bold uppercase tracking-wide">Newsletter</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                Restez informe de nos offres
              </h2>
              <p className="text-slate-400 mb-6">
                Recevez nos promotions, nouveaux produits et conseils BTP directement dans votre boite mail.
              </p>
              <form onSubmit={handleNewsletter} className="flex gap-3">
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-orange-500 transition-colors"
                />
                <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm">
                  {emailSent ? <><CheckCircle className="w-4 h-4" /> Inscrit !</> : <><Mail className="w-4 h-4" /> S'inscrire</>}
                </button>
              </form>
              {emailSent && <p className="text-emerald-400 text-sm mt-3 font-medium">Merci ! Vous recevrez nos prochaines offres.</p>}
            </div>

            {/* WhatsApp CTA */}
            <div className="bg-gradient-to-br from-[#25D366]/20 to-[#25D366]/5 border border-[#25D366]/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#25D366]/30">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Commandez via WhatsApp</h3>
              <p className="text-slate-400 text-sm mb-5">
                Envoyez-nous votre liste de materiaux et recevez un devis en 30 minutes.
              </p>
              <a
                href="https://wa.me/221338001234?text=Bonjour%20Allo%20Beton%20!%20Je%20souhaite%20un%20devis%20pour%20:"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-[#25D366]/25"
              >
                <MessageCircle className="w-5 h-5" />
                Demarrer une conversation
              </a>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Reponse en 30 min</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Lun-Sam 8h-18h</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  7. CTA SECTION                                               */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-r from-orange-600 to-orange-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Pret a commander ?
              </h2>
              <p className="text-slate-100 text-base">
                Appelez-nous au{' '}
                <a
                  href="tel:+221338001234"
                  className="text-white font-bold underline underline-offset-2 hover:no-underline"
                >
                  +221 33 800 12 34
                </a>
                {' '}ou commandez directement en ligne.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('catalog')}
                className="inline-flex items-center gap-2 bg-white text-orange-700 font-bold px-8 py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-lg"
              >
                Voir le catalogue
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => window.open('tel:+221338001234')}
                className="inline-flex items-center gap-2 border-2 border-white/40 hover:border-white text-white font-bold px-8 py-3.5 rounded-xl transition-colors"
              >
                <Phone className="w-5 h-5" />
                Appeler
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER SPACER                                                */}
      {/* ============================================================ */}
      <div className="h-4 bg-slate-50" />
    </div>
  );
};

export default ShopHomePro;
