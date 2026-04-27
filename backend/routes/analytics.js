const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Helper: exécuter une requête en toute sécurité (retourne [] si la table n'existe pas)
async function safeQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return [];
    console.error('Analytics query error:', err.message);
    return [];
  }
}

// Helper: mois FR
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// Helper: calculer la clause de période SQL
function getPeriodClause(field, period, from, to) {
  if (period === 'custom' && from && to) {
    return { sql: `${field} >= ? AND ${field} <= ?`, params: [from, to + ' 23:59:59'] };
  }
  const intervals = { '7d': '7 DAY', '30d': '30 DAY', '90d': '90 DAY', '6m': '6 MONTH', '12m': '12 MONTH' };
  const interval = intervals[period] || '12 MONTH';
  return { sql: `${field} >= DATE_SUB(NOW(), INTERVAL ${interval})`, params: [] };
}

function getPeriodLabel(period, from, to) {
  if (period === 'custom' && from && to) return `Du ${from} au ${to}`;
  const labels = { '7d': '7 derniers jours', '30d': '30 derniers jours', '90d': '3 derniers mois', '6m': '6 derniers mois', '12m': '12 derniers mois' };
  return labels[period] || '12 derniers mois';
}

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS PAR MODULE
// ════════════════════════════════════════════════════════════════════════════

