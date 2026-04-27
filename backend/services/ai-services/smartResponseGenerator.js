// ============================================================
//  SMART RESPONSE GENERATOR v4.0 — Moteur de réponses ultra-intelligent
//  Génère des réponses riches et détaillées style Claude/ChatGPT
//  en analysant les données MySQL. 100% local, 0 frais API.
// ============================================================
const { pool } = require('../../config/database');

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
const pct = (a, b) => b > 0 ? ((a - b) / b * 100).toFixed(1) : '0';

// ============================================================
//  ENRICHIR UNE RÉPONSE AVEC CONTEXTE + ANALYSE
// ============================================================
async function enrichResponse(baseAnswer, intent, data, question) {
  try {
    const parts = [baseAnswer];

    // Ajouter des analyses contextuelles selon l'intent
    const analysis = await generateContextualAnalysis(intent, data);
    if (analysis) parts.push(analysis);

    // Ajouter des recommandations intelligentes
    const recs = generateSmartRecommendations(intent, data);
    if (recs) parts.push(recs);

    // Ajouter une question de suivi proactive
    const followUp = getProactiveFollowUp(intent);
    if (followUp) parts.push(followUp);

    return parts.join('\n\n');
  } catch (err) {
    return baseAnswer;
  }
}

// ============================================================
//  ANALYSE CONTEXTUELLE AUTOMATIQUE
// ============================================================
async function generateContextualAnalysis(intent, data) {
  try {
    switch (intent) {
      case 'sales_today': {
        const [[yesterday]] = await pool.execute(`
          SELECT COALESCE(SUM(total_amount),0) as ca FROM sales
          WHERE DATE(sale_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND status != 'cancelled'`);
        const [[weekAvg]] = await pool.execute(`
          SELECT COALESCE(AVG(daily_ca),0) as avg_ca FROM (
            SELECT SUM(total_amount) as daily_ca FROM sales
            WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'
            GROUP BY DATE(sale_date)) t`);
        const todayCA = data && Array.isArray(data) ? data.reduce((s, d) => s + (d.value || 0), 0) : 0;
        const yesterdayCA = Number(yesterday.ca);
        const avgCA = Number(weekAvg.avg_ca);

        let analysis = '---\n📊 **Analyse comparative**\n';
        if (yesterdayCA > 0) {
          const variation = pct(todayCA, yesterdayCA);
          const emoji = variation > 0 ? '📈' : variation < 0 ? '📉' : '➡️';
          analysis += `${emoji} vs Hier : **${variation > 0 ? '+' : ''}${variation}%** (${fmt(yesterdayCA)} FCFA)\n`;
        }
        if (avgCA > 0) {
          const variation = pct(todayCA, avgCA);
          const emoji = variation > 5 ? '🔥' : variation < -5 ? '⚠️' : '✅';
          analysis += `${emoji} vs Moyenne 7j : **${variation > 0 ? '+' : ''}${variation}%** (moy. ${fmt(avgCA)} FCFA/j)\n`;
        }

        // Top client du jour
        try {
          const [[topClient]] = await pool.execute(`
            SELECT COALESCE(s.client_name, c.name, 'N/A') as name, SUM(s.total_amount) as ca
            FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
            WHERE DATE(s.sale_date) = CURDATE() AND s.status != 'cancelled'
            GROUP BY name ORDER BY ca DESC LIMIT 1`);
          if (topClient && topClient.name !== 'N/A') {
            analysis += `🏆 Meilleur client du jour : **${topClient.name}** (${fmt(topClient.ca)} FCFA)`;
          }
        } catch {}

        return analysis;
      }

      case 'sales_week':
      case 'sales_month': {
        // Trouver le meilleur et le pire jour
        const period = intent === 'sales_week' ? 7 : 30;
        const [days] = await pool.execute(`
          SELECT DATE_FORMAT(sale_date, '%d/%m') as jour, SUM(total_amount) as ca
          FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND status != 'cancelled'
          GROUP BY DATE(sale_date), jour ORDER BY ca DESC`, [period]);

        if (days.length >= 2) {
          const best = days[0];
          const worst = days[days.length - 1];
          let analysis = '---\n📊 **Points clés**\n';
          analysis += `🔥 Meilleur jour : **${best.jour}** avec **${fmt(best.ca)}** FCFA\n`;
          analysis += `📉 Jour le plus faible : **${worst.jour}** avec **${fmt(worst.ca)}** FCFA\n`;

          // Calcul de régularité
          const values = days.map(d => Number(d.ca));
          const avg = values.reduce((s, v) => s + v, 0) / values.length;
          const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
          const cv = avg > 0 ? (Math.sqrt(variance) / avg * 100).toFixed(0) : 0;
          analysis += cv > 50 ? `⚠️ Forte variabilité des ventes (CV: ${cv}%) — Activité irrégulière` :
                      cv > 30 ? `📊 Variabilité modérée (CV: ${cv}%) — Quelques pics d'activité` :
                      `✅ Activité régulière (CV: ${cv}%) — Bonne stabilité`;
          return analysis;
        }
        return null;
      }

      case 'customer_top': {
        if (!data || !Array.isArray(data) || data.length < 2) return null;
        const total = data.reduce((s, d) => s + (d.value || 0), 0);
        const top1 = data[0];
        const share = total > 0 ? (top1.value / total * 100).toFixed(1) : 0;
        const top3Share = data.slice(0, 3).reduce((s, d) => s + (d.value || 0), 0);
        const top3Pct = total > 0 ? (top3Share / total * 100).toFixed(1) : 0;

        let analysis = '---\n📊 **Analyse de concentration**\n';
        analysis += `🎯 **${top1.name}** représente **${share}%** du CA total\n`;
        analysis += `📊 Top 3 = **${top3Pct}%** du CA (${fmt(top3Share)} FCFA)\n`;

        if (share > 30) {
          analysis += `⚠️ **Forte dépendance** à un seul client — diversification recommandée`;
        } else if (top3Pct > 60) {
          analysis += `💡 Concentration modérée — bonne répartition avec des leaders clairs`;
        } else {
          analysis += `✅ **Portefeuille bien diversifié** — aucune dépendance excessive`;
        }
        return analysis;
      }

      case 'customer_inactive': {
        let analysis = '---\n📊 **Analyse du risque client**\n';
        try {
          const [[stats]] = await pool.execute(`
            SELECT COUNT(*) as total FROM customers WHERE status = 'active'`);
          const [[inactive]] = await pool.execute(`
            SELECT COUNT(*) as nb FROM customers c LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
            GROUP BY c.id HAVING MAX(s.sale_date) < DATE_SUB(CURDATE(), INTERVAL 60 DAY) OR MAX(s.sale_date) IS NULL`);
          const inactivePct = stats.total > 0 ? (inactive.nb / stats.total * 100).toFixed(0) : 0;
          analysis += `📊 Taux d'inactivité : **${inactivePct}%** (${inactive.nb} sur ${stats.total} clients)\n`;
          if (inactivePct > 30) {
            analysis += `🔴 **Taux critique** — Actions urgentes de réactivation nécessaires`;
          } else if (inactivePct > 15) {
            analysis += `🟡 **Taux modéré** — Campagne de relance recommandée`;
          } else {
            analysis += `🟢 **Taux acceptable** — Maintenir les efforts de fidélisation`;
          }
        } catch {}
        return analysis;
      }

      case 'cash_balance':
      case 'cash_receipts':
      case 'cash_expenses': {
        try {
          const [[thisMonth]] = await pool.execute(`
            SELECT COALESCE(SUM(CASE WHEN type='recette' THEN amount ELSE 0 END),0) as rec,
                   COALESCE(SUM(CASE WHEN type='depense' THEN amount ELSE 0 END),0) as dep
            FROM cash_movements WHERE DATE_FORMAT(date,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m')`);
          const rec = Number(thisMonth.rec);
          const dep = Number(thisMonth.dep);
          const marge = rec - dep;
          const ratio = rec > 0 ? (dep / rec * 100).toFixed(0) : 0;

          let analysis = '---\n💰 **Santé financière du mois**\n';
          analysis += `📥 Recettes mois : **${fmt(rec)}** FCFA\n`;
          analysis += `📤 Dépenses mois : **${fmt(dep)}** FCFA\n`;
          analysis += `💎 Solde net : **${fmt(marge)}** FCFA\n`;
          analysis += `📊 Ratio dépenses/recettes : **${ratio}%**\n`;
          analysis += Number(ratio) < 60 ? `🟢 Excellent rapport — les dépenses sont maîtrisées` :
                      Number(ratio) < 80 ? `🟡 Rapport correct — surveillez les sorties de caisse` :
                      `🔴 **Attention** — les dépenses sont élevées par rapport aux recettes`;
          return analysis;
        } catch { return null; }
      }

      case 'unpaid_invoices': {
        let analysis = '---\n⚠️ **Analyse des risques**\n';
        try {
          const [[monthCA]] = await pool.execute(`
            SELECT COALESCE(SUM(total_amount),0) as ca FROM sales
            WHERE DATE_FORMAT(sale_date,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m') AND status != 'cancelled'`);
          const [[totalUnpaid]] = await pool.execute(`
            SELECT COALESCE(SUM(total_amount),0) as total FROM sales
            WHERE payment_status IN ('pending','partial','overdue') AND status != 'cancelled'`);
          const ca = Number(monthCA.ca);
          const unpaid = Number(totalUnpaid.total);
          const ratio = ca > 0 ? (unpaid / ca * 100).toFixed(0) : 0;
          analysis += `📊 Impayés représentent **${ratio}%** du CA mensuel\n`;
          analysis += unpaid > 5000000 ? `🔴 **Montant critique** — Priorisez le recouvrement immédiatement` :
                      unpaid > 1000000 ? `🟡 Montant significatif — Relances téléphoniques recommandées` :
                      `🟢 Montant gérable — Continuez le suivi régulier`;
        } catch {}
        return analysis;
      }

      case 'margin_analysis': {
        let analysis = '---\n📈 **Analyse approfondie**\n';
        try {
          // Marge par produit
          const [products] = await pool.execute(`
            SELECT COALESCE(type_beton, 'Autre') as produit, SUM(total_amount) as ca, COUNT(*) as nb
            FROM sales WHERE DATE_FORMAT(sale_date,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m') AND status != 'cancelled'
            GROUP BY type_beton ORDER BY ca DESC LIMIT 5`);
          if (products.length > 0) {
            analysis += '**Contribution par produit :**\n';
            const totalCA = products.reduce((s, p) => s + Number(p.ca), 0);
            products.forEach(p => {
              const share = totalCA > 0 ? (Number(p.ca) / totalCA * 100).toFixed(0) : 0;
              analysis += `• ${p.produit} : ${fmt(p.ca)} FCFA (${share}%) — ${p.nb} ventes\n`;
            });
          }
        } catch {}
        return analysis;
      }

      case 'general_summary': {
        let analysis = '---\n🧠 **Diagnostic IA**\n';
        try {
          // Tendance
          const [last7] = await pool.execute(`
            SELECT DATE(sale_date) as d, SUM(total_amount) as ca FROM sales
            WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND status != 'cancelled'
            GROUP BY DATE(sale_date) ORDER BY d`);
          if (last7.length >= 7) {
            const firstHalf = last7.slice(0, Math.floor(last7.length / 2));
            const secondHalf = last7.slice(Math.floor(last7.length / 2));
            const avgFirst = firstHalf.reduce((s, d) => s + Number(d.ca), 0) / firstHalf.length;
            const avgSecond = secondHalf.reduce((s, d) => s + Number(d.ca), 0) / secondHalf.length;
            const trend = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst * 100).toFixed(0) : 0;
            analysis += trend > 5 ? `📈 **Tendance haussière** (+${trend}% sur 14j) — Belle dynamique !` :
                        trend < -5 ? `📉 **Tendance baissière** (${trend}% sur 14j) — Vigilance requise` :
                        `➡️ **Tendance stable** — Activité constante`;
          }
        } catch {}
        return analysis;
      }

      default:
        return null;
    }
  } catch (err) {
    return null;
  }
}

