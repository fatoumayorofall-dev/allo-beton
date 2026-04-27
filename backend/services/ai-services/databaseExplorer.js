// ============================================================
//  DATABASE EXPLORER v1.0 — Exploration dynamique de la BDD
//  Parcourt les 52 tables de allo_beton, génère des requêtes SQL
//  sécurisées, et renvoie les résultats formatés en langage naturel.
// ============================================================
const { pool } = require('../../config/database');

// ============================================================
//  SCHÉMA COMPLET DE LA BASE DE DONNÉES (52 tables)
// ============================================================
const DB_SCHEMA = {
  // --- VENTES ---
  sales: {
    label: 'Ventes',
    description: 'Transactions de vente (béton, carrière, etc.)',
    columns: ['id','user_id','customer_id','sale_number','status','sale_date','due_date','subtotal','tax_rate','tax_amount','discount_amount','shipping_amount','total_amount','payment_status','payment_method','source','created_by','notes','shipping_address','vehicle_plate','driver_name','product_type','loading_location','destination','discharge_time','weight_loaded','camion','type_beton','client_name','sale_type'],
    searchable: ['sale_number','client_name','driver_name','vehicle_plate','destination','type_beton','camion','notes','product_type'],
    numeric: ['total_amount','subtotal','tax_amount','discount_amount','shipping_amount','weight_loaded'],
    dates: ['sale_date','due_date','discharge_time','created_at'],
    enums: { status: ['draft','confirmed','shipped','delivered','cancelled'], payment_status: ['pending','partial','paid','overdue'], source: ['counter','phone','online','api'], sale_type: ['cash'] }
  },
  sale_items: {
    label: 'Détails des ventes',
    description: 'Lignes de détail de chaque vente',
    columns: ['id','sale_id','product_id','quantity','unit_price','discount_percentage','tax_rate','line_total'],
    searchable: [],
    numeric: ['quantity','unit_price','discount_percentage','line_total'],
    dates: ['created_at'],
    joins: { sale_id: 'sales.id', product_id: 'products.id' }
  },
  // --- CLIENTS ---
  customers: {
    label: 'Clients',
    description: 'Base clients avec coordonnées, type, solde prépayé, GPS',
    columns: ['id','user_id','name','email','phone','address','city','postal_code','country','company','tax_number','payment_terms','status','notes','created_at','updated_at','customer_type','prepaid_balance','credit_limit','current_balance','wholesale_discount','is_reseller','tva_exempt','responsable_commercial','gps_lat','gps_lng'],
    searchable: ['name','email','phone','company','city','address','notes'],
    numeric: ['prepaid_balance','credit_limit','current_balance','wholesale_discount','payment_terms'],
    dates: ['created_at','updated_at'],
    enums: { status: ['actif','inactif'], customer_type: ['occasionnel','simple','quotataire','revendeur'] }
  },
  client_deposits: {
    label: 'Dépôts clients',
    description: 'Acomptes et prépaiements des clients',
    columns: ['id','customer_id','user_id','amount','payment_method','reference','notes','deposit_date','status','created_at'],
    searchable: ['reference','notes'],
    numeric: ['amount'],
    dates: ['deposit_date','created_at'],
    joins: { customer_id: 'customers.id' }
  },
  client_quotas: {
    label: 'Quotas clients',
    description: 'Allocations et dotations de produits par client',
    columns: ['id','customer_id','product_id','user_id','allocated_quantity','consumed_quantity','remaining_quantity','period_start','period_end','status','notes','created_at'],
    searchable: ['notes'],
    numeric: ['allocated_quantity','consumed_quantity','remaining_quantity'],
    dates: ['period_start','period_end','created_at'],
    joins: { customer_id: 'customers.id', product_id: 'products.id' }
  },
  quota_consumptions: {
    label: 'Consommation de quotas',
    description: 'Historique de consommation des quotas',
    columns: ['id','quota_id','sale_id','quantity','consumed_at','notes'],
    numeric: ['quantity'],
    dates: ['consumed_at']
  },
  // --- PRODUITS ---
  products: {
    label: 'Produits',
    description: 'Catalogue produits (béton, carrière, etc.)',
    columns: ['id','user_id','name','description','sku','barcode','category_id','supplier_id','cost_price','selling_price','tax_rate','unit','weight','dimensions','image_url','status','is_tracked','product_type','variant'],
    searchable: ['name','description','sku','barcode','variant'],
    numeric: ['cost_price','selling_price','tax_rate','weight'],
    dates: ['created_at','updated_at'],
    enums: { status: ['active','inactive','discontinued'], product_type: ['beton','carriere','autre'] },
    joins: { category_id: 'categories.id', supplier_id: 'suppliers.id' }
  },
  categories: {
    label: 'Catégories',
    description: 'Catégories de produits',
    columns: ['id','user_id','name','description','parent_id','color','icon','sort_order','is_active'],
    searchable: ['name','description']
  },
  // --- STOCK ---
  inventory_items: {
    label: 'Inventaire',
    description: 'Niveaux de stock par produit',
    columns: ['id','user_id','product_id','quantity','reserved_quantity','min_stock_level','max_stock_level','reorder_point','location','last_counted_at','last_received_at'],
    searchable: ['location'],
    numeric: ['quantity','reserved_quantity','min_stock_level','max_stock_level','reorder_point'],
    dates: ['last_counted_at','last_received_at','created_at'],
    joins: { product_id: 'products.id' }
  },
  stock_movements: {
    label: 'Mouvements de stock',
    description: 'Entrées/sorties de stock',
    columns: ['id','user_id','product_id','movement_type','quantity','reference_type','reference_id','notes','unit_cost','supplier_name','reference_number','previous_stock','new_stock'],
    searchable: ['notes','supplier_name','reference_number'],
    numeric: ['quantity','unit_cost','previous_stock','new_stock'],
    dates: ['created_at'],
    enums: { movement_type: ['in','out','adjustment'], reference_type: ['sale','purchase','adjustment','return'] },
    joins: { product_id: 'products.id' }
  },
  // --- FOURNISSEURS ---
  suppliers: {
    label: 'Fournisseurs',
    description: 'Base fournisseurs',
    columns: ['id','user_id','name','email','phone','address','city','postal_code','country','contact_person','tax_number','payment_terms','status','notes','rating'],
    searchable: ['name','email','phone','city','contact_person','address','notes'],
    numeric: ['payment_terms','rating'],
    dates: ['created_at','updated_at'],
    enums: { status: ['active','inactive'] }
  },
  supplier_products: {
    label: 'Produits fournisseurs',
    description: 'Liaison produits-fournisseurs',
    columns: ['id','supplier_id','product_name'],
    searchable: ['product_name'],
    joins: { supplier_id: 'suppliers.id' }
  },
  // --- ACHATS ---
  purchase_orders: {
    label: 'Bons de commande',
    description: 'Commandes fournisseurs',
    columns: ['id','user_id','supplier_id','order_number','status','order_date','expected_delivery_date','subtotal','tax_amount','total_amount','notes'],
    searchable: ['order_number','notes'],
    numeric: ['subtotal','tax_amount','total_amount'],
    dates: ['order_date','expected_delivery_date','created_at'],
    enums: { status: ['draft','sent','confirmed','received','cancelled'] },
    joins: { supplier_id: 'suppliers.id' }
  },
  purchase_order_items: {
    label: 'Détails commandes',
    description: 'Lignes de détail commandes fournisseurs',
    columns: ['id','purchase_order_id','product_name','product_id','quantity','unit_cost','received_quantity','line_total'],
    searchable: ['product_name'],
    numeric: ['quantity','unit_cost','received_quantity','line_total'],
    joins: { purchase_order_id: 'purchase_orders.id', product_id: 'products.id' }
  },
  // --- FACTURES ---
  invoices: {
    label: 'Factures',
    description: 'Factures clients avec détails entreprise',
    columns: ['id','user_id','invoice_number','customer_id','invoice_date','due_date','status','subtotal','tax_rate','tax_amount','total_amount','notes','company_name','company_rc','company_ninea','company_phone','company_email','company_address'],
    searchable: ['invoice_number','notes','company_name','company_email'],
    numeric: ['subtotal','tax_rate','tax_amount','total_amount'],
    dates: ['invoice_date','due_date','created_at'],
    enums: { status: ['draft','sent','paid','cancelled'] },
    joins: { customer_id: 'customers.id' }
  },
  invoice_items: {
    label: 'Détails factures',
    description: 'Lignes de détail factures',
    columns: ['id','invoice_id','description','quantity','unit','unit_price','line_total'],
    searchable: ['description','unit'],
    numeric: ['quantity','unit_price','line_total'],
    joins: { invoice_id: 'invoices.id' }
  },
  // --- PAIEMENTS ---
  payments: {
    label: 'Paiements',
    description: 'Paiements reçus',
    columns: ['id','user_id','sale_id','payment_number','amount','payment_method','payment_date','reference_number','status','notes'],
    searchable: ['payment_number','reference_number','notes'],
    numeric: ['amount'],
    dates: ['payment_date','created_at'],
    enums: { payment_method: ['cash','card','bank_transfer','check','online'], status: ['pending','completed','failed','refunded'] },
    joins: { sale_id: 'sales.id' }
  },
  // --- CAISSE ---
  cash_balance: {
    label: 'Solde caisse',
    description: 'Solde actuel de la caisse',
    columns: ['id','user_id','balance','last_updated'],
    numeric: ['balance'],
    dates: ['last_updated']
  },
  cash_movements: {
    label: 'Mouvements de caisse',
    description: 'Entrées et sorties de caisse',
    columns: ['id','date','type','category','description','amount','payment_method','reference','account_number','created_by','created_at','updated_at','decaisseur','encaisseur','project_id'],
    searchable: ['description','reference','category','decaisseur','encaisseur'],
    numeric: ['amount'],
    dates: ['date','created_at'],
    enums: { type: ['recette','depense'] }
  },
  // --- BANQUE ---
  banks: {
    label: 'Banques',
    description: 'Comptes bancaires de la société',
    columns: ['id','name','code','address','swift_code','is_active'],
    searchable: ['name','code','swift_code']
  },
  bank_accounts: {
    label: 'Comptes bancaires',
    description: 'Détails des comptes en banque',
    columns: ['id','bank_id','account_name','account_number','iban','currency','balance','account_type','is_default','is_active'],
    searchable: ['account_name','account_number','iban'],
    numeric: ['balance'],
    joins: { bank_id: 'banks.id' }
  },
  bank_loans: {
    label: 'Prêts bancaires',
    description: 'Emprunts et crédits bancaires',
    columns: ['id','bank_account_id','loan_number','loan_type','amount','interest_rate','duration_months','monthly_payment','start_date','end_date','remaining_balance','status','notes'],
    searchable: ['loan_number','notes'],
    numeric: ['amount','interest_rate','monthly_payment','remaining_balance'],
    dates: ['start_date','end_date'],
    enums: { status: ['active','completed','defaulted'] },
    joins: { bank_account_id: 'bank_accounts.id' }
  },
  bank_loan_schedules: {
    label: 'Échéanciers prêts',
    description: 'Calendrier de remboursement des prêts',
    columns: ['id','loan_id','due_date','principal_amount','interest_amount','total_amount','paid_amount','status','paid_at'],
    numeric: ['principal_amount','interest_amount','total_amount','paid_amount'],
    dates: ['due_date','paid_at'],
    joins: { loan_id: 'bank_loans.id' }
  },
  // --- EMPLOYÉS & SALAIRES ---
  employees: {
    label: 'Employés',
    description: 'Base du personnel',
    columns: ['id','user_id','employee_number','first_name','last_name','email','phone','address','position','department','hire_date','contract_type','base_salary','transport_allowance','housing_allowance','rib','bank_name','status','notes'],
    searchable: ['first_name','last_name','email','phone','position','department','employee_number'],
    numeric: ['base_salary','transport_allowance','housing_allowance'],
    dates: ['hire_date','created_at'],
    enums: { contract_type: ['CDI','CDD','Stage','Intérim','Journalier'], status: ['active','inactive','suspended'] }
  },
  salary_payments: {
    label: 'Bulletins de salaire',
    description: 'Paiements de salaires mensuels',
    columns: ['id','employee_id','payment_month','payment_year','base_salary','transport_allowance','housing_allowance','bonuses','bonus_description','deductions','deduction_description','advance_deducted','gross_salary','net_salary','payment_date','payment_method','status','notes'],
    searchable: ['bonus_description','deduction_description','notes'],
    numeric: ['base_salary','transport_allowance','housing_allowance','bonuses','deductions','advance_deducted','gross_salary','net_salary'],
    dates: ['payment_date'],
    enums: { payment_method: ['virement','espèces','chèque','mobile_money'], status: ['draft','paid','cancelled'] },
    joins: { employee_id: 'employees.id' }
  },
  salary_advances: {
    label: 'Avances sur salaire',
    description: 'Demandes d\'avances des employés',
    columns: ['id','employee_id','amount','reason','request_date','payment_date','status','repayment_type','repayment_months','monthly_deduction','repaid_amount','notes'],
    searchable: ['reason','notes'],
    numeric: ['amount','monthly_deduction','repaid_amount'],
    dates: ['request_date','payment_date'],
    enums: { status: ['pending','approved','rejected','repaid'], repayment_type: ['one_shot','monthly'] },
    joins: { employee_id: 'employees.id' }
  },
  // --- PARTENAIRES ---
  partners: {
    label: 'Partenaires',
    description: 'Investisseurs et partenaires commerciaux',
    columns: ['id','name','company','phone','email','address','id_number','notes','is_active'],
    searchable: ['name','company','phone','email','address']
  },
  partner_contracts: {
    label: 'Contrats partenaires',
    description: 'Contrats d\'investissement partenaires',
    columns: ['id','partner_id','label','description','invested_amount','monthly_return','duration_months','start_date','end_date','total_expected_return','total_paid','remaining_to_pay','status','notes'],
    searchable: ['label','description','notes'],
    numeric: ['invested_amount','monthly_return','total_expected_return','total_paid','remaining_to_pay'],
    dates: ['start_date','end_date'],
    enums: { status: ['actif','termine','suspendu','annule'] },
    joins: { partner_id: 'partners.id' }
  },
  partner_payments: {
    label: 'Paiements partenaires',
    description: 'Versements aux partenaires',
    columns: ['id','contract_id','partner_id','payment_date','amount','payment_method','reference','month_label','notes'],
    searchable: ['reference','month_label','notes'],
    numeric: ['amount'],
    dates: ['payment_date'],
    joins: { contract_id: 'partner_contracts.id', partner_id: 'partners.id' }
  },
  // --- LIVRAISONS ---
  delivery_notes: {
    label: 'Bons de livraison',
    description: 'Documents de livraison',
    columns: ['id','user_id','sale_id','delivery_number','delivery_date','status','driver_name','vehicle_plate','notes','delivered_at'],
    searchable: ['delivery_number','driver_name','vehicle_plate','notes'],
    dates: ['delivery_date','delivered_at','created_at'],
    enums: { status: ['pending','in_transit','delivered','cancelled'] },
    joins: { sale_id: 'sales.id' }
  },
  // --- AVOIRS ---
  credit_notes: {
    label: 'Avoirs',
    description: 'Notes de crédit / avoirs clients',
    columns: ['id','user_id','credit_note_number','invoice_id','customer_id','credit_date','status','subtotal','tax_rate','tax_amount','total_amount','reason','notes'],
    searchable: ['credit_note_number','reason','notes'],
    numeric: ['subtotal','tax_rate','tax_amount','total_amount'],
    dates: ['credit_date','created_at'],
    joins: { invoice_id: 'invoices.id', customer_id: 'customers.id' }
  },
  credit_note_items: {
    label: 'Détails avoirs',
    description: 'Lignes de détail des avoirs',
    columns: ['id','credit_note_id','description','quantity','unit_price','line_total'],
    searchable: ['description'],
    numeric: ['quantity','unit_price','line_total'],
    joins: { credit_note_id: 'credit_notes.id' }
  },
  // --- PROJETS ---
  projects: {
    label: 'Projets / Chantiers',
    description: 'Projets de construction et chantiers',
    columns: ['id','name','code','description','client','location','status','whatsapp_group','budget_prevu','date_debut','date_fin_prevue','date_fin_reelle','responsable','notes'],
    searchable: ['name','code','client','location','responsable','description','notes'],
    numeric: ['budget_prevu'],
    dates: ['date_debut','date_fin_prevue','date_fin_reelle'],
    enums: { status: ['actif','en_pause','termine','annule'] }
  },
  // --- E-COMMERCE ---
  ecom_products: {
    label: 'Produits e-commerce',
    description: 'Catalogue boutique en ligne',
    columns: ['id','sku','name','slug','description','short_description','category_id','unit','price','compare_at_price','cost_price','tax_rate','stock_quantity','min_order_quantity','max_order_quantity','stock_status','is_featured','is_active','requires_shipping','weight','dimensions','image_url','gallery','specifications','tags','views','sales_count'],
    searchable: ['name','sku','slug','description','short_description','tags'],
    numeric: ['price','compare_at_price','cost_price','tax_rate','stock_quantity','weight','views','sales_count'],
    enums: { stock_status: ['in_stock','low_stock','out_of_stock'] },
    joins: { category_id: 'ecom_categories.id' }
  },
  ecom_categories: {
    label: 'Catégories e-commerce',
    description: 'Catégories de la boutique en ligne',
    columns: ['id','name','slug','description','parent_id','image_url','sort_order','is_active'],
    searchable: ['name','slug','description']
  },
  ecom_customers: {
    label: 'Clients e-commerce',
    description: 'Clients inscrits en ligne',
    columns: ['id','email','password_hash','first_name','last_name','phone','company','customer_type','credit_limit','current_balance','payment_terms','discount_rate','is_verified','is_active','last_login_at','notes'],
    searchable: ['email','first_name','last_name','phone','company','notes'],
    numeric: ['credit_limit','current_balance','payment_terms','discount_rate'],
    enums: { customer_type: ['individual','company','government'] }
  },
  ecom_orders: {
    label: 'Commandes e-commerce',
    description: 'Commandes passées en ligne',
    columns: ['id','order_number','customer_id','cart_id','status','payment_status','subtotal','tax_rate','tax_amount','shipping_amount','discount_amount','total','amount_paid','billing_first_name','billing_last_name','billing_company','billing_address','billing_city','billing_phone','billing_email','shipping_first_name','shipping_last_name','shipping_address','shipping_city','shipping_phone','shipping_instructions','shipping_method','customer_notes','admin_notes','source'],
    searchable: ['order_number','billing_first_name','billing_last_name','billing_company','billing_email','billing_phone','shipping_address','customer_notes'],
    numeric: ['subtotal','tax_amount','shipping_amount','discount_amount','total','amount_paid'],
    dates: ['created_at','updated_at','confirmed_at'],
    enums: { status: ['pending','confirmed','processing','ready_for_pickup','shipped','in_transit','delivered','completed','cancelled','refunded'], payment_status: ['pending','partial','paid','refunded','failed'] },
    joins: { customer_id: 'ecom_customers.id' }
  },
  ecom_order_items: {
    label: 'Détails commandes e-commerce',
    description: 'Lignes de commandes en ligne',
    columns: ['id','order_id','product_id','sku','name','description','unit','quantity','unit_price','discount_amount','tax_rate','tax_amount','subtotal','total'],
    searchable: ['sku','name','description'],
    numeric: ['quantity','unit_price','discount_amount','tax_amount','subtotal','total'],
    joins: { order_id: 'ecom_orders.id', product_id: 'ecom_products.id' }
  },
  ecom_invoices: {
    label: 'Factures e-commerce',
    description: 'Factures des commandes en ligne',
    columns: ['id','invoice_number','order_id','customer_id','type','status','subtotal','tax_rate','tax_amount','discount_amount','total','amount_paid','customer_name','customer_email','customer_phone','customer_address','issue_date','due_date','paid_at','pdf_path','notes'],
    searchable: ['invoice_number','customer_name','customer_email','customer_phone','notes'],
    numeric: ['subtotal','tax_amount','discount_amount','total','amount_paid'],
    dates: ['issue_date','due_date','paid_at'],
    enums: { type: ['invoice','proforma','credit_note'], status: ['draft','sent','paid','partial','overdue','cancelled'] },
    joins: { order_id: 'ecom_orders.id', customer_id: 'ecom_customers.id' }
  },
  ecom_invoice_items: {
    label: 'Détails factures e-commerce',
    description: 'Lignes de factures boutique en ligne',
    columns: ['id','invoice_id','order_item_id','product_id','sku','name','description','unit','quantity','unit_price','discount_amount','tax_rate','tax_amount','total'],
    searchable: ['sku','name','description'],
    numeric: ['quantity','unit_price','discount_amount','tax_amount','total'],
    joins: { invoice_id: 'ecom_invoices.id' }
  },
  ecom_payments: {
    label: 'Paiements e-commerce',
    description: 'Transactions de paiement en ligne',
    columns: ['id','order_id','customer_id','payment_number','method','provider','amount','currency','status','transaction_id','reference','ip_address','paid_at','failed_at','failure_reason'],
    searchable: ['payment_number','transaction_id','reference','failure_reason'],
    numeric: ['amount'],
    dates: ['paid_at','failed_at','created_at'],
    enums: { method: ['wave','orange_money','free_money','card','bank_transfer','cash','credit'], status: ['pending','processing','completed','failed','cancelled','refunded'] },
    joins: { order_id: 'ecom_orders.id', customer_id: 'ecom_customers.id' }
  },
  ecom_carts: {
    label: 'Paniers e-commerce',
    columns: ['id','customer_id','status','expires_at'],
    dates: ['expires_at','created_at'],
    joins: { customer_id: 'ecom_customers.id' }
  },
  ecom_cart_items: {
    label: 'Articles panier',
    columns: ['id','cart_id','product_id','quantity','unit_price'],
    numeric: ['quantity','unit_price'],
    joins: { cart_id: 'ecom_carts.id', product_id: 'ecom_products.id' }
  },
  ecom_addresses: {
    label: 'Adresses e-commerce',
    columns: ['id','customer_id','type','first_name','last_name','company','address','city','postal_code','country','phone','is_default'],
    searchable: ['first_name','last_name','company','address','city','phone'],
    joins: { customer_id: 'ecom_customers.id' }
  },
  ecom_sequences: {
    label: 'Séquences e-commerce',
    columns: ['name','prefix','current_value','padding'],
    numeric: ['current_value','padding']
  },
  // --- NOTIFICATIONS ---
  notifications: {
    label: 'Notifications',
    description: 'Notifications système',
    columns: ['id','user_id','title','message','type','data','read_status','sent_sms','sent_email'],
    searchable: ['title','message'],
    enums: { type: ['info','success','warning','error'] }
  },
  notification_preferences: {
    label: 'Préférences de notification',
    columns: ['id','user_id','event_type','notification_type','enabled'],
    enums: { notification_type: ['sms','email'] }
  },
  // --- UTILISATEURS ---
  users: {
    label: 'Utilisateurs',
    description: 'Comptes utilisateurs du système',
    columns: ['id','email','first_name','last_name','role','company','phone','avatar_url','is_active','position','bio'],
    searchable: ['email','first_name','last_name','company','phone','position'],
    enums: { role: ['admin','manager','seller','viewer'] },
    sensitive: ['password_hash'] // ne jamais exposer
  },
  user_permissions: {
    label: 'Permissions',
    description: 'Droits d\'accès par menu',
    columns: ['id','user_id','menu_id','can_create','can_read','can_update','can_delete'],
    joins: { user_id: 'users.id' }
  },
  // --- PARAMÈTRES ---
  settings: {
    label: 'Paramètres',
    description: 'Paramètres de configuration',
    columns: ['id','user_id','setting_key','setting_value','weather_city','weather_country'],
    searchable: ['setting_key','setting_value']
  },
  // --- AUDIT ---
  audit_logs: {
    label: 'Journal d\'audit',
    description: 'Historique des actions système',
    columns: ['id','user_id','action','entity_type','entity_id','old_values','new_values','ip_address','user_agent'],
    searchable: ['action','entity_type','entity_id','ip_address'],
    dates: ['created_at']
  },
  deposit_allocations: {
    label: 'Allocations de dépôts',
    description: 'Utilisation des dépôts clients sur les ventes',
    columns: ['id','deposit_id','sale_id','amount','allocated_at'],
    numeric: ['amount'],
    dates: ['allocated_at'],
    joins: { deposit_id: 'client_deposits.id', sale_id: 'sales.id' }
  }
};

