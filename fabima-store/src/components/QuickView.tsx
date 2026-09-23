import { canBuy, isPreorder } from '../utils/stock';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { discountPercent, formatPrice } from '../utils/format';
import { useEscape, useLockBody } from '../utils/hooks';
import { ProductImage } from './ProductImage';
import { ColorSwatch } from './ColorSwatch';
import { Stars } from './Stars';

export const QuickView: React.FC = () => {
  const { quickView: product, openQuickView, addToCart, toggleWishlist, isInWishlist, setCartOpen } = useStore();
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const close = () => openQuickView(null);

  useLockBody(!!product);
  useEscape(!!product, close);
  useEffect(() => {
    setSize('');
    setSizeError(false);
    setColor(product?.colors[0]?.name ?? '');
  }, [product]);

  if (!product) return null;
  const off = discountPercent(product.price, product.oldPrice);

  const add = () => {
    if (product.sizes.length && !size) { setSizeError(true); return; }
    if (addToCart(product, { size, color, silent: true })) { close(); setCartOpen(true); }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm animate-fade-in" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label={`Aperçu : ${product.name}`}
        className="relative bg-ivory w-full max-w-4xl rounded-t-[2rem] sm:rounded-[2rem] max-h-[92vh] overflow-y-auto grid sm:grid-cols-2 animate-fade-up shadow-luxe">
        <button onClick={close} aria-label="Fermer" className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 grid place-items-center hover:rotate-90 transition-transform duration-500"><X className="w-4 h-4" /></button>
        <ProductImage src={product.images[0]} alt={product.name} className="w-full aspect-[4/5] sm:aspect-auto sm:h-full" />
        <div className="p-7 sm:p-10 flex flex-col">
          <p className="eyebrow">{product.subcategory}</p>
          <h2 className="font-display text-4xl mt-3 leading-[1.05]">{product.name}</h2>
          <div className="mt-3 flex items-center gap-2 text-xs text-ink/70"><Stars rating={product.rating} /> {product.reviewCount} avis</div>
          <div className="mt-5 flex items-baseline gap-3">
            <span className={`text-xl font-semibold ${off ? 'text-wine' : ''}`}>{formatPrice(product.price)}</span>
            {product.oldPrice && <span className="text-ink/70 line-through text-sm">{formatPrice(product.oldPrice)}</span>}
          </div>
          <p className="mt-5 text-sm text-ink/75 leading-relaxed line-clamp-3">{product.description}</p>

          {product.colors.length > 0 && (
            <div className="mt-6">
              <p className="field-label">Couleur — <span className="normal-case tracking-normal font-normal">{color}</span></p>
              <div className="flex gap-1.5">{product.colors.map(c => <ColorSwatch key={c.name} color={c} size={24} selected={c.name === color} onClick={() => setColor(c.name)} />)}</div>
            </div>
          )}
          {product.sizes.length > 0 && (
            <div className="mt-6">
              <p className={`field-label ${sizeError ? '!text-wine' : ''}`}>{sizeError ? 'Choisissez une taille' : 'Taille'}</p>
              <div className="flex flex-wrap gap-1.5">
                {product.sizes.map(s => (
                  <button key={s} onClick={() => { setSize(s); setSizeError(false); }}
                    className={`min-w-11 h-11 px-2 text-sm border rounded-full transition-colors ${size === s ? 'bg-ink text-ivory border-ink' : sizeError ? 'border-wine/60' : 'border-ink/15 hover:border-ink'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-2">
            <button onClick={add} disabled={!canBuy(product)} className="btn-dark flex-1">{!canBuy(product) ? 'Épuisé' : isPreorder(product) ? `Commander · sous ${product.preorderDays} j` : 'Ajouter au panier'}</button>
            <button onClick={() => toggleWishlist(product.id)} aria-label="Favoris" className="w-[52px] h-[52px] rounded-full border border-ink/20 grid place-items-center hover:border-ink">
              <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-wine text-wine' : ''}`} strokeWidth={1.5} />
            </button>
          </div>
          <Link to={`/produit/${product.slug}`} onClick={close} className="mt-6 self-start link-luxe text-[11px] uppercase tracking-[0.22em] font-semibold inline-flex items-center gap-2">
            Voir la fiche complète <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
