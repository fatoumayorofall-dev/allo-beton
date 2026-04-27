/**
 * ALLO BÉTON — ROUTES COMPTABILITÉ OHADA / SAGE
 * API REST pour le module comptable
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const compta = require('../services/comptabiliteService');

// Middleware d'authentification et d'autorisation
const { authenticateToken, requireRole } = require('../middleware/auth');

// Seuls les admins et comptables peuvent écrire/modifier des écritures
const requireComptable = requireRole(['admin', 'comptable', 'manager']);

// ═══════════════════════════════════════════════════
// PLAN COMPTABLE
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/plan-comptable
router.get('/plan-comptable', authenticateToken, async (req, res) => {
  try {
    const { classe } = req.query;
    const comptes = await compta.getPlanComptable(classe || null);
    res.json({ success: true, data: comptes, total: comptes.length });
  } catch (error) {
    console.error('Erreur plan comptable:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/plan-comptable/:code
router.get('/plan-comptable/:code', authenticateToken, async (req, res) => {
  try {
    const compte = await compta.getCompte(req.params.code);
    if (!compte) return res.status(404).json({ success: false, error: 'Compte non trouvé' });
    res.json({ success: true, data: compte });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/plan-comptable
router.post('/plan-comptable', authenticateToken, async (req, res) => {
  try {
    const { code, libelle, classe, type, parent_code, is_detail } = req.body;
    if (!code || !libelle || !classe || !type) {
      return res.status(400).json({ success: false, error: 'Champs requis: code, libelle, classe, type' });
    }
    const compte = await compta.createCompte({ code, libelle, classe, type, parent_code, is_detail });
    res.status(201).json({ success: true, data: compte });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: `Le compte ${req.body.code} existe déjà` });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// JOURNAUX & ÉCRITURES COMPTABLES
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/journaux
router.get('/journaux', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM journaux_comptables WHERE is_active = 1 ORDER BY code');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/ecritures
router.get('/ecritures', authenticateToken, async (req, res) => {
  try {
    const { journal_code, date_debut, date_fin, exercice, page, limit } = req.query;
    const result = await compta.getJournal({ journal_code, date_debut, date_fin, exercice, page, limit });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/ecritures — Saisie manuelle d'écriture
router.post('/ecritures', authenticateToken, requireComptable, async (req, res) => {
  try {
    const { journal_code, date_ecriture, numero_piece, lignes } = req.body;
    if (!journal_code || !date_ecriture || !lignes || !lignes.length) {
      return res.status(400).json({ success: false, error: 'Champs requis: journal_code, date_ecriture, lignes[]' });
    }
    const result = await compta.createEcriture({
      journal_code, date_ecriture, numero_piece, lignes, created_by: req.user?.id
    });
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/ecritures/valider — Valider des écritures (brouillard → validé)
router.post('/ecritures/valider', authenticateToken, requireComptable, async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await compta.validerEcritures(ids);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/ecritures/contre-passer — Contre-passer une écriture validée
router.post('/ecritures/contre-passer', authenticateToken, async (req, res) => {
  try {
    const { numero_ecriture } = req.body;
    const result = await compta.contrePasserEcriture(numero_ecriture);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// COMPTABILISATION AUTOMATIQUE
// ═══════════════════════════════════════════════════

// POST /api/comptabilite/import-historique — Comptabiliser tout l'historique existant
router.post('/import-historique', authenticateToken, async (req, res) => {
  try {
    const result = await compta.comptabiliserHistorique();
    res.json({
      success: true,
      message: 'Import historique terminé',
      ...result,
      total: result.ventes + result.paiements + result.caisse + result.achats + result.salaires + result.avoirs
    });
  } catch (error) {
    console.error('Erreur import historique:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ÉTATS FINANCIERS
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/grand-livre
router.get('/grand-livre', authenticateToken, async (req, res) => {
  try {
    const { compte_code, date_debut, date_fin, exercice } = req.query;
    const result = await compta.getGrandLivre({ compte_code, date_debut, date_fin, exercice });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const { exercice, date_fin } = req.query;
    const result = await compta.getBalanceGenerale({ exercice, date_fin });
    res.json({ success: true, data: result.comptes, totaux: { ...result.totaux, debit: result.totaux.total_debit, credit: result.totaux.total_credit }, exercice: result.exercice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/balance-agee — Balance âgée des tiers
router.get('/balance-agee', authenticateToken, async (req, res) => {
  try {
    const { type, exercice } = req.query;
    const result = await compta.getBalanceAgee({ type: type || 'client', exercice: exercice || null });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/compte-resultat
router.get('/compte-resultat', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const result = await compta.getCompteResultat(exercice);
    // Comparatif N-1
    const annee = parseInt(exercice) || new Date().getFullYear();
    let n1 = null;
    try { n1 = await compta.getCompteResultat(annee - 1); } catch(_) {}
    res.json({ success: true, ...result, n1: n1 ? { sig: n1.sig, total_charges: n1.total_charges, total_produits: n1.total_produits, resultat_net: n1.resultat_net } : null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/bilan
router.get('/bilan', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const result = await compta.getBilan(exercice);
    // Comparatif N-1
    const annee = parseInt(exercice) || new Date().getFullYear();
    let n1 = null;
    try { n1 = await compta.getBilan(annee - 1); } catch(_) {}
    res.json({ success: true, ...result, n1: n1 ? { actif_total: n1.actif.total, passif_total: n1.passif.total } : null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const result = await compta.getDashboardComptable(exercice);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// TVA — Déclarations
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/tva
router.get('/tva', authenticateToken, async (req, res) => {
  try {
    const declarations = await compta.getDeclarationsTVA();
    res.json({ success: true, data: declarations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/tva/generer
router.post('/tva/generer', authenticateToken, async (req, res) => {
  try {
    const { periode } = req.body;
    if (!periode || !/^\d{4}-\d{2}$/.test(periode)) {
      return res.status(400).json({ success: false, error: 'Format période requis: YYYY-MM' });
    }
    const result = await compta.genererDeclarationTVA(periode);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// EXERCICES & CLÔTURE
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/exercices
router.get('/exercices', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM exercices ORDER BY annee DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/exercices/cloture-etapes/:annee — Statut des étapes de clôture
router.get('/exercices/cloture-etapes/:annee', authenticateToken, async (req, res) => {
  try {
    const annee = parseInt(req.params.annee);
    if (!annee) return res.status(400).json({ success: false, error: 'Année requise' });
    const result = await compta.getClotureEtapes(annee);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/exercices/cloturer
router.post('/exercices/cloturer', authenticateToken, async (req, res) => {
  try {
    const { annee } = req.body;
    if (!annee) return res.status(400).json({ success: false, error: 'Année requise' });
    const result = await compta.cloturerExercice(parseInt(annee));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// PARAMÈTRES COMPTABILITÉ
// ═══════════════════════════════════════════════════

router.get('/parametres', authenticateToken, async (req, res) => {
  try {
    const params = await compta.getParametres();
    res.json({ success: true, data: params });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/parametres', authenticateToken, async (req, res) => {
  try {
    const result = await compta.saveParametres(req.body);
    res.json(result);
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

// ═══════════════════════════════════════════════════
// COMPTABILITÉ ANALYTIQUE
// ═══════════════════════════════════════════════════

router.get('/analytique/centres', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const centres = await compta.getCentresAnalyse(exercice || null);
    res.json({ success: true, data: centres });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/analytique/centres', authenticateToken, async (req, res) => {
  try {
    const centre = await compta.createCentreAnalyse(req.body);
    res.status(201).json({ success: true, data: centre });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.delete('/analytique/centres/:id', authenticateToken, async (req, res) => {
  try {
    const result = await compta.deleteCentreAnalyse(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

// ═══════════════════════════════════════════════════
// IMMOBILISATIONS
// ═══════════════════════════════════════════════════

router.get('/immobilisations', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const immos = await compta.getImmobilisations(exercice || null);
    res.json({ success: true, data: immos });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/immobilisations', authenticateToken, async (req, res) => {
  try {
    const immo = await compta.createImmobilisation(req.body);
    res.status(201).json({ success: true, data: immo });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/immobilisations/:id', authenticateToken, async (req, res) => {
  try {
    const immo = await compta.updateImmobilisation(req.params.id, req.body);
    res.json({ success: true, data: immo });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.delete('/immobilisations/:id', authenticateToken, async (req, res) => {
  try {
    const result = await compta.deleteImmobilisation(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.post('/immobilisations/calculer-amortissements', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.body;
    const result = await compta.calculerAmortissements(exercice || null);
    res.json(result);
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

// ═══════════════════════════════════════════════════
// BUDGETS PRÉVISIONNELS
// ═══════════════════════════════════════════════════

router.get('/budgets', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const budgets = await compta.getBudgets(exercice || null);
    res.json({ success: true, data: budgets });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/budgets', authenticateToken, async (req, res) => {
  try {
    const budget = await compta.createBudget(req.body);
    res.status(201).json({ success: true, data: budget });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const budget = await compta.updateBudget(req.params.id, req.body);
    res.json({ success: true, data: budget });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.delete('/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const result = await compta.deleteBudget(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

// ═══════════════════════════════════════════════════
// RAPPROCHEMENT BANCAIRE
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/rapprochement?compte=512100&mois=2024-04
router.get('/rapprochement', authenticateToken, async (req, res) => {
  try {
    const { compte, mois } = req.query;
    if (!compte || !mois) return res.status(400).json({ success: false, error: 'compte et mois requis' });
    const result = await compta.getRapprochement(compte, mois);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/rapprochement/valider
router.post('/rapprochement/valider', authenticateToken, async (req, res) => {
  try {
    const { idsCompta, idsBanque } = req.body;
    const result = await compta.validerRapprochement(idsCompta || [], idsBanque || []);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// RELANCES CLIENTS
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/relances/clients-en-retard
router.get('/relances/clients-en-retard', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const clients = await compta.getClientsEnRetard(exercice || null);
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/relances/generer
router.post('/relances/generer', authenticateToken, async (req, res) => {
  try {
    const { compteCodes, niveau, exercice } = req.body;
    if (!compteCodes || !compteCodes.length || !niveau) {
      return res.status(400).json({ success: false, error: 'compteCodes et niveau requis' });
    }
    const result = await compta.genererRelances(compteCodes, niveau, exercice || null);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// LETTRAGE
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/lettrage/ecritures?compte=411&exercice=2024
router.get('/lettrage/ecritures', authenticateToken, async (req, res) => {
  try {
    const { compte, exercice } = req.query;
    if (!compte) return res.status(400).json({ success: false, error: 'Compte requis' });
    const ecritures = await compta.getEcrituresPourLettrage(compte, exercice || null);
    const nextLettre = await compta.getNextLettre(exercice || null);
    res.json({ success: true, data: ecritures, nextLettre });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/lettrage/lettrer
router.post('/lettrage/lettrer', authenticateToken, async (req, res) => {
  try {
    const { ids, lettre } = req.body;
    const result = await compta.lettrerEcritures(ids, lettre);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/lettrage/delettrer
router.post('/lettrage/delettrer', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await compta.delettrerEcritures(ids);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/lettrage/automatique
router.post('/lettrage/automatique', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.body;
    const result = await compta.lettrageAutomatique(exercice);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// TIERS COMPTABLES
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/echeancier
router.get('/echeancier', authenticateToken, async (req, res) => {
  try {
    const { type, exercice } = req.query;
    const result = await compta.getEcheancier({ type: type || 'client', exercice: exercice || null });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/tiers
router.get('/tiers', authenticateToken, async (req, res) => {
  try {
    const { type, search } = req.query;
    const tiers = await compta.getTiers({ type: type || null, search: search || null });
    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/tiers
router.post('/tiers', authenticateToken, async (req, res) => {
  try {
    const tiers = await compta.createTiers(req.body);
    res.status(201).json({ success: true, data: tiers });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/comptabilite/tiers/:id
router.put('/tiers/:id', authenticateToken, async (req, res) => {
  try {
    const tiers = await compta.updateTiers(req.params.id, req.body);
    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/comptabilite/tiers/:id
router.delete('/tiers/:id', authenticateToken, async (req, res) => {
  try {
    const result = await compta.deleteTiers(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ABONNEMENTS COMPTABLES
// ═══════════════════════════════════════════════════

// GET /api/comptabilite/abonnements
router.get('/abonnements', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const abonnements = await compta.getAbonnements(exercice || null);
    res.json({ success: true, data: abonnements });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/abonnements
router.post('/abonnements', authenticateToken, async (req, res) => {
  try {
    const abonnement = await compta.createAbonnement(req.body);
    res.status(201).json({ success: true, data: abonnement });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/comptabilite/abonnements/:id
router.put('/abonnements/:id', authenticateToken, async (req, res) => {
  try {
    const abonnement = await compta.updateAbonnement(req.params.id, req.body);
    res.json({ success: true, data: abonnement });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/comptabilite/abonnements/:id
router.delete('/abonnements/:id', authenticateToken, async (req, res) => {
  try {
    const result = await compta.deleteAbonnement(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/comptabilite/abonnements/:id/executer — Générer l'écriture
router.post('/abonnements/:id/executer', authenticateToken, async (req, res) => {
  try {
    const result = await compta.executerAbonnement(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/export/fec — Export FEC
router.get('/export/fec', authenticateToken, async (req, res) => {
  try {
    const { exercice } = req.query;
    const result = await compta.exportFEC(exercice);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/comptabilite/export/excel — Export Excel
router.get('/export/excel', authenticateToken, async (req, res) => {
  try {
    const { type, exercice } = req.query;
    const result = await compta.exportExcelComptable(type, exercice);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