// ============================================================
//  RECOMMANDATIONS INTELLIGENTES
// ============================================================
function generateSmartRecommendations(intent, data) {
  const recsMap = {
    sales_today: [
      '💡 Contactez les clients réguliers qui n\'ont pas encore commandé aujourd\'hui',
      '📞 Relancez les devis en attente pour booster le CA de fin de journée',
    ],
    sales_week: [
      '📊 Comparez avec la semaine précédente pour identifier les tendances',
      '🎯 Concentrez-vous sur les produits les plus demandés cette semaine',
    ],
    customer_inactive: [
      '📞 Appelez les 5 premiers clients inactifs — un simple appel peut les réactiver',
      '🎁 Proposez une offre spéciale de retour aux clients dormants',
      '📧 Envoyez un rappel avec vos derniers tarifs et disponibilités',
    ],
    unpaid_invoices: [
      '📞 Priorisez les appels aux débiteurs les plus importants',
      '📋 Instaurez un suivi hebdomadaire strict des encaissements',
      '⚖️ Pour les retards > 90 jours, envisagez une mise en demeure formelle',
    ],
    cash_balance: [
      '📊 Analysez les postes de dépenses les plus élevés pour optimiser',
      '💰 Anticipez les besoins de trésorerie de la semaine prochaine',
    ],
    margin_analysis: [
      '💡 Identifiez les produits à marge faible et ajustez les tarifs',
      '📊 Négociez les prix d\'achat avec vos fournisseurs principaux',
    ],
    customer_top: [
      '🤝 Maintenez une relation privilégiée avec vos meilleurs clients',
      '📦 Proposez des offres de fidélité ou des remises volume',
    ],
    general_summary: [
      '📅 Planifiez une réunion d\'équipe pour analyser ces chiffres',
      '🎯 Fixez des objectifs quotidiens basés sur la moyenne actuelle',
    ],
  };

  const recs = recsMap[intent];
  if (!recs || recs.length === 0) return null;

  // Choisir 1-2 recommandations aléatoirement
  const selected = recs.sort(() => Math.random() - 0.5).slice(0, 2);
  return '---\n💡 **Recommandations**\n' + selected.map(r => `${r}`).join('\n');
}

