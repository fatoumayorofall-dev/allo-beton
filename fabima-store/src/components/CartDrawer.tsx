import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, Minus, Plus, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { SITE_CONFIG } from '../config/site';
import { useEscape, useLockBody } from '../utils/hooks';
import { ProductImage } from './ProductImage';

export const GiftWrapOption: React.FC = () => {
  const { giftWrap, setGiftWrap } = useStore();
  return (
    <div className="border border-ink/10 bg-white">
      <label className="flex items-center gap-3 p-4 cursor-pointer">
        <input type="checkbox" checked={giftWrap.enabled} onChange={e => setGiftWrap({ ...giftWrap, enabled: e.target.checked })} className="accent-ink w-4 h-4" />
        <Gift className="w-4 h-4 text-gold-dark" strokeWidth={1.5} />
        <span className="flex-1 text-sm">Emballage cadeau signature</span>
        <span className="text-xs text-ink/55">+{formatPrice(SITE_CONFIG.giftWrapFee)}</span>
      </label>
      {giftWrap.enabled && (
        <div className="px-4 pb-4 animate-fade-in">
          <textarea value={giftWrap.message} maxLength={180} rows={2} onChange={e => setGiftWrap({ ...giftWrap, message: e.target.value })}
            placeholder="Votre mot doux (facultatif), écrit à la main sur une carte" aria-label="Message cadeau" className="field text-sm resize-none" />
          <p className="text-[10px] text-ink/40 text-right mt-1">{giftWrap.message.length}/180</p>
        </div>
      )}
    </div>
  );
};

export const CartDrawer: React.FC = () => {
  const { cart, cartOpen, setCartOpen, updateQuantity, removeFromCart, computeTotals, products, addToCart } = useStore();
  const navigate = useNavigate();
  const close = () => setCartOpen(false);
  useLockBody(cartOpen);
  useEscape(cartOpen, close);

  const t = computeTotals(0);
  const remaining = Math.max(0, SITE_CONFIG.freeShippingThreshold - (t.subtotal - t.discount));
  const progress = Math.min(100, ((t.subtotal - t.discount) / SITE_CONFIG.freeShippingThreshold) * 100);

  // Suggestions « complétez votre look » : pièces sans taille d'autres univers, pas déjà au panier
  const suggestions = useMemo(() => {
    const inCart = new Set(cart.map(i => i.productId));
    const cats = new Set(cart.map(i => products.find(p => p.id === i.productId)?.category));
    return products.filter(p => !inCart.has(p.id) && !cats.has(p.category) && p.sizes.length === 0 && p.stock > 0).slice(0, 3);
  }, [cart, products]);

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-fade-in" onClick={close} />
      <aside role="dialog" aria-modal="true" aria-label="Panier" className="absolute right-0 top-0 h-full w-full max-w-[460px] bg-ivory flex flex-col animate-slide-in shadow-luxe">
        <header className="flex items-center justify-between px-6 sm:px-8 h-20 border-b border-ink/10 shrink-0">
          <h2 className="font-display text-3xl">Votre panier <sup className="text-sm font-sans text-ink/40">{t.itemCount}</sup></h2>
          <button onClick={close} aria-label="Fermer le panier" className="w-10 h-10 grid place-items-center hover:rotate-90 transition-transform duration-500"><X className="w-5 h-5" strokeWidth={1.5} /></button>
        </header>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-10 text-center">
            <p className="font-display italic text-6xl text-gold-light">Fabima</p>
            <p className="font-display text-2xl">Votre panier attend sa première pièce</p>
            <p className="text-sm text-ink/60">Laissez-vous inspirer par nos nouveautés de la saison.</p>
            <button onClick={() => { close(); navigate('/boutique?tri=nouveautes'); }} className="btn-dark mt-2">Découvrir les nouveautés</button>
          </div>
        ) : (
          <>
            <div className="px-6 sm:px-8 py-4 border-b border-ink/10 shrink-0">
              <p className="text-xs mb-2.5 text-ink/70">
                {remaining > 0
                  ? <>Plus que <strong className="text-ink">{formatPrice(remaining)}</strong> pour profiter de la livraison offerte</>
                  : <strong className="text-ink">La livraison vous est offerte</strong>}
              </p>
              <div className="h-[3px] bg-ink/10 overflow-hidden"><div className="h-full bg-gold transition-all duration-700 ease-luxe" style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ul className="px-6 sm:px-8 divide-y divide-ink/10">
                {cart.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  const stock = product?.stock ?? item.quantity;
                  return (
                    <li key={item.key} className="flex gap-4 py-5">
                      <Link to={product ? `/produit/${product.slug}` : '#'} onClick={close} className="shrink-0">
                        <ProductImage src={item.image} alt={item.name} label="" className="w-[84px] h-[112px]" />
                      </Link>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex justify-between gap-3">
                          <p className="font-display text-lg leading-tight line-clamp-2">{item.name}</p>
                          <span className="text-sm font-semibold whitespace-nowrap">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                        <p className="text-xs text-ink/50 mt-1">{[item.color, item.size && `Taille ${item.size}`].filter(Boolean).join(' · ')}</p>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="flex items-center border border-ink/15 h-9">
                            <button onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Diminuer" className="w-9 h-full grid place-items-center hover:bg-ink/5"><Minus className="w-3 h-3" /></button>
                            <span className="w-7 text-center text-sm" aria-live="polite">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= stock} aria-label="Augmenter" className="w-9 h-full grid place-items-center hover:bg-ink/5 disabled:opacity-25"><Plus className="w-3 h-3" /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.key)} className="text-[10px] uppercase tracking-[0.2em] text-ink/45 hover:text-wine link-luxe">Retirer</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {suggestions.length > 0 && (
                <div className="px-6 sm:px-8 py-6 bg-ivory-deep/60">
                  <p className="eyebrow mb-4">Complétez votre look</p>
                  <ul className="grid grid-cols-3 gap-3">
                    {suggestions.map(p => (
                      <li key={p.id} className="group">
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <ProductImage src={p.images[0]} alt={p.name} label="" className="w-full h-full" />
                          <button onClick={() => addToCart(p, { color: p.colors[0]?.name })} aria-label={`Ajouter ${p.name}`}
                            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white grid place-items-center shadow-soft hover:bg-ink hover:text-ivory transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        <p className="text-xs mt-2 leading-tight line-clamp-1">{p.name}</p>
                        <p className="text-[11px] text-ink/50">{formatPrice(p.price)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <footer className="border-t border-ink/10 px-6 sm:px-8 py-5 space-y-4 bg-ivory shrink-0">
              <GiftWrapOption />
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] uppercase tracking-[0.22em] font-semibold">Sous-total</span>
                <span className="font-display text-3xl">{formatPrice(t.subtotal - t.discount + t.giftFee)}</span>
              </div>
              <button onClick={() => { close(); navigate('/commande'); }} className="btn-dark w-full">Commander</button>
              <Link to="/panier" onClick={close} className="block text-center text-[11px] uppercase tracking-[0.2em] text-ink/60 hover:text-ink">Voir le panier détaillé</Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
