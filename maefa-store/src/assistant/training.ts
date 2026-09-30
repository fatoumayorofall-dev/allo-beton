/**
 * Phrases d'entraînement de Maé : ce que les clientes disent vraiment, en français et en wolof
 * (avec les orthographes courantes). Pour lui apprendre une nouvelle façon de dire, il suffit
 * d'ajouter une phrase dans la bonne liste. Les phrases de contrôle (jamais apprises) sont
 * dans scripts/eval-assistant/examen.mjs.
 */
export type Intent =
  | 'salut' | 'merci' | 'aurevoir' | 'qui' | 'cherche' | 'prix' | 'livraison' | 'paiement' | 'suivi'
  | 'retour' | 'pointure' | 'boutique' | 'marque' | 'promo' | 'cadeau' | 'commander' | 'humain'
  | 'fete' | 'moins_cher' | 'autres' | 'oui' | 'non' | 'plainte';

export const TRAINING: Record<Intent, string[]> = {
  salut: [
    'bonjour', 'bonsoir', 'salut', 'coucou', 'hello', 'bonjour madame', 'bonjour maé', 'bjr', 'slt', 'bonjour comment allez-vous',
    'salam', 'salaam aleekum', 'salamalekum', 'asalamu aleykum', 'na nga def', 'nanga def', 'jamm nga am', 'jaam nga am', 'mangi nuyu', 'maangi nuyu', 'nuyu naa la',
  ],
  merci: [
    'merci', 'merci beaucoup', 'merci bien', 'merci maé', 'c\'est gentil merci', 'super merci', 'ok merci', 'mci', 'thanks',
    'jërëjëf', 'jerejef', 'dieuredieuf', 'jarajef', 'jërëjëf maé', 'jerejef bu baax', 'jërëjëf waay',
  ],
  aurevoir: [
    'au revoir', 'bonne journée', 'bonne soirée', 'à bientôt', 'à plus', 'bye', 'bonne nuit', 'à demain',
    'ba beneen', 'ba beneen yoon', 'ba ci kanam', 'mangi dem', 'maangi dem', 'ba suba', 'ba ci kanam inshallah',
  ],
  qui: [
    'tu es qui', 'vous êtes qui', 'qui êtes-vous', 'tu es un robot', 'c\'est un robot', 'tu es une vraie personne', 'je parle à qui', 'c\'est quoi maé', 'tu es une ia',
    'yow kan nga', 'kan nga', 'nit nga walla robot', 'robot nga', 'kan mooy wax', 'yow ana nga',
  ],
  cherche: [
    'je cherche un sac', 'je veux un sac', 'je voudrais des chaussures', 'montrez-moi vos sacs', 'vous avez des sandales', 'je cherche des mules',
    'je cherche un sac pour un mariage', 'un sac noir', 'des chaussures pour une soirée', 'je fais du 38 je veux des chaussures', 'sandales plates en 39',
    'une pochette pour un baptême', 'je veux quelque chose pour la tabaski', 'un sac pas cher', 'un sac à moins de 16000', 'vous avez quoi en rouge',
    'qu\'est-ce que vous avez comme nouveautés', 'montrez-moi ce que vous avez', 'je cherche un cadeau pas un sac', 'des talons pour un mariage', 'des tongs dorées',
    'je veux voir les sacs à main', 'conseillez-moi un sac pour le bureau', 'j\'ai besoin de chaussures confortables', 'avez-vous des mules à talon', 'un sac bordeaux',
    'dama bëgg sac', 'dama beug sac', 'dama bëgg dàll', 'dama bëgg dall', 'am ngeen sac', 'am ngeen dàll', 'wone ma sac yi', 'wone ma dàll yi', 'lan ngeen am',
    'dama bëgg sac ngir céet', 'dama bëgg dàll ngir ngénte', 'sac bu ñuul', 'sac bu xonq', 'dàll bu weex', 'sama pointure 38 dama bëgg dàll', 'sac bu yomb',
    'dama bëgg sac bu rafet', 'dama wut sac', 'maa ngi wut dàll', 'dama bëgg pochette', 'dama bëgg lu bees', 'yan sac ngeen am',
  ],
  prix: [
    'combien coûte le sac awa', 'c\'est combien', 'quel est le prix', 'le prix du sac ndella', 'combien pour la pochette', 'combien les mules',
    'ça coûte combien', 'prix svp', 'le sac diarra c\'est combien', 'combien vaut ce sac', 'donnez-moi le prix', 'prix des tongs zara',
    'ñaata la', 'naata la', 'ñaata lay jar', 'naata lay jar', 'sac awa ñaata la', 'njëgam ñaata la', 'njeg bi', 'dàll yi ñaata lañu',
  ],
  livraison: [
    'vous livrez', 'combien coûte la livraison', 'la livraison c\'est combien', 'vous livrez à thiès', 'livraison à touba', 'les frais de livraison',
    'en combien de temps je suis livrée', 'délai de livraison', 'vous livrez en région', 'livraison gratuite', 'quand est-ce que je reçois ma commande',
    'vous livrez à mbour', 'livraison à pikine', 'je suis à kaolack vous livrez', 'livraison dakar', 'combien de jours pour la livraison',
    'ndax dingeen yónnee', 'dingeen ma ko indil', 'yónnee bi ñaata la', 'ñaata fan', 'ci thiès dingeen yónnee', 'ci touba dingeen indi', 'kañ lay agsi', 'livraison bi ñaata la',
  ],
  paiement: [
    'je paye quand je reçois', 'règlement à la réception', 'on règle comment', 'je paie en cash au livreur', 'je vous règle par orange money', 'paiement quand le livreur vient',
    'comment payer', 'je peux payer comment', 'vous acceptez wave', 'paiement orange money', 'je paie à la livraison', 'on paie comment',
    'quels moyens de paiement', 'je peux payer en espèces', 'paiement par carte', 'je dois payer avant', 'le numéro wave', 'payer par wave',
    'naka laay fey', 'naka lañuy fey', 'wave mën naa fey', 'mën naa fey bu ñu ma indilee', 'fey ak orange money', 'nimero wave bi', 'ndax dama wara fey bala',
  ],
  suivi: [
    'où est ma commande', 'suivi de commande', 'ma commande n\'est pas arrivée', 'je veux suivre ma commande', 'où en est ma commande', 'mon colis',
    'le livreur est où', 'quand arrive ma commande', 'j\'ai commandé hier', 'statut de ma commande', 'ma commande MAE-12345',
    'fan la sama commande nekk', 'sama commande agsiwul', 'livreur bi fan la nekk', 'kañ la sama commande di agsi', 'dama commande demb',
  ],
  retour: [
    'vous reprenez les articles', 'reprise possible si ça ne va pas', 'vous acceptez les retours', 'si ça ne convient pas vous remboursez', 'je peux vous le rendre', 'et si la couleur ne me plaît pas',
    'je peux échanger', 'échange possible', 'je peux retourner', 'remboursement', 'si ça ne me va pas', 'retour produit', 'je veux rendre',
    'la pointure ne va pas je peux changer', 'politique de retour', 'je peux changer la couleur après', 'si c\'est trop petit',
    'mën naa ko soppi', 'mën naa ko delloo', 'bu ma neexul mën naa ko delloo', 'soppi pointure', 'bu tuutee mën naa ko soppi',
  ],
  pointure: [
    'quelle pointure choisir', 'guide des tailles', 'je ne connais pas ma pointure', 'ça taille grand ou petit', 'je suis entre deux pointures',
    'comment connaître ma pointure', 'les pointures disponibles', 'vous faites quelles pointures', 'il existe en 41', 'jusqu\'à quelle pointure',
    'ban pointure laay jël', 'xamuma sama pointure', 'pointure yi', 'ban pointure ngeen am', 'am na 41', 'am ngeen 40',
  ],
  boutique: [
    'où est votre boutique', 'vous êtes où', 'adresse de la boutique', 'je peux passer à la boutique', 'vous avez un magasin', 'horaires d\'ouverture',
    'vous êtes ouverts le dimanche', 'où vous trouver', 'je veux venir voir', 'boutique physique', 'vous êtes situés où',
    'fan ngeen nekk', 'fan la boutique bi nekk', 'mën naa ñëw', 'ndax am ngeen boutique', 'kañ ngeen di ubbi',
  ],
  marque: [
    'c\'est du vrai hermès', 'c\'est original', 'c\'est de la marque', 'c\'est authentique', 'c\'est une copie', 'c\'est du chanel',
    'c\'est du gucci', 'c\'est une contrefaçon', 'vous vendez des vraies marques', 'c\'est du vrai zara', 'c\'est tods', 'c\'est de la qualité',
    'dëgg la', 'original la', 'marque dëgg la', 'copie la', 'hermès dëgg la', 'baax na',
  ],
  promo: [
    'vous avez une promo', 'code promo', 'réduction', 'remise', 'il y a des soldes', 'vous faites des prix', 'un bon de réduction', 'une offre',
    'am na promo', 'wàññi njëg bi', 'wanni ma', 'mën ngeen wàññi', 'waññi tuuti', 'am na réduction',
  ],
  cadeau: [
    'offrir à ma maman', 'un cadeau pour ma tante', 'pour faire plaisir à ma sœur', 'je cherche à offrir', 'une surprise pour ma copine', 'offrir pour la fête des mères',
    'c\'est pour offrir', 'idée cadeau', 'un cadeau pour ma mère', 'cadeau pour ma femme', 'emballage cadeau', 'je veux offrir un sac',
    'cadeau d\'anniversaire', 'quoi offrir', 'un cadeau pour ma sœur',
    'dama bëgg may', 'may sama yaay', 'cadeau ngir sama jabar', 'cadeau ngir sama doomu ndey', 'lan laay may',
  ],
  commander: [
    'comment commander', 'comment on fait pour commander', 'je veux commander', 'je veux acheter', 'comment acheter', 'je prends celui-là',
    'je veux ce sac', 'comment passer commande', 'je le prends', 'je veux la dorée', 'ajouter au panier comment', 'c\'est bon je prends',
    'naka laay jënde', 'dama bëgg jënd', 'dama koy jënd', 'naka laay commande', 'jël naa ko', 'kii laa bëgg', 'dama bëgg kii',
  ],
  humain: [
    'votre numéro whatsapp', 'donnez-moi votre whatsapp', 'je veux vous écrire sur whatsapp', 'le contact de la boutique', 'je peux vous appeler', "passez-moi quelqu'un",
    'je veux parler à quelqu\'un', 'parler à une personne', 'un conseiller', 'appeler la boutique', 'votre numéro', 'whatsapp', 'je veux appeler',
    'je veux parler à la gérante', 'contact', 'numéro de téléphone',
    'dama bëgg wax ak nit', 'dama bëgg wax ak yeen', 'nimero bi', 'woo ma', 'dama bëgg woo', 'yónnee ma nimero bi',
  ],
  fete: [
    'c\'est quand la tabaski', 'la korité c\'est quand', 'date du magal', 'quand est le gamou', 'la tabaski tombe quand', 'dans combien de jours la korité',
    'kañ la tabaski', 'kañ la kori', 'kan la tabaski', 'magal bi kañ la',
  ],
  moins_cher: [
    'moins cher', 'c\'est trop cher', 'vous avez moins cher', 'plus abordable', 'un peu moins cher', 'mon budget est petit', 'trop cher pour moi',
    'dafa cher', 'dafa jafe', 'lu gën a yomb', 'am na lu yomb', 'dafa seer', 'njëg bi dafa rëy',
  ],
  autres: [
    'autre chose', 'd\'autres modèles', 'montrez-moi d\'autres', 'autres couleurs', 'vous avez autre chose', 'pas ça', 'une autre', 'encore',
    'leneen', 'yeneen', 'wone ma yeneen', 'am na yeneen', 'yeneen melo', 'du kii',
  ],
  oui: [
    'oui', 'ouais', 'oui svp', 'd\'accord', 'ok', 'volontiers', 'bien sûr', 'oui merci', 'avec plaisir', 'ça marche',
    'waaw', 'waw', 'waaw kay', 'baax na', 'mu ngi baax', 'waaw waaw',
  ],
  non: [
    'non', 'non merci', 'pas maintenant', 'pas besoin', 'ça ira', 'plus tard', 'non c\'est bon',
    'déedéet', 'dedet', 'deedeet', 'déedéet jërëjëf', 'du leegi',
  ],
  plainte: [
    'le produit est cassé', "l'article est déchiré", 'il y a un défaut', 'le sac est abîmé', 'reçu en mauvais état', 'la chaussure est cassée', 'mauvaise couleur reçue',
    'j\'ai un problème', 'ma commande est abîmée', 'ce n\'est pas ce que j\'ai commandé', 'je ne suis pas contente', 'le livreur ne répond pas', 'j\'ai payé mais rien',
    'erreur dans ma commande', 'il manque un article', 'je veux faire une réclamation',
    'am naa jafe jafe', 'sama commande dafa yàqu', 'neexu ma', 'fey naa waaye dara agsiwul', 'livreur bi tontuwul',
  ],
};
