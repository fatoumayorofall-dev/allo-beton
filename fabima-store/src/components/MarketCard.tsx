import React from 'react';
import { Link } from 'react-router-dom';
import { Globe2 } from 'lucide-react';
import type { MarketProduct } from '../data/types';
import { discountPercent, formatPrice } from '../utils/format';
import { delayShort } from '../utils/market';
import { ProductImage } from './ProductImage';

/** Carte d'un produit du Marché (dropshipping), avec son délai de livraison. */
export const MarketCard: React.FC<{ product: MarketProduct }> = ({ product: p }) => {
  const off = discountPercent(p.price, p.oldPrice);
  return (
    <Link to={`/marche/${p.slug}`} className="group block" data-testid="market-card">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-ivory-deep transition-[box-shadow,transform] duration-700 ease-luxe group-hover:shadow-luxe group-hover:-translate-y-1">
        <ProductImage src={p.images[0]} alt={p.name} className="w-full h-full transition-transform duration-[1.4s] ease-luxe group-hover:scale-[1.06]" />
        {p.images[1] && <ProductImage src={p.images[1]} alt="" className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-semibold text-ink">
          <Globe2 className="w-3 h-3 text-wine" /> {delayShort(p.delayMin, p.delayMax)}
        </span>
        {off > 0 && <span className="absolute top-3 right-3 px-2.5 py-1 bg-wine text-white text-[9px] uppercase tracking-[0.2em] font-semibold rounded-full">-{off}%</span>}
      </div>
      <div className="pt-4">
        <p className="text-[9px] uppercase tracking-[0.25em] text-ink/70">{p.category}</p>
        <p className="font-display text-[19px] leading-tight mt-1 line-clamp-2 group-hover:text-gold-dark transition-colors">{p.name}</p>
        <p className="flex items-baseline gap-2.5 text-[13px] mt-1.5">
          <span className={`font-semibold ${off ? 'text-wine' : ''}`}>{formatPrice(p.price)}</span>
          {p.oldPrice && <span className="text-ink/70 line-through">{formatPrice(p.oldPrice)}</span>}
        </p>
      </div>
    </Link>
  );
};