// ─── VENTES ────────────────────────────────────────────────────────────────
async function getSalesAnalytics(period, from, to) {
  const pc = getPeriodClause('created_at', period, from, to);
  const monthlyRevenue = await safeQuery(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, 
           COUNT(*) as count, 
           COALESCE(SUM(total_amount), 0) as revenue
    FROM sales 
    WHERE ${pc.sql}
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month
  `, pc.params);

  const statusDist = await safeQuery(`
    SELECT status, COUNT(*) as count FROM sales WHERE ${pc.sql} GROUP BY status
  `, pc.params);

  const typeBeton = await safeQuery(`
    SELECT COALESCE(type_beton, 'Non spécifié') as label, 
           COUNT(*) as count,
           COALESCE(SUM(total_amount), 0) as revenue
    FROM sales WHERE ${pc.sql} GROUP BY type_beton ORDER BY revenue DESC
  `, pc.params);

  const topCustomers = await safeQuery(`
    SELECT client_name as label, 
           COUNT(*) as count, 
           COALESCE(SUM(total_amount), 0) as value
    FROM sales 
    WHERE client_name IS NOT NULL AND client_name != '' AND ${pc.sql}
    GROUP BY client_name 
    ORDER BY value DESC LIMIT 10
  `, pc.params);

  const dailyTrend = await safeQuery(`
    SELECT DATE(created_at) as day, 
           COUNT(*) as count, 
           COALESCE(SUM(total_amount), 0) as revenue
    FROM sales 
    WHERE ${pc.sql}
    GROUP BY DATE(created_at) ORDER BY day
  `, pc.params);

  const totals = await safeQuery(`
    SELECT COUNT(*) as total, 
           COALESCE(SUM(total_amount), 0) as revenue,
           COALESCE(AVG(total_amount), 0) as avgTicket
    FROM sales WHERE ${pc.sql}
  `, pc.params);

  const t = totals[0] || { total: 0, revenue: 0, avgTicket: 0 };

  return {
    kpis: [
      { label: 'Total Ventes', value: t.total, icon: 'package' },
      { label: 'Chiffre d\'Affaires', value: Number(t.revenue), format: 'currency', icon: 'trending-up' },
      { label: 'Panier Moyen', value: Number(t.avgTicket), format: 'currency', icon: 'bar-chart' },
      { label: 'Nb Commandes', value: monthlyRevenue.length, icon: 'activity' }
    ],
    charts: [
      {
        type: 'bar', title: 'Chiffre d\'Affaires Mensuel (12 mois)',
        data: monthlyRevenue.map(r => ({
          label: MOIS[parseInt(r.month.split('-')[1]) - 1] + ' ' + r.month.split('-')[0].slice(2),
          value: Number(r.revenue), count: r.count
        }))
      },
      {
        type: 'donut', title: 'Répartition par Statut',
        data: statusDist.map(s => ({ label: s.status === 'confirmed' ? 'Confirmé' : s.status === 'draft' ? 'Brouillon' : s.status === 'cancelled' ? 'Annulé' : s.status, value: s.count }))
      },
      {
        type: 'bar', title: 'Ventes par Type de Béton',
        data: typeBeton.map(t => ({ label: t.label, value: Number(t.revenue), count: t.count }))
      },
      {
        type: 'line', title: 'Tendance Journalière (30 jours)',
        data: dailyTrend.map(d => ({ label: new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: Number(d.revenue) }))
      }
    ],
    tables: [
      { title: 'Top 10 Clients par CA', columns: ['Client', 'Nb Ventes', 'CA Total'],
        rows: topCustomers.map(c => [c.label, c.count, formatCurrency(c.value)]) }
    ]
  };
}

// ─── CLIENTS ───────────────────────────────────────────────────────────────
async function getCustomersAnalytics(period, from, to) {
  const pc = getPeriodClause('created_at', period, from, to);

  const monthlyGrowth = await safeQuery(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
    FROM customers WHERE ${pc.sql}
    GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month
  `, pc.params);

  const typeDist = await safeQuery(`
    SELECT COALESCE(customer_type, 'standard') as label, COUNT(*) as value
    FROM customers WHERE ${pc.sql} GROUP BY customer_type
  `, pc.params);

  const statusDist = await safeQuery(`
    SELECT COALESCE(status, 'active') as label, COUNT(*) as value
    FROM customers WHERE ${pc.sql} GROUP BY status
  `, pc.params);

  const topByPurchases = await safeQuery(`
    SELECT c.name as label, COUNT(s.id) as count, COALESCE(SUM(s.total_amount), 0) as value
    FROM customers c LEFT JOIN sales s ON c.id = s.customer_id
    WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY c.id, c.name ORDER BY value DESC LIMIT 10
  `);

  const cityDist = await safeQuery(`
    SELECT COALESCE(city, 'Non renseigné') as label, COUNT(*) as value
    FROM customers WHERE ${pc.sql} GROUP BY city ORDER BY value DESC LIMIT 8
  `, pc.params);

  const totals = await safeQuery(`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN status = 'active' THEN 1 END) as active
    FROM customers WHERE ${pc.sql}
  `, pc.params);

  const t = totals[0] || { total: 0, active: 0 };

  return {
    kpis: [
      { label: 'Total Clients', value: t.total, icon: 'users' },
      { label: 'Clients Actifs', value: t.active, icon: 'user-check' },
      { label: 'Taux Actifs', value: t.total > 0 ? Number((t.active / t.total * 100).toFixed(1)) : 0, format: 'percent', icon: 'activity' },
      { label: 'Nb Villes', value: cityDist.length, icon: 'map-pin' }
    ],
    charts: [
      { type: 'bar', title: 'Inscriptions Mensuelles', data: monthlyGrowth.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: r.count })) },
      { type: 'donut', title: 'Répartition par Type', data: typeDist },
      { type: 'donut', title: 'Statut des Clients', data: statusDist },
      { type: 'bar', title: 'Clients par Ville', data: cityDist }
    ],
    tables: [
      { title: 'Top 10 Clients par Achats', columns: ['Client', 'Nb Achats', 'Montant Total'],
        rows: topByPurchases.map(c => [c.label, c.count, formatCurrency(c.value)]) }
    ]
  };
}

