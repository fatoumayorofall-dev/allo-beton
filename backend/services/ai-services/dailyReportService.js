// ============================================================
//  DAILY REPORT SERVICE v3.0 — Rapport journalier IA
//  Métriques en parallèle, score de performance, insights,
//  recommandations prioritaires.
// ============================================================
const { pool } = require('../../config/database');

async function generateDailyReport(targetDate = null) {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];

    const [
      salesData, cashData, topClients, topProducts,
      deliveryData, unpaidData, previousDay, weekAvg, monthData
    ] = await Promise.all([
      getSalesMetrics(date),
      getCashMetrics(date),
      getTopClients(date),
      getTopProducts(date),
      getDeliveryMetrics(date),
      getUnpaidMetrics(),
      getSalesMetrics(yesterday),
      getWeeklyAverage(date),
      getMonthMetrics(date)
    ]);

    const caVariation = previousDay.ca > 0
      ? ((salesData.ca - previousDay.ca) / previousDay.ca * 100).toFixed(1)
      : salesData.ca > 0 ? 100 : 0;

    const vsWeek = weekAvg.avgCa > 0
      ? ((salesData.ca - weekAvg.avgCa) / weekAvg.avgCa * 100).toFixed(1)
      : 0;

    const performanceScore = calculatePerformanceScore({
      salesData, cashData, unpaidData, deliveryData, weekAvg, caVariation
    });

    const insights = [];

    if (Number(caVariation) > 20) {
      insights.push({ type: 'positive', icon: '🚀', text: `CA en forte hausse de +${caVariation}% vs hier.` });
    } else if (Number(caVariation) < -20) {
      insights.push({ type: 'warning', icon: '📉', text: `CA en baisse de ${caVariation}% vs hier. Analysez les causes.` });
    }

    if (cashData.depenses > salesData.ca * 0.8 && salesData.ca > 0) {
      insights.push({ type: 'danger', icon: '🔴', text: `Dépenses élevées : ${((cashData.depenses / salesData.ca) * 100).toFixed(0)}% du CA. Maîtrisez les coûts.` });
    }

    if (unpaidData.total > salesData.ca * 3) {
      insights.push({ type: 'warning', icon: '⚠️', text: `Les impayés (${fmt(unpaidData.total)} FCFA) représentent ${(unpaidData.total / (salesData.ca || 1)).toFixed(0)}x le CA du jour.` });
    }

    if (salesData.tonnes > 0 && weekAvg.avgTonnes > 0) {
      const tonneVar = ((salesData.tonnes - weekAvg.avgTonnes) / weekAvg.avgTonnes * 100).toFixed(0);
      if (Math.abs(tonneVar) > 15) {
        insights.push({
          type: tonneVar > 0 ? 'positive' : 'info',
          icon: '🚛',
          text: `Tonnage ${tonneVar > 0 ? 'supérieur' : 'inférieur'} de ${Math.abs(tonneVar)}% à la moyenne hebdo.`
        });
      }
    }

    if (deliveryData.total > 0 && deliveryData.completed < deliveryData.total * 0.7) {
      insights.push({
        type: 'warning', icon: '📦',
        text: `Taux de livraison complété : ${((deliveryData.completed / deliveryData.total) * 100).toFixed(0)}%. Objectif > 70%.`
      });
    }

    const recommendations = generateDailyRecommendations({
      salesData, cashData, unpaidData, caVariation, weekAvg, performanceScore
    });

    return {
      success: true,
      date,
      generatedAt: new Date().toISOString(),
      performanceScore,
      performanceLevel: performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Bon' : performanceScore >= 40 ? 'Passable' : 'Critique',
      kpi: {
        ca: salesData.ca,
        ca_variation: caVariation,
        ca_vs_week: vsWeek,
        nb_ventes: salesData.nb,
        panier_moyen: salesData.nb > 0 ? Math.round(salesData.ca / salesData.nb) : 0,
        tonnes: salesData.tonnes,
        recettes: cashData.recettes,
        depenses: cashData.depenses,
        net_cash: cashData.recettes - cashData.depenses,
        marge_estimee: salesData.ca - cashData.depenses,
        unpaid_total: unpaidData.total,
        unpaid_count: unpaidData.count,
        deliveries_completed: deliveryData.completed,
        deliveries_total: deliveryData.total
      },
      comparisons: {
        vs_yesterday: { ca: caVariation, nb: salesData.nb - previousDay.nb },
        vs_week_avg: { ca: vsWeek, nb: salesData.nb - weekAvg.avgNb },
        month_progress: {
          ca_month: monthData.ca,
          target: weekAvg.avgCa * 22,
          progress: weekAvg.avgCa > 0 ? ((monthData.ca / (weekAvg.avgCa * 22)) * 100).toFixed(1) : 0
        }
      },
      topClients,
      topProducts,
      insights,
      recommendations,
      rawData: { sales: salesData, cash: cashData, delivery: deliveryData, unpaid: unpaidData, weekAvg }
    };
  } catch (error) {
    console.error('Daily Report Error:', error);
    return { success: false, error: error.message };
  }
}