// ============================================================
//  QUESTIONS DE SUIVI PROACTIVES
// ============================================================
function getProactiveFollowUp(intent) {
  const followUps = {
    sales_today: '💬 *Vous pouvez me demander "top clients du jour" ou "comparer avec hier"*',
    sales_yesterday: '💬 *Demandez "ventes de la semaine" pour voir la tendance complète*',
    sales_week: '💬 *Essayez "tendance des ventes" ou "comparer mois en cours"*',
    sales_month: '💬 *Demandez "analyse de marge" ou "top produits du mois"*',
    customer_top: '💬 *Vous pouvez demander le détail d\'un client ou les "clients inactifs"*',
    customer_inactive: '💬 *Demandez "endettement clients" ou "résumé global" pour plus de contexte*',
    cash_balance: '💬 *Demandez "dépenses du mois" ou "recettes par catégorie" pour détailler*',
    cash_expenses: '💬 *Essayez "analyse de marge" pour voir l\'impact sur la rentabilité*',
    unpaid_invoices: '💬 *Demandez "endettement clients" pour voir les plus gros débiteurs*',
    margin_analysis: '💬 *Essayez "top produits" ou "évolution des ventes" pour aller plus loin*',
    general_summary: '💬 *Posez-moi une question spécifique sur un aspect qui vous intéresse*',
    products_top: '💬 *Demandez "tarifs produits" ou "types de béton vendus" pour détailler*',
    logistics_tonnage: '💬 *Essayez "véhicules" ou "chauffeurs" pour le détail logistique*',
  };

  return followUps[intent] || null;
}

