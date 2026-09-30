/**
 * Examen de Maé : phrases qu'elle n'a JAMAIS apprises (absentes de src/assistant/training.ts).
 * On mesure si elle comprend l'intention, repère les détails et tient une conversation.
 */
export const INTENT_EXAM = [
  // français
  ['bonjour maé comment ça va', 'salut'], ['je voudrais un joli sac pour une cérémonie', 'cherche'], ['vous auriez des sandales en 37', 'cherche'],
  ['combien il coûte le sac soxna', 'prix'], ['vous livrez jusqu\'à saint-louis', 'livraison'], ['c\'est combien pour livrer à rufisque', 'livraison'],
  ['on peut payer avec wave', 'paiement'], ['je règle quand le livreur arrive', 'paiement'], ['ma commande MAE-7KQ2 elle est où', 'suivi'],
  ['je n\'ai toujours pas reçu mon colis', 'suivi'], ['si la taille ne va pas vous reprenez', 'retour'], ['je fais quelle pointure chez vous', 'pointure'],
  ['vous avez une adresse à dakar', 'boutique'], ['c\'est des vrais sacs hermès', 'marque'], ['vous faites une réduction', 'promo'],
  ['je veux offrir quelque chose à ma maman', 'cadeau'], ['je prends la pochette dorée', 'commander'], ['je peux avoir votre whatsapp', 'humain'],
  ['c\'est trop cher pour moi ça', 'moins_cher'], ['vous avez d\'autres couleurs', 'autres'], ['merci beaucoup maé', 'merci'], ['bonne soirée à vous', 'aurevoir'],
  ['la tabaski c\'est pour quand cette année', 'fete'], ['vous êtes une personne ou une machine', 'qui'], ['le sac est arrivé cassé', 'plainte'],
  ['oui avec plaisir', 'oui'], ['non merci ça va', 'non'], ['je voudrais des mules noires', 'cherche'],
  // wolof
  ['salaam aleekum maé', 'salut'], ['dama bëgg sac bu weex', 'cherche'], ['am ngeen dàll ngir soirée', 'cherche'], ['sac diarra ñaata la', 'prix'],
  ['ci mbour dingeen yónnee', 'livraison'], ['mën naa fey ak wave', 'paiement'], ['sama commande fan la nekk', 'suivi'], ['mën naa soppi pointure bi', 'retour'],
  ['xamuma ban pointure laay jël', 'pointure'], ['fan la sëriñ boutique bi nekk', 'boutique'], ['hermès dëgg la sac bi', 'marque'], ['wàññi ma tuuti', 'promo'],
  ['dama bëgg may sama yaay', 'cadeau'], ['kii laa bëgg jënd', 'commander'], ['dama bëgg wax ak nit ku dëgg', 'humain'], ['dafa jafe lool', 'moins_cher'],
  ['wone ma yeneen melo', 'autres'], ['jërëjëf lool', 'merci'], ['ba beneen yoon inshallah', 'aurevoir'], ['waaw kay', 'oui'], ['déedéet jërëjëf', 'non'],
];

export const SLOT_EXAM = [
  ['je cherche des chaussures en 38 pour un mariage', { kind: 'chaussures', size: '38', occasion: 'mariage' }],
  ['un sac noir à moins de 16 000', { kind: 'sacs', color: 'noir', budget: 16000 }],
  ['dama bëgg dàll bu ñuul ngir céet', { kind: 'chaussures', color: 'noir', occasion: 'mariage' }],
  ['sac bu xonq ba 20 000', { kind: 'sacs', color: 'rouge', budget: 20000 }],
  ['sama pointure 39', { kind: 'chaussures', size: '39' }],
  ['une pochette pour la tabaski', { kind: 'sacs', sub: 'pochette', occasion: 'ceremonie' }],
  ['vous livrez à thiès', { zone: 'Thiès' }],
  ['un sac bleu pour le bureau', { kind: 'sacs', color: 'vif', occasion: 'bureau' }],
  ['des mules à talon bordeaux', { kind: 'chaussures', sub: 'talon', color: 'rouge' }],
  ['le sac awa en taupe', { kind: 'sacs', model: 'Sac Awa à fermoir doré', color: 'marron' }],
  ['16k max', { budget: 16000 }],
];

/** Conversations : ce que dit la cliente, et ce qu'on attend de chaque réponse. */
export const CONVERSATIONS = [
  { id: 'vendeuse-fr', lang: 'fr', turns: [
    ['Bonjour', { intent: 'salut', chips: true }],
    ['👡 Des chaussures', { ask: 'size' }],
    ['👣 38', { ask: 'occasion' }],
    ['🎉 Soirée', { products: true, size: '38', category: 'chaussures' }],
    ['💸 Moins cher', { cheaper: true }],
    ['🛒 Comment commander ?', { intent: 'commander', mentions: /panier/i }],
  ] },
  { id: 'vendeuse-wo', lang: 'wo', turns: [
    ['Salaam aleekum', { intent: 'salut', wolof: true }],
    ['Dama bëgg sac ngir céet', { products: true, category: 'sacs', wolof: true }],
    ['Yeneen', { products: true, fresh: true, wolof: true }],
    ['Naka laay fey ?', { intent: 'paiement', mentions: /wave/i, wolof: true }],
  ] },
  { id: 'directe', lang: 'fr', turns: [
    ['Je cherche un sac noir à moins de 18 000 pour le bureau', { products: true, category: 'sacs', maxPrice: 18000 }],
  ] },
  { id: 'pointure-absente', lang: 'fr', turns: [
    ['Vous avez des chaussures en 43 ?', { mentions: /43/, noProducts: true }],
  ] },
  { id: 'prix-modele', lang: 'fr', turns: [
    ['Combien coûte le sac Ndella ?', { intent: 'prix', mentions: /25\s?000/ }],
  ] },
  { id: 'livraison-ville', lang: 'wo', turns: [
    ['Ci Thiès, yónnee bi ñaata la ?', { intent: 'livraison', mentions: /4\s?000/, wolof: true }],
  ] },
  { id: 'pas-en-vente', lang: 'fr', turns: [
    ['Vous vendez des robes et des bijoux ?', { mentions: /uniquement des sacs et des chaussures/i, noProducts: true }],
  ] },
  { id: 'marque-honnete', lang: 'fr', turns: [
    ['C\'est du vrai Hermès vos tongs ?', { intent: 'marque', mentions: /ne sont pas|pas des articles de grandes marques/i }],
  ] },
];
