/**
 * Assistante « hors ligne » : répond sans IA aux questions les plus fréquentes
 * (livraison, paiement, échanges, codes promo, suivi, recherche de pièces).
 * Utilisée quand le serveur IA n'est pas configuré ou injoignable.
 */
import type { Order, Product } from '../data/types';
import { CATEGORIES, OCCASIONS } from '../data/catalog';
import { DELIVERY_ZONES, PROMO_CODES, SITE_CONFIG } from '../config/site';
import { formatPrice } from './format';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const has = (q: string, ...words: string[]) => words.some(w => q.includes(w));

const STATUS_TEXT: Record<Order['status'], string> = {
  en_attente: 'a bien été reçue et attend notre confirmation',
  confirmee: 'est confirmée',
  en_preparation: 'est en cours de préparation',
  expediee: 'est en route avec notre livreur',
  livree: 'a été livrée',
  annulee: 'a été annulée',
};

const link = (p: Product) => `[${p.name}](/produit/${p.slug}) — ${formatPrice(p.price)}${p.stock <= 0 ? ' (épuisé)' : ''}`;

function searchProducts(q: string, products: Product[]): Product[] | null {
  const occasion = OCCASIONS.find(o => has(q, ...{
    mariage: ['mariage', 'bapteme', 'ceremonie de mariage'],
    ceremonie: ['tabaski', 'korite', 'fete', 'ramadan'],
    soiree: ['soiree', 'gala', 'diner'],
    bureau: ['bureau', 'travail', 'reunion'],
    quotidien: ['quotidien', 'tous les jours', 'casual'],
    vacances: ['vacances', 'plage', 'saly', 'ete'],
  }[o.id]));
  const category = CATEGORIES.find(c => has(q, ...{
    chaussures: ['chaussure', 'escarpin', 'sandale', 'basket', 'sneaker', 'mule', 'ballerine', 'talon', 'bottine', 'compensee'],
    sacs: ['sac', 'pochette', 'cabas', 'besace'],
    accessoires: ['lunette', 'montre', 'foulard', 'ceinture', 'chapeau', 'capeline', 'accessoire'],
    bijoux: ['bijou', 'collier', 'bague', 'bracelet', 'creole', 'boucle', 'parure'],
    vetements: ['robe', 'kaftan', 'boubou', 'tenue', 'ensemble', 'tailleur', 'vetement'],
  }[c.id]));
  const budgetMatch = q.match(/(?:moins de|max(?:imum)?|budget(?: de)?|jusqu'a)\s*(\d[\d\s.]*)\s*(k|000|f|fcfa)?/);
  let budget = budgetMatch ? Number(budgetMatch[1].replace(/[\s.]/g, '')) : 0;
  if (budgetMatch && budgetMatch[2] === 'k') budget *= 1000;
  if (budget && budget < 1000) budget *= 1000;

  if (!occasion && !category && !budget) return null;
  return products
    .filter(p => (!occasion || p.occasions.includes(occasion.id)) && (!category || p.category === category.id) && (!budget || p.price <= budget))
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || b.rating - a.rating)
    .slice(0, 3);
}

export function localAnswer(question: string, ctx: { products: Product[]; orders: Order[] }): string {
  const q = norm(question);

  // Suivi de commande
  const idMatch = question.toUpperCase().match(/FB-[A-Z0-9]{4,12}/);
  if (idMatch || has(q, 'ma commande', 'suivi', 'suivre', 'ou en est', 'colis', 'livree ?')) {
    const order = idMatch ? ctx.orders.find(o => o.id === idMatch[0]) : ctx.orders[0];
    if (order) {
      return `Votre commande **${order.id}** (${formatPrice(order.total)}) ${STATUS_TEXT[order.status]}. Vous pouvez suivre chaque étape sur [la page de suivi](/suivi?commande=${order.id}&tel=${encodeURIComponent(order.customer.phone)}) 🌸`;
    }
    return 'Je ne trouve pas cette commande sur cet appareil. Rendez-vous sur [Suivre ma commande](/suivi) avec votre numéro (FB-…) et votre téléphone, ou écrivez-nous sur WhatsApp.';
  }

  if (has(q, 'livraison', 'livrer', 'delai', 'frais de port', 'combien de temps', 'expedi')) {
    const zone = DELIVERY_ZONES.find(z => q.includes(norm(z.name).split(/[\s/]/)[0]));
    if (zone) return `Pour **${zone.name}**, la livraison coûte ${formatPrice(zone.fee)} et prend ${zone.delay}. Elle est offerte dès ${formatPrice(SITE_CONFIG.freeShippingThreshold)} d'achat 🛵`;
    return `Nous livrons en 24h à Dakar (1 500 à 2 000 FCFA selon le quartier) et en 48h à 5 jours en régions. La livraison est **offerte dès ${formatPrice(SITE_CONFIG.freeShippingThreshold)}**. Tous les tarifs sont sur [la page d'aide](/faq).`;
  }
  if (has(q, 'paiement', 'payer', 'wave', 'orange money', 'free money', 'carte', 'espece')) {
    return 'Vous pouvez payer par **Wave, Orange Money, Free Money, carte bancaire** ou **en espèces à la livraison**. Le paiement mobile se valide directement sur votre téléphone ✨';
  }
  if (has(q, 'echange', 'retour', 'rembours', 'pas la bonne taille', 'trop petit', 'trop grand')) {
    return 'Vous avez **7 jours** après réception pour échanger une pièce (taille ou couleur), gratuitement, si elle n\'a pas été portée et reste dans son emballage d\'origine. Écrivez-nous sur WhatsApp pour organiser l\'échange 🌸';
  }
  if (has(q, 'promo', 'code', 'reduction', 'remise', 'solde')) {
    return `Nos codes du moment : ${Object.entries(PROMO_CODES).map(([k, v]) => `**${k}** (${v.label})`).join(', ')}. À saisir dans votre panier ! Découvrez aussi [nos offres](/boutique?promo=1).`;
  }
  if (has(q, 'taille', 'pointure', 'mesure')) {
    return 'Notre [guide des tailles](/faq#tailles) vous aide à choisir. Entre deux tailles, prenez la plus grande ; nos escarpins Aminata taillent un peu petit.';
  }
  if (has(q, 'cadeau', 'offrir', 'anniversaire', 'fete des meres', 'saint-valentin')) {
    const gifts = ctx.products.filter(p => p.stock > 0 && p.price <= 20000).sort((a, b) => b.rating - a.rating).slice(0, 3);
    return `Bonne idée 🎁 Pensez à l'**emballage cadeau signature** (${formatPrice(SITE_CONFIG.giftWrapFee)}) avec votre mot doux, à cocher dans le panier. Quelques idées appréciées :\n${gifts.map(p => `- ${link(p)}`).join('\n')}`;
  }
  if (has(q, 'horaire', 'ouvert', 'adresse', 'ou etes', 'boutique physique', 'magasin')) {
    return `Notre boutique se trouve à **${SITE_CONFIG.address}**. Ouverte du lundi au vendredi ${SITE_CONFIG.hours.weekdays}, le samedi ${SITE_CONFIG.hours.saturday} et le dimanche ${SITE_CONFIG.hours.sunday}.`;
  }

  const found = searchProducts(q, ctx.products);
  if (found) {
    return found.length
      ? `Voici ce que je vous conseille ✨\n${found.map(p => `- ${link(p)}`).join('\n')}\n\nVoulez-vous d'autres suggestions ?`
      : 'Je n\'ai pas de pièce qui corresponde exactement. Essayez [toute la boutique](/boutique) ou demandez conseil à notre équipe sur WhatsApp.';
  }
  if (has(q, 'bonjour', 'salut', 'bonsoir', 'hello', 'coucou', 'salam', 'nanga def')) {
    return 'Bonjour et bienvenue chez Fabima 🌸 Je peux vous conseiller une tenue, vous parler de la livraison ou suivre votre commande. Que recherchez-vous ?';
  }
  if (has(q, 'merci')) return 'Avec plaisir ! Belle journée à vous 🌸';

  return 'Je ne suis pas sûre de bien comprendre. Je peux vous aider pour : une tenue selon l\'occasion, la livraison, le paiement, les échanges ou le suivi de commande. Pour tout le reste, notre équipe vous répond sur WhatsApp.';
}
