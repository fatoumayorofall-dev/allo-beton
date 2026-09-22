import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PROMO_CODES, SITE_CONFIG } from '../config/site';
import { formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductImage } from '../components/ProductImage';

export const PromoBox: React.FC = () => {
  const { promoCode, applyPromo, removePromo, notify } = useStore();
  const [code, setCode] = useState('');

  if (promoCode) {
    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm">
        <span className="flex items-center gap-2"><Tag className="w-4 h-4" /><strong>{promoCode}</strong> — {PROMO_CODES[promoCode].label}</span>
        <button onClick={removePromo} aria-label="Retirer le code"><X className="w-4 h-4" /></button>
      </div>
    );
  }
  return (
    <form onSubmit={e => { e.preventDefault(); if (applyPromo(code)) { notify('Code promo appliqué'); setCode(''); } else notify('Code promo invalide', 'error'); }}
      className="flex gap-2">
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code promo" aria-label="Code promo"
        className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-ink/15 bg-white outline-none focus:border-ink uppercase text-sm" />
      <button className="px-5 rounded-xl border border-ink text-sm font-semibold hover:bg-ink hover:text-ivory">Appliquer</button>
    </form>
  );
};

export const Cart: React.FC = () => {
  usePageTitle('Mon panier');
  const { cart, updateQuantity, removeFromCart, computeTotals, getProduct, clearCart } = useStore();
  const navigate = useNavigate();
  const t = computeTotals(0);

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-28 px-4">
        <ShoppingBag className="w-16 h-16 mx-auto text-ink/20" strokeWidth={1.2} />
        <h1 className="font-display text-4xl mt-6">Votre panier est vide</h1>
        <p className="text-ink/60 mt-3">Nos nouveautés n'attendent que vous.</p>
        <Link to="/boutique" className="inline-block mt-8 px-7 py-3.5 rounded-full bg-ink text-ivory font-semibold">Découvrir la boutique</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <div className="flex items-end justify-between mb-8">
        <h1 className="font-display text-4xl sm:text-5xl">Mon panier</h1>
        <button onClick={clearCart} className="text-sm text-ink/50 hover:text-[#a3142b] underline underline-offset-4">Vider le panier</button>
      </div>
      <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
        <ul className="bg-white rounded-3xl divide-y divide-ink/10 px-5 sm:px-8">
          {cart.map(item => {
            const product = getProduct(item.productId);
            const stock = product?.stock ?? 99;
            return (
              <li key={item.key} className="flex gap-4 sm:gap-6 py-6">
                <Link to={product ? `/produit/${product.slug}` : '#'}><ProductImage src={item.image} alt={item.name} className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl" /></Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-ink/50 mt-1">{[item.color, item.size && `Taille ${item.size}`].filter(Boolean).join(' · ')}</p>
                      <p className="text-sm mt-1">{formatPrice(item.price)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.key)} aria-label="Retirer" className="text-ink/40 hover:text-[#a3142b] h-fit"><Trash2 className="w-5 h-5" /></button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center border border-ink/15 rounded-full">
                      <button onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Diminuer" className="p-2.5"><Minus className="w-4 h-4" /></button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.key, Math.min(stock, item.quantity + 1))} disabled={item.quantity >= stock} aria-label="Augmenter" className="p-2.5 disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                    </div>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="bg-white rounded-3xl p-7 space-y-5 lg:sticky lg:top-28">
          <h2 className="font-display text-2xl">Récapitulatif</h2>
          <PromoBox />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Sous-total ({t.itemCount} article{t.itemCount > 1 ? 's' : ''})</span><span>{formatPrice(t.subtotal)}</span></div>
            {t.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Réduction</span><span>-{formatPrice(t.discount)}</span></div>}
            <div className="flex justify-between text-ink/60"><span>Livraison</span><span>{t.subtotal - t.discount >= SITE_CONFIG.freeShippingThreshold ? 'Offerte' : 'Calculée à l\'étape suivante'}</span></div>
          </div>
          <div className="flex justify-between text-xl border-t border-ink/10 pt-4"><span>Total</span><strong>{formatPrice(t.subtotal - t.discount)}</strong></div>
          <button onClick={() => navigate('/commande')} className="w-full py-4 rounded-full bg-ink text-ivory font-semibold hover:bg-ink-soft">Valider mon panier</button>
          <Link to="/boutique" className="block text-center text-sm underline underline-offset-4">Continuer mes achats</Link>
        </aside>
      </div>
    </div>
  );
};
