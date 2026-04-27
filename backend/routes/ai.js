// ============================================================
//  ROUTES IA v2.0 — /api/ai/*
//  Expose les endpoints pour le chat IA ultra-intelligent,
//  les prédictions, la détection d'anomalies et les rapports.
//  Supporte la mémoire conversationnelle via sessionId.
// ============================================================
const express = require('express');
const router = express.Router();

const { processQuery, conversationManager } = require('../services/ai-services/aiQueryService');
const { getSalesPredictions, getProductPredictions } = require('../services/ai-services/predictionService');
const { detectAnomalies } = require('../services/ai-services/anomalyDetectionService');
const { generateDailyReport } = require('../services/ai-services/dailyReportService');
const { isClaudeAvailable } = require('../services/ai-services/claudeService');
const { exploreDatabase, exploreDatabaseOverview, exploreTableSchema } = require('../services/ai-services/databaseExplorer');
const { processAgentTask, getTaskHelp } = require('../services/ai-services/taskAgent');

// Middleware auth optionnel (si présent)
let authMiddleware;
try {
  const auth = require('../middleware/auth');
  authMiddleware = auth.authenticateToken || auth;
  if (typeof authMiddleware !== 'function') {
    authMiddleware = (req, res, next) => next();
  }
} catch (e) {
  authMiddleware = (req, res, next) => next();
}

// ===================== CHAT IA v2.0 =====================
// POST /api/ai/query — Avec mémoire conversationnelle
router.post('/query', authMiddleware, async (req, res) => {
  try {
    const { question, sessionId, context } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'Veuillez poser une question.' });
    }

    // Utiliser le userId ou un sessionId fourni
    const sid = sessionId || (req.user ? `user_${req.user.id}` : 'default');
    
    const result = await processQuery(question.trim(), sid);
    res.json(result);
  } catch (error) {
    console.error('AI Query Route Error:', error);
    res.status(500).json({ success: false, error: 'Erreur du service IA.' });
  }
});

// ===================== CONTEXTE CONVERSATION =====================
// GET /api/ai/context — Récupérer le contexte conversationnel
router.get('/context', authMiddleware, (req, res) => {
  const sid = req.query.sessionId || (req.user ? `user_${req.user.id}` : 'default');
  const summary = conversationManager.getContextSummary(sid);
  const suggestions = conversationManager.getContextualSuggestions(sid);
  res.json({ success: true, context: summary, suggestions });
});

// DELETE /api/ai/context — Réinitialiser la conversation
router.delete('/context', authMiddleware, (req, res) => {
  const sid = req.query.sessionId || (req.user ? `user_${req.user.id}` : 'default');
  conversationManager.sessions.delete(sid);
  res.json({ success: true, message: 'Conversation réinitialisée.' });
});

// ===================== PRÉDICTIONS =====================
// GET /api/ai/predictions
router.get('/predictions', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const forecastDays = parseInt(req.query.forecast) || 7;
    const result = await getSalesPredictions({ days, forecastDays });
    res.json(result);
  } catch (error) {
    console.error('Prediction Route Error:', error);
    res.status(500).json({ success: false, error: 'Erreur du service de prédiction.' });
  }
});

// GET /api/ai/predictions/products
router.get('/predictions/products', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await getProductPredictions({ days });
    res.json(result);
  } catch (error) {
    console.error('Product Prediction Route Error:', error);
    res.status(500).json({ success: false, error: 'Erreur du service de prédiction produit.' });
  }
});

// ===================== ANOMALIES =====================
// GET /api/ai/anomalies
router.get('/anomalies', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await detectAnomalies({ days });
    res.json(result);
  } catch (error) {
    console.error('Anomaly Route Error:', error);
    res.status(500).json({ success: false, error: 'Erreur du service de détection.' });
  }
});

// ===================== RAPPORT JOURNALIER IA =====================
// GET /api/ai/daily-report
router.get('/daily-report', authMiddleware, async (req, res) => {
  try {
    const date = req.query.date || null;
    const result = await generateDailyReport(date);
    res.json(result);
  } catch (error) {
    console.error('Daily Report Route Error:', error);
    res.status(500).json({ success: false, error: 'Erreur du rapport IA.' });
  }
});

