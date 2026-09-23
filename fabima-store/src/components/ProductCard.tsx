import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Plus } from 'lucide-react';
import type { Product } from '../data/types';
import { useStore } from '../context/StoreContext';
import { discountPercent, formatPrice } from '../utils/format';
import { ProductImage } from './ProductImage';
import { ColorSwatch } from './ColorSwatch';
import { canBuy, isPreorder } from '../utils/stock';

export const ProductCard: React.FC<{ product: Product; priority?: boolean }> = ({ product }) => {
  const { addToCart, toggleWishlist, isInWishlist, openQuickView } = useStore();
  const off = discountPercent(product.price, product.oldPrice);
  const liked = isInWishlist(product.id);
  const preorder = isPreorder(product);
  const outOfStock = !canBuy(product);
  const color = product.colors[0]?.name;

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-ivory-deep rounded-[2rem] transition-[box-shadow,transform] duration-700 ease-luxe group-hover:shadow-luxe group-hover:-translate-y-1">
        <Link to={`/produit/${product.slug}`} aria-label={product.name} className="block w-full h-full">
          <ProductImage src={product.images[0]} alt={product.name}
            className="w-full h-full transition-transform duration-[1.4s] ease-luxe group-hover:scale-[1.06]" />
          {product.images[1] && (
            <ProductImage src={product.images[1]} alt=""
              className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">
          {outOfStock && <span className="px-2.5 py-1 bg-white text-ink/60 text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">Épuisé</span>}
          {preorder && <span className="px-2.5 py-1 bg-white text-wine text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full" data-testid="badge-preorder">Sur commande · {product.preorderDays} j</span>}
          {!outOfStock && !preorder && product.stock <= 3 && <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">Plus que {product.stock}</span>}
          {off > 0 && <span className="px-2.5 py-1 bg-wine text-white text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">-{off}%</span>}
          {product.isNew && <span className="px-2.5 py-1 bg-ivory text-ink text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">Nouveau</span>}
          {!product.isNew && !off && product.isBestseller && <span className="px-2.5 py-1 bg-ink text-gold-light text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">Coup de cœur</span>}
        </div>

        {/* Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button onClick={() => toggleWishlist(product.id)} aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur grid place-items-center transition-transform hover:scale-110">
            <Heart key={String(liked)} className={`w-4 h-4 ${liked ? 'fill-wine text-wine animate-heart-pop' : 'text-ink'}`} strokeWidth={1.5} />
          </button>
          <button onClick={() => openQuickView(product)} aria-label="Aperçu rapide"
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur grid place-items-center transition-all hover:scale-110 lg:opacity-0 lg:translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 duration-500">
            <Eye className="w-4 h-4 text-ink" strokeWidth={1.5} />
          </button>
        </div>

        {/* Ajout rapide (desktop) : tailles directement sur la carte */}
        {!outOfStock && (
          <div className="hidden lg:block absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-luxe">
            <div className="bg-white/90 backdrop-blur px-4 py-3.5 rounded-t-3xl">
              {product.sizes.length > 0 ? (
                <>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-ink/50 text-center mb-2">Ajout rapide · taille</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {product.sizes.map(s => (
                      <button key={s} onClick={() => addToCart(product, { size: s, color })}
                        className="min-w-9 h-8 px-2 text-xs border rounded-full border-ink/15 hover:bg-ink hover:text-ivory hover:border-ink transition-colors">{s}</button>
                    ))}
                  </div>
                </>
              ) : (
                <button onClick={() => addToCart(product, { color })} className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.25em] font-semibold py-1.5 hover:text-gold-dark">
                  <Plus className="w-3.5 h-3.5" /> Ajouter au panier
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] uppercase tracking-[0.25em] text-ink/45">{product.subcategory}</span>
          <div className="flex gap-1">
            {product.colors.slice(0, 4).map(c => <ColorSwatch key={c.name} color={c} size={10} />)}
            {product.colors.length > 4 && <span className="text-[10px] text-ink/40">+{product.colors.length - 4}</span>}
          </div>
        </div>
        <Link to={`/produit/${product.slug}`} className="font-display text-[19px] leading-tight text-ink hover:text-gold-dark transition-colors line-clamp-1">{product.name}</Link>
        {product.reviewCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-ink/45" aria-label={`Note ${product.rating} sur 5`}>
            <span className="text-gold tracking-[-0.1em]" aria-hidden>{'★★★★★'.slice(0, Math.round(product.rating))}</span>
            {product.rating.toFixed(1).replace('.', ',')} · {product.reviewCount} avis
          </span>
        )}
        <div className="flex items-baseline gap-2.5 text-[13px]">
          <span className={`font-semibold ${off ? 'text-wine' : 'text-ink'}`}>{formatPrice(product.price)}</span>
          {product.oldPrice && <span className="text-ink/35 line-through">{formatPrice(product.oldPrice)}</span>}
        </div>
      </div>
    </article>
  );
};
