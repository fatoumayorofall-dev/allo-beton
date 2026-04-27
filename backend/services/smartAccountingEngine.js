/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SMART ACCOUNTING ENGINE - Comptabilité Invisible SYSCOHADA
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module de comptabilisation automatique pour Allo Béton
 * L'utilisateur ne saisit JAMAIS débit/crédit - tout est automatisé
 *
 * Conforme au Plan Comptable OHADA révisé 2017
 * Adapté au contexte africain (Mobile Money, Cash, PME)
 *
 * @author Claude AI - Architecte SaaS Expert SYSCOHADA
 * @version 2.0.0
 */

const db = require('../db');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION DES COMPTES SYSCOHADA
// ═══════════════════════════════════════════════════════════════════════════════

const COMPTES_OHADA = {
  // CLASSE 1 - CAPITAUX
  CAPITAL: '101000',
  RESERVES: '111000',
  REPORT_NOUVEAU: '121000',
  RESULTAT_EXERCICE: '131000',
  EMPRUNTS: '162000',

  // CLASSE 2 - IMMOBILISATIONS
  TERRAINS: '221000',
  BATIMENTS: '231000',
  MATERIEL_TRANSPORT: '244000',
  MATERIEL_BTP: '241000',
  AMORT_MATERIEL: '284000',

  // CLASSE 3 - STOCKS
  STOCK_BETON: '311000',
  STOCK_CIMENT: '312000',
  STOCK_GRAVIER: '313000',
  STOCK_SABLE: '314000',
  STOCK_FER: '315000',
  STOCK_AUTRES: '319000',

  // CLASSE 4 - TIERS
  FOURNISSEURS: '401000',
  FOURNISSEURS_EFFETS: '402000',
  CLIENTS: '411000',
  CLIENTS_EFFETS: '412000',
  CLIENTS_DOUTEUX: '416000',
  PERSONNEL_REMUN: '421000',
  PERSONNEL_AVANCES: '425000',
  ORGANISMES_SOCIAUX: '431000',
  ETAT_TVA_COLLECTEE: '443100',
  ETAT_TVA_DEDUCTIBLE: '445100',
  ETAT_TVA_A_PAYER: '443900',
  ETAT_IMPOTS: '447000',
  AVANCES_CLIENTS: '419000',
  DEBITEURS_DIVERS: '471000',
  CREDITEURS_DIVERS: '472000',

  // CLASSE 5 - TRESORERIE
  BANQUE_PRINCIPALE: '521000',
  BANQUE_SECONDAIRE: '522000',
  CAISSE_PRINCIPALE: '571000',
  CAISSE_SECONDAIRE: '572000',
  MOBILE_MONEY_WAVE: '585100',
  MOBILE_MONEY_ORANGE: '585200',
  MOBILE_MONEY_FREE: '585300',
  VIREMENTS_INTERNES: '588000',

  // CLASSE 6 - CHARGES
  ACHATS_BETON: '601100',
  ACHATS_CIMENT: '601200',
  ACHATS_GRAVIER: '601300',
  ACHATS_SABLE: '601400',
  ACHATS_FER: '601500',
  ACHATS_AUTRES: '601900',
  ACHATS_CARBURANT: '605000',
  TRANSPORTS_ACHATS: '611000',
  TRANSPORTS_VENTES: '612000',
  LOYERS: '622000',
  ENTRETIEN_REPARATIONS: '624000',
  ASSURANCES: '625000',
  TELECOMMUNICATIONS: '626000',
  SERVICES_BANCAIRES: '627000',
  FRAIS_DIVERS: '628000',
  IMPOTS_TAXES: '641000',
  PATENTES: '642000',
  SALAIRES_BRUTS: '661000',
  CHARGES_SOCIALES: '664000',
  DOTATION_AMORTISSEMENTS: '681000',
  DOTATION_PROVISIONS: '691000',
  CHARGES_FINANCIERES: '671000',
  PERTES_CHANGE: '676000',
  CHARGES_EXCEPTIONNELLES: '831000',

  // CLASSE 7 - PRODUITS
  VENTES_BETON: '701100',
  VENTES_CIMENT: '701200',
  VENTES_GRAVIER: '701300',
  VENTES_SABLE: '701400',
  VENTES_FER: '701500',
  VENTES_AUTRES: '701900',
  VENTES_SERVICES_LIVRAISON: '706000',
  VENTES_SERVICES_POMPAGE: '706100',
  PRESTATIONS_SERVICES: '707000',
  RABAIS_ACCORDES: '709000',
  PRODUITS_FINANCIERS: '771000',
  GAINS_CHANGE: '776000',
  PRODUITS_EXCEPTIONNELS: '841000',
};

