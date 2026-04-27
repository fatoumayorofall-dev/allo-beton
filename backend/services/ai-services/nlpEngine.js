// ============================================================
//  NLP ENGINE v3.0 — Moteur de traitement du langage naturel
//  Fuzzy matching Levenshtein, synonymes FR, extraction d'entités,
//  détection de suivi conversationnel, multi-intent, urgence.
// ============================================================

// ---------- DISTANCE DE LEVENSHTEIN ----------
function levenshtein(a, b) {
  if (!a || !b) return (a || b || '').length;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  const maxLen = Math.max(la.length, lb.length);
  if (!maxLen) return 1;
  return 1 - levenshtein(la, lb) / maxLen;
}

// ---------- DICTIONNAIRE DE SYNONYMES ----------
const SYNONYMS = {
  ca: ['chiffre d\'affaires', 'ca', 'chiffre affaires', 'revenue', 'revenus', 'recette', 'recettes', 'encaissements', 'montant total', 'total ventes'],
  ventes: ['vente', 'ventes', 'transactions', 'commande', 'commandes', 'achats', 'opérations', 'vente du jour'],
  clients: ['client', 'clients', 'acheteur', 'acheteurs', 'consommateur', 'consommateurs', 'clientèle'],
  produits: ['produit', 'produits', 'article', 'articles', 'béton', 'beton', 'type_beton', 'type béton', 'ciment'],
  impayés: ['impayé', 'impayés', 'impaye', 'impayes', 'non payé', 'non payés', 'en retard', 'dette', 'dettes', 'créance', 'créances', 'arriéré', 'arriérés', 'solde dû'],
  caisse: ['caisse', 'cash', 'trésorerie', 'tresorerie', 'argent', 'fond', 'fonds', 'solde caisse', 'encaisse'],
  dépenses: ['dépense', 'dépenses', 'depense', 'depenses', 'coût', 'coûts', 'cout', 'couts', 'frais', 'charges', 'sortie', 'sorties', 'décaissement'],
  factures: ['facture', 'factures', 'facturation', 'note', 'notes de frais'],
  paiements: ['paiement', 'paiements', 'payment', 'payments', 'versement', 'versements', 'règlement', 'règlements', 'encaissement'],
  fournisseurs: ['fournisseur', 'fournisseurs', 'supplier', 'suppliers', 'prestataire', 'prestataires'],
  stock: ['stock', 'stocks', 'inventaire', 'stockage', 'entrepôt', 'magasin', 'disponibilité'],
  livraison: ['livraison', 'livraisons', 'transport', 'transporteur', 'camion', 'camions', 'véhicule', 'véhicules', 'chauffeur', 'chauffeurs', 'destination'],
  tonnage: ['tonnage', 'tonnes', 'tonne', 'poids', 'charge', 'chargement', 'weight'],
  marge: ['marge', 'marges', 'bénéfice', 'bénéfices', 'profit', 'profits', 'rentabilité', 'gain', 'gains'],
  quotas: ['quota', 'quotas', 'allocation', 'allocations', 'dotation', 'dotations'],
  dépôts: ['dépôt', 'dépôts', 'depot', 'depots', 'acompte', 'acomptes', 'avance', 'avances', 'prépaiement'],
  utilisateurs: ['utilisateur', 'utilisateurs', 'user', 'users', 'employé', 'employés', 'personnel', 'équipe', 'staff'],
  notifications: ['notification', 'notifications', 'alerte', 'alertes', 'avertissement', 'message'],
  ecommerce: ['ecommerce', 'e-commerce', 'boutique', 'boutique en ligne', 'shop', 'online', 'en ligne'],
  commandes_achat: ['bon de commande', 'bons de commande', 'purchase order', 'commande fournisseur', 'achat fournisseur', 'approvisionnement'],
  aujourd_hui: ['aujourd\'hui', 'aujourdhui', 'ce jour', 'du jour', 'today', 'journée'],
  semaine: ['semaine', 'cette semaine', 'semaine en cours', 'hebdomadaire', '7 derniers jours', '7 jours'],
  mois: ['mois', 'ce mois', 'mois en cours', 'mensuel', 'du mois', 'ce mois-ci'],
  année: ['année', 'an', 'annuel', 'annuelle', 'cette année', 'en cours d\'année'],
  hier: ['hier', 'veille', 'la veille', 'journée précédente'],
  top: ['top', 'meilleur', 'meilleurs', 'meilleure', 'meilleures', 'premier', 'premiers', 'classement', 'ranking', 'palmarès'],
  dernier: ['dernier', 'derniers', 'dernière', 'dernières', 'récent', 'récents', 'récente', 'récentes'],
  combien: ['combien', 'nombre', 'quantité', 'total', 'quel est', 'quel nombre', 'quelle quantité'],
  compare: ['compare', 'comparer', 'comparaison', 'versus', 'vs', 'par rapport', 'en comparaison', 'face à'],
  tendance: ['tendance', 'tendances', 'évolution', 'progression', 'trend', 'courbe', 'historique', 'evolution'],
  résumé: ['résumé', 'resume', 'synthèse', 'bilan', 'récapitulatif', 'overview', 'vue d\'ensemble', 'global', 'général', 'dashboard'],
  inactive: ['inactif', 'inactifs', 'inactive', 'inactives', 'dormant', 'dormants', 'silencieux', 'sans activité', 'perdu', 'perdus'],
};

