/** Outils du Marché (dropshipping) : prix de vente, délais, passage au panier. */
import { useEffect, useState } from 'react';
import type { Currency, MarketProduct, MarketSettings, Product } from '../data/types';
import { fetchMarket } from '../services/api';

/** Coût d'achat en FCFA (produit + port du fournisseur). */
export function costInXof(cost: number, shipping: number, currency: Currency, settings: MarketSettings): number {
  const total = (cost || 0) + (shipping || 0);
  return Math.round(currency === 'XOF' ? total : total * (settings.rates[currency] || 0));
}

/** Prix de vente conseillé : coût × (1 + marge), arrondi au palier supérieur. */
export function suggestedPrice(costXof: number, settings: MarketSettings): number {
  const raw = costXof * (1 + settings.margin / 100);
  const step = settings.roundTo || 1;
  return Math.ceil(raw / step) * step;
}

export const delayLabel = (min: number, max: number) => (min === max ? `${min} jours` : `${min} à ${max} jours`);
export const delayShort = (min: number, max: number) => (min === max ? `${min} j` : `${min}–${max} j`);

/** Le panier attend un « Product » : on adapte le produit du Marché (stock illimité chez le fournisseur). */
export function marketAsProduct(p: MarketProduct): Product {
  return {
    id: p.id, slug: p.slug, name: p.name, category: 'sacs', subcategory: p.category, occasions: [], material: '', care: '', styleTip: '',
    price: p.price, oldPrice: p.oldPrice, images: p.images, colors: [], sizes: [], stock: 999, description: p.description, details: [],
    rating: 0, reviewCount: 0, createdAt: p.createdAt,
  };
}

/* Catalogue du Marché partagé par toute la visite (une seule requête) */
let cache: Promise<{ products: MarketProduct[]; delay: { min: number; max: number } } | null> | null = null;
export function useMarket() {
  const [state, setState] = useState<{ products: MarketProduct[] | null; loading: boolean; offline: boolean }>({ products: null, loading: true, offline: false });
  useEffect(() => {
    let alive = true;
    cache ??= fetchMarket();
    cache.then(r => {
      if (!alive) return;
      if (!r) cache = null; // réessayer à la prochaine page
      setState({ products: r?.products ?? [], loading: false, offline: !r });
    });
    return () => { alive = false; };
  }, []);
  return state;
}
/** À appeler après une modification par la gérante pour recharger le catalogue. */
export const refreshMarket = () => { cache = null; };
