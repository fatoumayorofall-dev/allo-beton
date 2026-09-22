import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, Truck, X, Package } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import { SITE_CONFIG } from '../config/site';
import { formatPrice } from '../utils/format';
import { Logo } from './Logo';
import { SearchOverlay } from './SearchOverlay';

const ANNOUNCEMENTS = [
  `Livraison offerte dès ${formatPrice(SITE_CONFIG.freeShippingThreshold)} à Dakar`,
  'Paiement Wave, Orange Money ou à la livraison',
  '-10 % sur votre 1re commande avec le code BIENVENUE',
  'Échange gratuit sous 7 jours',
];

export const Navbar: React.FC = () => {
  const { cart, wishlist, setCartOpen } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `relative text-[13px] font-medium tracking-wide uppercase py-2 transition-colors ${isActive ? 'text-ink' : 'text-ink/60 hover:text-ink'}`;

  return (
    <>
      {/* Bandeau d'annonces défilant */}
      <div className="bg-ink text-ivory text-[11px] tracking-[0.15em] uppercase overflow-hidden h-9 flex items-center">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((a, i) => (
            <span key={i} className="px-10 flex items-center gap-10">{a}<span className="text-gold">✦</span></span>
          ))}
        </div>
      </div>

      <header className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-ivory/90 backdrop-blur-md shadow-sm' : 'bg-ivory'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-4">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><Menu className="w-6 h-6" /></button>

          <Logo />

          <nav className="hidden lg:flex items-center gap-7" aria-label="Navigation principale">
            <NavLink to="/boutique?tri=nouveautes" className={() => linkCls({ isActive: false })}>Nouveautés</NavLink>
            {CATEGORIES.map(c => (
              <NavLink key={c.id} to={`/boutique/${c.id}`} className={linkCls}>{c.name}</NavLink>
            ))}
            <NavLink to="/boutique?promo=1" className={() => 'text-[13px] font-semibold tracking-wide uppercase text-[#a3142b]'}>Soldes</NavLink>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setSearchOpen(true)} aria-label="Rechercher" className="p-2.5 rounded-full hover:bg-ink/5"><Search className="w-5 h-5" /></button>
            <Link to="/suivi" aria-label="Suivre ma commande" className="hidden sm:block p-2.5 rounded-full hover:bg-ink/5"><Truck className="w-5 h-5" /></Link>
            <Link to="/favoris" aria-label="Mes favoris" className="relative p-2.5 rounded-full hover:bg-ink/5">
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-gold text-white text-[10px] font-bold grid place-items-center">{wishlist.length}</span>}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label="Ouvrir le panier" className="relative p-2.5 rounded-full hover:bg-ink/5">
              <ShoppingBag className="w-5 h-5" />
              {count > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-ink text-ivory text-[10px] font-bold grid place-items-center">{count}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMobileOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-ivory p-6 flex flex-col gap-1 animate-fade-up overflow-y-auto" aria-label="Menu mobile">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="p-2"><X className="w-6 h-6" /></button>
            </div>
            <Link to="/boutique?tri=nouveautes" className="py-3 border-b border-ink/10 font-display text-xl">Nouveautés</Link>
            {CATEGORIES.map(c => (
              <Link key={c.id} to={`/boutique/${c.id}`} className="py-3 border-b border-ink/10 font-display text-xl">{c.name}</Link>
            ))}
            <Link to="/boutique?promo=1" className="py-3 border-b border-ink/10 font-display text-xl text-[#a3142b]">Soldes</Link>
            <div className="mt-6 flex flex-col gap-3 text-sm">
              <Link to="/suivi" className="flex items-center gap-2"><Package className="w-4 h-4" /> Suivre ma commande</Link>
              <Link to="/favoris" className="flex items-center gap-2"><Heart className="w-4 h-4" /> Mes favoris</Link>
              <Link to="/a-propos" className="text-ink/70">À propos</Link>
              <Link to="/faq" className="text-ink/70">Aide & FAQ</Link>
            </div>
          </nav>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
