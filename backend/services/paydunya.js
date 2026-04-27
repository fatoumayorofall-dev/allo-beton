/**
 * ALLO BÉTON — SERVICE PAYDUNYA
 * Gateway de paiement unifié : Wave, Orange Money, Free Money, Carte bancaire
 * Documentation : https://paydunya.com/developers
 */

const paydunya = require('paydunya');

// ─── Configuration PayDunya ─────────────────────────────────────────
const setup = new paydunya.Setup({
  masterKey: process.env.PAYDUNYA_MASTER_KEY || '',
  privateKey: process.env.PAYDUNYA_PRIVATE_KEY || '',
  token: process.env.PAYDUNYA_TOKEN || '',
  mode: process.env.PAYDUNYA_MODE || 'test', // 'test' pour sandbox, 'live' pour production
});

const store = new paydunya.Store({
  name: 'Allo Béton',
  tagline: 'Matériaux de construction professionnels',
  phoneNumber: process.env.PAYDUNYA_STORE_PHONE || '+221 77 000 00 00',
  postalAddress: 'Dakar, Sénégal',
  logoURL: process.env.PAYDUNYA_STORE_LOGO || '',
  websiteURL: process.env.FRONTEND_URL || 'http://localhost:5173',
  callbackURL: process.env.PAYDUNYA_CALLBACK_URL || 'http://localhost:3001/api/ecommerce/payments/webhook/paydunya',
  returnURL: process.env.PAYDUNYA_RETURN_URL || 'http://localhost:5173/shop?view=success',
  cancelURL: process.env.PAYDUNYA_CANCEL_URL || 'http://localhost:5173/shop?view=cart',
});

// ─── Canaux de paiement disponibles ─────────────────────────────────
const PAYMENT_CHANNELS = {
  wave:          'wave-senegal',
  orange_money:  'orange-money-senegal',
  free_money:    'free-money-senegal',
  card:          'card',
  // PayDunya supporte aussi : 'emoney-senegal', 'moov-money', etc.
};

/**
 * Vérifie si PayDunya est configuré (clés présentes)
 */
const isConfigured = () => {
  return !!(
    process.env.PAYDUNYA_MASTER_KEY &&
    process.env.PAYDUNYA_PRIVATE_KEY &&
    process.env.PAYDUNYA_TOKEN
  );
};

/**
 * Créer une facture de paiement PayDunya (Checkout Invoice)
 * @param {Object} options
 * @param {string} options.orderId - ID de la commande
 * @param {string} options.orderNumber - Numéro de commande (ex: CMD-20260313-000001)
 * @param {number} options.amount - Montant total TTC en FCFA
 * @param {string} options.description - Description de la commande
 * @param {Array} options.items - Articles [{name, quantity, unit_price, total_price}]
 * @param {number} options.tax - Montant TVA
 * @param {string} options.method - Méthode de paiement (wave, orange_money, card, cash)
 * @param {Object} options.customer - Infos client {name, email, phone}
 * @returns {Object} { success, token, url, response_text }
 */