async function getSalesMetrics(date) {
  const [rows] = await pool.execute(`
    SELECT COUNT(*) as nb, COALESCE(SUM(total_amount), 0) as ca,
           COALESCE(SUM(weight_loaded), 0) as tonnes,
           COALESCE(AVG(total_amount), 0) as avg_amount
    FROM sales WHERE DATE(sale_date) = ? AND status != 'cancelled'`, [date]);
  const r = rows[0];
  return { nb: Number(r.nb), ca: Number(r.ca), tonnes: Number(r.tonnes), avgAmount: Number(r.avg_amount) };
}

async function getCashMetrics(date) {
  const [rows] = await pool.execute(`
    SELECT type, COALESCE(SUM(amount), 0) as total
    FROM cash_movements WHERE date = ? GROUP BY type`, [date]);
  const data = { recettes: 0, depenses: 0 };
  for (const r of rows) {
    if (r.type === 'recette') data.recettes = Number(r.total);
    if (r.type === 'depense') data.depenses = Number(r.total);
  }
  return data;
}

async function getTopClients(date) {
  const [rows] = await pool.execute(`
    SELECT c.name, SUM(s.total_amount) as ca, COUNT(s.id) as nb
    FROM sales s JOIN customers c ON s.customer_id = c.id
    WHERE DATE(s.sale_date) = ? AND s.status != 'cancelled'
    GROUP BY c.id, c.name ORDER BY ca DESC LIMIT 5`, [date]);
  return rows.map(r => ({ name: r.name, ca: Number(r.ca), nb: Number(r.nb) }));
}

async function getTopProducts(date) {
  const [rows] = await pool.execute(`
    SELECT COALESCE(s.type_beton, 'Autre') as produit, SUM(s.total_amount) as ca,
           SUM(s.weight_loaded) as tonnes, COUNT(*) as nb
    FROM sales s WHERE DATE(s.sale_date) = ? AND s.status != 'cancelled'
    GROUP BY produit ORDER BY ca DESC LIMIT 5`, [date]);
  return rows.map(r => ({ produit: r.produit, ca: Number(r.ca), tonnes: Number(r.tonnes), nb: Number(r.nb) }));
}

