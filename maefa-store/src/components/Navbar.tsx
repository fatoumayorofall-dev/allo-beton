import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Heart, Menu, Package, Search, ShoppingBag, Truck, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAccount } from '../context/AccountContext';
import { CATEGORIES, OCCASIONS } from '../data/catalog';
import type { CategoryId } from '../data/types';
import { FEATURES, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { shownPrice } from '../utils/format';
import { daysUntil, formatDay, inDays, orderBy, upcomingFetes } from '../utils/fetes';
import { useEscape, useLockBody } from '../utils/hooks';
import { Logo } from './Logo';
import { CurrencySwitch } from './CurrencySwitch';
import { SearchOverlay } from './SearchOverlay';
import { ProductImage } from './ProductImage';
import { SocialLinks } from './BrandLogos';

// Fête proche (moins de 30 jours) : annoncée en premier, avec la date limite pour être livrée à temps
const NEXT_FETE = upcomingFetes(new Date(), 30)[0];
const ANNOUNCEMENTS = [
  ...(NEXT_FETE ? [daysUntil(NEXT_FETE.date) > 3
    ? `${NEXT_FETE.name} ${inDays(daysUntil(NEXT_FETE.date))} · commandez avant le ${formatDay(orderBy(NEXT_FETE.date))}`
    : `${NEXT_FETE.name} ${inDays(daysUntil(NEXT_FETE.date))} · livraison express à Dakar`] : []),
  'Dalal ak jàmm · bienvenue chez Maefa',
  'Livraison 24 h à Dakar · suivi en direct',
  'Nouvelle collection · Automne 2026',
  'Paiement Wave, Orange Money ou à la livraison',
  'Code BIENVENUE : -10 % sur votre première commande',
  'Emballage cadeau avec votre mot doux',
  'Chaque pièce contrôlée avant l\'envoi',
];

export const Navbar: React.FC = () => {
  const { cart, wishlist, setCartOpen, products } = useStore();
  const newest = useMemo(() => { const n = products.filter(p => p.isNew); return n[n.length - 1] ?? products[products.length - 1]; }, [products]);
  const countBy = useMemo(() => products.reduce<Record<string, number>>((m, p) => ((m[p.category] = (m[p.category] ?? 0) + 1), m), {}), [products]);
  const account = useAccount();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  // Téléphone : l'en-tête s'efface quand on descend et revient dès qu'on remonte (plus de place pour les pièces)
  const [tucked, setTucked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mega, setMega] = useState<CategoryId | null>(null);
  const [announce, setAnnounce] = useState(0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  useLockBody(mobileOpen);
  useEscape(mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      const d = y - last;
      if (window.innerWidth >= 1024 || y < 160 || d < -6) setTucked(false);
      else if (d > 6) setTucked(true);
      last = y;
    };
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

  // Au défilement, l'en-tête devient un îlot flottant en verre dépoli
  const floating = scrolled && !mega;
  const hideBar = tucked && !mobileOpen && !searchOpen;
  useEffect(() => { document.body.toggleAttribute('data-header-hidden', hideBar); }, [hideBar]);
  const tone = 'text-ink';
  const iconBtn = `relative w-10 h-10 grid place-items-center rounded-full transition-colors hover:bg-ink/5`;
  const badge = 'absolute top-1 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center';

  return (
    <>
      {/* Bandeau d'annonces */}
      <aside aria-label="Annonces" className="bg-ink text-ivory/90 h-9 flex items-center justify-center overflow-hidden relative z-[51]">
        <p key={announce} className="text-[10px] tracking-[0.28em] uppercase animate-fade-up px-4 text-center truncate">{ANNOUNCEMENTS[announce]}</p>
      </aside>

      <header onMouseLeave={() => setMega(null)} data-floating={floating || undefined}
        className={`sticky top-0 inset-x-0 z-50 transition-[background-color,box-shadow,border-radius,margin,transform] duration-500 ease-luxe ${
          hideBar ? '-translate-y-[130%] mx-2 sm:mx-4 rounded-full bg-ivory/[0.88] backdrop-blur-xl' : floating ? 'mx-2 sm:mx-4 translate-y-2 rounded-full lg:rounded-[2rem] bg-ivory/[0.88] backdrop-blur-xl backdrop-saturate-150 shadow-[0_18px_40px_-22px_rgba(58,31,45,.45)] ring-1 ring-ink/[0.06]'
            : 'bg-ivory/95 backdrop-blur-md shadow-[0_1px_0_rgba(22,18,15,.08)]'}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 lg:h-[72px] grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Gauche */}
          <div className={`flex items-center gap-1 ${tone}`}>
            <button className={`lg:hidden ${iconBtn} -ml-2`} onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><Menu className="w-5 h-5" strokeWidth={1.5} /></button>
            <button onClick={() => setSearchOpen(true)} aria-label="Rechercher" className={`${iconBtn} lg:-ml-2`}><Search className="w-[18px] h-[18px]" strokeWidth={1.5} /></button>
            <a href={`tel:${SITE_CONFIG.phoneRaw}`} className="hidden xl:inline text-[10px] uppercase tracking-[0.2em] ml-2 opacity-80 hover:opacity-100">{SITE_CONFIG.phone}</a>
            <CurrencySwitch className="hidden lg:block ml-4" />
          </div>

          {/* Centre */}
          <Logo />

          {/* Droite */}
          <div className={`flex items-center justify-end gap-0.5 sm:gap-1 ${tone}`}>
            <Link to="/compte" aria-label={account.user ? `Mon compte (${account.user.firstName || 'connectée'})` : 'Mon compte'} className={`hidden sm:grid ${iconBtn}`}>
              <User className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {account.user && <span className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-ivory" />}
            </Link>
            <Link to="/favoris" aria-label="Mes favoris" className={`hidden lg:grid ${iconBtn}`}>
              <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {wishlist.length > 0 && <span className={`${badge} bg-gold text-white`}>{wishlist.length}</span>}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label={`Ouvrir le panier (${count} article${count > 1 ? 's' : ''})`} className={`${iconBtn} lg:-mr-2`} data-cart-target>
              <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {count > 0 && <span key={count} className={`${badge} animate-heart-pop bg-ink text-ivory`} data-testid="cart-count">{count}</span>}
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
          {FEATURES.marche && (
            <NavLink to="/marche" onMouseEnter={() => setMega(null)} className={({ isActive }) => `link-luxe text-[11px] uppercase tracking-[0.2em] font-medium py-2 whitespace-nowrap inline-flex items-center gap-1.5 ${isActive ? 'is-active' : ''}`}>
              Le Marché <sup className="text-[8px] tracking-[0.18em] text-gold-dark">MONDE</sup>
            </NavLink>
          )}
          {FEATURES.journal && <NavLink to="/journal" onMouseEnter={() => setMega(null)} className={({ isActive }) => `link-luxe text-[11px] uppercase tracking-[0.2em] font-medium py-2 whitespace-nowrap ${isActive ? 'is-active' : ''}`}>Le journal</NavLink>}
          {FEATURES.offres && (
            <NavLink to="/boutique?promo=1" onMouseEnter={() => setMega(null)}
              className={`link-luxe text-[11px] uppercase tracking-[0.2em] font-medium py-2`}>Offres</NavLink>
          )}
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
                  {OCCASIONS.slice(0, 3).map(o => <li key={o.id}><Link to={`/boutique/${mega}?occasion=${o.id}`} className="link-luxe">{o.name}</Link></li>)}
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
                    <p className="text-sm mt-2 text-ink/75">{shownPrice(megaData[mega].featured!.price)}</p>
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
        // Un seul bloc qui défile (le calque entier), sans zone de défilement imbriquée :
        // c'est ce qui marche partout, y compris dans les navigateurs intégrés des iPhone.
        <div className="fixed inset-0 z-[75] lg:hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" data-testid="menu-scroll">
          <div className="fixed inset-0 bg-ink/50 animate-fade-in" onClick={() => setMobileOpen(false)} aria-hidden />
          <nav className="relative min-h-full w-[90%] max-w-sm bg-ivory flex flex-col rounded-r-[2rem] animate-slide-in-left shadow-[30px_0_60px_-30px_rgba(43,18,32,.6)]" aria-label="Menu mobile">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 h-[76px] bg-ivory/95 backdrop-blur rounded-tr-[2rem] border-b border-ink/[0.05]">
              <Logo />
              <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="w-10 h-10 rounded-full bg-white border border-ink/10 shadow-sm grid place-items-center"><X className="w-[18px] h-[18px]" strokeWidth={1.6} /></button>
            </div>
            <div className="flex-1 px-5 pt-4 pb-6">
              {/* Rubriques : une vraie pièce en vignette, comme une vitrine */}
              <div className="space-y-2.5" data-testid="menu-rubriques">
                {[
                  { to: '/boutique?tri=nouveautes', name: 'Nouveautés', note: 'Les dernières arrivées', img: newest?.images[0] },
                  ...CATEGORIES.map(c => ({ to: `/boutique/${c.id}`, name: c.name, note: `${countBy[c.id] ?? 0} modèles`, img: products.find(p => p.category === c.id)?.images[0] })),
                  ...(FEATURES.offres ? [{ to: '/boutique?promo=1', name: 'Offres', note: 'Les bonnes affaires', img: undefined }] : []),
                  ...(FEATURES.marche ? [{ to: '/marche', name: 'Le Marché', note: 'Le monde à Dakar', img: undefined }] : []),
                ].map(r => (
                  <Link key={r.to} to={r.to} className="group flex items-center gap-4 p-2.5 pr-4 rounded-[1.4rem] bg-white border border-ink/[0.06] shadow-[0_10px_24px_-18px_rgba(58,31,45,.45)] active:scale-[.99] transition-transform">
                    <span className="w-14 h-14 rounded-[1.05rem] overflow-hidden shrink-0 bg-blush/40 ring-1 ring-ink/[0.05]">
                      {r.img && <ProductImage src={r.img} alt="" label="" className="w-full h-full" sizes="56px" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display text-[1.45rem] leading-none">{r.name}</span>
                      <span className="block mt-1.5 text-[11px] text-ink/60 tracking-wide">{r.note}</span>
                    </span>
                    <span className="w-8 h-8 rounded-full bg-ivory-deep grid place-items-center text-ink/70 group-hover:translate-x-0.5 transition-transform"><ArrowRight className="w-3.5 h-3.5" /></span>
                  </Link>
                ))}
              </div>

              <p className="eyebrow mt-7 mb-3">Par occasion</p>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map(o => <Link key={o.id} to={`/boutique?occasion=${o.id}`} className="px-3.5 h-9 inline-flex items-center rounded-full bg-white border border-ink/10 text-xs shadow-[0_4px_10px_-8px_rgba(58,31,45,.5)]">{o.name}</Link>)}
              </div>
              {FEATURES.journal && <Link to="/journal" className="flex items-center justify-between py-4 mt-6 border-y border-ink/10 font-display text-2xl">Le journal <ArrowRight className="w-4 h-4 text-ink/30" /></Link>}

              <p className="eyebrow mt-7 mb-3">Mon espace</p>
              <div className="grid grid-cols-2 gap-2.5" data-testid="menu-espace">
                {[
                  { to: '/compte', Icon: User, label: account.user ? (account.user.firstName || 'Mon compte') : 'Mon compte', note: account.user ? 'Connectée' : 'Avec mon numéro' },
                  { to: '/mes-commandes', Icon: Package, label: 'Commandes', note: 'Historique' },
                  { to: '/suivi', Icon: Truck, label: 'Suivre', note: 'Ma livraison' },
                  { to: '/favoris', Icon: Heart, label: 'Favoris', note: `${wishlist.length} pièce${wishlist.length > 1 ? 's' : ''}` },
                ].map(({ to, Icon, label, note }) => (
                  <Link key={to} to={to} className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-ink/[0.06]">
                    <span className="w-9 h-9 rounded-full bg-gradient-to-b from-[#f6e3dc] to-[#e7c3b8] grid place-items-center text-ink shrink-0"><Icon className="w-4 h-4" strokeWidth={1.7} /></span>
                    <span className="min-w-0"><span className="block text-[13px] font-semibold leading-tight truncate">{label}</span><span className="block text-[10.5px] text-ink/60 truncate">{note}</span></span>
                  </Link>
                ))}
              </div>

              <div className="mt-7 rounded-[1.4rem] bg-white border border-ink/[0.06] p-4" data-testid="menu-socials">
                <p className="eyebrow mb-3.5">Suivez-nous</p>
                <SocialLinks size="w-10 h-10" labels />
              </div>
              <div className="mt-3 px-1 flex items-center justify-between text-xs text-ink/75"><span>Afficher les prix en</span><CurrencySwitch up /></div>
            </div>
            <div className="px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] bg-ivory-deep text-xs text-ink/75 flex justify-between rounded-br-[2rem]">
              <Link to="/a-propos">Notre maison</Link><Link to="/faq">Aide & FAQ</Link><a href={buildWhatsAppLink('Bonjour Maefa Store, j\'ai une question.')} target="_blank" rel="noopener noreferrer" className="text-[#177a41] font-semibold">WhatsApp</a><a href={`tel:${SITE_CONFIG.phoneRaw}`}>Appeler</a>
            </div>
          </nav>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