// ---------- CORRESPONDANCE FLOUE SYNONYMES ----------
function expandSynonyms(text) {
  const lower = text.toLowerCase();
  const matched = new Set();
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    for (const syn of syns) {
      if (lower.includes(syn)) {
        matched.add(key);
        break;
      }
    }
  }
  return Array.from(matched);
}

function fuzzyMatchIntent(text, intentKeywords) {
  const words = text.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüç0-9\s'-]/gi, '').split(/\s+/).filter(w => w.length > 2);
  let bestScore = 0;
  let bestKey = null;

  for (const [intentKey, keywords] of Object.entries(intentKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (keyword.length < 3) continue;
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        score += keyword.length >= 6 ? 0.4 : 0.25;
        continue;
      }
      for (const word of words) {
        const sim = similarity(word, keyword);
        if (sim >= 0.75) {
          score += sim * 0.3;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = intentKey;
    }
  }

  return { intent: bestKey, score: Math.min(1, bestScore) };
}

// ---------- EXTRACTION D'ENTITÉS ----------
function extractEntities(text) {
  const entities = {};
  const lower = text.toLowerCase();

  // 1) Montants
  const amountMatch = text.match(/(\d[\d\s.,]*\d)\s*(fcfa|f|cfa|xof)?/i);
  if (amountMatch) {
    entities.amount = parseFloat(amountMatch[1].replace(/[\s.]/g, '').replace(',', '.'));
  }

  // 2) Dates explicites
  const dateIso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  const dateFr = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dateIso) entities.date = dateIso[0];
  else if (dateFr) entities.date = `${dateFr[3]}-${dateFr[2].padStart(2, '0')}-${dateFr[1].padStart(2, '0')}`;

  // 3) Mois nommés
  const monthNames = {
    'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03',
    'avril': '04', 'mai': '05', 'juin': '06', 'juillet': '07',
    'août': '08', 'aout': '08', 'septembre': '09', 'octobre': '10',
    'novembre': '11', 'décembre': '12', 'decembre': '12'
  };
  for (const [name, num] of Object.entries(monthNames)) {
    const monthPattern = new RegExp(`(?:en|de|du mois de|mois de|pour)\\s+${name}(?:\\s+(\\d{4}))?`, 'i');
    const monthMatch = lower.match(monthPattern);
    if (monthMatch) {
      const year = monthMatch[1] || new Date().getFullYear();
      entities.month = `${year}-${num}`;
      entities.monthLabel = name.charAt(0).toUpperCase() + name.slice(1);
      break;
    }
    const simplePattern = new RegExp(`(?:^|\\s)${name}(?:\\s+(\\d{4}))?`, 'i');
    const simpleMatch = lower.match(simplePattern);
    if (simpleMatch) {
      const year = simpleMatch[1] || new Date().getFullYear();
      entities.month = `${year}-${num}`;
      entities.monthLabel = name.charAt(0).toUpperCase() + name.slice(1);
      break;
    }
  }

  // 4) Périodes relatives
  if (/aujourd'?hui|ce jour|du jour/i.test(lower)) entities.period = 'today';
  else if (/hier/i.test(lower)) entities.period = 'yesterday';
  else if (/cette semaine|semaine en cours|7 derniers jours/i.test(lower)) entities.period = 'week';
  else if (/ce mois|mois en cours|mois-ci/i.test(lower)) entities.period = 'month';
  else if (/cette année|annee|année en cours/i.test(lower)) entities.period = 'year';
  else if (/mois dernier|mois précédent/i.test(lower)) entities.period = 'last_month';
  else if (/semaine derni[eè]re/i.test(lower)) entities.period = 'last_week';

  // 5) Nombres (top N, derniers N)
  const nMatch = lower.match(/(?:top|dernier[es]*|premier[es]*|les?)\s+(\d+)/);
  if (nMatch) entities.limit = parseInt(nMatch[1]);

  // 6) Noms de clients (MAJUSCULES)
  const upperMatch = text.match(/\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s]{2,})\b/);
  if (upperMatch && !['CA', 'FCFA', 'CFA', 'TVA', 'IA', 'BTP', 'SAR'].includes(upperMatch[1].trim())) {
    entities.clientName = upperMatch[1].trim();
  }
  const clientPattern = lower.match(/(?:client|de|pour|chez)\s+([a-zàâäéèêëïîôùûüç][\w\sàâäéèêëïîôùûüç'-]{2,})/i);
  if (clientPattern && !entities.clientName) {
    const name = clientPattern[1].trim();
    if (!['aujourd', 'hier', 'cette', 'le mois', 'la semaine', 'les', 'tous', 'toutes', 'ce'].some(w => name.startsWith(w))) {
      entities.clientName = name;
    }
  }

  // 7) Type de produit
  const prodMatch = lower.match(/(?:b[eé]ton|type)\s+([\w\s/]+)/);
  if (prodMatch) entities.productType = prodMatch[1].trim();

  // 8) Comparaison détectée
  if (/compare|versus|vs|par rapport|face/i.test(lower)) entities.comparison = true;

  return entities;
}

// ---------- DÉTECTION DE SUIVI CONVERSATIONNEL ----------
const FOLLOWUP_PATTERNS = [
  /^(et|mais|aussi|ou|donc|sinon)\s/i,
  /^(ses|son|sa|leur|leurs)\s/i,
  /^(il|elle|ils|elles|ce|cette|ces)\s/i,
  /^combien/i,
  /^(quel|quelle|quels|quelles)\s/i,
  /^(et les|et le|et la|et ses|et son)/i,
  /^(montre|affiche|donne|liste)\s+(moi\s+)?(les|le|la|ses|son|sa|leurs?)\s/i,
  /^(plus de|encore|autre|autres)\s/i,
  /^(en détail|détaille|précise|explique)/i,
  /^(par|pour|avec|sur|de)\s+(quel|ce|cette|le|la|les)/i,
  /^(et|mais)\s+(ce mois|cette semaine|aujourd|hier)/i,
  /^(la même chose|pareil|idem)/i,
  /^(trie|filtre|classe|groupe)/i,
  /^(au total|en tout|globalement)/i,
];

function isFollowUp(text) {
  const lower = text.toLowerCase().trim();
  for (const pattern of FOLLOWUP_PATTERNS) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

// ---------- DÉTECTION MULTI-INTENT ----------
function detectMultiIntent(text) {
  const parts = text.split(/\s+(?:et aussi|et|puis|ensuite|également)\s+/i).filter(p => p.trim().length > 3);
  return parts.length > 1 ? parts : [text];
}

// ---------- DÉTECTION D'URGENCE ----------
function detectUrgency(text) {
  const lower = text.toLowerCase();
  if (/urgent|critique|imm[ée]diat|asap|vite|rapidement|toute suite/i.test(lower)) return 'high';
  if (/important|priorit|bient[oô]t/i.test(lower)) return 'medium';
  return 'normal';
}

module.exports = {
  levenshtein,
  similarity,
  SYNONYMS,
  expandSynonyms,
  fuzzyMatchIntent,
  extractEntities,
  isFollowUp,
  detectMultiIntent,
  detectUrgency,
  FOLLOWUP_PATTERNS
};
