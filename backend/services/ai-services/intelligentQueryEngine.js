// ============================================================
//  INTELLIGENT QUERY ENGINE v2.0 — Moteur IA Omniscient COMPLET
//  Comprend TOUTES les questions en langage naturel et
//  a accès à TOUTES les 66 tables de la base de données.
//  Génère des rapports complets sur n'importe quel sujet.
// ============================================================
const { pool } = require('../../config/database');

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : 'N/A';

// ============================================================
//  SCHÉMA COMPLET DE LA BASE DE DONNÉES — 66 TABLES
// ============================================================
const DB_TABLES = {
  // === CLIENTS & VENTES ===
  customers: {
    label: 'Clients',
    searchFields: ['name', 'company', 'phone', 'email', 'address', 'city', 'responsable_commercial'],
    displayFields: ['name', 'company', 'phone', 'email', 'city', 'customer_type', 'current_balance', 'prepaid_balance', 'status'],
    keywords: ['client', 'clients', 'acheteur', 'acheteurs', 'customer', 'société', 'entreprise', 'particulier']
  },
  sales: {
    label: 'Ventes',
    searchFields: ['client_name', 'sale_number', 'driver_name', 'vehicle_plate', 'destination', 'type_beton', 'camion'],
    displayFields: ['sale_number', 'client_name', 'sale_date', 'total_amount', 'payment_status', 'type_beton', 'weight_loaded', 'destination'],
    keywords: ['vente', 'ventes', 'transaction', 'commande', 'ca', 'chiffre', 'affaires', 'bon']
  },
  sale_items: {
    label: 'Lignes de vente',
    searchFields: [],
    displayFields: ['product_id', 'quantity', 'unit_price', 'line_total'],
    keywords: ['ligne', 'article', 'détail vente']
  },

  // === EMPLOYÉS & RH ===
  employees: {
    label: 'Employés',
    searchFields: ['first_name', 'last_name', 'phone', 'email', 'position', 'department', 'employee_number'],
    displayFields: ['first_name', 'last_name', 'position', 'department', 'contract_type', 'base_salary', 'hire_date', 'status'],
    keywords: ['employé', 'employés', 'employe', 'employes', 'salarié', 'salariés', 'personnel', 'staff', 'équipe', 'travailleur', 'agent', 'rh', 'ressources humaines', 'effectif']
  },
  salary_payments: {
    label: 'Paiements de salaires',
    searchFields: [],
    displayFields: ['payment_month', 'payment_year', 'gross_salary', 'net_salary', 'status', 'payment_date'],
    keywords: ['salaire', 'salaires', 'paie', 'bulletin', 'rémunération', 'masse salariale', 'fiche de paie']
  },
  salary_advances: {
    label: 'Avances sur salaire',
    searchFields: ['reason'],
    displayFields: ['amount', 'reason', 'request_date', 'status'],
    keywords: ['avance', 'avances', 'acompte', 'avance salaire']
  },

  // === FOURNISSEURS & ACHATS ===
  suppliers: {
    label: 'Fournisseurs',
    searchFields: ['name', 'contact_person', 'phone', 'email', 'address', 'city'],
    displayFields: ['name', 'contact_person', 'phone', 'email', 'city', 'status'],
    keywords: ['fournisseur', 'fournisseurs', 'supplier', 'approvisionnement', 'achats']
  },
  purchase_orders: {
    label: 'Bons de commande',
    searchFields: ['order_number', 'notes'],
    displayFields: ['order_number', 'order_date', 'expected_delivery_date', 'total_amount', 'status'],
    keywords: ['commande', 'commandes', 'achat', 'achats', 'approvisionnement', 'purchase', 'bon de commande']
  },
  purchase_order_items: {
    label: 'Articles commandés',
    searchFields: ['product_name'],
    displayFields: ['product_name', 'quantity', 'unit_cost', 'line_total'],
    keywords: []
  },
  supplier_products: {
    label: 'Produits fournisseurs',
    searchFields: ['product_name'],
    displayFields: ['product_name', 'supplier_id'],
    keywords: []
  },

  // === PRODUITS & STOCK ===
  products: {
    label: 'Produits',
    searchFields: ['name', 'sku', 'description', 'product_type', 'variant'],
    displayFields: ['name', 'sku', 'selling_price', 'cost_price', 'product_type', 'status'],
    keywords: ['produit', 'produits', 'article', 'articles', 'béton', 'beton', 'stock', 'ciment', 'agrégats', 'ferraillage', 'matériaux']
  },
  inventory_items: {
    label: 'Inventaire',
    searchFields: ['location'],
    displayFields: ['product_id', 'quantity', 'reserved_quantity', 'location', 'min_stock_level'],
    keywords: ['inventaire', 'stock', 'quantité', 'réserve', 'disponible']
  },
  stock_movements: {
    label: 'Mouvements de stock',
    searchFields: ['notes', 'supplier_name', 'reference_number'],
    displayFields: ['movement_type', 'quantity', 'reference_type', 'created_at'],
    keywords: ['mouvement', 'entrée', 'sortie', 'ajustement', 'stock movement']
  },
  categories: {
    label: 'Catégories',
    searchFields: ['name', 'description'],
    displayFields: ['name', 'description', 'status'],
    keywords: ['catégorie', 'catégories', 'category', 'classification']
  },

  // === FACTURES & PAIEMENTS ===
  invoices: {
    label: 'Factures',
    searchFields: ['invoice_number', 'company_name', 'notes'],
    displayFields: ['invoice_number', 'invoice_date', 'due_date', 'total_amount', 'status', 'company_name'],
    keywords: ['facture', 'factures', 'invoice', 'facturation', 'facturé']
  },
  invoice_items: {
    label: 'Lignes de facture',
    searchFields: ['description'],
    displayFields: ['description', 'quantity', 'unit_price', 'line_total'],
    keywords: []
  },
  payments: {
    label: 'Paiements',
    searchFields: ['reference_number', 'notes', 'payment_number'],
    displayFields: ['amount', 'payment_date', 'payment_method', 'reference_number', 'status'],
    keywords: ['paiement', 'paiements', 'versement', 'règlement', 'reglements', 'encaissement', 'règlé']
  },
  credit_notes: {
    label: 'Avoirs',
    searchFields: ['credit_note_number', 'reason'],
    displayFields: ['credit_note_number', 'total_amount', 'status', 'created_at'],
    keywords: ['avoir', 'avoirs', 'remboursement', 'note crédit', 'credit note']
  },
  credit_note_items: {
    label: 'Lignes avoir',
    searchFields: ['description'],
    displayFields: ['description', 'quantity', 'unit_price', 'line_total'],
    keywords: []
  },

  // === PROJETS & CHANTIERS ===
  projects: {
    label: 'Projets/Chantiers',
    searchFields: ['name', 'code', 'client', 'location', 'description', 'responsable'],
    displayFields: ['name', 'code', 'client', 'location', 'date_debut', 'date_fin_prevue', 'budget_prevu', 'status'],
    keywords: ['projet', 'projets', 'chantier', 'chantiers', 'construction', 'site', 'ouvrage']
  },

  // === LIVRAISONS ===
  delivery_notes: {
    label: 'Bons de livraison',
    searchFields: ['delivery_number', 'driver_name', 'vehicle_plate', 'delivery_location', 'product_type'],
    displayFields: ['delivery_number', 'delivery_date', 'driver_name', 'vehicle_plate', 'delivery_location', 'weight_tons', 'status'],
    keywords: ['livraison', 'livraisons', 'bon', 'bons', 'delivery', 'transport', 'chauffeur', 'camion', 'véhicule']
  },

  // === CAISSE & TRÉSORERIE ===
  cash_movements: {
    label: 'Mouvements de caisse',
    searchFields: ['description', 'reference', 'category', 'decaisseur', 'encaisseur'],
    displayFields: ['date', 'type', 'category', 'description', 'amount', 'payment_method'],
    keywords: ['caisse', 'mouvement', 'recette', 'dépense', 'depense', 'trésorerie', 'tresorerie', 'espèces', 'encaissement', 'décaissement']
  },
  cash_balance: {
    label: 'Solde caisse',
    searchFields: [],
    displayFields: ['date', 'opening_balance', 'total_recettes', 'total_depenses', 'closing_balance'],
    keywords: ['solde caisse', 'balance', 'situation caisse']
  },

  // === BANQUES ===
  banks: {
    label: 'Banques',
    searchFields: ['name', 'code', 'contact_person', 'account_number'],
    displayFields: ['name', 'code', 'account_number', 'phone', 'email'],
    keywords: ['banque', 'banques', 'bank', 'bancaire', 'établissement']
  },
  bank_accounts: {
    label: 'Comptes bancaires',
    searchFields: ['account_name', 'account_number'],
    displayFields: ['account_name', 'account_number', 'account_type', 'current_balance', 'currency'],
    keywords: ['compte bancaire', 'comptes', 'compte courant', 'épargne']
  },
  bank_loans: {
    label: 'Emprunts/Prêts',
    searchFields: ['label', 'description'],
    displayFields: ['label', 'loan_type', 'principal_amount', 'remaining_amount', 'status'],
    keywords: ['prêt', 'pret', 'emprunt', 'crédit', 'credit', 'dette', 'découvert']
  },
  bank_loan_schedules: {
    label: 'Échéancier prêts',
    searchFields: [],
    displayFields: ['due_date', 'amount', 'principal_part', 'interest_part', 'status'],
    keywords: ['échéance', 'écheancier', 'remboursement prêt']
  },
  rapprochement_bancaire: {
    label: 'Rapprochement bancaire',
    searchFields: [],
    displayFields: ['date_rapprochement', 'solde_comptable', 'solde_banque', 'ecart', 'statut'],
    keywords: ['rapprochement', 'réconciliation', 'bancaire']
  },

  // === PARTENAIRES & INVESTISSEURS ===
  partners: {
    label: 'Partenaires',
    searchFields: ['name', 'company', 'phone', 'email'],
    displayFields: ['name', 'company', 'phone', 'email', 'is_active'],
    keywords: ['partenaire', 'partenaires', 'partner', 'investisseur', 'associé', 'actionnaire']
  },
  partner_contracts: {
    label: 'Contrats partenaires',
    searchFields: ['label', 'description'],
    displayFields: ['label', 'invested_amount', 'monthly_return', 'start_date', 'end_date', 'status'],
    keywords: ['contrat partenaire', 'investissement', 'rendement', 'mensualité']
  },
  partner_payments: {
    label: 'Paiements partenaires',
    searchFields: ['reference', 'month_label'],
    displayFields: ['payment_date', 'amount', 'payment_method', 'month_label'],
    keywords: ['paiement partenaire', 'versement partenaire', 'dividende']
  },

  // === QUOTAS & DÉPÔTS CLIENTS ===
  client_deposits: {
    label: 'Dépôts clients',
    searchFields: ['deposit_number', 'reference_number', 'notes'],
    displayFields: ['deposit_number', 'amount', 'payment_method', 'created_at'],
    keywords: ['dépôt', 'depôt', 'acompte', 'avance client', 'versement anticipé', 'prépaiement']
  },
  client_quotas: {
    label: 'Quotas clients',
    searchFields: ['product_type', 'product_variant', 'notes'],
    displayFields: ['product_type', 'quota_initial', 'quota_consumed', 'quota_date', 'status'],
    keywords: ['quota', 'quotas', 'allocation', 'dotation', 'limite']
  },
  quota_consumptions: {
    label: 'Consommations quotas',
    searchFields: [],
    displayFields: ['quantity', 'consumed_at'],
    keywords: ['consommation quota']
  },
  deposit_allocations: {
    label: 'Allocations dépôts',
    searchFields: ['sale_number'],
    displayFields: ['amount_allocated', 'sale_number', 'sale_date'],
    keywords: ['allocation dépôt', 'affectation']
  },

  // === COMPTABILITÉ SYSCOHADA ===
  plan_comptable: {
    label: 'Plan comptable',
    searchFields: ['code', 'libelle'],
    displayFields: ['code', 'libelle', 'classe', 'type'],
    keywords: ['plan comptable', 'compte', 'comptes', 'syscohada', 'pcg', 'comptabilité']
  },
  journaux: {
    label: 'Journaux comptables',
    searchFields: ['code', 'libelle'],
    displayFields: ['code', 'libelle', 'type'],
    keywords: ['journal', 'journaux', 'écriture', 'comptable']
  },
  journaux_comptables: {
    label: 'Journaux comptables v2',
    searchFields: ['code', 'libelle'],
    displayFields: ['code', 'libelle', 'type'],
    keywords: []
  },
  ecritures: {
    label: 'Écritures comptables',
    searchFields: ['numero_piece', 'libelle', 'reference'],
    displayFields: ['numero_piece', 'date_ecriture', 'libelle', 'total_debit', 'total_credit', 'statut'],
    keywords: ['écriture', 'écritures', 'pièce', 'comptabilisation']
  },
  ecritures_comptables: {
    label: 'Écritures comptables v2',
    searchFields: ['numero_piece', 'libelle'],
    displayFields: ['date_ecriture', 'numero_piece', 'compte_code', 'libelle', 'debit', 'credit'],
    keywords: []
  },
  lignes_ecritures: {
    label: 'Lignes écritures',
    searchFields: ['libelle', 'numero_compte'],
    displayFields: ['numero_compte', 'libelle', 'debit', 'credit'],
    keywords: ['ligne écriture', 'imputation']
  },
  exercices: {
    label: 'Exercices comptables',
    searchFields: [],
    displayFields: ['annee', 'date_ouverture', 'date_cloture', 'statut'],
    keywords: ['exercice', 'exercices', 'année comptable', 'clôture']
  },
  budgets: {
    label: 'Budgets',
    searchFields: ['libelle', 'numero_compte'],
    displayFields: ['libelle', 'total_annuel'],
    keywords: ['budget', 'budgets', 'prévisionnel', 'prévision']
  },
  centres_analytiques: {
    label: 'Centres analytiques',
    searchFields: ['code', 'libelle', 'responsable'],
    displayFields: ['code', 'libelle', 'type', 'budget_annuel'],
    keywords: ['centre analytique', 'analytique', 'centre coût', 'centre profit']
  },
  tiers_comptable: {
    label: 'Tiers comptables',
    searchFields: ['code', 'raison_sociale', 'ninea'],
    displayFields: ['code', 'raison_sociale', 'type', 'compte_collectif'],
    keywords: ['tiers', 'auxiliaire', 'compte tiers']
  },
  immobilisations: {
    label: 'Immobilisations',
    searchFields: ['code', 'libelle', 'numero_serie', 'localisation'],
    displayFields: ['code', 'libelle', 'valeur_acquisition', 'valeur_nette_comptable', 'statut'],
    keywords: ['immobilisation', 'immobilisations', 'amortissement', 'actif', 'équipement', 'matériel']
  },
  declarations_tva: {
    label: 'Déclarations TVA',
    searchFields: ['periode', 'reference_dgi'],
    displayFields: ['periode', 'tva_collectee', 'tva_deductible', 'tva_nette', 'statut'],
    keywords: ['tva', 'déclaration', 'taxe', 'fiscal', 'dgi']
  },
  rapprochements: {
    label: 'Rapprochements',
    searchFields: ['compte_banque', 'observations'],
    displayFields: ['compte_banque', 'date_rapprochement', 'solde_comptable', 'solde_banque', 'ecart', 'statut'],
    keywords: ['rapprochement comptable']
  },

  // === UTILISATEURS & SÉCURITÉ ===
  users: {
    label: 'Utilisateurs',
    searchFields: ['first_name', 'last_name', 'email', 'phone', 'company'],
    displayFields: ['first_name', 'last_name', 'email', 'phone', 'role', 'is_active'],
    keywords: ['utilisateur', 'utilisateurs', 'user', 'users', 'compte', 'comptes', 'accès', 'admin', 'manager']
  },
  user_permissions: {
    label: 'Permissions',
    searchFields: ['menu_id'],
    displayFields: ['menu_id', 'can_create', 'can_read', 'can_update', 'can_delete'],
    keywords: ['permission', 'permissions', 'droit', 'droits', 'accès']
  },
  audit_logs: {
    label: 'Logs audit',
    searchFields: ['user_email', 'user_name', 'description', 'module'],
    displayFields: ['user_name', 'action', 'module', 'description', 'created_at'],
    keywords: ['audit', 'log', 'logs', 'historique', 'trace', 'action']
  },

  // === NOTIFICATIONS ===
  notifications: {
    label: 'Notifications',
    searchFields: ['title', 'message'],
    displayFields: ['title', 'message', 'type', 'read_status', 'created_at'],
    keywords: ['notification', 'notifications', 'alerte', 'alertes', 'message']
  },
  notification_preferences: {
    label: 'Préférences notifications',
    searchFields: ['event_type'],
    displayFields: ['event_type', 'notification_type', 'enabled'],
    keywords: ['préférence notification', 'paramètre notification']
  },

  // === E-COMMERCE ===
  ecom_products: {
    label: 'Produits e-commerce',
    searchFields: ['name', 'sku', 'description', 'slug', 'tags'],
    displayFields: ['name', 'sku', 'price', 'stock_quantity', 'stock_status', 'is_active'],
    keywords: ['produit ecommerce', 'boutique', 'catalogue', 'shop']
  },
  ecom_categories: {
    label: 'Catégories e-commerce',
    searchFields: ['name', 'description', 'slug'],
    displayFields: ['name', 'slug', 'is_active'],
    keywords: ['catégorie boutique', 'rayon']
  },
  ecom_customers: {
    label: 'Clients e-commerce',
    searchFields: ['email', 'phone', 'first_name', 'last_name', 'company_name'],
    displayFields: ['first_name', 'last_name', 'email', 'phone', 'customer_type', 'is_active'],
    keywords: ['client boutique', 'acheteur en ligne', 'compte client']
  },
  ecom_orders: {
    label: 'Commandes e-commerce',
    searchFields: ['order_number', 'billing_email', 'billing_phone', 'shipping_phone'],
    displayFields: ['order_number', 'status', 'payment_status', 'total', 'created_at'],
    keywords: ['commande boutique', 'order', 'panier validé']
  },
  ecom_order_items: {
    label: 'Articles commande e-commerce',
    searchFields: ['name', 'sku'],
    displayFields: ['name', 'quantity', 'unit_price', 'total'],
    keywords: []
  },
  ecom_carts: {
    label: 'Paniers',
    searchFields: ['session_id', 'coupon_code'],
    displayFields: ['status', 'subtotal', 'total', 'created_at'],
    keywords: ['panier', 'paniers', 'cart', 'caddie']
  },
  ecom_cart_items: {
    label: 'Articles panier',
    searchFields: [],
    displayFields: ['quantity', 'unit_price', 'total_price'],
    keywords: []
  },
  ecom_payments: {
    label: 'Paiements e-commerce',
    searchFields: ['payment_number', 'transaction_id', 'reference'],
    displayFields: ['payment_number', 'method', 'amount', 'status', 'paid_at'],
    keywords: ['paiement boutique', 'transaction en ligne', 'wave', 'orange money']
  },
  ecom_invoices: {
    label: 'Factures e-commerce',
    searchFields: ['invoice_number', 'customer_name', 'customer_email'],
    displayFields: ['invoice_number', 'type', 'total', 'status', 'issue_date'],
    keywords: ['facture boutique', 'proforma']
  },
  ecom_invoice_items: {
    label: 'Lignes facture e-commerce',
    searchFields: ['name', 'sku'],
    displayFields: ['name', 'quantity', 'unit_price', 'total'],
    keywords: []
  },
  ecom_addresses: {
    label: 'Adresses e-commerce',
    searchFields: ['first_name', 'last_name', 'address_line1', 'city'],
    displayFields: ['first_name', 'last_name', 'address_line1', 'city', 'type'],
    keywords: ['adresse livraison', 'adresse facturation']
  },
  ecom_sequences: {
    label: 'Séquences e-commerce',
    searchFields: ['name', 'prefix'],
    displayFields: ['name', 'prefix', 'current_value'],
    keywords: []
  },

  // === PARAMÈTRES ===
  settings: {
    label: 'Paramètres',
    searchFields: ['setting_key'],
    displayFields: ['setting_key', 'setting_value'],
    keywords: ['paramètre', 'paramètres', 'configuration', 'config', 'réglage']
  }
};