// Mapping des produits vers les comptes de vente
const MAPPING_PRODUITS = {
  'beton': { vente: '701100', achat: '601100', stock: '311000' },
  'ciment': { vente: '701200', achat: '601200', stock: '312000' },
  'gravier': { vente: '701300', achat: '601300', stock: '313000' },
  'sable': { vente: '701400', achat: '601400', stock: '314000' },
  'fer': { vente: '701500', achat: '601500', stock: '315000' },
  'acier': { vente: '701500', achat: '601500', stock: '315000' },
  'service': { vente: '707000', achat: null, stock: null },
  'livraison': { vente: '706000', achat: null, stock: null },
  'pompage': { vente: '706100', achat: null, stock: null },
  'default': { vente: '701900', achat: '601900', stock: '319000' },
};

// Mapping des moyens de paiement vers les comptes de trésorerie
const MAPPING_PAIEMENTS = {
  'cash': { compte: '571000', journal: 'CA', libelle: 'Caisse' },
  'especes': { compte: '571000', journal: 'CA', libelle: 'Caisse' },
  'cheque': { compte: '521000', journal: 'BQ', libelle: 'Banque - Chèque' },
  'virement': { compte: '521000', journal: 'BQ', libelle: 'Banque - Virement' },
  'carte': { compte: '521000', journal: 'BQ', libelle: 'Banque - Carte' },
  'wave': { compte: '585100', journal: 'BQ', libelle: 'Mobile Money - Wave' },
  'orange_money': { compte: '585200', journal: 'BQ', libelle: 'Mobile Money - Orange' },
  'free_money': { compte: '585300', journal: 'BQ', libelle: 'Mobile Money - Free' },
  'mobile_money': { compte: '585100', journal: 'BQ', libelle: 'Mobile Money' },
  'credit': { compte: '411000', journal: 'OD', libelle: 'Crédit client' },
  'avoir': { compte: '419000', journal: 'OD', libelle: 'Avoir client' },
  'default': { compte: '521000', journal: 'BQ', libelle: 'Banque' },
};

