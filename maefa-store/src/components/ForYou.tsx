import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useAccount } from '../context/AccountContext';
import { canBuy } from '../utils/stock';
import type { Product } from '../data/types';
import { ProductCard } from './ProductCard';

/**
 * Sélection personnelle : des pièces proches de ce qu'elle a commandé ou aimé
 * (même univers, même style, mêmes occasions), jamais une pièce déjà à elle ou déjà en favori.
 * Sans historique : coups de cœur et nouveautés de la maison.
 */
export function pickForHer(products: Product[], history: string[], wishlist: string[], max = 8): Product[] {
  const seen = new Set([...history, ...wishlist]);
  const liked = products.filter(p => seen.has(p.id));
  const score = (p: Product) =>
    liked.reduce(
      (s, l) =>
        s +
        (l.subcategory === p.subcategory ? 3 : 0) +
        (l.category === p.category ? 1 : 0) +
        p.occasions.filter(o => l.occasions.includes(o)).length,
      0,
    ) +
    (p.isBestseller ? 1.5 : 0) +
    (p.isNew ? 1 : 0) +
    (p.oldPrice ? 0.5 : 0);
  return products
    .filter(p => !seen.has(p.id) && canBuy(p))
    .sort((a, b) => score(b) - score(a))
    .slice(0, max);
}

/** Bande « Choisi pour vous », défilante au pouce sur téléphone. */
export const ForYou: React.FC<{ eyebrow?: string; title?: React.ReactNode; id?: string; className?: string }> = ({
  eyebrow = 'Choisi pour vous',
  title,
  id,
  className = '',
}) => {
  const { products, orders, wishlist } = useStore();
  const { remoteOrders, user } = useAccount();
  const history = [...remoteOrders, ...orders].flatMap(o => o.items.map(i => i.productId));
  const picks = pickForHer(products, history, wishlist);
  if (!picks.length) return null;
  return (
    <section
      id={id}
      className={`scroll-mt-28 ${className}`}
      aria-labelledby="pour-vous-titre"
      data-testid="account-picks"
    >
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="pour-vous-titre" className="font-display text-3xl sm:text-4xl mt-2">
            {title ?? (
              <>
                {user?.firstName ? `${user.firstName}, ces pièces` : 'Ces pièces'}{' '}
                <em className="text-gold-dark">vont vous plaire</em>
              </>
            )}
          </h2>
        </div>
        <Link
          to="/boutique"
          className="hidden sm:inline-flex link-luxe text-[11px] uppercase tracking-[0.2em] font-semibold shrink-0"
        >
          Toute la boutique
        </Link>
      </div>
      <div className="grid grid-flow-col auto-cols-[62%] sm:auto-cols-[38%] lg:auto-cols-[calc(25%-1.125rem)] gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 sm:scroll-px-0 -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
        {picks.map(p => (
          <div key={p.id} className="snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
};
