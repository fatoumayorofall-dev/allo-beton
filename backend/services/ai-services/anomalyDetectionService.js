// ============================================================
//  ANOMALY DETECTION SERVICE v3.0 — Détection d'anomalies
//  Z-scores, IQR, analyse de patterns et recommandations.
// ============================================================
const { pool } = require('../../config/database');

async function detectAnomalies(options = {}) {
  try {
    const days = options.days || 30;

    const [salesAnomalies, cashAnomalies, weightAnomalies, patternAnomalies] = await Promise.all([
      detectSalesAnomalies(days),
      detectCashAnomalies(days),
      detectWeightAnomalies(days),
      detectPatternAnomalies(days)
    ]);

    const all = [...salesAnomalies, ...cashAnomalies, ...weightAnomalies, ...patternAnomalies];
    all.sort((a, b) => b.severity - a.severity);

    const criticalCount = all.filter(a => a.severity >= 8).length;
    const warningCount = all.filter(a => a.severity >= 5 && a.severity < 8).length;
    const infoCount = all.filter(a => a.severity < 5).length;

    const riskScore = Math.min(100, criticalCount * 20 + warningCount * 8 + infoCount * 2);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      period: `${days} derniers jours`,
      riskScore,
      riskLevel: riskScore >= 70 ? 'critique' : riskScore >= 40 ? 'élevé' : riskScore >= 15 ? 'modéré' : 'faible',
      summary: { total: all.length, critical: criticalCount, warning: warningCount, info: infoCount },
      anomalies: all.slice(0, 20),
      recommendations: generateRecommendations(all)
    };
  } catch (error) {
    console.error('Anomaly Detection Error:', error);
    return { success: false, error: error.message };
  }
}

async function detectSalesAnomalies(days) {
  const anomalies = [];

  const [sales] = await pool.execute(`
    SELECT s.id, s.sale_number, s.total_amount, s.sale_date,
           c.name as client, s.weight_loaded, s.type_beton
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND s.status != 'cancelled'
    ORDER BY s.sale_date DESC`, [days]);

  if (sales.length < 5) return anomalies;

  const amounts = sales.map(s => Number(s.total_amount));
  const stats = calculateStats(amounts);

  for (const sale of sales) {
    const amount = Number(sale.total_amount);
    const zScore = (amount - stats.mean) / (stats.stdDev || 1);

    if (Math.abs(zScore) > 2.5) {
      anomalies.push({
        type: 'sale_amount',
        category: 'Ventes',
        severity: Math.min(10, Math.round(Math.abs(zScore) * 2)),
        icon: zScore > 0 ? '💰' : '⚠️',
        title: zScore > 0 ? 'Vente exceptionnellement élevée' : 'Vente anormalement basse',
        description: `${sale.sale_number} — ${sale.client || 'N/A'} : ${fmt(amount)} FCFA (Z-score: ${zScore.toFixed(1)}, moyenne: ${fmt(stats.mean)} FCFA)`,
        date: sale.sale_date,
        value: amount,
        reference: sale.sale_number
      });
    }
  }

  const [dailySales] = await pool.execute(`
    SELECT DATE(sale_date) as jour, COUNT(*) as nb
    FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND status != 'cancelled'
    GROUP BY jour`, [days]);

  if (dailySales.length < days * 0.5) {
    anomalies.push({
      type: 'low_activity',
      category: 'Activité',
      severity: 6,
      icon: '📉',
      title: 'Activité commerciale faible',
      description: `Seulement ${dailySales.length} jours d'activité sur les ${days} derniers jours (${((dailySales.length / days) * 100).toFixed(0)}%).`,
      date: new Date().toISOString(),
      value: dailySales.length
    });
  }

  return anomalies;
}

async function detectCashAnomalies(days) {
  const anomalies = [];

  const [movements] = await pool.execute(`
    SELECT id, date, type, category, amount, description
    FROM cash_movements WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    ORDER BY date DESC`, [days]);

  if (movements.length < 5) return anomalies;

  const depenses = movements.filter(m => m.type === 'depense');
  const recettes = movements.filter(m => m.type === 'recette');

  if (depenses.length >= 3) {
    const depAmounts = depenses.map(d => Number(d.amount));
    const stats = calculateStats(depAmounts);

    for (const dep of depenses) {
      const amount = Number(dep.amount);
      const zScore = (amount - stats.mean) / (stats.stdDev || 1);

      if (zScore > 2) {
        anomalies.push({
          type: 'expense_spike',
          category: 'Caisse',
          severity: Math.min(9, Math.round(zScore * 2)),
          icon: '🔴',
          title: 'Dépense anormalement élevée',
          description: `${dep.category || 'N/A'} : ${fmt(amount)} FCFA le ${dep.date} (moyenne: ${fmt(stats.mean)} FCFA)`,
          date: dep.date,
          value: amount
        });
      }
    }
  }

  const totalRec = recettes.reduce((s, r) => s + Number(r.amount), 0);
  const totalDep = depenses.reduce((s, d) => s + Number(d.amount), 0);

  if (totalDep > totalRec * 1.2 && totalRec > 0) {
    anomalies.push({
      type: 'cash_imbalance',
      category: 'Caisse',
      severity: 7,
      icon: '⚖️',
      title: 'Déséquilibre de trésorerie',
      description: `Les dépenses (${fmt(totalDep)} FCFA) dépassent les recettes (${fmt(totalRec)} FCFA) de ${((totalDep / totalRec - 1) * 100).toFixed(0)}%.`,
      date: new Date().toISOString(),
      value: totalDep - totalRec
    });
  }

  return anomalies;
}