// ─── PRODUITS / STOCK ──────────────────────────────────────────────────────
async function getInventoryAnalytics(period, from, to) {
  const pc = getPeriodClause('created_at', period, from, to);

  const productTypes = await safeQuery(`
    SELECT COALESCE(product_type, 'autre') as label, COUNT(*) as value
    FROM products GROUP BY product_type
  `);

  const stockLevels = await safeQuery(`
    SELECT p.name as label, COALESCE(i.quantity, 0) as value, COALESCE(i.min_stock_level, 0) as min_level
    FROM products p LEFT JOIN inventory_items i ON p.id = i.product_id
    ORDER BY value DESC LIMIT 15
  `);

  const lowStock = await safeQuery(`
    SELECT p.name as label, i.quantity as value, i.min_stock_level as min_level
    FROM inventory_items i JOIN products p ON i.product_id = p.id
    WHERE i.quantity <= i.min_stock_level AND i.min_stock_level > 0
  `);

  const categoryDist = await safeQuery(`
    SELECT COALESCE(c.name, 'Sans catégorie') as label, COUNT(p.id) as value
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    GROUP BY c.name ORDER BY value DESC
  `);

  const salesByProduct = await safeQuery(`
    SELECT COALESCE(type_beton, 'Autre') as label, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as value
    FROM sales WHERE ${pc.sql} GROUP BY type_beton ORDER BY value DESC LIMIT 10
  `, pc.params);

  const totals = await safeQuery(`
    SELECT COUNT(*) as totalProducts,
           (SELECT COUNT(*) FROM inventory_items WHERE quantity > 0) as inStock,
           (SELECT COUNT(*) FROM inventory_items i WHERE i.quantity <= i.min_stock_level AND i.min_stock_level > 0) as lowStockCount
    FROM products
  `);

  const t = totals[0] || { totalProducts: 0, inStock: 0, lowStockCount: 0 };

  return {
    kpis: [
      { label: 'Total Produits', value: t.totalProducts, icon: 'package' },
      { label: 'En Stock', value: t.inStock, icon: 'check-circle' },
      { label: 'Stock Bas', value: t.lowStockCount, icon: 'alert-triangle', change: t.lowStockCount > 0 ? -1 : 0 },
      { label: 'Catégories', value: categoryDist.length, icon: 'grid' }
    ],
    charts: [
      { type: 'bar', title: 'Niveaux de Stock', data: stockLevels },
      { type: 'donut', title: 'Types de Produits', data: productTypes },
      { type: 'donut', title: 'Par Catégorie', data: categoryDist },
      { type: 'bar', title: 'Ventes par Produit', data: salesByProduct.map(s => ({ label: s.label, value: Number(s.value), count: s.count })) }
    ],
    tables: [
      { title: 'Alertes Stock Bas', columns: ['Produit', 'Stock Actuel', 'Stock Min'],
        rows: lowStock.map(s => [s.label, String(Number(s.value)), String(Number(s.min_level))]) }
    ]
  };
}

