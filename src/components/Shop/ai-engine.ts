/**
 * ALLÔ BÉTON IA — Moteur conversationnel privé (100% navigateur)
 * Aucune dépendance externe. Données ne quittent jamais le device.
 */

export interface ConversationContext {
  history: { role: 'user' | 'bot'; text: string }[];
  project: {
    surface?: number;
    epaisseur?: number;
    longueur?: number;
    largeur?: number;
    hauteur?: number;
    etages?: number;
  };
  count: number;
}

export interface AIResponse {
  text: string;
  intent: string;
  followUp?: string[];
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[!?.,;:]+/g, ' ').replace(/\s+/g, ' ');

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const fmt = (n: number) => n.toLocaleString('fr-FR');

// === EXTRACTION ENTITÉS ===
interface Ent {
  surface?: number; epaisseur?: number;
  longueur?: number; largeur?: number; hauteur?: number;
  diametre?: number; etages?: number;
  classe?: string; ouvrage?: string;
}

export const extract = (input: string): Ent => {
  const t = norm(input);
  const e: Ent = {};
  let m;
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metres?\s*carres?)/))) e.surface = parseFloat(m[1].replace(',','.'));
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*cm/))) e.epaisseur = parseFloat(m[1].replace(',','.'));
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*[x*×]\s*(\d+(?:[.,]\d+)?)/))) {
    e.longueur = parseFloat(m[1].replace(',','.'));
    e.largeur = parseFloat(m[2].replace(',','.'));
  }
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*m(?:etres?)?\s*(?:de\s+)?(?:haut|hauteur)/))) e.hauteur = parseFloat(m[1].replace(',','.'));
  if ((m = t.match(/ha\s*(\d+)/))) e.diametre = parseInt(m[1]);
  if ((m = t.match(/r\s*\+\s*(\d+)|(\d+)\s*etages?/))) e.etages = parseInt(m[1] || m[2]);
  if ((m = t.match(/\bb\s*(15|20|25|30|35|40)\b/))) e.classe = `B${m[1]}`;
  if (/\bdalle/.test(t)) e.ouvrage = 'dalle';
  else if (/\bfondation|semelle/.test(t)) e.ouvrage = 'fondation';
  else if (/\bpoteau|colonne/.test(t)) e.ouvrage = 'poteau';
  else if (/\bpoutre|linteau/.test(t)) e.ouvrage = 'poutre';
  else if (/\bmur|cloison/.test(t)) e.ouvrage = 'mur';
  else if (/\bmaison|villa/.test(t)) e.ouvrage = 'maison';
  return e;
};