const createInvoice = async ({
  orderId,
  orderNumber,
  amount,
  description,
  items = [],
  tax = 0,
  method,
  customer = {},
}) => {
  // Mode simulation si PayDunya pas configuré
  if (!isConfigured()) {
    return simulatePayment({ orderId, orderNumber, amount, method, customer });
  }

  const invoice = new paydunya.CheckoutInvoice(setup, store);

  // Montant total
  invoice.totalAmount = Math.round(amount);

  // Description
  invoice.description = description || `Commande ${orderNumber} - Allo Béton`;

  // Ajouter les articles
  items.forEach((item) => {
    invoice.addItem(
      item.name,
      item.quantity || 1,
      Math.round(item.unit_price || 0),
      Math.round(item.total_price || item.unit_price * (item.quantity || 1)),
      item.description || ''
    );
  });

  // TVA
  if (tax > 0) {
    invoice.addTax('TVA (18%)', Math.round(tax));
  }

  // Restreindre aux canaux demandés
  if (method && method !== 'cash' && PAYMENT_CHANNELS[method]) {
    invoice.addChannel(PAYMENT_CHANNELS[method]);
  } else if (method !== 'cash') {
    // Tous les canaux disponibles
    invoice.addChannels([
      'wave-senegal',
      'orange-money-senegal',
      'free-money-senegal',
      'card',
    ]);
  }

  // Données personnalisées (récupérées dans le callback IPN)
  invoice.addCustomData('order_id', orderId);
  invoice.addCustomData('order_number', orderNumber);
  if (customer.name) invoice.addCustomData('customer_name', customer.name);
  if (customer.email) invoice.addCustomData('customer_email', customer.email);
  if (customer.phone) invoice.addCustomData('customer_phone', customer.phone);

  try {
    await invoice.create();

    return {
      success: true,
      token: invoice.token,
      url: invoice.url, // URL de paiement PayDunya
      status: invoice.status,
      responseText: invoice.responseText,
    };
  } catch (err) {
    console.error('[PayDunya] Erreur création facture:', err.message);
    const errorData = err.data || {};
    return {
      success: false,
      error: errorData.response_text || err.message || 'Erreur PayDunya',
      errorCode: errorData.response_code,
    };
  }
};

/**
 * Vérifier le statut d'un paiement via son token
 * @param {string} token - Token PayDunya de la facture
 * @returns {Object} { success, status, customer, receiptURL, ... }
 */
const checkInvoiceStatus = async (token) => {
  if (!isConfigured()) {
    return simulateStatusCheck(token);
  }

  const invoice = new paydunya.CheckoutInvoice(setup, store);

  try {
    await invoice.confirm(token);

    return {
      success: true,
      status: invoice.status, // 'completed', 'pending', 'cancelled'
      totalAmount: invoice.totalAmount,
      customer: invoice.customer || null,
      receiptURL: invoice.receiptURL || null,
      receiptId: invoice.receipt_identifier || null,
      providerRef: invoice.provider_reference || null,
      customData: invoice.customData || {},
    };
  } catch (err) {
    console.error('[PayDunya] Erreur vérification statut:', err.message);
    return {
      success: false,
      status: 'error',
      error: err.message || 'Impossible de vérifier le statut',
    };
  }
};

// ─── Mode simulation (quand les clés ne sont pas configurées) ───────

const simulatePayment = ({ orderId, orderNumber, amount, method, customer }) => {
  console.log(`[PayDunya SIMULATION] Paiement ${method} de ${amount} FCFA pour commande ${orderNumber}`);

  const token = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

  // Pour le cash, pas besoin de redirection
  if (method === 'cash') {
    return {
      success: true,
      token,
      url: null,
      status: 'pending',
      responseText: 'Paiement en espèces enregistré. En attente de validation.',
      simulation: true,
    };
  }

  const methodLabels = {
    wave: 'Wave',
    orange_money: 'Orange Money',
    free_money: 'Free Money',
    card: 'Carte bancaire',
  };

  return {
    success: true,
    token,
    url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shop?view=success&order=${orderId}&sim=1`,
    status: 'pending',
    responseText: `[SIMULATION] Paiement ${methodLabels[method] || method} initialisé. Configurez vos clés PayDunya pour les vrais paiements.`,
    simulation: true,
  };
};

const simulateStatusCheck = (token) => {
  // En simulation, on considère le paiement comme complété automatiquement
  if (token && token.startsWith('SIM_')) {
    return {
      success: true,
      status: 'completed',
      totalAmount: 0,
      customData: {},
      simulation: true,
    };
  }
  return {
    success: false,
    status: 'error',
    error: 'Token invalide (simulation)',
  };
};

module.exports = {
  setup,
  store,
  isConfigured,
  createInvoice,
  checkInvoiceStatus,
  PAYMENT_CHANNELS,
};
