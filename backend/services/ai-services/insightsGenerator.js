// ============================================================
//  INSIGHTS GENERATOR v3.0 — Générateur d'insights automatiques
//  Analyse les données de réponse et produit des observations,
//  comparaisons et recommandations intelligentes.
// ============================================================

function generatePeriodComparison(currentValue, previousValue, label = 'Valeur') {
  if (!previousValue || previousValue === 0) return null;
  const variation = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
  const direction = variation > 0 ? 'hausse' : variation < 0 ? 'baisse' : 'stable';
  const icon = variation > 5 ? '📈' : variation < -5 ? '📉' : '➡️';
  return {
    type: variation > 5 ? 'positive' : variation < -5 ? 'warning' : 'info',
    icon,
    text: `${label} : ${variation > 0 ? '+' : ''}${variation}% (${direction})`,
    value: Number(variation)
  };
}

function generateSmartInsights(data, intent) {
  const insights = [];
  if (!data) return insights;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      insights.push({ type: 'info', icon: 'ℹ️', text: 'Aucune donnée trouvée pour cette requête.' });
      return insights;
    }

    // Concentration
    if (data.length >= 3 && data[0]?.ca !== undefined) {
      const total = data.reduce((s, d) => s + (d.ca || d.value || d.total_amount || 0), 0);
      const topShare = total > 0 ? ((data[0].ca || data[0].value || data[0].total_amount || 0) / total * 100) : 0;
      if (topShare > 40) {
        insights.push({
          type: 'info',
          icon: '🎯',
          text: `Le premier élément concentre ${topShare.toFixed(0)}% du total — forte dépendance.`
        });
      }
    }

    // Évolution temporelle
    if (data.length >= 5 && data[0]?.date) {
      const first = data[0].ca || data[0].value || 0;
      const last = data[data.length - 1].ca || data[data.length - 1].value || 0;
      if (first > 0) {
        const evo = ((last - first) / first * 100).toFixed(0);
        if (Math.abs(evo) > 15) {
          insights.push({
            type: evo > 0 ? 'positive' : 'warning',
            icon: evo > 0 ? '📈' : '📉',
            text: `Évolution de ${evo > 0 ? '+' : ''}${evo}% entre le début et la fin de la période.`
          });
        }
      }
    }
  }

  if (intent === 'unpaid_invoices' && Array.isArray(data)) {
    const total = data.reduce((s, d) => s + (d.total_amount || d.montant || 0), 0);
    if (total > 0) {
      insights.push({
        type: 'warning', icon: '⚠️',
        text: `${fmt(total)} FCFA d'impayés en cours — Accélérez le recouvrement.`
      });
    }
  }

  if (intent === 'customer_inactive' && Array.isArray(data)) {
    if (data.length > 5) {
      insights.push({
        type: 'warning', icon: '😴',
        text: `${data.length} clients inactifs détectés. Envisagez des campagnes de relance.`
      });
    }
  }

  return insights;
}

function generateRecommendations(data, intent) {
  const recs = [];

  if (intent === 'unpaid_invoices') {
    recs.push({ icon: '📞', text: 'Priorisez les relances sur les montants les plus élevés.' });
    recs.push({ icon: '📋', text: 'Mettez en place un suivi hebdomadaire des impayés.' });
  }
  if (intent === 'customer_inactive') {
    recs.push({ icon: '📧', text: 'Envoyez des offres promotionnelles aux clients inactifs.' });
    recs.push({ icon: '📞', text: 'Contactez les clients clés pour comprendre leur inactivité.' });
  }
  if (intent === 'cash_balance') {
    recs.push({ icon: '📊', text: 'Surveillez le ratio recettes/dépenses quotidiennement.' });
  }
  if (intent === 'margin_analysis') {
    recs.push({ icon: '💡', text: 'Analysez les produits à marge faible pour optimiser les prix.' });
  }

  return recs;
}

function getResponseVariation(intent) {
  const variations = {
    greeting: [
      'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
      'Salut ! Je suis prêt à analyser vos données. Que souhaitez-vous savoir ?',
      'Bonjour ! Votre assistant IA est à votre écoute.',
      'Hello ! Posez-moi n\'importe quelle question sur votre activité.'
    ],
    thanks: [
      'Avec plaisir ! N\'hésitez pas si vous avez d\'autres questions.',
      'De rien ! Je suis là pour vous aider.',
      'Content de pouvoir aider ! Autre chose ?',
      'À votre service !'
    ],
    goodbye: [
      'À bientôt ! Bonne continuation.',
      'Au revoir ! N\'hésitez pas à revenir.',
      'À la prochaine ! Bonne journée.'
    ],
    help: [
      'Je peux répondre à de nombreuses questions :\\n\\n**Ventes** — CA, tendances, top clients\\n**Finance** — Caisse, dépenses, impayés, marges\\n**Stock** — Inventaire, mouvements\\n**Logistique** — Tonnage, véhicules, chauffeurs\\n**Factures** — Liste, impayées, par client\\n**Clients** — Actifs, inactifs, endettement\\n**Fournisseurs** — Liste, commandes\\n**E-commerce** — Commandes en ligne\\n\\nEssayez par exemple : "CA du mois" ou "Top 10 clients"'
    ]
  };

  const pool = variations[intent];
  if (!pool || !pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
}

module.exports = {
  generatePeriodComparison,
  generateSmartInsights,
  generateRecommendations,
  getResponseVariation
};