async function getDeliveryMetrics(date) {
  try {
    const [rows] = await pool.execute(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as completed
      FROM sales WHERE DATE(sale_date) = ? AND destination IS NOT NULL AND destination != '' AND status != 'cancelled'`, [date]);
    return { total: Number(rows[0].total), completed: Number(rows[0].completed) };
  } catch (e) {
    return { total: 0, completed: 0 };
  }
}

async function getUnpaidMetrics() {
  const [rows] = await pool.execute(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
    FROM sales WHERE payment_status IN ('pending', 'partial', 'overdue') AND status != 'cancelled'`);
  return { count: Number(rows[0].count), total: Number(rows[0].total) };
}

async function getWeeklyAverage(date) {
  const [rows] = await pool.execute(`
    SELECT AVG(daily_ca) as avgCa, AVG(daily_nb) as avgNb, AVG(daily_tonnes) as avgTonnes
    FROM (
      SELECT DATE(sale_date) as d, SUM(total_amount) as daily_ca,
             COUNT(*) as daily_nb, SUM(weight_loaded) as daily_tonnes
      FROM sales WHERE sale_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 1 DAY)
        AND status != 'cancelled'
      GROUP BY d
    ) sub`, [date, date]);
  return {
    avgCa: Number(rows[0].avgCa) || 0,
    avgNb: Number(rows[0].avgNb) || 0,
    avgTonnes: Number(rows[0].avgTonnes) || 0
  };
}

async function getMonthMetrics(date) {
  const yearMonth = date.substring(0, 7);
  const [rows] = await pool.execute(`
    SELECT COALESCE(SUM(total_amount), 0) as ca, COUNT(*) as nb
    FROM sales WHERE DATE_FORMAT(sale_date, '%Y-%m') = ? AND status != 'cancelled'`, [yearMonth]);
  return { ca: Number(rows[0].ca), nb: Number(rows[0].nb) };
}

function calculatePerformanceScore({ salesData, cashData, unpaidData, deliveryData, weekAvg, caVariation }) {
  let score = 50;

  if (weekAvg.avgCa > 0) {
    const ratio = salesData.ca / weekAvg.avgCa;
    score += Math.min(20, Math.max(-20, (ratio - 1) * 30));
  }

  if (salesData.ca > 0) {
    const margeRatio = (salesData.ca - cashData.depenses) / salesData.ca;
    if (margeRatio > 0.3) score += 10;
    else if (margeRatio > 0) score += 5;
    else score -= 10;
  }

  if (unpaidData.count <= 5) score += 5;
  else if (unpaidData.count > 20) score -= 10;

  if (deliveryData.total > 0) {
    const deliveryRate = deliveryData.completed / deliveryData.total;
    if (deliveryRate > 0.8) score += 5;
    else if (deliveryRate < 0.5) score -= 5;
  }

  if (Number(caVariation) > 10) score += 5;
  else if (Number(caVariation) < -30) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateDailyRecommendations({ salesData, cashData, unpaidData, caVariation, weekAvg, performanceScore }) {
  const recs = [];

  if (performanceScore < 40) {
    recs.push({ priority: 'high', icon: '🔴', text: 'Performance critique : organisez une réunion commerciale d\'urgence.' });
  }
  if (Number(caVariation) < -20) {
    recs.push({ priority: 'high', icon: '📞', text: 'Relancez les clients réguliers pour stimuler le CA.' });
  }
  if (cashData.depenses > salesData.ca * 0.7 && salesData.ca > 0) {
    recs.push({ priority: 'medium', icon: '✂️', text: 'Réduisez les dépenses non essentielles : ratio dépenses/CA trop élevé.' });
  }
  if (unpaidData.total > weekAvg.avgCa * 5) {
    recs.push({ priority: 'high', icon: '📋', text: `Priorisez le recouvrement : ${fmt(unpaidData.total)} FCFA d'impayés en cours.` });
  }
  if (salesData.nb === 0) {
    recs.push({ priority: 'high', icon: '🎯', text: 'Aucune vente enregistrée. Vérifiez les opérations commerciales.' });
  }
  if (salesData.ca > weekAvg.avgCa * 1.3 && weekAvg.avgCa > 0) {
    recs.push({ priority: 'low', icon: '🎉', text: 'Excellente journée ! Identifiez les facteurs de succès à reproduire.' });
  }
  if (recs.length === 0) {
    recs.push({ priority: 'low', icon: '✅', text: 'Journée dans les objectifs. Continuez sur cette dynamique.' });
  }

  return recs;
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
}

module.exports = { generateDailyReport };