// ============================================================
//  MOTS À IGNORER DANS LA RECHERCHE
// ============================================================
const STOP_WORDS = new Set([
  // Français - Questions
  'qui', 'que', 'quoi', 'quel', 'quelle', 'quels', 'quelles', 'comment', 'combien', 'pourquoi', 'quand', 'où',
  // Français - Verbes demande
  'liste', 'lister', 'affiche', 'afficher', 'montre', 'montrer', 'donne', 'donner', 'voir', 'dis', 'dit',
  'explique', 'expliquer', 'décris', 'décrire', 'trouve', 'trouver', 'cherche', 'chercher',
  // Français - Déterminants
  'sont', 'est', 'mes', 'mon', 'ma', 'les', 'des', 'tous', 'toutes', 'tout', 'toute', 'chaque',
  'une', 'aux', 'ces', 'cet', 'cette', 'leur', 'leurs', 'notre', 'nos', 'votre', 'vos',
  // Français - Prépositions
  'sur', 'dans', 'pour', 'avec', 'par', 'chez', 'entre', 'vers', 'sous', 'depuis', 'jusqu', 'après', 'avant',
  // Français - Mots questions IA
  'info', 'infos', 'information', 'informations', 'rapport', 'fiche', 'profil', 'détail', 'détails',
  'parle', 'fait', 'avoir', 'être', 'faire', 'dire', 'savoir', 'pouvoir', 'vouloir',
  // Français - Pronoms
  'moi', 'toi', 'lui', 'elle', 'nous', 'vous', 'eux', 'elles', 'soi', 'ce', 'cela', 'ceci', 'ça',
  // Français - Adverbes
  'plus', 'moins', 'très', 'bien', 'mal', 'peu', 'beaucoup', 'assez', 'trop', 'encore', 'jamais', 'toujours',
  // Verbes courants
  'veux', 'voudrais', 'peux', 'pourrais', 'dois', 'devrais', 'faut', 'faudrait',
  'aide', 'aider', 'besoin',
  // Mots génériques / descriptifs
  'dernière', 'dernières', 'dernier', 'derniers', 'récent', 'récente', 'récents', 'récentes',
  'recent', 'recente', 'recents', 'recentes', 'premier', 'première', 'premiers', 'premières',
  'nouveau', 'nouvelle', 'nouveaux', 'nouvelles', 'ancien', 'ancienne', 'anciens', 'anciennes',
  'cours', 'actif', 'actifs', 'actives', 'inactif', 'inactifs', 'actuel', 'actuelle',
  // Termes métier génériques (pas des noms propres)
  'ventes', 'clients', 'client', 'employés', 'employes', 'fournisseurs', 'projets', 'factures',
  'paiements', 'produits', 'commandes', 'livraisons', 'stocks', 'mouvements',
  // Anglais courant
  'the', 'and', 'for', 'with', 'about', 'show', 'list', 'give', 'find', 'what', 'who', 'how', 'when', 'where'
]);