// === DÉTECTION INTENTION ===
const INTENTS: { id: string; pat: RegExp[]; pri: number }[] = [
  { id: 'greeting', pri: 10, pat: [/^(bonjour|bonsoir|salut|hello|hi|hey|coucou|salam|asalamou|bjr|bsr|slt|cc)\b/] },
  { id: 'thanks', pri: 10, pat: [/merci|thanks|jerejef|jaraama/] },
  { id: 'goodbye', pri: 10, pat: [/au revoir|bye|a bientot|ciao|adieu/] },
  { id: 'how_are_you', pri: 10, pat: [/(ca|cava) va|comment vas tu|tu vas bien/] },
  { id: 'name', pri: 9, pat: [/qui es tu|comment t.appelle|c.est qui|tu es qui|ton nom/] },
  { id: 'capabilities', pri: 9, pat: [/que peux.tu|tu sais quoi|tes capacites|aide moi|que sais.tu/] },
  { id: 'calc_dalle', pri: 9, pat: [/calcul.*dalle|dalle.*combien|beton.*dalle|combien.*dalle/] },
  { id: 'calc_fondation', pri: 9, pat: [/calcul.*fondation|fondation.*combien|beton.*fondation|beton.*semelle/] },
  { id: 'calc_mur', pri: 9, pat: [/calcul.*mur|mur.*combien|combien.*parpaing/] },
  { id: 'calc_general', pri: 8, pat: [/calcul|combien.*faut|quantite|m.trer/] },
  { id: 'price_beton', pri: 9, pat: [/prix.*beton|beton.*prix|tarif.*beton|cout.*beton/] },
  { id: 'price_ciment', pri: 9, pat: [/prix.*ciment|ciment.*prix|tarif.*ciment|prix.*sac/] },
  { id: 'price_fer', pri: 9, pat: [/prix.*fer|fer.*prix|prix.*ha\d|prix.*armature|prix.*barre/] },
  { id: 'price_sable', pri: 9, pat: [/prix.*sable|sable.*prix/] },
  { id: 'price_gravier', pri: 9, pat: [/prix.*gravier|gravier.*prix|prix.*granulat/] },
  { id: 'price_parpaing', pri: 9, pat: [/prix.*parpaing|parpaing.*prix|prix.*bloc|prix.*hourdis/] },
  { id: 'price_general', pri: 7, pat: [/prix|tarif|combien.*coute|cout/] },
  { id: 'adv_dalle', pri: 8, pat: [/comment.*dalle|conseil.*dalle|epaisseur.*dalle|faire.*dalle/] },
  { id: 'adv_fondation', pri: 8, pat: [/comment.*fondation|profondeur.*fondation|conseil.*fondation/] },
  { id: 'adv_poteau', pri: 8, pat: [/comment.*poteau|section.*poteau|dimension.*poteau/] },
  { id: 'adv_poutre', pri: 8, pat: [/comment.*poutre|hauteur.*poutre|section.*poutre/] },
  { id: 'adv_cure', pri: 8, pat: [/cure|durci|prise|sechage|arrosage|chaleur|chaud|temperature|tropical/] },
  { id: 'adv_maison', pri: 8, pat: [/construire.*maison|construire.*villa|cout.*maison|prix.*maison/] },
  { id: 'adv_dosage', pri: 8, pat: [/dosage|melange|proportion|recette/] },
  { id: 'compare_class', pri: 8, pat: [/difference.*b\d+|quel.*classe.*beton|b25.*ou.*b30|classe.*beton/] },
  { id: 'compare_ciment', pri: 8, pat: [/difference.*cpa.*cpj|cpa.*ou.*cpj/] },
  { id: 'compare_sable', pri: 8, pat: [/sable.*mer.*ou.*carriere|quel.*sable|difference.*sable/] },
  { id: 'delivery', pat: [/livraison|livrer|delai|expedier|envoi/], pri: 7 },
  { id: 'payment', pat: [/paie|paiement|wave|orange money|carte|virement|comment.*payer/], pri: 7 },
  { id: 'order', pat: [/comment.*commander|passer.*commande|comment.*acheter/], pri: 7 },
  { id: 'contact', pat: [/contact|telephone|appeler|numero|whatsapp|email|joindre|adresse/], pri: 7 },
  { id: 'hours', pat: [/horaire|heure.*ouverture|ouvert|fermeture/], pri: 7 },
  { id: 'company', pat: [/qui.*allo beton|votre societe|allo beton.*c.est quoi|presentation/], pri: 7 },
  { id: 'complaint', pat: [/probleme|reclamation|insatisfait|defaut|mauvais/], pri: 8 },
  { id: 'norms', pat: [/norme|reglement|nf|iso|certification/], pri: 7 },
  { id: 'joke', pat: [/blague|fais rire|drole/], pri: 7 },
  { id: 'language', pat: [/tu parles|wolof|francais|english|langue/], pri: 7 },
  // === Nouveaux corps de m\u00e9tier ===
  { id: 'toiture', pat: [/toit|toiture|charpente|tuile|ardoise|tole|bac acier/], pri: 8 },
  { id: 'plomberie', pat: [/plomb|tuyau|robinet|pvc|wc|salle de bain|douche|baignoire|chauffe.eau|fosse septique/], pri: 8 },
  { id: 'electricite', pat: [/electric|cable|prise|interrupteur|tableau electrique|disjoncteur|gaine|fil/], pri: 8 },
  { id: 'peinture', pat: [/peinture|peindre|pot|enduit|crepi|badigeon|couleur mur/], pri: 8 },
  { id: 'carrelage', pat: [/carrelage|carreau|faience|gres|colle.*carrelage|joint/], pri: 8 },
  { id: 'isolation', pat: [/isolation|isoler|laine|polystyrene|thermique|phonique/], pri: 8 },
  { id: 'menuiserie', pat: [/porte|fenetre|menuiserie|alu|pvc|bois|cadre/], pri: 7 },
  { id: 'permis', pat: [/permis.*construire|autorisation|mairie|plan.*architect|cadastre/], pri: 8 },
  { id: 'devis', pat: [/devis|estimation|cotation|chiffrage/], pri: 8 },
  { id: 'budget', pat: [/budget|combien.*pret|j.ai.*fcfa|economiser|moins cher/], pri: 8 },
  { id: 'main_oeuvre', pat: [/main.d.oeuvre|ouvrier|macon|tacheron|salaire|tarif.*ouvrier/], pri: 8 },
  { id: 'duree_chantier', pat: [/duree.*chantier|combien.*temps|delai.*construire|combien.*mois/], pri: 8 },
  { id: 'materiaux_eco', pat: [/ecologique|durable|bio|terre.*cuite|brique.*terre|geobeton/], pri: 7 },
  { id: 'rehab', pat: [/renover|renovation|rehabilit|extension|agrandissement/], pri: 7 },
  { id: 'fissures', pat: [/fissure|craque|lezarde|microfissure/], pri: 8 },
  { id: 'humidite', pat: [/humidite|moisi|infiltration|remontee.*eau|salpetre/], pri: 8 },
  { id: 'sol_etude', pat: [/etude.*sol|geotechnique|carottage|portance/], pri: 7 },
  { id: 'piscine', pat: [/piscine|bassin/], pri: 7 },
  { id: 'cloture', pat: [/cloture|mur.*cloture|portail|grille/], pri: 7 },
  { id: 'escalier', pat: [/escalier|marche|paliers/], pri: 7 },
  { id: 'terrasse', pat: [/terrasse|balcon|veranda/], pri: 7 },
  { id: 'transport', pat: [/transport|camion|toupie|benne/], pri: 7 },
  { id: 'stockage', pat: [/stockage|entrepot|conserver|conserver.*ciment/], pri: 7 },
  { id: 'parpaing_creux', pat: [/parpaing.*creux|hourdis|brique.*creuse/], pri: 7 },
  { id: 'recommend', pat: [/recommand|conseill|que pensez|votre avis|que faire/], pri: 6 },
];

const detect = (input: string): string => {
  const t = norm(input);
  for (const m of [...INTENTS].sort((a,b) => b.pri - a.pri)) {
    for (const p of m.pat) if (p.test(t)) return m.id;
  }
  return 'unknown';
};

// === RÉPONSES (variations naturelles) ===
const R = {
  greetings: [
    "Bonjour ! 👋 Je suis l'IA Allô Béton, votre experte BTP au Sénégal. Comment puis-je vous aider ?",
    "Salam aleykoum ! 🤝 Bienvenue chez Allô Béton. Parlez-moi de votre projet de construction !",
    "Hello ! 😊 Ravie de vous accueillir. Vous avez un chantier en vue ? Je suis là pour vous conseiller.",
  ],
  thanks: [
    "Avec plaisir ! 😊 Bonne continuation pour votre projet.",
    "De rien ! 🙏 Je suis là 24h/24. À très bientôt !",
    "C'est ma mission ! ✨ Allô Béton à votre service.",
  ],
  goodbye: [
    "Au revoir ! 👋 Bon chantier et à bientôt sur Allô Béton.",
    "À bientôt ! 🚀 Que votre projet soit une réussite.",
    "Salam ! 🤲 Revenez quand vous voulez.",
  ],
  how_are_you: [
    "Très bien merci ! 💙 Je suis prête pour toutes vos questions BTP. Et votre chantier ?",
    "Au top ! 😊 Je viens d'aider plusieurs clients. Que puis-je pour vous ?",
  ],
};

// === GÉNÉRATEURS ===
const calcDalle = (e: Ent, ctx: ConversationContext): string => {
  const surf = e.surface ?? ctx.project.surface ?? (e.longueur && e.largeur ? e.longueur * e.largeur : null);
  const ep = (e.epaisseur ?? ctx.project.epaisseur ?? 15) / 100;
  if (!surf) {
    return `Pour calculer votre dalle, donnez-moi les dimensions ! 📐\n\n• La **surface** en m² (ex: 50m²)\n• L'**épaisseur** en cm (par défaut 15)\n\nExemple : *"dalle de 40m² à 12cm"*`;
  }
  const v = surf * ep;
  const sacs = Math.ceil(v * 350 / 50);
  const sable = v * 0.68, gravier = v * 1.15, fer = v * 80;
  const cout = Math.round(v * 85000 + sacs * 4250 + sable * 12000 + gravier * 13500 + fer * 700);
  return `Très bien ! 👌 Pour une **dalle de ${surf.toFixed(1)} m² à ${(ep * 100).toFixed(0)} cm** :\n\n📦 **Béton :** ${v.toFixed(2)} m³\n🪣 **Ciment :** ${sacs} sacs de 50kg\n🏖️ **Sable :** ${sable.toFixed(2)} tonnes\n🪨 **Gravier :** ${gravier.toFixed(2)} tonnes\n🔩 **Fer :** ${fer.toFixed(0)} kg\n\n💰 **Coût total estimé : ${fmt(cout)} FCFA**\n\n💡 *Mon conseil :* béton **B25** + armatures HA10 quadrillage 15×15 cm. Idéal pour 95% des dalles au Sénégal !\n\nVoulez-vous que je vous oriente vers les produits ?`;
};

