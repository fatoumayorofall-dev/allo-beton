/**
 * ALLO BÉTON - SERVICE DE PAIEMENT MULTI-GATEWAY
 * Intégrations: Wave, Orange Money, Stripe, Virement Bancaire
 */

const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ====================================================================
// CONFIGURATION DES GATEWAYS
// ====================================================================

const GATEWAYS_CONFIG = {
  wave: {
    apiKey: process.env.WAVE_API_KEY,
    secretKey: process.env.WAVE_SECRET_KEY,
    endpoint: process.env.WAVE_ENDPOINT || 'https://api.wave.com/v1',
    webhookSecret: process.env.WAVE_WEBHOOK_SECRET,
  },
  orange_money: {
    clientId: process.env.ORANGE_CLIENT_ID,
    clientSecret: process.env.ORANGE_CLIENT_SECRET,
    merchantKey: process.env.ORANGE_MERCHANT_KEY,
    endpoint: process.env.ORANGE_ENDPOINT || 'https://api.orange.com/omapi/v1',
    webhookSecret: process.env.ORANGE_WEBHOOK_SECRET,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
};

// ====================================================================
// WAVE MOBILE MONEY
// ====================================================================

class WavePaymentGateway {
  /**
   * Crée un paiement Wave
   */
  static async createPayment(order, returnUrl, webhookUrl) {
    try {
      const paymentData = {
        amount: Math.round(order.total_amount),
        currency: 'XOF',
        error_url: `${returnUrl}?status=error&order=${order.id}`,
        success_url: `${returnUrl}?status=success&order=${order.id}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_phone: order.delivery_phone,
        },
      };

      const response = await axios.post(
        `${GATEWAYS_CONFIG.wave.endpoint}/checkout/sessions`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${GATEWAYS_CONFIG.wave.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        paymentId: response.data.id,
        paymentUrl: response.data.wave_launch_url,
        reference: response.data.id,
      };
    } catch (error) {
      console.error('Wave Payment Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Vérifie la signature du webhook Wave
   */
  static verifyWebhookSignature(payload, signature) {
    const computedSignature = crypto
      .createHmac('sha256', GATEWAYS_CONFIG.wave.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedSignature === signature;
  }

  /**
   * Traite le webhook Wave
   */
  static async handleWebhook(payload, signature) {
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error('Signature webhook invalide');
    }

    const { type, data } = payload;

    if (type === 'checkout.session.completed') {
      const orderId = data.metadata.order_id;

      // Mise à jour du paiement
      await db.query(
        `UPDATE payments
         SET status = 'confirmed',
             transaction_reference = ?,
             webhook_payload = ?,
             confirmed_at = NOW()
         WHERE order_id = ? AND payment_gateway = 'wave'`,
        [data.id, JSON.stringify(payload), orderId]
      );

      // Mise à jour de la commande
      await db.query(
        `UPDATE orders
         SET payment_status = 'confirmed',
             status = 'confirmed'
         WHERE id = ?`,
        [orderId]
      );

      return { success: true, orderId };
    }

    if (type === 'checkout.session.failed') {
      const orderId = data.metadata.order_id;

      await db.query(
        `UPDATE payments
         SET status = 'failed',
             error_message = ?,
             failed_at = NOW()
         WHERE order_id = ? AND payment_gateway = 'wave'`,
        [data.error_message || 'Paiement échoué', orderId]
      );

      await db.query(
        `UPDATE orders
         SET payment_status = 'failed'
         WHERE id = ?`,
        [orderId]
      );

      return { success: false, orderId };
    }

    return { success: true };
  }
}

// ====================================================================
// ORANGE MONEY
// ====================================================================

class OrangeMoneyGateway {
  /**
   * Obtient un token d'authentification Orange
   */
  static async getAccessToken() {
    try {
      const auth = Buffer.from(
        `${GATEWAYS_CONFIG.orange_money.clientId}:${GATEWAYS_CONFIG.orange_money.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        `${GATEWAYS_CONFIG.orange_money.endpoint}/oauth/v2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Orange Auth Error:', error.response?.data || error.message);
      throw new Error('Impossible d\'obtenir le token Orange Money');
    }
  }

  /**
   * Crée un paiement Orange Money
   */
  static async createPayment(order) {
    try {
      const accessToken = await this.getAccessToken();

      const paymentData = {
        merchant_key: GATEWAYS_CONFIG.orange_money.merchantKey,
        currency: 'OUV',
        order_id: order.order_number,
        amount: Math.round(order.total_amount),
        return_url: `${process.env.FRONTEND_URL}/payment/callback/orange`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        notif_url: `${process.env.BACKEND_URL}/api/webhooks/orange-money`,
        lang: 'fr',
        reference: order.id,
      };

      const response = await axios.post(
        `${GATEWAYS_CONFIG.orange_money.endpoint}/webpayment/v1/paymentinit`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        paymentId: response.data.pay_token,
        paymentUrl: response.data.payment_url,
        reference: response.data.pay_token,
      };
    } catch (error) {
      console.error('Orange Payment Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Vérifie le statut d'un paiement Orange
   */
  static async checkPaymentStatus(payToken) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${GATEWAYS_CONFIG.orange_money.endpoint}/webpayment/v1/transactionstatus`,
        {
          pay_token: payToken,
          merchant_key: GATEWAYS_CONFIG.orange_money.merchantKey,
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Orange Status Check Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Traite le webhook Orange Money
   */
  static async handleWebhook(payload) {
    const { status, order_id, txnid } = payload;

    if (status === 'SUCCESS') {
      await db.query(
        `UPDATE payments
         SET status = 'confirmed',
             transaction_reference = ?,
             webhook_payload = ?,
             confirmed_at = NOW()
         WHERE order_id = ? AND payment_gateway = 'orange_money'`,
        [txnid, JSON.stringify(payload), order_id]
      );

      await db.query(
        `UPDATE orders
         SET payment_status = 'confirmed',
             status = 'confirmed'
         WHERE id = ?`,
        [order_id]
      );

      return { success: true, orderId: order_id };
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
      await db.query(
        `UPDATE payments
         SET status = 'failed',
             error_message = ?,
             failed_at = NOW()
         WHERE order_id = ? AND payment_gateway = 'orange_money'`,
        [payload.error_message || 'Paiement échoué', order_id]
      );

      await db.query(
        `UPDATE orders
         SET payment_status = 'failed'
         WHERE id = ?`,
        [order_id]
      );

      return { success: false, orderId: order_id };
    }

    return { success: true };
  }
}

// ====================================================================
// STRIPE (Carte Bancaire)
// ====================================================================

class StripeGateway {
  /**
   * Crée un PaymentIntent Stripe
   */
  static async createPayment(order) {
    try {
      const stripe = require('stripe')(GATEWAYS_CONFIG.stripe.secretKey);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.total_amount), // En centimes
        currency: 'xof',
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
        },
        description: `Commande #${order.order_number} - Allo Béton`,
      });

      return {
        success: true,
        paymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        reference: paymentIntent.id,
      };
    } catch (error) {
      console.error('Stripe Payment Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Traite le webhook Stripe
   */
  static async handleWebhook(payload, signature) {
    try {
      const stripe = require('stripe')(GATEWAYS_CONFIG.stripe.secretKey);

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        GATEWAYS_CONFIG.stripe.webhookSecret
      );

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.order_id;

        await db.query(
          `UPDATE payments
           SET status = 'confirmed',
               transaction_reference = ?,
               webhook_payload = ?,
               confirmed_at = NOW()
           WHERE order_id = ? AND payment_gateway = 'stripe'`,
          [paymentIntent.id, JSON.stringify(event), orderId]
        );

        await db.query(
          `UPDATE orders
           SET payment_status = 'confirmed',
               status = 'confirmed'
           WHERE id = ?`,
          [orderId]
        );

        return { success: true, orderId };
      }

      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.order_id;

        await db.query(
          `UPDATE payments
           SET status = 'failed',
               error_message = ?,
               failed_at = NOW()
           WHERE order_id = ? AND payment_gateway = 'stripe'`,
          [paymentIntent.last_payment_error?.message || 'Paiement échoué', orderId]
        );

        await db.query(
          `UPDATE orders
           SET payment_status = 'failed'
           WHERE id = ?`,
          [orderId]
        );

        return { success: false, orderId };
      }

      return { success: true };
    } catch (error) {
      console.error('Stripe Webhook Error:', error.message);
      throw error;
    }
  }
}

// ====================================================================
// VIREMENT BANCAIRE
// ====================================================================

class BankTransferGateway {
  /**
   * Génère les instructions de virement
   */
  static async createPayment(order) {
    const bankDetails = {
      bank_name: 'Banque de l\'Habitat du Sénégal',
      account_holder: 'ALLO BÉTON SARL',
      account_number: 'SN08 1234 5678 9012 3456 7890 12',
      swift_code: 'BHSENDAM',
      iban: 'SN08 1234 5678 9012 3456 7890 12',
      reference: order.order_number,
      amount: order.total_amount,
    };

    return {
      success: true,
      bankDetails,
      instructions: `Veuillez effectuer un virement de ${order.total_amount} FCFA en mentionnant la référence: ${order.order_number}`,
    };
  }

  /**
   * Confirme manuellement un virement (admin seulement)
   */
  static async confirmPayment(orderId, adminId) {
    try {
      await db.query(
        `UPDATE payments
         SET status = 'confirmed',
             confirmed_at = NOW(),
             webhook_payload = JSON_OBJECT('confirmed_by', ?, 'confirmed_at', NOW())
         WHERE order_id = ? AND payment_gateway = 'bank_transfer'`,
        [adminId, orderId]
      );

      await db.query(
        `UPDATE orders
         SET payment_status = 'confirmed',
             status = 'confirmed'
         WHERE id = ?`,
        [orderId]
      );

      // Log l'action admin
      await db.query(
        `INSERT INTO logs (type, message, context, user_id)
         VALUES ('payment', 'Virement bancaire confirmé manuellement', JSON_OBJECT('order_id', ?), ?)`,
        [orderId, adminId]
      );

      return { success: true };
    } catch (error) {
      console.error('Bank Transfer Confirmation Error:', error);
      return { success: false, error: error.message };
    }
  }
}

// ====================================================================
// SERVICE PRINCIPAL
// ====================================================================

class PaymentService {
  /**
   * Initialise un paiement selon le gateway choisi
   */
  static async initiatePayment(order, paymentMethod) {
    let result;

    switch (paymentMethod) {
      case 'wave':
        result = await WavePaymentGateway.createPayment(order);
        break;

      case 'orange_money':
        result = await OrangeMoneyGateway.createPayment(order);
        break;

      case 'stripe':
        result = await StripeGateway.createPayment(order);
        break;

      case 'bank_transfer':
        result = await BankTransferGateway.createPayment(order);
        break;

      default:
        return { success: false, error: 'Méthode de paiement non supportée' };
    }

    if (result.success) {
      // Enregistrer le paiement dans la DB
      const paymentId = uuidv4();
      await db.query(
        `INSERT INTO payments (id, order_id, payment_gateway, transaction_reference, amount, currency, status, payment_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          order.id,
          paymentMethod,
          result.reference || null,
          order.total_amount,
          'XOF',
          paymentMethod === 'bank_transfer' ? 'pending' : 'processing',
          result.paymentUrl || null,
        ]
      );

      return { ...result, paymentId };
    }

    return result;
  }

  /**
   * Traite un webhook selon le gateway
   */
  static async handleWebhook(gateway, payload, signature) {
    switch (gateway) {
      case 'wave':
        return await WavePaymentGateway.handleWebhook(payload, signature);

      case 'orange_money':
        return await OrangeMoneyGateway.handleWebhook(payload);

      case 'stripe':
        return await StripeGateway.handleWebhook(payload, signature);

      default:
        throw new Error('Gateway inconnu');
    }
  }
}

module.exports = {
  PaymentService,
  WavePaymentGateway,
  OrangeMoneyGateway,
  StripeGateway,
  BankTransferGateway,
};
