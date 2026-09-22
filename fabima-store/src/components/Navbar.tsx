import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Heart, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import type { CategoryId } from '../data/types';
import { SITE_CONFIG } from '../config/site';
import { formatPrice } from '../utils/format';
import { useEscape, useLockBody } from '../utils/hooks';
import { Logo } from './Logo';
import { SearchOverlay } from './SearchOverlay';
import { ProductImage } from './ProductImage';

const ANNOUNCEMENTS = [
  `Livraison offerte dès ${formatPrice(SITE_CONFIG.freeShippingThreshold)}`,
  'Nouvelle collection pour elle ✿ Automne 2026',
  'Paiement Wave, Orange Money ou à la livraison',
  'Code BIENVENUE : -10 % sur votre première commande',
  'Emballage cadeau avec votre mot doux',
  'Échange gratuit sous 7 jours',
];

export const Navbar: React.FC = () => {
  const { cart, wishlist, setCartOpen, products } = useStore();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mega, setMega] = useState<CategoryId | null>(null);
  const [announce, setAnnounce] = useState(0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  useLockBody(mobileOpen);
  useEscape(mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setAnnounce(a => (a + 1) % ANNOUNCEMENTS.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setMobileOpen(false); setMega(null); }, [location.pathname, location.search]);

  // Sous-catégories et article vedette de chaque univers pour le méga-menu
  const megaData = useMemo(() => Object.fromEntries(CATEGORIES.map(c => {
    const items = products.filter(p => p.category === c.id);
    return [c.id, {
      subs: [...new Set(items.map(p => p.subcategory))].sort(),
      featured: items.find(p => p.isBestseller) ?? items[0],
    }];
  })) as Record<CategoryId, { subs: string[]; featured?: typeof products[number] }>, [products]);

  const transparent = isHome && !scrolled && !mega;
  const tone = transparent ? 'text-ivory' : 'text-ink';
  const iconBtn = `relative w-10 h-10 grid place-items-center rounded-full transition-colors ${transparent ? 'hover:bg-ivory/10' : 'hover:bg-ink/5'}`;
  const badge = 'absolute top-1 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center';

  return (
    <>
      {/* Bandeau d'annonces */}
      <div className="bg-ink text-ivory/90 h-9 flex items-center justify-center overflow-hidden relative z-[51]">
        <p key={announce} className="text-[10px] tracking-[0.28em] uppercase animate-fade-up px-4 text-center truncate">{ANNOUNCEMENTS[announce]}</p>
      </div>

      <header onMouseLeave={() => setMega(null)}
        className={`${isHome ? 'fixed top-9' : 'sticky top-0'} inset-x-0 z-50 transition-all duration-500 ease-luxe ${
          transparent ? 'bg-transparent' : 'bg-ivory/95 backdrop-blur-md shadow-[0_1px_0_rgba(22,18,15,.08)]'} ${isHome && scrolled ? '!top-0' : ''}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 lg:h-[72px] grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Gauche */}
          <div className={`flex items-center gap-1 ${tone}`}>
            <button className={`lg:hidden ${iconBtn} -ml-2`} onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><Menu className="w-5 h-5" strokeWidth={1.5} /></button>
            <button onClick={() => setSearchOpen(true)} aria-label="Rechercher" className={`${iconBtn} lg:-ml-2`}><Search className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
            <a href={`tel:${SITE_CONFIG.phoneRaw}`} className="hidden xl:inline text-[10px] uppercase tracking-[0.2em] ml-2 opacity-80 hover:opacity-100">{SITE_CONFIG.phone}</a>
          </div>

          {/* Centre */}
          <Logo light={transparent} />

          {/* Droite */}
          <div className={`flex items-center justify-end gap-0.5 sm:gap-1 ${tone}`}>
            <Link to="/mes-commandes" aria-label="Mes commandes" className={`hidden sm:grid ${iconBtn}`}><User className="w-[18px] h-[18px]" strokeWidth={1.5} /></Link>
            <Link to="/favoris" aria-label="Mes favoris" className={iconBtn}>
              <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {wishlist.length > 0 && <span className={`${badge} bg-gold text-white`}>{wishlist.length}</span>}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label={`Ouvrir le panier (${count} article${count > 1 ? 's' : ''})`} className={`${iconBtn} lg:-mr-2`}>
              <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {count > 0 && <span className={`${badge} ${transparent ? 'bg-ivory text-ink' : 'bg-ink text-ivory'}`}>{count}</span>}
            </button>
          </div>
        </div>

        {/* Navigation principale (desktop) */}
        <nav className={`hidden lg:flex items-center justify-center gap-9 h-11 ${tone}`} aria-label="Navigation principale">
          <NavLink to="/boutique?tri=nouveautes" onMouseEnter={() => setMega(null)} className="link-luxe text-[11px] uppercase tracking-[0.2em] font-medium py-2 whitespace-nowrap">Nouveautés</NavLink>
          {CATEGORIES.map(c => (
            <NavLink key={c.id} to={`/boutique/${c.id}`} onMouseEnter={() => setMega(c.id)} onFocus={() => setMega(c.id)}
              className={({ isActive }) => `link-luxe text-[11px] uppercase tracking-[0.2em] font-medium py-2 whitespace-nowrap ${isActive || mega === c.id ? 'is-active' : ''}`}>
              {c.name}
            </NavLink>
          ))}
          <NavLink to="/a-propos" onMouseEnter={() => setMega(null)} className="link-luxe text-[11px] uppercase tracking-[0.2em] font-medium py-2 whitespace-nowrap">La maison</NavLink>
          <NavLink to="/boutique?promo=1" onMouseEnter={() => setMega(null)}
            className={`link-luxe text-[11px] uppercase tracking-[0.2em] font-semibold py-2 ${transparent ? 'text-gold-light' : 'text-wine'}`}>Offres</NavLink>
        </nav>

        {/* Méga-menu */}
        {mega && (
          <div className="hidden lg:block absolute inset-x-0 top-full bg-ivory border-t border-ink/[0.06] shadow-luxe rounded-b-[2.5rem] animate-fade-in">
            <div className="max-w-[1440px] mx-auto px-12 py-10 grid grid-cols-[1fr_1fr_1.3fr] gap-12">
              <div>
                <p className="eyebrow mb-5">{CATEGORIES.find(c => c.id === mega)?.name}</p>
                <ul className="space-y-3">
                  {megaData[mega].subs.map(s => (
                    <li key={s}><Link to={`/boutique/${mega}?type=${encodeURIComponent(s)}`} className="font-display text-2xl hover:text-gold-dark hover:pl-2 transition-all duration-500">{s}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-5">Sélection</p>
                <ul className="space-y-3 text-sm">
                  <li><Link to={`/boutique/${mega}?tri=nouveautes`} className="link-luxe">Nouveautés</Link></li>
                  <li><Link to={`/boutique/${mega}?tri=note`} className="link-luxe">Les mieux notés</Link></li>
                  <li><Link to={`/boutique/${mega}?genre=femme`} className="link-luxe">Pour elle</Link></li>
                  <li><Link to={`/boutique/${mega}?genre=homme`} className="link-luxe">Pour lui</Link></li>
                  <li><Link to={`/boutique/${mega}?promo=1`} className="link-luxe text-wine">En promotion</Link></li>
                </ul>
                <Link to={`/boutique/${mega}`} className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold link-luxe">
                  Tout voir <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {megaData[mega].featured && (
                <Link to={`/produit/${megaData[mega].featured!.slug}`} className="group grid grid-cols-[1fr_1.1fr] gap-6 items-center">
                  <div className="aspect-[3/4] overflow-hidden arch">
                    <ProductImage src={megaData[mega].featured!.images[0]} alt={megaData[mega].featured!.name} className="w-full h-full group-hover:scale-105 transition-transform duration-[1.2s]" />
                  </div>
                  <div>
                    <p className="font-script text-2xl text-gold-dark">Notre coup de cœur</p>
                    <p className="font-display text-3xl mt-3 leading-tight">{megaData[mega].featured!.name}</p>
                    <p className="text-sm mt-2 text-ink/60">{formatPrice(megaData[mega].featured!.price)}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold">Découvrir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-[88%] max-w-sm bg-ivory flex flex-col rounded-r-[2rem] overflow-hidden animate-slide-in-left" aria-label="Menu mobile">
            <div className="flex items-center justify-between px-6 h-[72px] border-b border-ink/10">
              <Logo />
              <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="w-10 h-10 grid place-items-center"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <Link to="/boutique?tri=nouveautes" className="flex items-center justify-between py-4 border-b border-ink/10 font-display text-2xl">Nouveautés <ArrowRight className="w-4 h-4 text-ink/30" /></Link>
              {CATEGORIES.map(c => (
                <Link key={c.id} to={`/boutique/${c.id}`} className="flex items-center justify-between py-4 border-b border-ink/10 font-display text-2xl">{c.name} <ArrowRight className="w-4 h-4 text-ink/30" /></Link>
              ))}
              <Link to="/boutique?promo=1" className="flex items-center justify-between py-4 border-b border-ink/10 font-display text-2xl text-wine">Soldes <ArrowRight className="w-4 h-4" /></Link>
              <div className="mt-8 space-y-4 text-sm">
                <Link to="/mes-commandes" className="flex items-center gap-3"><User className="w-4 h-4" strokeWidth={1.5} /> Mes commandes</Link>
                <Link to="/suivi" className="flex items-center gap-3"><Package className="w-4 h-4" strokeWidth={1.5} /> Suivre une commande</Link>
                <Link to="/favoris" className="flex items-center gap-3"><Heart className="w-4 h-4" strokeWidth={1.5} /> Mes favoris ({wishlist.length})</Link>
              </div>
            </div>
            <div className="px-6 py-5 bg-ivory-deep text-xs text-ink/60 flex justify-between">
              <Link to="/a-propos">Notre maison</Link><Link to="/faq">Aide & FAQ</Link><a href={`tel:${SITE_CONFIG.phoneRaw}`}>Appeler</a>
            </div>
          </nav>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
