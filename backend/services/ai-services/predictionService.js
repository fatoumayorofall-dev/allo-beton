// ============================================================
//  PREDICTION SERVICE v3.0 — Analyse prédictive des ventes
//  Régression linéaire, moyennes mobiles pondérées,
//  saisonnalité hebdomadaire, prévisions avec intervalles.
// ============================================================
const { pool } = require('../../config/database');

async function getSalesPredictions(options = {}) {
  try {
    const days = options.days || 30;
    const forecastDays = options.forecastDays || 7;

    const [history] = await pool.execute(`
      SELECT DATE(sale_date) as jour,
             COUNT(*) as nb_ventes,
             COALESCE(SUM(total_amount), 0) as ca,
             COALESCE(SUM(weight_loaded), 0) as tonnes
      FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND status != 'cancelled'
      GROUP BY jour ORDER BY jour ASC`, [days]);

    if (history.length < 2) {
      return {
        success: true,
        message: 'Données insuffisantes pour une prédiction fiable (min 2 jours).',
        historical: history.map(r => ({ date: r.jour, ca: Number(r.ca), nb_ventes: Number(r.nb_ventes), tonnes: Number(r.tonnes) })),
        predictions: [],
        insights: [],
        summary: {
          historical_avg: history.length > 0 ? Math.round(Number(history[0].ca)) : 0,
          predicted_total: 0,
          predicted_avg: 0,
          trend: 'stable',
          trend_percentage: '0'
        },
        model: { type: 'Insuffisant', r_squared: '0', weighted_ma: 0 }
      };
    }

    const caValues = history.map(r => Number(r.ca));
    const wma = weightedMovingAverage(caValues, Math.min(7, caValues.length));
    const regression = linearRegression(caValues);
    const weekPattern = detectWeeklyPattern(history);

    const predictions = [];
    const today = new Date();
    for (let i = 1; i <= forecastDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();

      const baseValue = regression.slope * (caValues.length + i) + regression.intercept;
      const seasonFactor = weekPattern[dow] || 1;
      const predicted = Math.max(0, baseValue * seasonFactor);

      const variance = calculateVariance(caValues);
      const confidence = Math.max(20, Math.min(95, 100 - (variance / (wma || 1)) * 50));

      predictions.push({
        date: d.toISOString().split('T')[0],
        dayName: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dow],
        predicted_ca: Math.round(predicted),
        confidence: Math.round(confidence),
        lower_bound: Math.round(predicted * 0.75),
        upper_bound: Math.round(predicted * 1.25)
      });
    }

    const insights = generateInsights(history, caValues, regression, weekPattern);
    const totalPredicted = predictions.reduce((s, p) => s + p.predicted_ca, 0);

    return {
      success: true,
      period: { historicalDays: days, forecastDays },
      summary: {
        historical_avg: Math.round(caValues.reduce((a, b) => a + b, 0) / caValues.length),
        predicted_total: totalPredicted,
        predicted_avg: Math.round(totalPredicted / forecastDays),
        trend: regression.slope > 0 ? 'hausse' : regression.slope < 0 ? 'baisse' : 'stable',
        trend_percentage: caValues.length > 1 ? ((regression.slope / (caValues.reduce((a, b) => a + b, 0) / caValues.length)) * 100).toFixed(1) : '0'
      },
      historical: history.map(r => ({
        date: r.jour,
        ca: Number(r.ca),
        nb_ventes: Number(r.nb_ventes),
        tonnes: Number(r.tonnes)
      })),
      predictions,
      insights,
      model: {
        type: 'Régression linéaire + Saisonnalité hebdomadaire',
        r_squared: regression.r_squared.toFixed(3),
        weighted_ma: Math.round(wma)
      }
    };
  } catch (error) {
    console.error('Prediction Error:', error);
    return { success: false, error: error.message };
  }
}

