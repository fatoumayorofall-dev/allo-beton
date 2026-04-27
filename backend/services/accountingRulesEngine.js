/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ACCOUNTING RULES ENGINE - Moteur de Règles Comptables
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Catégorisation automatique des transactions
 * Exécution de règles métier pour la comptabilisation
 *
 * @author Claude AI - Architecte SaaS Expert SYSCOHADA
 * @version 1.0.0
 */

const db = require('../db');
const smartAccounting = require('./smartAccountingEngine');

// ═══════════════════════════════════════════════════════════════════════════════
// RÈGLES PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_RULES = [
  // Mobile Money - Ventes
  {
    id: 'WAVE_VENTE',
    name: 'Paiement Wave - Vente',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'WAVE' },
      { field: 'type', operator: 'equals', value: 'credit' }
    ],
    action: {
      type: 'paiement_client',
      payment_method: 'wave',
      category: 'vente'
    }
  },
  {
    id: 'ORANGE_MONEY_VENTE',
    name: 'Paiement Orange Money - Vente',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'ORANGE' },
      { field: 'type', operator: 'equals', value: 'credit' }
    ],
    action: {
      type: 'paiement_client',
      payment_method: 'orange_money',
      category: 'vente'
    }
  },
  {
    id: 'FREE_MONEY_VENTE',
    name: 'Paiement Free Money - Vente',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'FREE' },
      { field: 'type', operator: 'equals', value: 'credit' }
    ],
    action: {
      type: 'paiement_client',
      payment_method: 'free_money',
      category: 'vente'
    }
  },

  // Virements bancaires
  {
    id: 'VIREMENT_CLIENT',
    name: 'Virement bancaire client',
    priority: 90,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'VIR' },
      { field: 'type', operator: 'equals', value: 'credit' }
    ],
    action: {
      type: 'paiement_client',
      payment_method: 'virement',
      category: 'vente'
    }
  },

  // Achats carburant
  {
    id: 'CARBURANT_TOTAL',
    name: 'Achat carburant Total',
    priority: 95,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'TOTAL' },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'achat',
      expense_type: 'carburant',
      tva: false
    }
  },
  {
    id: 'CARBURANT_SHELL',
    name: 'Achat carburant Shell',
    priority: 95,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'SHELL' },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'achat',
      expense_type: 'carburant',
      tva: false
    }
  },

  // Fournisseurs connus
  {
    id: 'DANGOTE_CEMENT',
    name: 'Achat Dangote Cement',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'DANGOTE' },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'achat',
      expense_type: 'achat_ciment',
      supplier_name: 'DANGOTE CEMENT',
      tva: true
    }
  },
  {
    id: 'SOCOCIM',
    name: 'Achat Sococim',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'SOCOCIM' },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'achat',
      expense_type: 'achat_ciment',
      supplier_name: 'SOCOCIM INDUSTRIES',
      tva: true
    }
  },
  {
    id: 'CDS_CIMENT',
    name: 'Achat Ciments du Sahel',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'SAHEL' },
      { field: 'label', operator: 'contains', value: 'CIMENT' }
    ],
    action: {
      type: 'achat',
      expense_type: 'achat_ciment',
      supplier_name: 'CIMENTS DU SAHEL',
      tva: true
    }
  },

  // Charges courantes
  {
    id: 'SENELEC',
    name: 'Facture Senelec',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'contains', value: 'SENELEC' },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'achat',
      expense_type: 'electricite',
      compte: '605100',
      tva: true
    }
  },
  {
    id: 'SDE_EAU',
    name: 'Facture SDE/Sen Eau',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'or', values: ['SDE', 'SEN EAU', 'SENEAU'] },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'achat',
      expense_type: 'eau',
      compte: '605200',
      tva: true
    }
  },
  {
    id: 'SONATEL',
    name: 'Facture Sonatel/Orange',
    priority: 100,
    active: true,
    conditions: [
      { field: 'label', operator: 'or', values: ['SONATEL', 'ORANGE TELECOM'] },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'achat',
      expense_type: 'telephone',
      tva: true
    }
  },

  // Frais bancaires
  {
    id: 'FRAIS_BANCAIRES',
    name: 'Frais bancaires',
    priority: 80,
    active: true,
    conditions: [
      { field: 'label', operator: 'or', values: ['FRAIS', 'COMMISSION', 'AGIOS', 'TENUE COMPTE'] },
      { field: 'type', operator: 'equals', value: 'debit' },
      { field: 'amount', operator: 'less_than', value: 100000 }
    ],
    action: {
      type: 'charge',
      expense_type: 'banque',
      compte: '627000',
      tva: false
    }
  },

  // Salaires
  {
    id: 'VIREMENT_SALAIRE',
    name: 'Virement salaire',
    priority: 90,
    active: true,
    conditions: [
      { field: 'label', operator: 'or', values: ['SALAIRE', 'PAIE', 'REMUNERATION'] },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'salaire',
      compte: '421000'
    }
  },

  // Loyer
  {
    id: 'LOYER',
    name: 'Paiement loyer',
    priority: 85,
    active: true,
    conditions: [
      { field: 'label', operator: 'or', values: ['LOYER', 'BAIL', 'LOCATION'] },
      { field: 'type', operator: 'equals', value: 'debit' }
    ],
    action: {
      type: 'achat',
      expense_type: 'loyer',
      tva: false
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSE PRINCIPALE - RULES ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class AccountingRulesEngine {

  constructor() {
    this.rules = [...DEFAULT_RULES];
    this.executionLogs = [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GESTION DES RÈGLES (CRUD)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Récupère toutes les règles
   */
  async getRules() {
    try {
      const [dbRules] = await db.query(
        `SELECT * FROM accounting_rules WHERE deleted_at IS NULL ORDER BY priority DESC`
      );

      // Combiner les règles par défaut avec celles de la DB
      const customRules = dbRules.map(r => ({
        ...r,
        conditions: JSON.parse(r.conditions || '[]'),
        action: JSON.parse(r.action || '{}'),
        isCustom: true
      }));

      return [...this.rules, ...customRules].sort((a, b) => b.priority - a.priority);
    } catch (error) {
      // Si la table n'existe pas, retourner les règles par défaut
      console.log('Table accounting_rules non trouvée, utilisation des règles par défaut');
      return this.rules;
    }
  }

  /**
   * Créer une nouvelle règle
   */
  async createRule(rule) {
    const { name, priority = 50, conditions, action, active = true } = rule;

    if (!name || !conditions || !action) {
      throw new Error('Champs requis: name, conditions, action');
    }

    const id = 'CUSTOM_' + Date.now();

    const [result] = await db.query(
      `INSERT INTO accounting_rules (id, name, priority, conditions, action, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, name, priority, JSON.stringify(conditions), JSON.stringify(action), active]
    );

    return { id, ...rule };
  }

  /**
   * Modifier une règle
   */
  async updateRule(id, updates) {
    const { name, priority, conditions, action, active } = updates;

    await db.query(
      `UPDATE accounting_rules SET
        name = COALESCE(?, name),
        priority = COALESCE(?, priority),
        conditions = COALESCE(?, conditions),
        action = COALESCE(?, action),
        active = COALESCE(?, active),
        updated_at = NOW()
       WHERE id = ?`,
      [
        name,
        priority,
        conditions ? JSON.stringify(conditions) : null,
        action ? JSON.stringify(action) : null,
        active,
        id
      ]
    );

    return { id, ...updates };
  }

  /**
   * Supprimer une règle
   */
  async deleteRule(id) {
    // Soft delete
    await db.query(
      `UPDATE accounting_rules SET deleted_at = NOW() WHERE id = ?`,
      [id]
    );
    return { deleted: true, id };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ÉVALUATION DES CONDITIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Évalue si une transaction correspond à une règle
   */
  evaluateConditions(transaction, conditions) {
    for (const condition of conditions) {
      const { field, operator, value, values } = condition;
      const transactionValue = transaction[field];

      if (transactionValue === undefined || transactionValue === null) {
        return false;
      }

      const normalizedValue = String(transactionValue).toUpperCase();

      switch (operator) {
        case 'equals':
          if (normalizedValue !== String(value).toUpperCase()) return false;
          break;

        case 'not_equals':
          if (normalizedValue === String(value).toUpperCase()) return false;
          break;

        case 'contains':
          if (!normalizedValue.includes(String(value).toUpperCase())) return false;
          break;

        case 'not_contains':
          if (normalizedValue.includes(String(value).toUpperCase())) return false;
          break;

        case 'starts_with':
          if (!normalizedValue.startsWith(String(value).toUpperCase())) return false;
          break;

        case 'ends_with':
          if (!normalizedValue.endsWith(String(value).toUpperCase())) return false;
          break;

        case 'or':
          const matchesAny = (values || []).some(v =>
            normalizedValue.includes(String(v).toUpperCase())
          );
          if (!matchesAny) return false;
          break;

        case 'and':
          const matchesAll = (values || []).every(v =>
            normalizedValue.includes(String(v).toUpperCase())
          );
          if (!matchesAll) return false;
          break;

        case 'greater_than':
          if (parseFloat(transactionValue) <= parseFloat(value)) return false;
          break;

        case 'less_than':
          if (parseFloat(transactionValue) >= parseFloat(value)) return false;
          break;

        case 'between':
          const [min, max] = values || [];
          const numValue = parseFloat(transactionValue);
          if (numValue < parseFloat(min) || numValue > parseFloat(max)) return false;
          break;

        case 'regex':
          const regex = new RegExp(value, 'i');
          if (!regex.test(transactionValue)) return false;
          break;

        default:
          console.warn(`Opérateur inconnu: ${operator}`);
          return false;
      }
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXÉCUTION DES RÈGLES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Trouve la première règle qui correspond à une transaction
   */
  async findMatchingRule(transaction) {
    const rules = await this.getRules();
    const activeRules = rules.filter(r => r.active);

    for (const rule of activeRules) {
      if (this.evaluateConditions(transaction, rule.conditions)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Catégorise automatiquement une transaction
   */
  async categorizeTransaction(transaction) {
    const rule = await this.findMatchingRule(transaction);

    if (!rule) {
      return {
        matched: false,
        transaction,
        suggestion: this.suggestCategory(transaction)
      };
    }

    return {
      matched: true,
      rule: {
        id: rule.id,
        name: rule.name
      },
      action: rule.action,
      transaction
    };
  }

  /**
   * Exécute automatiquement une règle sur une transaction
   */
  async executeRule(transaction, options = {}) {
    const { dryRun = false, created_by = 'rules_engine' } = options;

    const categorization = await this.categorizeTransaction(transaction);

    if (!categorization.matched) {
      this.logExecution(transaction, null, 'no_match', null);
      return {
        success: false,
        reason: 'no_matching_rule',
        suggestion: categorization.suggestion
      };
    }

    const { rule, action } = categorization;

    // Log avant exécution
    this.logExecution(transaction, rule, 'matched', null);

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        rule,
        action,
        message: `Règle "${rule.name}" correspondante (simulation)`
      };
    }

    // Exécuter l'action
    try {
      const result = await this.executeAction(action, transaction, created_by);
      this.logExecution(transaction, rule, 'executed', result);

      return {
        success: true,
        rule,
        action,
        result,
        message: `Règle "${rule.name}" exécutée avec succès`
      };
    } catch (error) {
      this.logExecution(transaction, rule, 'error', { error: error.message });
      throw error;
    }
  }

  /**
   * Exécute l'action associée à une règle
   */
  async executeAction(action, transaction, created_by) {
    const { type, ...params } = action;

    switch (type) {
      case 'paiement_client':
        return await smartAccounting.enregistrerPaiementClient({
          amount: transaction.amount,
          payment_method: params.payment_method || transaction.payment_method,
          customer_name: transaction.customer_name || transaction.label,
          reference_number: transaction.reference,
          payment_date: transaction.date,
          created_by
        });

      case 'achat':
        return await smartAccounting.enregistrerAchat({
          total_amount: transaction.amount,
          supplier_name: params.supplier_name || transaction.label,
          expense_type: params.expense_type || 'frais_divers',
          tax_exempt: !params.tva,
          purchase_date: transaction.date,
          created_by
        });

      case 'charge':
        return await smartAccounting.enregistrerMouvementCaisse({
          type: 'depense',
          amount: transaction.amount,
          category: params.expense_type,
          description: transaction.label,
          movement_date: transaction.date,
          created_by
        });

      case 'salaire':
        // Pour les salaires, on crée un mouvement simple
        return await smartAccounting.enregistrerMouvementCaisse({
          type: 'depense',
          amount: transaction.amount,
          category: 'salaire',
          description: `Salaire - ${transaction.label}`,
          movement_date: transaction.date,
          created_by
        });

      case 'vente':
        return await smartAccounting.enregistrerVente({
          total_amount: transaction.amount,
          customer_name: transaction.customer_name || transaction.label,
          sale_date: transaction.date,
          items: [],
          created_by
        });

      default:
        throw new Error(`Type d'action inconnu: ${type}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUGGESTIONS INTELLIGENTES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Suggère une catégorie basée sur des patterns
   */
  suggestCategory(transaction) {
    const label = (transaction.label || '').toUpperCase();
    const amount = parseFloat(transaction.amount) || 0;
    const type = transaction.type; // credit ou debit

    // Patterns de suggestion
    const patterns = [
      { regex: /VIREMENT|VIR|TRANSFER/i, category: type === 'credit' ? 'paiement_client' : 'virement_sortant' },
      { regex: /CHEQUE|CHQ/i, category: type === 'credit' ? 'cheque_recu' : 'cheque_emis' },
      { regex: /RETRAIT|DAB|GAB/i, category: 'retrait_especes' },
      { regex: /DEPOT|VERSEMENT/i, category: 'depot_especes' },
      { regex: /CARTE|CB|VISA|MASTERCARD/i, category: 'carte_bancaire' },
      { regex: /PRLV|PRELEVEMENT/i, category: 'prelevement' },
      { regex: /ABONNEMENT|ABO/i, category: 'abonnement' },
      { regex: /ASSURANCE|ASSU/i, category: 'assurance' },
      { regex: /IMPOT|FISC|TAX/i, category: 'impots' },
      { regex: /SALAIRE|PAIE/i, category: 'salaire' }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(label)) {
        return {
          category: pattern.category,
          confidence: 0.7,
          reason: `Pattern détecté: ${pattern.regex.source}`
        };
      }
    }

    // Suggestion basée sur le montant
    if (type === 'debit') {
      if (amount < 10000) return { category: 'frais_divers', confidence: 0.3 };
      if (amount < 100000) return { category: 'achat', confidence: 0.4 };
      if (amount < 500000) return { category: 'achat_important', confidence: 0.4 };
      return { category: 'investissement', confidence: 0.3 };
    } else {
      if (amount < 100000) return { category: 'vente_detail', confidence: 0.4 };
      return { category: 'vente', confidence: 0.5 };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGS D'EXÉCUTION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Log une exécution de règle
   */
  logExecution(transaction, rule, status, result) {
    const log = {
      timestamp: new Date().toISOString(),
      transaction_id: transaction.id,
      transaction_label: transaction.label,
      transaction_amount: transaction.amount,
      rule_id: rule?.id || null,
      rule_name: rule?.name || null,
      status,
      result: result ? JSON.stringify(result).substring(0, 500) : null
    };

    this.executionLogs.push(log);

    // Garder seulement les 1000 derniers logs en mémoire
    if (this.executionLogs.length > 1000) {
      this.executionLogs = this.executionLogs.slice(-1000);
    }

    // Persister en base si possible
    this.persistLog(log).catch(console.error);
  }

  /**
   * Persiste un log en base de données
   */
  async persistLog(log) {
    try {
      await db.query(
        `INSERT INTO accounting_rules_logs
         (transaction_id, transaction_label, transaction_amount, rule_id, rule_name, status, result, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [log.transaction_id, log.transaction_label, log.transaction_amount,
         log.rule_id, log.rule_name, log.status, log.result]
      );
    } catch (error) {
      // Table peut ne pas exister
      console.debug('Log non persisté:', error.message);
    }
  }

  /**
   * Récupère les logs d'exécution
   */
  async getExecutionLogs(options = {}) {
    const { limit = 100, offset = 0, rule_id, status } = options;

    try {
      let query = `SELECT * FROM accounting_rules_logs WHERE 1=1`;
      const params = [];

      if (rule_id) {
        query += ` AND rule_id = ?`;
        params.push(rule_id);
      }
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [logs] = await db.query(query, params);
      return logs;
    } catch (error) {
      // Retourner les logs en mémoire
      return this.executionLogs.slice(-limit);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRAITEMENT EN LOT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Traite un lot de transactions
   */
  async processBatch(transactions, options = {}) {
    const { dryRun = false, created_by = 'batch_process' } = options;

    const results = {
      total: transactions.length,
      processed: 0,
      matched: 0,
      executed: 0,
      errors: 0,
      details: []
    };

    for (const transaction of transactions) {
      try {
        const result = await this.executeRule(transaction, { dryRun, created_by });
        results.processed++;

        if (result.success) {
          results.matched++;
          if (!dryRun) results.executed++;
        }

        results.details.push({
          transaction_id: transaction.id,
          ...result
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          transaction_id: transaction.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Export singleton
module.exports = new AccountingRulesEngine();
module.exports.AccountingRulesEngine = AccountingRulesEngine;
module.exports.DEFAULT_RULES = DEFAULT_RULES;
