export const formatPrice = (n: number): string => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const discountPercent = (price: number, oldPrice?: number): number =>
  oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