// ─── FOURNISSEURS ──────────────────────────────────────────────────────────
async function getSuppliersAnalytics(period, from, to) {
  const pc = getPeriodClause('created_at', period, from, to);

  const monthlyOrders = await safeQuery(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as value
    FROM purchase_orders WHERE ${pc.sql}
    GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month
  `, pc.params);

  const statusDist = await safeQuery(`
    SELECT status as label, COUNT(*) as value FROM purchase_orders WHERE ${pc.sql} GROUP BY status
  `, pc.params);

  const topSuppliers = await safeQuery(`
    SELECT s.name as label, COUNT(po.id) as count, COALESCE(SUM(po.total_amount), 0) as value
    FROM suppliers s LEFT JOIN purchase_orders po ON s.id = po.supplier_id
    GROUP BY s.id, s.name ORDER BY value DESC LIMIT 10
  `);

  const totals = await safeQuery(`
    SELECT (SELECT COUNT(*) FROM suppliers) as totalSuppliers,
           COUNT(*) as totalOrders,
           COALESCE(SUM(total_amount), 0) as totalAmount
    FROM purchase_orders WHERE ${pc.sql}
  `, pc.params);

  const t = totals[0] || { totalSuppliers: 0, totalOrders: 0, totalAmount: 0 };

  return {
    kpis: [
      { label: 'Fournisseurs', value: t.totalSuppliers, icon: 'truck' },
      { label: 'Commandes', value: t.totalOrders, icon: 'clipboard' },
      { label: 'Montant Total', value: Number(t.totalAmount), format: 'currency', icon: 'trending-up' },
      { label: 'Moy./Commande', value: t.totalOrders > 0 ? Number((t.totalAmount / t.totalOrders).toFixed(0)) : 0, format: 'currency', icon: 'bar-chart' }
    ],
    charts: [
      { type: 'bar', title: 'Commandes Mensuelles (12 mois)', data: monthlyOrders.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: Number(r.value), count: r.count })) },
      { type: 'donut', title: 'Statut des Commandes', data: statusDist }
    ],
    tables: [
      { title: 'Top Fournisseurs', columns: ['Fournisseur', 'Nb Commandes', 'Montant'],
        rows: topSuppliers.map(s => [s.label, s.count, formatCurrency(s.value)]) }
    ]
  };
}

// ─── PAIEMENTS ─────────────────────────────────────────────────────────────
async function getPaymentsAnalytics(period, from, to) {
  const pc = getPeriodClause('created_at', period, from, to);

  const monthlyPayments = await safeQuery(`
    SELECT DATE_FORMAT(COALESCE(payment_date, created_at), '%Y-%m') as month,
           COUNT(*) as count, COALESCE(SUM(amount), 0) as value
    FROM payments WHERE ${pc.sql}
    GROUP BY month ORDER BY month
  `, pc.params);

  const methodDist = await safeQuery(`
    SELECT COALESCE(payment_method, 'Non spécifié') as label, COUNT(*) as value, COALESCE(SUM(amount), 0) as amount
    FROM payments WHERE ${pc.sql} GROUP BY payment_method ORDER BY amount DESC
  `, pc.params);

  const statusDist = await safeQuery(`
    SELECT COALESCE(status, 'unknown') as label, COUNT(*) as value
    FROM payments WHERE ${pc.sql} GROUP BY status
  `, pc.params);

  const dailyTrend = await safeQuery(`
    SELECT DATE(COALESCE(payment_date, created_at)) as day, COALESCE(SUM(amount), 0) as value
    FROM payments WHERE ${pc.sql}
    GROUP BY day ORDER BY day
  `, pc.params);

  const totals = await safeQuery(`
    SELECT COUNT(*) as total,
           COALESCE(SUM(amount), 0) as totalAmount,
           COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
    FROM payments WHERE ${pc.sql}
  `, pc.params);

  const t = totals[0] || { total: 0, totalAmount: 0, completed: 0, pending: 0 };
  const collectionRate = Number(t.totalAmount) > 0 ? (Number(t.completed) / Number(t.totalAmount) * 100).toFixed(1) : '0';

  return {
    kpis: [
      { label: 'Total Paiements', value: t.total, icon: 'credit-card' },
      { label: 'Montant Encaissé', value: Number(t.completed), format: 'currency', icon: 'check-circle' },
      { label: 'En Attente', value: Number(t.pending), format: 'currency', icon: 'clock', change: Number(t.pending) > 0 ? -1 : 0 },
      { label: 'Taux Recouvrement', value: Number(collectionRate), format: 'percent', icon: 'activity' }
    ],
    charts: [
      { type: 'bar', title: 'Encaissements Mensuels', data: monthlyPayments.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: Number(r.value), count: r.count })) },
      { type: 'donut', title: 'Modes de Paiement', data: methodDist.map(m => ({ label: m.label, value: Number(m.amount) })) },
      { type: 'donut', title: 'Statut des Paiements', data: statusDist },
      { type: 'line', title: 'Tendance Journalière', data: dailyTrend.map(d => ({ label: new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: Number(d.value) })) }
    ],
    tables: []
  };
}

// ─── TRANSPORT ─────────────────────────────────────────────────────────────
async function getTransportAnalytics(period, from, to) {
  const pc = getPeriodClause('created_at', period, from, to);

  const monthlyDeliveries = await safeQuery(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
    FROM delivery_notes WHERE ${pc.sql}
    GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month
  `, pc.params);

  const statusDist = await safeQuery(`
    SELECT COALESCE(status, 'pending') as label, COUNT(*) as value FROM delivery_notes WHERE ${pc.sql} GROUP BY status
  `, pc.params);

  const topClients = await safeQuery(`
    SELECT COALESCE(c.name, 'Inconnu') as label, COUNT(*) as value
    FROM delivery_notes d LEFT JOIN customers c ON d.customer_id = c.id
    WHERE d.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY d.customer_id, c.name ORDER BY value DESC LIMIT 10
  `);

  const dailyTrend = await safeQuery(`
    SELECT DATE(created_at) as day, COUNT(*) as value
    FROM delivery_notes WHERE ${pc.sql}
    GROUP BY DATE(created_at) ORDER BY day
  `, pc.params);

  const totals = await safeQuery(`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
           COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as inTransit
    FROM delivery_notes WHERE ${pc.sql}
  `, pc.params);

  const t = totals[0] || { total: 0, delivered: 0, pending: 0, inTransit: 0 };
  const deliveryRate = t.total > 0 ? (t.delivered / t.total * 100).toFixed(1) : '0';

  return {
    kpis: [
      { label: 'Total Livraisons', value: t.total, icon: 'truck' },
      { label: 'Livrées', value: t.delivered, icon: 'check-circle' },
      { label: 'En Cours', value: t.pending + t.inTransit, icon: 'clock' },
      { label: 'Taux Livraison', value: Number(deliveryRate), format: 'percent', icon: 'activity' }
    ],
    charts: [
      { type: 'bar', title: 'Livraisons Mensuelles (12 mois)', data: monthlyDeliveries.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: r.count })) },
      { type: 'donut', title: 'Statut des Livraisons', data: statusDist.map(s => ({ label: s.label === 'delivered' ? 'Livré' : s.label === 'pending' ? 'En attente' : s.label === 'in_transit' ? 'En transit' : s.label === 'cancelled' ? 'Annulé' : s.label, value: s.value })) },
      { type: 'line', title: 'Tendance Journalière (30j)', data: dailyTrend.map(d => ({ label: new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: d.value })) }
    ],
    tables: [
      { title: 'Top Clients par Livraisons', columns: ['Client', 'Nb Livraisons'],
        rows: topClients.map(c => [c.label, String(c.value)]) }
    ]
  };
}

