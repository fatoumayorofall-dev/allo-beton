export const formatPrice = (n: number): string => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const discountPercent = (price: number, oldPrice?: number): number =>
  oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;

/** Durée d'arrivée lisible : « 12 min », « 5 h 30 ». */
export const formatEta = (min: number): string => {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60), m = Math.round((min % 60) / 5) * 5;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};

/** Distance lisible : « 350 m », « 2,4 km », « 210 km ». */
export const formatDistance = (m: number): string =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : m < 100_000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m / 1000)} km`;

export const VEHICLE_LABELS = { moto: '🛵 Moto', voiture: '🚗 Voiture / 7 places', car: '🚌 Car / bus' } as const;
export const VEHICLE_ICONS = { moto: '🛵', voiture: '🚗', car: '🚌' } as const;
