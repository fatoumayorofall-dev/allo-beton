/**
 * Guide vocal en wolof de l'assistante, pour les clientes qui ne lisent pas le français.
 * Chaque sujet a son image, un court texte wolof (et sa traduction), et une note vocale
 * enregistrée par la gérante (Admin > Statut WhatsApp > « Guide vocal en wolof »),
 * servie par /api/voice/guide-wo-<id>.
 * Les textes wolof sont à relire par la gérante (orthographe courante, mots français usuels gardés).
 */
export interface GuideTopic {
  id: string;
  emoji: string;
  wo: string;
  fr: string;
  textWo: string;
  textFr: string;
  link?: { to: string; wo: string; fr: string };
}

export const guideVoiceSlug = (id: string) => `guide-wo-${id}`;

export const WOLOF_GUIDE: GuideTopic[] = [
  {
    id: 'jend',
    emoji: '🛍️',
    wo: 'Naka laay jënde ?',
    fr: 'Comment commander',
    textWo: '1. Tànnal sac walla dàll bi la neex.\n2. Bësal « Ajouter au panier ».\n3. Bësal panier bi, bindal sa tur, sa nimero ak fi ngay dëkk.\n4. Bësal « Valider ma commande ». Dinañu la woo walla bind ci WhatsApp.',
    textFr: 'Choisissez la pièce, touchez « Ajouter au panier », ouvrez le panier, écrivez votre nom, votre numéro et votre adresse, puis « Valider ma commande ». Nous vous appelons ou vous écrivons sur WhatsApp.',
    link: { to: '/boutique', wo: 'Seeti sac yi ak dàll yi', fr: 'Voir la boutique' },
  },
  {
    id: 'yonnee',
    emoji: '🛵',
    wo: 'Yónnee (livraison)',
    fr: 'Livraison',
    textWo: 'Ci Dakar, dinañu la ko indil ci 24 waxtu. Ci diwaan yi, 2 ba 5 fan. Njëgu yónnee bi dinga ko gis balaa ngay fey.',
    textFr: 'À Dakar, livraison en 24 h. En régions, 2 à 5 jours. Les frais de livraison s\'affichent avant de payer.',
  },
  {
    id: 'fey',
    emoji: '💳',
    wo: 'Naka laay fey ?',
    fr: 'Paiement',
    textWo: 'Mën nga fey ak Wave walla Orange Money ci nimero 77 309 38 19. Mën nga itam fey xaalis bi bu la livreur bi indilee sa commande.',
    textFr: 'Payez par Wave ou Orange Money au 77 309 38 19, ou en espèces à la livraison.',
  },
  {
    id: 'topp',
    emoji: '📍',
    wo: 'Fan la sama commande nekk ?',
    fr: 'Suivre ma commande',
    textWo: 'Bësal « Suivre ma commande », bindal sa nimero commande ak sa nimero telefon : dinga gis fi livreur bi nekk ci kart bi.',
    textFr: 'Touchez « Suivre ma commande », écrivez le numéro de commande et votre téléphone : vous voyez le livreur sur la carte.',
    link: { to: '/suivi', wo: 'Topp sama commande', fr: 'Suivre ma commande' },
  },
  {
    id: 'tank',
    emoji: '👡',
    wo: 'Sama pointure',
    fr: 'Ma pointure',
    textWo: 'Tànnal sa pointure bu ñu la ko laajee. Su fekkee xamoo ko bu wér, yónnee nu vocal ci WhatsApp balaa ngay jënd.',
    textFr: 'Choisissez votre pointure quand on vous la demande. En cas de doute, envoyez-nous un vocal WhatsApp avant d\'acheter.',
    link: { to: '/faq#tailles', wo: 'Xool pointure yi', fr: 'Guide des tailles' },
  },
  {
    id: 'seet',
    emoji: '✅',
    wo: 'Bu ñu la indilee',
    fr: 'À la réception',
    textWo: 'Seetal sa commande bu livreur bi nekkee fi. Ginnaaw livraison bi, du ñu mën soppi walla delloo.',
    textFr: 'Vérifiez votre commande devant le livreur : aucun échange ni retour après la livraison.',
  },
];

/** Réponse de secours en wolof quand l'IA n'est pas disponible : le sujet du guide le plus proche. */
export function wolofLocalAnswer(q: string): string {
  const t = q.toLowerCase();
  const pick = (id: string) => WOLOF_GUIDE.find(g => g.id === id)!;
  const topic =
    /fey|wave|orange|xaalis|paie|pay/.test(t) ? pick('fey')
    : /yónn|yonn|livr|indil|fan la|dakar|diwaan/.test(t) ? pick('yonnee')
    : /topp|suiv|nekk|commande bi/.test(t) ? pick('topp')
    : /pointure|tànk|tank|taille|dàll|dall/.test(t) ? pick('tank')
    : /soppi|delloo|retour|échang/.test(t) ? pick('seet')
    : /jënd|jend|command|sac|dëbb|achet/.test(t) ? pick('jend')
    : null;
  if (topic) return `**${topic.wo}**\n${topic.textWo}${topic.link ? `\n\n[${topic.link.wo}](${topic.link.to})` : ''}`;
  return 'Jërëjëf ! Ngir wax ak nun ci wolof, bësal **micro** bi ci suuf te yónnee nu vocal ci WhatsApp. Dinañu la tontu 🌸';
}