// ─── CAISSE ────────────────────────────────────────────────────────────────
async function getCashAnalytics(period, from, to) {
  const pc = getPeriodClause('date', period, from, to);

  const monthlyFlow = await safeQuery(`
    SELECT DATE_FORMAT(date, '%Y-%m') as month,
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM cash_movements WHERE ${pc.sql}
    GROUP BY DATE_FORMAT(date, '%Y-%m') ORDER BY month
  `, pc.params);

  const expenseCategories = await safeQuery(`
    SELECT COALESCE(category, 'Autre') as label, COALESCE(SUM(amount), 0) as value
    FROM cash_movements WHERE type = 'expense' AND ${pc.sql}
    GROUP BY category ORDER BY value DESC LIMIT 10
  `, pc.params);

  const incomeCategories = await safeQuery(`
    SELECT COALESCE(category, 'Autre') as label, COALESCE(SUM(amount), 0) as value
    FROM cash_movements WHERE type = 'income' AND ${pc.sql}
    GROUP BY category ORDER BY value DESC LIMIT 10
  `, pc.params);

  const dailyBalance = await safeQuery(`
    SELECT DATE(date) as day,
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
    FROM cash_movements WHERE ${pc.sql}
    GROUP BY DATE(date) ORDER BY day
  `, pc.params);

  const totals = await safeQuery(`
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense,
           COUNT(*) as totalMovements
    FROM cash_movements WHERE ${pc.sql}
  `, pc.params);

  const t = totals[0] || { totalIncome: 0, totalExpense: 0, totalMovements: 0 };
  const balance = Number(t.totalIncome) - Number(t.totalExpense);

  return {
    kpis: [
      { label: 'Total Recettes', value: Number(t.totalIncome), format: 'currency', icon: 'arrow-down-circle' },
      { label: 'Total Dépenses', value: Number(t.totalExpense), format: 'currency', icon: 'arrow-up-circle' },
      { label: 'Solde Net', value: balance, format: 'currency', icon: 'wallet', change: balance >= 0 ? 1 : -1 },
      { label: 'Mouvements', value: t.totalMovements, icon: 'repeat' }
    ],
    charts: [
      { type: 'dual-bar', title: 'Flux de Caisse Mensuel',
        data: monthlyFlow.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: Number(r.income), value2: Number(r.expense) })),
        legend: ['Recettes', 'Dépenses']
      },
      { type: 'donut', title: 'Répartition des Dépenses', data: expenseCategories.map(c => ({ label: c.label, value: Number(c.value) })) },
      { type: 'donut', title: 'Sources de Recettes', data: incomeCategories.map(c => ({ label: c.label, value: Number(c.value) })) },
      { type: 'line', title: 'Solde Journalier (30j)', data: dailyBalance.map(d => ({ label: new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: Number(d.balance) })) }
    ],
    tables: []
  };
}