// Alias de tables (noms alternatifs utilisés dans le code)
const TABLE_ALIASES = {
  mouvements_caisse: 'cash_movements',
  vente: 'sales', ventes: 'sales',
  client: 'customers', clients: 'customers',
  produit: 'products', produits: 'products',
  facture: 'invoices', factures: 'invoices',
  paiement: 'payments', paiements: 'payments',
  fournisseur: 'suppliers', fournisseurs: 'suppliers',
  employe: 'employees', employés: 'employees', employes: 'employees',
  salaire: 'salary_payments', salaires: 'salary_payments',
  commande: 'purchase_orders', commandes: 'purchase_orders',
  stock: 'inventory_items', inventaire: 'inventory_items',
  projet: 'projects', projets: 'projects', chantier: 'projects', chantiers: 'projects',
  partenaire: 'partners', partenaires: 'partners',
  contrat: 'partner_contracts', contrats: 'partner_contracts',
  livraison: 'delivery_notes', livraisons: 'delivery_notes',
  avoir: 'credit_notes', avoirs: 'credit_notes',
  utilisateur: 'users', utilisateurs: 'users',
  notification: 'notifications',
  banque: 'banks', banques: 'banks',
  pret: 'bank_loans', prêt: 'bank_loans', prêts: 'bank_loans',
  caisse: 'cash_movements',
  avance: 'salary_advances', avances: 'salary_advances',
};

