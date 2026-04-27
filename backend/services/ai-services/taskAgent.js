// ============================================================
//  TASK AGENT v1.0 — Agent IA d'exécution de tâches
//  Permet à l'IA d'effectuer des actions business : créer des
//  ventes, ajouter des clients, enregistrer des paiements,
//  mettre à jour le stock, etc. Avec validation et audit.
// ============================================================
const { pool } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));

// ============================================================
//  CATALOGUE DE TÂCHES DISPONIBLES
// ============================================================
const TASK_CATALOG = {
  // --- CLIENTS ---
  create_customer: {
    label: 'Créer un client',
    description: 'Ajouter un nouveau client dans la base',
    requiredFields: ['name'],
    optionalFields: ['email','phone','address','city','company','customer_type','notes'],
    regex: /(?:cr[eé]e|ajoute|nouveau|nouvelle|enregistre|inscri)\s*(?:un |une |le |la )?(?:client|acheteur)/i
  },
  update_customer: {
    label: 'Modifier un client',
    description: 'Mettre à jour les informations d\'un client',
    requiredFields: ['customer_identifier'],
    optionalFields: ['name','email','phone','address','city','status','notes','credit_limit'],
    regex: /(?:modif|mise?\s*[àa]\s*jour|update|change|corrige)\s*(?:le |la |un |une )?(?:client|acheteur)/i
  },
  // --- VENTES ---
  create_sale: {
    label: 'Créer une vente',
    description: 'Enregistrer une nouvelle vente',
    requiredFields: ['client_name','product_name','quantity'],
    optionalFields: ['unit_price','payment_method','notes','driver_name','vehicle_plate','destination','type_beton'],
    regex: /(?:cr[eé]e|ajoute|enregistre|nouvelle?|fais?)\s*(?:une? |la )?(?:vente|transaction|commande client)/i
  },
  // --- PAIEMENTS ---
  record_payment: {
    label: 'Enregistrer un paiement',
    description: 'Enregistrer un paiement reçu',
    requiredFields: ['amount'],
    optionalFields: ['sale_number','payment_method','reference_number','notes','client_name'],
    regex: /(?:enregistre|ajoute|cr[eé]e|re[çc]oi|nouveau)\s*(?:un |le )?(?:paiement|versement|r[eè]glement)/i
  },
  // --- CAISSE ---
  record_cash_entry: {
    label: 'Enregistrer une entrée de caisse',
    description: 'Ajouter une entrée (recette) dans la caisse',
    requiredFields: ['montant'],
    optionalFields: ['categorie','description','reference','payment_method'],
    regex: /(?:enregistre|ajoute|cr[eé]e)\s*(?:une? )?(?:entr[eé]e|recette)\s*(?:de |en |dans la )?(?:caisse)?/i
  },
  record_cash_exit: {
    label: 'Enregistrer une sortie de caisse',
    description: 'Ajouter une sortie (dépense) dans la caisse',
    requiredFields: ['montant'],
    optionalFields: ['categorie','description','reference','payment_method'],
    regex: /(?:enregistre|ajoute|cr[eé]e)\s*(?:une? )?(?:sortie|d[eé]pense|d[eé]caissement)\s*(?:de |en |dans la )?(?:caisse)?/i
  },
  // --- STOCK ---
  record_stock_in: {
    label: 'Entrée de stock',
    description: 'Enregistrer une entrée de stock',
    requiredFields: ['product_name','quantity'],
    optionalFields: ['unit_cost','supplier_name','reference_number','notes'],
    regex: /(?:enregistre|ajoute)\s*(?:une? )?(?:entr[eé]e|r[eé]ception)\s*(?:de |du |en )?(?:stock)/i
  },
  record_stock_out: {
    label: 'Sortie de stock',
    description: 'Enregistrer une sortie de stock',
    requiredFields: ['product_name','quantity'],
    optionalFields: ['reference_number','notes'],
    regex: /(?:enregistre|ajoute)\s*(?:une? )?(?:sortie)\s*(?:de |du )?(?:stock)/i
  },
  // --- FACTURES ---
  create_invoice: {
    label: 'Créer une facture',
    description: 'Générer une facture pour un client',
    requiredFields: ['client_name'],
    optionalFields: ['items','notes','due_date'],
    regex: /(?:cr[eé]e|g[eé]n[eè]re|fais?|nouvelle?)\s*(?:une? |la )?(?:facture)/i
  },
  // --- EMPLOYÉS ---
  create_employee: {
    label: 'Ajouter un employé',
    description: 'Enregistrer un nouvel employé',
    requiredFields: ['first_name','last_name'],
    optionalFields: ['email','phone','position','department','base_salary','contract_type','hire_date'],
    regex: /(?:cr[eé]e|ajoute|enregistre|nouveau|nouvelle?|embauche|recrute)\s*(?:un |une |le |la )?(?:employ[eé]|salari[eé]|personnel|agent|collaborateur)/i
  },
  // --- FOURNISSEURS ---
  create_supplier: {
    label: 'Ajouter un fournisseur',
    description: 'Enregistrer un nouveau fournisseur',
    requiredFields: ['name'],
    optionalFields: ['email','phone','address','city','contact_person','notes'],
    regex: /(?:cr[eé]e|ajoute|enregistre|nouveau|nouvelle?)\s*(?:un |une |le |la )?(?:fournisseur)/i
  },
  // --- PROJETS ---
  create_project: {
    label: 'Créer un projet',
    description: 'Créer un nouveau projet/chantier',
    requiredFields: ['name'],
    optionalFields: ['code','description','client','location','budget_prevu','date_debut','responsable'],
    regex: /(?:cr[eé]e|ajoute|nouveau|nouvelle?|ouvre?|lance)\s*(?:un |une |le |la )?(?:projet|chantier)/i
  },
  // --- STATUTS ---
  update_sale_status: {
    label: 'Modifier le statut d\'une vente',
    description: 'Changer le statut d\'une vente (confirmed, delivered, etc.)',
    requiredFields: ['sale_number','new_status'],
    optionalFields: [],
    regex: /(?:modif|change|met|passe)\s*(?:le )?(?:statut|status|[eé]tat)\s*(?:de la |du )?(?:vente)/i
  },
  update_invoice_status: {
    label: 'Modifier le statut d\'une facture',
    description: 'Changer le statut d\'une facture',
    requiredFields: ['invoice_number','new_status'],
    optionalFields: [],
    regex: /(?:modif|change|met|passe)\s*(?:le )?(?:statut|status|[eé]tat)\s*(?:de la |du )?(?:facture)/i
  },
  // --- ACTIONS RAPIDES ---
  close_day: {
    label: 'Clôturer la journée',
    description: 'Générer un résumé de clôture de la journée',
    requiredFields: [],
    optionalFields: [],
    regex: /(?:cl[oô]tur|termine|fini|bilan|r[eé]sum[eé])\s*(?:la |le )?\s*(?:journ[eé]e|jour)/i
  },
  send_reminder: {
    label: 'Envoyer un rappel',
    description: 'Créer une notification de rappel pour les impayés',
    requiredFields: [],
    optionalFields: ['client_name'],
    regex: /(?:envoi|cr[eé]e|fais?)\s*(?:un |une |des |les )?(?:rappel|relance|notification)\s*(?:aux? |pour |de )?(?:impay|client)?/i
  }
};

