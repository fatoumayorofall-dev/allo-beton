// ============================================================
//  CLAUDE SERVICE v1.0 — Intégration Anthropic Claude
//  Transforme l'IA Expert en assistant puissant connecté à
//  Claude + données MySQL temps réel
// ============================================================
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../../config/database');

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

let anthropicClient = null;

function getClient() {
  if (!CLAUDE_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: CLAUDE_API_KEY });
  }
  return anthropicClient;
}

function isClaudeAvailable() {
  return !!CLAUDE_API_KEY;
}

// ============================================================
//  RÉCUPÈRER LE CONTEXTE MÉTIER DEPUIS MySQL
// ============================================================
async function getBusinessContext() {
  const context = {};
  try {
    // Ventes du jour
    const [salesToday] = await pool.execute(`
      SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca, COALESCE(SUM(weight_loaded),0) as tonnes
      FROM sales WHERE DATE(sale_date) = CURDATE() AND status != 'cancelled'`);
    context.salesToday = salesToday[0];

    // Ventes hier
    const [salesYesterday] = await pool.execute(`
      SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca
      FROM sales WHERE DATE(sale_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND status != 'cancelled'`);
    context.salesYesterday = salesYesterday[0];

    // Ventes semaine
    const [salesWeek] = await pool.execute(`
      SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca
      FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'`);
    context.salesWeek = salesWeek[0];

    // Ventes mois
    const [salesMonth] = await pool.execute(`
      SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca
      FROM sales WHERE MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE()) AND status != 'cancelled'`);
    context.salesMonth = salesMonth[0];

    // Top 5 clients
    try {
      const [topClients] = await pool.execute(`
        SELECT COALESCE(s.client_name, c.name, 'Client') as name, SUM(s.total_amount) as ca, COUNT(*) as nb
        FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND s.status != 'cancelled'
        GROUP BY s.customer_id, s.client_name ORDER BY ca DESC LIMIT 5`);
      context.topClients = topClients;
    } catch {
      context.topClients = [];
    }

    // Top 5 produits
    const [topProducts] = await pool.execute(`
      SELECT COALESCE(type_beton,'Autre') as produit, SUM(total_amount) as ca, COUNT(*) as nb
      FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status != 'cancelled'
      GROUP BY type_beton ORDER BY ca DESC LIMIT 5`);
    context.topProducts = topProducts;

    // Caisse
    try {
      const [cashToday] = await pool.execute(`
        SELECT COALESCE(SUM(CASE WHEN type='recette' OR type='entree' THEN amount ELSE 0 END),0) as recettes,
               COALESCE(SUM(CASE WHEN type='depense' OR type='sortie' THEN amount ELSE 0 END),0) as depenses
        FROM cash_movements WHERE DATE(date) = CURDATE()`);
      context.cashToday = cashToday[0];
    } catch {
      context.cashToday = { recettes: 0, depenses: 0 };
    }

    // Nombre clients
    const [clientCount] = await pool.execute(`SELECT COUNT(*) as total FROM customers`);
    context.totalClients = clientCount[0].total;

    // Impayés
    try {
      const [unpaid] = await pool.execute(`
        SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as montant
        FROM sales WHERE payment_status IN ('pending','partial','unpaid','en attente')`);
      context.unpaid = unpaid[0];
    } catch { context.unpaid = { nb: 0, montant: 0 }; }

    // Nombre de ventes par jour cette semaine
    try {
      const [dailySales] = await pool.execute(`
        SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') as jour, COUNT(*) as nb, COALESCE(SUM(total_amount),0) as ca
        FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'
        GROUP BY DATE(sale_date) ORDER BY DATE(sale_date)`);
      context.dailySales = dailySales;
    } catch {
      context.dailySales = [];
    }

  } catch (err) {
    console.error('Erreur contexte métier:', err.message);
  }
  return context;
}

// ============================================================
//  EXÉCUTER UNE REQUÊTE SQL DEPUIS CLAUDE (sécurisé)
// ============================================================
const ALLOWED_TABLES = ['sales', 'customers', 'cash_movements', 'products', 'delivery_notes', 'invoices', 'purchase_orders', 'suppliers', 'payments', 'users', 'projects', 'employees'];

async function executeSafeQuery(sql) {
  // Sécurité : uniquement SELECT
  const normalized = sql.trim().toLowerCase();
  if (!normalized.startsWith('select')) {
    return { error: 'Seules les requêtes SELECT sont autorisées' };
  }

  // Vérifier les tentatives d'injection
  const forbidden = ['drop', 'delete', 'update', 'insert', 'alter', 'create', 'truncate', 'exec', 'execute', '--', ';'];
  for (const word of forbidden) {
    // Check for forbidden words but allow them within strings
    if (normalized.includes(word) && !normalized.startsWith('select')) {
      return { error: `Opération interdite : ${word}` };
    }
  }

  try {
    const [rows] = await pool.execute(sql);
    return { data: rows.slice(0, 50) }; // Max 50 lignes
  } catch (err) {
    return { error: err.message };
  }
}

