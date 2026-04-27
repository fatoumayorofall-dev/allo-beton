/**
 * Service SMS pour Allo Béton
 * Utilise Twilio pour l'envoi de SMS
 */

// Configuration Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Vérifier si Twilio est configuré
const isTwilioConfigured = () => {
  return TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER;
};

// Client Twilio (chargé dynamiquement)
let twilioClient = null;

const getTwilioClient = () => {
  if (!twilioClient && isTwilioConfigured()) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    } catch (error) {
      console.error('❌ Erreur initialisation Twilio:', error.message);
    }
  }
  return twilioClient;
};

/**
 * Formater le numéro de téléphone au format international
 * @param {string} phone - Numéro de téléphone
 * @param {string} countryCode - Code pays (par défaut +221 pour Sénégal)
 * @returns {string} Numéro formaté
 */
const formatPhoneNumber = (phone, countryCode = '+221') => {
  if (!phone) return null;
  
  // Nettoyer le numéro
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  
  // Si déjà au format international
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Supprimer le 0 initial si présent
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  return `${countryCode}${cleaned}`;
};

/**
 * Envoyer un SMS
 * @param {string} to - Numéro de téléphone du destinataire
 * @param {string} message - Message à envoyer
 * @returns {Promise<object>} Résultat de l'envoi
 */
const sendSMS = async (to, message) => {
  const formattedPhone = formatPhoneNumber(to);
  
  if (!formattedPhone) {
    return { success: false, error: 'Numéro de téléphone invalide' };
  }

  // Mode simulation si Twilio n'est pas configuré
  if (!isTwilioConfigured()) {
    console.log('📱 [SIMULATION SMS]');
    console.log(`   📞 Destinataire: ${formattedPhone}`);
    console.log(`   💬 Message: ${message}`);
    console.log('   ℹ️  Twilio non configuré - SMS simulé');
    
    return { 
      success: true, 
      simulated: true,
      message: 'SMS simulé (Twilio non configuré)',
      to: formattedPhone,
      body: message
    };
  }

  try {
    const client = getTwilioClient();
    
    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log(`✅ SMS envoyé à ${formattedPhone} - SID: ${result.sid}`);
    
    return {
      success: true,
      sid: result.sid,
      to: formattedPhone,
      status: result.status
    };
  } catch (error) {
    console.error(`❌ Erreur envoi SMS à ${formattedPhone}:`, error.message);
    
    return {
      success: false,
      error: error.message,
      to: formattedPhone
    };
  }
};

/**
 * Templates de messages SMS
 */
const smsTemplates = {
  // Stock faible
  lowStock: (productName, currentStock, minStock) => 
    `⚠️ ALLO BÉTON - Alerte Stock\n${productName}: ${currentStock} unités (min: ${minStock}).\nRecommandez rapidement !`,

  // Nouvelle vente
  newSale: (customerName, amount, reference) => 
    `💰 ALLO BÉTON - Nouvelle Vente\nClient: ${customerName}\nMontant: ${amount.toLocaleString()} FCFA\nRéf: ${reference}`,

  // Paiement reçu
  paymentReceived: (customerName, amount, reference) => 
    `✅ ALLO BÉTON - Paiement Reçu\nClient: ${customerName}\nMontant: ${amount.toLocaleString()} FCFA\nRéf: ${reference}`,

  // Livraison programmée
  deliveryScheduled: (customerName, date, address) => 
    `🚚 ALLO BÉTON - Livraison Prévue\nClient: ${customerName}\nDate: ${date}\nAdresse: ${address}`,

  // Commande confirmée
  orderConfirmed: (reference, customerName) => 
    `📦 ALLO BÉTON - Commande Confirmée\nRéf: ${reference}\nClient: ${customerName}\nVotre commande est en préparation.`,

  // Message personnalisé
  custom: (message) => `📢 ALLO BÉTON\n${message}`
};

/**
 * Envoyer une notification par SMS selon le type d'événement
 * @param {string} eventType - Type d'événement
 * @param {object} data - Données de l'événement
 * @param {string} phoneNumber - Numéro de téléphone
 * @returns {Promise<object>} Résultat de l'envoi
 */
const sendNotification = async (eventType, data, phoneNumber) => {
  let message = '';

  switch (eventType) {
    case 'low_stock':
      message = smsTemplates.lowStock(data.productName, data.currentStock, data.minStock);
      break;
    
    case 'new_sale':
      message = smsTemplates.newSale(data.customerName, data.amount, data.reference);
      break;
    
    case 'payment_received':
      message = smsTemplates.paymentReceived(data.customerName, data.amount, data.reference);
      break;
    
    case 'delivery_scheduled':
      message = smsTemplates.deliveryScheduled(data.customerName, data.date, data.address);
      break;
    
    case 'order_confirmed':
      message = smsTemplates.orderConfirmed(data.reference, data.customerName);
      break;
    
    default:
      message = smsTemplates.custom(data.message || 'Notification Allo Béton');
  }

  return await sendSMS(phoneNumber, message);
};

/**
 * Envoyer un OTP via WhatsApp (Twilio WhatsApp API)
 * Fallback SMS si WhatsApp non configuré
 */
const sendWhatsAppOTP = async (phone, otp) => {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) return { success: false, error: 'Numéro invalide' };

  const message = `🔐 *Allo Béton* — Votre code de vérification :\n\n*${otp}*\n\nCe code expire dans 10 minutes.\nNe le partagez avec personne.`;

  if (!isTwilioConfigured()) {
    console.log(`📱 [WHATSAPP OTP SIMULÉ] → ${formattedPhone} | Code: ${otp}`);
    return { success: true, simulated: true, otp };
  }

  try {
    const client = getTwilioClient();
    const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    const result = await client.messages.create({
      body: message,
      from: WHATSAPP_FROM,
      to: `whatsapp:${formattedPhone}`
    });
    console.log(`✅ WhatsApp OTP envoyé à ${formattedPhone} - SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (waError) {
    console.warn('⚠️ WhatsApp échoué, fallback SMS:', waError.message);
    return sendSMS(formattedPhone, `Allo Béton - Code: ${otp} (valable 10 min)`);
  }
};

module.exports = {
  sendSMS,
  sendWhatsAppOTP,
  sendNotification,
  smsTemplates,
  formatPhoneNumber,
  isTwilioConfigured
};
