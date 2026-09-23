import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Plus } from 'lucide-react';
import type { Product } from '../data/types';
import { useStore } from '../context/StoreContext';
import { discountPercent, formatPrice } from '../utils/format';
import { ProductImage } from './ProductImage';
import { flyToCart } from '../utils/flyToCart';
import { sparkleBurst } from './Magic';
import { Sparkle } from './Decor';
import { ColorSwatch } from './ColorSwatch';
import { canBuy, isPreorder } from '../utils/stock';

export const ProductCard: React.FC<{ product: Product; priority?: boolean }> = ({ product }) => {
  const { addToCart, toggleWishlist, isInWishlist, openQuickView } = useStore();
  const off = discountPercent(product.price, product.oldPrice);
  const liked = isInWishlist(product.id);
  const preorder = isPreorder(product);
  const outOfStock = !canBuy(product);
  const color = product.colors[0]?.name;

  // Ajout rapide depuis la carte : la photo s'envole vers le panier
  const quickAdd = (e: React.MouseEvent<HTMLElement>, size?: string) => {
    if (addToCart(product, { size, color })) flyToCart(e.currentTarget.closest('article')?.querySelector('img'), product.images[0]);
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-ivory-deep rounded-[2rem] transition-[box-shadow,transform] duration-700 ease-luxe group-hover:shadow-luxe group-hover:-translate-y-1">
        <Link to={`/produit/${product.slug}`} aria-label={product.name} className="block w-full h-full">
          <ProductImage src={product.images[0]} alt={product.name} sizes="(min-width: 1024px) 25vw, 50vw"
            className="w-full h-full transition-transform duration-[1.4s] ease-luxe group-hover:scale-[1.06]" />
          {product.images[1] && (
            <ProductImage src={product.images[1]} alt="" sizes="(min-width: 1024px) 25vw, 50vw"
              className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          )}
        </Link>

        {/* Reflets de lumière qui s'allument au survol (ordinateur) */}
        <span className="hidden lg:block motion-reduce:!hidden pointer-events-none" aria-hidden>
          <Sparkle className="absolute top-[22%] left-[16%] w-4 h-4 text-white opacity-0 drop-shadow-[0_0_6px_rgba(255,244,236,.9)] group-hover:animate-twinkle" />
          <Sparkle className="absolute top-[48%] right-[14%] w-2.5 h-2.5 text-white opacity-0 drop-shadow-[0_0_5px_rgba(255,244,236,.9)] group-hover:animate-twinkle" style={{ animationDelay: '.6s' }} />
          <Sparkle className="absolute top-[64%] left-[30%] w-3 h-3 text-gold-light opacity-0 drop-shadow-[0_0_5px_rgba(255,244,236,.9)] group-hover:animate-twinkle" style={{ animationDelay: '1.2s' }} />
        </span>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">
          {outOfStock && <span className="px-2.5 py-1 bg-white text-ink/75 text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">Épuisé</span>}
          {preorder && <span className="px-2.5 py-1 bg-white text-wine text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full" data-testid="badge-preorder">Sur commande · {product.preorderDays} j</span>}
          {!outOfStock && !preorder && product.stock <= 3 && <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">Plus que {product.stock}</span>}
          {off > 0 && <span className="px-2.5 py-1 bg-wine text-white text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">-{off}%</span>}
          {product.isNew && <span className="px-2.5 py-1 bg-ivory text-ink text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">Nouveau</span>}
          {!product.isNew && !off && product.isBestseller && <span className="px-2.5 py-1 bg-ink text-gold-light text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">Coup de cœur</span>}
        </div>

        {/* Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button onClick={e => { if (!liked) sparkleBurst(e.currentTarget, { hearts: true, count: 12, power: 0.8 }); toggleWishlist(product.id); }} aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
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
                  <p className="text-[9px] uppercase tracking-[0.25em] text-ink/70 text-center mb-2">Ajout rapide · taille</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {product.sizes.map(s => (
                      <button key={s} onClick={e => quickAdd(e, s)}
                        className="min-w-9 h-8 px-2 text-xs border rounded-full border-ink/15 hover:bg-ink hover:text-ivory hover:border-ink transition-colors">{s}</button>
                    ))}
                  </div>
                </>
              ) : (
                <button onClick={e => quickAdd(e)} className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.25em] font-semibold py-1.5 hover:text-gold-dark">
                  <Plus className="w-3.5 h-3.5" /> Ajouter au panier
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] uppercase tracking-[0.25em] text-ink/70">{product.subcategory}</span>
          <div className="flex gap-1">
            {product.colors.slice(0, 4).map(c => <ColorSwatch key={c.name} color={c} size={10} />)}
            {product.colors.length > 4 && <span className="text-[10px] text-ink/70">+{product.colors.length - 4}</span>}
          </div>
        </div>
        <Link to={`/produit/${product.slug}`} className="font-display text-[19px] leading-tight text-ink hover:text-gold-dark transition-colors line-clamp-1">{product.name}</Link>
        {product.reviewCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-ink/70">
            <span className="text-gold tracking-[-0.1em]" aria-hidden>{'★★★★★'.slice(0, Math.round(product.rating))}</span>
            <span className="sr-only">Note</span>{product.rating.toFixed(1).replace('.', ',')} sur 5 · {product.reviewCount} avis
          </span>
        )}
        <div className="flex items-baseline gap-2.5 text-[13px]">
          <span className={`font-semibold ${off ? 'text-wine' : 'text-ink'}`}>{formatPrice(product.price)}</span>
          {product.oldPrice && <span className="text-ink/70 line-through"><span className="sr-only">au lieu de </span>{formatPrice(product.oldPrice)}</span>}
        </div>
      </div>
    </article>
  );
};