// ============================================================
//  DÉTECTION DE TÂCHE
// ============================================================
function detectTask(question) {
  const lower = question.toLowerCase();
  
  for (const [taskId, task] of Object.entries(TASK_CATALOG)) {
    if (task.regex.test(lower)) {
      return { taskId, task, confidence: 0.90 };
    }
  }
  
  // Détection générique d'intention d'action
  if (/(?:cr[eé]e|ajoute|enregistre|modifi|supprime|met.*jour|nouveau|change|fais?|lance|ouvre|génère)/i.test(lower)) {
    return { taskId: null, task: null, confidence: 0.40 };
  }
  
  return null;
}

// ============================================================
//  EXTRACTION DES PARAMÈTRES DEPUIS LE TEXTE
// ============================================================
function extractTaskParams(question, taskId) {
  const params = {};
  const lower = question.toLowerCase();

  // Montants
  const amountMatch = question.match(/(\d[\d\s,.]*)\s*(?:FCFA|fcfa|francs?|F\b|CFA)/i) 
    || question.match(/(?:montant|somme|prix|amount)\s*(?:de |:|\s)\s*(\d[\d\s,.]*)/i);
  if (amountMatch) {
    const raw = (amountMatch[1] || amountMatch[2] || '').replace(/[\s,]/g, '').replace('.', '');
    params.amount = parseInt(raw) || 0;
    params.montant = params.amount;
  }

  // Quantité
  const qtyMatch = question.match(/(\d+(?:[.,]\d+)?)\s*(?:tonnes?|m³|m3|unités?|pièces?|sacs?|kg|litres?)/i)
    || question.match(/(?:quantit[eé]|qty)\s*(?:de |:|\s)\s*(\d+(?:[.,]\d+)?)/i);
  if (qtyMatch) {
    params.quantity = parseFloat((qtyMatch[1] || qtyMatch[2]).replace(',', '.'));
  }

  // Nom de client
  const clientMatch = question.match(/(?:client|acheteur|pour)\s+(?:["']([^"']+)["']|([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*))/);
  if (clientMatch) {
    params.client_name = (clientMatch[1] || clientMatch[2]).trim();
  }
  // Fallback avec "le client X"
  if (!params.client_name) {
    const clientMatch2 = question.match(/(?:le client|la cliente|du client|au client)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/);
    if (clientMatch2) params.client_name = clientMatch2[1].trim();
  }

  // Nom du produit
  const productMatch = question.match(/(?:produit|article|b[eé]ton|type)\s+(?:["']([^"']+)["']|([A-ZÀ-Ü0-9][a-zà-ü0-9/]+(?:\s+[A-ZÀ-Ü0-9][a-zà-ü0-9/]+)*))/i);
  if (productMatch) {
    params.product_name = (productMatch[1] || productMatch[2]).trim();
  }
  if (!params.product_name && /b[eé]ton/i.test(lower)) {
    const betonMatch = lower.match(/b[eé]ton\s+([a-z0-9/]+)/i);
    if (betonMatch) params.product_name = `Béton ${betonMatch[1].toUpperCase()}`;
  }

  // Méthode de paiement
  if (/espèces?|cash|liquide/i.test(lower)) params.payment_method = 'cash';
  else if (/carte|card|cb/i.test(lower)) params.payment_method = 'card';
  else if (/virement|transfert|bank/i.test(lower)) params.payment_method = 'bank_transfer';
  else if (/chèque|cheque/i.test(lower)) params.payment_method = 'check';
  else if (/wave/i.test(lower)) params.payment_method = 'wave';
  else if (/orange\s*money/i.test(lower)) params.payment_method = 'orange_money';
  else if (/free\s*money/i.test(lower)) params.payment_method = 'free_money';
  else if (/mobile/i.test(lower)) params.payment_method = 'mobile_money';

  // Email
  const emailMatch = question.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) params.email = emailMatch[0];

  // Téléphone
  const phoneMatch = question.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,3}[-.\s]?\d{2,4}[-.\s]?\d{0,4}/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 9) params.phone = phoneMatch[0].trim();

  // Nom (pour employé/fournisseur)
  const nameMatch = question.match(/(?:nom|appel[eé])\s+(?:["']([^"']+)["']|([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*))/);
  if (nameMatch) params.name = (nameMatch[1] || nameMatch[2]).trim();

  // Prénom / Nom de famille
  const firstNameMatch = question.match(/(?:pr[eé]nom)\s+(?:["']([^"']+)["']|([A-ZÀ-Ü][a-zà-ü]+))/i);
  if (firstNameMatch) params.first_name = (firstNameMatch[1] || firstNameMatch[2]).trim();
  const lastNameMatch = question.match(/(?:nom de famille|nom)\s+(?:["']([^"']+)["']|([A-ZÀ-Ü][a-zà-ü]+))/i);
  if (lastNameMatch) params.last_name = (lastNameMatch[1] || lastNameMatch[2]).trim();

  // Catégorie
  const catMatch = question.match(/(?:cat[eé]gorie|type)\s+(?:["']([^"']+)["']|([a-zà-ü]+(?:\s+[a-zà-ü]+)?))/i);
  if (catMatch) params.categorie = (catMatch[1] || catMatch[2]).trim();

  // Description
  const descMatch = question.match(/(?:description|motif|raison|intitul[eé])\s*(?::|=|)\s*["']?([^"']+?)["']?\s*(?:$|montant|quantité|pour|prix)/i);
  if (descMatch) params.description = descMatch[1].trim();

  // Numéro de vente/facture
  const saleNumMatch = question.match(/(?:vente|sale)\s*(?:n[°o]?|#|numéro)\s*[\s:]?([A-Z0-9-]+)/i);
  if (saleNumMatch) params.sale_number = saleNumMatch[1].trim();
  
  const invoiceNumMatch = question.match(/(?:facture|invoice)\s*(?:n[°o]?|#|numéro)\s*[\s:]?([A-Z0-9-]+)/i);
  if (invoiceNumMatch) params.invoice_number = invoiceNumMatch[1].trim();

  // Statut
  const statusMatch = question.match(/(?:statut|status|état)\s*(?:à|en|:|\s)\s*["']?(\w+)["']?/i);
  if (statusMatch) params.new_status = statusMatch[1].toLowerCase();
  if (/\bconfirm/i.test(lower)) params.new_status = params.new_status || 'confirmed';
  if (/\blivr/i.test(lower)) params.new_status = params.new_status || 'delivered';
  if (/\bannul/i.test(lower)) params.new_status = params.new_status || 'cancelled';
  if (/\bpay[eé]/i.test(lower)) params.new_status = params.new_status || 'paid';

  // Poste / département
  const posMatch = question.match(/(?:poste|position|fonction)\s*(?:de |:|\s)\s*["']?([^"']+?)["']?\s*(?:$|département|salaire)/i);
  if (posMatch) params.position = posMatch[1].trim();
  const deptMatch = question.match(/(?:d[eé]partement|service|direction)\s*(?:de |:|\s)\s*["']?([^"']+?)["']?\s*(?:$|poste|salaire)/i);
  if (deptMatch) params.department = deptMatch[1].trim();

  // Salaire
  const salaryMatch = question.match(/(?:salaire|r[eé]mun[eé]ration)\s*(?:de |:|\s)\s*(\d[\d\s,.]*)/i);
  if (salaryMatch) params.base_salary = parseInt(salaryMatch[1].replace(/[\s,]/g, ''));

  // Véhicule / chauffeur
  const vehicleMatch = question.match(/(?:v[eé]hicule|camion|plaque)\s*(?:["']([^"']+)["']|([A-Z]{2}[\s-]?\d{3,4}[\s-]?[A-Z]{2}))/i);
  if (vehicleMatch) params.vehicle_plate = (vehicleMatch[1] || vehicleMatch[2]).trim();
  const driverMatch = question.match(/(?:chauffeur|conducteur|driver)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/);
  if (driverMatch) params.driver_name = driverMatch[1].trim();

  // Destination
  const destMatch = question.match(/(?:destination|livrer?\s+(?:à|a)|vers)\s+["']?([^"']+?)["']?\s*(?:$|chauffeur|camion|montant)/i);
  if (destMatch) params.destination = destMatch[1].trim();

  // Adresse
  const addrMatch = question.match(/(?:adresse)\s*(?::|=|\s)\s*["']?([^"']+?)["']?\s*(?:$|ville|email|t[eé]l)/i);
  if (addrMatch) params.address = addrMatch[1].trim();

  // Ville
  const cityMatch = question.match(/(?:ville)\s*(?::|=|\s)\s*["']?([^"']+?)["']?\s*(?:$|adresse|email)/i);
  if (cityMatch) params.city = cityMatch[1].trim();

  // Projet/chantier
  const projMatch = question.match(/(?:projet|chantier)\s+(?:["']([^"']+)["']|([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü0-9][a-zà-ü0-9]*)*))/i);
  if (projMatch && !params.name) params.project_name = (projMatch[1] || projMatch[2]).trim();

  // Budget
  const budgetMatch = question.match(/(?:budget)\s*(?:de |:|\s)\s*(\d[\d\s,.]*)/i);
  if (budgetMatch) params.budget_prevu = parseInt(budgetMatch[1].replace(/[\s,]/g, ''));

  // Responsable
  const respMatch = question.match(/(?:responsable)\s*(?::|=|\s)\s*["']?([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)["']?/);
  if (respMatch) params.responsable = respMatch[1].trim();

  return params;
}

// ============================================================
//  EXÉCUTION DES TÂCHES
// ============================================================

async function executeTask(taskId, params, userId) {
  switch (taskId) {
    case 'create_customer':    return await taskCreateCustomer(params, userId);
    case 'update_customer':    return await taskUpdateCustomer(params, userId);
    case 'create_sale':        return await taskCreateSale(params, userId);
    case 'record_payment':     return await taskRecordPayment(params, userId);
    case 'record_cash_entry':  return await taskRecordCash(params, userId, 'entree');
    case 'record_cash_exit':   return await taskRecordCash(params, userId, 'sortie');
    case 'record_stock_in':    return await taskRecordStock(params, userId, 'in');
    case 'record_stock_out':   return await taskRecordStock(params, userId, 'out');
    case 'create_invoice':     return await taskCreateInvoice(params, userId);
    case 'create_employee':    return await taskCreateEmployee(params, userId);
    case 'create_supplier':    return await taskCreateSupplier(params, userId);
    case 'create_project':     return await taskCreateProject(params, userId);
    case 'update_sale_status': return await taskUpdateSaleStatus(params, userId);
    case 'update_invoice_status': return await taskUpdateInvoiceStatus(params, userId);
    case 'close_day':          return await taskCloseDay(userId);
    case 'send_reminder':      return await taskSendReminder(params, userId);
    default:
      return { success: false, answer: `❌ Tâche "${taskId}" non encore implémentée.` };
  }
}

// --- CRÉER CLIENT ---
async function taskCreateCustomer(params, userId) {
  const name = params.client_name || params.name;
  if (!name) return { success: false, answer: '❌ Veuillez préciser le **nom du client**. Ex: "Crée un client Moussa Diallo"' };
  
  const id = uuidv4();
  const [existing] = await pool.execute('SELECT id FROM customers WHERE name = ? AND user_id = ? LIMIT 1', [name, userId]);
  if (existing.length > 0) {
    return { success: false, answer: `⚠️ Un client nommé **${name}** existe déjà.` };
  }
  
  await pool.execute(
    `INSERT INTO customers (id, user_id, name, email, phone, address, city, company, customer_type, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif')`,
    [id, userId, name, params.email || null, params.phone || null, params.address || null,
     params.city || null, params.company || null, params.customer_type || 'simple', params.notes || null]
  );

  await logAudit(userId, 'CREATE', 'customers', id, null, { name, email: params.email });

  return {
    success: true,
    answer: `✅ **Client créé avec succès !**\n\n👤 **Nom** : ${name}\n${params.email ? `📧 Email : ${params.email}\n` : ''}${params.phone ? `📱 Tél : ${params.phone}\n` : ''}${params.city ? `🏙️ Ville : ${params.city}\n` : ''}📌 Statut : Actif\n🔑 ID : \`${id.substring(0, 8)}...\``,
    data: { id, name }
  };
}

// --- MODIFIER CLIENT ---
async function taskUpdateCustomer(params, userId) {
  const identifier = params.client_name || params.name || params.customer_identifier;
  if (!identifier) return { success: false, answer: '❌ Veuillez préciser le **nom du client** à modifier.' };
  
  const [clients] = await pool.execute('SELECT id, name FROM customers WHERE name LIKE ? AND user_id = ? LIMIT 1', [`%${identifier}%`, userId]);
  if (clients.length === 0) {
    return { success: false, answer: `❌ Client **${identifier}** non trouvé.` };
  }
  
  const client = clients[0];
  const updates = [];
  const values = [];
  
  if (params.email) { updates.push('email = ?'); values.push(params.email); }
  if (params.phone) { updates.push('phone = ?'); values.push(params.phone); }
  if (params.address) { updates.push('address = ?'); values.push(params.address); }
  if (params.city) { updates.push('city = ?'); values.push(params.city); }
  if (params.status) { updates.push('status = ?'); values.push(params.status); }
  if (params.notes) { updates.push('notes = ?'); values.push(params.notes); }
  if (params.credit_limit) { updates.push('credit_limit = ?'); values.push(params.credit_limit); }
  
  if (updates.length === 0) {
    return { success: false, answer: `⚠️ Aucune modification spécifiée pour **${client.name}**. Précisez l'email, téléphone, adresse, etc.` };
  }
  
  values.push(client.id);
  await pool.execute(`UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
  await logAudit(userId, 'UPDATE', 'customers', client.id, null, params);

  return {
    success: true,
    answer: `✅ **Client ${client.name} mis à jour !**\n\n${updates.map(u => `• ${u.split(' = ')[0]}`).join('\n')}`,
    data: { id: client.id }
  };
}

// --- CRÉER VENTE ---
async function taskCreateSale(params, userId) {
  const clientName = params.client_name;
  if (!clientName) return { success: false, answer: '❌ Veuillez préciser le **client**. Ex: "Crée une vente pour client Diallo, produit Béton B25, 10 m³"' };
  
  // Rechercher le client
  const [clients] = await pool.execute('SELECT id, name FROM customers WHERE name LIKE ? LIMIT 1', [`%${clientName}%`]);
  const customerId = clients.length > 0 ? clients[0].id : null;
  const realClientName = clients.length > 0 ? clients[0].name : clientName;

  // Rechercher le produit
  let productId = null, unitPrice = 0, productName = params.product_name || 'Produit';
  if (params.product_name) {
    const [products] = await pool.execute('SELECT id, name, selling_price FROM products WHERE name LIKE ? LIMIT 1', [`%${params.product_name}%`]);
    if (products.length > 0) {
      productId = products[0].id;
      unitPrice = products[0].selling_price;
      productName = products[0].name;
    }
  }
  if (params.unit_price) unitPrice = params.unit_price;

  const quantity = params.quantity || 1;
  const lineTotal = quantity * unitPrice;
  const taxRate = 18;
  const taxAmount = Math.round(lineTotal * taxRate / 100);
  const totalAmount = lineTotal + taxAmount;

  const saleId = uuidv4();
  const saleNumber = `VNT-${Date.now().toString().slice(-8)}`;
  const saleItemId = uuidv4();

  await pool.execute(
    `INSERT INTO sales (id, user_id, customer_id, sale_number, status, sale_date, subtotal, tax_rate, tax_amount, total_amount, payment_status, payment_method, source, client_name, type_beton, vehicle_plate, driver_name, destination, weight_loaded, notes)
     VALUES (?, ?, ?, ?, 'confirmed', NOW(), ?, ?, ?, ?, 'pending', ?, 'counter', ?, ?, ?, ?, ?, ?, ?)`,
    [saleId, userId, customerId, saleNumber, lineTotal, taxRate, taxAmount, totalAmount, params.payment_method || 'cash', 
     realClientName, params.type_beton || null, params.vehicle_plate || null, params.driver_name || null, 
     params.destination || null, quantity, params.notes || null]
  );

  if (productId) {
    await pool.execute(
      `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, tax_rate, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [saleItemId, saleId, productId, quantity, unitPrice, taxRate, lineTotal]
    );
  }

  await logAudit(userId, 'CREATE', 'sales', saleId, null, { sale_number: saleNumber, client: realClientName, total: totalAmount });

  return {
    success: true,
    answer: `✅ **Vente créée avec succès !**\n\n🔢 N° : **${saleNumber}**\n👤 Client : **${realClientName}**\n📦 Produit : **${productName}**\n📊 Quantité : **${quantity}**\n💲 PU : **${fmt(unitPrice)}** FCFA\n💰 Total HT : **${fmt(lineTotal)}** FCFA\n📋 TVA (18%) : **${fmt(taxAmount)}** FCFA\n🏷️ **Total TTC : ${fmt(totalAmount)} FCFA**\n📌 Statut : Confirmée`,
    data: { id: saleId, sale_number: saleNumber, total: totalAmount }
  };
}

// --- ENREGISTRER PAIEMENT ---
async function taskRecordPayment(params, userId) {
  const amount = params.amount || params.montant;
  if (!amount || amount <= 0) return { success: false, answer: '❌ Veuillez préciser le **montant** du paiement.' };

  // Chercher la vente liée si sale_number fourni
  let saleId = null;
  if (params.sale_number) {
    const [sales] = await pool.execute('SELECT id FROM sales WHERE sale_number = ? LIMIT 1', [params.sale_number]);
    if (sales.length > 0) saleId = sales[0].id;
  }

  const paymentId = uuidv4();
  const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;

  await pool.execute(
    `INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, payment_date, reference_number, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 'completed', ?)`,
    [paymentId, userId, saleId, paymentNumber, amount, params.payment_method || 'cash', params.reference_number || null, params.notes || null]
  );

  // Mettre à jour le statut de paiement de la vente si liée
  if (saleId) {
    const [sale] = await pool.execute('SELECT total_amount FROM sales WHERE id = ?', [saleId]);
    const [paidRows] = await pool.execute('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE sale_id = ? AND status = ?', [saleId, 'completed']);
    const totalPaid = Number(paidRows[0].paid);
    const totalSale = Number(sale[0].total_amount);
    const newStatus = totalPaid >= totalSale ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
    await pool.execute('UPDATE sales SET payment_status = ? WHERE id = ?', [newStatus, saleId]);
  }

  await logAudit(userId, 'CREATE', 'payments', paymentId, null, { amount, payment_number: paymentNumber });

  return {
    success: true,
    answer: `✅ **Paiement enregistré !**\n\n🔢 N° : **${paymentNumber}**\n💰 Montant : **${fmt(amount)}** FCFA\n💳 Méthode : **${params.payment_method || 'cash'}**\n${saleId ? `🔗 Vente liée : ${params.sale_number}\n` : ''}📌 Statut : Complété`,
    data: { id: paymentId, payment_number: paymentNumber }
  };
}

// --- ENREGISTRER MOUVEMENT DE CAISSE ---
async function taskRecordCash(params, userId, type) {
  const montant = params.montant || params.amount;
  if (!montant || montant <= 0) return { success: false, answer: `❌ Veuillez préciser le **montant** de ${type === 'entree' ? "l'entrée" : 'la sortie'} de caisse.` };

  const id = uuidv4();
  await pool.execute(
    `INSERT INTO cash_movements (id, created_by, date, type, category, amount, description, reference, payment_method)
     VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
    [id, userId, type === 'entree' ? 'recette' : 'depense', params.categorie || 'Autre', montant, params.description || null, params.reference || null, params.payment_method || 'cash']
  );

  // Mettre à jour le solde de caisse
  const sign = type === 'entree' ? 1 : -1;
  try {
    await pool.execute(
      `INSERT INTO cash_balance (id, user_id, balance, last_updated) VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE balance = balance + ?, last_updated = NOW()`,
      [uuidv4(), userId, sign * montant, sign * montant]
    );
  } catch {}

  await logAudit(userId, 'CREATE', 'cash_movements', id, null, { type, montant, categorie: params.categorie });

  const emoji = type === 'entree' ? '📥' : '📤';
  const label = type === 'entree' ? 'Entrée de caisse' : 'Sortie de caisse';

  return {
    success: true,
    answer: `✅ **${label} enregistrée !**\n\n${emoji} Type : **${label}**\n💰 Montant : **${fmt(montant)}** FCFA\n${params.categorie ? `📑 Catégorie : **${params.categorie}**\n` : ''}${params.description ? `📝 Description : ${params.description}\n` : ''}📅 Date : Aujourd'hui`,
    data: { id }
  };
}

// --- ENREGISTRER MOUVEMENT DE STOCK ---
async function taskRecordStock(params, userId, type) {
  const productName = params.product_name;
  if (!productName) return { success: false, answer: '❌ Veuillez préciser le **produit**.' };
  if (!params.quantity) return { success: false, answer: '❌ Veuillez préciser la **quantité**.' };

  const [products] = await pool.execute('SELECT id, name FROM products WHERE name LIKE ? LIMIT 1', [`%${productName}%`]);
  if (products.length === 0) {
    return { success: false, answer: `❌ Produit **${productName}** non trouvé dans la base.` };
  }
  const product = products[0];

  // Obtenir le stock actuel
  const [inv] = await pool.execute('SELECT quantity FROM inventory_items WHERE product_id = ? LIMIT 1', [product.id]);
  const previousStock = inv.length > 0 ? Number(inv[0].quantity) : 0;
  const delta = type === 'in' ? params.quantity : -params.quantity;
  const newStock = previousStock + delta;

  const mvtId = uuidv4();
  await pool.execute(
    `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity, reference_type, notes, unit_cost, supplier_name, reference_number, previous_stock, new_stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [mvtId, userId, product.id, type, params.quantity, type === 'in' ? 'purchase' : 'sale', 
     params.notes || null, params.unit_cost || null, params.supplier_name || null, params.reference_number || null, previousStock, newStock]
  );

  // MAJ inventaire
  if (inv.length > 0) {
    await pool.execute('UPDATE inventory_items SET quantity = ?, updated_at = NOW() WHERE product_id = ?', [newStock, product.id]);
  } else {
    await pool.execute(
      'INSERT INTO inventory_items (id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, product.id, newStock]
    );
  }

  await logAudit(userId, 'CREATE', 'stock_movements', mvtId, null, { product: product.name, type, quantity: params.quantity });

  const emoji = type === 'in' ? '📥' : '📤';
  return {
    success: true,
    answer: `✅ **Mouvement de stock enregistré !**\n\n${emoji} **${type === 'in' ? 'Entrée' : 'Sortie'}** de stock\n📦 Produit : **${product.name}**\n📊 Quantité : **${params.quantity}**\n📈 Stock avant : **${previousStock}**\n📊 **Stock après : ${newStock}**`,
    data: { id: mvtId, product: product.name, newStock }
  };
}

// --- CRÉER FACTURE ---
async function taskCreateInvoice(params, userId) {
  const clientName = params.client_name;
  if (!clientName) return { success: false, answer: '❌ Veuillez préciser le **client** pour la facture.' };

  const [clients] = await pool.execute('SELECT id, name, email, phone, address FROM customers WHERE name LIKE ? LIMIT 1', [`%${clientName}%`]);
  if (clients.length === 0) {
    return { success: false, answer: `❌ Client **${clientName}** non trouvé.` };
  }
  const client = clients[0];

  // Chercher les ventes non facturées du client
  const [sales] = await pool.execute(
    `SELECT id, sale_number, total_amount FROM sales WHERE customer_id = ? AND status != 'cancelled' ORDER BY sale_date DESC LIMIT 10`,
    [client.id]
  );

  const subtotal = sales.reduce((s, v) => s + Number(v.total_amount || 0), 0);
  const taxAmount = Math.round(subtotal * 18 / 100);
  const total = subtotal + taxAmount;

  const invoiceNumber = `FAC-${Date.now().toString().slice(-8)}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const [result] = await pool.execute(
    `INSERT INTO invoices (user_id, invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_rate, tax_amount, total_amount, company_name, notes)
     VALUES (?, ?, ?, CURDATE(), ?, 'draft', ?, 18, ?, ?, ?, ?)`,
    [userId, invoiceNumber, client.id, dueDate.toISOString().split('T')[0], subtotal, taxAmount, total, client.name, params.notes || null]
  );

  await logAudit(userId, 'CREATE', 'invoices', result.insertId, null, { invoice_number: invoiceNumber, client: client.name, total });

  return {
    success: true,
    answer: `✅ **Facture créée !**\n\n🧾 N° : **${invoiceNumber}**\n👤 Client : **${client.name}**\n💰 Sous-total : **${fmt(subtotal)}** FCFA\n📋 TVA (18%) : **${fmt(taxAmount)}** FCFA\n🏷️ **Total : ${fmt(total)} FCFA**\n📅 Échéance : ${dueDate.toLocaleDateString('fr-FR')}\n📌 Statut : Brouillon\n\n${sales.length > 0 ? `📊 Basée sur ${sales.length} ventes récentes` : '⚠️ Aucune vente trouvée pour ce client'}`,
    data: { id: result.insertId, invoice_number: invoiceNumber }
  };
}

// --- CRÉER EMPLOYÉ ---
async function taskCreateEmployee(params, userId) {
  const firstName = params.first_name || params.name?.split(' ')[0];
  const lastName = params.last_name || params.name?.split(' ').slice(1).join(' ') || '';
  if (!firstName) return { success: false, answer: '❌ Veuillez préciser le **prénom** de l\'employé.' };

  const empId = uuidv4();
  const empNumber = `EMP-${Date.now().toString().slice(-6)}`;

  await pool.execute(
    `INSERT INTO employees (id, user_id, employee_number, first_name, last_name, email, phone, position, department, base_salary, contract_type, hire_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active')`,
    [empId, userId, empNumber, firstName, lastName, params.email || null, params.phone || null, 
     params.position || null, params.department || null, params.base_salary || 0, params.contract_type || 'CDI']
  );

  await logAudit(userId, 'CREATE', 'employees', empId, null, { name: `${firstName} ${lastName}`, employee_number: empNumber });

  return {
    success: true,
    answer: `✅ **Employé ajouté !**\n\n👤 **${firstName} ${lastName}**\n🔢 N° : ${empNumber}\n${params.position ? `💼 Poste : ${params.position}\n` : ''}${params.department ? `🏢 Département : ${params.department}\n` : ''}${params.base_salary ? `💵 Salaire : **${fmt(params.base_salary)}** FCFA\n` : ''}📋 Contrat : ${params.contract_type || 'CDI'}`,
    data: { id: empId }
  };
}

// --- CRÉER FOURNISSEUR ---
async function taskCreateSupplier(params, userId) {
  const name = params.name || params.client_name;
  if (!name) return { success: false, answer: '❌ Veuillez préciser le **nom du fournisseur**.' };

  const id = uuidv4();
  await pool.execute(
    `INSERT INTO suppliers (id, user_id, name, email, phone, address, city, contact_person, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [id, userId, name, params.email || null, params.phone || null, params.address || null, 
     params.city || null, params.contact_person || null, params.notes || null]
  );

  await logAudit(userId, 'CREATE', 'suppliers', id, null, { name });

  return {
    success: true,
    answer: `✅ **Fournisseur ajouté !**\n\n🏭 **${name}**\n${params.email ? `📧 Email : ${params.email}\n` : ''}${params.phone ? `📱 Tél : ${params.phone}\n` : ''}${params.city ? `🏙️ Ville : ${params.city}\n` : ''}📌 Statut : Actif`,
    data: { id }
  };
}

// --- CRÉER PROJET ---
async function taskCreateProject(params, userId) {
  const name = params.project_name || params.name;
  if (!name) return { success: false, answer: '❌ Veuillez préciser le **nom du projet/chantier**.' };

  const code = (params.code || name.substring(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-4)).replace(/\s/g, '');

  const [result] = await pool.execute(
    `INSERT INTO projects (name, code, description, client, location, status, budget_prevu, date_debut, responsable, notes)
     VALUES (?, ?, ?, ?, ?, 'actif', ?, ?, ?, ?)`,
    [name, code, params.description || null, params.client_name || null, params.destination || null,
     params.budget_prevu || 0, params.date_debut || new Date().toISOString().split('T')[0], params.responsable || null, params.notes || null]
  );

  await logAudit(userId, 'CREATE', 'projects', result.insertId, null, { name, code });

  return {
    success: true,
    answer: `✅ **Projet créé !**\n\n🏗️ **${name}**\n🔢 Code : **${code}**\n${params.client_name ? `👤 Client : ${params.client_name}\n` : ''}${params.budget_prevu ? `💰 Budget : **${fmt(params.budget_prevu)}** FCFA\n` : ''}${params.responsable ? `👷 Responsable : ${params.responsable}\n` : ''}📌 Statut : Actif`,
    data: { id: result.insertId, code }
  };
}

// --- MODIFIER STATUT VENTE ---
async function taskUpdateSaleStatus(params, userId) {
  const saleNum = params.sale_number;
  const newStatus = params.new_status;
  if (!saleNum) return { success: false, answer: '❌ Veuillez préciser le **numéro de vente**.' };
  if (!newStatus) return { success: false, answer: '❌ Veuillez préciser le **nouveau statut** (confirmed, shipped, delivered, cancelled).' };

  const validStatuses = ['draft','confirmed','shipped','delivered','cancelled'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, answer: `❌ Statut invalide: **${newStatus}**. Valeurs possibles: ${validStatuses.join(', ')}` };
  }

  const [sales] = await pool.execute('SELECT id, status FROM sales WHERE sale_number = ? LIMIT 1', [saleNum]);
  if (sales.length === 0) return { success: false, answer: `❌ Vente **${saleNum}** non trouvée.` };

  const oldStatus = sales[0].status;
  await pool.execute('UPDATE sales SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, sales[0].id]);
  await logAudit(userId, 'UPDATE', 'sales', sales[0].id, { status: oldStatus }, { status: newStatus });

  return {
    success: true,
    answer: `✅ **Statut modifié !**\n\n🔢 Vente : **${saleNum}**\n📌 Ancien statut : ${oldStatus}\n✨ **Nouveau statut : ${newStatus}**`
  };
}

// --- MODIFIER STATUT FACTURE ---
async function taskUpdateInvoiceStatus(params, userId) {
  const invoiceNum = params.invoice_number;
  const newStatus = params.new_status;
  if (!invoiceNum) return { success: false, answer: '❌ Veuillez préciser le **numéro de facture**.' };
  if (!newStatus) return { success: false, answer: '❌ Veuillez préciser le **nouveau statut** (draft, sent, paid, cancelled).' };

  const validStatuses = ['draft','sent','paid','cancelled'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, answer: `❌ Statut invalide. Valeurs possibles: ${validStatuses.join(', ')}` };
  }

  const [invoices] = await pool.execute('SELECT id, status FROM invoices WHERE invoice_number = ? LIMIT 1', [invoiceNum]);
  if (invoices.length === 0) return { success: false, answer: `❌ Facture **${invoiceNum}** non trouvée.` };

  const oldStatus = invoices[0].status;
  await pool.execute('UPDATE invoices SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, invoices[0].id]);
  await logAudit(userId, 'UPDATE', 'invoices', invoices[0].id, { status: oldStatus }, { status: newStatus });

  return {
    success: true,
    answer: `✅ **Statut facture modifié !**\n\n🧾 Facture : **${invoiceNum}**\n📌 Ancien : ${oldStatus}\n✨ **Nouveau : ${newStatus}**`
  };
}

// --- CLÔTURER LA JOURNÉE ---
async function taskCloseDay(userId) {
  const [sales] = await pool.execute(
    `SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca, COALESCE(SUM(weight_loaded),0) as tonnes 
     FROM sales WHERE DATE(sale_date) = CURDATE() AND status != 'cancelled'`
  );
  const [payments] = await pool.execute(
    `SELECT COUNT(*) as nb, COALESCE(SUM(amount),0) as total 
     FROM payments WHERE DATE(payment_date) = CURDATE() AND status = 'completed'`
  );
  const [cashIn] = await pool.execute(
    `SELECT COALESCE(SUM(amount),0) as total FROM cash_movements WHERE DATE(date) = CURDATE() AND type = 'recette'`
  );
  const [cashOut] = await pool.execute(
    `SELECT COALESCE(SUM(amount),0) as total FROM cash_movements WHERE DATE(date) = CURDATE() AND type = 'depense'`
  );
  const [newCustomers] = await pool.execute(
    `SELECT COUNT(*) as nb FROM customers WHERE DATE(created_at) = CURDATE()`
  );

  const s = sales[0], p = payments[0], ci = cashIn[0], co = cashOut[0], nc = newCustomers[0];

  return {
    success: true,
    answer: `📋 **Clôture de la journée — ${new Date().toLocaleDateString('fr-FR')}**\n\n` +
      `═══════════════════════════\n` +
      `📊 **VENTES**\n` +
      `• Nombre : **${s.nb}** ventes\n` +
      `• CA : **${fmt(s.ca)}** FCFA\n` +
      `• Tonnage : **${Number(s.tonnes).toFixed(1)}** tonnes\n\n` +
      `💰 **ENCAISSEMENTS**\n` +
      `• Paiements : **${p.nb}** (${fmt(p.total)} FCFA)\n` +
      `• Entrées caisse : **${fmt(ci.total)}** FCFA\n` +
      `• Sorties caisse : **${fmt(co.total)}** FCFA\n` +
      `• **Solde net jour : ${fmt(Number(ci.total) - Number(co.total))} FCFA**\n\n` +
      `👥 **CLIENTS**\n` +
      `• Nouveaux clients : **${nc.nb}**\n\n` +
      `═══════════════════════════\n` +
      `✅ Journée clôturée avec succès !`,
    data: [
      { name: 'CA Ventes', value: Number(s.ca) },
      { name: 'Paiements', value: Number(p.total) },
      { name: 'Entrées', value: Number(ci.total) },
      { name: 'Sorties', value: Number(co.total) }
    ],
    chartType: 'bar'
  };
}

// --- ENVOYER DES RAPPELS ---
async function taskSendReminder(params, userId) {
  const [unpaid] = await pool.execute(
    `SELECT s.id, s.sale_number, s.total_amount, s.client_name, s.sale_date,
            COALESCE(SUM(p.amount), 0) as paid
     FROM sales s
     LEFT JOIN payments p ON p.sale_id = s.id AND p.status = 'completed'
     WHERE s.payment_status IN ('pending','partial','overdue') AND s.status != 'cancelled'
     GROUP BY s.id
     ORDER BY s.total_amount DESC
     LIMIT 20`
  );

  if (unpaid.length === 0) {
    return { success: true, answer: '✅ **Aucun impayé à relancer !** Tous les paiements sont à jour.' };
  }

  // Créer des notifications
  let notifCount = 0;
  for (const sale of unpaid) {
    const remaining = Number(sale.total_amount) - Number(sale.paid);
    if (remaining <= 0) continue;

    if (params.client_name && !sale.client_name?.toLowerCase().includes(params.client_name.toLowerCase())) continue;

    try {
      await pool.execute(
        `INSERT INTO notifications (id, user_id, title, message, type, data) VALUES (?, ?, ?, ?, 'warning', ?)`,
        [uuidv4(), userId, 
         `⚠️ Rappel impayé: ${sale.client_name || sale.sale_number}`,
         `Vente ${sale.sale_number} - Restant: ${fmt(remaining)} FCFA`,
         JSON.stringify({ sale_id: sale.id, sale_number: sale.sale_number, remaining })]
      );
      notifCount++;
    } catch { /* ignore duplicates */ }
  }

  return {
    success: true,
    answer: `🔔 **${notifCount} rappels créés !**\n\n` +
      unpaid.slice(0, 10).map((s, i) => {
        const rest = Number(s.total_amount) - Number(s.paid);
        return `${i + 1}. **${s.client_name || s.sale_number}** — ${fmt(rest)} FCFA restant`;
      }).join('\n') +
      (unpaid.length > 10 ? `\n... et ${unpaid.length - 10} autres` : ''),
    data: unpaid.slice(0, 10).map(s => ({ name: (s.client_name || s.sale_number).substring(0, 15), value: Number(s.total_amount) - Number(s.paid) })),
    chartType: 'bar'
  };
}

// ============================================================
//  AUDIT LOG
// ============================================================
async function logAudit(userId, action, entityType, entityId, oldValues, newValues) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, String(entityId), oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// ============================================================
//  AIDE — Liste des tâches disponibles
// ============================================================
function getTaskHelp() {
  let text = `🤖 **Agent IA — Tâches disponibles**\n\n`;
  text += `Je peux exécuter les actions suivantes :\n\n`;
  
  const categories = {
    'Clients': ['create_customer', 'update_customer'],
    'Ventes': ['create_sale', 'update_sale_status'],
    'Finances': ['record_payment', 'record_cash_entry', 'record_cash_exit'],
    'Stock': ['record_stock_in', 'record_stock_out'],
    'Factures': ['create_invoice', 'update_invoice_status'],
    'RH': ['create_employee'],
    'Fournisseurs': ['create_supplier'],
    'Projets': ['create_project'],
    'Actions rapides': ['close_day', 'send_reminder']
  };

  for (const [cat, tasks] of Object.entries(categories)) {
    text += `\n**${cat}** :\n`;
    for (const tid of tasks) {
      const t = TASK_CATALOG[tid];
      if (t) text += `• ${t.label} — _"${t.description}"_\n`;
    }
  }

  text += `\n💡 **Exemples** :\n`;
  text += `• "Crée un client Moussa Diallo, téléphone 77 123 45 67"\n`;
  text += `• "Enregistre une vente pour client Diop, produit Béton B25, 8 tonnes"\n`;
  text += `• "Enregistre un paiement de 500 000 FCFA en cash"\n`;
  text += `• "Sortie de caisse 150 000 FCFA catégorie transport"\n`;
  text += `• "Entrée de stock produit Ciment, 50 tonnes"\n`;
  text += `• "Clôturer la journée"\n`;
  text += `• "Envoyer des rappels pour les impayés"\n`;

  return { answer: text, data: null, chartType: null };
}

// ============================================================
//  POINT D'ENTRÉE PRINCIPAL
// ============================================================
async function processAgentTask(question, userId) {
  const lower = question.toLowerCase();

  // Aide de l'agent
  if (/que (peux|sais)-tu faire|aide.*agent|actions? disponibles?|tâches? disponibles?|liste.*tâches?/i.test(lower)) {
    return getTaskHelp();
  }

  // Détecter la tâche
  const detection = detectTask(question);
  if (!detection || !detection.taskId) {
    return null; // pas une tâche
  }

  // Extraire les paramètres
  const params = extractTaskParams(question, detection.taskId);

  // Exécuter
  const result = await executeTask(detection.taskId, params, userId);
  return result;
}

// ============================================================
//  EXPORTS
// ============================================================
module.exports = {
  processAgentTask,
  detectTask,
  extractTaskParams,
  executeTask,
  getTaskHelp,
  TASK_CATALOG
};