// ===================== EXPLORATEUR BDD =====================
// POST /api/ai/explore — Exploration dynamique de la base de données
router.post('/explore', authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, error: 'Question requise.' });
    }
    const result = await exploreDatabase(question.trim());
    if (!result) {
      return res.json({ success: false, error: 'Aucun résultat trouvé pour cette question.' });
    }
    res.json({ success: true, ...result, method: 'db_explorer' });
  } catch (error) {
    console.error('DB Explorer Route Error:', error);
    res.status(500).json({ success: false, error: 'Erreur de l\'explorateur BDD.' });
  }
});

// GET /api/ai/explore/overview — Vue d'ensemble de la BDD
router.get('/explore/overview', authMiddleware, async (req, res) => {
  try {
    const result = await exploreDatabaseOverview();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('DB Overview Route Error:', error);
    res.status(500).json({ success: false, error: 'Erreur vue d\'ensemble BDD.' });
  }
});

// GET /api/ai/explore/schema/:table — Structure d'une table
router.get('/explore/schema/:table', authMiddleware, (req, res) => {
  const result = exploreTableSchema(req.params.table);
  if (!result) return res.status(404).json({ success: false, error: 'Table non trouvée.' });
  res.json({ success: true, ...result });
});

// ===================== AGENT IA — EXÉCUTION DE TÂCHES =====================
// POST /api/ai/agent/execute — Exécuter une tâche via l'agent IA
router.post('/agent/execute', authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, error: 'Instruction requise.' });
    }
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentification requise pour exécuter des tâches.' });
    }
    const result = await processAgentTask(question.trim(), userId);
    if (!result) {
      return res.json({ success: false, error: 'Tâche non reconnue. Dites "aide agent" pour voir les tâches disponibles.' });
    }
    res.json({ success: true, ...result, method: 'task_agent' });
  } catch (error) {
    console.error('Task Agent Route Error:', error);
    res.status(500).json({ success: false, error: 'Erreur de l\'agent IA.' });
  }
});

// GET /api/ai/agent/tasks — Liste des tâches disponibles
router.get('/agent/tasks', authMiddleware, (req, res) => {
  const result = getTaskHelp();
  res.json({ success: true, ...result });
});