// ============================================================
//  RÉPONSE CONVERSATIONNELLE INTELLIGENTE (FALLBACK ULTIME)
// ============================================================
async function generateConversationalResponse(question) {
  const lower = question.toLowerCase();

  // Détection de salutations avancées
  if (/qui (es-tu|êtes-vous|es tu)/i.test(lower)) {
    return {
      answer: `👋 Je suis **IA Expert PRO**, l'assistant intelligent d'**Allo Béton SARL**.

🧠 **Mes capacités :**
• Analyse des ventes, clients, finances et stock en **temps réel**
• Détection d'anomalies et prédictions de tendances
• Recommandations stratégiques personnalisées
• Mémoire conversationnelle (je retiens le contexte)

📊 **Je couvre l'ensemble de votre activité :**
Ventes • Clients • Caisse • Stock • Factures • Logistique • Fournisseurs • E-commerce

💡 Posez-moi n'importe quelle question en langage naturel !
Par exemple : *"CA du mois"*, *"Top clients"*, *"État de la caisse"*`,
      data: null, chartType: null
    };
  }

  // "Comment ça va" / small talk
  if (/comment .*(va|allez|vas)/i.test(lower) || /ça va|ca va/i.test(lower)) {
    const [[stats]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as ca, COUNT(*) as nb FROM sales
      WHERE DATE(sale_date) = CURDATE() AND status != 'cancelled'`);
    const ca = Number(stats.ca);
    const emoji = ca > 1000000 ? '🔥' : ca > 500000 ? '✅' : ca > 0 ? '📊' : '🌅';
    return {
      answer: `${emoji} Je vais très bien, merci ! Et votre business aussi !\n\n**État en temps réel :** ${stats.nb} ventes aujourd'hui pour **${fmt(ca)} FCFA**\n\n💬 *Que souhaitez-vous analyser ?*`,
      data: null, chartType: null
    };
  }

  // Pourquoi / explique
  if (/pourquoi|explique|comment se fait/i.test(lower)) {
    // Essayer de comprendre le sujet
    if (/baiss|chut|moin|faible/i.test(lower)) {
      return await analyzeDecline(lower);
    }
    if (/augment|hauss|plus|mont/i.test(lower)) {
      return await analyzeGrowth(lower);
    }
  }

  // Que faire / conseil / aide stratégique
  if (/que faire|quoi faire|conseil|recommand|strat[ée]g|am[ée]liorer|optimiser|booster/i.test(lower)) {
    return await generateStrategicAdvice(lower);
  }

  // Prévision / demain / prochain
  if (/demain|prochain|pr[ée]voir|pr[ée]vision|futur|objectif/i.test(lower)) {
    return await generatePrediction();
  }

  // Meilleur moment / quand
  if (/meilleur moment|quand|quel jour|quel heure|pic|peak/i.test(lower)) {
    return await analyzeBestTimes();
  }

  // Problème / risque
  if (/probl[eè]me|risque|danger|attention|alerte|pr[ée]occupant/i.test(lower)) {
    return await identifyRisks();
  }

  // Merci / remerciement
  if (/merci|thanks|bravo|super|parfait|excellent|genial|g[ée]nial|c'est bon|c'est bien/i.test(lower)) {
    return {
      answer: `De rien ! 😊 Je suis là pour vous aider à piloter Allo Béton.\n\n💡 *Besoin d'autre chose ? Demandez-moi n'importe quoi : ventes, clients, caisse, projets, employés...*`,
      data: null, chartType: null
    };
  }

  // Quoi de neuf / résumé du jour
  if (/quoi de neuf|du neuf|nouveau|news|actualit/i.test(lower)) {
    return await generateDailySummary();
  }

  // "Fais un point" / "donne un résumé"
  if (/fais (un |le )?point|donne.*(r[ée]sum|point|bilan)|r[ée]capitul/i.test(lower)) {
    return await generateDailySummary();
  }

  return null; // Pas de réponse conversationnelle -> fallback normal
}

