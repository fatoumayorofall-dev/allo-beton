import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '../data/types';
import { useStore } from '../context/StoreContext';
import { discountPercent, formatPrice } from '../utils/format';
import { ProductImage } from './ProductImage';
import { ColorSwatch } from './ColorSwatch';
import { Stars } from './Stars';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const off = discountPercent(product.price, product.oldPrice);
  const liked = isInWishlist(product.id);
  const needsChoice = product.sizes.length > 0;
  const outOfStock = product.stock <= 0;

  return (
    <article className="group relative flex flex-col animate-fade-up">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ivory-deep">
        <Link to={`/produit/${product.slug}`} aria-label={product.name}>
          <ProductImage src={product.images[0]} alt={product.name}
            className="w-full h-full transition-transform duration-700 group-hover:scale-105" />
          {product.images[1] && (
            <ProductImage src={product.images[1]} alt=""
              className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          )}
        </Link>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          {off > 0 && <span className="px-2.5 py-1 rounded-full text-white text-[11px] font-semibold bg-[#a3142b]">-{off}%</span>}
          {product.isNew && <span className="px-2.5 py-1 rounded-full bg-ink text-ivory text-[11px] font-semibold">Nouveau</span>}
          {product.isBestseller && !product.isNew && <span className="px-2.5 py-1 rounded-full bg-gold text-white text-[11px] font-semibold">Best-seller</span>}
        </div>

        <button onClick={() => toggleWishlist(product.id)} aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow-sm hover:scale-110 transition-transform">
          <Heart className={`w-4 h-4 ${liked ? 'fill-[#a3142b] text-[#a3142b]' : 'text-ink'}`} />
        </button>

        {outOfStock ? (
          <div className="absolute inset-x-3 bottom-3 py-2.5 rounded-xl bg-white/90 text-center text-xs font-semibold text-ink/60">Épuisé</div>
        ) : needsChoice ? (
          <Link to={`/produit/${product.slug}`}
            className="absolute inset-x-3 bottom-3 py-2.5 rounded-xl bg-ink text-ivory text-center text-xs font-semibold tracking-wide opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
            Choisir la taille
          </Link>
        ) : (
          <button onClick={() => addToCart(product, { color: product.colors[0]?.name })}
            className="absolute inset-x-3 bottom-3 py-2.5 rounded-xl bg-ink text-ivory text-xs font-semibold tracking-wide flex items-center justify-center gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
            <ShoppingBag className="w-4 h-4" /> Ajouter au panier
          </button>
        )}
      </div>

      <div className="pt-3 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink/50">{product.subcategory}</span>
          <div className="flex gap-1">{product.colors.slice(0, 4).map(c => <ColorSwatch key={c.name} color={c} size={12} />)}</div>
        </div>
        <Link to={`/produit/${product.slug}`} className="font-medium text-ink leading-snug hover:text-gold-dark line-clamp-1">{product.name}</Link>
        <div className="flex items-center gap-1.5 text-xs text-ink/50"><Stars rating={product.rating} size={12} /> ({product.reviewCount})</div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-ink">{formatPrice(product.price)}</span>
          {product.oldPrice && <span className="text-sm text-ink/40 line-through">{formatPrice(product.oldPrice)}</span>}
        </div>
      </div>
    </article>
  );
};