// ===================== STATUT IA =====================
// GET /api/ai/status — Vérifie le mode IA actif
router.get('/status', (req, res) => {
  res.json({
    success: true,
    engine: isClaudeAvailable() ? 'claude' : 'local',
    model: isClaudeAvailable() ? (process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514') : 'NLP v3 Local',
    features: ['chat', 'predictions', 'anomalies', 'daily-report', 'suggestions', 'db-explorer', 'task-agent']
  });
});

// ===================== SUGGESTIONS RAPIDES v2.0 =====================
// GET /api/ai/suggestions — Retourne les questions suggérées (toutes catégories)
router.get('/suggestions', (req, res) => {
  res.json({
    success: true,
    suggestions: [
      // Conversation
      { icon: '👋', text: 'Bonjour', category: 'Conversation' },
      // Dashboard
      { icon: '📊', text: 'Résumé global du jour', category: 'Dashboard' },
      { icon: '📈', text: 'Tendances des 30 derniers jours', category: 'Dashboard' },
      // Ventes
      { icon: '💰', text: 'Chiffre d\'affaires du mois', category: 'Ventes' },
      { icon: '📊', text: 'Ventes d\'aujourd\'hui', category: 'Ventes' },
      { icon: '🕐', text: 'Dernières ventes', category: 'Ventes' },
      { icon: '📈', text: 'Compare les ventes ce mois vs le mois dernier', category: 'Ventes' },
      // Clients
      { icon: '🏆', text: 'Top 10 meilleurs clients', category: 'Clients' },
      { icon: '👥', text: 'Combien de clients actifs ?', category: 'Clients' },
      { icon: '💳', text: 'Endettement clients', category: 'Clients' },
      { icon: '😴', text: 'Clients inactifs', category: 'Clients' },
      { icon: '📋', text: 'État des quotas', category: 'Clients' },
      { icon: '💰', text: 'Dépôts clients', category: 'Clients' },
      // Finance
      { icon: '🏦', text: 'État de la caisse', category: 'Finance' },
      { icon: '📥', text: 'Recettes de la caisse ce mois', category: 'Finance' },
      { icon: '💸', text: 'Dépenses du mois', category: 'Finance' },
      { icon: '⚠️', text: 'Y a-t-il des impayés ?', category: 'Finance' },
      { icon: '💰', text: 'Analyse de marge', category: 'Finance' },
      { icon: '💳', text: 'Répartition par mode de paiement', category: 'Finance' },
      // Factures
      { icon: '🧾', text: 'Factures du mois', category: 'Factures' },
      { icon: '🧾', text: 'Factures impayées', category: 'Factures' },
      // Produits
      { icon: '📦', text: 'Top produits vendus', category: 'Produits' },
      { icon: '💲', text: 'Tarifs des produits', category: 'Produits' },
      { icon: '🏗️', text: 'Types de béton vendus', category: 'Produits' },
      // Logistique
      { icon: '🚛', text: 'Tonnage chargé cette semaine', category: 'Logistique' },
      { icon: '🚛', text: 'Liste des véhicules', category: 'Logistique' },
      { icon: '👷', text: 'Résumé chauffeurs', category: 'Logistique' },
      { icon: '📍', text: 'Analyse des destinations', category: 'Logistique' },
      // Stock
      { icon: '📦', text: 'État des stocks', category: 'Stock' },
      { icon: '📦', text: 'Mouvements de stock', category: 'Stock' },
      // Fournisseurs
      { icon: '🏭', text: 'Liste des fournisseurs', category: 'Fournisseurs' },
      { icon: '📋', text: 'Bons de commande', category: 'Fournisseurs' },
      // E-commerce
      { icon: '🛒', text: 'Vue d\'ensemble e-commerce', category: 'E-commerce' },
      { icon: '🛒', text: 'Commandes en ligne', category: 'E-commerce' },
      // Système
      { icon: '👤', text: 'Liste des utilisateurs', category: 'Système' },
      { icon: '🔔', text: 'Notifications en attente', category: 'Système' },
      // Avancé
      { icon: '📊', text: 'CA en janvier', category: 'Avancé' },
      { icon: '📈', text: 'Évolution des ventes semaine dernière', category: 'Avancé' },
      { icon: '🔍', text: 'Rechercher un client par nom', category: 'Avancé' },
      // Aide
      { icon: '🤖', text: 'Que peux-tu faire ?', category: 'Aide' },
      // Database Explorer
      { icon: '🗄️', text: 'Vue d\'ensemble de la base de données', category: 'Explorer BDD' },
      { icon: '🔍', text: 'Structure de la table clients', category: 'Explorer BDD' },
      { icon: '📊', text: 'Combien de ventes ce mois ?', category: 'Explorer BDD' },
      { icon: '🔎', text: 'Rechercher le client Diallo', category: 'Explorer BDD' },
      { icon: '📋', text: 'Liste des employés actifs', category: 'Explorer BDD' },
      { icon: '📈', text: 'Total des paiements cette semaine', category: 'Explorer BDD' },
      // Agent IA
      { icon: '🤖', text: 'Crée un client Moussa Diallo', category: 'Agent IA' },
      { icon: '📝', text: 'Enregistre une vente pour Diop, Béton B25, 10 tonnes', category: 'Agent IA' },
      { icon: '💳', text: 'Enregistre un paiement de 500 000 FCFA', category: 'Agent IA' },
      { icon: '📥', text: 'Entrée de caisse 200 000 FCFA', category: 'Agent IA' },
      { icon: '📤', text: 'Sortie de caisse 50 000 FCFA catégorie transport', category: 'Agent IA' },
      { icon: '📦', text: 'Entrée de stock produit Ciment 50 tonnes', category: 'Agent IA' },
      { icon: '📋', text: 'Clôturer la journée', category: 'Agent IA' },
      { icon: '🔔', text: 'Envoyer des rappels pour les impayés', category: 'Agent IA' },
    ]
  });
});

module.exports = router;
