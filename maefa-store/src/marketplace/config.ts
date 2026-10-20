/**
 * Place de marché : nom provisoire (la gérante choisira le nom définitif).
 * Changer ici suffit : en-tête, titres de pages et messages.
 */
export const MP = {
  name: 'Sama Marché',
  tagline: 'Achetez et vendez près de chez vous',
  /** Adresse de base des pages */
  base: '/m',
};
export const mpPath = (p = '') => `${MP.base}${p}`;
