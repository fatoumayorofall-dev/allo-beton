// ============================================================
//  AI QUERY SERVICE v5.0 — Moteur IA Expert Pro
//  ~60 intents, NLP fuzzy, mémoire contextuelle, insights auto,
//  réponses enrichies style Claude, 100% local, 0 frais.
// ============================================================
const { pool } = require('../../config/database');
const { fuzzyMatchIntent, extractEntities, isFollowUp, expandSynonyms, detectUrgency } = require('./nlpEngine');
const { conversationManager } = require('./conversationManager');
const { generateSmartInsights, generateRecommendations, getResponseVariation } = require('./insightsGenerator');
const { askClaude, isClaudeAvailable } = require('./claudeService');
const { enrichResponse, generateConversationalResponse } = require('./smartResponseGenerator');
const { exploreDatabase } = require('./databaseExplorer');
const { processAgentTask, detectTask } = require('./taskAgent');
const { intelligentSearch, generateClientReport, generateEmployeeReport } = require('./intelligentQueryEngine');

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));

// ============================================================
//  CATALOGUE DES INTENTS (regex + mots-clés fuzzy)
// ============================================================
const INTENT_CATALOG = {
  // --- SALUTATIONS ---
  greeting:       { regex: /^(bonjour|salut|hello|bonsoir|coucou|hey|hi|slt)/i, keywords: ['bonjour', 'salut', 'hello'] },
  thanks:         { regex: /^(merci|thanks|thx|parfait|super|excellent|génial|genial|bien joué|bravo)/i, keywords: ['merci', 'thanks'] },
  goodbye:        { regex: /^(au revoir|bye|bbye|ciao|à bientôt|a bientot|adieu|bonne journée)/i, keywords: ['revoir', 'bye', 'bientôt'] },
  help:           { regex: /\b(aide|help|que (peux|sais|fais)-tu|capacit|fonctionnalit)/i, keywords: ['aide', 'help', 'capacité'] },

  // --- VENTES ---
  sales_today:    { regex: /\b(vente|ca|chiffre).*(aujourd|du jour|today|ce jour)/i, keywords: ['ventes', 'aujourd\'hui', 'chiffre', 'jour'] },
  sales_week:     { regex: /\b(vente|ca|chiffre).*(semaine|hebdo|7 jour)/i, keywords: ['ventes', 'semaine', 'hebdomadaire'] },
  sales_month:    { regex: /\b(vente|ca|chiffre).*(mois|mensuel)/i, keywords: ['ventes', 'mois', 'mensuel', 'chiffre'] },
  sales_year:     { regex: /\b(vente|ca|chiffre).*(ann[ée]e|annuel)/i, keywords: ['ventes', 'année', 'annuel'] },
  sales_named_month: { regex: /\b(ca|vente|chiffre).*(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)/i, keywords: ['ventes', 'mois'] },
  sales_yesterday:{ regex: /\b(vente|ca|chiffre).*(hier|veille)/i, keywords: ['ventes', 'hier'] },
  sales_last:     { regex: /\b(derni[eè]re|r[ée]cente|last).*(vente|transaction)/i, keywords: ['dernières', 'ventes', 'récentes'] },
  sales_compare:  { regex: /\bcompar.*(vente|ca|mois)/i, keywords: ['compare', 'ventes', 'mois', 'versus'] },
  sales_trend:    { regex: /\b(tendance|[ée]volution|progression|trend|courbe).*(vente|ca)?/i, keywords: ['tendance', 'évolution', 'ventes'] },

  // --- CLIENTS ---
  customer_top:   { regex: /\b(top|meilleur|classement|palmar).*(client)/i, keywords: ['top', 'clients', 'meilleurs'] },
  customer_count: { regex: /\b(combien|nombre).*(client)/i, keywords: ['combien', 'clients', 'nombre'] },
  customer_active:{ regex: /\b(client).*(actif|actifs|active)/i, keywords: ['clients', 'actifs'] },
  customer_inactive:{ regex: /\b(client).*(inactif|dormant|perdu|silencieux|sans activit)/i, keywords: ['clients', 'inactifs', 'dormants'] },
  customer_details:{ regex: /\b(d[ée]tail|info|fiche|profil).*(client)|client\s+\w{3,}/i, keywords: ['détail', 'client', 'fiche'] },
  customer_debt:  { regex: /\b(endette|dette|cr[ée]ance|solde|doit|redoit).*(client)?|client.*(dette|solde|endett)|qui.*me.*doit|qui.*doit.*argent|qui.*doit.*argent/i, keywords: ['endettement', 'dette', 'clients', 'créance'] },
  customer_deposits:{ regex: /\b(d[ée]p[oô]t|acompte|avance|pr[ée]paid).*(client)?/i, keywords: ['dépôt', 'clients', 'acompte', 'avance'] },
  customer_quotas:{ regex: /\b(quota|allocation|dotation)/i, keywords: ['quota', 'allocation', 'dotation'] },

  // --- FINANCE / CAISSE ---
  cash_balance:   { regex: /\b([ée]tat|solde|situation).*(caisse|tr[ée]sor)|combien.*en caisse|combien.*caisse|argent.*caisse/i, keywords: ['état', 'caisse', 'solde', 'trésorerie'] },
  cash_receipts:  { regex: /\b(recette|entr[ée]e|encaissement).*(caisse|jour|mois)?/i, keywords: ['recettes', 'caisse', 'encaissements'] },
  cash_expenses:  { regex: /\b(d[ée]pense|sortie|d[ée]caissement|frais|charge|co[uû]t)/i, keywords: ['dépenses', 'frais', 'charges', 'coûts'] },
  unpaid_invoices:{ regex: /\b(impay[ée]|non pay[ée]|retard|overdue|arriéré|en attente de paiement)/i, keywords: ['impayés', 'non payé', 'retard'] },
  margin_analysis:{ regex: /\b(marge|b[ée]n[ée]fice|profit|rentabilit|gain)/i, keywords: ['marge', 'bénéfice', 'profit', 'rentabilité'] },
  payment_methods:{ regex: /\b(mode|moyen|r[ée]partition).*(paiement|payment|r[eè]glement)/i, keywords: ['mode', 'paiement', 'répartition'] },
  payments_list:  { regex: /\b(paiement|versement|r[eè]glement).*(liste|r[ée]cent|dernier)?/i, keywords: ['paiements', 'versements', 'règlements'] },

  // --- FACTURES ---
  invoices_list:  { regex: /\b(facture|facturation).*(mois|liste|r[ée]cente|du jour)?/i, keywords: ['factures', 'facturation', 'liste'] },
  invoices_unpaid:{ regex: /\b(facture).*(impay|non pay|overdue|en retard)/i, keywords: ['factures', 'impayées'] },

  // --- PRODUITS ---
  products_top:   { regex: /\b(top|meilleur|plus vendu).*(produit|article|b[ée]ton)|qu.*vend.*plus|produit.*plus.*vendu|qu.*est.*plus.*command/i, keywords: ['top', 'produits', 'vendus'] },
  products_prices:{ regex: /\b(tarif|prix|co[uû]t).*(produit|article|b[ée]ton)?/i, keywords: ['tarifs', 'prix', 'produits'] },
  products_types: { regex: /\b(type|cat[ée]gorie|gamme).*(b[ée]ton|produit)/i, keywords: ['types', 'béton', 'catégories'] },

  // --- LOGISTIQUE ---
  logistics_tonnage:{ regex: /\b(tonnage|tonne|poids|charge|chargement|weight)/i, keywords: ['tonnage', 'tonnes', 'chargement'] },
  logistics_vehicles:{ regex: /\b(v[ée]hicule|camion|plaque|immatriculation)/i, keywords: ['véhicules', 'camions', 'plaque'] },
  logistics_drivers:{ regex: /\b(chauffeur|conducteur|driver|transporteur)/i, keywords: ['chauffeurs', 'conducteurs'] },
  logistics_destinations:{ regex: /\b(destination|lieu.*livraison|adresse|site|chantier)/i, keywords: ['destinations', 'sites'] },

  // --- STOCK ---
  stock_status:   { regex: /\b([ée]tat|niveau|situation).*(stock|inventaire)/i, keywords: ['état', 'stock', 'inventaire'] },
  stock_movements:{ regex: /\b(mouvement|entr[ée]e|sortie).*(stock)/i, keywords: ['mouvements', 'stock'] },

  // --- FOURNISSEURS ---
  suppliers_list: { regex: /\b(fournisseur|supplier|qui.*fourniss|liste.*fourniss|tous.*fourniss)/i, keywords: ['fournisseurs', 'suppliers'] },
  purchase_orders:{ regex: /\b(bon|order).*(commande|achat)|commande.*(fournisseur|achat)|approvisionnement/i, keywords: ['bons', 'commande', 'achat', 'approvisionnement'] },

  // --- PARTENAIRES ---
  partners_contracts:{ regex: /\b(contrat|contract).*(partenaire|investiss)/i, keywords: ['contrats', 'partenaires'] },
  partners_list:  { regex: /\b(partenaire|partner|investisseur|associ[ée]|qui.*partenaire)/i, keywords: ['partenaires', 'investisseurs', 'associés', 'partners'] },

  // --- EMPLOYÉS & RH ---
  employees_list: { regex: /\b(employ[ée]|employes|salari[ée]|personnel|staff|effectif|rh|qui.*employ|combien.*employ|liste.*employ|mes.*employ|[ée]quipe|agents?\b)/i, keywords: ['employés', 'employes', 'salariés', 'personnel', 'staff', 'effectif', 'équipe'] },
  salary_info:    { regex: /\b(salaire|paie|fiche.*paie|bulletin|r[ée]mun[ée]ration|masse salariale)/i, keywords: ['salaires', 'paie', 'rémunération'] },
  salary_advances_list:{ regex: /\b(avance|acompte).*(salaire|paie)|avances?\b/i, keywords: ['avances', 'salaire'] },

  // --- PROJETS ---
  projects_list:  { regex: /\b(projet|chantier|construction|qui.*projet|combien.*projet|liste.*projet|mes.*projets?)/i, keywords: ['projets', 'chantiers', 'construction'] },

  // --- BANQUE ---
  bank_info:      { regex: /\b(banque|bank|bancaire|compte.*bancaire|pr[eê]t|emprunt|cr[ée]dit bancaire|situation.*banc)/i, keywords: ['banque', 'bancaire', 'comptes', 'prêts', 'emprunts'] },

  // --- LIVRAISONS ---
  deliveries_list:{ regex: /\b(livraison|bon.*livraison|delivery|exp[ée]dition|mes.*livraison)/i, keywords: ['livraisons', 'expéditions', 'delivery'] },

  // --- AVOIRS ---
  credit_notes_list:{ regex: /\b(avoir|avoirs|note.*cr[ée]dit|credit.*note|remboursement|liste.*avoir)/i, keywords: ['avoirs', 'remboursements', 'notes de crédit'] },

  // --- E-COMMERCE ---
  ecommerce_overview:{ regex: /\b(e-?commerce|boutique|shop|en ligne).*(vue|r[ée]sum|overview|stat)?/i, keywords: ['ecommerce', 'boutique', 'en ligne'] },
  ecommerce_orders:{ regex: /\b(commande).*(en ligne|online|ecommerce|e-commerce)/i, keywords: ['commandes', 'en ligne', 'ecommerce'] },

  // --- SYSTÈME ---
  users_list:     { regex: /\b(utilisateur|user|compte|qui.*acc[eè]s)/i, keywords: ['utilisateurs', 'comptes', 'accès'] },
  notifications_list:{ regex: /\b(notification|alerte|avertissement)/i, keywords: ['notifications', 'alertes'] },
  settings_info:  { regex: /\b(param[eè]tre|config|r[ée]glage|setting)/i, keywords: ['paramètres', 'configuration'] },

  // --- RAPPORT / SYNTHÈSE ---
  general_summary:{ regex: /\b(r[ée]sum[ée]|synth[eè]se|bilan|r[ée]capitulatif|overview|vue d'ensemble|global|dashboard|tableau de bord|comment va|comment se porte|[ée]tat g[ée]n[ée]ral|point.*activit|situation g[ée]n[ée]ral)/i, keywords: ['résumé', 'synthèse', 'bilan', 'global', 'dashboard', 'business'] },
  trend_analysis: { regex: /\b(analyse|tendance|trend).*(global|complet|g[ée]n[ée]ral)/i, keywords: ['analyse', 'tendance', 'global'] },
};

const INTENT_KEYWORDS = {};
for (const [key, val] of Object.entries(INTENT_CATALOG)) {
  INTENT_KEYWORDS[key] = val.keywords;
}

// ============================================================
//  DÉTECTION D'INTENT (Pipeline : regex -> fuzzy -> synonyme -> contexte)
// ============================================================
function detectIntent(question, context = {}) {
  const text = question.trim();
  const lower = text.toLowerCase();

  // Étape 1 : Regex exact
  for (const [intentKey, { regex }] of Object.entries(INTENT_CATALOG)) {
    if (regex.test(lower)) {
      return { intent: intentKey, confidence: 0.95, method: 'regex' };
    }
  }

  // Étape 2 : Fuzzy NLP
  const fuzzy = fuzzyMatchIntent(lower, INTENT_KEYWORDS);
  if (fuzzy.intent && fuzzy.score >= 0.35) {
    return { intent: fuzzy.intent, confidence: Math.min(0.90, 0.50 + fuzzy.score * 0.45), method: 'fuzzy' };
  }

  // Étape 3 : Synonymes
  const syns = expandSynonyms(lower);
  if (syns.length > 0) {
    const synMap = {
      ca: 'sales_month', ventes: 'sales_today', clients: 'customer_top',
      impayés: 'unpaid_invoices', caisse: 'cash_balance', dépenses: 'cash_expenses',
      factures: 'invoices_list', produits: 'products_top', fournisseurs: 'suppliers_list',
      stock: 'stock_status', livraison: 'deliveries_list', tonnage: 'logistics_tonnage',
      marge: 'margin_analysis', quotas: 'customer_quotas', dépôts: 'customer_deposits',
      utilisateurs: 'users_list', notifications: 'notifications_list', ecommerce: 'ecommerce_overview',
      commandes_achat: 'purchase_orders', paiements: 'payments_list',
      résumé: 'general_summary', tendance: 'trend_analysis', inactive: 'customer_inactive',
      partenaires: 'partners_list', employés: 'employees_list', employes: 'employees_list',
      salaires: 'salary_info', projets: 'projects_list', chantiers: 'projects_list',
      banque: 'bank_info', bancaire: 'bank_info', avoirs: 'credit_notes_list',
      livraisons: 'deliveries_list', équipe: 'employees_list',
    };
    for (const syn of syns) {
      if (synMap[syn]) {
        return { intent: synMap[syn], confidence: 0.65, method: 'synonym' };
      }
    }
  }

  // Étape 4 : Contexte conversationnel
  if (context.lastIntent && isFollowUp(text)) {
    return { intent: context.lastIntent, confidence: 0.60, method: 'context_followup' };
  }

  // Étape 5 : Fallback
  return { intent: 'smart_search', confidence: 0.30, method: 'fallback' };
}

// ============================================================
//  PROCESS QUERY — Point d'entrée principal
// ============================================================
async function processQuery(question, sessionId = 'default') {
  const startTime = Date.now();

  try {
    const entities = extractEntities(question);
    const session = conversationManager.getSession(sessionId);
    const contextResolution = conversationManager.resolveContext(sessionId, question, entities);
    const resolvedEntities = contextResolution.entities;

    const detection = detectIntent(question, {
      lastIntent: session.lastIntent,
      lastClientName: session.lastClientName
    });

    if (contextResolution.isFollowUp && contextResolution.resolvedFrom.length > 0 && detection.confidence < 0.85) {
      detection.method = 'context_followup';
    }

    // ═══ AGENT IA PRIORITAIRE — Actions explicites (créer, ajouter, modifier, etc.) ═══
    const taskDetection = detectTask(question);
    if (taskDetection && taskDetection.taskId && taskDetection.confidence >= 0.80) {
      try {
        const userId = (session && session.userId) || '5f47cf1f-de20-4b41-98c4-2524814e6c15';
        const agentResult = await processAgentTask(question, userId);
        if (agentResult) {
          const contextualSuggestions = conversationManager.getContextualSuggestions(sessionId);
          conversationManager.addExchange(sessionId, question, 'task_agent', agentResult.answer, agentResult.data, resolvedEntities);
          return {
            success: true,
            answer: agentResult.answer,
            data: agentResult.data || null,
            chartType: agentResult.chartType || null,
            intent: 'task_agent',
            confidence: 95,
            method: 'agent_ia',
            insights: [],
            recommendations: [],
            contextualSuggestions,
            processingTime: `${Date.now() - startTime}ms`,
            contextInfo: { isFollowUp: contextResolution.isFollowUp, resolvedFrom: contextResolution.resolvedFrom, turnCount: contextResolution.turnCount }
          };
        }
      } catch (agentErr) {
        console.error('Priority Task Agent error:', agentErr.message);
      }
    }

    // ═══ TENTATIVE CLAUDE EN PRIORITÉ ═══
    if (isClaudeAvailable()) {
      try {
        // Récupérer les données SQL pertinentes via le système d'intent
        let sqlData = null;
        if (detection.intent !== 'smart_search' && detection.confidence > 0.50) {
          try {
            const intentResult = await executeIntent(detection.intent, resolvedEntities, question);
            sqlData = intentResult.data;
          } catch {}
        }

        // Historique de conversation pour Claude
        const history = session.exchanges ? session.exchanges.slice(-8).map(ex => ({
          question: ex.question,
          answer: ex.answer
        })) : [];

        const claudeResult = await askClaude(question, history, sqlData);

        if (claudeResult) {
          const contextualSuggestions = conversationManager.getContextualSuggestions(sessionId);
          conversationManager.addExchange(sessionId, question, detection.intent || 'claude_chat', claudeResult.answer, sqlData, resolvedEntities);

          return {
            success: true,
            answer: claudeResult.answer,
            data: sqlData,
            chartType: sqlData ? (Array.isArray(sqlData) && sqlData.length > 1 ? 'bar' : null) : null,
            intent: detection.intent || 'claude_chat',
            confidence: claudeResult.confidence,
            method: 'claude',
            insights: [],
            recommendations: [],
            contextualSuggestions,
            processingTime: `${Date.now() - startTime}ms`,
            contextInfo: {
              isFollowUp: contextResolution.isFollowUp,
              resolvedFrom: contextResolution.resolvedFrom,
              turnCount: contextResolution.turnCount
            }
          };
        }
      } catch (claudeError) {
        console.error('Claude fallback to local AI:', claudeError.message);
      }
    }

    // ═══ RÉPONSE CONVERSATIONNELLE AVANCÉE (avant intent) ═══
    if (detection.intent === 'smart_search' || detection.confidence < 0.40) {
      try {
        const convResult = await generateConversationalResponse(question);
        if (convResult) {
          const contextualSuggestions = conversationManager.getContextualSuggestions(sessionId);
          conversationManager.addExchange(sessionId, question, 'conversational', convResult.answer, convResult.data, resolvedEntities);
          return {
            success: true,
            answer: convResult.answer,
            data: convResult.data,
            chartType: convResult.chartType || null,
            intent: 'conversational',
            confidence: 85,
            method: 'ia_expert',
            insights: [],
            recommendations: [],
            contextualSuggestions,
            processingTime: `${Date.now() - startTime}ms`,
            contextInfo: { isFollowUp: contextResolution.isFollowUp, resolvedFrom: contextResolution.resolvedFrom, turnCount: contextResolution.turnCount }
          };
        }
      } catch (convErr) {
        console.error('Conversational response error:', convErr.message);
      }
    }

    // ═══ AGENT IA — DÉTECTION ET EXÉCUTION DE TÂCHES ═══
    if (detection.intent === 'smart_search' || detection.confidence < 0.50) {
      try {
        const userId = session.userId || '5f47cf1f-de20-4b41-98c4-2524814e6c15';
        const agentResult = await processAgentTask(question, userId);
        if (agentResult) {
          const contextualSuggestions = conversationManager.getContextualSuggestions(sessionId);
          conversationManager.addExchange(sessionId, question, 'task_agent', agentResult.answer, agentResult.data, resolvedEntities);
          return {
            success: true,
            answer: agentResult.answer,
            data: agentResult.data || null,
            chartType: agentResult.chartType || null,
            intent: 'task_agent',
            confidence: 95,
            method: 'agent_ia',
            insights: [],
            recommendations: [],
            contextualSuggestions,
            processingTime: `${Date.now() - startTime}ms`,
            contextInfo: { isFollowUp: contextResolution.isFollowUp, resolvedFrom: contextResolution.resolvedFrom, turnCount: contextResolution.turnCount }
          };
        }
      } catch (agentErr) {
        console.error('Task Agent error:', agentErr.message);
      }
    }

    // ═══ RECHERCHE INTELLIGENTE — COMPREND TOUT ═══
    // Détecte les demandes de rapport, recherche de personnes, etc.
    // Mais ne pas interférer avec les intents connus avec bonne confiance
    const knownIntents = new Set([
      'sales_today', 'sales_week', 'sales_month', 'sales_year', 'sales_yesterday', 'sales_last',
      'customer_top', 'customer_count', 'customer_debt', 'customer_deposits',
      'cash_balance', 'cash_receipts', 'cash_expenses', 'unpaid_invoices',
      'employees_list', 'projects_list', 'suppliers_list', 'deliveries_list',
      'greeting', 'thanks', 'goodbye', 'help',
      'margin_analysis', 'payment_methods', 'products_top', 'stock_status'
    ]);
    const hasKnownIntent = knownIntents.has(detection.intent) && detection.confidence >= 0.70;

    const isSearchQuery = /qui est|c'est qui|parle.*moi|dis.*moi|tout sur|rapport|fiche|profil|détail|info sur|cherche|trouve/i.test(question);
    const hasProperNoun = /\b[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+/.test(question) &&
                          !['Qui', 'Que', 'Quoi', 'Comment', 'Combien', 'Pourquoi', 'Liste', 'Donne', 'Montre', 'Affiche'].some(w => question.startsWith(w));

    // Ne pas utiliser la recherche intelligente si on a un intent connu avec bonne confiance
    if (!hasKnownIntent && (isSearchQuery || hasProperNoun || detection.intent === 'smart_search' || detection.confidence < 0.60)) {
      try {
        const searchResult = await intelligentSearch(question);
        if (searchResult && searchResult.answer) {
          const contextualSuggestions = conversationManager.getContextualSuggestions(sessionId);
          conversationManager.addExchange(sessionId, question, 'intelligent_search', searchResult.answer, searchResult.data, resolvedEntities);
          return {
            success: true,
            answer: searchResult.answer,
            data: searchResult.data || null,
            chartType: searchResult.chartType || null,
            intent: 'intelligent_search',
            confidence: 95,
            method: 'ia_omniscient',
            insights: [],
            recommendations: [],
            contextualSuggestions,
            processingTime: `${Date.now() - startTime}ms`,
            contextInfo: { isFollowUp: contextResolution.isFollowUp, resolvedFrom: contextResolution.resolvedFrom, turnCount: contextResolution.turnCount }
          };
        }
      } catch (searchErr) {
        console.error('Intelligent Search error:', searchErr.message);
      }
    }

    // ═══ EXPLORATEUR BDD — RECHERCHE DYNAMIQUE (fallback) ═══
    if (detection.intent === 'smart_search' || detection.confidence < 0.50) {
      try {
        const explorerResult = await exploreDatabase(question);
        if (explorerResult) {
          const contextualSuggestions = conversationManager.getContextualSuggestions(sessionId);
          conversationManager.addExchange(sessionId, question, 'db_explorer', explorerResult.answer, explorerResult.data, resolvedEntities);
          return {
            success: true,
            answer: explorerResult.answer,
            data: explorerResult.data || null,
            chartType: explorerResult.chartType || null,
            intent: 'db_explorer',
            confidence: 90,
            method: 'db_explorer',
            insights: [],
            recommendations: [],
            contextualSuggestions,
            processingTime: `${Date.now() - startTime}ms`,
            contextInfo: { isFollowUp: contextResolution.isFollowUp, resolvedFrom: contextResolution.resolvedFrom, turnCount: contextResolution.turnCount }
          };
        }
      } catch (explorerErr) {
        console.error('DB Explorer error:', explorerErr.message);
      }
    }

    // ═══ SYSTÈME LOCAL ENRICHI (NLP + SQL + Smart Response) ═══
    let result;
    try {
      result = await executeIntent(detection.intent, resolvedEntities, question);
    } catch (err) {
      console.error(`Intent handler error [${detection.intent}]:`, err.message);
      result = { answer: 'Erreur lors du traitement : ' + err.message, data: null, chartType: null };
    }

    // ═══ ENRICHISSEMENT INTELLIGENT ═══
    try {
      result.answer = await enrichResponse(result.answer, detection.intent, result.data, question);
    } catch (enrichErr) {
      console.error('Enrich error:', enrichErr.message);
    }

    const insights = generateSmartInsights(result.data, detection.intent);
    const recommendations = generateRecommendations(result.data, detection.intent);
    const contextualSuggestions = conversationManager.getContextualSuggestions(sessionId);

    conversationManager.addExchange(sessionId, question, detection.intent, result.answer, result.data, resolvedEntities);

    return {
      success: true,
      answer: result.answer,
      data: result.data,
      chartType: result.chartType || null,
      intent: detection.intent,
      confidence: Math.round(detection.confidence * 100),
      method: 'ia_expert',
      insights: insights.map(i => i.text),
      recommendations,
      contextualSuggestions,
      processingTime: `${Date.now() - startTime}ms`,
      contextInfo: {
        isFollowUp: contextResolution.isFollowUp,
        resolvedFrom: contextResolution.resolvedFrom,
        turnCount: contextResolution.turnCount
      }
    };
  } catch (error) {
    console.error('processQuery Error:', error);
    return {
      success: false,
      answer: 'Erreur interne du service IA : ' + error.message,
      data: null, chartType: null,
      intent: 'error', confidence: 0, method: 'error',
      processingTime: `${Date.now() - startTime}ms`
    };
  }
}

// ============================================================
//  EXÉCUTION DES INTENTS
// ============================================================
async function executeIntent(intent, entities, question) {
  switch (intent) {
    case 'greeting': return await handleGreeting();
    case 'thanks':   return { answer: getResponseVariation('thanks') || '✨ Avec plaisir ! N\'hésitez pas si vous avez d\'autres questions. Je suis là pour vous aider à piloter votre activité.', data: null, chartType: null };
    case 'goodbye':  return { answer: getResponseVariation('goodbye') || '👋 À bientôt ! Bonne continuation avec Allo Béton. Je reste disponible 24/7.', data: null, chartType: null };
    case 'help':     return handleHelp();

    case 'sales_today':      return await handleSalesToday();
    case 'sales_yesterday':  return await handleSalesYesterday();
    case 'sales_week':       return await handleSalesWeek();
    case 'sales_month':      return await handleSalesMonth(entities);
    case 'sales_year':       return await handleSalesYear();
    case 'sales_named_month':return await handleSalesMonth(entities);
    case 'sales_last':       return await handleSalesLast(entities);
    case 'sales_compare':    return await handleSalesCompare();
    case 'sales_trend':      return await handleSalesTrend();

    case 'customer_top':     return await handleCustomerTop(entities);
    case 'customer_count':   return await handleCustomerCount();
    case 'customer_active':  return await handleCustomerActive();
    case 'customer_inactive':return await handleCustomerInactive();
    case 'customer_details': return await handleCustomerDetails(entities, question);
    case 'customer_debt':    return await handleCustomerDebt();
    case 'customer_deposits':return await handleCustomerDeposits();
    case 'customer_quotas':  return await handleCustomerQuotas();

    case 'cash_balance':     return await handleCashBalance();
    case 'cash_receipts':    return await handleCashReceipts(entities);
    case 'cash_expenses':    return await handleCashExpenses(entities);
    case 'unpaid_invoices':  return await handleUnpaidInvoices();
    case 'margin_analysis':  return await handleMarginAnalysis();
    case 'payment_methods':  return await handlePaymentMethods();
    case 'payments_list':    return await handlePaymentsList();

    case 'invoices_list':    return await handleInvoicesList(entities);
    case 'invoices_unpaid':  return await handleInvoicesUnpaid();

    case 'products_top':     return await handleProductsTop(entities);
    case 'products_prices':  return await handleProductsPrices();
    case 'products_types':   return await handleProductsTypes();

    case 'logistics_tonnage':      return await handleLogisticsTonnage(entities);
    case 'logistics_vehicles':     return await handleLogisticsVehicles();
    case 'logistics_drivers':      return await handleLogisticsDrivers();
    case 'logistics_destinations': return await handleLogisticsDestinations();

    case 'stock_status':     return await handleStockStatus();
    case 'stock_movements':  return await handleStockMovements();

    case 'suppliers_list':   return await handleSuppliersList();
    case 'purchase_orders':  return await handlePurchaseOrders();

    case 'ecommerce_overview': return await handleEcommerceOverview();
    case 'ecommerce_orders':   return await handleEcommerceOrders();

    case 'partners_list':    return await handlePartnersList();
    case 'partners_contracts':return await handlePartnersContracts();
    case 'employees_list':   return await handleEmployeesList();
    case 'salary_info':      return await handleSalaryInfo();
    case 'salary_advances_list': return await handleSalaryAdvances();
    case 'projects_list':    return await handleProjectsList();
    case 'bank_info':        return await handleBankInfo();
    case 'deliveries_list':  return await handleDeliveriesList();
    case 'credit_notes_list':return await handleCreditNotesList();

    case 'users_list':        return await handleUsersList();
    case 'notifications_list':return await handleNotificationsList();
    case 'settings_info':     return await handleSettingsInfo();

    case 'general_summary':  return await handleGeneralSummary();
    case 'trend_analysis':   return await handleTrendAnalysis();

    case 'smart_search':
    default:
      return await handleSmartSearch(question);
  }
}

// ============================================================
//  HANDLERS — VENTES
// ============================================================
async function handleSalesToday() {
  const [rows] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca, COALESCE(SUM(weight_loaded),0) as tonnes, COALESCE(AVG(total_amount),0) as avg_amount
    FROM sales WHERE DATE(sale_date) = CURDATE() AND status != 'cancelled'`);
  const r = rows[0];
  const [byProduct] = await pool.execute(`
    SELECT COALESCE(type_beton,'Autre') as name, SUM(total_amount) as value
    FROM sales WHERE DATE(sale_date) = CURDATE() AND status != 'cancelled' GROUP BY name ORDER BY value DESC`);
  const data = byProduct.map(p => ({ name: p.name, value: Number(p.value) }));
  const emoji = Number(r.ca) > 1000000 ? '🔥' : Number(r.ca) > 500000 ? '📈' : Number(r.ca) > 0 ? '📊' : '📭';
  let productLines = '';
  if (byProduct.length > 0) {
    productLines = '\n\n📦 **Par produit :**\n' + byProduct.map(p => `• **${p.name}** : ${fmt(p.value)} FCFA`).join('\n');
  }
  return {
    answer: `${emoji} **Ventes du jour**\n\n💰 CA : **${fmt(r.ca)}** FCFA\n📋 Nombre : **${r.nb}** ventes\n⚖️ Tonnage : **${Number(r.tonnes).toFixed(1)}** tonnes\n🛒 Panier moyen : **${fmt(r.avg_amount)}** FCFA${productLines}`,
    data: data.length ? data : null,
    chartType: data.length ? 'pie' : null
  };
}

async function handleSalesYesterday() {
  const [rows] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca, COALESCE(SUM(weight_loaded),0) as tonnes
    FROM sales WHERE DATE(sale_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND status != 'cancelled'`);
  const r = rows[0];
  return { answer: `**Ventes d'hier**\n\nCA : **${fmt(r.ca)}** FCFA\nNombre : ${r.nb} ventes\nTonnage : ${Number(r.tonnes).toFixed(1)} tonnes`, data: null, chartType: null };
}

async function handleSalesWeek() {
  const [rows] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca, COALESCE(SUM(weight_loaded),0) as tonnes
    FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'`);
  const r = rows[0];
  const [daily] = await pool.execute(`
    SELECT DATE_FORMAT(sale_date,'%a %d') as name, SUM(total_amount) as value
    FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'
    GROUP BY DATE(sale_date), name ORDER BY DATE(sale_date)`);
  const data = daily.map(d => ({ name: d.name, value: Number(d.value) }));
  return {
    answer: `📅 **Ventes de la semaine** (7 derniers jours)\n\n💰 CA total : **${fmt(r.ca)}** FCFA\n📋 Nombre : **${r.nb}** ventes\n⚖️ Tonnage : **${Number(r.tonnes).toFixed(1)}** tonnes\n📊 Moyenne/jour : **${fmt(r.ca / 7)}** FCFA`,
    data: data.length ? data : null,
    chartType: data.length ? 'bar' : null
  };
}

async function handleSalesMonth(entities) {
  const month = entities.month || new Date().toISOString().substring(0, 7);
  const label = entities.monthLabel || 'Ce mois';
  const [rows] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca, COALESCE(SUM(weight_loaded),0) as tonnes
    FROM sales WHERE DATE_FORMAT(sale_date,'%Y-%m') = ? AND status != 'cancelled'`, [month]);
  const r = rows[0];
  const [daily] = await pool.execute(`
    SELECT DATE_FORMAT(sale_date,'%d/%m') as name, SUM(total_amount) as value
    FROM sales WHERE DATE_FORMAT(sale_date,'%Y-%m') = ? AND status != 'cancelled'
    GROUP BY DATE(sale_date), name ORDER BY DATE(sale_date)`, [month]);
  const data = daily.map(d => ({ name: d.name, value: Number(d.value) }));
  return {
    answer: `**Ventes — ${label} (${month})**\n\nCA : **${fmt(r.ca)}** FCFA\nNombre : ${r.nb} ventes\nTonnage : ${Number(r.tonnes).toFixed(1)} tonnes`,
    data: data.length ? data : null,
    chartType: data.length ? 'area' : null
  };
}

async function handleSalesYear() {
  const year = new Date().getFullYear();
  const [rows] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca, COALESCE(SUM(weight_loaded),0) as tonnes
    FROM sales WHERE YEAR(sale_date) = ? AND status != 'cancelled'`, [year]);
  const r = rows[0];
  const [monthly] = await pool.execute(`
    SELECT DATE_FORMAT(sale_date,'%b') as name, SUM(total_amount) as value
    FROM sales WHERE YEAR(sale_date) = ? AND status != 'cancelled'
    GROUP BY MONTH(sale_date), name ORDER BY MONTH(sale_date)`, [year]);
  const data = monthly.map(d => ({ name: d.name, value: Number(d.value) }));
  return {
    answer: `**Ventes ${year}**\n\nCA : **${fmt(r.ca)}** FCFA\nNombre : ${r.nb} ventes\nTonnage : ${Number(r.tonnes).toFixed(1)} tonnes`,
    data: data.length ? data : null,
    chartType: data.length ? 'bar' : null
  };
}

async function handleSalesLast(entities) {
  const limit = Math.min(Math.max(parseInt(entities.limit) || 10, 1), 50);
  const [rows] = await pool.query(`
    SELECT s.sale_number, s.sale_date, s.total_amount, s.weight_loaded, s.type_beton, s.payment_status,
           COALESCE(s.client_name, c.name, 'N/A') as client
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.status != 'cancelled' ORDER BY s.sale_date DESC LIMIT ${limit}`);
  const lines = rows.map((r, i) => `${i+1}. **${r.sale_number}** — ${r.client} : ${fmt(r.total_amount)} FCFA (${r.type_beton || 'N/A'}) [${r.payment_status}]`);
  return { answer: `**${rows.length} dernières ventes**\n\n${lines.join('\n')}`, data: rows, chartType: null };
}

async function handleSalesCompare() {
  const thisMonth = new Date().toISOString().substring(0, 7);
  const lastDate = new Date(); lastDate.setMonth(lastDate.getMonth() - 1);
  const lastMonth = lastDate.toISOString().substring(0, 7);
  const [[current], [previous]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca FROM sales WHERE DATE_FORMAT(sale_date,'%Y-%m')=? AND status!='cancelled'`, [thisMonth]),
    pool.execute(`SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca FROM sales WHERE DATE_FORMAT(sale_date,'%Y-%m')=? AND status!='cancelled'`, [lastMonth])
  ]);
  const c = current[0], p = previous[0];
  const variation = p.ca > 0 ? ((c.ca - p.ca) / p.ca * 100).toFixed(1) : 'N/A';
  const data = [{ name: 'Mois dernier', value: Number(p.ca) }, { name: 'Ce mois', value: Number(c.ca) }];
  return {
    answer: `**Comparaison mois en cours vs mois précédent**\n\nCe mois : **${fmt(c.ca)}** FCFA (${c.nb} ventes)\nMois dernier : ${fmt(p.ca)} FCFA (${p.nb} ventes)\nVariation : ${variation}%`,
    data, chartType: 'bar'
  };
}

async function handleSalesTrend() {
  const [rows] = await pool.execute(`
    SELECT DATE_FORMAT(sale_date,'%d/%m') as name, SUM(total_amount) as value
    FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status != 'cancelled'
    GROUP BY DATE(sale_date), name ORDER BY DATE(sale_date)`);
  const data = rows.map(r => ({ name: r.name, value: Number(r.value) }));
  return { answer: `**Tendance des ventes — 30 derniers jours**\n\n${data.length} jours d'activité enregistrés.`, data, chartType: 'area' };
}

// ============================================================
//  HANDLERS — CLIENTS
// ============================================================
async function handleCustomerTop(entities) {
  const limit = Math.min(Math.max(parseInt(entities.limit) || 10, 1), 50);
  const [rows] = await pool.execute(`
    SELECT c.name, SUM(s.total_amount) as ca, COUNT(s.id) as nb
    FROM sales s JOIN customers c ON s.customer_id = c.id
    WHERE s.status != 'cancelled' GROUP BY c.id, c.name ORDER BY ca DESC LIMIT ${limit}`, []);
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** — ${fmt(r.ca)} FCFA (${r.nb} ventes)`);
  const data = rows.slice(0, 8).map(r => ({ name: r.name, value: Number(r.ca) }));
  return { answer: `**Top ${rows.length} clients**\n\n${lines.join('\n')}`, data, chartType: 'bar' };
}

async function handleCustomerCount() {
  const [rows] = await pool.execute(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as actifs FROM customers`);
  return { answer: `**Clients** : ${rows[0].total} au total, dont **${rows[0].actifs}** actifs.`, data: null, chartType: null };
}

async function handleCustomerActive() {
  const [rows] = await pool.execute(`SELECT name, email, phone, city FROM customers WHERE status = 'active' ORDER BY name LIMIT 20`);
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** ${r.city ? '— ' + r.city : ''} ${r.phone ? ' ' + r.phone : ''}`);
  return { answer: `**${rows.length} clients actifs**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleCustomerInactive() {
  const [rows] = await pool.execute(`
    SELECT c.name, c.phone, MAX(s.sale_date) as last_sale
    FROM customers c LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
    GROUP BY c.id, c.name, c.phone
    HAVING last_sale < DATE_SUB(CURDATE(), INTERVAL 60 DAY) OR last_sale IS NULL
    ORDER BY last_sale ASC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** — Dernière vente: ${r.last_sale ? new Date(r.last_sale).toLocaleDateString('fr-FR') : 'Jamais'} ${r.phone ? ' ' + r.phone : ''}`);
  return { answer: `**${rows.length} clients inactifs** (>60 jours)\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleCustomerDetails(entities, question) {
  let name = entities.clientName;
  if (!name) {
    const match = question.match(/(?:client|de|pour)\s+(.+)/i);
    if (match) name = match[1].trim();
  }
  if (!name) return { answer: 'Quel client recherchez-vous ? Donnez un nom.', data: null, chartType: null };

  const searchName = name.replace(/[%_]/g, '');
  const [rows] = await pool.execute(`
    SELECT c.*, COALESCE(SUM(s.total_amount), 0) as total_ca, COUNT(s.id) as total_ventes
    FROM customers c LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
    WHERE c.name LIKE ? GROUP BY c.id LIMIT 1`, [`%${searchName}%`]);

  if (!rows.length) return { answer: `Aucun client trouvé pour "${name}".`, data: null, chartType: null };
  const c = rows[0];
  return {
    answer: `**${c.name}**\n\nEmail : ${c.email || 'N/A'} | Tel : ${c.phone || 'N/A'}\nEntreprise : ${c.company || 'N/A'} | Ville : ${c.city || 'N/A'}\nCA total : **${fmt(c.total_ca)}** FCFA (${c.total_ventes} ventes)\nSolde : ${fmt(c.current_balance)} FCFA | Limite crédit : ${fmt(c.credit_limit)} FCFA\nStatut : ${c.status}`,
    data: null, chartType: null
  };
}

async function handleCustomerDebt() {
  const [rows] = await pool.execute(`
    SELECT c.name, c.current_balance, c.credit_limit,
           (SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE customer_id = c.id AND payment_status IN ('pending','partial','overdue') AND status != 'cancelled') as unpaid
    FROM customers c WHERE c.current_balance != 0 OR c.credit_limit > 0
    ORDER BY ABS(c.current_balance) DESC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** — Solde: ${fmt(r.current_balance)} FCFA | Impayés: ${fmt(r.unpaid)} FCFA | Limite: ${fmt(r.credit_limit)} FCFA`);
  return { answer: `**Endettement clients**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleCustomerDeposits() {
  const [rows] = await pool.execute(`
    SELECT c.name, cd.deposit_number, cd.amount, cd.payment_method, cd.created_at
    FROM client_deposits cd JOIN customers c ON cd.customer_id = c.id
    ORDER BY cd.created_at DESC LIMIT 15`);
  if (!rows.length) return { answer: 'Aucun dépôt client enregistré.', data: null, chartType: null };
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** — ${fmt(r.amount)} FCFA (${r.payment_method}) le ${new Date(r.created_at).toLocaleDateString('fr-FR')}`);
  return { answer: `**Derniers dépôts clients**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleCustomerQuotas() {
  const [rows] = await pool.execute(`
    SELECT c.name, cq.product_type, cq.quota_initial, cq.quota_consumed, cq.status
    FROM client_quotas cq JOIN customers c ON cq.customer_id = c.id
    ORDER BY cq.created_at DESC LIMIT 15`);
  if (!rows.length) return { answer: 'Aucun quota client enregistré.', data: null, chartType: null };
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** — ${r.product_type}: ${r.quota_consumed}/${r.quota_initial} (${r.status})`);
  return { answer: `**Quotas clients**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

// ============================================================
//  HANDLERS — FINANCE / CAISSE
// ============================================================
async function handleCashBalance() {
  let b = {};
  try {
    const [balance] = await pool.execute(`SELECT * FROM cash_balance ORDER BY date DESC LIMIT 1`);
    b = balance[0] || {};
  } catch { /* table may not exist */ }

  let rec = 0, dep = 0;
  try {
    const [todayMvt] = await pool.execute(`
      SELECT type, COALESCE(SUM(amount),0) as total FROM cash_movements
      WHERE DATE(date) = CURDATE() GROUP BY type`);
    rec = Number(todayMvt.find(m => m.type === 'recette')?.total || 0);
    dep = Number(todayMvt.find(m => m.type === 'depense')?.total || 0);
  } catch {}

  const solde = Number(b.closing_balance || 0);
  return {
    answer: `💰 **État de la caisse**\n\n🏦 Solde actuel : **${fmt(solde)}** FCFA\n📥 Recettes du jour : **${fmt(rec)}** FCFA\n📤 Dépenses du jour : **${fmt(dep)}** FCFA\n📊 Ouverture : ${fmt(b.opening_balance || 0)} FCFA\n💎 Net du jour : ${fmt(rec - dep)} FCFA`,
    data: [{ name: 'Recettes', value: rec }, { name: 'Dépenses', value: dep }, { name: 'Net', value: rec - dep }],
    chartType: 'bar'
  };
}

async function handleCashReceipts(entities) {
  const period = entities.period || 'month';
  let where = "date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')";
  let label = 'du mois';
  if (period === 'today') { where = 'DATE(date) = CURDATE()'; label = "d'aujourd'hui"; }
  else if (period === 'week') { where = 'date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'; label = 'de la semaine'; }

  let rows = [];
  try {
    [rows] = await pool.execute(`
      SELECT category, SUM(amount) as value FROM cash_movements WHERE type='recette' AND ${where} GROUP BY category ORDER BY value DESC`);
  } catch {}

  const total = rows.reduce((s, r) => s + Number(r.value), 0);
  const data = rows.map(r => ({ name: r.category || 'Autre', value: Number(r.value) }));
  const lines = rows.map(r => `• **${r.category || 'Autre'}** : ${fmt(r.value)} FCFA`);
  return { answer: `📥 **Recettes ${label}**\n\n💰 Total : **${fmt(total)}** FCFA\n\n${lines.join('\n') || 'Aucune recette enregistrée.'}`, data, chartType: data.length ? 'pie' : null };
}

async function handleCashExpenses(entities) {
  const period = entities.period || 'month';
  let where = "date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')";
  let label = 'du mois';
  if (period === 'today') { where = 'DATE(date) = CURDATE()'; label = "d'aujourd'hui"; }
  else if (period === 'week') { where = 'date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'; label = 'de la semaine'; }

  let rows = [];
  try {
    [rows] = await pool.execute(`
      SELECT category, SUM(amount) as value FROM cash_movements WHERE type='depense' AND ${where} GROUP BY category ORDER BY value DESC`);
  } catch {}

  const total = rows.reduce((s, r) => s + Number(r.value), 0);
  const data = rows.map(r => ({ name: r.category || 'Autre', value: Number(r.value) }));
  const lines = rows.map(r => `• **${r.category || 'Autre'}** : ${fmt(r.value)} FCFA`);
  return { answer: `📤 **Dépenses ${label}**\n\n💸 Total : **${fmt(total)}** FCFA\n\n${lines.join('\n') || 'Aucune dépense enregistrée.'}`, data, chartType: data.length ? 'pie' : null };
}

async function handleUnpaidInvoices() {
  const [rows] = await pool.execute(`
    SELECT s.sale_number, COALESCE(s.client_name, c.name, 'N/A') as client, s.total_amount, s.sale_date, s.payment_status
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.payment_status IN ('pending','partial','overdue') AND s.status != 'cancelled'
    ORDER BY s.total_amount DESC LIMIT 20`);
  const total = rows.reduce((s, r) => s + Number(r.total_amount), 0);
  const lines = rows.map((r, i) => `${i+1}. **${r.client}** — ${fmt(r.total_amount)} FCFA (${r.sale_number}) [${r.payment_status}]`);
  return { answer: `**Impayés** : ${rows.length} ventes pour **${fmt(total)} FCFA**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleMarginAnalysis() {
  const month = new Date().toISOString().substring(0, 7);
  const [[sales]] = await pool.execute(`SELECT COALESCE(SUM(total_amount),0) as ca FROM sales WHERE DATE_FORMAT(sale_date,'%Y-%m')=? AND status!='cancelled'`, [month]);

  let dep = 0;
  try {
    const [[expenses]] = await pool.execute(`SELECT COALESCE(SUM(amount),0) as total FROM cash_movements WHERE type='depense' AND DATE_FORMAT(date,'%Y-%m')=?`, [month]);
    dep = Number(expenses.total);
  } catch {}

  const ca = Number(sales.ca);
  const marge = ca - dep;
  const margePct = ca > 0 ? ((marge / ca) * 100).toFixed(1) : 0;
  const data = [{ name: 'CA', value: ca }, { name: 'Dépenses', value: dep }, { name: 'Marge', value: Math.max(0, marge) }];
  const emoji = margePct > 30 ? '🟢' : margePct > 15 ? '🟡' : '🔴';
  return { answer: `📈 **Analyse de marge — ${month}**\n\n💰 CA : **${fmt(ca)}** FCFA\n💸 Dépenses : **${fmt(dep)}** FCFA\n${emoji} **Marge nette : ${fmt(marge)} FCFA (${margePct}%)**`, data, chartType: 'bar' };
}

async function handlePaymentMethods() {
  const [rows] = await pool.execute(`
    SELECT COALESCE(payment_method,'N/A') as name, SUM(amount) as value, COUNT(*) as nb
    FROM payments WHERE status = 'completed' GROUP BY payment_method ORDER BY value DESC`);
  const data = rows.map(r => ({ name: r.name, value: Number(r.value) }));
  const lines = rows.map(r => `**${r.name}** : ${fmt(r.value)} FCFA (${r.nb} paiements)`);
  return { answer: `**Répartition par mode de paiement**\n\n${lines.join('\n')}`, data, chartType: 'pie' };
}

async function handlePaymentsList() {
  const [rows] = await pool.execute(`
    SELECT p.payment_number, p.amount, p.payment_method, p.payment_date, p.status
    FROM payments p ORDER BY p.payment_date DESC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. **${r.payment_number}** — ${fmt(r.amount)} FCFA (${r.payment_method}) [${r.status}]`);
  return { answer: `**Derniers paiements**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

// ============================================================
//  HANDLERS — FACTURES
// ============================================================
async function handleInvoicesList(entities) {
  const month = entities.month || new Date().toISOString().substring(0, 7);
  const [rows] = await pool.execute(`
    SELECT i.invoice_number, i.total_amount, i.status, i.invoice_date, c.name as client
    FROM invoices i LEFT JOIN customers c ON i.customer_id COLLATE utf8mb4_unicode_ci = c.id
    WHERE DATE_FORMAT(i.invoice_date,'%Y-%m') = ?
    ORDER BY i.invoice_date DESC LIMIT 15`, [month]);
  const [summary] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as total FROM invoices WHERE DATE_FORMAT(invoice_date,'%Y-%m')=?`, [month]);
  const lines = rows.map((r, i) => `${i+1}. **${r.invoice_number}** — ${r.client || 'N/A'} : ${fmt(r.total_amount)} FCFA [${r.status}]`);
  return { answer: `**Factures — ${month}** (${summary[0].nb} factures, ${fmt(summary[0].total)} FCFA)\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleInvoicesUnpaid() {
  const [rows] = await pool.execute(`
    SELECT i.invoice_number, i.total_amount, i.status, i.due_date, c.name as client
    FROM invoices i LEFT JOIN customers c ON i.customer_id COLLATE utf8mb4_unicode_ci = c.id
    WHERE i.status IN ('pending','overdue','partial')
    ORDER BY i.total_amount DESC LIMIT 15`);
  const total = rows.reduce((s, r) => s + Number(r.total_amount), 0);
  const lines = rows.map((r, i) => `${i+1}. **${r.invoice_number}** — ${r.client || 'N/A'} : ${fmt(r.total_amount)} FCFA [${r.status}] Echéance: ${r.due_date ? new Date(r.due_date).toLocaleDateString('fr-FR') : 'N/A'}`);
  return { answer: `**Factures impayées** : ${rows.length} pour **${fmt(total)} FCFA**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

// ============================================================
//  HANDLERS — PRODUITS
// ============================================================
async function handleProductsTop(entities) {
  const limit = Math.min(Math.max(parseInt(entities.limit) || 10, 1), 50);
  const [rows] = await pool.query(`
    SELECT COALESCE(type_beton,'Autre') as name, SUM(total_amount) as value, SUM(weight_loaded) as tonnes, COUNT(*) as nb
    FROM sales WHERE status != 'cancelled' GROUP BY name ORDER BY value DESC LIMIT ${limit}`);
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** — ${fmt(r.value)} FCFA | ${Number(r.tonnes || 0).toFixed(1)}t | ${r.nb} ventes`);
  const data = rows.map(r => ({ name: r.name, value: Number(r.value) }));
  return { answer: `**Top ${rows.length} produits**\n\n${lines.join('\n')}`, data, chartType: 'bar' };
}

async function handleProductsPrices() {
  const [rows] = await pool.execute(`SELECT name, selling_price, cost_price, unit, status FROM products WHERE status = 'active' ORDER BY selling_price DESC LIMIT 20`);
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** — ${fmt(r.selling_price)} FCFA/${r.unit || 'u'} (coût: ${fmt(r.cost_price)})`);
  return { answer: `**Tarifs produits**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleProductsTypes() {
  const [rows] = await pool.execute(`
    SELECT COALESCE(type_beton,'Autre') as type, COUNT(*) as nb, SUM(total_amount) as ca
    FROM sales WHERE status != 'cancelled' GROUP BY type ORDER BY ca DESC`);
  const lines = rows.map(r => `**${r.type}** — ${r.nb} ventes, ${fmt(r.ca)} FCFA`);
  const data = rows.map(r => ({ name: r.type, value: Number(r.ca) }));
  return { answer: `**Types de béton vendus**\n\n${lines.join('\n')}`, data, chartType: 'pie' };
}

// ============================================================
//  HANDLERS — LOGISTIQUE
// ============================================================
async function handleLogisticsTonnage(entities) {
  const period = entities.period || 'week';
  let where = 'sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  let label = '7 derniers jours';
  if (period === 'today') { where = 'DATE(sale_date) = CURDATE()'; label = "aujourd'hui"; }
  else if (period === 'month') { where = "DATE_FORMAT(sale_date,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m')"; label = 'ce mois'; }
  const [rows] = await pool.execute(`
    SELECT COALESCE(SUM(weight_loaded),0) as tonnes, COUNT(*) as nb, COUNT(DISTINCT vehicle_plate) as vehicules
    FROM sales WHERE ${where} AND status != 'cancelled'`);
  const [daily] = await pool.execute(`
    SELECT DATE_FORMAT(sale_date,'%d/%m') as name, SUM(weight_loaded) as value
    FROM sales WHERE ${where} AND status != 'cancelled' GROUP BY DATE(sale_date), name ORDER BY DATE(sale_date)`);
  const data = daily.map(d => ({ name: d.name, value: Number(d.value) }));
  return {
    answer: `**Tonnage — ${label}**\n\nTotal : **${Number(rows[0].tonnes).toFixed(1)}** tonnes\n${rows[0].nb} chargements\n${rows[0].vehicules} véhicules différents`,
    data: data.length ? data : null, chartType: data.length ? 'bar' : null
  };
}

async function handleLogisticsVehicles() {
  const [rows] = await pool.execute(`
    SELECT vehicle_plate as plaque, COUNT(*) as nb, SUM(weight_loaded) as tonnes, SUM(total_amount) as ca
    FROM sales WHERE vehicle_plate IS NOT NULL AND vehicle_plate != '' AND status != 'cancelled'
    GROUP BY vehicle_plate ORDER BY nb DESC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. **${r.plaque}** — ${r.nb} trajets | ${Number(r.tonnes).toFixed(1)}t | ${fmt(r.ca)} FCFA`);
  return { answer: `**Véhicules**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleLogisticsDrivers() {
  const [rows] = await pool.execute(`
    SELECT driver_name as chauffeur, COUNT(*) as nb, SUM(weight_loaded) as tonnes
    FROM sales WHERE driver_name IS NOT NULL AND driver_name != '' AND status != 'cancelled'
    GROUP BY driver_name ORDER BY nb DESC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. **${r.chauffeur}** — ${r.nb} livraisons | ${Number(r.tonnes).toFixed(1)} tonnes`);
  return { answer: `**Chauffeurs**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleLogisticsDestinations() {
  const [rows] = await pool.execute(`
    SELECT destination, COUNT(*) as nb, SUM(total_amount) as ca, SUM(weight_loaded) as tonnes
    FROM sales WHERE destination IS NOT NULL AND destination != '' AND status != 'cancelled'
    GROUP BY destination ORDER BY nb DESC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. **${r.destination}** — ${r.nb} livraisons | ${fmt(r.ca)} FCFA | ${Number(r.tonnes).toFixed(1)}t`);
  const data = rows.slice(0, 8).map(r => ({ name: r.destination, value: Number(r.ca) }));
  return { answer: `**Destinations principales**\n\n${lines.join('\n')}`, data, chartType: 'bar' };
}

// ============================================================
//  HANDLERS — STOCK
// ============================================================
async function handleStockStatus() {
  const [rows] = await pool.execute(`
    SELECT p.name, ii.quantity, ii.min_stock_level, ii.location
    FROM inventory_items ii JOIN products p ON ii.product_id = p.id
    ORDER BY ii.quantity ASC LIMIT 20`);
  if (!rows.length) return { answer: 'Aucune donnée de stock trouvée.', data: null, chartType: null };
  const lines = rows.map((r, i) => {
    const alert = r.quantity <= r.min_stock_level ? '🔴' : r.quantity <= r.min_stock_level * 2 ? '🟡' : '🟢';
    return `${i+1}. ${alert} **${r.name}** — ${r.quantity} unités (min: ${r.min_stock_level}) ${r.location ? r.location : ''}`;
  });
  return { answer: `**État des stocks**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleStockMovements() {
  const [rows] = await pool.execute(`
    SELECT sm.movement_type, p.name, sm.quantity, sm.notes, sm.created_at
    FROM stock_movements sm JOIN products p ON sm.product_id = p.id
    ORDER BY sm.created_at DESC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. ${r.movement_type === 'in' ? 'Entrée' : 'Sortie'} **${r.name}** — ${r.quantity} unités ${r.notes || ''}`);
  return { answer: `**Mouvements de stock récents**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

// ============================================================
//  HANDLERS — FOURNISSEURS
// ============================================================
async function handleSuppliersList() {
  const [rows] = await pool.execute(`SELECT name, contact_person, phone, email, city, status FROM suppliers ORDER BY name LIMIT 20`);
  const lines = rows.map((r, i) => `${i+1}. **${r.name}** ${r.contact_person ? '(' + r.contact_person + ')' : ''} ${r.phone ? ' ' + r.phone : ''} [${r.status}]`);
  return { answer: `**Fournisseurs** (${rows.length})\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handlePurchaseOrders() {
  const [rows] = await pool.execute(`
    SELECT po.order_number, s.name as supplier, po.total_amount, po.status, po.order_date
    FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.order_date DESC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. **${r.order_number}** — ${r.supplier || 'N/A'} : ${fmt(r.total_amount)} FCFA [${r.status}]`);
  return { answer: `**Bons de commande** (${rows.length})\n\n${lines.join('\n')}`, data: null, chartType: null };
}

// ============================================================
//  HANDLERS — E-COMMERCE
// ============================================================
async function handleEcommerceOverview() {
  const [orders] = await pool.execute(`SELECT COUNT(*) as nb, COALESCE(SUM(total),0) as ca FROM ecom_orders`);
  const [products] = await pool.execute(`SELECT COUNT(*) as nb FROM ecom_products WHERE is_active = 1`);
  const [customers] = await pool.execute(`SELECT COUNT(*) as nb FROM ecom_customers WHERE is_active = 1`);
  return {
    answer: `**E-commerce — Vue d'ensemble**\n\nCommandes : ${orders[0].nb} (${fmt(orders[0].ca)} FCFA)\nProduits actifs : ${products[0].nb}\nClients e-commerce : ${customers[0].nb}`,
    data: null, chartType: null
  };
}

async function handleEcommerceOrders() {
  const [rows] = await pool.execute(`
    SELECT eo.order_number, eo.total, eo.status, eo.payment_status, eo.created_at,
           CONCAT(eo.billing_first_name,' ',eo.billing_last_name) as client
    FROM ecom_orders eo ORDER BY eo.created_at DESC LIMIT 15`);
  const lines = rows.map((r, i) => `${i+1}. **${r.order_number}** — ${r.client} : ${fmt(r.total)} FCFA [${r.status}/${r.payment_status}]`);
  return { answer: `**Dernières commandes en ligne**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

// ============================================================
//  HANDLERS — SYSTÈME
// ============================================================
async function handleUsersList() {
  const [rows] = await pool.execute(`SELECT first_name, last_name, email, role, is_active FROM users ORDER BY created_at DESC LIMIT 20`);
  const lines = rows.map((r, i) => `${i+1}. **${r.first_name} ${r.last_name}** — ${r.email} [${r.role}] ${r.is_active ? '🟢' : '🔴'}`);
  return { answer: `**Utilisateurs** (${rows.length})\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleNotificationsList() {
  const [rows] = await pool.execute(`SELECT title, message, type, read_status, created_at FROM notifications ORDER BY created_at DESC LIMIT 10`);
  const unread = rows.filter(r => !r.read_status).length;
  const lines = rows.map((r, i) => `${i+1}. ${r.read_status ? '✅' : '🔔'} **${r.title}** — ${r.message?.substring(0, 60) || ''}`);
  return { answer: `**Notifications** (${unread} non lues)\n\n${lines.join('\n')}`, data: null, chartType: null };
}

async function handleSettingsInfo() {
  const [rows] = await pool.execute(`SELECT setting_key, setting_value FROM settings LIMIT 20`);
  const lines = rows.map(r => `**${r.setting_key}** : ${r.setting_value}`);
  return { answer: `**Paramètres**\n\n${lines.join('\n')}`, data: null, chartType: null };
}

// ============================================================
//  HANDLERS — RAPPORTS
// ============================================================
async function handleGeneralSummary() {
  const [[sales]] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca FROM sales WHERE DATE(sale_date) = CURDATE() AND status != 'cancelled'`);
  const [[monthSales]] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca FROM sales WHERE DATE_FORMAT(sale_date,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m') AND status != 'cancelled'`);
  let cashSolde = 0;
  try {
    const [[cash]] = await pool.execute(`SELECT COALESCE(closing_balance,0) as solde FROM cash_balance ORDER BY date DESC LIMIT 1`);
    cashSolde = Number(cash.solde);
  } catch {}
  const [[unpaid]] = await pool.execute(`SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as total FROM sales WHERE payment_status IN ('pending','partial','overdue') AND status != 'cancelled'`);
  const [[customers]] = await pool.execute(`SELECT COUNT(*) as total FROM customers WHERE status = 'active'`);

  // Score de santé
  let healthScore = 70;
  if (Number(sales.ca) > 500000) healthScore += 10;
  if (Number(unpaid.total) < 500000) healthScore += 10;
  if (Number(monthSales.ca) > 5000000) healthScore += 10;
  healthScore = Math.min(100, healthScore);
  const healthEmoji = healthScore >= 80 ? '🟢' : healthScore >= 60 ? '🟡' : '🔴';

  return {
    answer: `📋 **Tableau de bord — Allo Béton SARL**\n\n${healthEmoji} Score de santé : **${healthScore}/100**\n\n📊 **AUJOURD'HUI**\n💰 CA : **${fmt(sales.ca)}** FCFA (${sales.nb} ventes)\n\n📅 **CE MOIS**\n💰 CA mensuel : **${fmt(monthSales.ca)}** FCFA (${monthSales.nb} ventes)\n\n🏦 **TRÉSORERIE**\n💎 Solde caisse : **${fmt(cashSolde)}** FCFA\n⚠️ Impayés : **${fmt(unpaid.total)}** FCFA (${unpaid.nb} factures)\n\n👥 **CLIENTS**\n🤝 Clients actifs : **${customers.total}**`,
    data: [{ name: 'CA Jour', value: Number(sales.ca) }, { name: 'Impayés', value: Number(unpaid.total) }, { name: 'Solde Caisse', value: Math.max(0, cashSolde) }],
    chartType: 'bar'
  };
}

async function handleTrendAnalysis() {
  const [rows] = await pool.execute(`
    SELECT DATE_FORMAT(sale_date,'%d/%m') as name, SUM(total_amount) as value, COUNT(*) as nb
    FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status != 'cancelled'
    GROUP BY DATE(sale_date), name ORDER BY DATE(sale_date)`);
  const data = rows.map(r => ({ name: r.name, value: Number(r.value) }));
  const avg = data.reduce((s, d) => s + d.value, 0) / (data.length || 1);
  const trend = data.length >= 7 ? (data.slice(-7).reduce((s, d) => s + d.value, 0) / 7 > avg ? 'Hausse' : 'Baisse') : 'Stable';
  return {
    answer: `**Analyse de tendance — 30 jours**\n\n${data.length} jours d'activité\nMoyenne : ${fmt(avg)} FCFA/jour\nTendance dernière semaine : ${trend}`,
    data, chartType: 'area'
  };
}

// ============================================================
//  HANDLER — GREETING ENRICHI
// ============================================================
async function handleGreeting() {
  let statusLine = '';
  try {
    const [[today]] = await pool.execute(
      `SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca FROM sales WHERE DATE(sale_date) = CURDATE() AND status != 'cancelled'`);
    statusLine = `\n\n📊 **Situation en temps réel :** ${today.nb} ventes aujourd'hui pour **${fmt(today.ca)} FCFA**`;
  } catch {}

  const greetings = [
    `👋 **Bonjour !** Je suis votre **IA Expert Pro** d'Allo Béton.${statusLine}\n\n💬 *Que souhaitez-vous analyser ?*`,
    `🌟 **Bienvenue !** Prêt à analyser votre activité en temps réel.${statusLine}\n\n💬 *Posez-moi n'importe quelle question sur vos ventes, clients, finances...*`,
    `👋 **Bonjour !** Votre assistant IA est à votre service.${statusLine}\n\n💬 *Comment puis-je vous aider aujourd'hui ?*`,
  ];
  return { answer: greetings[Math.floor(Math.random() * greetings.length)], data: null, chartType: null };
}

// ============================================================
//  HANDLER — AIDE ENRICHIE
// ============================================================
function handleHelp() {
  return {
    answer: `🧠 **IA Expert Pro — Guide complet**

📊 **Ventes & CA**
• *"CA du jour"* • *"Ventes de la semaine"* • *"Top produits"*
• *"Comparer mois"* • *"Tendance des ventes"*

👥 **Clients**
• *"Top clients"* • *"Clients inactifs"* • *"Endettement clients"*
• *"Détail client [nom]"* • *"Dépôts clients"*

💰 **Finance & Caisse**
• *"État de la caisse"* • *"Recettes du mois"* • *"Dépenses"*
• *"Impayés"* • *"Analyse de marge"* • *"Modes de paiement"*

🏭 **Logistique & Stock**
• *"Tonnage"* • *"Véhicules"* • *"Chauffeurs"* • *"Stock"*

🧠 **Questions intelligentes**
• *"Quels sont les risques ?"* • *"Que dois-je faire ?"*
• *"Pourquoi les ventes baissent ?"* • *"Prévisions"*
• *"Quel est le meilleur jour de vente ?"*
• *"Résumé global"* • *"Qui es-tu ?"*

💡 *Posez votre question en langage naturel, je comprends le français !*`,
    data: null, chartType: null
  };
}

// ============================================================
//  HANDLERS — PARTENAIRES
// ============================================================
async function handlePartnersList() {
  try {
    const [rows] = await pool.execute(`SELECT name, company, phone, email, is_active FROM partners ORDER BY is_active DESC, name LIMIT 20`);
    if (!rows.length) return { answer: 'Vous n\'avez aucun partenaire enregistré pour le moment.', data: null, chartType: null };
    const actifs = rows.filter(r => r.is_active).length;
    const lines = rows.map((r, i) => `${i+1}. ${r.is_active ? '🟢' : '🔴'} **${r.name}** ${r.company ? '(' + r.company + ')' : ''} ${r.phone ? '📞 ' + r.phone : ''}`);
    return { answer: `Vous avez **${rows.length} partenaires** dont **${actifs} actifs**.\n\n${lines.join('\n')}\n\n💡 *Demandez "contrats partenaires" pour voir les investissements.*`, data: null, chartType: null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des partenaires : ' + err.message, data: null, chartType: null }; }
}

async function handlePartnersContracts() {
  try {
    const [rows] = await pool.execute(`
      SELECT pc.label, p.name as partner, pc.invested_amount, pc.monthly_return, pc.duration_months, pc.start_date, pc.status, pc.total_paid, pc.remaining_to_pay
      FROM partner_contracts pc JOIN partners p ON pc.partner_id = p.id ORDER BY pc.start_date DESC LIMIT 15`);
    if (!rows.length) return { answer: 'Aucun contrat partenaire enregistré.', data: null, chartType: null };
    const totalInvested = rows.reduce((s, r) => s + Number(r.invested_amount || 0), 0);
    const lines = rows.map((r, i) => `${i+1}. **${r.label}** — ${r.partner} : ${fmt(r.invested_amount)} FCFA investis, retour ${fmt(r.monthly_return)} FCFA/mois [${r.status}]`);
    const data = rows.slice(0, 8).map(r => ({ name: r.partner, value: Number(r.invested_amount) }));
    return { answer: `**Contrats partenaires** — Total investi : **${fmt(totalInvested)} FCFA**\n\n${lines.join('\n')}`, data: data.length ? data : null, chartType: data.length ? 'bar' : null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des contrats : ' + err.message, data: null, chartType: null }; }
}

// ============================================================
//  HANDLERS — EMPLOYÉS & SALAIRES
// ============================================================
async function handleEmployeesList() {
  try {
    const [rows] = await pool.execute(`SELECT first_name, last_name, position, department, contract_type, base_salary, status FROM employees ORDER BY status ASC, last_name LIMIT 25`);
    if (!rows.length) return { answer: 'Aucun employé enregistré dans le système.', data: null, chartType: null };
    const actifs = rows.filter(r => r.status === 'active').length;
    const masse = rows.filter(r => r.status === 'active').reduce((s, r) => s + Number(r.base_salary || 0), 0);
    const lines = rows.map((r, i) => `${i+1}. ${r.status === 'active' ? '🟢' : '🔴'} **${r.first_name} ${r.last_name}** — ${r.position || 'N/A'} (${r.department || 'N/A'}) [${r.contract_type}] ${fmt(r.base_salary)} FCFA`);
    return { answer: `Votre équipe compte **${rows.length} employés** dont **${actifs} actifs**.\nMasse salariale mensuelle : **${fmt(masse)} FCFA**\n\n${lines.join('\n')}`, data: null, chartType: null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des employés : ' + err.message, data: null, chartType: null }; }
}

async function handleSalaryInfo() {
  try {
    const [recent] = await pool.execute(`
      SELECT sp.payment_month, sp.payment_year, COUNT(*) as nb, SUM(sp.net_salary) as total_net, SUM(sp.gross_salary) as total_brut
      FROM salary_payments sp WHERE sp.status = 'paid' GROUP BY sp.payment_year, sp.payment_month ORDER BY sp.payment_year DESC, sp.payment_month DESC LIMIT 6`);
    if (!recent.length) {
      const [emps] = await pool.execute(`SELECT COUNT(*) as nb, COALESCE(SUM(base_salary),0) as masse FROM employees WHERE status = 'active'`);
      return { answer: `Aucun bulletin de salaire enregistré.\n\nMasse salariale théorique : **${fmt(emps[0].masse)} FCFA** pour ${emps[0].nb} employés actifs.`, data: null, chartType: null };
    }
    const lines = recent.map(r => `• **${r.payment_month}/${r.payment_year}** — ${r.nb} bulletins, net total : **${fmt(r.total_net)} FCFA**`);
    const data = recent.reverse().map(r => ({ name: `${r.payment_month}/${r.payment_year}`, value: Number(r.total_net) }));
    return { answer: `**Historique des salaires**\n\n${lines.join('\n')}`, data: data.length ? data : null, chartType: data.length ? 'bar' : null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des salaires : ' + err.message, data: null, chartType: null }; }
}

async function handleSalaryAdvances() {
  try {
    const [rows] = await pool.execute(`
      SELECT sa.amount, sa.reason, sa.request_date, sa.status, CONCAT(e.first_name, ' ', e.last_name) as employee
      FROM salary_advances sa JOIN employees e ON sa.employee_id = e.id ORDER BY sa.request_date DESC LIMIT 15`);
    if (!rows.length) return { answer: 'Aucune avance sur salaire enregistrée.', data: null, chartType: null };
    const pending = rows.filter(r => r.status === 'pending');
    const totalPending = pending.reduce((s, r) => s + Number(r.amount), 0);
    const lines = rows.map((r, i) => {
      const emoji = r.status === 'pending' ? '⏳' : r.status === 'approved' ? '✅' : r.status === 'rejected' ? '❌' : '💰';
      return `${i+1}. ${emoji} **${r.employee}** — ${fmt(r.amount)} FCFA [${r.status}] ${r.reason || ''}`;
    });
    return { answer: `**Avances sur salaire** — ${pending.length} en attente (${fmt(totalPending)} FCFA)\n\n${lines.join('\n')}`, data: null, chartType: null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des avances : ' + err.message, data: null, chartType: null }; }
}

// ============================================================
//  HANDLERS — PROJETS
// ============================================================
async function handleProjectsList() {
  try {
    const [rows] = await pool.execute(`SELECT name, code, client, location, status, budget_prevu, date_debut, responsable FROM projects ORDER BY FIELD(status,'actif','en_pause','termine','annule'), date_debut DESC LIMIT 20`);
    if (!rows.length) return { answer: 'Aucun projet ou chantier enregistré.', data: null, chartType: null };
    const actifs = rows.filter(r => r.status === 'actif').length;
    const totalBudget = rows.reduce((s, r) => s + Number(r.budget_prevu || 0), 0);
    const lines = rows.map((r, i) => {
      const emoji = r.status === 'actif' ? '🟢' : r.status === 'en_pause' ? '🟡' : r.status === 'termine' ? '✅' : '🔴';
      return `${i+1}. ${emoji} **${r.name}** (${r.code}) — Client: ${r.client || 'N/A'} | Budget: ${fmt(r.budget_prevu)} FCFA [${r.status}]`;
    });
    const data = rows.filter(r => r.budget_prevu).slice(0, 8).map(r => ({ name: r.code || r.name, value: Number(r.budget_prevu) }));
    return { answer: `Vous avez **${rows.length} projets** dont **${actifs} en cours**.\nBudget total prévu : **${fmt(totalBudget)} FCFA**\n\n${lines.join('\n')}`, data: data.length ? data : null, chartType: data.length ? 'bar' : null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des projets : ' + err.message, data: null, chartType: null }; }
}

// ============================================================
//  HANDLERS — BANQUE
// ============================================================
async function handleBankInfo() {
  try {
    const [accounts] = await pool.execute(`
      SELECT ba.account_name, ba.account_number, ba.current_balance, ba.account_type, b.name as bank_name
      FROM bank_accounts ba LEFT JOIN banks b ON ba.bank_id = b.id WHERE ba.is_active = 1 ORDER BY ba.current_balance DESC LIMIT 15`);
    let loansInfo = '';
    try {
      const [loans] = await pool.execute(`SELECT label, principal_amount, remaining_amount, interest_rate, status FROM bank_loans WHERE status = 'active' LIMIT 5`);
      if (loans.length) {
        const totalDebt = loans.reduce((s, r) => s + Number(r.remaining_amount || 0), 0);
        const loanLines = loans.map(r => `• **${r.label}** — Restant : ${fmt(r.remaining_amount)} FCFA (taux : ${r.interest_rate}%)`);
        loansInfo = `\n\n🏦 **Prêts actifs** — Encours : **${fmt(totalDebt)} FCFA**\n${loanLines.join('\n')}`;
      }
    } catch {}
    if (!accounts.length) return { answer: `Aucun compte bancaire enregistré.${loansInfo}`, data: null, chartType: null };
    const totalBalance = accounts.reduce((s, r) => s + Number(r.current_balance || 0), 0);
    const lines = accounts.map((r, i) => `${i+1}. **${r.account_name}** (${r.bank_name || 'N/A'}) — Solde : **${fmt(r.current_balance)} FCFA** [${r.account_type || 'courant'}]`);
    const data = accounts.map(r => ({ name: r.account_name, value: Math.max(0, Number(r.current_balance)) }));
    return { answer: `**Situation bancaire** — Solde total : **${fmt(totalBalance)} FCFA**\n\n${lines.join('\n')}${loansInfo}`, data: data.length ? data : null, chartType: data.length ? 'bar' : null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des infos bancaires : ' + err.message, data: null, chartType: null }; }
}

// ============================================================
//  HANDLERS — LIVRAISONS
// ============================================================
async function handleDeliveriesList() {
  try {
    const [rows] = await pool.execute(`
      SELECT dn.delivery_number, dn.delivery_date, dn.status, dn.driver_name, dn.vehicle_plate, dn.product_type, dn.weight_tons, c.name as client
      FROM delivery_notes dn LEFT JOIN customers c ON dn.customer_id = c.id ORDER BY dn.delivery_date DESC LIMIT 15`);
    if (!rows.length) return { answer: 'Aucun bon de livraison enregistré.', data: null, chartType: null };
    const pending = rows.filter(r => r.status === 'pending' || r.status === 'in_transit').length;
    const lines = rows.map((r, i) => {
      const emoji = r.status === 'delivered' ? '✅' : r.status === 'in_transit' ? '🚛' : r.status === 'pending' ? '⏳' : '❌';
      return `${i+1}. ${emoji} **${r.delivery_number}** — ${r.client || 'N/A'} | ${r.weight_tons || '?'}T | ${r.driver_name || 'N/A'} (${r.vehicle_plate || 'N/A'}) [${r.status}]`;
    });
    return { answer: `**Bons de livraison** — ${pending} en cours\n\n${lines.join('\n')}`, data: null, chartType: null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des livraisons : ' + err.message, data: null, chartType: null }; }
}

// ============================================================
//  HANDLERS — AVOIRS
// ============================================================
async function handleCreditNotesList() {
  try {
    const [rows] = await pool.execute(`
      SELECT cn.credit_note_number, cn.total_amount, cn.reason, cn.status, cn.created_at, c.name as client
      FROM credit_notes cn LEFT JOIN customers c ON cn.customer_id = c.id ORDER BY cn.created_at DESC LIMIT 15`);
    if (!rows.length) return { answer: 'Aucun avoir enregistré.', data: null, chartType: null };
    const total = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const lines = rows.map((r, i) => `${i+1}. **${r.credit_note_number}** — ${r.client || 'N/A'} : ${fmt(r.total_amount)} FCFA [${r.status}] ${r.reason || ''}`);
    return { answer: `**Avoirs** — Total : **${fmt(total)} FCFA**\n\n${lines.join('\n')}`, data: null, chartType: null };
  } catch (err) { return { answer: 'Erreur lors de la récupération des avoirs : ' + err.message, data: null, chartType: null }; }
}

// ============================================================
//  HANDLER — RECHERCHE INTELLIGENTE (FALLBACK ULTIME)
// ============================================================
async function handleSmartSearch(question) {
  const searchTerm = question.replace(/[^a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s0-9'-]/g, '').trim();

  // 1. Recherche clients
  try {
    const [clients] = await pool.execute(`
      SELECT c.name, c.phone, c.city, c.status, COALESCE(SUM(s.total_amount),0) as ca, COUNT(s.id) as nb
      FROM customers c LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
      WHERE c.name LIKE ? GROUP BY c.id, c.name, c.phone, c.city, c.status LIMIT 5`,
      [`%${searchTerm}%`]);
    if (clients.length > 0) {
      const lines = clients.map((c, i) => `${i+1}. **${c.name}** — ${fmt(c.ca)} FCFA (${c.nb} ventes) ${c.phone ? '📞 ' + c.phone : ''} ${c.city ? '📍 ' + c.city : ''}`);
      return { answer: `J'ai trouvé ${clients.length} client(s) correspondant à votre recherche :\n\n${lines.join('\n')}\n\n💬 *Demandez "détail client ${clients[0].name}" pour plus d'infos.*`, data: null, chartType: null };
    }
  } catch {}

  // 2. Recherche produits
  try {
    const [products] = await pool.execute(`SELECT name, selling_price, status FROM products WHERE name LIKE ? LIMIT 5`, [`%${searchTerm}%`]);
    if (products.length > 0) {
      const lines = products.map((p, i) => `${i+1}. **${p.name}** — ${fmt(p.selling_price)} FCFA [${p.status}]`);
      return { answer: `Voici les produits trouvés :\n\n${lines.join('\n')}`, data: null, chartType: null };
    }
  } catch {}

  // 3. Recherche fournisseurs
  try {
    const [suppliers] = await pool.execute(`SELECT name, contact_person, phone, city FROM suppliers WHERE name LIKE ? OR contact_person LIKE ? LIMIT 5`, [`%${searchTerm}%`, `%${searchTerm}%`]);
    if (suppliers.length > 0) {
      const lines = suppliers.map((s, i) => `${i+1}. **${s.name}** ${s.contact_person ? '(' + s.contact_person + ')' : ''} ${s.phone ? '📞 ' + s.phone : ''}`);
      return { answer: `Voici les fournisseurs trouvés :\n\n${lines.join('\n')}`, data: null, chartType: null };
    }
  } catch {}

  // 4. Recherche ventes
  try {
    const [sales] = await pool.execute(`
      SELECT s.sale_number, COALESCE(s.client_name, c.name, 'N/A') as client, s.total_amount, s.sale_date, s.type_beton
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
      WHERE (s.sale_number LIKE ? OR s.client_name LIKE ? OR s.type_beton LIKE ? OR s.destination LIKE ?)
      AND s.status != 'cancelled' ORDER BY s.sale_date DESC LIMIT 5`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
    if (sales.length > 0) {
      const lines = sales.map((s, i) => `${i+1}. **${s.sale_number}** — ${s.client} : ${fmt(s.total_amount)} FCFA (${s.type_beton || 'N/A'})`);
      return { answer: `Voici les ventes trouvées :\n\n${lines.join('\n')}`, data: null, chartType: null };
    }
  } catch {}

  // 5. ⭐ EXPLORATEUR BDD — dernier recours intelligent
  try {
    const explorerResult = await exploreDatabase(question);
    if (explorerResult && explorerResult.answer) {
      return explorerResult;
    }
  } catch (explorerErr) {
    console.error('DB Explorer fallback error:', explorerErr.message);
  }

  // 6. Fallback humain — jamais "je ne comprends pas"
  return {
    answer: `Je n'ai pas trouvé de données correspondant exactement à "${question}" dans la base.\n\nVoici ce que je peux faire pour vous :\n\n📊 **Analyse d'activité** — "CA du jour", "ventes du mois", "résumé global"\n👥 **Clients** — "top clients", "clients inactifs", "endettement"\n💰 **Finances** — "état de la caisse", "impayés", "marge"\n🤝 **Partenaires** — "mes partenaires", "contrats partenaires"\n👷 **Équipe** — "mes employés", "salaires", "avances"\n🏗️ **Projets** — "mes projets", "chantiers"\n🏦 **Banque** — "situation bancaire", "prêts"\n🚛 **Logistique** — "livraisons", "véhicules", "tonnage"\n📦 **Stock** — "état du stock", "mouvements stock"\n🧠 **Intelligence** — "quels risques ?", "que faire ?", "prévisions"\n\n💡 *Posez votre question naturellement, je comprends le français !*`,
    data: null, chartType: null
  };
}

// ============================================================
//  EXPORTS
// ============================================================
module.exports = {
  processQuery,
  conversationManager,
  detectIntent,
  executeIntent
};