// Taux TVA par défaut (UEMOA)
const TVA_TAUX = 0.18;

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSE PRINCIPALE - SMART ACCOUNTING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class SmartAccountingEngine {

  constructor() {
    this.exercice = new Date().getFullYear();
    this.pieceCounter = {};
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS - Fonctions utilitaires
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Génère un numéro de pièce unique
   */
  async generateNumeroPiece(journal) {
    const prefix = journal.toUpperCase();
    const year = this.exercice.toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    // Récupérer le dernier numéro utilisé
    const [rows] = await db.query(
      `SELECT MAX(CAST(SUBSTRING(numero_piece, -5) AS UNSIGNED)) as last_num
       FROM ecritures_comptables
       WHERE journal_code = ? AND YEAR(date_piece) = ?`,
      [journal, this.exercice]
    );

    const lastNum = rows[0]?.last_num || 0;
    const newNum = (lastNum + 1).toString().padStart(5, '0');

    return `${prefix}${year}${month}-${newNum}`;
  }

  /**
   * Détermine le compte de vente selon le type de produit
   */
  getCompteVente(productType) {
    const type = (productType || 'default').toLowerCase();
    return MAPPING_PRODUITS[type]?.vente || MAPPING_PRODUITS.default.vente;
  }

  /**
   * Détermine le compte de trésorerie selon le mode de paiement
   */
  getCompteTresorerie(paymentMethod) {
    const method = (paymentMethod || 'default').toLowerCase().replace(/[\s-]/g, '_');
    return MAPPING_PAIEMENTS[method] || MAPPING_PAIEMENTS.default;
  }

  /**
   * Formate un montant en FCFA (arrondi à l'entier)
   */
  formatMontant(montant) {
    return Math.round(parseFloat(montant) || 0);
  }

  /**
   * Calcule les montants HT, TVA, TTC
   */
  calculerMontants(montantTTC, tauxTVA = TVA_TAUX, estExonere = false) {
    const ttc = this.formatMontant(montantTTC);
    if (estExonere || tauxTVA === 0) {
      return { ht: ttc, tva: 0, ttc };
    }
    const ht = Math.round(ttc / (1 + tauxTVA));
    const tva = ttc - ht;
    return { ht, tva, ttc };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIONS MÉTIER - Comptabilité invisible
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ENREGISTRER UNE VENTE
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Action: Vente de marchandises ou services
   *
   * Écritures générées (Journal VT):
   *   DÉBIT  411xxx  Client              TTC
   *   CRÉDIT 701xxx  Ventes              HT
   *   CRÉDIT 443100  TVA Collectée       TVA
   *
   * @param {Object} vente - Données de la vente
   * @returns {Object} - Résultat avec numéro pièce et écritures
   */
  async enregistrerVente(vente) {
    const {
      sale_id,
      customer_id,
      customer_name,
      items = [],
      total_amount,
      tax_amount = 0,
      tax_exempt = false,
      sale_number,
      sale_date,
      created_by
    } = vente;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const dateEcriture = sale_date || new Date().toISOString().split('T')[0];
      const numeroPiece = await this.generateNumeroPiece('VT');
      const montants = this.calculerMontants(total_amount, TVA_TAUX, tax_exempt);

      const lignes = [];

      // DÉBIT - Client (TTC)
      lignes.push({
        compte_numero: COMPTES_OHADA.CLIENTS,
        compte_libelle: 'Clients',
        libelle: `Vente ${sale_number} - ${customer_name || 'Client comptoir'}`,
        debit: montants.ttc,
        credit: 0,
        tiers_id: customer_id
      });

      // Grouper les ventes par type de produit
      const ventesParType = {};
      for (const item of items) {
        const type = this.detectProductType(item.product_name || item.description);
        if (!ventesParType[type]) {
          ventesParType[type] = 0;
        }
        ventesParType[type] += this.formatMontant(item.line_total || item.quantity * item.unit_price);
      }

      // Si pas d'items, utiliser le montant total
      if (Object.keys(ventesParType).length === 0) {
        ventesParType['default'] = montants.ht;
      } else {
        // Recalculer les montants HT par type
        const totalItems = Object.values(ventesParType).reduce((a, b) => a + b, 0);
        for (const type in ventesParType) {
          const ratio = ventesParType[type] / totalItems;
          ventesParType[type] = Math.round(montants.ht * ratio);
        }
      }

      // CRÉDIT - Ventes par type (HT)
      for (const [type, montantHT] of Object.entries(ventesParType)) {
        const compteVente = this.getCompteVente(type);
        lignes.push({
          compte_numero: compteVente,
          compte_libelle: `Ventes ${type}`,
          libelle: `Vente ${sale_number}`,
          debit: 0,
          credit: montantHT,
          tiers_id: null
        });
      }

      // CRÉDIT - TVA Collectée (si applicable)
      if (montants.tva > 0) {
        lignes.push({
          compte_numero: COMPTES_OHADA.ETAT_TVA_COLLECTEE,
          compte_libelle: 'TVA Collectée',
          libelle: `TVA Vente ${sale_number}`,
          debit: 0,
          credit: montants.tva,
          tiers_id: null
        });
      }

      // Créer les écritures
      const ecritureId = await this.creerEcritures(connection, {
        journal_code: 'VT',
        date_piece: dateEcriture,
        numero_piece: numeroPiece,
        lignes,
        reference_type: 'sale',
        reference_id: sale_id,
        created_by
      });

      await connection.commit();

      return {
        success: true,
        ecriture_id: ecritureId,
        numero_piece: numeroPiece,
        journal: 'VT',
        montants,
        lignes: lignes.length,
        message: `Vente ${sale_number} comptabilisée avec succès`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erreur enregistrerVente:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ENREGISTRER UN PAIEMENT CLIENT
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Action: Encaissement d'un règlement client
   *
   * Écritures générées (Journal CA ou BQ):
   *   DÉBIT  5xxxxx  Trésorerie (Caisse/Banque/Mobile Money)  Montant
   *   CRÉDIT 411xxx  Client                                    Montant
   *
   * @param {Object} paiement - Données du paiement
   * @returns {Object} - Résultat
   */
  async enregistrerPaiementClient(paiement) {
    const {
      payment_id,
      sale_id,
      customer_id,
      customer_name,
      amount,
      payment_method,
      reference_number,
      payment_date,
      notes,
      created_by
    } = paiement;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const compteTreso = this.getCompteTresorerie(payment_method);
      const dateEcriture = payment_date || new Date().toISOString().split('T')[0];
      const numeroPiece = await this.generateNumeroPiece(compteTreso.journal);
      const montant = this.formatMontant(amount);

      const lignes = [
        // DÉBIT - Trésorerie
        {
          compte_numero: compteTreso.compte,
          compte_libelle: compteTreso.libelle,
          libelle: `Règlement ${customer_name || 'client'} ${reference_number || ''}`.trim(),
          debit: montant,
          credit: 0,
          tiers_id: null
        },
        // CRÉDIT - Client
        {
          compte_numero: COMPTES_OHADA.CLIENTS,
          compte_libelle: 'Clients',
          libelle: `Règlement reçu ${reference_number || ''}`.trim(),
          debit: 0,
          credit: montant,
          tiers_id: customer_id
        }
      ];

      const ecritureId = await this.creerEcritures(connection, {
        journal_code: compteTreso.journal,
        date_piece: dateEcriture,
        numero_piece: numeroPiece,
        lignes,
        reference_type: 'payment',
        reference_id: payment_id,
        created_by
      });

      await connection.commit();

      return {
        success: true,
        ecriture_id: ecritureId,
        numero_piece: numeroPiece,
        journal: compteTreso.journal,
        montant,
        message: `Paiement de ${montant.toLocaleString()} F comptabilisé`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erreur enregistrerPaiementClient:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PAYER UN FOURNISSEUR
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Action: Règlement d'une facture fournisseur
   *
   * Écritures générées (Journal CA ou BQ):
   *   DÉBIT  401xxx  Fournisseur                              Montant
   *   CRÉDIT 5xxxxx  Trésorerie (Caisse/Banque/Mobile Money)  Montant
   *
   * @param {Object} paiement - Données du paiement fournisseur
   * @returns {Object} - Résultat
   */
  async payerFournisseur(paiement) {
    const {
      payment_id,
      supplier_id,
      supplier_name,
      purchase_order_id,
      amount,
      payment_method,
      reference_number,
      payment_date,
      created_by
    } = paiement;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const compteTreso = this.getCompteTresorerie(payment_method);
      const dateEcriture = payment_date || new Date().toISOString().split('T')[0];
      const numeroPiece = await this.generateNumeroPiece(compteTreso.journal);
      const montant = this.formatMontant(amount);

      const lignes = [
        // DÉBIT - Fournisseur
        {
          compte_numero: COMPTES_OHADA.FOURNISSEURS,
          compte_libelle: 'Fournisseurs',
          libelle: `Règlement ${supplier_name || 'fournisseur'} ${reference_number || ''}`.trim(),
          debit: montant,
          credit: 0,
          tiers_id: supplier_id
        },
        // CRÉDIT - Trésorerie
        {
          compte_numero: compteTreso.compte,
          compte_libelle: compteTreso.libelle,
          libelle: `Paiement fournisseur ${reference_number || ''}`.trim(),
          debit: 0,
          credit: montant,
          tiers_id: null
        }
      ];

      const ecritureId = await this.creerEcritures(connection, {
        journal_code: compteTreso.journal,
        date_piece: dateEcriture,
        numero_piece: numeroPiece,
        lignes,
        reference_type: 'supplier_payment',
        reference_id: payment_id || purchase_order_id,
        created_by
      });

      await connection.commit();

      return {
        success: true,
        ecriture_id: ecritureId,
        numero_piece: numeroPiece,
        journal: compteTreso.journal,
        montant,
        message: `Paiement fournisseur de ${montant.toLocaleString()} F comptabilisé`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erreur payerFournisseur:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ENREGISTRER UN ACHAT / DÉPENSE
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Action: Facture fournisseur ou dépense
   *
   * Écritures générées (Journal AC):
   *   DÉBIT  6xxxxx  Charges (selon type)       HT
   *   DÉBIT  445100  TVA Déductible             TVA
   *   CRÉDIT 401xxx  Fournisseur                TTC
   *
   * Si paiement immédiat:
   *   DÉBIT  401xxx  Fournisseur                TTC
   *   CRÉDIT 5xxxxx  Trésorerie                 TTC
   *
   * @param {Object} achat - Données de l'achat
   * @returns {Object} - Résultat
   */
  async enregistrerAchat(achat) {
    const {
      purchase_id,
      supplier_id,
      supplier_name,
      items = [],
      total_amount,
      tax_amount = 0,
      tax_exempt = false,
      purchase_number,
      purchase_date,
      payment_method, // Si défini, paiement immédiat
      expense_type = 'achat', // achat, carburant, loyer, entretien, etc.
      created_by
    } = achat;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const dateEcriture = purchase_date || new Date().toISOString().split('T')[0];
      const numeroPiece = await this.generateNumeroPiece('AC');
      const montants = this.calculerMontants(total_amount, TVA_TAUX, tax_exempt);

      const lignes = [];

      // DÉBIT - Charges selon le type
      const compteCharge = this.getCompteCharge(expense_type, items);
      lignes.push({
        compte_numero: compteCharge.compte,
        compte_libelle: compteCharge.libelle,
        libelle: `Achat ${supplier_name || 'fournisseur'} - ${purchase_number || ''}`.trim(),
        debit: montants.ht,
        credit: 0,
        tiers_id: null
      });

      // DÉBIT - TVA Déductible (si applicable)
      if (montants.tva > 0) {
        lignes.push({
          compte_numero: COMPTES_OHADA.ETAT_TVA_DEDUCTIBLE,
          compte_libelle: 'TVA Déductible',
          libelle: `TVA Achat ${purchase_number || ''}`.trim(),
          debit: montants.tva,
          credit: 0,
          tiers_id: null
        });
      }

      // CRÉDIT - Fournisseur (TTC)
      lignes.push({
        compte_numero: COMPTES_OHADA.FOURNISSEURS,
        compte_libelle: 'Fournisseurs',
        libelle: `Facture ${supplier_name || 'fournisseur'}`,
        debit: 0,
        credit: montants.ttc,
        tiers_id: supplier_id
      });

      const ecritureId = await this.creerEcritures(connection, {
        journal_code: 'AC',
        date_piece: dateEcriture,
        numero_piece: numeroPiece,
        lignes,
        reference_type: 'purchase',
        reference_id: purchase_id,
        created_by
      });

      // Si paiement immédiat, créer l'écriture de règlement
      let paiementResult = null;
      if (payment_method) {
        paiementResult = await this.payerFournisseur({
          supplier_id,
          supplier_name,
          purchase_order_id: purchase_id,
          amount: montants.ttc,
          payment_method,
          payment_date: dateEcriture,
          created_by
        });
      }

      await connection.commit();

      return {
        success: true,
        ecriture_id: ecritureId,
        numero_piece: numeroPiece,
        journal: 'AC',
        montants,
        paiement: paiementResult,
        message: `Achat de ${montants.ttc.toLocaleString()} F comptabilisé`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erreur enregistrerAchat:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ENREGISTRER UN SALAIRE
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Action: Comptabilisation d'un bulletin de paie
   *
   * Écritures générées (Journal SL):
   *   DÉBIT  661000  Salaires bruts             Brut
   *   DÉBIT  664000  Charges sociales patronales Charges
   *   CRÉDIT 421000  Personnel - Rémunérations  Net
   *   CRÉDIT 431000  Organismes sociaux         Cotisations
   *   CRÉDIT 447000  État - Impôts              IRPP
   *
   * @param {Object} salaire - Données du salaire
   * @returns {Object} - Résultat
   */
  async enregistrerSalaire(salaire) {
    const {
      salary_id,
      employee_id,
      employee_name,
      gross_salary,
      net_salary,
      employer_charges = 0,
      employee_deductions = 0,
      irpp = 0,
      social_contributions = 0,
      salary_date,
      period,
      created_by
    } = salaire;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const dateEcriture = salary_date || new Date().toISOString().split('T')[0];
      const numeroPiece = await this.generateNumeroPiece('SL');

      const brut = this.formatMontant(gross_salary);
      const net = this.formatMontant(net_salary);
      const chargesPatronales = this.formatMontant(employer_charges);
      const cotisations = this.formatMontant(social_contributions || employee_deductions);
      const impot = this.formatMontant(irpp);

      const lignes = [];

      // DÉBIT - Salaires bruts
      lignes.push({
        compte_numero: COMPTES_OHADA.SALAIRES_BRUTS,
        compte_libelle: 'Salaires bruts',
        libelle: `Salaire ${period || ''} - ${employee_name}`.trim(),
        debit: brut,
        credit: 0,
        tiers_id: employee_id
      });

      // DÉBIT - Charges sociales patronales (si applicable)
      if (chargesPatronales > 0) {
        lignes.push({
          compte_numero: COMPTES_OHADA.CHARGES_SOCIALES,
          compte_libelle: 'Charges sociales',
          libelle: `Charges patronales ${period || ''} - ${employee_name}`.trim(),
          debit: chargesPatronales,
          credit: 0,
          tiers_id: null
        });
      }

      // CRÉDIT - Personnel (Net à payer)
      lignes.push({
        compte_numero: COMPTES_OHADA.PERSONNEL_REMUN,
        compte_libelle: 'Personnel - Rémunérations',
        libelle: `Net à payer ${employee_name}`,
        debit: 0,
        credit: net,
        tiers_id: employee_id
      });

      // CRÉDIT - Organismes sociaux (cotisations)
      if (cotisations > 0) {
        lignes.push({
          compte_numero: COMPTES_OHADA.ORGANISMES_SOCIAUX,
          compte_libelle: 'Organismes sociaux',
          libelle: `Cotisations ${period || ''}`,
          debit: 0,
          credit: cotisations + chargesPatronales,
          tiers_id: null
        });
      }

      // CRÉDIT - État (IRPP)
      if (impot > 0) {
        lignes.push({
          compte_numero: COMPTES_OHADA.ETAT_IMPOTS,
          compte_libelle: 'État - Impôts',
          libelle: `IRPP ${period || ''} - ${employee_name}`,
          debit: 0,
          credit: impot,
          tiers_id: null
        });
      }

      const ecritureId = await this.creerEcritures(connection, {
        journal_code: 'SL',
        date_piece: dateEcriture,
        numero_piece: numeroPiece,
        lignes,
        reference_type: 'salary',
        reference_id: salary_id,
        created_by
      });

      await connection.commit();

      return {
        success: true,
        ecriture_id: ecritureId,
        numero_piece: numeroPiece,
        journal: 'SL',
        montants: { brut, net, charges: chargesPatronales, cotisations, impot },
        message: `Salaire de ${employee_name} comptabilisé`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erreur enregistrerSalaire:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ENREGISTRER UN MOUVEMENT DE CAISSE
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Action: Entrée ou sortie de caisse
   *
   * Écritures générées (Journal CA):
   *   Si recette:
   *     DÉBIT  571000  Caisse                   Montant
   *     CRÉDIT xxxxxx  Compte contrepartie      Montant
   *
   *   Si dépense:
   *     DÉBIT  xxxxxx  Compte contrepartie      Montant
   *     CRÉDIT 571000  Caisse                   Montant
   *
   * @param {Object} mouvement - Données du mouvement
   * @returns {Object} - Résultat
   */
  async enregistrerMouvementCaisse(mouvement) {
    const {
      movement_id,
      type, // 'recette' ou 'depense'
      amount,
      category,
      description,
      movement_date,
      created_by
    } = mouvement;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const dateEcriture = movement_date || new Date().toISOString().split('T')[0];
      const numeroPiece = await this.generateNumeroPiece('CA');
      const montant = this.formatMontant(amount);

      // Déterminer le compte de contrepartie
      const compteContrepartie = this.getCompteContrepartie(type, category);

      const lignes = [];

      if (type === 'recette') {
        // Recette: DÉBIT Caisse, CRÉDIT Contrepartie
        lignes.push({
          compte_numero: COMPTES_OHADA.CAISSE_PRINCIPALE,
          compte_libelle: 'Caisse',
          libelle: description || 'Recette diverse',
          debit: montant,
          credit: 0,
          tiers_id: null
        });
        lignes.push({
          compte_numero: compteContrepartie.compte,
          compte_libelle: compteContrepartie.libelle,
          libelle: description || 'Recette diverse',
          debit: 0,
          credit: montant,
          tiers_id: null
        });
      } else {
        // Dépense: DÉBIT Contrepartie, CRÉDIT Caisse
        lignes.push({
          compte_numero: compteContrepartie.compte,
          compte_libelle: compteContrepartie.libelle,
          libelle: description || 'Dépense diverse',
          debit: montant,
          credit: 0,
          tiers_id: null
        });
        lignes.push({
          compte_numero: COMPTES_OHADA.CAISSE_PRINCIPALE,
          compte_libelle: 'Caisse',
          libelle: description || 'Dépense diverse',
          debit: 0,
          credit: montant,
          tiers_id: null
        });
      }

      const ecritureId = await this.creerEcritures(connection, {
        journal_code: 'CA',
        date_piece: dateEcriture,
        numero_piece: numeroPiece,
        lignes,
        reference_type: 'cash_movement',
        reference_id: movement_id,
        created_by
      });

      await connection.commit();

      return {
        success: true,
        ecriture_id: ecritureId,
        numero_piece: numeroPiece,
        journal: 'CA',
        type,
        montant,
        message: `${type === 'recette' ? 'Recette' : 'Dépense'} de ${montant.toLocaleString()} F comptabilisée`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erreur enregistrerMouvementCaisse:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ENREGISTRER UN AVOIR CLIENT
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Action: Avoir (annulation partielle ou totale de vente)
   *
   * Écritures générées (Journal VT):
   *   DÉBIT  701xxx  Ventes                    HT
   *   DÉBIT  443100  TVA Collectée             TVA
   *   CRÉDIT 411xxx  Client                    TTC
   *
   * @param {Object} avoir - Données de l'avoir
   * @returns {Object} - Résultat
   */
  async enregistrerAvoir(avoir) {
    const {
      credit_note_id,
      sale_id,
      customer_id,
      customer_name,
      amount,
      tax_amount = 0,
      reason,
      credit_note_date,
      created_by
    } = avoir;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const dateEcriture = credit_note_date || new Date().toISOString().split('T')[0];
      const numeroPiece = await this.generateNumeroPiece('VT');
      const montants = this.calculerMontants(amount, TVA_TAUX, tax_amount === 0);

      const lignes = [
        // DÉBIT - Ventes (HT) - annulation
        {
          compte_numero: COMPTES_OHADA.VENTES_BETON, // ou selon le type
          compte_libelle: 'Ventes',
          libelle: `Avoir ${customer_name || 'client'} - ${reason || ''}`.trim(),
          debit: montants.ht,
          credit: 0,
          tiers_id: null
        },
        // CRÉDIT - Client (TTC)
        {
          compte_numero: COMPTES_OHADA.CLIENTS,
          compte_libelle: 'Clients',
          libelle: `Avoir client ${customer_name || ''}`,
          debit: 0,
          credit: montants.ttc,
          tiers_id: customer_id
        }
      ];

      // DÉBIT - TVA Collectée (si applicable)
      if (montants.tva > 0) {
        lignes.splice(1, 0, {
          compte_numero: COMPTES_OHADA.ETAT_TVA_COLLECTEE,
          compte_libelle: 'TVA Collectée',
          libelle: `Avoir TVA`,
          debit: montants.tva,
          credit: 0,
          tiers_id: null
        });
      }

      const ecritureId = await this.creerEcritures(connection, {
        journal_code: 'VT',
        date_piece: dateEcriture,
        numero_piece: numeroPiece,
        lignes,
        reference_type: 'credit_note',
        reference_id: credit_note_id || sale_id,
        created_by
      });

      await connection.commit();

      return {
        success: true,
        ecriture_id: ecritureId,
        numero_piece: numeroPiece,
        journal: 'VT',
        montants,
        message: `Avoir de ${montants.ttc.toLocaleString()} F comptabilisé`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erreur enregistrerAvoir:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTIONS INTERNES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Crée les écritures comptables dans la base
   */
  async creerEcritures(connection, params) {
    const {
      journal_code,
      date_piece,
      numero_piece,
      lignes,
      reference_type,
      reference_id,
      created_by
    } = params;

    // Vérifier l'équilibre débit = crédit
    const totalDebit = lignes.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lignes.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Écriture non équilibrée: Débit=${totalDebit}, Crédit=${totalCredit}`);
    }

    // Insérer chaque ligne
    const insertQuery = `
      INSERT INTO ecritures_comptables
      (journal_code, date_piece, numero_piece, compte_numero, compte_libelle,
       libelle, debit, credit, tiers_id, reference_type, reference_id,
       exercice, statut, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valide', NOW(), ?)
    `;

    let firstId = null;
    for (const ligne of lignes) {
      const [result] = await connection.query(insertQuery, [
        journal_code,
        date_piece,
        numero_piece,
        ligne.compte_numero,
        ligne.compte_libelle,
        ligne.libelle,
        ligne.debit || 0,
        ligne.credit || 0,
        ligne.tiers_id || null,
        reference_type,
        reference_id,
        this.exercice,
        created_by
      ]);

      if (!firstId) firstId = result.insertId;
    }

    // Log pour audit
    console.log(`[SmartAccounting] Écritures créées: ${numero_piece} - ${lignes.length} lignes - Total: ${totalDebit} F`);

    return firstId;
  }

  /**
   * Détecte le type de produit à partir du nom
   */
  detectProductType(productName) {
    if (!productName) return 'default';
    const name = productName.toLowerCase();

    if (name.includes('béton') || name.includes('beton')) return 'beton';
    if (name.includes('ciment')) return 'ciment';
    if (name.includes('gravier') || name.includes('gravillon')) return 'gravier';
    if (name.includes('sable')) return 'sable';
    if (name.includes('fer') || name.includes('acier') || name.includes('armature')) return 'fer';
    if (name.includes('livraison') || name.includes('transport')) return 'livraison';
    if (name.includes('pompage') || name.includes('pompe')) return 'pompage';
    if (name.includes('service')) return 'service';

    return 'default';
  }

  /**
   * Détermine le compte de charge selon le type de dépense
   */
  getCompteCharge(expenseType, items = []) {
    const type = (expenseType || '').toLowerCase();

    const mapping = {
      'achat': { compte: '601900', libelle: 'Achats' },
      'achat_beton': { compte: '601100', libelle: 'Achats béton' },
      'achat_ciment': { compte: '601200', libelle: 'Achats ciment' },
      'achat_gravier': { compte: '601300', libelle: 'Achats gravier' },
      'achat_sable': { compte: '601400', libelle: 'Achats sable' },
      'achat_fer': { compte: '601500', libelle: 'Achats fer/acier' },
      'carburant': { compte: '605000', libelle: 'Carburant' },
      'transport': { compte: '611000', libelle: 'Transports' },
      'loyer': { compte: '622000', libelle: 'Loyers' },
      'entretien': { compte: '624000', libelle: 'Entretien et réparations' },
      'assurance': { compte: '625000', libelle: 'Assurances' },
      'telephone': { compte: '626000', libelle: 'Télécommunications' },
      'banque': { compte: '627000', libelle: 'Services bancaires' },
      'frais_divers': { compte: '628000', libelle: 'Frais divers' },
      'impots': { compte: '641000', libelle: 'Impôts et taxes' },
      'default': { compte: '628000', libelle: 'Charges diverses' }
    };

    // Si items présents, détecter le type d'achat
    if (items.length > 0 && type === 'achat') {
      const firstItemType = this.detectProductType(items[0].product_name || items[0].description);
      if (MAPPING_PRODUITS[firstItemType]?.achat) {
        return {
          compte: MAPPING_PRODUITS[firstItemType].achat,
          libelle: `Achats ${firstItemType}`
        };
      }
    }

    return mapping[type] || mapping.default;
  }

  /**
   * Détermine le compte de contrepartie pour les mouvements de caisse
   */
  getCompteContrepartie(type, category) {
    const cat = (category || '').toLowerCase();

    if (type === 'recette') {
      const mapping = {
        'vente': { compte: '701900', libelle: 'Ventes diverses' },
        'remboursement': { compte: '471000', libelle: 'Débiteurs divers' },
        'apport': { compte: '455000', libelle: 'Apports associés' },
        'default': { compte: '758000', libelle: 'Produits divers' }
      };
      return mapping[cat] || mapping.default;
    } else {
      const mapping = {
        'achat': { compte: '601900', libelle: 'Achats' },
        'carburant': { compte: '605000', libelle: 'Carburant' },
        'transport': { compte: '611000', libelle: 'Transport' },
        'entretien': { compte: '624000', libelle: 'Entretien' },
        'telephone': { compte: '626000', libelle: 'Téléphone' },
        'frais': { compte: '628000', libelle: 'Frais divers' },
        'retrait': { compte: '455000', libelle: 'Retrait associé' },
        'default': { compte: '658000', libelle: 'Charges diverses' }
      };
      return mapping[cat] || mapping.default;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SYNCHRONISATION AUTOMATIQUE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Synchronise toutes les ventes non comptabilisées
   */
  async syncVentes() {
    const [ventes] = await db.query(`
      SELECT s.*, c.company_name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id NOT IN (
        SELECT DISTINCT reference_id FROM ecritures_comptables
        WHERE reference_type = 'sale' AND reference_id IS NOT NULL
      )
      AND s.status != 'cancelled'
      ORDER BY s.sale_date
    `);

    const results = [];
    for (const vente of ventes) {
      try {
        // Récupérer les items
        const [items] = await db.query(
          `SELECT si.*, p.name as product_name
           FROM sale_items si
           LEFT JOIN products p ON si.product_id = p.id
           WHERE si.sale_id = ?`,
          [vente.id]
        );

        const result = await this.enregistrerVente({
          sale_id: vente.id,
          customer_id: vente.customer_id,
          customer_name: vente.customer_name || vente.client_name,
          items,
          total_amount: vente.total_amount,
          tax_amount: vente.tax_amount,
          tax_exempt: vente.tva_exempt,
          sale_number: vente.sale_number,
          sale_date: vente.sale_date,
          created_by: 'sync_auto'
        });
        results.push(result);
      } catch (error) {
        console.error(`Erreur sync vente ${vente.id}:`, error.message);
        results.push({ success: false, sale_id: vente.id, error: error.message });
      }
    }

    return { synced: results.filter(r => r.success).length, total: ventes.length, results };
  }

  /**
   * Synchronise tous les paiements non comptabilisés
   */
  async syncPaiements() {
    const [paiements] = await db.query(`
      SELECT p.*, c.company_name as customer_name, s.sale_number
      FROM payments p
      LEFT JOIN sales s ON p.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE p.id NOT IN (
        SELECT DISTINCT reference_id FROM ecritures_comptables
        WHERE reference_type = 'payment' AND reference_id IS NOT NULL
      )
      AND p.status = 'completed'
      ORDER BY p.created_at
    `);

    const results = [];
    for (const paiement of paiements) {
      try {
        const result = await this.enregistrerPaiementClient({
          payment_id: paiement.id,
          sale_id: paiement.sale_id,
          customer_id: paiement.customer_id,
          customer_name: paiement.customer_name,
          amount: paiement.amount,
          payment_method: paiement.payment_method,
          reference_number: paiement.reference_number || paiement.payment_number,
          payment_date: paiement.created_at,
          created_by: 'sync_auto'
        });
        results.push(result);
      } catch (error) {
        console.error(`Erreur sync paiement ${paiement.id}:`, error.message);
        results.push({ success: false, payment_id: paiement.id, error: error.message });
      }
    }

    return { synced: results.filter(r => r.success).length, total: paiements.length, results };
  }

  /**
   * Synchronisation complète
   */
  async syncAll() {
    console.log('[SmartAccounting] Début synchronisation complète...');

    const ventesResult = await this.syncVentes();
    const paiementsResult = await this.syncPaiements();

    console.log(`[SmartAccounting] Synchronisation terminée: ${ventesResult.synced} ventes, ${paiementsResult.synced} paiements`);

    return {
      ventes: ventesResult,
      paiements: paiementsResult,
      total_synced: ventesResult.synced + paiementsResult.synced
    };
  }
}

// Export singleton
module.exports = new SmartAccountingEngine();
module.exports.SmartAccountingEngine = SmartAccountingEngine;
module.exports.COMPTES_OHADA = COMPTES_OHADA;
module.exports.MAPPING_PRODUITS = MAPPING_PRODUITS;
module.exports.MAPPING_PAIEMENTS = MAPPING_PAIEMENTS;