async function getProductPredictions(options = {}) {
  try {
    const days = options.days || 30;

    const [rows] = await pool.execute(`
      SELECT COALESCE(s.type_beton, 'Autre') as produit,
             DATE(s.sale_date) as jour,
             SUM(s.total_amount) as ca,
             SUM(s.weight_loaded) as tonnes,
             COUNT(*) as nb
      FROM sales s
      WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND s.status != 'cancelled'
      GROUP BY produit, jour ORDER BY produit, jour`, [days]);

    const byProduct = {};
    for (const row of rows) {
      if (!byProduct[row.produit]) byProduct[row.produit] = [];
      byProduct[row.produit].push({ date: row.jour, ca: Number(row.ca), tonnes: Number(row.tonnes), nb: Number(row.nb) });
    }

    const results = [];
    for (const [produit, data] of Object.entries(byProduct)) {
      const values = data.map(d => d.ca);
      const regression = linearRegression(values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      results.push({
        produit,
        jours_actifs: data.length,
        ca_total: Math.round(values.reduce((a, b) => a + b, 0)),
        ca_moyen: Math.round(avg),
        tonnes_total: data.reduce((s, d) => s + d.tonnes, 0).toFixed(1),
        trend: regression.slope > 0 ? 'hausse' : 'baisse',
        trend_pct: avg > 0 ? ((regression.slope / avg) * 100).toFixed(1) : '0',
        next_day_prediction: Math.round(Math.max(0, regression.slope * (values.length + 1) + regression.intercept))
      });
    }

    results.sort((a, b) => b.ca_total - a.ca_total);
    return { success: true, products: results };
  } catch (error) {
    console.error('Product Prediction Error:', error);
    return { success: false, error: error.message };
  }
}

// ---------- STATISTIQUES ----------
function linearRegression(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, r_squared: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }
  const r_squared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, intercept, r_squared: Math.max(0, r_squared) };
}

function weightedMovingAverage(values, window) {
  if (values.length === 0) return 0;
  const w = Math.min(window, values.length);
  const slice = values.slice(-w);
  let totalWeight = 0, weighted = 0;
  for (let i = 0; i < slice.length; i++) {
    const weight = i + 1;
    weighted += slice[i] * weight;
    totalWeight += weight;
  }
  return weighted / totalWeight;
}

function calculateVariance(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

function detectWeeklyPattern(history) {
  const dayTotals = {};
  const dayCounts = {};

  for (const row of history) {
    const dow = new Date(row.jour).getDay();
    dayTotals[dow] = (dayTotals[dow] || 0) + Number(row.ca);
    dayCounts[dow] = (dayCounts[dow] || 0) + 1;
  }

  const overallAvg = Object.values(dayTotals).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.values(dayCounts).reduce((a, b) => a + b, 0));

  const dayAvgs = {};
  for (let d = 0; d < 7; d++) {
    if (dayCounts[d]) {
      dayAvgs[d] = (dayTotals[d] / dayCounts[d]) / (overallAvg || 1);
    } else {
      dayAvgs[d] = 0.5;
    }
  }

  return dayAvgs;
}

function generateInsights(history, caValues, regression, weekPattern) {
  const insights = [];
  const avg = caValues.reduce((a, b) => a + b, 0) / caValues.length;

  const trendPct = avg > 0 ? ((regression.slope / avg) * 100).toFixed(1) : 0;
  if (Math.abs(trendPct) > 5) {
    insights.push({
      type: regression.slope > 0 ? 'positive' : 'warning',
      icon: regression.slope > 0 ? '📈' : '📉',
      text: `Tendance ${regression.slope > 0 ? 'haussière' : 'baissière'} de ${Math.abs(trendPct)}% sur la période.`
    });
  }

  const bestDay = Object.entries(weekPattern).sort((a, b) => b[1] - a[1])[0];
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  if (bestDay && bestDay[1] > 1.1) {
    insights.push({
      type: 'info',
      icon: '📅',
      text: `${dayNames[bestDay[0]]} est votre meilleur jour de CA (+${((bestDay[1] - 1) * 100).toFixed(0)}% vs moyenne).`
    });
  }

  const cv = calculateVariance(caValues) / (avg || 1);
  if (cv > 0.5) {
    insights.push({
      type: 'warning',
      icon: '⚡',
      text: `Forte volatilité du CA (coefficient de variation : ${(cv * 100).toFixed(0)}%). Anticipez les fluctuations.`
    });
  }

  const last = caValues[caValues.length - 1];
  const diff = ((last - avg) / (avg || 1)) * 100;
  if (Math.abs(diff) > 20) {
    insights.push({
      type: diff > 0 ? 'positive' : 'warning',
      icon: diff > 0 ? '🎯' : '⚠️',
      text: `Dernier jour : ${diff > 0 ? '+' : ''}${diff.toFixed(0)}% vs moyenne (${fmt(last)} FCFA vs ${fmt(avg)} FCFA).`
    });
  }

  return insights;
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
}

module.exports = { getSalesPredictions, getProductPredictions };
