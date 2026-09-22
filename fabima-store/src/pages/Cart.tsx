import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Minus, Plus, Tag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PROMO_CODES, SITE_CONFIG } from '../config/site';
import { formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductImage } from '../components/ProductImage';
import { GiftWrapOption } from '../components/CartDrawer';

export const PromoBox: React.FC = () => {
  const { promoCode, applyPromo, removePromo, notify, computeTotals } = useStore();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const shortfall = computeTotals(0).promoShortfall;

  if (promoCode) {
    return (
      <div className={`flex items-center justify-between gap-3 px-4 py-3 text-sm border ${shortfall ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
        <span className="flex items-start gap-2.5"><Tag className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} />
          <span><strong>{promoCode}</strong> — {PROMO_CODES[promoCode].label}
            {shortfall > 0 && <span className="block text-xs mt-0.5">Encore {formatPrice(shortfall)} d'achat pour l'activer.</span>}
          </span>
        </span>
        <button onClick={removePromo} aria-label="Retirer le code" className="shrink-0"><X className="w-4 h-4" /></button>
      </div>
    );
  }
  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-[11px] uppercase tracking-[0.2em] font-semibold link-luxe inline-flex items-center gap-2"><Tag className="w-3.5 h-3.5" strokeWidth={1.5} /> J'ai un code promo</button>;
  }
  return (
    <form onSubmit={e => { e.preventDefault(); const r = applyPromo(code); notify(r.message, r.ok ? 'success' : 'error'); if (r.ok) setCode(''); }} className="flex animate-fade-in">
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code promo" aria-label="Code promo" autoFocus className="field uppercase text-sm !border-r-0" />
      <button className="px-5 bg-ink text-ivory text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-gold-dark transition-colors">OK</button>
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
      <div className="max-w-xl mx-auto text-center py-40 px-5">
        <p className="font-display italic text-7xl text-gold-light">Fabima</p>
        <h1 className="font-display text-5xl mt-6">Votre panier est vide</h1>
        <p className="text-ink/60 mt-4">Nos nouveautés n'attendent que vous.</p>
        <Link to="/boutique?tri=nouveautes" className="btn-dark mt-10">Découvrir les nouveautés</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-12">
      <div className="flex items-end justify-between mb-10 pb-8 border-b border-ink/10">
        <div><p className="eyebrow">{t.itemCount} pièce{t.itemCount > 1 ? 's' : ''}</p><h1 className="font-display text-5xl sm:text-6xl mt-2">Votre panier</h1></div>
        <button onClick={clearCart} className="text-[11px] uppercase tracking-[0.2em] text-ink/45 hover:text-wine link-luxe">Tout retirer</button>
      </div>
      <div className="grid lg:grid-cols-[1fr_420px] gap-12 items-start">
        <ul className="divide-y divide-ink/10">
          {cart.map(item => {
            const product = getProduct(item.productId);
            const stock = product?.stock ?? item.quantity;
            return (
              <li key={item.key} className="flex gap-5 sm:gap-8 py-7 first:pt-0">
                <Link to={product ? `/produit/${product.slug}` : '#'} className="shrink-0"><ProductImage src={item.image} alt={item.name} label="" className="w-28 h-36 sm:w-36 sm:h-48" /></Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      {product && <p className="eyebrow !text-ink/40">{product.subcategory}</p>}
                      <Link to={product ? `/produit/${product.slug}` : '#'} className="font-display text-2xl leading-tight mt-1 block hover:text-gold-dark">{item.name}</Link>
                      <p className="text-sm text-ink/55 mt-2">{[item.color, item.size && `Taille ${item.size}`].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="font-semibold whitespace-nowrap">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center border border-ink/15 h-10">
                      <button onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Diminuer" className="w-10 h-full grid place-items-center hover:bg-ink/5"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= stock} aria-label="Augmenter" className="w-10 h-full grid place-items-center hover:bg-ink/5 disabled:opacity-25"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.key)} className="text-[10px] uppercase tracking-[0.2em] text-ink/45 hover:text-wine link-luxe">Retirer</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="bg-white border border-ink/[0.06] p-7 sm:p-9 space-y-6 lg:sticky lg:top-36">
          <h2 className="font-display text-3xl">Récapitulatif</h2>
          <GiftWrapOption />
          <PromoBox />
          <dl className="space-y-3 text-sm border-t border-ink/10 pt-6">
            <div className="flex justify-between"><dt className="text-ink/65">Sous-total</dt><dd>{formatPrice(t.subtotal)}</dd></div>
            {t.discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Réduction</dt><dd>-{formatPrice(t.discount)}</dd></div>}
            {t.giftFee > 0 && <div className="flex justify-between"><dt className="text-ink/65">Emballage cadeau</dt><dd>{formatPrice(t.giftFee)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink/65">Livraison</dt><dd className="text-ink/65">{t.subtotal - t.discount >= SITE_CONFIG.freeShippingThreshold ? 'Offerte' : 'Selon votre zone'}</dd></div>
          </dl>
          <div className="flex justify-between items-baseline border-t border-ink/10 pt-6"><span className="text-[11px] uppercase tracking-[0.22em] font-semibold">Total</span><span className="font-display text-4xl">{formatPrice(t.subtotal - t.discount + t.giftFee)}</span></div>
          <button onClick={() => navigate('/commande')} className="btn-dark w-full">Passer commande <ArrowRight className="w-4 h-4" /></button>
          <p className="text-[11px] text-ink/45 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" /> Wave · Orange Money · Free Money · Carte · Espèces</p>
          <Link to="/boutique" className="block text-center text-[11px] uppercase tracking-[0.2em] text-ink/60 hover:text-ink">Continuer mes achats</Link>
        </aside>
      </div>
    </div>
  );
};
