/**
 * Service Email pour Allo Béton
 * Utilise Nodemailer avec Gmail SMTP
 */

const nodemailer = require('nodemailer');

// Configuration SMTP (priorité aux variables SMTP_*, fallback Gmail)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || 'contact@allobeton.sn';
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || null;
const SMTP_FROM = process.env.SMTP_FROM || `"Allo Béton" <${SMTP_USER}>`;

// Vérifier si l'email est configuré
const isGmailConfigured = () => !!(SMTP_USER && SMTP_PASS);

// Créer le transporteur
let transporter = null;

const getTransporter = () => {
  if (!transporter && isGmailConfigured()) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: { rejectUnauthorized: false }
    });
  }
  return transporter;
};

/**
 * Envoyer un email
 * @param {string} to - Email du destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} text - Contenu texte
 * @param {string} html - Contenu HTML (optionnel)
 * @returns {Promise<object>} Résultat de l'envoi
 */
const sendEmail = async (to, subject, text, html = null, attachments = []) => {
  if (!to) {
    return { success: false, error: 'Adresse email invalide' };
  }

  // Mode simulation si Gmail n'est pas configuré
  if (!isGmailConfigured()) {
    console.log('📧 [SIMULATION EMAIL]');
    console.log(`   📬 Destinataire: ${to}`);
    console.log(`   📝 Sujet: ${subject}`);
    console.log(`   💬 Message: ${text.substring(0, 100)}...`);
    if (attachments.length > 0) console.log(`   📎 Pièces jointes: ${attachments.map(a => a.filename).join(', ')}`);
    console.log('   ℹ️  Gmail non configuré - Email simulé');
    
    return { 
      success: true, 
      simulated: true,
      message: 'Email simulé (Gmail non configuré - Mot de passe d\'application requis)',
      to,
      subject,
      info: 'Pour activer les emails réels, configurez GMAIL_APP_PASSWORD'
    };
  }

  try {
    const mailOptions = {
      from: SMTP_FROM,
      to,
      subject,
      text,
      html: html || `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #4F46E5;">🏗️ Allo Béton</h2>
        <p>${text.replace(/\n/g, '<br>')}</p>
        <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">
          Cet email a été envoyé automatiquement par le système Allo Béton.
        </p>
      </div>`,
      ...(attachments.length > 0 ? { attachments } : {})
    };

    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);

    console.log('✅ Email envoyé:', info.messageId);
    return { 
      success: true, 
      messageId: info.messageId,
      to,
      subject
    };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Logo HTML réutilisable dans tous les emails Allo Béton
 */
const EMAIL_LOGO_HTML = `
  <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 0;">
    <tr>
      <td style="vertical-align: middle; padding-right: 12px;">
        <!-- Icône chantier SVG inline -->
        <div style="width:48px;height:48px;background:rgba(255,255,255,0.18);border-radius:14px;display:inline-block;text-align:center;line-height:48px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:10px;">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2v3H7zM11 8h2v3h-2zM15 8h2v3h-2z"/>
          </svg>
        </div>
      </td>
      <td style="vertical-align: middle;">
        <div style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.5px;line-height:1;">ALLO BÉTON</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.65);letter-spacing:2.5px;margin-top:3px;text-transform:uppercase;">Matériaux BTP · Sénégal</div>
      </td>
    </tr>
  </table>
`;

/**
 * Templates d'emails par type d'événement
 */
const emailTemplates = {
  new_sale: (data) => ({
    subject: `🛒 Nouvelle vente #${data.saleId || 'N/A'}`,
    text: `Une nouvelle vente a été enregistrée.\n\nClient: ${data.customerName || 'N/A'}\nMontant: ${data.amount || 0} FCFA\nDate: ${new Date().toLocaleDateString('fr-FR')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛒 Nouvelle Vente</h1>
        </div>
        <div style="background: #F9FAFB; padding: 20px; border: 1px solid #E5E7EB;">
          <p><strong>Référence:</strong> #${data.saleId || 'N/A'}</p>
          <p><strong>Client:</strong> ${data.customerName || 'N/A'}</p>
          <p><strong>Montant:</strong> <span style="color: #10B981; font-weight: bold;">${data.amount || 0} FCFA</span></p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <div style="background: #4F46E5; color: white; padding: 10px; text-align: center; border-radius: 0 0 10px 10px;">
          <small>Allo Béton - Système de gestion</small>
        </div>
      </div>
    `
  }),

  payment_received: (data) => ({
    subject: `💰 Paiement reçu - ${data.amount || 0} FCFA`,
    text: `Un paiement a été reçu.\n\nClient: ${data.customerName || 'N/A'}\nMontant: ${data.amount || 0} FCFA\nMode: ${data.paymentMethod || 'N/A'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">💰 Paiement Reçu</h1>
        </div>
        <div style="background: #F9FAFB; padding: 20px; border: 1px solid #E5E7EB;">
          <p><strong>Client:</strong> ${data.customerName || 'N/A'}</p>
          <p><strong>Montant:</strong> <span style="color: #10B981; font-weight: bold;">${data.amount || 0} FCFA</span></p>
          <p><strong>Mode de paiement:</strong> ${data.paymentMethod || 'N/A'}</p>
        </div>
        <div style="background: #10B981; color: white; padding: 10px; text-align: center; border-radius: 0 0 10px 10px;">
          <small>Allo Béton - Système de gestion</small>
        </div>
      </div>
    `
  }),

  low_stock: (data) => ({
    subject: `⚠️ Alerte Stock Bas - ${data.productName || 'Produit'}`,
    text: `Attention: Le stock du produit "${data.productName}" est bas.\n\nQuantité actuelle: ${data.currentStock || 0}\nSeuil minimum: ${data.minStock || 10}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⚠️ Alerte Stock Bas</h1>
        </div>
        <div style="background: #FEF3C7; padding: 20px; border: 1px solid #F59E0B;">
          <p><strong>Produit:</strong> ${data.productName || 'N/A'}</p>
          <p><strong>Quantité actuelle:</strong> <span style="color: #DC2626; font-weight: bold;">${data.currentStock || 0}</span></p>
          <p><strong>Seuil minimum:</strong> ${data.minStock || 10}</p>
          <p style="color: #92400E;"><em>Veuillez réapprovisionner ce produit rapidement.</em></p>
        </div>
        <div style="background: #F59E0B; color: white; padding: 10px; text-align: center; border-radius: 0 0 10px 10px;">
          <small>Allo Béton - Système de gestion</small>
        </div>
      </div>
    `
  }),

  delivery_complete: (data) => ({
    subject: `🚚 Livraison effectuée - ${data.customerName || 'Client'}`,
    text: `La livraison a été effectuée avec succès.\n\nClient: ${data.customerName || 'N/A'}\nAdresse: ${data.address || 'N/A'}\nChauffeur: ${data.driver || 'N/A'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🚚 Livraison Effectuée</h1>
        </div>
        <div style="background: #F9FAFB; padding: 20px; border: 1px solid #E5E7EB;">
          <p><strong>Client:</strong> ${data.customerName || 'N/A'}</p>
          <p><strong>Adresse:</strong> ${data.address || 'N/A'}</p>
          <p><strong>Chauffeur:</strong> ${data.driver || 'N/A'}</p>
          <p style="color: #10B981;">✅ Livraison confirmée</p>
        </div>
        <div style="background: #3B82F6; color: white; padding: 10px; text-align: center; border-radius: 0 0 10px 10px;">
          <small>Allo Béton - Système de gestion</small>
        </div>
      </div>
    `
  }),

  quota_alert: (data) => ({
    subject: `📊 Quota Client - ${data.customerName || 'Client'}`,
    text: `Alerte quota client.\n\nClient: ${data.customerName || 'N/A'}\nQuota utilisé: ${data.usedQuota || 0}%\nQuota restant: ${data.remainingQuota || 0} m³`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">📊 Alerte Quota</h1>
        </div>
        <div style="background: #F9FAFB; padding: 20px; border: 1px solid #E5E7EB;">
          <p><strong>Client:</strong> ${data.customerName || 'N/A'}</p>
          <p><strong>Quota utilisé:</strong> ${data.usedQuota || 0}%</p>
          <p><strong>Quota restant:</strong> ${data.remainingQuota || 0} m³</p>
        </div>
        <div style="background: #8B5CF6; color: white; padding: 10px; text-align: center; border-radius: 0 0 10px 10px;">
          <small>Allo Béton - Système de gestion</small>
        </div>
      </div>
    `
  }),

  // ── Templates E-Commerce ────────────────────────────────────

  ecom_order_confirmed: (data) => ({
    subject: `✅ Commande ${data.orderNumber} confirmée — Allo Béton`,
    text: `Bonjour ${data.customerName},\n\nVotre commande ${data.orderNumber} a été confirmée avec succès.\n\nMontant total: ${data.total} FCFA\nStatut: Confirmée\n\nMerci pour votre confiance !\nL'équipe Allo Béton`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">✅ Commande Confirmée</h1>
          <p style="color: #D1FAE5; margin: 8px 0 0; font-size: 14px;">${data.orderNumber}</p>
        </div>
        <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB;">
          <p style="margin: 0 0 12px;">Bonjour <strong>${data.customerName}</strong>,</p>
          <p>Votre commande a été confirmée et est en cours de préparation.</p>
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>N° Commande:</strong> ${data.orderNumber}</p>
            <p style="margin: 4px 0;"><strong>Articles:</strong> ${data.itemCount || '—'} produit(s)</p>
            <p style="margin: 4px 0;"><strong>Montant Total:</strong> <span style="color: #10B981; font-weight: bold; font-size: 18px;">${data.total} FCFA</span></p>
            ${data.shippingAddress ? `<p style="margin: 4px 0;"><strong>Livraison:</strong> ${data.shippingAddress}</p>` : ''}
          </div>
          <p style="color: #6B7280; font-size: 13px;">Vous recevrez un email lorsque votre commande sera expédiée.</p>
        </div>
        <div style="background: #059669; color: white; padding: 12px; text-align: center; border-radius: 0 0 12px 12px;">
          <small>Allo Béton — Matériaux de construction professionnels</small>
        </div>
      </div>
    `
  }),

  ecom_payment_success: (data) => ({
    subject: `💳 Paiement reçu — Commande ${data.orderNumber} — Allo Béton`,
    text: `Bonjour ${data.customerName},\n\nNous avons bien reçu votre paiement de ${data.amount} FCFA pour la commande ${data.orderNumber}.\n\nMéthode: ${data.method}\n\nMerci !\nL'équipe Allo Béton`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">💳 Paiement Reçu</h1>
        </div>
        <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB;">
          <p>Bonjour <strong>${data.customerName}</strong>,</p>
          <p>Nous confirmons la réception de votre paiement :</p>
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Commande:</strong> ${data.orderNumber}</p>
            <p style="margin: 4px 0;"><strong>Montant payé:</strong> <span style="color: #10B981; font-weight: bold;">${data.amount} FCFA</span></p>
            <p style="margin: 4px 0;"><strong>Méthode:</strong> ${data.method}</p>
            ${data.receiptUrl ? `<p style="margin: 8px 0;"><a href="${data.receiptUrl}" style="color: #3B82F6;">Voir le reçu PayDunya</a></p>` : ''}
          </div>
        </div>
        <div style="background: #1D4ED8; color: white; padding: 12px; text-align: center; border-radius: 0 0 12px 12px;">
          <small>Allo Béton — Matériaux de construction professionnels</small>
        </div>
      </div>
    `
  }),

  ecom_order_shipped: (data) => ({
    subject: `🚚 Commande ${data.orderNumber} expédiée — Allo Béton`,
    text: `Bonjour ${data.customerName},\n\nVotre commande ${data.orderNumber} a été expédiée.\n\nAdresse de livraison: ${data.shippingAddress || 'N/A'}\n\nL'équipe Allo Béton`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🚚 Commande Expédiée</h1>
        </div>
        <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB;">
          <p>Bonjour <strong>${data.customerName}</strong>,</p>
          <p>Votre commande <strong>${data.orderNumber}</strong> est en route !</p>
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
            ${data.shippingAddress ? `<p style="margin: 4px 0;"><strong>Livraison à:</strong> ${data.shippingAddress}</p>` : ''}
            <p style="margin: 4px 0;"><strong>Montant:</strong> ${data.total} FCFA</p>
          </div>
        </div>
        <div style="background: #D97706; color: white; padding: 12px; text-align: center; border-radius: 0 0 12px 12px;">
          <small>Allo Béton — Matériaux de construction professionnels</small>
        </div>
      </div>
    `
  }),

  ecom_order_cancelled: (data) => ({
    subject: `❌ Commande ${data.orderNumber} annulée — Allo Béton`,
    text: `Bonjour ${data.customerName},\n\nVotre commande ${data.orderNumber} a été annulée.\nRaison: ${data.reason || 'N/A'}\n\nSi vous avez des questions, contactez-nous.\n\nL'équipe Allo Béton`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #EF4444, #DC2626); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">❌ Commande Annulée</h1>
        </div>
        <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB;">
          <p>Bonjour <strong>${data.customerName}</strong>,</p>
          <p>Votre commande <strong>${data.orderNumber}</strong> a été annulée.</p>
          <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Raison:</strong> ${data.reason || 'À la demande du client'}</p>
            ${data.refundAmount ? `<p style="margin: 4px 0;"><strong>Remboursement:</strong> ${data.refundAmount} FCFA</p>` : ''}
          </div>
          <p style="color: #6B7280; font-size: 13px;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        </div>
        <div style="background: #DC2626; color: white; padding: 12px; text-align: center; border-radius: 0 0 12px 12px;">
          <small>Allo Béton — Matériaux de construction professionnels</small>
        </div>
      </div>
    `
  }),

  // ── Vérification d'email ──────────────────────────────────────
  ecom_email_verification: (data) => ({
    subject: `Confirmez votre adresse email — Allo Béton`,
    text: `Bonjour ${data.firstName},\n\nMerci de votre inscription sur Allo Béton.\n\nVeuillez confirmer votre adresse email en cliquant sur ce lien (valable 24h) :\n${data.verifyLink}\n\nSi vous n'avez pas créé ce compte, ignorez cet email.\n\nCordialement,\nL'équipe Allo Béton\nTél : +221 33 000 00 00 | contact@allobeton.sn`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 50%, #2563EB 100%); padding: 32px 32px 28px; text-align: center;">
          ${EMAIL_LOGO_HTML}
          <div style="border-top: 1px solid rgba(255,255,255,0.15); margin: 20px 0 16px;"></div>
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">Confirmez votre adresse email</h1>
          <p style="color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 13px;">Une dernière étape pour activer votre compte</p>
        </div>
        <!-- Body -->
        <div style="padding: 36px 32px; border: 1px solid #E5E7EB; border-top: none; background: #FAFAFA;">
          <p style="font-size: 16px; color: #111827; margin: 0 0 8px;">Bonjour <strong>${data.firstName}</strong>,</p>
          <p style="font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0 0 28px;">Nous avons bien reçu votre inscription sur <strong>Allo Béton</strong>. Pour finaliser la création de votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.</p>
          <!-- CTA -->
          <div style="text-align: center; margin: 0 0 32px;">
            <a href="${data.verifyLink}" style="display: inline-block; background: linear-gradient(135deg, #1D4ED8, #1E40AF); color: white; padding: 16px 48px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: 0.2px; box-shadow: 0 4px 14px rgba(29,78,216,0.4);">Confirmer mon email</a>
          </div>
          <!-- Info box -->
          <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.5px;">Ce lien est valable 24 heures</p>
            <p style="margin: 0; font-size: 12px; color: #4B5563;">Si le bouton ne fonctionne pas, copiez-collez le lien suivant dans votre navigateur :</p>
            <p style="margin: 6px 0 0; font-size: 11px; color: #6B7280; word-break: break-all; font-family: monospace;">${data.verifyLink}</p>
          </div>
          <p style="font-size: 12px; color: #9CA3AF; margin: 0;">Si vous n'avez pas créé de compte sur Allo Béton, vous pouvez ignorer cet email en toute sécurité.</p>
        </div>
        <!-- Footer -->
        <div style="background: #1E293B; padding: 24px 32px; border-radius: 0 0 12px 12px;">
          <div style="text-align: center; margin-bottom: 12px;">
            <span style="color: white; font-size: 14px; font-weight: 700;">ALLO BÉTON</span>
            <span style="color: #64748B; font-size: 13px;"> &nbsp;|&nbsp; </span>
            <span style="color: #94A3B8; font-size: 13px;">Matériaux de Construction Professionnels</span>
          </div>
          <div style="text-align: center; color: #64748B; font-size: 12px; line-height: 1.8;">
            Dakar, Sénégal &nbsp;·&nbsp; +221 33 000 00 00 &nbsp;·&nbsp; contact@allobeton.sn
          </div>
          <div style="border-top: 1px solid #334155; margin-top: 16px; padding-top: 12px; text-align: center;">
            <span style="color: #475569; font-size: 11px;">Cet email a été envoyé automatiquement — merci de ne pas y répondre directement.</span>
          </div>
        </div>
      </div>
    `
  }),

  // ── Bienvenue à l'inscription ─────────────────────────────────
  ecom_welcome: (data) => ({
    subject: `Bienvenue chez Allo Béton, ${data.firstName} — Votre compte est créé`,
    text: `Bonjour ${data.firstName},\n\nNous sommes ravis de vous accueillir sur Allo Béton, votre partenaire de confiance pour les matériaux de construction au Sénégal.\n\nVotre compte a été créé avec succès.\nEmail : ${data.email}\n\nVous pouvez dès maintenant :\n- Parcourir notre catalogue de produits BTP\n- Passer et suivre vos commandes en ligne\n- Bénéficier de la livraison partout au Sénégal\n- Payer via Wave, Orange Money ou Free Money\n\nAccédez à votre espace client : ${data.shopUrl || 'http://allobeton.sn'}\n\nPour toute question, notre équipe est disponible :\nTél : +221 33 000 00 00\nEmail : contact@allobeton.sn\n\nCordialement,\nL'équipe Allo Béton`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 60%, #2563EB 100%); padding: 32px 32px 0; text-align: center;">
          ${EMAIL_LOGO_HTML}
          <!-- Banner wave -->
          <div style="background: #FAFAFA; border-radius: 20px 20px 0 0; padding: 28px 28px 0; margin: 20px -4px 0;">
            <h1 style="color: #111827; margin: 0 0 6px; font-size: 24px; font-weight: 800;">Bienvenue, ${data.firstName} !</h1>
            <p style="color: #6B7280; margin: 0 0 24px; font-size: 14px;">Votre compte Allo Béton est prêt</p>
          </div>
        </div>
        <!-- Body -->
        <div style="padding: 32px 32px 28px; background: #FAFAFA; border: 1px solid #E5E7EB; border-top: none;">
          <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 24px;">Nous sommes ravis de vous accueillir sur <strong>Allo Béton</strong>, votre partenaire de confiance pour l'approvisionnement en matériaux de construction au Sénégal.</p>
          <!-- Account box -->
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; display: flex; align-items: center;">
            <div style="width: 40px; height: 40px; background: #EFF6FF; border-radius: 10px; display: inline-block; text-align: center; line-height: 40px; font-size: 18px; margin-right: 14px; vertical-align: middle;">👤</div>
            <div style="display: inline-block; vertical-align: middle;">
              <p style="margin: 0 0 2px; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Votre compte</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1F2937;">${data.email}</p>
            </div>
          </div>
          <!-- Features grid -->
          <p style="font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px;">Ce que vous pouvez faire</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr>
              <td style="width: 50%; padding: 0 8px 12px 0; vertical-align: top;">
                <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px;">
                  <div style="font-size: 20px; margin-bottom: 6px;">📦</div>
                  <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1F2937;">Catalogue produits</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #6B7280;">Ciment, fer, sable, gravier et bien plus</p>
                </div>
              </td>
              <td style="width: 50%; padding: 0 0 12px 8px; vertical-align: top;">
                <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px;">
                  <div style="font-size: 20px; margin-bottom: 6px;">�</div>
                  <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1F2937;">Livraison rapide</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #6B7280;">Partout au Sénégal, directement sur chantier</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 8px 0 0; vertical-align: top;">
                <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px;">
                  <div style="font-size: 20px; margin-bottom: 6px;">📊</div>
                  <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1F2937;">Suivi commandes</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #6B7280;">Statut en temps réel de vos livraisons</p>
                </div>
              </td>
              <td style="padding: 0 0 0 8px; vertical-align: top;">
                <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px;">
                  <div style="font-size: 20px; margin-bottom: 6px;">💳</div>
                  <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1F2937;">Paiement mobile</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #6B7280;">Wave, Orange Money, Free Money</p>
                </div>
              </td>
            </tr>
          </table>
          <!-- CTA -->
          <div style="text-align: center;">
            <a href="${data.shopUrl || 'http://allobeton.sn/shop'}" style="display: inline-block; background: linear-gradient(135deg, #1D4ED8, #1E40AF); color: white; padding: 16px 48px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(29,78,216,0.35);">Accéder à ma boutique</a>
          </div>
        </div>
        <!-- Support strip -->
        <div style="background: #F3F4F6; border: 1px solid #E5E7EB; border-top: none; padding: 16px 32px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #4B5563;">Besoin d'aide ? Notre équipe est disponible</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #1D4ED8; font-weight: 600;">+221 33 000 00 00 &nbsp;·&nbsp; contact@allobeton.sn</p>
        </div>
        <!-- Footer -->
        <div style="background: #1E293B; padding: 24px 32px; border-radius: 0 0 12px 12px;">
          <div style="text-align: center; margin-bottom: 10px;">
            <span style="color: white; font-size: 14px; font-weight: 700;">ALLO BÉTON</span>
            <span style="color: #64748B; font-size: 13px;"> &nbsp;|&nbsp; </span>
            <span style="color: #94A3B8; font-size: 13px;">Matériaux de Construction Professionnels</span>
          </div>
          <div style="text-align: center; color: #64748B; font-size: 12px; line-height: 1.8;">
            Dakar, Sénégal &nbsp;·&nbsp; www.allobeton.sn
          </div>
          <div style="border-top: 1px solid #334155; margin-top: 14px; padding-top: 12px; text-align: center;">
            <span style="color: #475569; font-size: 11px;">Vous recevez cet email car vous vous êtes inscrit sur Allo Béton. © 2024 Allo Béton — Tous droits réservés.</span>
          </div>
        </div>
      </div>
    `
  }),

  // ── Réinitialisation du mot de passe ──────────────────────────
  ecom_reset_password: (data) => ({
    subject: `🔐 Réinitialisation de votre mot de passe — Allo Béton`,
    text: `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\nCliquez sur ce lien pour définir un nouveau mot de passe (valable 1 heure) :\n${data.resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nL'équipe Allo Béton`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 8px;">🔐</div>
          <h1 style="color: white; margin: 0; font-size: 22px;">Réinitialisation du mot de passe</h1>
        </div>
        <div style="background: #F9FAFB; padding: 28px 24px; border: 1px solid #E5E7EB;">
          <p style="font-size: 15px; margin: 0 0 16px; color: #374151;">
            Vous avez demandé la réinitialisation de votre mot de passe sur Allo Béton.
          </p>
          <p style="color: #374151; margin: 0 0 24px;">
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${data.resetLink}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
              Réinitialiser mon mot de passe →
            </a>
          </div>
          <div style="background: #F3F4F6; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 12px; color: #6B7280;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
            <p style="margin: 4px 0 0; font-size: 11px; color: #4B5563; word-break: break-all;">${data.resetLink}</p>
          </div>
          <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe ne sera pas modifié.
          </p>
        </div>
        <div style="background: #6D28D9; color: #EDE9FE; padding: 12px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px;">
          Allo Béton — Cet email a été envoyé automatiquement, ne pas répondre.
        </div>
      </div>
    `
  }),

  // ── Nouveau ticket support (notification admin) ──────────────
  ecom_support_received: (data) => ({
    subject: `🎫 Nouveau ticket support #${data.ticketId} — ${data.subject}`,
    text: `Nouveau ticket support reçu.\n\nClient: ${data.customerName} (${data.customerEmail || 'non connecté'})\nSujet: ${data.subject}\nMessage:\n${data.message}\n\nTicket ID: ${data.ticketId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🎫 Nouveau Ticket Support</h1>
        </div>
        <div style="background: #FFFBEB; padding: 24px; border: 1px solid #FDE68A;">
          <p style="margin: 0 0 12px;"><strong>Client :</strong> ${data.customerName}</p>
          <p style="margin: 0 0 12px;"><strong>Email :</strong> ${data.customerEmail || 'Non renseigné'}</p>
          <p style="margin: 0 0 12px;"><strong>Sujet :</strong> ${data.subject}</p>
          <div style="background: white; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin-top: 12px;">
            <p style="margin: 0; color: #374151; white-space: pre-wrap;">${data.message}</p>
          </div>
          <p style="margin: 16px 0 0; color: #6B7280; font-size: 12px;">Ticket ID : ${data.ticketId}</p>
        </div>
        <div style="background: #D97706; color: white; padding: 10px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px;">
          Allo Béton — Répondez directement à ${data.customerEmail || 'ce client'} pour traiter ce ticket.
        </div>
      </div>
    `
  }),

  // ── Confirmation support (client) ────────────────────────────
  ecom_support_confirmation: (data) => ({
    subject: `✅ Votre demande a été reçue — Allo Béton Support`,
    text: `Bonjour ${data.customerName},\n\nNous avons bien reçu votre message concernant : "${data.subject}".\n\nNotre équipe vous répondra dans les plus brefs délais (généralement sous 24h).\n\nRéférence ticket : #${data.ticketId}\n\nL'équipe Allo Béton`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
          <h1 style="color: white; margin: 0; font-size: 20px;">Message bien reçu !</h1>
        </div>
        <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB;">
          <p>Bonjour <strong>${data.customerName}</strong>,</p>
          <p>Nous avons bien reçu votre demande concernant :</p>
          <div style="background: white; border-left: 4px solid #10B981; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-weight: bold; color: #1F2937;">${data.subject}</p>
          </div>
          <p style="color: #374151;">Notre équipe vous répondra <strong>sous 24h</strong>.</p>
          <p style="color: #9CA3AF; font-size: 13px;">Référence : <code>#${data.ticketId}</code></p>
        </div>
        <div style="background: #059669; color: white; padding: 10px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px;">
          Allo Béton — Support Client · support@allobeton.sn
        </div>
      </div>
    `
  }),

  ecom_refund_processed: (data) => ({
    subject: `💸 Remboursement traité — Commande ${data.orderNumber} — Allo Béton`,
    text: `Bonjour ${data.customerName},\n\nUn remboursement de ${data.amount} FCFA a été traité pour votre commande ${data.orderNumber}.\n\nL'équipe Allo Béton`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">💸 Remboursement Traité</h1>
        </div>
        <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB;">
          <p>Bonjour <strong>${data.customerName}</strong>,</p>
          <p>Votre remboursement a été traité avec succès.</p>
          <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Commande:</strong> ${data.orderNumber}</p>
            <p style="margin: 4px 0;"><strong>Montant remboursé:</strong> <span style="color: #8B5CF6; font-weight: bold;">${data.amount} FCFA</span></p>
            <p style="margin: 4px 0;"><strong>Raison:</strong> ${data.reason || 'N/A'}</p>
          </div>
          <p style="color: #6B7280; font-size: 13px;">Le montant sera crédité selon votre méthode de paiement initiale.</p>
        </div>
        <div style="background: #6D28D9; color: white; padding: 12px; text-align: center; border-radius: 0 0 12px 12px;">
          <small>Allo Béton — Matériaux de construction professionnels</small>
        </div>
      </div>
    `
  })
};

/**
 * Envoyer une notification par email selon le type d'événement
 * @param {string} eventType - Type d'événement
 * @param {object} data - Données de l'événement
 * @param {string} to - Email du destinataire
 * @returns {Promise<object>} Résultat de l'envoi
 */
const sendNotification = async (eventType, data, to) => {
  const template = emailTemplates[eventType];
  
  if (!template) {
    console.warn(`⚠️ Template email non trouvé pour: ${eventType}`);
    return sendEmail(
      to,
      `🔔 Notification Allo Béton`,
      `Vous avez reçu une notification de type: ${eventType}`
    );
  }

  const { subject, text, html } = template(data);
  return sendEmail(to, subject, text, html);
};

module.exports = {
  sendEmail,
  sendNotification,
  isGmailConfigured,
  emailTemplates
};