const calcMur = (e: Ent, ctx: ConversationContext): string => {
  const L = e.longueur ?? ctx.project.longueur;
  const H = e.hauteur ?? e.largeur ?? ctx.project.hauteur;
  if (!L || !H) {
    return `Pour calculer votre mur, donnez-moi les dimensions ! 📐\n\nExemple : *"mur de 8m de long sur 3m de haut"* ou *"mur 8x3"*.\n\nJe calculerai parpaings, ciment, sable et coût total instantanément.`;
  }
  const s = L * H;
  const pp = Math.ceil(s * 12.5);
  const sacs = Math.ceil(s * 25 / 50);
  const sable = s * 0.04;
  const cout = Math.round(pp * 450 + sacs * 4250 + sable * 12000);
  return `Pour un **mur de ${L}m × ${H}m** (${s.toFixed(1)} m²) :\n\n🧱 **Parpaings 20** : ${fmt(pp)} pièces\n🪣 **Ciment** : ${sacs} sacs (mortier)\n🏖️ **Sable** : ${sable.toFixed(2)} m³\n\n💰 **Coût estimé : ${fmt(cout)} FCFA**\n\n💡 Prévoyez 5-10% de plus pour les pertes. Pensez aux chaînages tous les 3m pour la solidité !`;
};

const calcFondation = (e: Ent): string => {
  const L = e.longueur;
  if (!L) {
    return `Pour vos fondations au Sénégal, je conseille :\n\n📐 **Largeur semelle** : 40-60 cm\n📏 **Profondeur** : 80 cm minimum (sol sableux à Dakar)\n🧱 **Béton** : **B25** + 5cm de B15 propreté\n🔩 **Armatures** : 4 HA12 minimum + étriers HA8 / 15cm\n\nDonnez-moi le périmètre de votre maison pour calculer.\nExemple : *"fondation maison 10x8"*`;
  }
  const v = L * 4 * 0.4 * 0.4;
  return `Pour une fondation de **${L}m de côté** (~${L*4}m de périphérie) :\n\n📦 Béton estimé : **${v.toFixed(2)} m³** (~${fmt(Math.round(v * 85000))} FCFA)\n🧱 **B25** recommandé (B30 si sol agressif)\n🔩 HA12 pour les filants\n\n⚠️ Faites une étude de sol si possible — sols côtiers ou argileux demandent des fondations plus larges.`;
};

