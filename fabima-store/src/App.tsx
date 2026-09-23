import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { AccountProvider } from './context/AccountContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { QuickView } from './components/QuickView';
import { Toasts } from './components/Toasts';
import { FloatingActions } from './components/FloatingActions';
import { AssistantHost } from './components/AssistantLauncher';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { InstallBanner } from './components/InstallApp';
import { BrandMark } from './components/Logo';

/*
 * Découpage du code : l'accueil, la boutique et les fiches produit arrivent tout de suite ;
 * les autres pages ne sont téléchargées que lorsqu'on y va (ou en avance, quand le téléphone est libre).
 * L'espace gérant et la page livreur ne sont jamais chargés par la clientèle.
 */
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => {
  const Comp = lazy(() => load().then(m => ({ default: m[name] })));
  return Object.assign(Comp, { preload: load });
};
const Cart = page(() => import('./pages/Cart'), 'Cart');
const Checkout = page(() => import('./pages/Checkout'), 'Checkout');
const OrderSuccess = page(() => import('./pages/OrderSuccess'), 'OrderSuccess');
const Tracking = page(() => import('./pages/Tracking'), 'Tracking');
const Wishlist = page(() => import('./pages/Wishlist'), 'Wishlist');
const MyOrders = page(() => import('./pages/MyOrders'), 'MyOrders');
const Account = page(() => import('./pages/Account'), 'Account');
const About = page(() => import('./pages/About'), 'About');
const FAQ = page(() => import('./pages/FAQ'), 'FAQ');
const NotFound = page(() => import('./pages/NotFound'), 'NotFound');
const Journal = page(() => import('./pages/Journal'), 'Journal');
const ArticlePage = page(() => import('./pages/Journal'), 'ArticlePage');
const SimpleProduct = page(() => import('./pages/SimpleProduct'), 'SimpleProduct');
const Showcase = page(() => import('./pages/Showcase'), 'Showcase');
const Market = page(() => import('./pages/Market'), 'default');
const MarketProduct = page(() => import('./pages/MarketProduct'), 'default');
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Driver = lazy(() => import('./pages/Driver'));

/** Pages les plus probables après l'arrivée : préchargées quand le navigateur n'a plus rien à faire. */
const usePreloadLikelyPages = () => {
  useEffect(() => {
    const preload = () => { Cart.preload(); Checkout.preload(); Market.preload(); };
    const t = window.setTimeout(() => ('requestIdleCallback' in window ? window.requestIdleCallback(preload) : preload()), 2500);
    return () => clearTimeout(t);
  }, []);
};

/** Remonte en haut de page à chaque changement de route (ou vers l'ancre demandée). */
const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
};

const PageFallback: React.FC = () => (
  <div className="min-h-[100svh] grid place-items-center" role="status" aria-busy="true" aria-label="Chargement"><BrandMark className="h-16 w-auto motion-safe:animate-pulse" /></div>
);

/** Fondu doux à chaque changement de page. */
const PageFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  return <div key={pathname} className="animate-page-in">{children}</div>;
};

/** Les pages « statut » (/p/…, /s) et la page du livreur ont leur propre en-tête, très simple : pas de menu, pied de page ni boutons flottants. */
const Chrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const simple = pathname.startsWith('/p/') || pathname === '/s' || pathname.startsWith('/livreur/');
  return simple ? null : <>{children}</>;
};

export default function App() {
  usePreloadLikelyPages();
  return (
    <BrowserRouter>
      <StoreProvider>
        <AccountProvider>
        <ScrollToTop />
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-ink focus:text-ivory focus:px-4 focus:py-2">Aller au contenu</a>
        <div className="min-h-screen flex flex-col">
          <Chrome><Navbar /></Chrome>
          <main id="contenu" className="flex-1">
            <Suspense fallback={<PageFallback />}>
              <PageFade>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/boutique" element={<Catalog />} />
                <Route path="/boutique/:category" element={<Catalog />} />
                <Route path="/produit/:slug" element={<ProductDetail />} />
                <Route path="/panier" element={<Cart />} />
                <Route path="/commande" element={<Checkout />} />
                <Route path="/confirmation/:id" element={<OrderSuccess />} />
                <Route path="/suivi" element={<Tracking />} />
                <Route path="/favoris" element={<Wishlist />} />
                <Route path="/mes-commandes" element={<MyOrders />} />
                <Route path="/compte" element={<Account />} />
                <Route path="/p/:code" element={<SimpleProduct />} />
                <Route path="/s" element={<Showcase />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/journal/:slug" element={<ArticlePage />} />
                <Route path="/a-propos" element={<About />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/livreur/:token" element={<Driver />} />
                <Route path="/marche" element={<Market />} />
                <Route path="/marche/:slug" element={<MarketProduct />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </PageFade>
            </Suspense>
          </main>
          <Chrome><Footer /></Chrome>
        </div>
        <CartDrawer />
        <QuickView />
        <Toasts />
        <Chrome><FloatingActions /><AssistantHost /><InstallBanner /></Chrome>
        </AccountProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}