// ─── BANQUES ───────────────────────────────────────────────────────────────
async function getBanksAnalytics(period, from, to) {
  const accounts = await safeQuery(`
    SELECT ba.account_name as label, ba.current_balance as value, b.name as bank
    FROM bank_accounts ba JOIN banks b ON ba.bank_id = b.id
    ORDER BY ba.current_balance DESC
  `);

  const loanStatus = await safeQuery(`
    SELECT status as label, COUNT(*) as value, COALESCE(SUM(principal_amount), 0) as amount
    FROM bank_loans GROUP BY status
  `);

  const bankDist = await safeQuery(`
    SELECT b.name as label, COUNT(ba.id) as value, COALESCE(SUM(ba.current_balance), 0) as balance
    FROM banks b LEFT JOIN bank_accounts ba ON b.id = ba.bank_id
    GROUP BY b.id, b.name ORDER BY balance DESC
  `);

  const monthlyLoanPayments = await safeQuery(`
    SELECT DATE_FORMAT(due_date, '%Y-%m') as month, COALESCE(SUM(amount), 0) as value
    FROM bank_loan_schedules
    WHERE due_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH) AND due_date <= DATE_ADD(NOW(), INTERVAL 6 MONTH)
    GROUP BY month ORDER BY month
  `);

  const totals = await safeQuery(`
    SELECT (SELECT COUNT(*) FROM banks) as totalBanks,
           (SELECT COUNT(*) FROM bank_accounts) as totalAccounts,
           (SELECT COALESCE(SUM(current_balance), 0) FROM bank_accounts) as totalBalance,
           (SELECT COUNT(*) FROM bank_loans WHERE status = 'en_cours') as activeLoans,
           (SELECT COALESCE(SUM(principal_amount), 0) FROM bank_loans WHERE status = 'en_cours') as loanAmount
  `);

  const t = totals[0] || { totalBanks: 0, totalAccounts: 0, totalBalance: 0, activeLoans: 0, loanAmount: 0 };

  return {
    kpis: [
      { label: 'Banques', value: t.totalBanks, icon: 'building' },
      { label: 'Solde Total', value: Number(t.totalBalance), format: 'currency', icon: 'wallet' },
      { label: 'Prêts Actifs', value: t.activeLoans, icon: 'file-text' },
      { label: 'Encours Prêts', value: Number(t.loanAmount), format: 'currency', icon: 'trending-down', change: Number(t.loanAmount) > 0 ? -1 : 0 }
    ],
    charts: [
      { type: 'bar', title: 'Soldes par Compte', data: accounts.map(a => ({ label: a.label, value: Number(a.value) })) },
      { type: 'donut', title: 'Statut des Prêts', data: loanStatus.map(s => ({ label: s.label === 'active' ? 'Actif' : s.label === 'completed' ? 'Remboursé' : s.label, value: s.value })) },
      { type: 'bar', title: 'Échéances de Prêts (Mensuel)', data: monthlyLoanPayments.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: Number(r.value) })) },
      { type: 'donut', title: 'Répartition par Banque', data: bankDist.map(b => ({ label: b.label, value: Number(b.balance) })) }
    ],
    tables: []
  };
}

// ─── PARTENAIRES ───────────────────────────────────────────────────────────
async function getPartnersAnalytics(period, from, to) {
  const typeDist = await safeQuery(`
    SELECT CASE WHEN company IS NOT NULL AND company != '' THEN 'Entreprise' ELSE 'Particulier' END as label, COUNT(*) as value FROM partners GROUP BY label
  `);

  const statusDist = await safeQuery(`
    SELECT CASE WHEN is_active = 1 THEN 'Actif' ELSE 'Inactif' END as label, COUNT(*) as value FROM partners GROUP BY is_active
  `);

  const pcPay = getPeriodClause('payment_date', period, from, to);
  const monthlyPayments = await safeQuery(`
    SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, COALESCE(SUM(amount), 0) as value
    FROM partner_payments WHERE ${pcPay.sql}
    GROUP BY month ORDER BY month
  `, pcPay.params);

  const topPartners = await safeQuery(`
    SELECT p.name as label, COALESCE(SUM(pp.amount), 0) as value
    FROM partners p LEFT JOIN partner_payments pp ON p.id = pp.partner_id
    GROUP BY p.id, p.name ORDER BY value DESC LIMIT 10
  `);

  const contractStatus = await safeQuery(`
    SELECT status as label, COUNT(*) as value FROM partner_contracts GROUP BY status
  `);

  const totals = await safeQuery(`
    SELECT (SELECT COUNT(*) FROM partners) as totalPartners,
           (SELECT COUNT(*) FROM partner_contracts WHERE status = 'active') as activeContracts,
           (SELECT COALESCE(SUM(amount), 0) FROM partner_payments) as totalPayments,
           (SELECT COALESCE(SUM(invested_amount), 0) FROM partner_contracts) as totalInvestment
  `);

  const t = totals[0] || { totalPartners: 0, activeContracts: 0, totalPayments: 0, totalInvestment: 0 };

  return {
    kpis: [
      { label: 'Partenaires', value: t.totalPartners, icon: 'handshake' },
      { label: 'Contrats Actifs', value: t.activeContracts, icon: 'file-check' },
      { label: 'Investissements', value: Number(t.totalInvestment), format: 'currency', icon: 'trending-up' },
      { label: 'Versements', value: Number(t.totalPayments), format: 'currency', icon: 'credit-card' }
    ],
    charts: [
      { type: 'donut', title: 'Types de Partenaires', data: typeDist },
      { type: 'donut', title: 'Statut des Contrats', data: contractStatus },
      { type: 'bar', title: 'Versements Mensuels', data: monthlyPayments.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: Number(r.value) })) }
    ],
    tables: [
      { title: 'Top Partenaires par Versements', columns: ['Partenaire', 'Montant Total'],
        rows: topPartners.map(p => [p.label, formatCurrency(p.value)]) }
    ]
  };
}

