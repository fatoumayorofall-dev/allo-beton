import React, { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Link, Route, Routes } from 'react-router-dom';
import { Clapperboard, Home, Loader2, MessageCircle, ShoppingBag, Store, UserRound } from 'lucide-react';
import { MpCartProvider, useMpCart } from './cart';
import { MP, mpPath } from './config';
import { useOnline } from './offline';
import { fetchChats } from './api';
import { CallProvider } from './call';
import { useAccount } from '../context/AccountContext';

const MpHome = lazy(() => import('./MpHome'));
const MpFeed = lazy(() => import('./MpFeed'));
const MpDriver = lazy(() => import('./MpDriver'));
const MpListingPage = lazy(() => import('./MpListingPage'));
const MpShop = lazy(() => import('./MpShop'));
const MpCart = lazy(() => import('./MpCart'));
const MpOrders = lazy(() => import('./MpOrders'));
const MpSell = lazy(() => import('./MpSell'));
const MpAccount = lazy(() => import('./MpAccount'));
const MpChats = lazy(() => import('./MpChats'));

const Wait = () => (
  <div className="py-24 grid place-items-center">
    <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
  </div>
);

/** Logo provisoire : le nom écrit, en attendant le nom et le logo définitifs. */
export const MpLogo: React.FC = () => (
  <Link to={mpPath()} className="flex items-center gap-2" aria-label={`${MP.name}, accueil`}>
    <span className="w-9 h-9 rounded-xl bg-ink text-ivory grid place-items-center font-display text-xl">
      {MP.name[0]}
    </span>
    <span className="font-display text-2xl leading-none text-ink">{MP.name}</span>
  </Link>
);

/** Messages non lus (vérifiés toutes les 30 secondes quand on est connecté) */
function useUnread() {
  const { status } = useAccount();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (status !== 'user') return setUnread(0);
    const check = () => fetchChats().then(r => r.ok && setUnread(r.data.unread));
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [status]);
  return unread;
}

const Header: React.FC = () => {
  const { count } = useMpCart();
  const unread = useUnread();
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-ink/[0.07]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <MpLogo />
        <nav className="flex items-center gap-1" aria-label="Menu">
          <NavLink
            to={mpPath('/pour-vous')}
            className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold hover:bg-ivory"
          >
            <Clapperboard className="w-4 h-4" /> Pour vous
          </NavLink>
          <NavLink
            to={mpPath('/vendre')}
            className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold hover:border-ink"
          >
            <Store className="w-4 h-4" /> Vendre
          </NavLink>
          <NavLink
            to={mpPath('/compte')}
            aria-label="Mon compte"
            className="hidden sm:grid w-10 h-10 rounded-full place-items-center hover:bg-ivory"
          >
            <UserRound className="w-5 h-5" />
          </NavLink>
          <NavLink
            to={mpPath('/discussions')}
            aria-label={`Messages${unread ? `, ${unread} non lu${unread > 1 ? 's' : ''}` : ''}`}
            className="relative w-10 h-10 rounded-full grid place-items-center hover:bg-ivory"
            data-testid="mp-chats-link"
          >
            <MessageCircle className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-wine text-white text-[11px] font-bold grid place-items-center">
                {unread}
              </span>
            )}
          </NavLink>
          <NavLink
            to={mpPath('/panier')}
            aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}
            className="relative w-10 h-10 rounded-full grid place-items-center hover:bg-ivory"
            data-testid="mp-cart-link"
          >
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-wine text-white text-[11px] font-bold grid place-items-center">
                {count}
              </span>
            )}
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

/** Barre du bas sur téléphone : les 5 gestes essentiels (les achats sont dans « Compte »). */
const TabBar: React.FC = () => {
  const { count } = useMpCart();
  const tabs = [
    { to: mpPath(), label: 'Accueil', Icon: Home, end: true },
    { to: mpPath('/pour-vous'), label: 'Pour vous', Icon: Clapperboard },
    { to: mpPath('/vendre'), label: 'Vendre', Icon: Store },
    { to: mpPath('/panier'), label: count ? `Panier (${count})` : 'Panier', Icon: ShoppingBag },
    { to: mpPath('/compte'), label: 'Compte', Icon: UserRound },
  ];
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink/10 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation"
    >
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? 'text-ink' : 'text-ink/55'}`
          }
        >
          <Icon className="w-5 h-5" strokeWidth={1.6} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
};

/** Coupure de réseau ou de courant chez l'opérateur : on le dit clairement, sans messages d'erreur partout. */
const OfflineBanner: React.FC = () => {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="bg-amber-100 text-amber-950 text-sm text-center px-4 py-2" role="status" data-testid="mp-offline">
      Pas de réseau. Ce qui est enregistré sur votre téléphone reste visible ; les arrêts des livreurs partiront dès que
      le réseau revient.
    </div>
  );
};

/**
 * Place de marché : application à part entière sous /m (son propre en-tête, son panier),
 * qui partage avec la boutique les comptes (numéro, Face ID), la carte et le serveur.
 */
export default function MarketplaceApp() {
  return (
    <MpCartProvider>
      <CallProvider>
        <div className="min-h-screen bg-[#faf7f5] flex flex-col" data-testid="marketplace">
          <Header />
          <OfflineBanner />
          <main className="flex-1 pb-24 sm:pb-10">
            <Suspense fallback={<Wait />}>
              <Routes>
                <Route index element={<MpHome />} />
                <Route path="pour-vous" element={<MpFeed />} />
                <Route path="annonce/:id" element={<MpListingPage />} />
                <Route path="boutique/:slug" element={<MpShop />} />
                <Route path="panier" element={<MpCart />} />
                <Route path="commandes" element={<MpOrders />} />
                <Route path="vendre" element={<MpSell />} />
                <Route path="compte" element={<MpAccount />} />
                <Route path="livreur" element={<MpDriver />} />
                <Route path="discussions" element={<MpChats />} />
                <Route path="discussions/:id" element={<MpChats />} />
                <Route path="*" element={<MpHome />} />
              </Routes>
            </Suspense>
          </main>
          <footer className="hidden sm:block border-t border-ink/[0.07] py-6 text-center text-xs text-ink/60">
            {MP.name} · {MP.tagline} · Paiement à la livraison
          </footer>
          <TabBar />
        </div>
      </CallProvider>
    </MpCartProvider>
  );
}