// Résumé quotidien intelligent
async function generateDailySummary() {
  try {
    const [[sales]] = await pool.execute(`SELECT COALESCE(SUM(total_amount),0) as ca, COUNT(*) as nb FROM sales WHERE DATE(sale_date) = CURDATE() AND status != 'cancelled'`);
    const [[cash]] = await pool.execute(`SELECT COALESCE(SUM(CASE WHEN type='recette' THEN amount ELSE 0 END),0) as entrees, COALESCE(SUM(CASE WHEN type='depense' THEN amount ELSE 0 END),0) as sorties FROM cash_movements WHERE DATE(date)=CURDATE()`);
    const [[clients]] = await pool.execute(`SELECT COUNT(*) as nb FROM customers WHERE DATE(created_at) = CURDATE()`);
    const [[invoices]] = await pool.execute(`SELECT COUNT(*) as nb, COALESCE(SUM(total_amount),0) as total FROM invoices WHERE status='unpaid'`);

    const ca = Number(sales.ca);
    const entrees = Number(cash.entrees);
    const sorties = Number(cash.sorties);
    const emoji = ca > 1000000 ? '🔥' : ca > 500000 ? '📈' : ca > 0 ? '📊' : '🌅';

    let answer = `${emoji} **Point de la journée — ${new Date().toLocaleDateString('fr-FR')}**\n\n`;
    answer += `💰 **Ventes** : ${sales.nb} ventes pour **${fmt(ca)} FCFA**\n`;
    answer += `📥 **Caisse** : Entrées ${fmt(entrees)} / Sorties ${fmt(sorties)} = Solde **${fmt(entrees - sorties)} FCFA**\n`;
    answer += `👥 **Nouveaux clients** : ${clients.nb}\n`;
    answer += `📄 **Factures impayées** : ${invoices.nb} pour ${fmt(invoices.total)} FCFA\n`;

    if (ca === 0) answer += `\n⚠️ Aucune vente enregistrée aujourd'hui. C'est un jour calme ou les ventes n'ont pas encore été saisies.`;
    if (Number(invoices.nb) > 5) answer += `\n⚠️ Attention : ${invoices.nb} factures impayées à relancer !`;

    answer += `\n\n💬 *Posez-moi des questions pour approfondir : "top clients", "état du stock", "mes projets"...*`;

    return { answer, data: null, chartType: null };
  } catch (err) {
    return { answer: `Voici un résumé rapide : une erreur est survenue (${err.message}). Essayez "CA du jour" ou "état de la caisse".`, data: null, chartType: null };
  }
}