// ─── RH ────────────────────────────────────────────────────────────────────
async function getHRAnalytics(period, from, to) {
  const deptDist = await safeQuery(`
    SELECT COALESCE(department, 'Non assigné') as label, COUNT(*) as value
    FROM employees GROUP BY department ORDER BY value DESC
  `);

  const positionDist = await safeQuery(`
    SELECT COALESCE(position, 'Non assigné') as label, COUNT(*) as value
    FROM employees GROUP BY position ORDER BY value DESC LIMIT 10
  `);

  const monthlySalaries = await safeQuery(`
    SELECT CONCAT(payment_year, '-', LPAD(payment_month, 2, '0')) as month,
           COALESCE(SUM(net_salary), 0) as value, COUNT(*) as count
    FROM salary_payments
    GROUP BY payment_year, payment_month ORDER BY month DESC LIMIT 12
  `);

  const pcReq = getPeriodClause('request_date', period, from, to);
  const advanceTrend = await safeQuery(`
    SELECT DATE_FORMAT(request_date, '%Y-%m') as month, COUNT(*) as count, COALESCE(SUM(amount), 0) as value
    FROM salary_advances WHERE ${pcReq.sql}
    GROUP BY month ORDER BY month
  `, pcReq.params);

  const salaryStatusDist = await safeQuery(`
    SELECT status as label, COUNT(*) as value FROM salary_payments GROUP BY status
  `);

  const totals = await safeQuery(`
    SELECT (SELECT COUNT(*) FROM employees) as totalEmployees,
           (SELECT COUNT(*) FROM employees WHERE status = 'active') as activeEmployees,
           (SELECT COALESCE(SUM(net_salary), 0) FROM salary_payments WHERE status = 'paid') as totalPaid,
           (SELECT COALESCE(SUM(amount), 0) FROM salary_advances WHERE status = 'approved') as totalAdvances
  `);

  const t = totals[0] || { totalEmployees: 0, activeEmployees: 0, totalPaid: 0, totalAdvances: 0 };

  return {
    kpis: [
      { label: 'Employés', value: t.totalEmployees, icon: 'users' },
      { label: 'Actifs', value: t.activeEmployees, icon: 'user-check' },
      { label: 'Masse Salariale', value: Number(t.totalPaid), format: 'currency', icon: 'banknote' },
      { label: 'Avances', value: Number(t.totalAdvances), format: 'currency', icon: 'arrow-up-right' }
    ],
    charts: [
      { type: 'bar', title: 'Masse Salariale Mensuelle', data: monthlySalaries.reverse().map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: Number(r.value), count: r.count })) },
      { type: 'donut', title: 'Employés par Département', data: deptDist },
      { type: 'donut', title: 'Statut des Bulletins', data: salaryStatusDist.map(s => ({ label: s.label === 'paid' ? 'Payé' : s.label === 'draft' ? 'Brouillon' : s.label, value: s.value })) },
      { type: 'bar', title: 'Avances sur Salaire (12 mois)', data: advanceTrend.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: Number(r.value) })) }
    ],
    tables: [
      { title: 'Répartition par Poste', columns: ['Poste', 'Effectif'],
        rows: positionDist.map(p => [p.label, String(p.value)]) }
    ]
  };
}

