import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppLink } from '../config/site';
import type { Product } from '../data/types';
import { getShowcase } from '../services/api';
import { usePageTitle } from '../utils/usePageTitle';
import { SimpleCard, SimpleHeader } from './SimpleProduct';

/**
 * Vitrine du statut (/s) : les pièces que la gérante a mises en statut WhatsApp,
 * en grandes photos avec le prix. Sans serveur, on affiche les nouveautés.
 */
export const Showcase: React.FC = () => {
  usePageTitle('Les nouveautés du statut', 'Toutes les pièces du statut WhatsApp de Fabima Store : photos, prix et commande en un clic.');
  const { products } = useStore();
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    getShowcase().then(list => {
      const fromShowcase = (list ?? []).map(i => products.find(p => p.slug === i.slug)).filter((p): p is Product => !!p);
      setItems(fromShowcase.length ? fromShowcase : [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12));
    });
  }, [products]);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-petal pb-32">
      <SimpleHeader />
      <main className="max-w-md mx-auto px-4 pt-6">
        <div className="text-center">
          <p className="font-script text-4xl text-gold-dark leading-none">Nouveautés</p>
          <h1 className="font-display text-3xl mt-1">Vues sur mon statut</h1>
          <p className="text-sm text-ink/55 mt-1 capitalize">{today}</p>
          <p className="mt-4 text-base">👇 Touchez une photo pour voir le prix, les couleurs et commander</p>
        </div>
        {items === null ? (
          <div className="mt-8 grid grid-cols-2 gap-3">{[0, 1, 2, 3].map(i => <div key={i} className="aspect-[4/5] rounded-[1.75rem] bg-white/70 animate-pulse" />)}</div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3">{items.map(p => <SimpleCard key={p.id} product={p} source="vitrine" />)}</div>
        )}
        <Link to="/boutique" className="mt-8 flex h-14 items-center justify-center rounded-full bg-white font-bold shadow-sm">🛍️ Toute la boutique</Link>
      </main>
      <div className="fixed bottom-0 inset-x-0 z-40 bg-ivory/95 backdrop-blur border-t border-ink/[0.06] pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-4 py-3">
          <a href={buildWhatsAppLink('Bonjour Fabima 🌸 J\'ai vu votre statut, je voudrais des informations.')} target="_blank" rel="noopener noreferrer"
            className="flex h-16 items-center justify-center gap-3 rounded-full bg-[#1f8f4e] text-white text-lg font-extrabold shadow-luxe">
            <MessageCircle className="w-7 h-7" /> Écrire sur WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};
