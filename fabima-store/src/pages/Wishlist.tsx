import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { usePageTitle } from '../utils/usePageTitle';

export const Wishlist: React.FC = () => {
  usePageTitle('Mes favoris');
  const { wishlist, getProduct } = useStore();
  const items = wishlist.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <h1 className="font-display text-4xl sm:text-5xl">Mes favoris</h1>
      <p className="text-ink/60 mt-2">{items.length} article{items.length > 1 ? 's' : ''} mis de côté</p>
      {items.length === 0 ? (
        <div className="text-center py-24">
          <Heart className="w-14 h-14 mx-auto text-ink/20" strokeWidth={1.2} />
          <p className="font-display text-2xl mt-5">Aucun favori pour le moment</p>
          <p className="text-ink/60 mt-2">Cliquez sur le ♥ d'un article pour le retrouver ici.</p>
          <Link to="/boutique" className="inline-block mt-8 px-7 py-3.5 rounded-full bg-ink text-ivory font-semibold">Explorer la boutique</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {items.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};
