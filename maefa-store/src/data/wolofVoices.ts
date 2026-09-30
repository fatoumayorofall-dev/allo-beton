/**
 * Voix de Maé en wolof : phrases courtes enregistrées par la gérante (Admin > Statut WhatsApp),
 * jouées automatiquement quand Maé répond en wolof, pour les clientes qui ne lisent pas.
 * Servies par /api/voice/voix-wo-<id>. Les textes sont à dire à sa façon, en wolof de tous les jours.
 */
import { guideVoiceSlug } from './wolofGuide';

export interface VoiceLine {
  id: string;
  /** Ce que la gérante dit */
  wo: string;
  /** Sens en français */
  fr: string;
  /** Quand Maé la fait écouter */
  when: string;
}

export const maeVoiceSlug = (id: string) => `voix-wo-${id}`;

export const MAE_VOICES: VoiceLine[] = [
  { id: 'accueil', wo: 'Salaam aleekum, dalal ak jàmm ci Maefa ! Maa ngi tudd Maé. Lan nga bëgg tey : sac walla dàll ?', fr: 'Bonjour, bienvenue chez Maefa ! Je suis Maé. Que voulez-vous aujourd\'hui : un sac ou des chaussures ?', when: 'Quand la cliente salue' },
  { id: 'q-type', wo: 'Lan nga bëgg : sac walla dàll ? Bësal ci suuf.', fr: 'Que voulez-vous : un sac ou des chaussures ? Touchez en dessous.', when: 'Question : sac ou chaussures' },
  { id: 'q-pointure', wo: 'Ban pointure nga ? Bësal sa pointure ci suuf.', fr: 'Quelle est votre pointure ? Touchez-la en dessous.', when: 'Question : la pointure' },
  { id: 'q-occasion', wo: 'Ngir lan la ? Céet, ngénte, Tabaski, soirée walla liggéey ? Bësal ci suuf.', fr: 'C\'est pour quelle occasion ? Touchez en dessous.', when: 'Question : l\'occasion' },
  { id: 'q-couleur', wo: 'Ban melo moo la neex ? Bësal ci suuf.', fr: 'Quelle couleur vous plaît ? Touchez en dessous.', when: 'Question : la couleur' },
  { id: 'q-budget', wo: 'Ñaata nga bëgg a joxe ? Bësal ci suuf.', fr: 'Quel budget ? Touchez en dessous.', when: 'Question : le budget' },
  { id: 'pieces', wo: 'Xoolal li ma la tànnal ! Bësal nataal bi la neex ngir xool ko. Mën nga fey bu la ko indilee.', fr: 'Voici ce que je vous ai choisi ! Touchez la photo qui vous plaît. Vous pouvez payer à la livraison.', when: 'Quand elle montre des pièces' },
  { id: 'rien', wo: 'Amul lu dëppoo léegi. Bësal « Yeneen », walla wax ak nun ci WhatsApp.', fr: 'Je n\'ai rien qui corresponde pour le moment. Touchez « Autres » ou écrivez-nous sur WhatsApp.', when: 'Quand elle ne trouve rien' },
  { id: 'confiance', wo: 'Amul benn risque : mën nga fey bu la ko indilee, te dinga ko seet ci kanam livreur bi. Ay nit ñu dëgg ñoo lay tontu ci WhatsApp.', fr: 'Aucun risque : vous payez à la livraison et vérifiez devant le livreur. Une vraie équipe répond sur WhatsApp.', when: '« C\'est fiable ? », peur de payer' },
  { id: 'hesite', wo: 'Xaaral sa bopp. Bësal xol bi ci pièce bi ngir mu des ci sa favoris. Te mën nga fey bu la ko indilee.', fr: 'Prenez votre temps. Touchez le cœur pour garder la pièce. Vous pouvez payer à la livraison.', when: 'Quand la cliente hésite' },
  { id: 'compliment', wo: 'Dafa rafet, dëgg la ! Bësal « Ajouter au panier ». Mën nga fey bu la ko indilee.', fr: 'Elle est belle, c\'est vrai ! Touchez « Ajouter au panier ». Vous payez à la livraison.', when: 'Quand la cliente trouve ça beau' },
  { id: 'qualite', wo: 'Nu ngi seet pièce yépp balaa ñuy yónnee, te yow itam dinga ko seet ci kanam livreur bi.', fr: 'Nous vérifions chaque pièce avant l\'envoi, et vous aussi devant le livreur.', when: 'Questions sur la qualité' },
  { id: 'marque', wo: 'Dama lay wax dëgg : sac yi ak dàll yi, modèle Maefa lañu, du Hermès walla Chanel. Zara yi rekk ñoo di Zara.', fr: 'Je vous dis la vérité : ce sont des modèles Maefa, pas des grandes marques. Seules les pièces Zara sont de Zara.', when: '« C\'est du vrai Hermès ? »' },
  { id: 'whatsapp', wo: 'Wax ak nun ci WhatsApp : bësal butoŋ bu wert bi, dinañu la tontu léegi.', fr: 'Parlez-nous sur WhatsApp : touchez le bouton vert, nous vous répondons.', when: 'Réclamation, annulation, mesures, parler à quelqu\'un' },
  { id: 'merci', wo: 'Ñoo ko bokk ! Jërëjëf ci Maefa.', fr: 'Avec plaisir ! Merci d\'être chez Maefa.', when: 'Quand la cliente remercie' },
  { id: 'aurevoir', wo: 'Ba beneen yoon, jàmm ak salaam !', fr: 'À bientôt, paix et salut !', when: 'Quand la cliente dit au revoir' },
  { id: 'pascompris', wo: 'Dégguma bu baax. Bësal butoŋ yi ci suuf, walla yónnee nu vocal ci WhatsApp.', fr: 'Je n\'ai pas bien compris. Touchez les boutons en dessous ou envoyez-nous un vocal WhatsApp.', when: 'Quand elle ne comprend pas' },
];

