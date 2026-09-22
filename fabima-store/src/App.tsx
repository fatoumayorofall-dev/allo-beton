import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { Toasts } from './components/Toasts';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { Tracking } from './pages/Tracking';
import { Wishlist } from './pages/Wishlist';
import { About } from './pages/About';
import { FAQ } from './pages/FAQ';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';

/** Remonte en haut de page à chaque changement de route (hors ancres). */
const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [pathname, hash]);
  return null;
};

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
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
              <Route path="/a-propos" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <CartDrawer />
        <Toasts />
        <WhatsAppButton />
      </StoreProvider>
    </BrowserRouter>
  );
}
