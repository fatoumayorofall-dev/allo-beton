import type { MpListing, OrderStatus } from './api';

/** Prix affiché : « 12 000 F » (court, lisible sur téléphone). */
export const F = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;
/** Prix d'un article : exact, ou classe de prix quand il est à négocier. */
export const priceText = (l: Pick<MpListing, 'price' | 'priceBand'>) =>
  l.price === null ? (l.priceBand ?? 'Prix à négocier') : F(l.price);

export const STATUS_LABELS: Record<OrderStatus, string> = {
  nouvelle: 'En attente du vendeur',
  acceptee: 'Acceptée',
  prete: 'Prête',
  en_livraison: 'En livraison',
  retour: 'Retour au vendeur',
  livree: 'Livrée',
  refusee: 'Refusée',
  annulee: 'Annulée',
};
export const STATUS_STYLES: Record<OrderStatus, string> = {
  nouvelle: 'bg-amber-100 text-amber-900',
  acceptee: 'bg-sky-100 text-sky-900',
  prete: 'bg-violet-100 text-violet-900',
  en_livraison: 'bg-indigo-100 text-indigo-900',
  retour: 'bg-orange-100 text-orange-900',
  livree: 'bg-emerald-100 text-emerald-900',
  refusee: 'bg-red-100 text-red-900',
  annulee: 'bg-ink/10 text-ink/70',
};
/** Couleurs de vitrine (boutique en ligne) : identifiant enregistré → couleur affichée */
export const ACCENTS: Record<import('./api').ShopAccent, { name: string; hex: string }> = {
  prune: { name: 'Prune', hex: '#3b1f2b' },
  or: { name: 'Or', hex: '#a87b25' },
  emeraude: { name: 'Émeraude', hex: '#11694f' },
  indigo: { name: 'Indigo', hex: '#2b3a8c' },
  corail: { name: 'Corail', hex: '#d0533f' },
  terracotta: { name: 'Terracotta', hex: '#a4492a' },
  noir: { name: 'Noir', hex: '#151515' },
};
/** Lien court de la boutique, à partager */
export const shopLink = (slug: string) => `${location.origin}/b/${slug}`;
export const PAYMENT_LABELS = { especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money' } as const;
export const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
