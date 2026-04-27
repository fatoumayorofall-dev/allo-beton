// ============================================================
//  CONVERSATION MANAGER v3.0 — Gestion mémoire conversationnelle
//  Sessions, contexte, résolution de pronoms, suggestions,
//  nettoyage automatique des sessions expirées.
// ============================================================

class ConversationManager {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min
    this.MAX_HISTORY = 20;

    // Nettoyage automatique toutes les 5 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
  }

  _cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(id);
      }
    }
  }

  getSession(sessionId) {
    if (!sessionId) sessionId = 'default';
    let session = this.sessions.get(sessionId);

    if (session) {
      if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        session = null;
      }
    }

    if (!session) {
      session = {
        id: sessionId,
        history: [],
        lastIntent: null,
        lastClientName: null,
        lastProductType: null,
        lastPeriod: null,
        lastData: null,
        turnCount: 0,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      this.sessions.set(sessionId, session);
    }

    session.lastActivity = Date.now();
    return session;
  }

  addExchange(sessionId, question, intent, answer, data = null, entities = {}) {
    const session = this.getSession(sessionId);
    session.history.push({
      question,
      intent,
      answer: (answer || '').substring(0, 300),
      timestamp: Date.now()
    });

    if (session.history.length > this.MAX_HISTORY) {
      session.history = session.history.slice(-this.MAX_HISTORY);
    }

    session.lastIntent = intent;
    session.turnCount++;
    if (data) session.lastData = data;
    if (entities.clientName) session.lastClientName = entities.clientName;
    if (entities.productType) session.lastProductType = entities.productType;
    if (entities.period) session.lastPeriod = entities.period;
    if (entities.month) session.lastMonth = entities.month;

    return session;
  }

  resolveContext(sessionId, question, entities) {
    const session = this.getSession(sessionId);
    const resolved = { ...entities };
    const resolvedFrom = [];
    const lower = question.toLowerCase();

    if (/\b(ses|son|sa|leurs?)\s/i.test(lower) && session.lastClientName && !resolved.clientName) {
      resolved.clientName = session.lastClientName;
      resolvedFrom.push(`client "${session.lastClientName}" (contexte)`);
    }

    if (/\b(ce client|cette cliente|celui-ci|celle-ci)\b/i.test(lower) && session.lastClientName && !resolved.clientName) {
      resolved.clientName = session.lastClientName;
      resolvedFrom.push(`client "${session.lastClientName}" (référence)`);
    }

    if (/\b(ce produit|ce béton|ce type)\b/i.test(lower) && session.lastProductType && !resolved.productType) {
      resolved.productType = session.lastProductType;
      resolvedFrom.push(`produit "${session.lastProductType}" (contexte)`);
    }

    return {
      entities: resolved,
      resolvedFrom,
      isFollowUp: resolvedFrom.length > 0 || session.turnCount > 0,
      turnCount: session.turnCount,
      lastIntent: session.lastIntent
    };
  }

  getContextSummary(sessionId) {
    const session = this.getSession(sessionId);
    return {
      turnCount: session.turnCount,
      lastIntent: session.lastIntent,
      lastClientName: session.lastClientName,
      lastProductType: session.lastProductType,
      lastPeriod: session.lastPeriod,
      historyCount: session.history.length,
      sessionAge: Math.round((Date.now() - session.createdAt) / 1000) + 's'
    };
  }

  getContextualSuggestions(sessionId) {
    const session = this.getSession(sessionId);
    const intent = session.lastIntent;
    const client = session.lastClientName;

    const suggestionsMap = {
      sales_today: [
        { text: 'CA de cette semaine', icon: '📊', type: 'related' },
        { text: 'Top clients du jour', icon: '🏆', type: 'drill' },
        { text: 'Compare avec hier', icon: '📈', type: 'compare' }
      ],
      sales_month: [
        { text: 'Tendance des ventes', icon: '📈', type: 'related' },
        { text: 'Top 10 clients du mois', icon: '🏆', type: 'drill' },
        { text: 'Compare avec le mois dernier', icon: '📊', type: 'compare' }
      ],
      sales_week: [
        { text: 'Ventes aujourd\'hui', icon: '📊', type: 'related' },
        { text: 'Évolution de la semaine', icon: '📈', type: 'trend' }
      ],
      customer_top: [
        { text: 'Détails du premier client', icon: '👤', type: 'drill' },
        { text: 'Clients inactifs', icon: '😴', type: 'related' },
        { text: 'Endettement clients', icon: '💳', type: 'related' }
      ],
      customer_details: [
        client ? { text: 'Ses factures', icon: '🧾', type: 'drill' } : null,
        client ? { text: 'Son historique de paiement', icon: '💳', type: 'drill' } : null,
        { text: 'Top 10 clients', icon: '🏆', type: 'related' }
      ].filter(Boolean),
      cash_balance: [
        { text: 'Recettes du mois', icon: '📥', type: 'drill' },
        { text: 'Dépenses du mois', icon: '📤', type: 'drill' },
        { text: 'Historique de caisse', icon: '📊', type: 'related' }
      ],
      invoices_list: [
        { text: 'Factures impayées', icon: '⚠️', type: 'filter' },
        { text: 'CA du mois', icon: '💰', type: 'related' }
      ],
      products_top: [
        { text: 'Tarifs des produits', icon: '💲', type: 'related' },
        { text: 'Ventes par produit', icon: '📊', type: 'drill' }
      ],
      unpaid_invoices: [
        { text: 'Relances à faire', icon: '📞', type: 'action' },
        { text: 'Détail par client', icon: '👤', type: 'drill' },
        { text: 'État de la caisse', icon: '🏦', type: 'related' }
      ],
      general_summary: [
        { text: 'Détail des ventes', icon: '📊', type: 'drill' },
        { text: 'État de la caisse', icon: '🏦', type: 'drill' },
        { text: 'Anomalies détectées', icon: '⚠️', type: 'related' }
      ],
      greeting: [
        { text: 'Résumé global du jour', icon: '📊', type: 'quick' },
        { text: 'CA d\'aujourd\'hui', icon: '💰', type: 'quick' },
        { text: 'État de la caisse', icon: '🏦', type: 'quick' }
      ],
      logistics_tonnage: [
        { text: 'Détail par véhicule', icon: '🚛', type: 'drill' },
        { text: 'Destinations principales', icon: '📍', type: 'related' }
      ],
      stock_status: [
        { text: 'Mouvements de stock', icon: '📦', type: 'drill' },
        { text: 'Alertes de stock bas', icon: '⚠️', type: 'filter' }
      ]
    };

    const defaults = [
      { text: 'Résumé global', icon: '📊', type: 'quick' },
      { text: 'Ventes du jour', icon: '💰', type: 'quick' },
      { text: 'État de la caisse', icon: '🏦', type: 'quick' }
    ];

    return suggestionsMap[intent] || defaults;
  }
}

const conversationManager = new ConversationManager();

module.exports = { conversationManager, ConversationManager };