const TEXT = {
  name: () => `Je suis **l'IA Allô Béton** 🤖, créée pour vous accompagner sur vos projets BTP au Sénégal.\n\n💪 Mes super-pouvoirs :\n• Connaissance complète du marché BTP sénégalais\n• Calculs instantanés de quantités\n• **100% privée** — vos questions ne quittent jamais votre navigateur\n• Disponible **24h/24, gratuite**\n\nTestez-moi : posez n'importe quelle question BTP ! 😊`,

  capabilities: () => `Voici tout ce que je sais faire ! 🚀\n\n🧮 **Calculer** :\n• Béton, ciment, fer, sable, gravier\n• Pour dalles, fondations, murs, poteaux, poutres\n\n💰 **Donner les prix 2026** :\n• Tous nos produits\n• Promos en cours\n\n🏗️ **Conseiller** :\n• Choix matériaux\n• Dosages, cure par temps chaud\n• Normes BTP Sénégal\n\n📞 **Vous orienter** :\n• Commande, livraison, paiement\n\n*Exemple* : "Combien de fer pour une dalle de 80m² ?"`,

  priceBeton: () => `Tarifs **béton 2026** (livraison incluse dès 5m³ sur Dakar) :\n\n• **B15** (propreté) : 65 000 FCFA/m³\n• **B20** (dallage) : 75 000 FCFA/m³\n• **B25** (structures) ⭐ : 85 000 FCFA/m³\n• **B30** (haute perf.) : 95 000 FCFA/m³\n• **B35** (spécial) : 110 000 FCFA/m³\n\n💡 Le **B25** convient à 95% des constructions classiques.\n\nJe calcule pour votre projet ?`,

  priceCiment: () => `Prix **ciment** (sacs 50kg) :\n\n• **CPA 32.5** : 4 250 FCFA — maçonnerie ⭐\n• **CPA 42.5** : 4 750 FCFA — béton armé\n• **CPJ 32.5** : 4 100 FCFA — économique\n• **CPJ 42.5** : 4 500 FCFA — bon compromis\n\n🏭 Marques : Sococim, Dangote, Ciments du Sahel\n🎁 **-15%** avec le code **CIMENT15** !`,

  priceFer: () => `Prix **fer à béton HA** (barres 12m) :\n\n• **HA8** : 3 900 FCFA — étriers\n• **HA10** : 6 100 FCFA — dalles ⭐\n• **HA12** : 8 800 FCFA — poteaux ⭐\n• **HA14** : 12 000 FCFA — structures\n• **HA16** : 16 000 FCFA — grandes portées\n\n📏 1 barre HA10 = 7,4 kg | HA12 = 10,7 kg`,

  priceSable: () => `Prix **sable** (à la tonne) :\n\n• **Mer** : 8 500 FCFA — économique ⚠️ à laver\n• **Carrière** ⭐ : 12 000 FCFA — recommandé\n• **Lavé** : 15 000 FCFA — finition haut de gamme\n\n💡 Pour 1m³ de béton : 0,68 tonnes de sable.`,

  priceGravier: () => `Prix **granulats** (tonne) :\n\n• **Gravier 3/8** : 14 000 FCFA — finition\n• **Gravier 8/16** ⭐ : 13 500 FCFA — usuel\n• **Gravier 15/25** : 13 000 FCFA — gros béton\n\n💡 Pour 1m³ béton : 1,15 tonnes de 8/16.`,

  priceParpaing: () => `Prix **parpaings & blocs** :\n\n• **Parpaing 15** : 350 FCFA — cloisons\n• **Parpaing 20** ⭐ : 450 FCFA — murs porteurs\n• **Hourdis 16+4** : 950 FCFA — planchers\n• **Hourdis 20+4** : 1 150 FCFA — grandes portées\n• **Brique pleine** : 280 FCFA\n\n📐 1m² de mur (parpaing 20) = ~12 pièces.`,

  advCure: () => `Excellente question ! 🌡️ Au Sénégal la chaleur fait fissurer le béton. Conseils essentiels :\n\n💧 **Arroser** 2-3 fois/jour pendant **7 jours minimum** (10j en saison sèche)\n☀️ **Protéger** du soleil direct (bâche, sable humide)\n⏰ **Bétonner** tôt le matin (5h-9h) ou en fin d'après-midi\n🧊 Utiliser de l'**eau fraîche** pour le gâchage\n\n📅 **Délais** :\n• Décoffrage côtés : 24-48h\n• Décoffrage planchers : 7-14 jours\n• Résistance max : **28 jours**\n\n⚠️ **Erreur fatale** : laisser sécher au soleil sans arroser → fissures garanties.`,

  advDalle: () => `Pour réussir votre dalle au Sénégal :\n\n📐 **Épaisseur** :\n• Cloisons : 12 cm\n• Standard R+1 : 15 cm ⭐\n• Lourde R+2 : 18-20 cm\n\n🧱 Béton **B25** minimum (350 kg ciment/m³)\n🔩 Armatures **HA10** quadrillage 15×15 cm\n📏 Enrobage 2,5 cm minimum\n💧 **Cure 7 jours obligatoire**\n\n🏗️ *Astuce pro* : joint de dilatation tous les 6m + treillis soudé en partie haute = zéro fissure.`,

  advFondation: () => `Les fondations c'est la base ! 🏗️ Au Sénégal :\n\n📐 **Semelle filante** : 40-60 cm de large\n📏 **Profondeur** : 80 cm min (1m sur sol argileux)\n🧱 **Béton de propreté** : 5cm de B15 dessous\n🧱 **Fondation** : **B25** (B30 si milieu agressif)\n🔩 4 HA12 + étriers HA8/15cm\n📏 Enrobage 3 cm\n\n⚠️ **Attention** :\n• Sols sableux côtiers : élargir à 60 cm\n• Sols argileux : prévoir drainage\n• Étude de sol pour gros projets`,

  advPoteau: (e: Ent, ctx: ConversationContext) => {
    const et = e.etages ?? ctx.project.etages ?? 1;
    const sec = et >= 2 ? 25 : 20;
    return `Pour vos poteaux ${et > 1 ? `(R+${et})` : '(R+1)'} :\n\n📐 **Section** : **${sec}×${sec} cm** minimum\n🧱 **Béton** : **B25** (B30 pour étages)\n🔩 **Principales** : ${et >= 2 ? '6 HA14' : '4 HA12'}\n🔩 **Étriers** : HA8 / 15 cm courant, **7 cm** zones critiques\n📏 **Enrobage** : 2,5 cm min\n\n💡 *Règle* : ne jamais réduire la section d'un étage à l'autre.`;
  },

  advPoutre: () => `Pour vos poutres en béton armé : 🏗️\n\n📐 **Hauteur** : H ≈ L/10 (portée 4m → 40cm)\n📐 **Largeur** : b ≈ H/2 (mini 20 cm)\n🧱 **Béton** : B25 minimum\n🔩 **Armatures basses** : HA12-HA14\n🔩 **Hautes** : HA10\n🔩 **Étriers** : HA8 / 15-20 cm`,

  advMaison: () => `Construire au Sénégal, super projet ! 🏠 Estimation 2026 :\n\n💰 **Coût moyen** (matériaux + MO) :\n• R+0 simple (80m²) : **15-25 M FCFA**\n• R+1 (150m²) : **30-50 M FCFA**\n• Villa moderne (250m²) : **60-100 M+**\n\n📊 Postes : Gros œuvre 40% • Finitions 25% • Plomberie/élec 15% • Menuiseries 10%\n\n📋 Étapes : Plans → Fondations → Élévation → Toiture → Finitions\n\nVous avez les plans ? Je peux estimer les matériaux !`,

  advDosage: () => `**Dosage du béton** ! 🧪 Pour 1 m³ :\n\n**B20 (300 kg ciment)** :\n• 6 sacs ciment + 690 kg sable + 1175 kg gravier + 175 L eau\n\n**B25 (350 kg) ⭐** :\n• 7 sacs + 680 kg sable + 1145 kg gravier + 175 L eau\n\n**B30 (400 kg)** :\n• 8 sacs + 660 kg sable + 1115 kg gravier + 180 L eau\n\n💡 **Règle "1-2-3"** pour B25 : 1 vol. ciment + 2 sable + 3 gravier + ½ eau\n\n⚠️ Trop d'eau = béton faible !`,

  cmpClass: () => `Quelle classe choisir ? 📊\n\n🏠 **B15** : propreté, calage. Pas de structure.\n🚪 **B20** : dallages légers, fondations courantes.\n🏘️ **B25** ⭐ : **STANDARD** béton armé, 95% des maisons R+0/R+1.\n🏢 **B30** : R+2+, milieux agressifs, villas modernes.\n🌉 **B35** : ouvrages spéciaux.\n\n💡 *Règle simple* : en cas de doute, **B25**.`,

  cmpCiment: () => `**CPA** vs **CPJ** : 🤔\n\n🏭 **CPA (Portland Artificiel)** :\n• Pur, plus résistant\n• Idéal béton structurel\n• ⭐ Fondations, poteaux, dalles\n\n🌿 **CPJ (avec ajouts)** :\n• Plus économique (-5-10%)\n• Bon pour mortier\n• ⭐ Hourdage, chape\n\n💡 Conseil : **CPA 32.5** pour béton armé, **CPJ 32.5** pour mortier.`,

  cmpSable: () => `**Sable mer** vs **carrière** : 🏖️\n\n🌊 **Mer** :\n• 8 500 FCFA/t — économique\n• ⚠️ Contient du sel — corrode le fer !\n• OK mortier non structurel après lavage\n\n🏔️ **Carrière** ⭐ :\n• 12 000 FCFA/t\n• Propre, sans sel\n• **Indispensable béton armé**\n\n💡 Pour le béton, toujours du sable de carrière !`,

  delivery: () => `Notre **livraison** ! 🚚\n\n📍 **Zones** : Dakar (24-48h), Thiès (48h), Saint-Louis (48-72h)\n🚛 **Camions toupie** béton 6-8m³ • **Plateau** matériaux secs\n💰 **Frais** : dès 5 000 FCFA Dakar centre\n🎁 **GRATUITE** dès **500 000 FCFA** sur Dakar !\n📲 Suivi temps réel sur votre espace client.\n\nVous êtes dans quelle zone ?`,

  payment: () => `Vous pouvez payer **comme vous voulez** ! 💳\n\n📱 **Mobile Money** (rapide) : Wave, Orange Money, Free Money\n💳 **Carte bancaire** : Visa, Mastercard, GIM-UEMOA\n🏦 **Virement bancaire** (pros, NINEA)\n💵 **Espèces** à la livraison\n📅 **Crédit pro** (entreprises validées)\n\n🔒 Tout est sécurisé SSL 256-bit.`,

  order: () => `Pour passer **commande**, c'est simple ! 🛒\n\n1️⃣ Parcourez le **catalogue** (28+ produits)\n2️⃣ Ajoutez au panier\n3️⃣ Validez votre adresse de livraison\n4️⃣ Payez avec **Wave, OM, carte** ou virement\n5️⃣ Recevez votre confirmation par email\n6️⃣ Livraison en **24-48h** sur Dakar\n\nBesoin d'aide ? Appelez le **+221 33 800 12 34** ou commandez en ligne ! 🚀`,

  contact: () => `Pour nous joindre par tous les canaux ! 📞\n\n☎️ **Tél** : +221 33 800 12 34\n💬 **WhatsApp** : +221 77 XXX XX XX\n📧 **Email** : contact@allobeton.sn\n🌐 **Site** : https://allobeton.sn\n📍 **Bureaux** : Dakar, Sénégal\n\n🕐 **Horaires** : Lun-Ven 8h-18h, Sam 8h-13h\n\n⚡ Et moi je suis là **24h/24** sur le chat !`,

  hours: () => `Nos **horaires d'ouverture** : 🕐\n\n• **Lundi - Vendredi** : 8h - 18h\n• **Samedi** : 8h - 13h\n• **Dimanche** : fermé\n\n🤖 Mais moi, l'IA, je suis là **24h/24, 7j/7** ! Posez vos questions à toute heure.`,

  company: () => `**Allô Béton**, c'est plus qu'une boutique ! 🏗️\n\n🏢 **Société** : ICOPS SUARL — basée à Dakar\n🎯 **Mission** : démocratiser l'accès aux matériaux BTP de qualité au Sénégal\n\n✨ **Nos forces** :\n• 🤖 IA conseillère 24h/24\n• 📱 Paiements mobiles (Wave, OM, Free Money)\n• � Livraison rapide sur tout Dakar\n• 💰 Prix transparents et compétitifs\n• � Catalogue complet (28+ produits)\n\nDécouvrez notre histoire complète sur la page **À propos** !`,

  complaint: () => `Je suis vraiment désolée d'apprendre cela. 😔 Votre satisfaction est notre priorité.\n\n📞 **Contactez immédiatement** :\n• Tél : +221 33 800 12 34\n• Email : contact@allobeton.sn\n\n📋 Préparez :\n• Numéro de commande\n• Photos du problème\n• Date de livraison\n\nNous résolvons **95% des réclamations en 48h**. Vous êtes en bonnes mains.`,

  norms: () => `Les **normes BTP** au Sénégal sont alignées sur le système français/européen :\n\n📜 **Béton** : NF EN 206-1 / DTU 21\n📜 **Aciers** : NF A 35-080 (HA = haute adhérence)\n📜 **Ciments** : NF EN 197-1 (CPA, CPJ, classes 32.5/42.5)\n📜 **Granulats** : NF EN 12620\n\n🇸🇳 **Sénégal** : règlement des constructions urbaines + études de sol obligatoires pour bâtiments publics.\n\nNos produits respectent les normes en vigueur.`,

  joke: () => pick([
    "🤣 Pourquoi le béton va chez le psy ? Parce qu'il subit trop de pression !\n\nBon, retournons à votre projet ! 😄",
    "😄 Que dit un parpaing à un autre ? \"On forme un beau couple !\"\n\nAllez, comment puis-je vous aider ?",
    "🙃 Pourquoi le ciment est si calme ? Il a fait sa cure !\n\nÇa vous a fait sourire ? Maintenant parlons de votre chantier !",
  ]),

  language: () => `Pour l'instant je parle principalement **français** 🇫🇷\n\n🚀 Bientôt disponibles :\n• 🇸🇳 Wolof\n• 🇬🇧 Anglais\n• 🇸🇳 Pulaar\n\nN'hésitez pas à me poser vos questions en français !`,

  unknown: () => pick([
    `Hmm, je ne suis pas certaine d'avoir bien compris. 🤔\n\nVoici quelques exemples :\n• 💰 *"Prix du ciment"*\n• 🧮 *"Béton pour dalle de 50m²"*\n• 🏗️ *"Comment faire des fondations"*\n• 🚚 *"Délais de livraison"*\n\nReformulez votre question, je suis là !`,
    `Excellente question, mais je n'ai pas la réponse précise dans ma base. 📚\n\nMa spécialité : **BTP au Sénégal** (calculs, prix, conseils, livraison).\n\nPouvez-vous reformuler ? Ou appelez le **+221 33 800 12 34**.`,
    `Pas sûre de bien saisir... 😊 Pouvez-vous reformuler ?\n\nMon expertise : matériaux BTP (béton, ciment, fer, sable, parpaings).\n\nPour les questions plus spécifiques, notre équipe humaine est joignable au **+221 33 800 12 34**.`,
  ]),

  general: () => `Quel matériau vous intéresse ? 💰\n\nJe peux vous donner les prix de :\n• 🧱 Béton (B15 à B35)\n• 📦 Ciment (CPA, CPJ)\n• 🔩 Fer à béton (HA8 à HA20)\n• 🏖️ Sable (mer, carrière, lavé)\n• 🪨 Gravier\n• 🧱 Parpaings, hourdis\n\nPrécisez !`,
  toiture: () => `Pour la **toiture** au Sénégal : 🏠\n\n🌞 **Tôle bac acier** ⭐ : 4 500-6 500 FCFA/m² — la plus utilisée\n🏛️ **Tuile** : 8 000-15 000 FCFA/m²\n🪵 **Charpente bois rouge** : ~12 000 FCFA/m² posé\n🧱 **Dalle béton + acrotère** : 35 000-50 000 FCFA/m²\n\n💡 Recommandé : **tôle bac acier prélaquée** (résiste au sel marin) avec isolation sous-jacente.`,
  plomberie: () => `**Plomberie** maison standard : 🚿\n\n💧 **Tuyaux PVC** :\n• Évacuation Ø100 : 2 800 FCFA/m\n• Pression Ø20 : 850 FCFA/m\n• PER eau froide/chaude : 1 200 FCFA/m\n\n🚽 **Sanitaires** :\n• WC complet : 75 000-150 000 FCFA\n• Lavabo + robinet : 35 000-80 000 FCFA\n• Chauffe-eau 100L : 95 000-180 000 FCFA\n\n🏗️ **Fosse septique 3m³** : 250 000-400 000 FCFA\n\n💡 Comptez 8-12% du budget maison.`,
  electricite: () => `**Électricité** maison : ⚡\n\n🔌 **Câbles** :\n• 3G2.5 (prises) : 850 FCFA/m\n• 3G1.5 (éclairage) : 600 FCFA/m\n• 4G6 alimentation : 2 500 FCFA/m\n\n🎛️ **Tableau** :\n• Coffret 12 modules : 35 000 FCFA\n• Différentiel 30mA : 18 000 FCFA\n• Disjoncteurs : 3 500-8 000 FCFA\n\n🔆 Prises/inter : 1 500-1 800 FCFA pièce\n\n💡 Budget 6-10% maison. **Électricien certifié SENELEC obligatoire**.`,
  peinture: () => `**Peinture** : 🎨\n\n🏠 **Intérieure** :\n• Acrylique mate (15L) : 18 000-35 000 FCFA — couvre ~120 m²\n• Lessivable cuisine/SDB : 25 000-45 000 FCFA\n\n🌞 **Extérieure** :\n• Façade (15L) : 35 000-60 000 FCFA\n• Crépi tyrolien : 4 500 FCFA/m² posé\n\n🎯 Enduit (25kg) : 8 500 FCFA • Sous-couche : 22 000 FCFA\n\n💡 2 couches + sous-couche minimum. Choisissez **anti-UV** pour l'extérieur.`,
  carrelage: () => `**Carrelage** : 🧱\n\n📐 **Prix au m²** :\n• Sol intérieur : 4 500-12 000 FCFA\n• Extérieur antidérapant : 6 500-15 000 FCFA\n• Faïence murale : 5 000-10 000 FCFA\n• Grès cérame premium : 15 000-30 000 FCFA\n\n🛠️ Colle (25kg) : 8 500 FCFA (5m²) • Joint (5kg) : 3 500 FCFA\n\n💡 Prévoyez **+10% coupes**. Pose pro : 5 000-7 000 FCFA/m².`,
  isolation: () => `L'**isolation** est cruciale au Sénégal ! 🌡️\n\n🌞 **Toiture** (priorité !) :\n• Laine de verre 100mm : 2 800 FCFA/m²\n• Polystyrène expansé : 3 500 FCFA/m²\n• Mousse polyuréthane : 5 500 FCFA/m²\n\n🧱 **Murs** :\n• Doublage placo + laine : 8 500 FCFA/m²\n\n💡 Toits clairs réfléchissants + isolation = **-8°C en intérieur** !`,
  menuiserie: () => `**Menuiserie** : 🚪\n\n🪟 **Fenêtres** :\n• Alu standard 1×1m : 45 000-80 000 FCFA\n• PVC double vitrage : 65 000-120 000 FCFA\n• Fer forgé sur mesure : 35 000-90 000 FCFA\n\n🚪 **Portes** :\n• Intérieure bois : 35 000-90 000 FCFA\n• Entrée blindée : 250 000-700 000 FCFA\n• Coulissante alu : 180 000-450 000 FCFA\n\n💡 Privilégiez l'**alu thermolaqué** (résiste au sel) ou le **bois traité**.`,
  permis: () => `**Permis de construire** au Sénégal : 📋\n\n📝 **Documents** :\n• Plans d'architecte agréé (3 jeux)\n• Titre de propriété\n• Étude de sol\n• Photos terrain\n\n🏛️ **Procédure** :\n1. Dépôt **Mairie** ou **DUC**\n2. Délai : 2-6 mois\n3. Coût : 2-5% du projet\n\n👷 **Architecte obligatoire** au-dessus de 100 m² ou R+1.\n\n💡 Validez TOUT avant de construire !`,
  devis: () => `**Devis personnalisé** Allô Béton : 📄\n\n📲 **3 options** :\n1️⃣ **Chat** : décrivez votre projet, je calcule en temps réel\n2️⃣ **Site** : formulaire sur allobeton.sn\n3️⃣ **Tél** : +221 33 800 12 34\n\n⏱️ Devis détaillé sous **24h**.\n\nDécrivez votre projet, on commence ! 🚀`,
  budget: (e: Ent) => {
    if (e.surface || e.longueur) return `Avec dimensions précises je peux estimer votre coût. Donnez-moi le **type d'ouvrage** (dalle, mur, maison) et la **surface** !`;
    return `Donnez-moi votre **budget en FCFA** et le **type de projet**. Je vous dirai ce qui est faisable ! 💰\n\nExemples :\n• 5 M FCFA → extension/garage 25 m²\n• 20 M FCFA → maison R+0 80 m²\n• 50 M FCFA → villa R+1 200 m²`;
  },
  main_oeuvre: () => `**Tarifs main d'œuvre** Sénégal 2026 : 👷\n\n• **Maçon** : 5 000-8 000 FCFA/jour\n• **Tâcheron expérimenté** : 8 000-12 000 FCFA/jour\n• **Coffreur-ferrailleur** : 8 000-15 000 FCFA/jour\n• **Carreleur** : 5 000-7 000 FCFA/m² posé\n• **Électricien certifié** : 12 000-25 000 FCFA/jour\n• **Plombier** : 10 000-20 000 FCFA/jour\n\n💡 Pour une maison standard : **MO ≈ 30-40% du coût total**.`,
  duree_chantier: () => `**Durée de chantier** type Sénégal : ⏱️\n\n🏠 **Maison R+0 (80-100 m²)** : 5-8 mois\n🏘️ **Maison R+1 (150-200 m²)** : 8-12 mois\n🏛️ **Villa moderne (250+ m²)** : 12-18 mois\n🏢 **Immeuble R+3** : 18-24 mois\n\n📅 **Étapes** :\n• Fondations : 1-2 mois\n• Élévation : 2-3 mois\n• Toiture/dalle : 1 mois\n• Finitions : 2-6 mois\n\n⚠️ Saison des pluies (juil-oct) ralentit le chantier.`,
  fissures: () => `Les **fissures**, attention ! ⚠️\n\n🔍 **Diagnostic** :\n• **Microfissures (<0.2mm)** : superficielles, esthétique\n• **Fissures (0.2-2mm)** : surveiller, traiter\n• **Lézardes (>2mm)** : structurelles, urgent !\n\n🛠️ **Causes au Sénégal** :\n• Cure insuffisante (chaleur)\n• Tassement différentiel sol\n• Sous-dimensionnement\n• Sels marins (côte)\n\n💡 **Solutions** :\n• Fissures fines → mortier de réparation\n• Fissures structurelles → expert + reprise\n\n📞 Pour diagnostic : appelez +221 33 800 12 34.`,
  humidite: () => `Combattre l'**humidité** ! 💧\n\n🔍 **Sources** :\n• Remontées capillaires (sol)\n• Infiltrations (toiture, façade)\n• Condensation (mauvaise ventilation)\n• Salpêtre (sels)\n\n🛠️ **Solutions** :\n• **Drain périphérique** + barrière étanche\n• **Hydrofuge façade** : 2 500 FCFA/m²\n• **Enduit étanche** intérieur\n• **VMC** ou aération\n• **Étanchéité toiture** : 3 500-6 000 FCFA/m²\n\n💡 Sur côte sénégalaise : protégez TOUT du sel marin !`,
  sol_etude: () => `**Étude de sol** géotechnique : 🔬\n\n📊 **Pourquoi** :\n• Connaître la portance du terrain\n• Dimensionner les fondations\n• Éviter les fissures futures\n\n💰 **Coûts** :\n• Maison individuelle : 250 000-500 000 FCFA\n• Bâtiment public : 800 000-2 M FCFA\n\n👷 **Bureaux d'études** au Sénégal :\n• LBTP, GEAUR, BCEOM, etc.\n\n💡 **Obligatoire** pour bâtiments R+2+ et zones côtières/argileuses.`,
  piscine: () => `Construire une **piscine** ! 🏊\n\n💰 **Budget moyen** Sénégal :\n• Piscine béton 4×8m : 8-15 M FCFA\n• Piscine béton 6×12m : 18-30 M FCFA\n• Piscine débordement : +30-50%\n\n🧱 **Béton** : B30 minimum + ferraillage HA12 (corrosion eau chlorée)\n📐 **Profondeur** : 1.40m standard\n🔧 **Équipements** : pompe, filtre, traitement (~2 M FCFA)\n\n⚠️ Permis souvent requis. Étanchéité PRIMORDIALE.`,
  cloture: () => `**Mur de clôture** & **portail** : 🏗️\n\n🧱 **Mur clôture parpaing 20** :\n• 1m de haut : ~25 000 FCFA/ml\n• 2m de haut : ~45 000 FCFA/ml\n• 2.5m + acrotère : ~60 000 FCFA/ml\n\n🚪 **Portails** :\n• Tôle simple : 250 000-500 000 FCFA\n• Battant fer forgé : 400 000-1 M FCFA\n• Coulissant motorisé : 1.5-3 M FCFA\n\n💡 Prévoyez **chaînages tous les 3m** + poteaux d'angle renforcés.`,
  escalier: () => `**Escalier** béton armé : 🪜\n\n📐 **Dimensions standard** :\n• Hauteur marche : 17 cm\n• Profondeur giron : 28 cm\n• Largeur passage : 90 cm min (1.20m confort)\n\n🧱 **Béton** : B25 + armatures HA10 dans paillasse\n💰 **Coût** : 80 000-150 000 FCFA/m² de paillasse\n\n💡 Pour 1 étage (2.80m) : ~16 marches.`,
  terrasse: () => `**Terrasse** ou **balcon** : 🏖️\n\n📐 **Dalle terrasse** :\n• Épaisseur : 15-18 cm\n• Béton B25 + HA12\n• Pente 1-2% pour évacuation\n\n💧 **Étanchéité OBLIGATOIRE** :\n• SBS ou EPDM : 6 500-12 000 FCFA/m²\n• Carrelage extérieur : +6 500-15 000 FCFA/m²\n\n💰 **Total terrasse** : 35 000-60 000 FCFA/m² fini\n\n⚠️ Au Sénégal, soignez l'étanchéité — la saison des pluies est rude !`,
  transport: () => `**Transport & livraison** : 🚚\n\n🚛 **Camions toupie béton** : 6-8 m³ • livraison ~5 000-15 000 FCFA Dakar\n🚚 **Camion plateau** matériaux secs : 5-15 tonnes\n🛵 **Petites livraisons** : camionnettes\n\n📍 **Zones** : Dakar (24h), Thiès (48h), Saint-Louis (48-72h)\n🎁 **GRATUIT** dès 500 000 FCFA Dakar\n\n📲 Suivi temps réel sur votre espace client.`,
  stockage: () => `**Stockage des matériaux** : 📦\n\n📦 **Ciment** :\n• Maximum 3 mois (peut durcir)\n• À l'abri humidité ABSOLUMENT\n• Surélevé sur palettes\n• Empilé max 10 sacs\n\n🧱 **Parpaings/briques** : à plat, sur palettes, bâché\n🔩 **Fer** : surélevé du sol, bâché contre la rouille\n🏖️ **Sable/gravier** : tas distincts, bâché si pluie\n\n💡 Au Sénégal humide : protégez TOUT contre l'humidité !`,
  parpaing_creux: () => `**Parpaings creux & hourdis** : 🧱\n\n• **Parpaing 10 creux** : 280 FCFA — cloisons légères\n• **Parpaing 15 creux** : 350 FCFA — cloisons standard\n• **Parpaing 20 creux** ⭐ : 450 FCFA — murs porteurs\n• **Hourdis 16+4** : 950 FCFA — planchers étages\n• **Hourdis 20+4** : 1 150 FCFA — grandes portées\n• **Brique creuse 15** : 320 FCFA\n\n💡 Pour 1m² mur (parpaing 20) : 12 pièces.`,
  recommend: () => `Pour bien vous conseiller, parlez-moi de **votre projet** ! 🎯\n\n• Type d'ouvrage (maison, mur, dalle...)\n• Surface ou dimensions\n• Localisation (Dakar, Thiès, autre ?)\n• Budget approximatif\n\nJe vous donnerai des recommandations précises sur les matériaux, dosages, et coûts. 💪`,
  materiaux_eco: () => `Les **matériaux écolos** au Sénégal ! 🌿\n\n🧱 **Brique de terre stabilisée (BTS)** ⭐ :\n• Fabriquée localement (terre + ciment 5-10%)\n• 200-300 FCFA/pièce\n• Excellente inertie thermique\n\n🌾 **Typha** (roseau local) : isolant écologique\n🪵 **Bois local** : iroko, palmier rônier\n♻️ **Béton recyclé** : pour gros œuvre non structurel\n\n💡 Ces matériaux gardent les maisons **fraîches sans clim** !`,
  rehab: () => `**Rénovation/réhabilitation** : 🔨\n\n🏠 **Postes courants** :\n• Reprise façade : 8 500-15 000 FCFA/m²\n• Réfection toiture : 15 000-35 000 FCFA/m²\n• Rénovation salle de bain : 800 000-2 M FCFA\n• Rénovation cuisine : 1.5-4 M FCFA\n\n🏗️ **Extension** :\n• Horizontale : 100 000-250 000 FCFA/m²\n• Surélévation R+1 : 150 000-300 000 FCFA/m²\n\n💡 Vérifiez la **structure existante** avant tout projet !`,
};