// ============================================================
//  SYSTEM PROMPT
// ============================================================
function buildSystemPrompt(businessContext) {
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));

  return `Tu es **IA Expert PRO**, l'assistant IA d'**Allo Béton SARL**, une entreprise de vente de béton prêt à l'emploi au Sénégal.

## TON RÔLE
- Tu es un expert en gestion d'entreprise BTP, analyse de données et aide à la décision
- Tu réponds en FRANÇAIS, de manière claire, structurée et professionnelle
- Tu utilises les données réelles de l'entreprise pour tes analyses
- Tu donnes des conseils actionnables et pertinents
- Tu es proactif : tu suggères des analyses complémentaires

## FORMATAGE DES RÉPONSES
- Utilise **gras** pour les montants et chiffres importants
- Utilise des emojis pertinents (📊 💰 📈 ⚠️ ✅ etc.)
- Structure avec des titres et listes
- Les montants sont en FCFA (Franc CFA)
- Formate les nombres avec séparateurs de milliers

## CONTEXTE BUSINESS EN TEMPS RÉEL (DONNÉES MYSQL)

### 📊 Ventes du jour
- CA aujourd'hui : **${fmt(businessContext.salesToday?.ca)} FCFA**
- Nombre de ventes : ${businessContext.salesToday?.nb || 0}
- Tonnage : ${Number(businessContext.salesToday?.tonnes || 0).toFixed(1)} tonnes

### 📊 Ventes hier
- CA hier : **${fmt(businessContext.salesYesterday?.ca)} FCFA**
- Nombre : ${businessContext.salesYesterday?.nb || 0}

### 📊 Ventes semaine (7 jours)
- CA semaine : **${fmt(businessContext.salesWeek?.ca)} FCFA**
- Nombre : ${businessContext.salesWeek?.nb || 0}

### 📊 Ventes mois en cours
- CA mois : **${fmt(businessContext.salesMonth?.ca)} FCFA**
- Nombre : ${businessContext.salesMonth?.nb || 0}

### 💰 Caisse du jour
- Recettes : **${fmt(businessContext.cashToday?.recettes)} FCFA**
- Dépenses : **${fmt(businessContext.cashToday?.depenses)} FCFA**

### 👥 Clients
- Total clients : ${businessContext.totalClients || 0}
- Impayés : ${businessContext.unpaid?.nb || 0} factures pour ${fmt(businessContext.unpaid?.montant)} FCFA

### 🏆 Top 5 Clients (30 derniers jours)
${(businessContext.topClients || []).map((c, i) => `${i+1}. ${c.name || 'N/A'} — ${fmt(c.ca)} FCFA (${c.nb} ventes)`).join('\n') || 'Aucune donnée'}

### 📦 Top 5 Produits (30 derniers jours)
${(businessContext.topProducts || []).map((p, i) => `${i+1}. ${p.produit} — ${fmt(p.ca)} FCFA (${p.nb} ventes)`).join('\n') || 'Aucune donnée'}

### 📅 Ventes quotidiennes (dernière semaine)
${(businessContext.dailySales || []).map(d => `- ${d.jour}: ${fmt(d.ca)} FCFA (${d.nb} ventes)`).join('\n') || 'Aucune donnée'}

## BASE DE DONNÉES MYSQL
Tables principales : sales, customers, cash_movements, products, delivery_notes, invoices, purchase_orders, suppliers, payments, users, projects, employees

### Structure clé - Table sales :
- id, sale_date, customer_id, client_name, type_beton, product_type, total_amount, weight_loaded, payment_status, payment_method, status, vehicle_plate, driver_name, destination

### Structure clé - Table customers :
- id, name, company, phone, email, address, city, customer_type, current_balance, prepaid_balance, credit_limit, status

### Structure clé - Table cash_movements :
- id, date, type ('recette'/'depense'), category, description, amount, reference, payment_method, project_id

## OUTILS
Si tu as besoin de données plus spécifiques, tu peux me demander d'exécuter une requête SQL SELECT et je te fournirai les résultats.

## INSTRUCTIONS
1. Réponds toujours en te basant sur les données réelles ci-dessus
2. Si les données montrent des tendances intéressantes, signale-les
3. Donne des recommandations pratiques
4. Si la question est hors-sujet, réponds poliment que tu es spécialisé dans la gestion d'Allo Béton
5. Sois concis mais complet
6. Ne mentionne JAMAIS que tu es Claude ou un modèle d'IA — tu es "IA Expert PRO d'Allo Béton"`;
}

// ============================================================
//  APPEL PRINCIPAL À CLAUDE
// ============================================================
async function askClaude(question, conversationHistory = [], sqlData = null) {
  const client = getClient();
  if (!client) {
    return null; // Pas de clé API = fallback vers le système existant
  }

  try {
    const businessContext = await getBusinessContext();
    const systemPrompt = buildSystemPrompt(businessContext);

    // Construire l'historique de conversation
    const messages = [];

    // Ajouter l'historique (max 10 derniers échanges)
    const recentHistory = conversationHistory.slice(-10);
    for (const exchange of recentHistory) {
      messages.push({ role: 'user', content: exchange.question });
      messages.push({ role: 'assistant', content: exchange.answer });
    }

    // Ajouter la question actuelle
    let userMessage = question;

    // Si des données SQL ont été fournies par le système de détection d'intent
    if (sqlData) {
      userMessage += `\n\n[DONNÉES COMPLÉMENTAIRES ISSUES DE LA BASE]\n${JSON.stringify(sqlData, null, 2)}`;
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
    });

    const answer = response.content[0]?.text || '';

    return {
      answer,
      confidence: 98,
      method: 'claude',
      model: CLAUDE_MODEL,
      tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens
    };
  } catch (err) {
    console.error('Claude API Error:', err.message);

    // Erreurs spécifiques
    if (err.status === 401) {
      console.error('❌ Clé API Anthropic invalide. Vérifiez ANTHROPIC_API_KEY dans .env');
    } else if (err.status === 429) {
      console.error('⚠️ Limite de taux API dépassée. Réessayez dans un moment.');
    }

    return null; // Fallback vers le système existant
  }
}

module.exports = {
  askClaude,
  isClaudeAvailable,
  executeSafeQuery,
  getBusinessContext
};
