/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALERT SERVICE - Système d'Alertes Intelligentes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Détection et notification des situations critiques:
 * - Retards de paiement clients
 * - Trésorerie faible
 * - Dépenses anormales
 * - Échéances à venir
 * - Anomalies comptables
 *
 * @author Claude AI - Architecte SaaS Expert SYSCOHADA
 * @version 1.0.0
 */

const db = require('../db');

// ═══════════════════════════════════════════════════════════════════════════════
// SEUILS D'ALERTE
// ═══════════════════════════════════════════════════════════════════════════════

const ALERT_THRESHOLDS = {
  // Trésorerie
  TRESORERIE_CRITIQUE: 500000,        // 500 000 F - Alerte rouge
  TRESORERIE_ATTENTION: 2000000,      // 2 000 000 F - Alerte orange

  // Retards paiement
  RETARD_ATTENTION: 7,                // 7 jours - Premier rappel
  RETARD_URGENT: 30,                  // 30 jours - Relance urgente
  RETARD_CRITIQUE: 60,                // 60 jours - Client à risque

  // Dépenses
  DEPENSE_ANORMALE_RATIO: 1.5,        // 150% de la moyenne
  DEPENSE_EXCEPTIONNELLE: 5000000,    // 5 000 000 F

  // Stock
  STOCK_MINIMUM: 10,                  // Unités minimum
  STOCK_ALERTE: 20,                   // Niveau d'alerte

  // Échéances
  ECHEANCE_PROCHE: 7,                 // Jours avant échéance

  // Limites crédit
  CREDIT_LIMITE_ATTENTION: 0.8,       // 80% de la limite
  CREDIT_LIMITE_CRITIQUE: 0.95        // 95% de la limite
};

// Types d'alertes
const ALERT_TYPES = {
  TRESORERIE_FAIBLE: 'tresorerie_faible',
  TRESORERIE_CRITIQUE: 'tresorerie_critique',
  RETARD_PAIEMENT: 'retard_paiement',
  CLIENT_A_RISQUE: 'client_a_risque',
  DEPENSE_ANORMALE: 'depense_anormale',
  STOCK_BAS: 'stock_bas',
  ECHEANCE_PROCHE: 'echeance_proche',
  ECHEANCE_DEPASSEE: 'echeance_depassee',
  LIMITE_CREDIT: 'limite_credit',
  ANOMALIE_COMPTABLE: 'anomalie_comptable',
  TVA_A_DECLARER: 'tva_a_declarer',
  CLOTURE_EXERCICE: 'cloture_exercice'
};

// Niveaux de sévérité
const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  DANGER: 'danger',
  CRITICAL: 'critical'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSE PRINCIPALE - ALERT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

class AlertService {