// === FONCTION PRINCIPALE ===
export const processMessage = (
  input: string, ctx: ConversationContext
): { response: AIResponse; updatedContext: ConversationContext } => {
  const e = extract(input);
  const intent = detect(input);
  const proj = { ...ctx.project };
  if (e.surface) proj.surface = e.surface;
  if (e.epaisseur) proj.epaisseur = e.epaisseur;
  if (e.longueur) proj.longueur = e.longueur;
  if (e.largeur) proj.largeur = e.largeur;
  if (e.hauteur) proj.hauteur = e.hauteur;
  if (e.etages) proj.etages = e.etages;

  let text = '', followUp: string[] = [];
  switch (intent) {
    case 'greeting': text = ctx.count === 0 ? pick(R.greetings) : "Re-bonjour ! 😊 Que puis-je faire pour vous ?";
      followUp = ['Calculer un béton', 'Voir les prix', 'Conseils techniques']; break;
    case 'thanks': text = pick(R.thanks); break;
    case 'goodbye': text = pick(R.goodbye); break;
    case 'how_are_you': text = pick(R.how_are_you); break;
    case 'name': text = TEXT.name(); break;
    case 'capabilities': text = TEXT.capabilities(); break;
    case 'calc_dalle': case 'calc_general': text = calcDalle(e, { ...ctx, project: proj });
      followUp = ['Voir le béton B25', 'Délais de livraison', 'Prix du fer HA10']; break;
    case 'calc_fondation': text = calcFondation(e); break;
    case 'calc_mur': text = calcMur(e, { ...ctx, project: proj }); break;
    case 'price_beton': text = TEXT.priceBeton();
      followUp = ['Calculer pour ma dalle', 'Comparer les classes', 'Comment commander']; break;
    case 'price_ciment': text = TEXT.priceCiment(); break;
    case 'price_fer': text = TEXT.priceFer(); break;
    case 'price_sable': text = TEXT.priceSable(); break;
    case 'price_gravier': text = TEXT.priceGravier(); break;
    case 'price_parpaing': text = TEXT.priceParpaing(); break;
    case 'price_general': text = TEXT.general(); break;
    case 'adv_dalle': text = TEXT.advDalle(); break;
    case 'adv_fondation': text = TEXT.advFondation(); break;
    case 'adv_poteau': text = TEXT.advPoteau(e, { ...ctx, project: proj }); break;
    case 'adv_poutre': text = TEXT.advPoutre(); break;
    case 'adv_cure': text = TEXT.advCure(); break;
    case 'adv_maison': text = TEXT.advMaison(); break;
    case 'adv_dosage': text = TEXT.advDosage(); break;
    case 'compare_class': text = TEXT.cmpClass(); break;
    case 'compare_ciment': text = TEXT.cmpCiment(); break;
    case 'compare_sable': text = TEXT.cmpSable(); break;
    case 'delivery': text = TEXT.delivery(); break;
    case 'payment': text = TEXT.payment(); break;
    case 'order': text = TEXT.order(); break;
    case 'contact': text = TEXT.contact(); break;
    case 'hours': text = TEXT.hours(); break;
    case 'company': text = TEXT.company(); break;
    case 'complaint': text = TEXT.complaint(); break;
    case 'norms': text = TEXT.norms(); break;
    case 'joke': text = TEXT.joke(); break;
    case 'language': text = TEXT.language(); break;
    case 'toiture': text = TEXT.toiture(); break;
    case 'plomberie': text = TEXT.plomberie(); break;
    case 'electricite': text = TEXT.electricite(); break;
    case 'peinture': text = TEXT.peinture(); break;
    case 'carrelage': text = TEXT.carrelage(); break;
    case 'isolation': text = TEXT.isolation(); break;
    case 'menuiserie': text = TEXT.menuiserie(); break;
    case 'permis': text = TEXT.permis(); break;
    case 'devis': text = TEXT.devis(); break;
    case 'budget': text = TEXT.budget(e); break;
    case 'main_oeuvre': text = TEXT.main_oeuvre(); break;
    case 'duree_chantier': text = TEXT.duree_chantier(); break;
    case 'fissures': text = TEXT.fissures(); break;
    case 'humidite': text = TEXT.humidite(); break;
    case 'sol_etude': text = TEXT.sol_etude(); break;
    case 'piscine': text = TEXT.piscine(); break;
    case 'cloture': text = TEXT.cloture(); break;
    case 'escalier': text = TEXT.escalier(); break;
    case 'terrasse': text = TEXT.terrasse(); break;
    case 'transport': text = TEXT.transport(); break;
    case 'stockage': text = TEXT.stockage(); break;
    case 'parpaing_creux': text = TEXT.parpaing_creux(); break;
    case 'recommend': text = TEXT.recommend(); break;
    case 'materiaux_eco': text = TEXT.materiaux_eco(); break;
    case 'rehab': text = TEXT.rehab(); break;
    default: text = TEXT.unknown();
  }

  const updated: ConversationContext = {
    history: [...ctx.history, { role: 'user', text: input }, { role: 'bot', text }],
    project: proj,
    count: ctx.count + 1,
  };
  return { response: { text, intent, followUp }, updatedContext: updated };
};

export const createContext = (): ConversationContext => ({
  history: [], project: {}, count: 0,
});