// ============================================================
//  ANALYSES AVANCÉES
// ============================================================

async function analyzeDecline(question) {
  try {
    const [[thisWeek]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as ca FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'`);
    const [[lastWeek]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as ca FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND sale_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'`);
    const tw = Number(thisWeek.ca);
    const lw = Number(lastWeek.ca);
    const variation = lw > 0 ? ((tw - lw) / lw * 100).toFixed(1) : 0;

    let answer = `🔍 **Analyse de la tendance**\n\n`;
    answer += `📊 CA cette semaine : **${fmt(tw)}** FCFA\n`;
    answer += `📊 CA semaine dernière : **${fmt(lw)}** FCFA\n`;
    answer += `📊 Variation : **${variation > 0 ? '+' : ''}${variation}%**\n\n`;

    // Chercher les causes possibles
    const [clientDrops] = await pool.execute(`
      SELECT c.name, COUNT(CASE WHEN s.sale_date >= DATE_SUB(CURDATE(),INTERVAL 7 DAY) THEN 1 END) as this_week,
             COUNT(CASE WHEN s.sale_date >= DATE_SUB(CURDATE(),INTERVAL 14 DAY) AND s.sale_date < DATE_SUB(CURDATE(),INTERVAL 7 DAY) THEN 1 END) as last_week
      FROM sales s JOIN customers c ON s.customer_id = c.id WHERE s.status != 'cancelled'
      AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      GROUP BY c.id, c.name HAVING last_week > this_week ORDER BY (last_week - this_week) DESC LIMIT 3`);

    if (clientDrops.length > 0) {
      answer += `⚠️ **Clients en baisse d'activité :**\n`;
      clientDrops.forEach(c => {
        answer += `• **${c.name}** : ${c.last_week} commandes → ${c.this_week} cette semaine\n`;
      });
    }

    answer += `\n💡 **Actions suggérées :**\n`;
    answer += `• Contactez les clients habituels qui n'ont pas commandé\n`;
    answer += `• Vérifiez les prix face à la concurrence\n`;
    answer += `• Proposez des promotions ciblées sur les produits phares`;

    return { answer, data: null, chartType: null };
  } catch (err) {
    return { answer: 'Je n\'ai pas assez de données pour analyser cette baisse. Essayez "tendance des ventes" pour un aperçu.', data: null, chartType: null };
  }
}

async function analyzeGrowth(question) {
  try {
    const [[recent]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as ca, COUNT(*) as nb FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'`);

    const [topGrowth] = await pool.execute(`
      SELECT COALESCE(type_beton,'Autre') as produit, SUM(total_amount) as ca, COUNT(*) as nb FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'
      GROUP BY type_beton ORDER BY ca DESC LIMIT 3`);

    let answer = `📈 **Analyse de croissance**\n\n`;
    answer += `CA des 7 derniers jours : **${fmt(recent.ca)}** FCFA (${recent.nb} ventes)\n\n`;
    answer += `🏆 **Produits moteurs de la croissance :**\n`;
    topGrowth.forEach((p, i) => {
      answer += `${i + 1}. **${p.produit}** — ${fmt(p.ca)} FCFA (${p.nb} ventes)\n`;
    });
    answer += `\n💡 **Pour maintenir cette dynamique :**\n`;
    answer += `• Assurez la disponibilité des produits les plus demandés\n`;
    answer += `• Fidélisez les nouveaux clients avec un suivi personnalisé\n`;
    answer += `• Capitalisez sur cette tendance pour négocier vos achats en volume`;

    return { answer, data: null, chartType: null };
  } catch {
    return { answer: 'Excellente dynamique ! Demandez "tendance des ventes" pour les détails.', data: null, chartType: null };
  }
}

async function generateStrategicAdvice(question) {
  try {
    // Collecter les données clés
    const [[todaySales]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as ca, COUNT(*) as nb FROM sales WHERE DATE(sale_date)=CURDATE() AND status!='cancelled'`);
    const [[monthSales]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as ca FROM sales WHERE DATE_FORMAT(sale_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m') AND status!='cancelled'`);
    const [[unpaid]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as nb FROM sales WHERE payment_status IN ('pending','partial','overdue') AND status!='cancelled'`);
    const [[inactiveCount]] = await pool.execute(`
      SELECT COUNT(*) as nb FROM customers c LEFT JOIN sales s ON c.id=s.customer_id AND s.status!='cancelled'
      GROUP BY c.id HAVING MAX(s.sale_date) < DATE_SUB(CURDATE(), INTERVAL 60 DAY) OR MAX(s.sale_date) IS NULL`);

    let answer = `🧠 **Conseils stratégiques personnalisés**\n\n`;
    answer += `Basé sur l'analyse de vos données en temps réel, voici mes recommandations :\n\n`;

    // Priorité 1 - Impayés
    const unpaidAmount = Number(unpaid.total);
    if (unpaidAmount > 0) {
      answer += `🔴 **PRIORITÉ 1 — Recouvrement** (${fmt(unpaidAmount)} FCFA d'impayés)\n`;
      answer += `• Relancez les ${unpaid.nb} factures en attente dès aujourd'hui\n`;
      answer += `• Concentrez-vous sur les 3 plus gros montants\n`;
      answer += `• Envisagez des pénalités de retard pour les récidivistes\n\n`;
    }

    // Priorité 2 - Clients inactifs
    const inactiveNb = Number(inactiveCount?.nb || 0);
    if (inactiveNb > 3) {
      answer += `🟡 **PRIORITÉ 2 — Réactivation clients** (${inactiveNb} inactifs)\n`;
      answer += `• Appelez les 5 clients inactifs les plus importants\n`;
      answer += `• Proposez une offre de retour ciblée\n\n`;
    }

    // Priorité 3 - Croissance
    answer += `🟢 **PRIORITÉ 3 — Développement**\n`;
    answer += `• CA mois en cours : **${fmt(monthSales.ca)} FCFA** — Fixez un objectif quotidien de **${fmt(Number(monthSales.ca) / new Date().getDate() * 1.1)} FCFA**\n`;
    answer += `• Identifiez 3 prospects potentiels cette semaine\n`;
    answer += `• Assurez un suivi proactif de vos meilleurs clients`;

    return { answer, data: null, chartType: null };
  } catch {
    return {
      answer: `🧠 **Conseils généraux**\n\n• Suivez vos KPIs quotidiennement\n• Relancez les impayés en priorité\n• Maintenez la relation avec vos meilleurs clients\n• Diversifiez votre portefeuille client`,
      data: null, chartType: null
    };
  }
}

async function generatePrediction() {
  try {
    const [last7] = await pool.execute(`
      SELECT DATE(sale_date) as d, SUM(total_amount) as ca FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'
      GROUP BY DATE(sale_date) ORDER BY d`);

    const values = last7.map(d => Number(d.ca));
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const trend = values.length >= 3 ? (values[values.length - 1] - values[0]) / values.length : 0;
    const predicted = Math.max(0, avg + trend);

    let answer = `🔮 **Prévision basée sur les 7 derniers jours**\n\n`;
    answer += `📊 Moyenne quotidienne : **${fmt(avg)}** FCFA\n`;
    answer += `📈 Tendance : **${trend > 0 ? '+' : ''}${fmt(trend)}** FCFA/jour\n\n`;
    answer += `🎯 **Estimation pour demain : ${fmt(predicted)} FCFA**\n`;
    answer += `📊 Estimation semaine prochaine : **${fmt(predicted * 6)} FCFA**\n\n`;
    answer += `⚠️ *Ces prévisions sont basées sur une régression linéaire simple. Utilisez l'onglet "Prédictions" pour des analyses plus poussées.*`;

    return { answer, data: null, chartType: null };
  } catch {
    return { answer: 'Consultez l\'onglet **Prédictions** pour une analyse complète avec modèles statistiques.', data: null, chartType: null };
  }
}

async function analyzeBestTimes() {
  try {
    const [byDay] = await pool.execute(`
      SELECT DAYNAME(sale_date) as jour, COUNT(*) as nb, SUM(total_amount) as ca FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) AND status != 'cancelled'
      GROUP BY DAYOFWEEK(sale_date), jour ORDER BY ca DESC`);

    let answer = `📅 **Analyse des meilleurs jours** (90 derniers jours)\n\n`;
    byDay.forEach((d, i) => {
      const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📊';
      answer += `${emoji} **${d.jour}** — ${fmt(d.ca)} FCFA (${d.nb} ventes)\n`;
    });

    if (byDay.length >= 2) {
      answer += `\n💡 **Insight :** **${byDay[0].jour}** est votre meilleur jour — concentrez vos efforts de livraison et de prospection sur ce jour.\n`;
      answer += `⚠️ **${byDay[byDay.length - 1].jour}** est le jour le plus faible — considérez des promotions ce jour-là.`;
    }

    return { answer, data: null, chartType: null };
  } catch {
    return { answer: 'Pas assez de données pour analyser les patterns temporels.', data: null, chartType: null };
  }
}

async function identifyRisks() {
  try {
    let answer = `🛡️ **Analyse des risques — Allo Béton**\n\n`;
    let riskCount = 0;

    // Risque 1 - Impayés
    const [[unpaid]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as nb FROM sales
      WHERE payment_status IN ('pending','partial','overdue') AND status != 'cancelled'`);
    if (Number(unpaid.total) > 500000) {
      riskCount++;
      answer += `🔴 **Risque financier** : ${fmt(unpaid.total)} FCFA d'impayés (${unpaid.nb} factures)\n`;
    }

    // Risque 2 - Concentration client
    const [topClients] = await pool.execute(`
      SELECT c.name, SUM(s.total_amount) as ca FROM sales s
      JOIN customers c ON s.customer_id = c.id
      WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND s.status != 'cancelled'
      GROUP BY c.id ORDER BY ca DESC LIMIT 5`);
    if (topClients.length > 0) {
      const totalCA = topClients.reduce((s, c) => s + Number(c.ca), 0);
      const top1Share = totalCA > 0 ? (Number(topClients[0].ca) / totalCA * 100).toFixed(0) : 0;
      if (top1Share > 30) {
        riskCount++;
        answer += `🟡 **Risque de concentration** : ${topClients[0].name} = ${top1Share}% du CA\n`;
      }
    }

    // Risque 3 - Baisse d'activité
    const [[thisWeek]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as ca FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'`);
    const [[lastWeek]] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount),0) as ca FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND sale_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status != 'cancelled'`);
    if (Number(lastWeek.ca) > 0) {
      const var7 = ((Number(thisWeek.ca) - Number(lastWeek.ca)) / Number(lastWeek.ca) * 100).toFixed(0);
      if (var7 < -15) {
        riskCount++;
        answer += `🔴 **Baisse d'activité** : ${var7}% vs semaine dernière\n`;
      }
    }

    // Risque 4 - Trésorerie
    try {
      const [[cash]] = await pool.execute(`
        SELECT COALESCE(SUM(CASE WHEN type='recette' THEN amount ELSE 0 END),0) as rec,
               COALESCE(SUM(CASE WHEN type='sortie' THEN amount ELSE 0 END),0) as dep
        FROM cash_movements WHERE DATE_FORMAT(date,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m')`);
      if (Number(cash.dep) > Number(cash.rec) * 0.9) {
        riskCount++;
        answer += `🟡 **Risque trésorerie** : dépenses (${fmt(cash.dep)}) proches des recettes (${fmt(cash.rec)})\n`;
      }
    } catch {}

    if (riskCount === 0) {
      answer += `✅ **Aucun risque majeur détecté** — Tous les indicateurs sont au vert !\n`;
    }

    answer += `\n📊 **Score de risque global : ${riskCount}/4** ${riskCount === 0 ? '🟢' : riskCount <= 1 ? '🟡' : '🔴'}`;

    return { answer, data: null, chartType: null };
  } catch {
    return { answer: 'Consultez l\'onglet **Anomalies** pour une détection automatique des risques.', data: null, chartType: null };
  }
}

module.exports = {
  enrichResponse,
  generateContextualAnalysis,
  generateSmartRecommendations,
  getProactiveFollowUp,
  generateConversationalResponse
};