  constructor() {
    this.alerts = [];
    this.lastCheck = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION COMPLÈTE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Exécute toutes les vérifications et retourne les alertes
   */
  async checkAll() {
    console.log('[AlertService] Vérification complète des alertes...');
    this.alerts = [];

    await Promise.all([
      this.checkTresorerie(),
      this.checkRetardsPaiement(),
      this.checkDepensesAnormales(),
      this.checkStocks(),
      this.checkEcheances(),
      this.checkLimitesCredit(),
      this.checkTVA(),
      this.checkAnomalies()
    ]);

    this.lastCheck = new Date();

    // Trier par sévérité
    const severityOrder = { critical: 0, danger: 1, warning: 2, info: 3 };
    this.alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    console.log(`[AlertService] ${this.alerts.length} alerte(s) détectée(s)`);
    return this.alerts;
  }

  /**
   * Récupère les alertes actives (mise en cache)
   */
  async getActiveAlerts(forceRefresh = false) {
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes

    if (!forceRefresh && this.lastCheck && (Date.now() - this.lastCheck.getTime()) < cacheExpiry) {
      return this.alerts;
    }

    return await this.checkAll();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION TRÉSORERIE
  // ─────────────────────────────────────────────────────────────────────────────

  async checkTresorerie() {
    try {
      // Solde caisse
      const [caisseRows] = await db.query(`
        SELECT COALESCE(SUM(CASE WHEN type = 'entree' THEN montant ELSE -montant END), 0) as solde
        FROM cash_movements
        WHERE YEAR(date_mouvement) = YEAR(CURDATE())
      `);
      const soldeCaisse = parseFloat(caisseRows[0]?.solde) || 0;

      // Solde banques
      const [banqueRows] = await db.query(`
        SELECT COALESCE(SUM(current_balance), 0) as solde
        FROM bank_accounts WHERE is_active = 1
      `);
      const soldeBanque = parseFloat(banqueRows[0]?.solde) || 0;

      // Solde mobile money (estimé depuis écritures)
      const [mobileRows] = await db.query(`
        SELECT COALESCE(SUM(debit) - SUM(credit), 0) as solde
        FROM ecritures_comptables
        WHERE compte_numero LIKE '585%'
        AND exercice = YEAR(CURDATE())
      `);
      const soldeMobile = parseFloat(mobileRows[0]?.solde) || 0;

      const tresorerieTotal = soldeCaisse + soldeBanque + soldeMobile;

      if (tresorerieTotal <= ALERT_THRESHOLDS.TRESORERIE_CRITIQUE) {
        this.addAlert({
          type: ALERT_TYPES.TRESORERIE_CRITIQUE,
          severity: SEVERITY.CRITICAL,
          title: 'Trésorerie critique',
          message: `Solde de trésorerie très faible: ${this.formatMontant(tresorerieTotal)} F`,
          data: { solde: tresorerieTotal, caisse: soldeCaisse, banque: soldeBanque, mobile: soldeMobile },
          action: 'Vérifier les encaissements en attente et retarder les décaissements non urgents'
        });
      } else if (tresorerieTotal <= ALERT_THRESHOLDS.TRESORERIE_ATTENTION) {
        this.addAlert({
          type: ALERT_TYPES.TRESORERIE_FAIBLE,
          severity: SEVERITY.WARNING,
          title: 'Trésorerie en baisse',
          message: `Solde de trésorerie à surveiller: ${this.formatMontant(tresorerieTotal)} F`,
          data: { solde: tresorerieTotal, caisse: soldeCaisse, banque: soldeBanque, mobile: soldeMobile },
          action: 'Relancer les clients en retard de paiement'
        });
      }
    } catch (error) {
      console.error('Erreur checkTresorerie:', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION RETARDS PAIEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  async checkRetardsPaiement() {
    try {
      const [clients] = await db.query(`
        SELECT
          c.id,
          c.company_name,
          c.current_balance as dette,
          c.credit_limit,
          MIN(s.due_date) as plus_ancienne_echeance,
          DATEDIFF(CURDATE(), MIN(s.due_date)) as jours_retard,
          COUNT(DISTINCT s.id) as nb_factures_impayees
        FROM customers c
        INNER JOIN sales s ON c.id = s.customer_id
        WHERE c.current_balance > 0
          AND s.payment_status != 'paid'
          AND s.due_date < CURDATE()
          AND s.status != 'cancelled'
        GROUP BY c.id
        HAVING jours_retard > 0
        ORDER BY jours_retard DESC
      `);

      for (const client of clients) {
        const joursRetard = parseInt(client.jours_retard);

        if (joursRetard >= ALERT_THRESHOLDS.RETARD_CRITIQUE) {
          this.addAlert({
            type: ALERT_TYPES.CLIENT_A_RISQUE,
            severity: SEVERITY.CRITICAL,
            title: `Client à risque: ${client.company_name}`,
            message: `Retard de ${joursRetard} jours - Dette: ${this.formatMontant(client.dette)} F`,
            data: {
              customer_id: client.id,
              customer_name: client.company_name,
              dette: client.dette,
              jours_retard: joursRetard,
              nb_factures: client.nb_factures_impayees
            },
            action: 'Envisager mise en demeure ou suspension des livraisons'
          });
        } else if (joursRetard >= ALERT_THRESHOLDS.RETARD_URGENT) {
          this.addAlert({
            type: ALERT_TYPES.RETARD_PAIEMENT,
            severity: SEVERITY.DANGER,
            title: `Retard urgent: ${client.company_name}`,
            message: `Retard de ${joursRetard} jours - ${this.formatMontant(client.dette)} F impayés`,
            data: {
              customer_id: client.id,
              customer_name: client.company_name,
              dette: client.dette,
              jours_retard: joursRetard
            },
            action: 'Envoyer relance niveau 2'
          });
        } else if (joursRetard >= ALERT_THRESHOLDS.RETARD_ATTENTION) {
          this.addAlert({
            type: ALERT_TYPES.RETARD_PAIEMENT,
            severity: SEVERITY.WARNING,
            title: `Rappel paiement: ${client.company_name}`,
            message: `Échéance dépassée de ${joursRetard} jours - ${this.formatMontant(client.dette)} F`,
            data: {
              customer_id: client.id,
              customer_name: client.company_name,
              dette: client.dette,
              jours_retard: joursRetard
            },
            action: 'Envoyer rappel de paiement'
          });
        }
      }
    } catch (error) {
      console.error('Erreur checkRetardsPaiement:', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION DÉPENSES ANORMALES
  // ─────────────────────────────────────────────────────────────────────────────

  async checkDepensesAnormales() {
    try {
      // Moyenne mensuelle des dépenses sur 6 mois
      const [moyenneRows] = await db.query(`
        SELECT AVG(total_mensuel) as moyenne
        FROM (
          SELECT SUM(credit) as total_mensuel
          FROM ecritures_comptables
          WHERE compte_numero LIKE '6%'
            AND date_piece >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          GROUP BY YEAR(date_piece), MONTH(date_piece)
        ) t
      `);
      const moyenneDepenses = parseFloat(moyenneRows[0]?.moyenne) || 0;

      // Dépenses du mois en cours
      const [moisRows] = await db.query(`
        SELECT SUM(credit) as total
        FROM ecritures_comptables
        WHERE compte_numero LIKE '6%'
          AND YEAR(date_piece) = YEAR(CURDATE())
          AND MONTH(date_piece) = MONTH(CURDATE())
      `);
      const depensesMois = parseFloat(moisRows[0]?.total) || 0;

      if (moyenneDepenses > 0 && depensesMois > moyenneDepenses * ALERT_THRESHOLDS.DEPENSE_ANORMALE_RATIO) {
        this.addAlert({
          type: ALERT_TYPES.DEPENSE_ANORMALE,
          severity: SEVERITY.WARNING,
          title: 'Dépenses supérieures à la normale',
          message: `Dépenses du mois: ${this.formatMontant(depensesMois)} F (moyenne: ${this.formatMontant(moyenneDepenses)} F)`,
          data: {
            depenses_mois: depensesMois,
            moyenne: moyenneDepenses,
            ecart: ((depensesMois / moyenneDepenses) * 100 - 100).toFixed(1)
          },
          action: 'Analyser les postes de dépenses inhabituels'
        });
      }

      // Dépenses exceptionnelles individuelles
      const [grossesDepenses] = await db.query(`
        SELECT
          libelle,
          credit as montant,
          compte_libelle,
          date_piece,
          numero_piece
        FROM ecritures_comptables
        WHERE compte_numero LIKE '6%'
          AND credit >= ?
          AND date_piece >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY credit DESC
        LIMIT 5
      `, [ALERT_THRESHOLDS.DEPENSE_EXCEPTIONNELLE]);

      for (const depense of grossesDepenses) {
        this.addAlert({
          type: ALERT_TYPES.DEPENSE_ANORMALE,
          severity: SEVERITY.INFO,
          title: `Dépense importante: ${this.formatMontant(depense.montant)} F`,
          message: `${depense.libelle} - ${depense.compte_libelle}`,
          data: {
            montant: depense.montant,
            libelle: depense.libelle,
            piece: depense.numero_piece,
            date: depense.date_piece
          },
          action: 'Vérifier la justification de cette dépense'
        });
      }
    } catch (error) {
      console.error('Erreur checkDepensesAnormales:', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION STOCKS
  // ─────────────────────────────────────────────────────────────────────────────

  async checkStocks() {
    try {
      const [produits] = await db.query(`
        SELECT
          id,
          name,
          sku,
          quantity,
          min_stock,
          unit
        FROM products
        WHERE is_active = 1
          AND quantity <= COALESCE(min_stock, ?)
        ORDER BY quantity ASC
      `, [ALERT_THRESHOLDS.STOCK_ALERTE]);

      for (const produit of produits) {
        const severity = produit.quantity <= ALERT_THRESHOLDS.STOCK_MINIMUM
          ? SEVERITY.DANGER
          : SEVERITY.WARNING;

        this.addAlert({
          type: ALERT_TYPES.STOCK_BAS,
          severity,
          title: `Stock bas: ${produit.name}`,
          message: `Quantité restante: ${produit.quantity} ${produit.unit || 'unités'} (minimum: ${produit.min_stock || ALERT_THRESHOLDS.STOCK_MINIMUM})`,
          data: {
            product_id: produit.id,
            product_name: produit.name,
            sku: produit.sku,
            quantity: produit.quantity,
            min_stock: produit.min_stock
          },
          action: 'Passer commande auprès du fournisseur'
        });
      }
    } catch (error) {
      console.error('Erreur checkStocks:', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION ÉCHÉANCES
  // ─────────────────────────────────────────────────────────────────────────────

  async checkEcheances() {
    try {
      // Échéances fournisseurs
      const [echeancesFournisseurs] = await db.query(`
        SELECT
          po.id,
          s.company_name as supplier_name,
          po.total_amount,
          po.expected_date as due_date,
          DATEDIFF(po.expected_date, CURDATE()) as jours_restants
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.status IN ('pending', 'confirmed')
          AND po.expected_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
          AND po.expected_date >= CURDATE()
        ORDER BY po.expected_date
      `, [ALERT_THRESHOLDS.ECHEANCE_PROCHE]);

      for (const echeance of echeancesFournisseurs) {
        this.addAlert({
          type: ALERT_TYPES.ECHEANCE_PROCHE,
          severity: echeance.jours_restants <= 3 ? SEVERITY.DANGER : SEVERITY.WARNING,
          title: `Échéance fournisseur dans ${echeance.jours_restants}j`,
          message: `${echeance.supplier_name}: ${this.formatMontant(echeance.total_amount)} F`,
          data: {
            type: 'fournisseur',
            id: echeance.id,
            supplier: echeance.supplier_name,
            montant: echeance.total_amount,
            due_date: echeance.due_date
          },
          action: 'Préparer le règlement'
        });
      }

      // Échéances emprunts
      const [echeancesPrets] = await db.query(`
        SELECT
          bls.id,
          bl.label as loan_label,
          b.name as bank_name,
          bls.amount,
          bls.due_date,
          DATEDIFF(bls.due_date, CURDATE()) as jours_restants
        FROM bank_loan_schedules bls
        JOIN bank_loans bl ON bls.loan_id = bl.id
        JOIN banks b ON bl.bank_id = b.id
        WHERE bls.status = 'pending'
          AND bls.due_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
          AND bls.due_date >= CURDATE()
        ORDER BY bls.due_date
      `, [ALERT_THRESHOLDS.ECHEANCE_PROCHE]);

      for (const echeance of echeancesPrets) {
        this.addAlert({
          type: ALERT_TYPES.ECHEANCE_PROCHE,
          severity: echeance.jours_restants <= 3 ? SEVERITY.DANGER : SEVERITY.WARNING,
          title: `Échéance prêt dans ${echeance.jours_restants}j`,
          message: `${echeance.loan_label} (${echeance.bank_name}): ${this.formatMontant(echeance.amount)} F`,
          data: {
            type: 'pret',
            id: echeance.id,
            loan: echeance.loan_label,
            bank: echeance.bank_name,
            montant: echeance.amount,
            due_date: echeance.due_date
          },
          action: 'Préparer le règlement de l\'échéance'
        });
      }

      // Échéances dépassées
      const [echeancesDepassees] = await db.query(`
        SELECT
          bls.id,
          bl.label as loan_label,
          bls.amount,
          bls.due_date,
          DATEDIFF(CURDATE(), bls.due_date) as jours_retard
        FROM bank_loan_schedules bls
        JOIN bank_loans bl ON bls.loan_id = bl.id
        WHERE bls.status = 'pending'
          AND bls.due_date < CURDATE()
        ORDER BY bls.due_date
        LIMIT 10
      `);

      for (const echeance of echeancesDepassees) {
        this.addAlert({
          type: ALERT_TYPES.ECHEANCE_DEPASSEE,
          severity: SEVERITY.CRITICAL,
          title: `Échéance impayée: ${echeance.loan_label}`,
          message: `Retard de ${echeance.jours_retard} jours - ${this.formatMontant(echeance.amount)} F`,
          data: {
            id: echeance.id,
            loan: echeance.loan_label,
            montant: echeance.amount,
            due_date: echeance.due_date,
            jours_retard: echeance.jours_retard
          },
          action: 'Régulariser immédiatement pour éviter les pénalités'
        });
      }
    } catch (error) {
      console.error('Erreur checkEcheances:', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION LIMITES DE CRÉDIT
  // ─────────────────────────────────────────────────────────────────────────────

  async checkLimitesCredit() {
    try {
      const [clients] = await db.query(`
        SELECT
          id,
          company_name,
          current_balance as encours,
          credit_limit,
          (current_balance / credit_limit) as ratio
        FROM customers
        WHERE credit_limit > 0
          AND current_balance >= credit_limit * ?
        ORDER BY ratio DESC
      `, [ALERT_THRESHOLDS.CREDIT_LIMITE_ATTENTION]);

      for (const client of clients) {
        const ratio = parseFloat(client.ratio);

        if (ratio >= ALERT_THRESHOLDS.CREDIT_LIMITE_CRITIQUE) {
          this.addAlert({
            type: ALERT_TYPES.LIMITE_CREDIT,
            severity: SEVERITY.DANGER,
            title: `Limite de crédit atteinte: ${client.company_name}`,
            message: `Encours: ${this.formatMontant(client.encours)} F / Limite: ${this.formatMontant(client.credit_limit)} F (${(ratio * 100).toFixed(0)}%)`,
            data: {
              customer_id: client.id,
              customer_name: client.company_name,
              encours: client.encours,
              credit_limit: client.credit_limit,
              ratio: ratio
            },
            action: 'Bloquer les nouvelles commandes ou demander paiement préalable'
          });
        } else {
          this.addAlert({
            type: ALERT_TYPES.LIMITE_CREDIT,
            severity: SEVERITY.WARNING,
            title: `Limite de crédit proche: ${client.company_name}`,
            message: `Encours: ${this.formatMontant(client.encours)} F / Limite: ${this.formatMontant(client.credit_limit)} F (${(ratio * 100).toFixed(0)}%)`,
            data: {
              customer_id: client.id,
              customer_name: client.company_name,
              encours: client.encours,
              credit_limit: client.credit_limit,
              ratio: ratio
            },
            action: 'Surveiller et relancer pour paiement'
          });
        }
      }
    } catch (error) {
      console.error('Erreur checkLimitesCredit:', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION TVA
  // ─────────────────────────────────────────────────────────────────────────────

  async checkTVA() {
    try {
      const moisPrecedent = new Date();
      moisPrecedent.setMonth(moisPrecedent.getMonth() - 1);
      const periode = `${moisPrecedent.getFullYear()}-${String(moisPrecedent.getMonth() + 1).padStart(2, '0')}`;

      // Vérifier si déclaration TVA du mois précédent existe
      const [declarations] = await db.query(`
        SELECT * FROM declarations_tva
        WHERE periode = ?
      `, [periode]);

      if (declarations.length === 0) {
        // Calculer la TVA à déclarer
        const [tvaCollectee] = await db.query(`
          SELECT COALESCE(SUM(credit), 0) as total
          FROM ecritures_comptables
          WHERE compte_numero LIKE '4431%'
            AND DATE_FORMAT(date_piece, '%Y-%m') = ?
        `, [periode]);

        const [tvaDeductible] = await db.query(`
          SELECT COALESCE(SUM(debit), 0) as total
          FROM ecritures_comptables
          WHERE compte_numero LIKE '4451%'
            AND DATE_FORMAT(date_piece, '%Y-%m') = ?
        `, [periode]);

        const tvaAPayer = (parseFloat(tvaCollectee[0]?.total) || 0) - (parseFloat(tvaDeductible[0]?.total) || 0);

        if (Math.abs(tvaAPayer) > 0) {
          this.addAlert({
            type: ALERT_TYPES.TVA_A_DECLARER,
            severity: SEVERITY.WARNING,
            title: `TVA à déclarer: ${periode}`,
            message: `TVA nette: ${this.formatMontant(Math.abs(tvaAPayer))} F ${tvaAPayer >= 0 ? 'à payer' : 'crédit'}`,
            data: {
              periode,
              tva_collectee: parseFloat(tvaCollectee[0]?.total) || 0,
              tva_deductible: parseFloat(tvaDeductible[0]?.total) || 0,
              tva_nette: tvaAPayer
            },
            action: 'Générer et soumettre la déclaration TVA'
          });
        }
      }
    } catch (error) {
      console.error('Erreur checkTVA:', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION ANOMALIES
  // ─────────────────────────────────────────────────────────────────────────────

  async checkAnomalies() {
    try {
      // Vérifier les écritures non équilibrées
      const [desequilibres] = await db.query(`
        SELECT
          numero_piece,
          date_piece,
          SUM(debit) as total_debit,
          SUM(credit) as total_credit,
          ABS(SUM(debit) - SUM(credit)) as ecart
        FROM ecritures_comptables
        WHERE exercice = YEAR(CURDATE())
        GROUP BY numero_piece, date_piece
        HAVING ecart > 1
        ORDER BY date_piece DESC
        LIMIT 10
      `);

      for (const ecart of desequilibres) {
        this.addAlert({
          type: ALERT_TYPES.ANOMALIE_COMPTABLE,
          severity: SEVERITY.DANGER,
          title: `Écriture non équilibrée: ${ecart.numero_piece}`,
          message: `Écart de ${this.formatMontant(ecart.ecart)} F entre débit et crédit`,
          data: {
            numero_piece: ecart.numero_piece,
            date_piece: ecart.date_piece,
            total_debit: ecart.total_debit,
            total_credit: ecart.total_credit,
            ecart: ecart.ecart
          },
          action: 'Corriger l\'écriture comptable'
        });
      }

      // Vérifier la clôture exercice
      const mois = new Date().getMonth() + 1;
      if (mois >= 2) { // À partir de février
        const anneePrec = new Date().getFullYear() - 1;
        const [exercice] = await db.query(`
          SELECT * FROM exercices WHERE annee = ? AND statut = 'cloture'
        `, [anneePrec]);

        if (exercice.length === 0) {
          this.addAlert({
            type: ALERT_TYPES.CLOTURE_EXERCICE,
            severity: mois >= 4 ? SEVERITY.DANGER : SEVERITY.WARNING,
            title: `Clôture exercice ${anneePrec} en attente`,
            message: `L'exercice ${anneePrec} n'est pas encore clôturé`,
            data: { annee: anneePrec },
            action: 'Procéder à la clôture de l\'exercice'
          });
        }
      }
    } catch (error) {
      console.error('Erreur checkAnomalies:', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Ajoute une alerte à la liste
   */
  addAlert(alert) {
    this.alerts.push({
      id: `${alert.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      ...alert
    });
  }

  /**
   * Formate un montant en FCFA
   */
  formatMontant(montant) {
    return Math.round(montant).toLocaleString('fr-FR');
  }

  /**
   * Récupère un résumé des alertes par sévérité
   */
  getSummary() {
    return {
      total: this.alerts.length,
      critical: this.alerts.filter(a => a.severity === SEVERITY.CRITICAL).length,
      danger: this.alerts.filter(a => a.severity === SEVERITY.DANGER).length,
      warning: this.alerts.filter(a => a.severity === SEVERITY.WARNING).length,
      info: this.alerts.filter(a => a.severity === SEVERITY.INFO).length,
      lastCheck: this.lastCheck
    };
  }

  /**
   * Récupère les alertes filtrées
   */
  getFilteredAlerts(filters = {}) {
    let result = [...this.alerts];

    if (filters.severity) {
      result = result.filter(a => a.severity === filters.severity);
    }

    if (filters.type) {
      result = result.filter(a => a.type === filters.type);
    }

    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  }
}

// Export singleton
module.exports = new AlertService();
module.exports.AlertService = AlertService;
module.exports.ALERT_TYPES = ALERT_TYPES;
module.exports.SEVERITY = SEVERITY;
module.exports.ALERT_THRESHOLDS = ALERT_THRESHOLDS;
