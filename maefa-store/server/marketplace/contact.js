// ============================================================
//  PLACE DE MARCHÉ — ANTI-CONTOURNEMENT
//  Les échanges restent dans l'application : pas de numéro de téléphone, de lien, d'adresse e-mail
//  ni de renvoi vers un réseau social dans les textes publics (articles, boutiques) ni dans les
//  messages entre acheteur et vendeur. C'est ce qui protège les deux côtés (et la commission).
// ============================================================

// Numéros sénégalais : mobiles 70/75/76/77/78 et fixes 33, avec ou sans +221, espaces, points, tirets
const PHONE =
  /(?:(?:\+|00)\s*221[\s.\-/]*)?(?<![\d])(?:7[05678]|33)(?:[\s.\-/]*\d){7}(?![\d])|(?:\+|00)\s*\d(?:[\s.\-/]*\d){7,}/;
// Chiffres écrits en lettres pour échapper au contrôle : « sept sept un deux… »
const SPELLED =
  /\b(?:z[ée]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)(?:[\s.,-]+(?:z[ée]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)){6,}\b/i;
const LINK = /(https?:\/\/|www\.|\b[\w-]+\.(com|sn|net|org|fr|me|ly|link)\b)/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const SOCIAL = /\b(whats\s*app|wa\.me|watsap|telegram|insta(gram)?|snap(chat)?|tik\s*tok|facebook|messenger)\b/i;

/** Renvoie la raison du refus si le texte contient un moyen de contact, sinon null. */
export function findContact(...texts) {
  const t = texts.filter(Boolean).join(' \n ');
  if (PHONE.test(t) || SPELLED.test(t)) return 'numéro de téléphone';
  if (EMAIL.test(t)) return 'adresse e-mail';
  if (LINK.test(t)) return 'lien';
  if (SOCIAL.test(t)) return 'réseau social';
  return null;
}

export const CONTACT_REFUSED = what =>
  `Pas de ${what} ici : tout se passe dans l'application. C'est ce qui protège l'acheteur (paiement à la livraison, ` +
  'garantie) et le vendeur (avis, visibilité). Le numéro est donné automatiquement une fois la commande acceptée.';
