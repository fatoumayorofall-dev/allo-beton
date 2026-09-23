import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { usePageTitle } from '../utils/usePageTitle';

export const Wishlist: React.FC = () => {
  usePageTitle('Mes favoris');
  const { wishlist, getProduct } = useStore();
  const items = wishlist.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-14">
      <div className="text-center pb-10 border-b border-ink/10">
        <p className="eyebrow">{items.length} pièce{items.length > 1 ? 's' : ''} mise{items.length > 1 ? 's' : ''} de côté</p>
        <h1 className="font-display text-5xl sm:text-6xl mt-4">Vos favoris</h1>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-28">
          <p className="font-display text-3xl">Votre liste d'envies est vide</p>
          <p className="text-ink/75 mt-3 text-sm">Touchez le cœur d'une pièce pour la retrouver ici, à tout moment.</p>
          <Link to="/boutique" className="btn-dark mt-10">Explorer la boutique</Link>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-12">
          {items.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};
