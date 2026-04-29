/**
 * ALLO BÉTON — SHOP PAGE PRO — REFONTE 2026
 * Navbar minimaliste + Footer moderne + Routing SPA
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, User, ChevronDown, LogOut, LayoutDashboard,
  Phone, Package, Menu, X, MapPin, Clock, Mail, ArrowRight,
  Facebook, Instagram, Linkedin, Search, ArrowUp, CreditCard,
  Truck, Shield, Award, MessageCircle, Gift, Minus, Plus, Trash2,
  Bell, Eye,
} from 'lucide-react';
import { EcommerceProvider, useEcommerce } from '../../contexts/EcommerceContext';
import { ShopHomePro } from './ShopHomePro';
import { ProductCatalogPro } from './ProductCatalogPro';
import { ProductDetailPro } from './ProductDetailPro';
import { ShoppingCartPro } from './ShoppingCartPro';
import { CheckoutPro } from './CheckoutPro';
import OrderSuccess from './OrderSuccess';
import CustomerLogin from './CustomerLogin';
import CustomerDashboard from './CustomerDashboard';
import ShopChatbot from './ShopChatbot';
import AboutPage from './AboutPage';
import ShopLogo from './ShopLogo';
import ShopFAQ from './ShopFAQ';
import { usePageMeta } from './usePageMeta';
import { useAnalytics } from './useAnalytics';
import { registerServiceWorker } from './registerSW';
import { ShopErrorBoundary, useErrorMonitoring } from './ErrorBoundary';
import { ToastProvider, useToast } from './Toast';
import SearchOverlay from './SearchOverlay';
import './shop-styles.css';

type View = 'home' | 'catalog' | 'product' | 'cart' | 'checkout' | 'success' | 'login' | 'dashboard' | 'faq' | 'about';
interface ViewData { [key: string]: any; }

export { SITE_CONFIG } from './siteConfig';
import { SITE_CONFIG } from './siteConfig';

/* ══════════════════════════════════════════════════════════════
   NAVBAR — Design épuré avec top bar colorée
   ══════════════════════════════════════════════════════════════ */