async function detectWeightAnomalies(days) {
  const anomalies = [];

  const [sales] = await pool.execute(`
    SELECT s.sale_number, s.weight_loaded, s.total_amount, s.type_beton,
           s.sale_date, c.name as client
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND s.status != 'cancelled' AND s.weight_loaded > 0
    ORDER BY s.sale_date DESC`, [days]);

  if (sales.length < 5) return anomalies;

  const ratios = sales.map(s => ({
    ...s,
    prixTonne: Number(s.total_amount) / Number(s.weight_loaded)
  }));

  const ratioValues = ratios.map(r => r.prixTonne);
  const stats = calculateStats(ratioValues);

  for (const sale of ratios) {
    const zScore = (sale.prixTonne - stats.mean) / (stats.stdDev || 1);

    if (Math.abs(zScore) > 2) {
      anomalies.push({
        type: 'weight_price_ratio',
        category: 'Logistique',
        severity: Math.min(8, Math.round(Math.abs(zScore) * 1.5)),
        icon: '🚛',
        title: zScore > 0 ? 'Prix/tonne anormalement élevé' : 'Prix/tonne anormalement bas',
        description: `${sale.sale_number} : ${fmt(sale.prixTonne)} FCFA/t (moy: ${fmt(stats.mean)} FCFA/t) — ${sale.client || 'N/A'}, ${sale.type_beton || 'N/A'}`,
        date: sale.sale_date,
        value: sale.prixTonne,
        reference: sale.sale_number
      });
    }
  }

  return anomalies;
}

async function detectPatternAnomalies(days) {
  const anomalies = [];

  const [clientActivity] = await pool.execute(`
    SELECT c.name, c.id,
           SUM(CASE WHEN s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END) as recent,
           SUM(CASE WHEN s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                     AND s.sale_date < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END) as previous
    FROM customers c LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
    GROUP BY c.id, c.name HAVING previous > 3`,
    [days, days * 2, days]);

  for (const client of clientActivity) {
    if (client.recent === 0 && client.previous > 3) {
      anomalies.push({
        type: 'client_churn_risk',
        category: 'Client',
        severity: 6,
        icon: '👤',
        title: 'Risque de perte de client',
        description: `**${client.name}** : ${client.previous} commandes dans la période précédente, aucune récemment.`,
        date: new Date().toISOString(),
        value: client.previous
      });
    }
  }

  const [avgCheck] = await pool.execute(`
    SELECT
      AVG(CASE WHEN sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN total_amount END) as avg_recent,
      AVG(CASE WHEN sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
               AND sale_date < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN total_amount END) as avg_previous
    FROM sales WHERE status != 'cancelled'`, [days, days * 2, days]);

  if (avgCheck[0].avg_previous && avgCheck[0].avg_recent) {
    const drop = ((avgCheck[0].avg_previous - avgCheck[0].avg_recent) / avgCheck[0].avg_previous) * 100;
    if (drop > 15) {
      anomalies.push({
        type: 'avg_ticket_drop',
        category: 'Ventes',
        severity: 7,
        icon: '📊',
        title: 'Baisse du panier moyen',
        description: `Le panier moyen a baissé de ${drop.toFixed(0)}% : ${fmt(avgCheck[0].avg_recent)} FCFA vs ${fmt(avgCheck[0].avg_previous)} FCFA (période précédente).`,
        date: new Date().toISOString(),
        value: drop
      });
    }
  }

  return anomalies;
}

function generateRecommendations(anomalies) {
  const recs = [];
  const types = new Set(anomalies.map(a => a.type));

  if (types.has('expense_spike')) {
    recs.push({ icon: '💡', text: 'Mettez en place des plafonds de dépenses par catégorie et des validations pour les montants élevés.' });
  }
  if (types.has('cash_imbalance')) {
    recs.push({ icon: '💡', text: 'Rééquilibrez les flux de trésorerie : accélérez les encaissements ou reportez les dépenses non urgentes.' });
  }
  if (types.has('client_churn_risk')) {
    recs.push({ icon: '💡', text: 'Relancez les clients inactifs avec des offres commerciales ciblées.' });
  }
  if (types.has('weight_price_ratio')) {
    recs.push({ icon: '💡', text: 'Vérifiez les grilles tarifaires béton : des écarts de prix/tonne significatifs ont été détectés.' });
  }
  if (types.has('avg_ticket_drop')) {
    recs.push({ icon: '💡', text: 'Analysez la cause de la baisse du panier moyen : changement de mix produit ? Remises excessives ?' });
  }
  if (types.has('low_activity')) {
    recs.push({ icon: '💡', text: 'Intensifiez l\'effort commercial : beaucoup de jours sans aucune vente enregistrée.' });
  }

  if (recs.length === 0) {
    recs.push({ icon: '✅', text: 'Aucune anomalie critique détectée. L\'activité semble normale.' });
  }

  return recs;
}

function calculateStats(values) {
  if (!values.length) return { mean: 0, stdDev: 0, median: 0, q1: 0, q3: 0, iqr: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  return { mean, stdDev, median, q1, q3, iqr: q3 - q1 };
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
}

module.exports = { detectAnomalies };
