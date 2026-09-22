import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { SITE_CONFIG } from '../config/site';
import { ProductImage } from './ProductImage';

export const CartDrawer: React.FC = () => {
  const { cart, cartOpen, setCartOpen, updateQuantity, removeFromCart, computeTotals, getProduct } = useStore();
  const navigate = useNavigate();
  const { subtotal, itemCount } = computeTotals(0);
  const remaining = Math.max(0, SITE_CONFIG.freeShippingThreshold - subtotal);
  const progress = Math.min(100, (subtotal / SITE_CONFIG.freeShippingThreshold) * 100);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen]);

  if (!cartOpen) return null;
  const close = () => setCartOpen(false);

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={close} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-ivory shadow-2xl flex flex-col animate-slide-in" aria-label="Panier">
        <header className="flex items-center justify-between px-6 py-5 border-b border-ink/10">
          <h2 className="font-display text-2xl">Mon panier <span className="text-ink/40 text-base font-sans">({itemCount})</span></h2>
          <button onClick={close} aria-label="Fermer le panier" className="p-2 rounded-full hover:bg-ink/5"><X className="w-5 h-5" /></button>
        </header>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag className="w-14 h-14 text-ink/20" strokeWidth={1.2} />
            <p className="font-display text-xl">Votre panier est vide</p>
            <p className="text-sm text-ink/60">Découvrez nos nouveautés et laissez-vous tenter.</p>
            <button onClick={() => { close(); navigate('/boutique'); }} className="mt-2 px-6 py-3 rounded-full bg-ink text-ivory text-sm font-semibold">Découvrir la boutique</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 bg-ivory-deep/60">
              <p className="text-xs flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-gold-dark" />
                {remaining > 0
                  ? <>Plus que <strong>{formatPrice(remaining)}</strong> pour la livraison offerte</>
                  : <strong>Livraison offerte sur votre commande 🎉</strong>}
              </p>
              <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto divide-y divide-ink/10 px-6">
              {cart.map(item => {
                const stock = getProduct(item.productId)?.stock ?? 99;
                return (
                  <li key={item.key} className="flex gap-4 py-4">
                    <ProductImage src={item.image} alt={item.name} className="w-20 h-24 rounded-xl shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between gap-2">
                        <p className="font-medium leading-snug line-clamp-2">{item.name}</p>
                        <button onClick={() => removeFromCart(item.key)} aria-label="Retirer" className="text-ink/40 hover:text-[#a3142b] h-fit"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <p className="text-xs text-ink/50 mt-0.5">{[item.color, item.size && `Taille ${item.size}`].filter(Boolean).join(' · ')}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center border border-ink/15 rounded-full">
                          <button onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Diminuer" className="p-1.5"><Minus className="w-3.5 h-3.5" /></button>
                          <span className="w-7 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.key, Math.min(stock, item.quantity + 1))} aria-label="Augmenter" className="p-1.5 disabled:opacity-30" disabled={item.quantity >= stock}><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        <span className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <footer className="border-t border-ink/10 px-6 py-5 space-y-3 bg-white">
              <div className="flex justify-between text-lg"><span>Sous-total</span><strong>{formatPrice(subtotal)}</strong></div>
              <p className="text-xs text-ink/50">Livraison et codes promo calculés à l'étape suivante.</p>
              <button onClick={() => { close(); navigate('/commande'); }} className="w-full py-3.5 rounded-full bg-ink text-ivory font-semibold hover:bg-ink-soft transition-colors">
                Passer la commande
              </button>
              <Link to="/panier" onClick={close} className="block text-center text-sm underline underline-offset-4">Voir le panier détaillé</Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