// ─── E-COMMERCE ────────────────────────────────────────────────────────────
async function getEcommerceAnalytics(period, from, to) {
  const pc = getPeriodClause('created_at', period, from, to);

  const monthlyOrders = await safeQuery(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count, COALESCE(SUM(total), 0) as value
    FROM ecom_orders WHERE ${pc.sql}
    GROUP BY month ORDER BY month
  `, pc.params);

  const statusDist = await safeQuery(`
    SELECT COALESCE(status, 'pending') as label, COUNT(*) as value FROM ecom_orders WHERE ${pc.sql} GROUP BY status
  `, pc.params);

  const topProducts = await safeQuery(`
    SELECT p.name as label, COALESCE(SUM(oi.quantity), 0) as count, COALESCE(SUM(oi.total), 0) as value
    FROM ecom_order_items oi JOIN ecom_products p ON oi.product_id = p.id
    GROUP BY p.id, p.name ORDER BY value DESC LIMIT 10
  `);

  const paymentMethods = await safeQuery(`
    SELECT COALESCE(payment_status, 'Autre') as label, COUNT(*) as value
    FROM ecom_orders WHERE ${pc.sql} GROUP BY payment_status ORDER BY value DESC
  `, pc.params);

  const totalsRows = await safeQuery(`
    SELECT COUNT(*) as totalOrders,
           COALESCE(SUM(total), 0) as totalRevenue,
           (SELECT COUNT(*) FROM ecom_customers) as totalCustomers,
           (SELECT COUNT(*) FROM ecom_products WHERE is_active = 1) as activeProducts
    FROM ecom_orders WHERE ${pc.sql}
  `, pc.params);

  const t = totalsRows[0] || { totalOrders: 0, totalRevenue: 0, totalCustomers: 0, activeProducts: 0 };

  return {
    kpis: [
      { label: 'Commandes', value: t.totalOrders, icon: 'shopping-cart' },
      { label: 'Revenu Total', value: Number(t.totalRevenue), format: 'currency', icon: 'trending-up' },
      { label: 'Clients E-com', value: t.totalCustomers, icon: 'users' },
      { label: 'Produits Actifs', value: t.activeProducts, icon: 'package' }
    ],
    charts: [
      { type: 'bar', title: 'Commandes Mensuelles (12 mois)', data: monthlyOrders.map(r => ({ label: MOIS[parseInt(r.month.split('-')[1]) - 1], value: Number(r.value), count: r.count })) },
      { type: 'donut', title: 'Statut des Commandes', data: statusDist },
      { type: 'donut', title: 'Modes de Paiement', data: paymentMethods }
    ],
    tables: [
      { title: 'Top Produits E-commerce', columns: ['Produit', 'Quantité', 'Revenu'],
        rows: topProducts.map(p => [p.label, String(p.count), formatCurrency(p.value)]) }
    ]
  };
}

// Helper format
function formatCurrency(value) {
  return Number(value).toLocaleString('fr-FR') + ' F';
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════

const MODULE_HANDLERS = {
  sales: getSalesAnalytics,
  customers: getCustomersAnalytics,
  inventory: getInventoryAnalytics,
  suppliers: getSuppliersAnalytics,
  payments: getPaymentsAnalytics,
  transport: getTransportAnalytics,
  cash: getCashAnalytics,
  banks: getBanksAnalytics,
  partners: getPartnersAnalytics,
  hr: getHRAnalytics,
  ecommerce: getEcommerceAnalytics,
};

router.get('/:module', authenticateToken, async (req, res) => {
  try {
    const handler = MODULE_HANDLERS[req.params.module];
    if (!handler) {
      return res.status(404).json({ error: 'Module analytique inconnu' });
    }
    const { period = '12m', from, to } = req.query;
    const data = await handler(String(period), from ? String(from) : null, to ? String(to) : null);
    // Ajouter un résumé textuel autoamtique
    if (data.kpis && data.kpis.length > 0 && !data.summary) {
      const parts = data.kpis.map(k => {
        let val = k.value;
        if (k.format === 'currency') val = Number(val) >= 1e6 ? (Number(val) / 1e6).toFixed(1) + 'M F' : Number(val).toLocaleString('fr-FR') + ' F';
        else if (k.format === 'percent') val = val + '%';
        return `${k.label}: ${val}`;
      });
      data.summary = `${getPeriodLabel(period, from, to)} — ${parts.join(' | ')}`;
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error(`❌ Erreur analytics ${req.params.module}:`, err.message, err.stack);
    res.json({ success: true, data: { kpis: [], charts: [], tables: [] } });
  }
});

module.exports = router;
