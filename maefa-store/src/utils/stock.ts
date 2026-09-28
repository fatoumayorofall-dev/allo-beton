import type { Product } from '../data/types';

/** Quantité maximale d'une pièce « sur commande » dans un panier. */
export const PREORDER_MAX = 10;

/** Épuisée mais vendue « sur commande ». */
export const isPreorder = (p: Product) => p.stock <= 0 && !!p.preorderDays;
/** La pièce peut être ajoutée au panier (en stock ou sur commande). */
export const canBuy = (p: Product) => p.stock > 0 || isPreorder(p);
/** Quantité maximale commandable. */
export const maxQty = (p: Product) => (isPreorder(p) ? PREORDER_MAX : p.stock);