// Colonnes sensibles à ne JAMAIS exposer
const SENSITIVE_COLUMNS = ['password_hash', 'password', 'token', 'secret', 'api_key'];

// ============================================================
//  FONCTIONS UTILITAIRES
// ============================================================
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));

function resolveTable(input) {
  const lower = input.toLowerCase().replace(/[^a-z_àéèêëôûùüç]/g, '');
  if (DB_SCHEMA[lower]) return lower;
  if (TABLE_ALIASES[lower]) return TABLE_ALIASES[lower];
  // Recherche partielle
  for (const [key, schema] of Object.entries(DB_SCHEMA)) {
    if (schema.label && schema.label.toLowerCase().includes(lower)) return key;
    if (schema.description && schema.description.toLowerCase().includes(lower)) return key;
  }
  return null;
}

function sanitizeValue(val) {
  if (val === null || val === undefined) return null;
  // Empêcher l'injection SQL via les valeurs
  return String(val).replace(/[;'"\\]/g, '').substring(0, 200);
}

function isColumnSafe(col) {
  return !SENSITIVE_COLUMNS.some(sc => col.toLowerCase().includes(sc));
}

// ============================================================
//  DÉTECTION DE LA TABLE ET DE L'INTENTION
// ============================================================
function detectExplorerIntent(question) {
  const lower = question.toLowerCase();
  
  // Détecter le type de requête
  let queryType = 'select'; // Par défaut : lecture
  if (/combien|nombre|count|total/i.test(lower)) queryType = 'count';
  if (/somme|sum|total.*montant|montant.*total/i.test(lower)) queryType = 'sum';
  if (/moyenne|average|avg|moy/i.test(lower)) queryType = 'avg';
  if (/max|maximum|plus (grand|élevé|cher|gros)/i.test(lower)) queryType = 'max';
  if (/min|minimum|plus (petit|bas|faible)/i.test(lower)) queryType = 'min';
  if (/liste|lister|affiche|montre|voir|show|all|tous|toutes/i.test(lower)) queryType = 'list';
  if (/cherche|recherche|trouv|search|find/i.test(lower)) queryType = 'search';
  if (/top|classement|meilleur|palmar|rang/i.test(lower)) queryType = 'top';
  if (/par (jour|mois|semaine|année|produit|client|catégorie|type)/i.test(lower)) queryType = 'group';
  if (/entre.*et|du.*au|from.*to|période|period/i.test(lower)) queryType = 'range';

  // Détecter la table cible
  let detectedTable = null;
  let confidence = 0;

  // Essayer les mots-clés un par un
  const words = lower.split(/\s+/);
  for (const word of words) {
    const resolved = resolveTable(word);
    if (resolved) {
      detectedTable = resolved;
      confidence = 0.9;
      break;
    }
  }

  // Essayer les expressions multi-mots
  if (!detectedTable) {
    const multiWordPatterns = [
      { pattern: /bon.*commande|commande.*achat/i, table: 'purchase_orders' },
      { pattern: /mouvement.*caisse|caisse.*mouvement/i, table: 'cash_movements' },
      { pattern: /mouvement.*stock/i, table: 'stock_movements' },
      { pattern: /bulletin.*salaire|fiche.*paie/i, table: 'salary_payments' },
      { pattern: /avance.*salaire/i, table: 'salary_advances' },
      { pattern: /compte.*bancaire/i, table: 'bank_accounts' },
      { pattern: /pr[eê]t.*bancaire/i, table: 'bank_loans' },
      { pattern: /bon.*livraison/i, table: 'delivery_notes' },
      { pattern: /note.*cr[eé]dit|avoir/i, table: 'credit_notes' },
      { pattern: /contrat.*partenaire/i, table: 'partner_contracts' },
      { pattern: /commande.*en.*ligne|commande.*ecommerce/i, table: 'ecom_orders' },
      { pattern: /produit.*en.*ligne|produit.*ecommerce|produit.*boutique/i, table: 'ecom_products' },
      { pattern: /quota.*client/i, table: 'client_quotas' },
      { pattern: /d[eé]p[oô]t.*client/i, table: 'client_deposits' },
      { pattern: /journal.*audit|log.*audit|historique.*action/i, table: 'audit_logs' },
    ];
    for (const { pattern, table } of multiWordPatterns) {
      if (pattern.test(lower)) {
        detectedTable = table;
        confidence = 0.85;
        break;
      }
    }
  }

  // Extraire les filtres
  const filters = extractFilters(lower);

  // Extraire un terme de recherche
  let searchTerm = null;
  const searchMatch = lower.match(/(?:cherche|recherche|trouv|find|search)\s+(?:le|la|les|un|une|des|de|du)?\s*["']?([^"']+?)["']?\s*(?:dans|parmi|sur|$)/i);
  if (searchMatch) searchTerm = searchMatch[1].trim();

  // Extraire un nom propre si mentionné
  if (!searchTerm) {
    const nameMatch = question.match(/(?:client|fournisseur|employé?|partenaire|produit)\s+["']?([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/);
    if (nameMatch) searchTerm = nameMatch[1].trim();
  }

  // Extraire limit
  let limit = 10;
  const limitMatch = lower.match(/(?:top|premiers?|derniers?)\s*(\d+)/i);
  if (limitMatch) limit = parseInt(limitMatch[1]);
  if (queryType === 'list') limit = 25;

  // Ordre de tri
  let orderBy = null;
  let orderDir = 'DESC';
  if (/plus récen|dernier|latest|newest/i.test(lower)) { orderBy = 'created_at'; orderDir = 'DESC'; }
  if (/plus ancien|premier|oldest|earliest/i.test(lower)) { orderBy = 'created_at'; orderDir = 'ASC'; }
  if (/plus (cher|élevé|gros|grand)/i.test(lower)) { orderDir = 'DESC'; }
  if (/plus (bas|petit|faible)/i.test(lower)) { orderDir = 'ASC'; }

  return {
    table: detectedTable,
    queryType,
    confidence,
    searchTerm,
    filters,
    limit,
    orderBy,
    orderDir
  };
}

function extractFilters(text) {
  const filters = {};

  // Dates
  const todayMatch = /aujourd'?hui|du jour|today/i.test(text);
  const yesterdayMatch = /hier|yesterday/i.test(text);
  const weekMatch = /cette semaine|semaine en cours|this week/i.test(text);
  const monthMatch = /ce mois|mois en cours|this month/i.test(text);
  const yearMatch = /cette année|année en cours|this year/i.test(text);
  const lastWeekMatch = /semaine derni[eè]re|last week/i.test(text);
  const lastMonthMatch = /mois dernier|last month/i.test(text);

  if (todayMatch) filters.dateFilter = 'today';
  else if (yesterdayMatch) filters.dateFilter = 'yesterday';
  else if (weekMatch) filters.dateFilter = 'this_week';
  else if (lastWeekMatch) filters.dateFilter = 'last_week';
  else if (monthMatch) filters.dateFilter = 'this_month';
  else if (lastMonthMatch) filters.dateFilter = 'last_month';
  else if (yearMatch) filters.dateFilter = 'this_year';

  // Statut
  const statusMatch = text.match(/(?:status|statut|état)\s*(?:=|:|\s)\s*['"]?(\w+)['"]?/i);
  if (statusMatch) filters.status = statusMatch[1];
  if (/\b(actif|active)\b/i.test(text)) filters.status = 'active';
  if (/\b(inactif|inactive)\b/i.test(text)) filters.status = 'inactive';
  if (/\b(pay[eé]|paid)\b/i.test(text)) filters.status = 'paid';
  if (/\b(impay[eé]|unpaid|non pay[eé])/i.test(text)) filters.paymentStatus = 'pending';
  if (/\b(annul[eé]|cancelled)\b/i.test(text)) filters.status = 'cancelled';
  if (/\b(livr[eé]|delivered)\b/i.test(text)) filters.status = 'delivered';
  if (/\b(confirm[eé]|confirmed)\b/i.test(text)) filters.status = 'confirmed';
  if (/\b(brouillon|draft)\b/i.test(text)) filters.status = 'draft';

  // Montants
  const amountMatch = text.match(/(?:plus de|supérieur à|au dessus de|>)\s*(\d[\d\s]*)/i);
  if (amountMatch) filters.amountMin = parseInt(amountMatch[1].replace(/\s/g, ''));
  const amountMaxMatch = text.match(/(?:moins de|inférieur à|en dessous de|<)\s*(\d[\d\s]*)/i);
  if (amountMaxMatch) filters.amountMax = parseInt(amountMaxMatch[1].replace(/\s/g, ''));

  return filters;
}

// ============================================================
//  GÉNÉRATION ET EXÉCUTION DE REQUÊTES SQL SÉCURISÉES
// ============================================================
async function executeExplorerQuery(intent) {
  const { table, queryType, searchTerm, filters, limit, orderBy, orderDir } = intent;
  
  if (!table || !DB_SCHEMA[table]) {
    return null;
  }

  const schema = DB_SCHEMA[table];
  const realTable = table;
  const safeCols = (schema.columns || []).filter(isColumnSafe);
  
  // Colonnes à sélectionner (max 15 pour lisibilité)
  const selectCols = safeCols.slice(0, 15).map(c => `\`${c}\``).join(', ');

  let sql = '';
  let params = [];
  let whereClauses = [];

  // Construire les filtres WHERE
  buildDateFilter(whereClauses, params, filters, schema);
  buildStatusFilter(whereClauses, params, filters, schema);
  buildAmountFilter(whereClauses, params, filters, schema);
  
  if (searchTerm && schema.searchable && schema.searchable.length > 0) {
    const searchClauses = schema.searchable.map(col => `\`${col}\` LIKE ?`);
    whereClauses.push(`(${searchClauses.join(' OR ')})`);
    for (let i = 0; i < schema.searchable.length; i++) {
      params.push(`%${sanitizeValue(searchTerm)}%`);
    }
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Construire la requête selon le type
  switch (queryType) {
    case 'count':
      sql = `SELECT COUNT(*) as total FROM \`${realTable}\` ${whereSQL}`;
      break;
    case 'sum': {
      const numCol = findBestNumericColumn(schema, 'montant|total|amount|ca');
      sql = `SELECT COALESCE(SUM(\`${numCol}\`), 0) as total FROM \`${realTable}\` ${whereSQL}`;
      break;
    }
    case 'avg': {
      const numCol = findBestNumericColumn(schema, 'montant|total|amount|salary|salaire');
      sql = `SELECT COALESCE(AVG(\`${numCol}\`), 0) as moyenne, COUNT(*) as nb FROM \`${realTable}\` ${whereSQL}`;
      break;
    }
    case 'max': {
      const numCol = findBestNumericColumn(schema, 'montant|total|amount');
      sql = `SELECT MAX(\`${numCol}\`) as maximum FROM \`${realTable}\` ${whereSQL}`;
      break;
    }
    case 'min': {
      const numCol = findBestNumericColumn(schema, 'montant|total|amount');
      sql = `SELECT MIN(\`${numCol}\`) as minimum FROM \`${realTable}\` ${whereSQL}`;
      break;
    }
    case 'top': {
      const numCol = findBestNumericColumn(schema, 'total|amount|montant|quantity|ca');
      const ob = numCol ? `ORDER BY \`${numCol}\` DESC` : 'ORDER BY 1 DESC';
      sql = `SELECT ${selectCols} FROM \`${realTable}\` ${whereSQL} ${ob} LIMIT ?`;
      params.push(limit);
      break;
    }
    case 'group': {
      const groupCol = detectGroupColumn(intent, schema);
      const numCol = findBestNumericColumn(schema, 'total|amount|montant|quantity');
      if (groupCol && numCol) {
        sql = `SELECT \`${groupCol}\` as label, COUNT(*) as nb, COALESCE(SUM(\`${numCol}\`), 0) as total FROM \`${realTable}\` ${whereSQL} GROUP BY \`${groupCol}\` ORDER BY total DESC LIMIT 20`;
      } else {
        sql = `SELECT ${selectCols} FROM \`${realTable}\` ${whereSQL} ORDER BY 1 DESC LIMIT ?`;
        params.push(limit);
      }
      break;
    }
    case 'search':
    case 'list':
    default: {
      const ob = orderBy && safeCols.includes(orderBy) ? `ORDER BY \`${orderBy}\` ${orderDir}` : (schema.dates && schema.dates.includes('created_at') ? 'ORDER BY created_at DESC' : '');
      sql = `SELECT ${selectCols} FROM \`${realTable}\` ${whereSQL} ${ob} LIMIT ?`;
      params.push(limit);
      break;
    }
  }

  try {
    const [rows] = await pool.execute(sql, params);
    return { rows, sql: sql.replace(/\?/g, '?'), queryType, table, realTable, schema };
  } catch (err) {
    console.error('DB Explorer SQL Error:', err.message, '\nSQL:', sql);
    return { error: err.message, sql, queryType, table };
  }
}

function buildDateFilter(clauses, params, filters, schema) {
  if (!filters.dateFilter) return;
  const dateCol = (schema.dates && schema.dates[0]) || 'created_at';
  switch (filters.dateFilter) {
    case 'today': clauses.push(`DATE(\`${dateCol}\`) = CURDATE()`); break;
    case 'yesterday': clauses.push(`DATE(\`${dateCol}\`) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`); break;
    case 'this_week': clauses.push(`\`${dateCol}\` >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`); break;
    case 'last_week': clauses.push(`\`${dateCol}\` BETWEEN DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)`); break;
    case 'this_month': clauses.push(`DATE_FORMAT(\`${dateCol}\`, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`); break;
    case 'last_month': clauses.push(`DATE_FORMAT(\`${dateCol}\`, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')`); break;
    case 'this_year': clauses.push(`YEAR(\`${dateCol}\`) = YEAR(CURDATE())`); break;
  }
}

function buildStatusFilter(clauses, params, filters, schema) {
  if (filters.status && schema.columns && schema.columns.includes('status')) {
    clauses.push(`\`status\` = ?`);
    params.push(filters.status);
  }
  if (filters.paymentStatus && schema.columns && schema.columns.includes('payment_status')) {
    clauses.push(`\`payment_status\` = ?`);
    params.push(filters.paymentStatus);
  }
}

function buildAmountFilter(clauses, params, filters, schema) {
  if (!filters.amountMin && !filters.amountMax) return;
  const numCol = findBestNumericColumn(schema, 'total|amount|montant');
  if (!numCol) return;
  if (filters.amountMin) { clauses.push(`\`${numCol}\` >= ?`); params.push(filters.amountMin); }
  if (filters.amountMax) { clauses.push(`\`${numCol}\` <= ?`); params.push(filters.amountMax); }
}

function findBestNumericColumn(schema, pattern) {
  if (!schema.numeric || schema.numeric.length === 0) return null;
  const regex = new RegExp(pattern, 'i');
  const found = schema.numeric.find(c => regex.test(c));
  return found || schema.numeric[0];
}

function detectGroupColumn(intent, schema) {
  const lower = (intent.searchTerm || '').toLowerCase();
  if (/jour|day|date/i.test(lower)) {
    return schema.dates ? schema.dates[0] : null;
  }
  if (/produit|product|type/i.test(lower)) {
    return schema.columns.includes('product_type') ? 'product_type' : schema.columns.includes('type_beton') ? 'type_beton' : schema.columns.includes('name') ? 'name' : null;
  }
  if (/client|customer/i.test(lower)) {
    return schema.columns.includes('client_name') ? 'client_name' : schema.columns.includes('customer_id') ? 'customer_id' : null;
  }
  if (/status|statut/i.test(lower)) {
    return schema.columns.includes('status') ? 'status' : null;
  }
  if (/categorie|catégorie/i.test(lower)) {
    return schema.columns.includes('categorie') ? 'categorie' : schema.columns.includes('category_id') ? 'category_id' : null;
  }
  // Par défaut : status si présent
  if (schema.columns.includes('status')) return 'status';
  return null;
}

// ============================================================
//  FORMATAGE DES RÉSULTATS EN LANGAGE NATUREL
// ============================================================
function formatExplorerResult(result, question) {
  if (!result) return null;
  if (result.error) {
    return {
      answer: `⚠️ Erreur lors de l'exploration de la table **${result.table}** : ${result.error}`,
      data: null,
      chartType: null
    };
  }

  const { rows, queryType, table, schema } = result;
  const label = (schema && schema.label) || table;

  if (!rows || rows.length === 0) {
    return {
      answer: `📭 Aucun résultat trouvé dans **${label}** avec les critères demandés.`,
      data: null,
      chartType: null
    };
  }

  switch (queryType) {
    case 'count':
      return { answer: `📊 **${label}** : **${fmt(rows[0].total)}** enregistrements trouvés.`, data: null, chartType: null };
    case 'sum':
      return { answer: `💰 **Total ${label}** : **${fmt(rows[0].total)}** FCFA`, data: null, chartType: null };
    case 'avg':
      return { answer: `📈 **Moyenne ${label}** : **${fmt(rows[0].moyenne)}** FCFA (sur ${rows[0].nb} enregistrements)`, data: null, chartType: null };
    case 'max':
      return { answer: `🔝 **Maximum ${label}** : **${fmt(rows[0].maximum)}** FCFA`, data: null, chartType: null };
    case 'min':
      return { answer: `🔻 **Minimum ${label}** : **${fmt(rows[0].minimum)}** FCFA`, data: null, chartType: null };
    case 'group': {
      const chartData = rows.map(r => ({ name: String(r.label || 'N/A'), value: Number(r.total || r.nb || 0) }));
      let text = `📊 **${label} — Regroupement**\n\n`;
      rows.forEach((r, i) => {
        text += `${i + 1}. **${r.label || 'N/A'}** : ${fmt(r.total)} FCFA (${r.nb} entrées)\n`;
      });
      return { answer: text, data: chartData, chartType: 'bar' };
    }
    default: {
      // Format tableau pour les résultats list/top/search
      return formatTableResult(rows, label, queryType, schema);
    }
  }
}

function formatTableResult(rows, label, queryType, schema) {
  const count = rows.length;
  let text = `📋 **${label}** — ${count} résultat${count > 1 ? 's' : ''}\n\n`;

  // Identifier les colonnes clés à afficher
  const displayCols = identifyDisplayColumns(rows[0], schema);

  rows.forEach((row, i) => {
    text += `**${i + 1}.** `;
    const parts = [];
    for (const col of displayCols) {
      if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
        const val = formatColumnValue(col, row[col]);
        parts.push(`${getColumnLabel(col)}: ${val}`);
      }
    }
    text += parts.join(' | ') + '\n';
  });

  // Tenter de créer un graphique si on a des données numériques
  let chartData = null;
  let chartType = null;
  const nameCol = displayCols.find(c => /name|label|titre|number|numero/i.test(c));
  const numCol = displayCols.find(c => schema && schema.numeric && schema.numeric.includes(c));
  if (nameCol && numCol && rows.length > 1) {
    chartData = rows.map(r => ({ name: String(r[nameCol] || '').substring(0, 20), value: Number(r[numCol] || 0) }));
    chartType = rows.length > 5 ? 'bar' : 'pie';
  }

  return { answer: text, data: chartData, chartType };
}

function identifyDisplayColumns(row, schema) {
  if (!row) return [];
  const allCols = Object.keys(row).filter(isColumnSafe);
  // Priorité : name, number, label, status, montant/amount, date
  const priority = ['name','sale_number','order_number','invoice_number','payment_number','delivery_number','employee_number','credit_note_number','label','first_name','last_name','client_name','email','phone','status','payment_status','total_amount','amount','montant','net_salary','selling_price','quantity','weight_loaded','sale_date','created_at','type','categorie','position','department'];
  const result = [];
  for (const p of priority) {
    if (allCols.includes(p) && result.length < 6) result.push(p);
  }
  // Ajouter les colonnes restantes jusqu'à 6
  for (const c of allCols) {
    if (!result.includes(c) && result.length < 6 && !['id','user_id','created_at','updated_at'].includes(c)) {
      result.push(c);
    }
  }
  return result;
}

function getColumnLabel(col) {
  const labels = {
    name: '📛', sale_number: '🔢', order_number: '🔢', invoice_number: '🧾', client_name: '👤',
    email: '📧', phone: '📱', status: '📌', payment_status: '💳', total_amount: '💰',
    amount: '💰', montant: '💰', net_salary: '💰', selling_price: '💲', quantity: '📦',
    weight_loaded: '⚖️', sale_date: '📅', created_at: '📅', type: '🏷️', categorie: '📑',
    first_name: '👤', last_name: '👤', position: '💼', department: '🏢', driver_name: '🚛',
    vehicle_plate: '🚗', destination: '📍', product_type: '🏗️', base_salary: '💵',
    payment_method: '💳', description: '📝', reference: '🔗', delivery_number: '📦',
    employee_number: '🔢', credit_note_number: '📋', company_name: '🏢', city: '🏙️',
    sku: '🏷️', company: '🏢', rating: '⭐'
  };
  return labels[col] || `**${col.replace(/_/g, ' ')}**`;
}

function formatColumnValue(col, val) {
  if (val instanceof Date) return val.toLocaleDateString('fr-FR');
  if (typeof val === 'object') return JSON.stringify(val).substring(0, 100);
  if (/amount|total|montant|salary|price|balance|budget/i.test(col) && !isNaN(val)) {
    return `**${fmt(val)}** FCFA`;
  }
  return String(val).substring(0, 80);
}

// ============================================================
//  EXPLORATION GLOBALE — Résumé de toutes les tables
// ============================================================
async function exploreDatabaseOverview() {
  const stats = [];
  const importantTables = ['sales','customers','products','invoices','payments','employees','purchase_orders','projects','ecom_orders','partners'];
  
  for (const tableName of importantTables) {
    const realTable = tableName;
    try {
      const [rows] = await pool.execute(`SELECT COUNT(*) as c FROM \`${realTable}\``);
      stats.push({ table: tableName, label: DB_SCHEMA[tableName]?.label || tableName, count: rows[0].c });
    } catch {
      // Table might not exist
    }
  }

  let text = `🗄️ **Vue d'ensemble de la base de données**\n\n`;
  text += `📊 **${Object.keys(DB_SCHEMA).length} tables** disponibles\n\n`;
  text += `**Tables principales :**\n`;
  stats.forEach(s => {
    text += `• ${s.label} : **${fmt(s.count)}** enregistrements\n`;
  });
  text += `\n💡 Posez des questions sur n'importe quelle table ! Exemples :\n`;
  text += `• "Combien de clients actifs ?"\n`;
  text += `• "Liste des ventes d'aujourd'hui"\n`;
  text += `• "Top 5 employés par salaire"\n`;
  text += `• "Total des paiements ce mois"\n`;
  text += `• "Rechercher le client Diallo"\n`;

  const chartData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));

  return {
    answer: text,
    data: chartData.length > 0 ? chartData : null,
    chartType: chartData.length > 0 ? 'bar' : null
  };
}

// ============================================================
//  EXPLORATION DE SCHÉMA — Structure d'une table
// ============================================================
function exploreTableSchema(tableName) {
  const resolved = resolveTable(tableName);
  if (!resolved || !DB_SCHEMA[resolved]) return null;

  const schema = DB_SCHEMA[resolved];
  let text = `🔍 **Structure de la table "${schema.label || resolved}"**\n\n`;
  if (schema.description) text += `📝 ${schema.description}\n\n`;

  const safeCols = (schema.columns || []).filter(isColumnSafe);
  text += `📋 **Colonnes** (${safeCols.length}) :\n`;
  safeCols.forEach(c => {
    let icon = '•';
    if (schema.numeric && schema.numeric.includes(c)) icon = '🔢';
    else if (schema.dates && schema.dates.includes(c)) icon = '📅';
    else if (schema.searchable && schema.searchable.includes(c)) icon = '🔍';
    text += `${icon} \`${c}\`\n`;
  });

  if (schema.enums) {
    text += `\n🏷️ **Valeurs possibles** :\n`;
    for (const [col, vals] of Object.entries(schema.enums)) {
      text += `• ${col} : ${vals.join(', ')}\n`;
    }
  }

  if (schema.joins) {
    text += `\n🔗 **Relations** :\n`;
    for (const [col, target] of Object.entries(schema.joins)) {
      text += `• ${col} → ${target}\n`;
    }
  }

  return { answer: text, data: null, chartType: null };
}

// ============================================================
//  REQUÊTE SQL BRUTE (lecture uniquement, sécurisée)
// ============================================================
async function executeRawReadQuery(sql) {
  // Sécurité : uniquement SELECT autorisé
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT')) {
    return { error: 'Seules les requêtes SELECT sont autorisées en mode exploration.' };
  }
  // Blocage des mots-clés dangereux
  const forbidden = ['INSERT','UPDATE','DELETE','DROP','ALTER','CREATE','TRUNCATE','GRANT','REVOKE','EXEC','EXECUTE','CALL'];
  for (const word of forbidden) {
    if (trimmed.includes(word)) {
      return { error: `Mot-clé interdit détecté: ${word}. Seules les requêtes de lecture sont autorisées.` };
    }
  }
  // Vérifier que les colonnes sensibles ne sont pas exposées
  for (const sc of SENSITIVE_COLUMNS) {
    if (sql.toLowerCase().includes(sc)) {
      return { error: `Accès refusé: la colonne "${sc}" est protégée.` };
    }
  }

  try {
    const [rows] = await pool.execute(sql);
    return { rows, sql };
  } catch (err) {
    return { error: err.message, sql };
  }
}

// ============================================================
//  POINT D'ENTRÉE PRINCIPAL
// ============================================================
async function exploreDatabase(question) {
  const lower = question.toLowerCase();

  // Cas 1 : Vue d'ensemble de la BDD
  if (/(?:vue.*ensemble|overview|résumé|toutes? les tables|structure.*base|base.*donn[eé]es|database|bdd|schema|schéma)/i.test(lower)) {
    return await exploreDatabaseOverview();
  }

  // Cas 2 : Structure d'une table spécifique
  const structMatch = lower.match(/(?:structure|colonnes?|champs?|schema|schéma|describe|desc)\s+(?:de |du |de la |des |la table )?\s*(\w+)/i);
  if (structMatch) {
    const result = exploreTableSchema(structMatch[1]);
    if (result) return result;
  }

  // Cas 3 : Requête SQL brute (pour utilisateurs avancés)
  if (/^SELECT\s/i.test(question.trim())) {
    const result = await executeRawReadQuery(question.trim());
    if (result.error) return { answer: `⚠️ ${result.error}`, data: null, chartType: null };
    return formatTableResult(result.rows, 'Requête SQL', 'list', {});
  }

  // Cas 4 : Requête dynamique naturelle
  const intent = detectExplorerIntent(question);
  if (intent.table) {
    const result = await executeExplorerQuery(intent);
    return formatExplorerResult(result, question);
  }

  // Cas 5 : Liste des tables disponibles
  if (/quelles?.*(tables?|donn[eé]es)|tables? disponibles?|que contient/i.test(lower)) {
    return await exploreDatabaseOverview();
  }

  return null; // pas de résultat dans l'explorer
}

// ============================================================
//  EXPORTS
// ============================================================
module.exports = {
  exploreDatabase,
  exploreDatabaseOverview,
  exploreTableSchema,
  executeRawReadQuery,
  detectExplorerIntent,
  DB_SCHEMA,
  TABLE_ALIASES
};
