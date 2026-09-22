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
import { Assistant } from './components/Assistant';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { Tracking } from './pages/Tracking';
import { Wishlist } from './pages/Wishlist';
import { MyOrders } from './pages/MyOrders';
import { About } from './pages/About';
import { FAQ } from './pages/FAQ';
import { NotFound } from './pages/NotFound';
import { ArticlePage, Journal } from './pages/Journal';
import { SimpleProduct } from './pages/SimpleProduct';
import { Showcase } from './pages/Showcase';
import { Account } from './pages/Account';
import { InstallBanner } from './components/InstallApp';

// L'espace gérant n'est chargé que lorsqu'on y accède : la clientèle ne télécharge pas son code.
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));

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
  <div className="min-h-[60vh] grid place-items-center"><span className="font-script text-5xl text-gold animate-pulse">Fabima</span></div>
);

/** Les pages « statut » (/p/…, /s) ont leur propre en-tête, très simple : pas de menu, pied de page ni boutons flottants. */
const Chrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const simple = pathname.startsWith('/p/') || pathname === '/s';
  return simple ? null : <>{children}</>;
};

export default function App() {
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          <Chrome><Footer /></Chrome>
        </div>
        <CartDrawer />
        <QuickView />
        <Toasts />
        <Chrome><FloatingActions /><Assistant /><InstallBanner /></Chrome>
        </AccountProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}