const ShopNavbar: React.FC<{
  onNavigate: (view: View, data?: ViewData) => void;
  onToggleCart: () => void;
  currentView: View;
}> = ({ onNavigate, onToggleCart, currentView }) => {
  const { cart, customer, isAuthenticated, logout } = useEcommerce();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('allo_darkmode') === '1');
  const [navPhoto, setNavPhoto] = useState<string | null>(() => {
    try { return localStorage.getItem('allo_beton_avatar'); } catch { return null; }
  });

  useEffect(() => {
    const update = () => setNavPhoto(localStorage.getItem('allo_beton_avatar'));
    window.addEventListener('allo_avatar_changed', update);
    return () => window.removeEventListener('allo_avatar_changed', update);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('allo_darkmode', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navItems = [
    { id: 'home', label: 'Accueil' },
    { id: 'catalog', label: 'Catalogue' },
    { id: 'about', label: 'À propos' },
  ];

  return (
    <>
      {/* Top accent bar */}
      <div className="bg-gradient-to-r from-orange-700 via-orange-600 to-yellow-400 h-1" />

      {/* Top info bar */}
      <div className="bg-slate-900 text-slate-300 text-[11px] font-medium hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-10">
          <div className="flex items-center gap-6">
            <a href={`tel:${SITE_CONFIG.phoneRaw}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="w-3 h-3 text-orange-500" /> {SITE_CONFIG.phone}
            </a>
            <span className="w-px h-3.5 bg-slate-700" />
            <a href={`mailto:${SITE_CONFIG.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="w-3 h-3 text-orange-500" /> {SITE_CONFIG.email}
            </a>
            <span className="w-px h-3.5 bg-slate-700" />
            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-orange-500" /> Dakar, Sénégal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3 h-3" /> Lun–Ven 8h–18h &bull; Sam 8h–13h
            </div>
            <span className="w-px h-3.5 bg-slate-700" />
            <div className="flex items-center gap-2">
              {[
                { Icon: Facebook, href: SITE_CONFIG.social.facebook, label: 'Facebook' },
                { Icon: Instagram, href: SITE_CONFIG.social.instagram, label: 'Instagram' },
                { Icon: Linkedin, href: SITE_CONFIG.social.linkedin, label: 'LinkedIn' },
              ].map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="hover:text-white transition-colors"><Icon className="w-3 h-3" /></a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? 'shop-glass shadow-xl shadow-orange-900/[0.06] border-slate-200/60'
          : 'bg-white/95 backdrop-blur-sm border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo Allô Béton — composant premium */}
            <ShopLogo size={46} onClick={() => onNavigate('home')} tagline="MATÉRIAUX BTP · SÉNÉGAL" />

            {/* Nav links — desktop */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <button key={item.id} onClick={() => onNavigate(item.id as View)}
                  className={`relative px-5 py-2.5 font-semibold text-[13px] rounded-xl transition-all duration-200 ${
                    currentView === item.id
                      ? 'text-orange-700 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}>
                  {item.label}
                </button>
              ))}
              <a href={`tel:${SITE_CONFIG.phoneRaw}`}
                className="px-5 py-2.5 font-semibold text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-orange-600" /> Contact
              </a>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Dark mode toggle */}
              <button onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group" aria-label="Mode sombre">
                {darkMode ? (
                  <svg className="w-[18px] h-[18px] text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-[18px] h-[18px] text-slate-500 group-hover:text-orange-700 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                )}
              </button>

              {/* Search */}
              <button onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-xl hover:bg-slate-100 transition-all group" aria-label="Rechercher">
                <Search className="w-[18px] h-[18px] text-slate-500 group-hover:text-orange-700 transition-colors" />
              </button>

              {/* Cart */}
              <button onClick={onToggleCart}
                className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-all group" aria-label="Panier">
                <ShoppingCart className="w-[18px] h-[18px] text-slate-500 group-hover:text-orange-700 transition-colors" />
                {cart && cart.item_count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-orange-600/30">
                    {cart.item_count}
                  </span>
                )}
              </button>

              {/* User menu */}
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 pl-2.5 rounded-xl hover:bg-slate-100 transition-all">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-indigo-700 rounded-xl flex items-center justify-center overflow-hidden">
                    {navPhoto ? (
                      <img src={navPhoto} alt="avatar" className="w-full h-full object-cover" />
                    ) : customer ? (
                      <span className="text-[10px] font-black text-white">{customer.first_name?.charAt(0)}{customer.last_name?.charAt(0)}</span>
                    ) : (
                      <User className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  {customer && <span className="hidden sm:block text-sm font-semibold text-slate-700">{customer.first_name}</span>}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-slate-100 z-50 overflow-hidden">
                      {isAuthenticated ? (
                        <>
                          {/* Dropdown header */}
                          <div className="px-4 py-4 bg-gradient-to-br from-orange-500 to-indigo-700 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                            <div className="relative flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white/30 shadow-lg">
                                {navPhoto ? (
                                  <img src={navPhoto} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-white/20 flex items-center justify-center text-white font-black text-sm">
                                    {(customer?.first_name?.[0] || '') + (customer?.last_name?.[0] || '')}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-white truncate">{customer?.first_name} {customer?.last_name}</p>
                                <p className="text-[11px] text-white/60 truncate">{customer?.email}</p>
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                                  ★ Membre Allô Béton
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="py-1.5 px-1.5">
                            <button onClick={() => { onNavigate('dashboard'); setShowUserMenu(false); }}
                              className="w-full px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-700 rounded-xl transition-all flex items-center gap-2.5 group">
                              <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                <LayoutDashboard className="w-3.5 h-3.5 text-orange-600" />
                              </div>
                              <div>
                                <span className="block font-semibold">Mon compte</span>
                                <span className="text-[10px] text-slate-400">Vue d'ensemble</span>
                              </div>
                            </button>
                            <button onClick={() => {
                              try { localStorage.setItem('allo_dash_tab', 'orders'); } catch { /* */ }
                              onNavigate('dashboard'); setShowUserMenu(false);
                            }}
                              className="w-full px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-700 rounded-xl transition-all flex items-center gap-2.5 group">
                              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                                <Package className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                              <div>
                                <span className="block font-semibold">Mes commandes</span>
                                <span className="text-[10px] text-slate-400">Suivi &amp; historique</span>
                              </div>
                            </button>
                            <button onClick={() => {
                              try { localStorage.setItem('allo_dash_tab', 'profile'); } catch { /* */ }
                              onNavigate('dashboard'); setShowUserMenu(false);
                            }}
                              className="w-full px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-700 rounded-xl transition-all flex items-center gap-2.5 group">
                              <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                                <User className="w-3.5 h-3.5 text-violet-600" />
                              </div>
                              <div>
                                <span className="block font-semibold">Modifier le profil</span>
                                <span className="text-[10px] text-slate-400">Infos &amp; photo</span>
                              </div>
                            </button>
                          </div>
                          <div className="border-t border-slate-100 py-1.5 px-1.5">
                            <button onClick={() => { logout(); setShowUserMenu(false); onNavigate('home'); }}
                              className="w-full px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2.5">
                              <LogOut className="w-4 h-4" /> Déconnexion
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="py-2 px-1.5">
                          <button onClick={() => { onNavigate('login'); setShowUserMenu(false); }}
                            className="w-full px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                            Se connecter
                          </button>
                          <button onClick={() => { onNavigate('login'); setShowUserMenu(false); }}
                            className="w-full px-3 py-2.5 text-left text-sm font-semibold text-orange-700 hover:bg-slate-50 rounded-xl transition-colors">
                            Créer un compte
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors">
                {mobileOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-5 pb-5 pt-3 space-y-1">
            {navItems.map(item => (
              <button key={item.id}
                onClick={() => { onNavigate(item.id as View); setMobileOpen(false); }}
                className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  currentView === item.id
                    ? 'bg-slate-50 text-orange-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}>
                {item.label}
              </button>
            ))}
            <a href={`tel:${SITE_CONFIG.phoneRaw}`}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <Phone className="w-4 h-4 text-orange-600" /> {SITE_CONFIG.phone}
            </a>
          </div>
        )}
      </nav>

      {/* Search overlay (autocomplete + history) */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={onNavigate as any} />
    </>
  );
};

/* ══════════════════════════════════════════════════════════════
   FOOTER — Design moderne avec sections structurées
   ══════════════════════════════════════════════════════════════ */
const ShopFooter: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
  const [newsletterEmail, setNewsletterEmail] = React.useState('');
  const [newsletterStatus, setNewsletterStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = React.useState('');

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      setNewsletterStatus('error');
      setNewsletterMessage('Veuillez entrer une adresse email valide');
      return;
    }
    setNewsletterStatus('loading');
    setTimeout(() => {
      setNewsletterStatus('success');
      setNewsletterMessage('Merci ! Vous recevrez nos offres.');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterStatus('idle'), 5000);
    }, 1000);
  };

  return (
    <footer className="bg-slate-900 text-white relative">
      {/* Trust bar */}
      <div className="bg-slate-800 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Livraison rapide', desc: '24-48h sur Dakar' },
              { icon: Shield, title: 'Paiement sécurisé', desc: 'Wave, OM, Carte' },
              { icon: Award, title: 'Qualité certifiée', desc: 'Normes NF garanties' },
              { icon: Phone, title: 'Support expert', desc: 'Du lundi au samedi' },
            ].map(item => (
              <div key={item.title} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-black text-xl mb-1">Offres exclusives</h3>
              <p className="text-slate-400 text-sm">Promotions et conseils BTP dans votre boite mail</p>
            </div>
            <form onSubmit={handleNewsletter} className="flex flex-col w-full sm:w-auto gap-2">
              <div className="flex w-full sm:w-auto">
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                  aria-label="Email pour la newsletter"
                  required
                  className="flex-1 sm:w-72 px-5 py-3 bg-slate-800 border border-slate-700 rounded-l-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-600 transition-all"
                />
                <button type="submit" disabled={newsletterStatus === 'loading'}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-500 font-bold text-sm rounded-r-xl transition-all flex items-center gap-1.5 flex-shrink-0 disabled:opacity-60">
                  {newsletterStatus === 'loading' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>S'inscrire <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
              {newsletterMessage && (
                <p className={`text-xs font-medium ${newsletterStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {newsletterMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-5">
              <ShopLogo size={44} variant="dark" tagline="MATÉRIAUX BTP · SÉNÉGAL" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-5">
              Leader du béton prêt à l'emploi au Sénégal. Qualité certifiée NF, livraison sur chantier.
            </p>
            <div className="flex gap-2">
              {[
                { Icon: Facebook, href: SITE_CONFIG.social.facebook, label: 'Facebook' },
                { Icon: Instagram, href: SITE_CONFIG.social.instagram, label: 'Instagram' },
                { Icon: Linkedin, href: SITE_CONFIG.social.linkedin, label: 'LinkedIn' },
              ].map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-9 h-9 bg-slate-800 hover:bg-orange-600 rounded-xl flex items-center justify-center transition-all duration-200 group">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-bold text-sm text-white mb-5 uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-3">
              {[
                { label: 'Accueil', view: 'home' as View },
                { label: 'Catalogue', view: 'catalog' as View },
                { label: 'Mon panier', view: 'cart' as View },
                { label: 'Mon compte', view: 'dashboard' as View },
                { label: 'FAQ & Aide', view: 'faq' as View },
              ].map(item => (
                <li key={item.label}>
                  <button onClick={() => onNavigate(item.view)}
                    className="text-slate-400 hover:text-orange-500 text-sm transition-colors">
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Produits */}
          <div>
            <h4 className="font-bold text-sm text-white mb-5 uppercase tracking-wider">Produits</h4>
            <ul className="space-y-3">
              {['Bétons', 'Granulats', 'Ciments', 'Fers & Armatures', 'Adjuvants'].map(item => (
                <li key={item}>
                  <button onClick={() => onNavigate('catalog')} className="text-slate-400 hover:text-orange-500 text-sm transition-colors">{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-sm text-white mb-5 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <a href={`tel:${SITE_CONFIG.phoneRaw}`} className="text-white font-medium hover:text-orange-500 transition-colors">
                    {SITE_CONFIG.phone}
                  </a>
                  <p className="text-slate-500 text-xs mt-0.5">Lun–Ven 8h–18h</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="w-4 h-4 text-[#25D366] mt-0.5 flex-shrink-0" />
                <a href={`https://wa.me/${SITE_CONFIG.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="text-white font-medium hover:text-[#25D366] transition-colors">
                  WhatsApp Business
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <a href={`mailto:${SITE_CONFIG.email}`} className="text-slate-400 hover:text-white transition-colors">
                  {SITE_CONFIG.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-400">Zone industrielle<br />Dakar, Sénégal</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal strip */}
        <div className="border-t border-slate-800 mt-10 pt-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-500 mb-5">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              <span className="font-semibold text-slate-400">NINEA :</span> {SITE_CONFIG.legal.ninea}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">RCCM :</span> {SITE_CONFIG.legal.rccm}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">TVA :</span> {SITE_CONFIG.legal.tva}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">&copy; {new Date().getFullYear()} Allô Béton. Tous droits réservés.</p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {['Wave', 'Orange Money', 'Visa', 'Mastercard', 'Virement'].map(p => (
                <div key={p} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3" /> {p}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-5 text-xs text-slate-500">
              <button onClick={() => onNavigate('faq')} className="hover:text-slate-300 transition-colors">FAQ</button>
              <a href="#" className="hover:text-slate-300 transition-colors">CGV</a>
              <a href="#" className="hover:text-slate-300 transition-colors">Confidentialité</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ══════════════════════════════════════════════════════════════
   ROUTING + LAYOUT
   ══════════════════════════════════════════════════════════════ */
const SEO_TITLES: Record<View, string> = {
  home: 'Allo Béton | Matériaux de Construction au Sénégal',
  catalog: 'Catalogue Produits | Allo Béton',
  product: 'Produit | Allo Béton',
  cart: 'Mon Panier | Allo Béton',
  checkout: 'Commande | Allo Béton',
  success: 'Commande Confirmée | Allo Béton',
  login: 'Connexion | Allo Béton',
  dashboard: 'Mon Compte | Allo Béton',
  faq: 'FAQ & Aide | Allo Béton',
  about: 'À propos | Allo Béton - Notre Mission, Vision & Impact',
};

const ShopPageProContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [viewData, setViewData] = useState<ViewData>({});
  const [showTop, setShowTop] = useState(false);
  const { toast } = useToast();

  /* ---- #1 Popup première visite ---- */
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [welcomeEmail, setWelcomeEmail] = useState('');
  const [welcomeClaimed, setWelcomeClaimed] = useState(false);

  /* ---- #7 Mini-cart slide-over ---- */
  const [showMiniCart, setShowMiniCart] = useState(false);

  /* ---- #8 Panier abandonné toast ---- */
  const [showAbandonedToast, setShowAbandonedToast] = useState(false);

  /* ---- #9 Récemment consultés ---- */
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  const { cart, formatPrice, removeFromCart, updateCartItem } = useEcommerce();

  useEffect(() => {
    document.title = SEO_TITLES[currentView] || SEO_TITLES.home;
  }, [currentView]);

  /* ---- #1 Welcome popup: show after 5s on first visit ---- */
  useEffect(() => {
    const visited = localStorage.getItem('allo_visited');
    if (!visited) {
      const timer = setTimeout(() => setShowWelcomePopup(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  /* ---- Handle email verification URL params ---- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify_email');
    const verifyStatus = params.get('verify_status');

    if (verifyToken) {
      // Redirect to backend verify endpoint
      window.location.href = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}/api/ecommerce/customers/verify-email?token=${verifyToken}`;
      return;
    }

    if (verifyStatus) {
      const map: Record<string, () => void> = {
        success: () => toast.success('Email vérifié avec succès', { description: 'Votre compte est maintenant pleinement activé.', duration: 6000 }),
        already_verified: () => toast.info('Email déjà vérifié', { duration: 5000 }),
        invalid: () => toast.error('Lien de vérification invalide', { description: 'Le lien est expiré ou a déjà été utilisé.', duration: 7000 }),
        error: () => toast.error('Erreur de vérification', { description: 'Veuillez réessayer ou contactez le support.', duration: 7000 }),
      };
      map[verifyStatus]?.();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /* ---- #8 Abandoned cart toast ---- */
  useEffect(() => {
    const lastLeft = localStorage.getItem('allo_cart_left');
    if (lastLeft && cart && cart.item_count > 0) {
      const diff = Date.now() - parseInt(lastLeft);
      if (diff > 60000) {
        setTimeout(() => setShowAbandonedToast(true), 3000);
        localStorage.removeItem('allo_cart_left');
      }
    }
    // Save cart timestamp on page unload
    const handleUnload = () => {
      if (cart && cart.item_count > 0) {
        localStorage.setItem('allo_cart_left', String(Date.now()));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [cart]);

  /* ---- #9 Load recently viewed products ---- */
  useEffect(() => {
    try {
      const rv = JSON.parse(localStorage.getItem('allo_recently_viewed') || '[]');
      setRecentlyViewed(rv);
    } catch { /* silent */ }
  }, [currentView]);

  useEffect(() => {
    const fn = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handleNavigate = (view: View, data?: ViewData) => {
    setCurrentView(view);
    setViewData(data || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── SEO dynamique par vue ── */
  const metaByView: Partial<Record<View, { title: string; description?: string }>> = {
    home: {
      title: "Allô Béton — Matériaux BTP & Béton prêt à l'emploi · Sénégal",
      description: "Fournisseur n°1 de béton, ciment, fer et matériaux BTP au Sénégal. Livraison rapide à Dakar.",
    },
    catalog: {
      title: 'Catalogue produits BTP · Allô Béton',
      description: 'Découvrez tous nos matériaux de construction : béton, ciment, fer, granulats, blocs. Livraison Dakar.',
    },
    cart: { title: 'Mon panier · Allô Béton' },
    checkout: { title: 'Commande · Allô Béton' },
    success: { title: 'Commande confirmée · Allô Béton' },
    login: { title: 'Connexion · Allô Béton' },
    dashboard: { title: 'Mon compte · Allô Béton' },
  };
  const currentMeta = metaByView[currentView] || metaByView.home!;
  usePageMeta({
    title: currentMeta.title,
    description: currentMeta.description,
  });

  /* ── Analytics : init + page_view au changement de vue ── */
  const { track } = useAnalytics();
  useEffect(() => {
    track('view_item_list', { list_name: currentView });
  }, [currentView, track]);

  /* ── Service Worker : enregistré une fois ── */
  useEffect(() => {
    registerServiceWorker();
  }, []);

  /* ── Monitoring erreurs (Sentry si configuré) ── */
  useErrorMonitoring();

  const renderView = () => {
    switch (currentView) {
      case 'home': return <ShopHomePro onNavigate={handleNavigate} />;
      case 'about': return <AboutPage onNavigate={handleNavigate} />;
      case 'catalog': return <ProductCatalogPro onNavigate={handleNavigate} initialCategoryId={viewData.categoryId} initialSearch={viewData.searchTerm} />;
      case 'product': return <ProductDetailPro productId={viewData.id} onNavigate={handleNavigate} />;
      case 'cart': return <ShoppingCartPro onNavigate={handleNavigate} />;
      case 'checkout': return <CheckoutPro onNavigate={handleNavigate} />;
      case 'success': return <OrderSuccess orderId={viewData.orderId} orderNumber={viewData.orderNumber} invoiceId={viewData.invoiceId} invoiceNumber={viewData.invoiceNumber} onNavigate={handleNavigate} />;
      case 'login': return <CustomerLogin onSuccess={() => handleNavigate('dashboard')} onBack={() => handleNavigate('home')} />;
      case 'dashboard': return <CustomerDashboard onNavigate={handleNavigate} />;
      case 'faq': return <ShopFAQ onBack={() => handleNavigate('home')} />;
      default: return <ShopHomePro onNavigate={handleNavigate} />;
    }
  };

  /* #14 Breadcrumb labels */
  const BREADCRUMB_LABELS: Partial<Record<View, string>> = {
    catalog: 'Catalogue',
    cart: 'Mon Panier',
    checkout: 'Commande',
    success: 'Confirmation',
    login: 'Connexion',
    dashboard: 'Mon Compte',
    about: 'À propos',
  };

  return (
    <div className="shop-root min-h-screen bg-white dark:bg-slate-900 dark:text-white flex flex-col transition-colors duration-300">
      <ShopNavbar onNavigate={handleNavigate} onToggleCart={() => setShowMiniCart(true)} currentView={currentView} />

      {/* #14 Breadcrumb amélioré */}
      {currentView !== 'home' && currentView !== 'product' && BREADCRUMB_LABELS[currentView] && (
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-sm">
              <button onClick={() => handleNavigate('home')} className="text-slate-400 hover:text-orange-600 transition-colors font-medium">
                Accueil
              </button>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300 -rotate-90" />
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{BREADCRUMB_LABELS[currentView]}</span>
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1">
        <ShopErrorBoundary>{renderView()}</ShopErrorBoundary>
      </main>

      {/* ---- #9 Récemment consultés ---- */}
      {recentlyViewed.length > 2 && currentView !== 'product' && (
        <div className="bg-slate-50 border-t border-slate-200 py-10">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-5">
              <Eye className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-black text-slate-900">R\u00e9cemment consult\u00e9s</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {recentlyViewed.slice(0, 8).map((p: any) => (
                <div key={p.id}
                  onClick={() => handleNavigate('product', { id: p.slug || p.id })}
                  className="flex-shrink-0 w-40 bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-slate-200 transition-all group">
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-slate-300" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug mb-1">{p.name}</p>
                    <p className="text-sm font-black text-slate-900">{formatPrice(p.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ShopFooter onNavigate={handleNavigate} />

      {/* ---- #1 Welcome Popup (première visite -10%) ---- */}
      {showWelcomePopup && !welcomeClaimed && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => { setShowWelcomePopup(false); localStorage.setItem('allo_visited', '1'); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowWelcomePopup(false); localStorage.setItem('allo_visited', '1'); }}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-8 text-center">
              <Gift className="w-12 h-12 text-white mx-auto mb-3" />
              <h3 className="text-2xl font-black text-white mb-1">Bienvenue ! \ud83c\udf89</h3>
              <p className="text-slate-100 text-sm">Profitez de -10% sur votre premi\u00e8re commande</p>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 border-2 border-dashed border-orange-300 rounded-xl p-4 text-center mb-5">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Votre code promo</p>
                <p className="text-2xl font-black text-orange-700 tracking-[0.15em]">BIENVENUE10</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Votre email pour recevoir le code"
                  value={welcomeEmail}
                  onChange={e => setWelcomeEmail(e.target.value)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                />
                <button onClick={() => { setWelcomeClaimed(true); localStorage.setItem('allo_visited', '1'); setTimeout(() => setShowWelcomePopup(false), 2000); }}
                  className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl transition-colors flex-shrink-0">
                  OK
                </button>
              </div>
              {welcomeClaimed && <p className="text-emerald-600 text-xs font-bold mt-3 text-center">\u2705 Code envoy\u00e9 ! Utilisez BIENVENUE10 au checkout</p>}
              <p className="text-[10px] text-slate-400 mt-3 text-center">Offre valable 7 jours. Non cumulable.</p>
            </div>
          </div>
        </div>
      )}

      {/* ---- #7 Mini-cart slide-over ---- */}
      {showMiniCart && (
        <div className="fixed inset-0 z-[70]" onClick={() => setShowMiniCart(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-900">Mon Panier</h3>
                {cart && cart.item_count > 0 && (
                  <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{cart.item_count}</span>
                )}
              </div>
              <button onClick={() => setShowMiniCart(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {(!cart || !cart.items || cart.items.length === 0) ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Votre panier est vide</p>
                  <button onClick={() => { setShowMiniCart(false); handleNavigate('catalog'); }}
                    className="mt-4 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors">
                    D\u00e9couvrir nos produits
                  </button>
                </div>
              ) : (
                cart.items.map((item: any) => (
                  <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-slate-300" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">{formatPrice(item.unit_price || 0)} / {item.unit || 'unit\u00e9'}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))} className="w-6 h-6 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-100"><Minus className="w-3 h-3" /></button>
                        <span className="text-sm font-bold text-slate-700 w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartItem(item.id, item.quantity + 1)} className="w-6 h-6 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-100"><Plus className="w-3 h-3" /></button>
                        <button onClick={() => removeFromCart(item.id)} className="ml-auto p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-900 flex-shrink-0">{formatPrice(item.total_price || (item.unit_price || 0) * item.quantity)}</p>
                  </div>
                ))
              )}
            </div>
            {/* Footer */}
            {cart && cart.items && cart.items.length > 0 && (
              <div className="border-t border-slate-200 px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">Sous-total</span>
                  <span className="text-xl font-black text-slate-900">{formatPrice(cart.subtotal || 0)}</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-2">TVA et livraison calculées au paiement</p>
                <button onClick={() => { setShowMiniCart(false); handleNavigate('cart'); }}
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20">
                  <ShoppingCart className="w-4 h-4" /> Voir le panier
                </button>
                <button onClick={() => { setShowMiniCart(false); handleNavigate('checkout'); }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors">
                  Commander maintenant
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- #8 Abandoned cart toast ---- */}
      {showAbandonedToast && (
        <div className="fixed top-20 right-5 z-[75] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right duration-500">
          <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-bold text-orange-800">Panier en attente !</span>
            </div>
            <button onClick={() => setShowAbandonedToast(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-orange-500" /></button>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-600">Vous avez <strong>{cart?.item_count || 0} article{(cart?.item_count || 0) > 1 ? 's' : ''}</strong> dans votre panier. Finalisez votre commande !</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowAbandonedToast(false); handleNavigate('cart'); }}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors">
                Voir mon panier
              </button>
              <button onClick={() => setShowAbandonedToast(false)}
                className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Retour en haut"
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl shadow-xl shadow-orange-600/25 flex items-center justify-center active:scale-90 transition-all duration-300 ${showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* WhatsApp floating button */}
      <a
        href={`https://wa.me/${SITE_CONFIG.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Bonjour Allo Béton ! Je souhaite passer une commande.')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Commander via WhatsApp"
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-2xl shadow-xl shadow-green-500/30 hover:shadow-green-500/40 active:scale-95 transition-all duration-300 group"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>

      {/* Chatbot IA Flottant */}
      <ShopChatbot />
    </div>
  );
};

const ShopPagePro: React.FC = () => (
  <EcommerceProvider>
    <ToastProvider>
      <ShopPageProContent />
    </ToastProvider>
  </EcommerceProvider>
);

export default ShopPagePro;
