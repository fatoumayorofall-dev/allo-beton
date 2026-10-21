import type { OrderStatus } from './api';

/** Prix affiché : « 12 000 F » (court, lisible sur téléphone). */
export const F = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

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
export const PAYMENT_LABELS = { especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money' } as const;
export const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