/** Question de la vendeuse → voix. */
const QUESTION_VOICE: Record<string, string> = { kind: 'q-type', size: 'q-pointure', occasion: 'q-occasion', color: 'q-couleur', budget: 'q-budget' };
export const questionVoice = (key: string) => (QUESTION_VOICE[key] ? maeVoiceSlug(QUESTION_VOICE[key]) : null);

/** Intention → voix (sujets du guide wolof réutilisés pour les infos pratiques). */
const INTENT_VOICE: Record<string, string> = {
  salut: maeVoiceSlug('accueil'), confiance: maeVoiceSlug('confiance'), hesite: maeVoiceSlug('hesite'), compliment: maeVoiceSlug('compliment'),
  qualite: maeVoiceSlug('qualite'), marque: maeVoiceSlug('marque'), merci: maeVoiceSlug('merci'), aurevoir: maeVoiceSlug('aurevoir'),
  humain: maeVoiceSlug('whatsapp'), plainte: maeVoiceSlug('whatsapp'), modifier: maeVoiceSlug('whatsapp'), gros: maeVoiceSlug('whatsapp'),
  dimensions: maeVoiceSlug('whatsapp'), photos: maeVoiceSlug('whatsapp'), inconnu: maeVoiceSlug('pascompris'), bof: maeVoiceSlug('q-type'),
  commander: guideVoiceSlug('jend'), livraison: guideVoiceSlug('yonnee'), paiement: guideVoiceSlug('fey'), suivi: guideVoiceSlug('topp'),
  pointure: guideVoiceSlug('tank'), retour: guideVoiceSlug('seet'),
};

/**
 * Voix à faire écouter pour une réponse de Maé :
 * pièces montrées → « pieces » ; rien trouvé → « rien » ; question en attente → sa question ; sinon selon l'intention.
 */
export function voiceForReply(r: { intent: string; text: string; state: { pending?: string } }): string | null {
  if (/\n- \[[^\]]+\]\(\/produit\//.test(r.text)) return maeVoiceSlug('pieces');
  if (r.state.pending && QUESTION_VOICE[r.state.pending] && r.intent !== 'salut') return questionVoice(r.state.pending);
  if (r.intent === 'cherche' || r.intent === 'autres' || r.intent === 'nouveautes') return maeVoiceSlug('rien');
  return INTENT_VOICE[r.intent] ?? null;
}