// ============================================================
//  EXTRACTION D'ENTITÉS DEPUIS LA QUESTION
// ============================================================
function extractSearchTerms(question) {
  const terms = [];

  // Extraire les noms propres (mots commençant par majuscule) - exclure les stop words
  const properNouns = question.match(/\b[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+)*/g);
  if (properNouns) {
    for (const noun of properNouns) {
      const nounLower = noun.toLowerCase();
      if (!STOP_WORDS.has(nounLower)) {
        terms.push(noun.trim());
      }
    }
  }

  // Extraire les mots entre guillemets
  const quoted = question.match(/"([^"]+)"|'([^']+)'/g);
  if (quoted) {
    terms.push(...quoted.map(q => q.replace(/['"]/g, '').trim()));
  }

  // Extraire les numéros de téléphone
  const phones = question.match(/\b\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b|\b\d{9,10}\b/g);
  if (phones) {
    terms.push(...phones);
  }

  // Extraire les emails
  const emails = question.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emails) {
    terms.push(...emails);
  }

  // Extraire les numéros de référence (VTE-xxx, FAC-xxx, etc.)
  const refs = question.match(/\b(VTE|FAC|CMD|BL|DEP|AVR|SAL|PRJ)-[\w-]+/gi);
  if (refs) {
    terms.push(...refs);
  }

  // Mots clés après "sur", "de", "concernant", "appelé", "nommé", "qui s'appelle"
  const patterns = [
    /(?:sur|de|concernant|appelé|nommé|qui s'appelle|dénommé)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/gi,
    /(?:client|employé|fournisseur|projet|partenaire)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/gi,
    /(?:rapport|info|fiche|détail|profil)\s+(?:sur|de|du)?\s*([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/gi
  ];

  for (const pattern of patterns) {
    const matches = [...question.matchAll(pattern)];
    for (const match of matches) {
      if (match[1] && match[1].length > 2 && !STOP_WORDS.has(match[1].toLowerCase())) {
        terms.push(match[1].trim());
      }
    }
  }

  return [...new Set(terms.filter(t => t.length > 2))];
}

// ============================================================
//  DÉTECTION DE LA TABLE CIBLE
// ============================================================
function detectTargetTable(question) {
  const lower = question.toLowerCase();

  for (const [tableName, config] of Object.entries(DB_TABLES)) {
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) {
        return { table: tableName, config };
      }
    }
  }

  // Par défaut, chercher partout
  return null;
}

// ============================================================
//  RECHERCHE INTELLIGENTE DANS UNE TABLE
// ============================================================
async function searchInTable(tableName, config, searchTerms) {
  const results = [];

  for (const term of searchTerms) {
    // Construire la requête de recherche
    const conditions = config.searchFields.map(field => `${field} LIKE ?`).join(' OR ');
    if (!conditions) continue;

    const params = config.searchFields.map(() => `%${term}%`);

    try {
      const [rows] = await pool.execute(
        `SELECT * FROM ${tableName} WHERE ${conditions} LIMIT 20`,
        params
      );
      results.push(...rows);
    } catch (err) {
      console.error(`Erreur recherche ${tableName}:`, err.message);
    }
  }

  // Dédupliquer par ID
  const unique = [];
  const seen = new Set();
  for (const row of results) {
    if (row.id && !seen.has(row.id)) {
      seen.add(row.id);
      unique.push(row);
    }
  }

  return unique;
}

// ============================================================
//  RECHERCHE GLOBALE DANS TOUTES LES TABLES
// ============================================================
async function searchGlobal(searchTerms) {
  const allResults = {};

  for (const [tableName, config] of Object.entries(DB_TABLES)) {
    if (config.searchFields.length === 0) continue;

    const results = await searchInTable(tableName, config, searchTerms);
    if (results.length > 0) {
      allResults[tableName] = {
        label: config.label,
        results,
        displayFields: config.displayFields
      };
    }
  }

  return allResults;
}

// ============================================================
//  LISTER TOUS LES ENREGISTREMENTS D'UNE TABLE
// ============================================================
async function listAllFromTable(tableName, config, limit = 50) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT ${parseInt(limit, 10)}`
    );
    return rows;
  } catch (err) {
    console.error(`Erreur listing ${tableName}:`, err.message);
    return [];
  }
}

// ============================================================
//  FORMATER UNE LISTE D'ENREGISTREMENTS
// ============================================================
function formatListResponse(tableName, config, rows) {
  if (rows.length === 0) {
    return { answer: `📭 Aucun enregistrement trouvé dans ${config.label}.`, data: [], chartType: null };
  }

  let answer = `📋 **${config.label}** — ${rows.length} enregistrement${rows.length > 1 ? 's' : ''}\n\n`;

  rows.slice(0, 20).forEach((row, i) => {
    const displayValues = [];
    for (const field of config.displayFields.slice(0, 5)) {
      if (row[field] !== undefined && row[field] !== null) {
        let val = row[field];
        // Formater les montants
        if (field.includes('amount') || field.includes('salary') || field.includes('balance') || field.includes('budget') || field.includes('price') || field.includes('total')) {
          val = fmt(val) + ' FCFA';
        }
        // Formater les dates
        if (field.includes('date') && val) {
          val = fmtDate(val);
        }
        // Statut avec emoji
        if (field === 'status' || field === 'is_active') {
          if (val === 'active' || val === 'actif' || val === true || val === 1) val = '🟢';
          else if (val === 'inactive' || val === 'inactif' || val === false || val === 0) val = '🔴';
        }
        displayValues.push(val);
      }
    }
    answer += `${i+1}. ${displayValues.join(' | ')}\n`;
  });

  if (rows.length > 20) {
    answer += `\n... et ${rows.length - 20} autres\n`;
  }

  answer += `\n💡 *Pour plus de détails sur un élément, demandez "info sur [nom]" ou "rapport [nom]"*`;

  return { answer, data: rows, chartType: null };
}

// ============================================================
//  GÉNÉRER UN RAPPORT COMPLET SUR UN CLIENT
// ============================================================
async function generateClientReport(clientId, clientName) {
  const report = { client: null, sales: [], payments: [], invoices: [], projects: [], deposits: [], quotas: [], stats: {} };

  try {
    // Infos client
    const [clients] = await pool.execute(
      `SELECT * FROM customers WHERE id = ? OR name LIKE ? LIMIT 1`,
      [clientId || '', `%${clientName}%`]
    );
    if (clients.length === 0) return null;
    report.client = clients[0];
    const cid = report.client.id;

    // Ventes du client
    const [sales] = await pool.execute(
      `SELECT sale_number, sale_date, total_amount, payment_status, type_beton, weight_loaded, destination
       FROM sales WHERE customer_id = ? OR client_name LIKE ? ORDER BY sale_date DESC LIMIT 50`,
      [cid, `%${clientName}%`]
    );
    report.sales = sales;

    // Paiements
    const [payments] = await pool.execute(
      `SELECT p.amount, p.payment_date, p.payment_method, p.reference_number, p.status
       FROM payments p JOIN sales s ON p.sale_id = s.id
       WHERE s.customer_id = ? ORDER BY p.payment_date DESC LIMIT 30`,
      [cid]
    );
    report.payments = payments;

    // Factures
    const [invoices] = await pool.execute(
      `SELECT invoice_number, invoice_date, due_date, total_amount, status
       FROM invoices WHERE customer_id = ? ORDER BY invoice_date DESC LIMIT 20`,
      [cid]
    );
    report.invoices = invoices;

    // Projets/chantiers liés
    try {
      const [projects] = await pool.execute(
        `SELECT name, code, location, date_debut, status, budget_prevu
         FROM projects WHERE client LIKE ? LIMIT 10`,
        [`%${clientName}%`]
      );
      report.projects = projects;
    } catch {}

    // Dépôts
    try {
      const [deposits] = await pool.execute(
        `SELECT deposit_number, amount, payment_method, created_at
         FROM client_deposits WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10`,
        [cid]
      );
      report.deposits = deposits;
    } catch {}

    // Quotas
    try {
      const [quotas] = await pool.execute(
        `SELECT product_type, quota_initial, quota_consumed, status
         FROM client_quotas WHERE customer_id = ? ORDER BY quota_date DESC LIMIT 10`,
        [cid]
      );
      report.quotas = quotas;
    } catch {}

    // Statistiques
    const [stats] = await pool.execute(
      `SELECT COUNT(*) as total_ventes, COALESCE(SUM(total_amount),0) as ca_total,
              COALESCE(SUM(weight_loaded),0) as tonnage_total, COALESCE(AVG(total_amount),0) as panier_moyen
       FROM sales WHERE (customer_id = ? OR client_name LIKE ?) AND status != 'cancelled'`,
      [cid, `%${clientName}%`]
    );
    report.stats = stats[0];

    // Impayés
    const [unpaid] = await pool.execute(
      `SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as montant
       FROM sales WHERE (customer_id = ? OR client_name LIKE ?) AND payment_status IN ('pending','partial','overdue')`,
      [cid, `%${clientName}%`]
    );
    report.stats.impayes = unpaid[0];

  } catch (err) {
    console.error('Erreur rapport client:', err.message);
    return null;
  }

  return report;
}

// ============================================================
//  GÉNÉRER UN RAPPORT COMPLET SUR UN EMPLOYÉ
// ============================================================
async function generateEmployeeReport(employeeId, employeeName) {
  const report = { employee: null, salaries: [], advances: [], stats: {} };

  try {
    // Infos employé
    const nameParts = employeeName ? employeeName.split(' ') : [];
    let query = `SELECT * FROM employees WHERE id = ?`;
    let params = [employeeId || ''];

    if (nameParts.length >= 2) {
      query += ` OR (first_name LIKE ? AND last_name LIKE ?) OR (first_name LIKE ? AND last_name LIKE ?)`;
      params.push(`%${nameParts[0]}%`, `%${nameParts[1]}%`, `%${nameParts[1]}%`, `%${nameParts[0]}%`);
    } else if (nameParts.length === 1) {
      query += ` OR first_name LIKE ? OR last_name LIKE ?`;
      params.push(`%${nameParts[0]}%`, `%${nameParts[0]}%`);
    }

    const [employees] = await pool.execute(query + ' LIMIT 1', params);
    if (employees.length === 0) return null;
    report.employee = employees[0];
    const eid = report.employee.id;

    // Paiements de salaire
    const [salaries] = await pool.execute(
      `SELECT payment_month, payment_year, gross_salary, net_salary, deductions, bonuses, status, payment_date
       FROM salary_payments WHERE employee_id = ? ORDER BY payment_year DESC, payment_month DESC LIMIT 12`,
      [eid]
    );
    report.salaries = salaries;

    // Avances
    const [advances] = await pool.execute(
      `SELECT amount, reason, request_date, status, repayment_date
       FROM salary_advances WHERE employee_id = ? ORDER BY request_date DESC LIMIT 10`,
      [eid]
    );
    report.advances = advances;

    // Stats
    const [stats] = await pool.execute(
      `SELECT COALESCE(SUM(net_salary),0) as total_verse, COUNT(*) as nb_bulletins
       FROM salary_payments WHERE employee_id = ? AND status = 'paid'`,
      [eid]
    );
    report.stats = stats[0];

    const [advStats] = await pool.execute(
      `SELECT COALESCE(SUM(amount),0) as total_avances, COUNT(*) as nb_avances
       FROM salary_advances WHERE employee_id = ? AND status IN ('approved','paid')`,
      [eid]
    );
    report.stats.avances = advStats[0];

  } catch (err) {
    console.error('Erreur rapport employé:', err.message);
    return null;
  }

  return report;
}

// ============================================================
//  GÉNÉRER UN RAPPORT SUR UN FOURNISSEUR
// ============================================================
async function generateSupplierReport(supplierId, supplierName) {
  const report = { supplier: null, orders: [], stats: {} };

  try {
    const [suppliers] = await pool.execute(
      `SELECT * FROM suppliers WHERE id = ? OR name LIKE ? LIMIT 1`,
      [supplierId || '', `%${supplierName}%`]
    );
    if (suppliers.length === 0) return null;
    report.supplier = suppliers[0];
    const sid = report.supplier.id;

    // Commandes
    const [orders] = await pool.execute(
      `SELECT order_number, order_date, expected_delivery_date, total_amount, status
       FROM purchase_orders WHERE supplier_id = ? ORDER BY order_date DESC LIMIT 20`,
      [sid]
    );
    report.orders = orders;

    // Stats
    const [stats] = await pool.execute(
      `SELECT COUNT(*) as total_commandes, COALESCE(SUM(total_amount),0) as montant_total
       FROM purchase_orders WHERE supplier_id = ?`,
      [sid]
    );
    report.stats = stats[0];

  } catch (err) {
    return null;
  }

  return report;
}

// ============================================================
//  GÉNÉRER UN RAPPORT SUR UN PROJET
// ============================================================
async function generateProjectReport(projectId, projectName) {
  const report = { project: null, sales: [], movements: [], stats: {} };

  try {
    const [projects] = await pool.execute(
      `SELECT * FROM projects WHERE id = ? OR name LIKE ? OR code LIKE ? LIMIT 1`,
      [projectId || '', `%${projectName}%`, `%${projectName}%`]
    );
    if (projects.length === 0) return null;
    report.project = projects[0];
    const pid = report.project.id;

    // Ventes liées
    try {
      const [sales] = await pool.execute(
        `SELECT sale_number, sale_date, total_amount, payment_status, client_name
         FROM sales WHERE destination LIKE ? ORDER BY sale_date DESC LIMIT 20`,
        [`%${report.project.location}%`]
      );
      report.sales = sales;
    } catch {}

    // Mouvements de caisse
    try {
      const [movements] = await pool.execute(
        `SELECT date, type, category, description, amount
         FROM cash_movements WHERE project_id = ? ORDER BY date DESC LIMIT 20`,
        [pid]
      );
      report.movements = movements;
    } catch {}

    // Stats
    report.stats = {
      budget: report.project.budget_prevu || 0,
      duree: report.project.date_debut && report.project.date_fin_prevue ?
        Math.ceil((new Date(report.project.date_fin_prevue) - new Date(report.project.date_debut)) / (1000*60*60*24)) : 'N/A'
    };

  } catch (err) {
    return null;
  }

  return report;
}

// ============================================================
//  GÉNÉRER UN RAPPORT SUR UN PARTENAIRE
// ============================================================
async function generatePartnerReport(partnerId, partnerName) {
  const report = { partner: null, contracts: [], payments: [], stats: {} };

  try {
    const [partners] = await pool.execute(
      `SELECT * FROM partners WHERE id = ? OR name LIKE ? LIMIT 1`,
      [partnerId || '', `%${partnerName}%`]
    );
    if (partners.length === 0) return null;
    report.partner = partners[0];
    const pid = report.partner.id;

    // Contrats
    const [contracts] = await pool.execute(
      `SELECT label, invested_amount, monthly_return, start_date, end_date, status, total_paid
       FROM partner_contracts WHERE partner_id = ? ORDER BY start_date DESC`,
      [pid]
    );
    report.contracts = contracts;

    // Paiements
    const [payments] = await pool.execute(
      `SELECT payment_date, amount, payment_method, month_label
       FROM partner_payments WHERE partner_id = ? ORDER BY payment_date DESC LIMIT 12`,
      [pid]
    );
    report.payments = payments;

    // Stats
    report.stats = {
      total_investi: contracts.reduce((sum, c) => sum + Number(c.invested_amount || 0), 0),
      total_verse: contracts.reduce((sum, c) => sum + Number(c.total_paid || 0), 0),
      contrats_actifs: contracts.filter(c => c.status === 'actif').length
    };

  } catch (err) {
    return null;
  }

  return report;
}

// ============================================================
//  FORMATER UN RAPPORT CLIENT
// ============================================================
function formatClientReport(report) {
  const c = report.client;
  let answer = `📋 **RAPPORT COMPLET — ${c.name || c.company}**\n\n`;

  // Infos de base
  answer += `👤 **Informations client**\n`;
  answer += `• Nom : **${c.name}**\n`;
  if (c.company) answer += `• Entreprise : ${c.company}\n`;
  answer += `• Téléphone : ${c.phone || 'N/A'}\n`;
  answer += `• Email : ${c.email || 'N/A'}\n`;
  answer += `• Ville : ${c.city || 'N/A'}\n`;
  answer += `• Type : ${c.customer_type || 'simple'}\n`;
  answer += `• Statut : ${c.status === 'actif' || c.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}\n`;

  // Soldes
  answer += `\n💰 **Situation financière**\n`;
  answer += `• Solde actuel : **${fmt(c.current_balance || 0)} FCFA**\n`;
  answer += `• Solde prépayé : **${fmt(c.prepaid_balance || 0)} FCFA**\n`;
  answer += `• Limite crédit : ${fmt(c.credit_limit || 0)} FCFA\n`;

  // Stats
  const s = report.stats;
  answer += `\n📊 **Statistiques globales**\n`;
  answer += `• Total ventes : **${s.total_ventes}** transactions\n`;
  answer += `• CA total : **${fmt(s.ca_total)} FCFA**\n`;
  answer += `• Tonnage total : **${Number(s.tonnage_total || 0).toFixed(1)}** tonnes\n`;
  answer += `• Panier moyen : **${fmt(s.panier_moyen)} FCFA**\n`;

  if (s.impayes && s.impayes.nb > 0) {
    answer += `\n⚠️ **Impayés** : ${s.impayes.nb} factures pour **${fmt(s.impayes.montant)} FCFA**\n`;
  }

  // Dernières ventes
  if (report.sales.length > 0) {
    answer += `\n🛒 **Dernières ventes** (${report.sales.length})\n`;
    report.sales.slice(0, 5).forEach((v, i) => {
      const date = fmtDate(v.sale_date);
      const status = v.payment_status === 'paid' ? '✅' : v.payment_status === 'partial' ? '🟡' : '🔴';
      answer += `${i+1}. ${status} ${date} — ${fmt(v.total_amount)} FCFA (${v.type_beton || 'Béton'})\n`;
    });
    if (report.sales.length > 5) {
      answer += `   ... et ${report.sales.length - 5} autres ventes\n`;
    }
  }

  // Dépôts
  if (report.deposits && report.deposits.length > 0) {
    answer += `\n💳 **Dépôts récents** (${report.deposits.length})\n`;
    report.deposits.slice(0, 3).forEach((d, i) => {
      answer += `${i+1}. ${fmtDate(d.created_at)} — **${fmt(d.amount)} FCFA** (${d.payment_method})\n`;
    });
  }

  // Quotas
  if (report.quotas && report.quotas.length > 0) {
    answer += `\n📦 **Quotas actifs** (${report.quotas.length})\n`;
    report.quotas.slice(0, 3).forEach((q, i) => {
      const reste = Number(q.quota_initial) - Number(q.quota_consumed);
      answer += `${i+1}. ${q.product_type} — ${reste}/${q.quota_initial} restant\n`;
    });
  }

  // Projets
  if (report.projects && report.projects.length > 0) {
    answer += `\n🏗️ **Projets/Chantiers** (${report.projects.length})\n`;
    report.projects.slice(0, 3).forEach((p, i) => {
      answer += `${i+1}. **${p.name}** — ${p.location || 'N/A'} [${p.status}]\n`;
    });
  }

  return answer;
}

// ============================================================
//  FORMATER UN RAPPORT EMPLOYÉ
// ============================================================
function formatEmployeeReport(report) {
  const e = report.employee;
  let answer = `📋 **RAPPORT COMPLET — ${e.first_name} ${e.last_name}**\n\n`;

  // Infos de base
  answer += `👤 **Informations employé**\n`;
  answer += `• Nom complet : **${e.first_name} ${e.last_name}**\n`;
  answer += `• Matricule : ${e.employee_number || 'N/A'}\n`;
  answer += `• Poste : **${e.position || 'N/A'}**\n`;
  answer += `• Département : ${e.department || 'N/A'}\n`;
  answer += `• Téléphone : ${e.phone || 'N/A'}\n`;
  answer += `• Email : ${e.email || 'N/A'}\n`;
  answer += `• Type contrat : ${e.contract_type || 'CDI'}\n`;
  if (e.hire_date) {
    answer += `• Date embauche : ${fmtDate(e.hire_date)}\n`;
  }
  answer += `• Statut : ${e.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}\n`;

  // Salaire
  answer += `\n💰 **Rémunération**\n`;
  answer += `• Salaire de base : **${fmt(e.base_salary || 0)} FCFA**/mois\n`;
  if (e.transport_allowance) answer += `• Prime transport : ${fmt(e.transport_allowance)} FCFA\n`;
  if (e.housing_allowance) answer += `• Prime logement : ${fmt(e.housing_allowance)} FCFA\n`;
  answer += `• Total versé : **${fmt(report.stats.total_verse || 0)} FCFA**\n`;
  answer += `• Bulletins émis : ${report.stats.nb_bulletins || 0}\n`;

  // Avances
  if (report.stats.avances) {
    answer += `\n📝 **Avances sur salaire**\n`;
    answer += `• Total avances : **${fmt(report.stats.avances.total_avances || 0)} FCFA**\n`;
    answer += `• Nombre : ${report.stats.avances.nb_avances || 0}\n`;
  }

  // Derniers bulletins
  if (report.salaries.length > 0) {
    answer += `\n📄 **Derniers bulletins de paie**\n`;
    report.salaries.slice(0, 6).forEach((s, i) => {
      const status = s.status === 'paid' ? '✅' : '⏳';
      answer += `${i+1}. ${status} ${s.payment_month}/${s.payment_year} — Net: **${fmt(s.net_salary)} FCFA**\n`;
    });
  }

  // Avances détaillées
  if (report.advances.length > 0) {
    answer += `\n💸 **Avances récentes**\n`;
    report.advances.slice(0, 3).forEach((a, i) => {
      const status = a.status === 'approved' ? '✅' : a.status === 'pending' ? '⏳' : '❌';
      answer += `${i+1}. ${status} ${fmtDate(a.request_date)} — **${fmt(a.amount)} FCFA** (${a.reason || 'N/A'})\n`;
    });
  }

  return answer;
}

// ============================================================
//  FORMATER UN RAPPORT PROJET
// ============================================================
function formatProjectReport(report) {
  const p = report.project;
  let answer = `📋 **RAPPORT PROJET — ${p.name}**\n\n`;

  answer += `🏗️ **Informations projet**\n`;
  answer += `• Nom : **${p.name}**\n`;
  answer += `• Code : ${p.code || 'N/A'}\n`;
  answer += `• Client : ${p.client || 'N/A'}\n`;
  answer += `• Localisation : ${p.location || 'N/A'}\n`;
  answer += `• Responsable : ${p.responsable || 'N/A'}\n`;
  answer += `• Statut : ${p.status === 'actif' ? '🟢 Actif' : p.status === 'termine' ? '✅ Terminé' : '🔴 ' + p.status}\n`;

  answer += `\n📅 **Calendrier**\n`;
  answer += `• Début : ${fmtDate(p.date_debut)}\n`;
  answer += `• Fin prévue : ${fmtDate(p.date_fin_prevue)}\n`;
  if (p.date_fin_reelle) answer += `• Fin réelle : ${fmtDate(p.date_fin_reelle)}\n`;

  answer += `\n💰 **Budget**\n`;
  answer += `• Budget prévu : **${fmt(p.budget_prevu || 0)} FCFA**\n`;

  if (report.sales.length > 0) {
    const totalVentes = report.sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    answer += `\n🛒 **Ventes liées** (${report.sales.length})\n`;
    answer += `• Total : **${fmt(totalVentes)} FCFA**\n`;
    report.sales.slice(0, 3).forEach((s, i) => {
      answer += `${i+1}. ${fmtDate(s.sale_date)} — ${fmt(s.total_amount)} FCFA (${s.client_name || 'N/A'})\n`;
    });
  }

  return answer;
}

// ============================================================
//  FORMATER UN RAPPORT PARTENAIRE
// ============================================================
function formatPartnerReport(report) {
  const p = report.partner;
  let answer = `📋 **RAPPORT PARTENAIRE — ${p.name}**\n\n`;

  answer += `👤 **Informations partenaire**\n`;
  answer += `• Nom : **${p.name}**\n`;
  if (p.company) answer += `• Société : ${p.company}\n`;
  answer += `• Téléphone : ${p.phone || 'N/A'}\n`;
  answer += `• Email : ${p.email || 'N/A'}\n`;
  answer += `• Statut : ${p.is_active ? '🟢 Actif' : '🔴 Inactif'}\n`;

  answer += `\n💰 **Investissements**\n`;
  answer += `• Total investi : **${fmt(report.stats.total_investi)} FCFA**\n`;
  answer += `• Total versé : **${fmt(report.stats.total_verse)} FCFA**\n`;
  answer += `• Contrats actifs : ${report.stats.contrats_actifs}\n`;

  if (report.contracts.length > 0) {
    answer += `\n📄 **Contrats**\n`;
    report.contracts.forEach((c, i) => {
      const status = c.status === 'actif' ? '🟢' : '⏹️';
      answer += `${i+1}. ${status} **${c.label}** — ${fmt(c.invested_amount)} FCFA | Rendement: ${fmt(c.monthly_return)}/mois\n`;
    });
  }

  if (report.payments.length > 0) {
    answer += `\n💸 **Derniers paiements**\n`;
    report.payments.slice(0, 5).forEach((p, i) => {
      answer += `${i+1}. ${fmtDate(p.payment_date)} — **${fmt(p.amount)} FCFA** (${p.month_label || p.payment_method})\n`;
    });
  }

  return answer;
}

// ============================================================
//  FONCTION PRINCIPALE — RECHERCHE INTELLIGENTE
// ============================================================
async function intelligentSearch(question) {
  const searchTerms = extractSearchTerms(question);
  const targetTable = detectTargetTable(question);
  const lower = question.toLowerCase();

  // Détecter si c'est une demande de liste complète
  const isListRequest = /^(liste|lister|affiche|afficher|montre|montrer|voir|donne|donner|quels?|quelles?|qui sont|mes|tous les|toutes les)\s/i.test(lower) ||
                        /liste\s+(des?|les?|mes?)/i.test(lower) ||
                        /combien\s+(de|d')/i.test(lower) ||
                        /(montre|affiche|donne|voir).*(les|mes|des|tous|toutes)/i.test(lower) ||
                        /(dernièr|recent|récent)/i.test(lower);

  // Si c'est une demande de liste et qu'on a une table cible sans terme de recherche spécifique
  if (isListRequest && targetTable && searchTerms.length === 0) {
    console.log('📋 Demande de liste détectée pour:', targetTable.table);
    const rows = await listAllFromTable(targetTable.table, targetTable.config);
    return formatListResponse(targetTable.table, targetTable.config, rows);
  }

  // Si la demande contient des mots génériques
  const hasOnlyGenericTerms = searchTerms.length > 0 && searchTerms.every(term =>
    STOP_WORDS.has(term.toLowerCase()) ||
    /^(dernièr|récent|recent|tous|toutes|les|des|mes)$/i.test(term)
  );

  if (isListRequest && targetTable && hasOnlyGenericTerms) {
    console.log('📋 Demande de liste (termes génériques) pour:', targetTable.table);
    const rows = await listAllFromTable(targetTable.table, targetTable.config);
    return formatListResponse(targetTable.table, targetTable.config, rows);
  }

  // Détecter si c'est une demande de rapport
  const isReportRequest = /rapport|fiche|profil|détail|info|tout sur|donne.*moi|dis.*moi|parle.*moi|c'est qui|qui est/i.test(lower);

  // Si pas de termes de recherche, essayer d'extraire les mots significatifs
  if (searchTerms.length === 0) {
    const words = question.split(/\s+/).filter(w =>
      w.length > 3 &&
      !STOP_WORDS.has(w.toLowerCase()) &&
      !/^(sur|les|des|pour|avec|dans)$/i.test(w)
    );
    searchTerms.push(...words);
  }

  // Si toujours pas de termes mais on a une table cible, lister tout
  if (searchTerms.length === 0 && targetTable) {
    console.log('📋 Listing de la table:', targetTable.table);
    const rows = await listAllFromTable(targetTable.table, targetTable.config);
    return formatListResponse(targetTable.table, targetTable.config, rows);
  }

  if (searchTerms.length === 0) {
    return null; // Pas de terme de recherche et pas de table cible
  }

  console.log('🔍 Recherche intelligente:', searchTerms, '| Table cible:', targetTable?.table || 'toutes');

  // Recherche ciblée ou globale
  let results;
  if (targetTable) {
    const tableResults = await searchInTable(targetTable.table, targetTable.config, searchTerms);
    if (tableResults.length > 0) {
      results = { [targetTable.table]: { label: targetTable.config.label, results: tableResults, displayFields: targetTable.config.displayFields } };
    }
  }

  if (!results || Object.keys(results).length === 0) {
    results = await searchGlobal(searchTerms);
  }

  if (!results || Object.keys(results).length === 0) {
    return {
      answer: `🔍 Je n'ai trouvé aucun résultat pour "${searchTerms.join(', ')}" dans la base de données.\n\n💡 Essayez avec un autre nom, numéro de téléphone, email, ou reformulez votre question.`,
      data: null,
      chartType: null
    };
  }

  // Si c'est une demande de rapport et qu'on a trouvé un seul résultat
  if (isReportRequest) {
    // Rapport client
    if (results.customers && results.customers.results.length === 1) {
      const client = results.customers.results[0];
      const report = await generateClientReport(client.id, client.name);
      if (report) {
        return { answer: formatClientReport(report), data: report, chartType: null };
      }
    }

    // Rapport employé
    if (results.employees && results.employees.results.length === 1) {
      const emp = results.employees.results[0];
      const report = await generateEmployeeReport(emp.id, `${emp.first_name} ${emp.last_name}`);
      if (report) {
        return { answer: formatEmployeeReport(report), data: report, chartType: null };
      }
    }

    // Rapport fournisseur
    if (results.suppliers && results.suppliers.results.length === 1) {
      const sup = results.suppliers.results[0];
      const report = await generateSupplierReport(sup.id, sup.name);
      if (report) {
        let answer = `📋 **RAPPORT — ${sup.name}**\n\n`;
        answer += `📦 **Fournisseur**\n`;
        answer += `• Nom : **${sup.name}**\n`;
        answer += `• Contact : ${sup.contact_person || 'N/A'}\n`;
        answer += `• Téléphone : ${sup.phone || 'N/A'}\n`;
        answer += `• Email : ${sup.email || 'N/A'}\n`;
        if (report.stats) {
          answer += `\n📊 **Statistiques**\n`;
          answer += `• Commandes : ${report.stats.total_commandes}\n`;
          answer += `• Montant total : **${fmt(report.stats.montant_total)} FCFA**\n`;
        }
        return { answer, data: report, chartType: null };
      }
    }

    // Rapport projet
    if (results.projects && results.projects.results.length === 1) {
      const proj = results.projects.results[0];
      const report = await generateProjectReport(proj.id, proj.name);
      if (report) {
        return { answer: formatProjectReport(report), data: report, chartType: null };
      }
    }

    // Rapport partenaire
    if (results.partners && results.partners.results.length === 1) {
      const partner = results.partners.results[0];
      const report = await generatePartnerReport(partner.id, partner.name);
      if (report) {
        return { answer: formatPartnerReport(report), data: report, chartType: null };
      }
    }
  }

  // Sinon, afficher les résultats de recherche
  let answer = `🔍 **Résultats de recherche** pour "${searchTerms.join(', ')}"\n\n`;

  for (const [tableName, tableData] of Object.entries(results)) {
    const count = tableData.results.length;
    answer += `📁 **${tableData.label}** (${count} résultat${count > 1 ? 's' : ''})\n`;

    tableData.results.slice(0, 5).forEach((row, i) => {
      // Afficher les champs principaux
      const displayValues = [];
      for (const field of tableData.displayFields.slice(0, 4)) {
        if (row[field] !== undefined && row[field] !== null) {
          let val = row[field];
          // Formater les montants
          if (field.includes('amount') || field.includes('salary') || field.includes('balance') || field.includes('budget') || field.includes('price') || field.includes('total')) {
            val = fmt(val) + ' FCFA';
          }
          // Formater les dates
          if (field.includes('date') && val) {
            val = fmtDate(val);
          }
          displayValues.push(val);
        }
      }
      answer += `${i+1}. ${displayValues.join(' | ')}\n`;
    });

    if (count > 5) {
      answer += `   ... et ${count - 5} autres\n`;
    }
    answer += '\n';
  }

  answer += `💡 *Pour un rapport complet, demandez "rapport sur [nom]" ou "fiche de [nom]"*`;

  return { answer, data: results, chartType: null };
}

module.exports = {
  intelligentSearch,
  generateClientReport,
  generateEmployeeReport,
  generateSupplierReport,
  generateProjectReport,
  generatePartnerReport,
  extractSearchTerms,
  detectTargetTable,
  listAllFromTable,
  DB_TABLES,
  STOP_WORDS
};
