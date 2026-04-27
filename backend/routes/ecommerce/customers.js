/**
 * ALLO BÉTON - API CLIENTS E-COMMERCE
 * Gestion des comptes clients et authentification
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../../db');

const { authenticateCustomer } = require('../../middleware/ecommerceAuth');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { sendNotification, sendEmail } = require('../../services/emailService');
const { OAuth2Client } = require('google-auth-library');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER || 'fatoumayorofall@gmail.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans .env — refus de démarrer customers e-commerce');
}

// Regex validation email (RFC 5322 simplifiée)
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Rate limiter souple : 50 tentatives / 5 min par IP (anti-bruteforce léger)
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // ne compte que les échecs
  message: { success: false, error: 'Trop de tentatives. Patientez quelques minutes.' }
});

// Rate limiter : 20 inscriptions / heure par IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop d\'inscriptions. Réessayez plus tard.' }
});

// Rate limiter : 10 demandes de reset password / heure
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Trop de demandes. Réessayez plus tard.' }
});

// ============================================================
// AUTHENTIFICATION CLIENT
// ============================================================

/**
 * POST /api/ecommerce/customers/register
 * Inscription client
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    let {
      email, phone, password, first_name, last_name,
      company_name, company_ninea, company_rc,
      customer_type = 'particulier'
    } = req.body;

    // Mapper les valeurs anglaises vers les valeurs ENUM françaises
    const typeMapping = { 'individual': 'particulier', 'company': 'entreprise', 'professional': 'professionnel' };
    if (typeMapping[customer_type]) customer_type = typeMapping[customer_type];
    if (!['particulier', 'professionnel', 'entreprise'].includes(customer_type)) customer_type = 'particulier';

    // Normaliser le téléphone (supprimer espaces et tirets)
    if (phone) phone = phone.replace(/[\s\-().+]/g, '');

    // Validation — phone obligatoire, email optionnel
    if (!phone || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: 'Prénom, nom, téléphone et mot de passe sont obligatoires'
      });
    }

    // Validation email si fourni
    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'Format d\'email invalide' });
    }

    // Longueur mot de passe
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    // Vérifier unicité email (si fourni)
    if (email) {
      const [existing] = await pool.query(
        'SELECT id FROM ecom_customers WHERE email = ?',
        [email.toLowerCase()]
      );
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Cette adresse email est déjà utilisée' });
      }
    }

    // Vérifier unicité téléphone
    const [existingPhone] = await pool.query(
      'SELECT id FROM ecom_customers WHERE phone = ?',
      [phone]
    );
    if (existingPhone.length > 0) {
      return res.status(400).json({ success: false, error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const customerId = uuidv4();

    // Migration auto: colonnes vérification + auth sociale (compatible MySQL 5.7)
    const [cols] = await pool.query("SHOW COLUMNS FROM ecom_customers LIKE 'email_verification_token'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE ecom_customers ADD COLUMN email_verification_token VARCHAR(64) DEFAULT NULL").catch(() => {});
      await pool.query("ALTER TABLE ecom_customers ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL").catch(() => {});
      await pool.query("ALTER TABLE ecom_customers ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'email'").catch(() => {});
      await pool.query("ALTER TABLE ecom_customers ADD COLUMN provider_id VARCHAR(255) DEFAULT NULL").catch(() => {});
    }

    // Token de vérification email (seulement si email fourni)
    const verifyToken = email ? crypto.randomBytes(32).toString('hex') : null;
    const emailNorm = email ? email.toLowerCase() : null;

    // Créer le client
    await pool.query(`
      INSERT INTO ecom_customers (
        id, email, phone, password_hash, first_name, last_name,
        company_name, company_ninea, company_rc, customer_type, email_verification_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerId, emailNorm, phone, passwordHash,
      first_name, last_name, company_name, company_ninea, company_rc, customer_type, verifyToken
    ]);

    // Générer token JWT directement — pas de blocage sur la vérification email
    const tokenPayload = emailNorm
      ? { customer_id: customerId, email: emailNorm, phone: phone || null, role: 'customer' }
      : { customer_id: customerId, phone, role: 'customer' };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      needs_verification: false,
      message: 'Compte créé avec succès.',
      data: { id: customerId, email: emailNorm, phone, first_name, last_name, customer_type, token }
    });

    // Envoi des emails en arrière-plan (non bloquant)
    if (emailNorm && verifyToken) {
      const verifyLink = `${FRONTEND_URL}/shop?verify_email=${verifyToken}`;
      sendNotification('ecom_email_verification', { firstName: first_name, verifyLink }, emailNorm)
        .catch(e => console.error('❌ Email vérification:', e.message));
      sendNotification('ecom_welcome', { firstName: first_name, email: emailNorm, shopUrl: FRONTEND_URL }, emailNorm)
        .catch(e => console.error('❌ Email bienvenue:', e.message));
    }

  } catch (error) {
    console.error('❌ Erreur inscription — code:', error.code, '—', error.message);

    // Violation de contrainte UNIQUE (doublon phone ou email)
    if (error.code === 'ER_DUP_ENTRY') {
      const field = error.message.includes('email') ? 'email' : 'téléphone';
      return res.status(400).json({
        success: false,
        error: `Ce ${field} est déjà associé à un compte existant`
      });
    }

    // Retourner le message d'erreur précis en toutes circonstances pour débogage
    res.status(500).json({
      success: false,
      error: `Erreur: ${error.message}`
    });
  }
});

/**
 * POST /api/ecommerce/customers/login
 * Connexion client
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { login: loginId, email: emailField, phone: phoneField, password } = req.body;
    let identifier = (loginId || emailField || phoneField || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Téléphone (ou email) et mot de passe requis'
      });
    }

    // Détecter si c'est un email ou un téléphone
    const isEmail = EMAIL_REGEX.test(identifier);

    // Normaliser le téléphone (même format que lors de l'inscription)
    if (!isEmail) identifier = identifier.replace(/[\s\-().+]/g, '');

    // Chercher le client par email OU téléphone
    const [customers] = await pool.query(
      `SELECT * FROM ecom_customers
       WHERE is_active = 1
         AND (${isEmail ? 'email = ?' : 'phone = ?'})`,
      [isEmail ? identifier.toLowerCase() : identifier]
    );

    if (customers.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Identifiant ou mot de passe incorrect'
      });
    }

    const customer = customers[0];

    // Bloquer les comptes sans mot de passe (créés via WhatsApp/Guest)
    if (!customer.password_hash || customer.password_hash === '') {
      return res.status(401).json({
        success: false,
        error: 'Ce compte n\'est pas configuré pour la connexion. Utilisez "Mot de passe oublié" pour en définir un.'
      });
    }

    // Vérifier password
    const isValid = await bcrypt.compare(password, customer.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Mettre à jour last_login
    await pool.query(
      'UPDATE ecom_customers SET last_login_at = NOW() WHERE id = ?',
      [customer.id]
    );

    // Générer token
    const token = jwt.sign(
      { customer_id: customer.id, email: customer.email || null, phone: customer.phone || null, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        company_name: customer.company_name,
        customer_type: customer.customer_type,
        email_verified: !!customer.email_verified_at,
        token
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/customers/verify-email?token=xxx
 * Vérifier l'email via le lien reçu
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.redirect(`${FRONTEND_URL}/shop?verify_status=invalid`);

    const [rows] = await pool.query(
      'SELECT id, email_verified_at FROM ecom_customers WHERE email_verification_token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.redirect(`${FRONTEND_URL}/shop?verify_status=invalid`);
    }

    if (rows[0].email_verified_at) {
      return res.redirect(`${FRONTEND_URL}/shop?verify_status=already_verified`);
    }

    await pool.query(
      'UPDATE ecom_customers SET email_verified_at = NOW(), email_verification_token = NULL, is_verified = 1 WHERE id = ?',
      [rows[0].id]
    );

    return res.redirect(`${FRONTEND_URL}/shop?verify_status=success`);
  } catch (e) {
    console.error('Erreur verify-email:', e);
    return res.redirect(`${FRONTEND_URL}/shop?verify_status=error`);
  }
});

/**
 * POST /api/ecommerce/customers/resend-verification
 * Renvoyer l'email de vérification
 */
router.post('/resend-verification', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const [rows] = await pool.query(
      'SELECT email, first_name, email_verified_at FROM ecom_customers WHERE id = ?',
      [customerId]
    );

    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Compte introuvable' });
    if (rows[0].email_verified_at) return res.json({ success: true, message: 'Email déjà vérifié' });

    const newToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'UPDATE ecom_customers SET email_verification_token = ? WHERE id = ?',
      [newToken, customerId]
    );

    const verifyLink = `${FRONTEND_URL}/shop?verify_email=${newToken}`;
    await sendNotification('ecom_email_verification', {
      firstName: rows[0].first_name,
      verifyLink
    }, rows[0].email);

    res.json({ success: true, message: 'Email de vérification renvoyé' });
  } catch (e) {
    console.error('Erreur resend:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/customers/auth/google
 * Connexion / Inscription via Google OAuth
 */
router.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, error: 'Token Google manquant' });

    if (!googleClient) {
      return res.status(503).json({ success: false, error: 'Google OAuth non configuré (GOOGLE_CLIENT_ID manquant)' });
    }

    // Vérifier le token avec Google
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;

    if (!email) return res.status(400).json({ success: false, error: 'Email Google non disponible' });

    // Migration colonnes sociales
    await pool.query(`ALTER TABLE ecom_customers
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255) DEFAULT NULL
    `).catch(() => {});

    // Chercher client existant
    let [customers] = await pool.query(
      'SELECT * FROM ecom_customers WHERE email = ? OR (auth_provider = ? AND provider_id = ?)',
      [email.toLowerCase(), 'google', googleId]
    );

    let customerId;
    if (customers.length > 0) {
      // Mettre à jour provider_id si manquant
      customerId = customers[0].id;
      await pool.query(
        'UPDATE ecom_customers SET auth_provider = ?, provider_id = ?, email_verified_at = COALESCE(email_verified_at, NOW()), last_login_at = NOW() WHERE id = ?',
        ['google', googleId, customerId]
      );
    } else {
      // Créer nouveau compte
      customerId = uuidv4();
      await pool.query(`
        INSERT INTO ecom_customers
          (id, email, first_name, last_name, auth_provider, provider_id, email_verified_at, is_verified, customer_type)
        VALUES (?, ?, ?, ?, 'google', ?, NOW(), 1, 'particulier')
      `, [customerId, email.toLowerCase(), firstName || '', lastName || '', googleId]);

      // Email de bienvenue
      sendNotification('ecom_welcome', { firstName: firstName || email, email, shopUrl: FRONTEND_URL }, email).catch(() => {});
    }

    const token = jwt.sign({ customer_id: customerId, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    const [updated] = await pool.query('SELECT id, email, first_name, last_name, company_name, customer_type FROM ecom_customers WHERE id = ?', [customerId]);

    res.json({
      success: true,
      data: { ...updated[0], email_verified: true, token }
    });

  } catch (e) {
    console.error('Erreur auth Google:', e.message, e.code || '');
    const msg = e.message?.includes('audience') ? 'Client ID Google non reconnu'
      : e.message?.includes('expired') ? 'Token Google expiré — réessayez'
      : e.message?.includes('issued') ? 'Token Google mal formé'
      : 'Token Google invalide: ' + e.message;
    res.status(401).json({ success: false, error: msg });
  }
});

/**
 * POST /api/ecommerce/customers/auth/facebook
 * Connexion / Inscription via Facebook OAuth
 */
router.post('/auth/facebook', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ success: false, error: 'Token Facebook manquant' });

    // Vérifier le token avec l'API Graph Facebook
    const fbRes = await fetch(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${access_token}`
    );
    const fbData = await fbRes.json();

    if (!fbRes.ok || fbData.error) {
      return res.status(401).json({ success: false, error: fbData.error?.message || 'Token Facebook invalide' });
    }

    const { id: fbId, email, first_name: firstName, last_name: lastName } = fbData;
    const userEmail = email || `fb_${fbId}@noemail.allobeton.sn`;

    // Migration colonnes sociales
    await pool.query(`ALTER TABLE ecom_customers
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255) DEFAULT NULL
    `).catch(() => {});

    let [customers] = await pool.query(
      'SELECT * FROM ecom_customers WHERE (email = ? AND email != ?) OR (auth_provider = ? AND provider_id = ?)',
      [userEmail.toLowerCase(), `fb_${fbId}@noemail.allobeton.sn`, 'facebook', fbId]
    );

    let customerId;
    if (customers.length > 0) {
      customerId = customers[0].id;
      await pool.query(
        'UPDATE ecom_customers SET auth_provider = ?, provider_id = ?, email_verified_at = COALESCE(email_verified_at, NOW()), last_login_at = NOW() WHERE id = ?',
        ['facebook', fbId, customerId]
      );
    } else {
      customerId = uuidv4();
      await pool.query(`
        INSERT INTO ecom_customers
          (id, email, first_name, last_name, auth_provider, provider_id, email_verified_at, is_verified, customer_type)
        VALUES (?, ?, ?, ?, 'facebook', ?, NOW(), 1, 'particulier')
      `, [customerId, userEmail.toLowerCase(), firstName || '', lastName || '', fbId]);

      if (email) sendNotification('ecom_welcome', { firstName: firstName || email, email, shopUrl: FRONTEND_URL }, email).catch(() => {});
    }

    const token = jwt.sign({ customer_id: customerId, email: userEmail, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    const [updated] = await pool.query('SELECT id, email, first_name, last_name, company_name, customer_type FROM ecom_customers WHERE id = ?', [customerId]);

    res.json({
      success: true,
      data: { ...updated[0], email_verified: true, token }
    });

  } catch (e) {
    console.error('Erreur auth Facebook:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/customers/logout
 * Déconnexion (côté serveur : log uniquement, le client supprime son token)
 */
router.post('/logout', authenticateCustomer, async (req, res) => {
  // Stateless JWT : la déconnexion se fait côté client en supprimant le token.
  // On peut logger l'événement pour traçabilité.
  try {
    console.log(`[LOGOUT] Customer ${req.user.customer_id} (${req.user.email})`);
    res.json({ success: true, message: 'Déconnexion réussie' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/customers/forgot-password
 * Demande de réinitialisation du mot de passe
 * Génère un JWT signé avec le hash actuel (invalidé au changement)
 */
router.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'Email invalide' });
    }

    const [rows] = await pool.query(
      'SELECT id, email, password_hash FROM ecom_customers WHERE email = ? AND is_active = 1',
      [email.toLowerCase()]
    );

    // Ne JAMAIS révéler si l'email existe (protection énumération)
    if (rows.length === 0) {
      return res.json({ success: true, message: 'Si ce compte existe, un lien de réinitialisation a été envoyé.' });
    }

    const customer = rows[0];
    // Le secret = JWT_SECRET + password_hash (invalide le token dès qu'on change le pw)
    const secret = JWT_SECRET + (customer.password_hash || 'no-pw');
    const resetToken = jwt.sign(
      { customer_id: customer.id, purpose: 'password_reset' },
      secret,
      { expiresIn: '1h' }
    );

    const resetLink = `${FRONTEND_URL}/shop/reset-password?token=${resetToken}&id=${customer.id}`;
    console.log(`[RESET PASSWORD] Lien pour ${customer.email}: ${resetLink}`);

    // Envoyer l'email de réinitialisation
    sendNotification('ecom_reset_password', { resetLink }, customer.email)
      .catch((err) => console.error('[RESET EMAIL ERROR]', err.message));

    res.json({
      success: true,
      message: 'Si ce compte existe, un lien de réinitialisation a été envoyé.',
      // En dev uniquement : retourner le lien. À retirer en prod.
      ...(process.env.NODE_ENV !== 'production' ? { dev_reset_link: resetLink } : {})
    });
  } catch (e) {
    console.error('Erreur forgot-password:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/customers/reset-password
 * Réinitialisation effective avec le token
 */
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { customer_id, token, new_password } = req.body;
    if (!customer_id || !token || !new_password) {
      return res.status(400).json({ success: false, error: 'Paramètres manquants' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const [rows] = await pool.query(
      'SELECT id, password_hash FROM ecom_customers WHERE id = ? AND is_active = 1',
      [customer_id]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Token invalide ou expiré' });
    }

    const customer = rows[0];
    const secret = JWT_SECRET + (customer.password_hash || 'no-pw');

    try {
      const decoded = jwt.verify(token, secret);
      if (decoded.purpose !== 'password_reset' || decoded.customer_id !== customer_id) {
        return res.status(400).json({ success: false, error: 'Token invalide' });
      }
    } catch (jwtErr) {
      return res.status(400).json({ success: false, error: 'Token invalide ou expiré' });
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE ecom_customers SET password_hash = ? WHERE id = ?', [newHash, customer_id]);

    res.json({ success: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' });
  } catch (e) {
    console.error('Erreur reset-password:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/customers/me
 * Profil du client connecté
 */
router.get('/me', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;

    const [customers] = await pool.query(`
      SELECT id, email, phone, first_name, last_name, company_name,
             company_ninea, company_rc, customer_type, credit_limit,
             current_balance, discount_rate, is_verified, created_at, avatar_url,
             (email_verified_at IS NOT NULL) AS email_verified, auth_provider,
             phone_verified_at
      FROM ecom_customers WHERE id = ?
    `, [customerId]);

    if (customers.length === 0) {
      return res.status(404).json({ success: false, error: 'Client non trouvé' });
    }

    const customer = customers[0];

    // Récupérer les adresses
    const [addresses] = await pool.query(
      'SELECT * FROM ecom_addresses WHERE customer_id = ? ORDER BY is_default DESC',
      [customerId]
    );

    // Statistiques
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(total) as total_spent,
        MAX(created_at) as last_order_date
      FROM ecom_orders
      WHERE customer_id = ? AND status NOT IN ('cancelled', 'refunded')
    `, [customerId]);

    res.json({
      success: true,
      data: {
        ...customer,
        addresses,
        stats: stats[0]
      }
    });

  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/customers/me
 * Modifier le profil
 */
router.put('/me', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const {
      first_name, last_name, phone,
      company_name, company_ninea, company_rc
    } = req.body;

    const updates = [];
    const values = [];

    if (first_name) { updates.push('first_name = ?'); values.push(first_name); }
    if (last_name) { updates.push('last_name = ?'); values.push(last_name); }
    if (phone) { updates.push('phone = ?'); values.push(phone); }
    if (company_name !== undefined) { updates.push('company_name = ?'); values.push(company_name); }
    if (company_ninea !== undefined) { updates.push('company_ninea = ?'); values.push(company_ninea); }
    if (company_rc !== undefined) { updates.push('company_rc = ?'); values.push(company_rc); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucune modification' });
    }

    values.push(customerId);

    await pool.query(
      `UPDATE ecom_customers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: 'Profil mis à jour' });

  } catch (error) {
    console.error('Erreur modification profil:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/customers/password
 * Changer le mot de passe
 */
router.put('/password', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Mot de passe actuel et nouveau requis'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }

    // Vérifier mot de passe actuel
    const [customers] = await pool.query(
      'SELECT password_hash FROM ecom_customers WHERE id = ?',
      [customerId]
    );

    const isValid = await bcrypt.compare(current_password, customers[0].password_hash);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Mot de passe actuel incorrect'
      });
    }

    // Hash nouveau password
    const newHash = await bcrypt.hash(new_password, 12);

    await pool.query(
      'UPDATE ecom_customers SET password_hash = ? WHERE id = ?',
      [newHash, customerId]
    );

    res.json({ success: true, message: 'Mot de passe modifié' });

  } catch (error) {
    console.error('Erreur changement password:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// ADRESSES
// ============================================================

/**
 * GET /api/ecommerce/customers/addresses
 * Liste des adresses
 */
router.get('/addresses', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;

    const [addresses] = await pool.query(
      'SELECT * FROM ecom_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
      [customerId]
    );

    res.json({ success: true, data: addresses });

  } catch (error) {
    console.error('Erreur liste adresses:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/customers/addresses
 * Ajouter une adresse
 */
router.post('/addresses', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const {
      type = 'shipping', label, first_name, last_name, company,
      address_line1, address_line2, city, region, postal_code,
      phone, instructions, is_default = false
    } = req.body;

    if (!address_line1 || !city) {
      return res.status(400).json({
        success: false,
        error: 'Adresse et ville requises'
      });
    }

    const addressId = uuidv4();

    // Si default, retirer le default des autres
    if (is_default) {
      await pool.query(
        'UPDATE ecom_addresses SET is_default = 0 WHERE customer_id = ? AND type = ?',
        [customerId, type]
      );
    }

    await pool.query(`
      INSERT INTO ecom_addresses (
        id, customer_id, type, label, first_name, last_name, company,
        address_line1, address_line2, city, region, postal_code,
        phone, instructions, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      addressId, customerId, type, label, first_name, last_name, company,
      address_line1, address_line2, city, region, postal_code,
      phone, instructions, is_default ? 1 : 0
    ]);

    const [address] = await pool.query('SELECT * FROM ecom_addresses WHERE id = ?', [addressId]);

    res.status(201).json({
      success: true,
      message: 'Adresse ajoutée',
      data: address[0]
    });

  } catch (error) {
    console.error('Erreur ajout adresse:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/customers/addresses/:id
 * Modifier une adresse
 */
router.put('/addresses/:id', authenticateCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;

    // Vérifier propriété
    const [existing] = await pool.query(
      'SELECT * FROM ecom_addresses WHERE id = ? AND customer_id = ?',
      [id, customerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Adresse non trouvée' });
    }

    const updates = req.body;
    const allowedFields = [
      'type', 'label', 'first_name', 'last_name', 'company',
      'address_line1', 'address_line2', 'city', 'region', 'postal_code',
      'phone', 'instructions', 'is_default'
    ];

    const setClauses = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucune modification' });
    }

    // Si is_default, retirer le default des autres
    if (updates.is_default) {
      await pool.query(
        'UPDATE ecom_addresses SET is_default = 0 WHERE customer_id = ? AND type = ? AND id != ?',
        [customerId, existing[0].type, id]
      );
    }

    values.push(id);

    await pool.query(
      `UPDATE ecom_addresses SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: 'Adresse modifiée' });

  } catch (error) {
    console.error('Erreur modification adresse:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/ecommerce/customers/addresses/:id
 * Supprimer une adresse
 */
router.delete('/addresses/:id', authenticateCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;

    const [result] = await pool.query(
      'DELETE FROM ecom_addresses WHERE id = ? AND customer_id = ?',
      [id, customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Adresse non trouvée' });
    }

    res.json({ success: true, message: 'Adresse supprimée' });

  } catch (error) {
    console.error('Erreur suppression adresse:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTES ADMIN
// ============================================================

/**
 * GET /api/ecommerce/customers/admin/list
 * Liste des clients (admin)
 */
router.get('/admin/list', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (type) {
      whereClause += ' AND c.customer_type = ?';
      params.push(type);
    }

    if (status === 'active') {
      whereClause += ' AND c.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND c.is_active = 0';
    }

    const [customers] = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM ecom_orders WHERE customer_id = c.id) as order_count,
        (SELECT SUM(total) FROM ecom_orders WHERE customer_id = c.id AND status NOT IN ('cancelled', 'refunded')) as total_spent
      FROM ecom_customers c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM ecom_customers c ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: customers.map(c => ({ ...c, password_hash: undefined })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur admin clients:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/customers/admin/:id
 * Détail d'un client (admin)
 */
router.get('/admin/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const [customers] = await pool.query(
      'SELECT * FROM ecom_customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ success: false, error: 'Client non trouvé' });
    }

    const customer = customers[0];
    delete customer.password_hash;

    // Adresses
    const [addresses] = await pool.query(
      'SELECT * FROM ecom_addresses WHERE customer_id = ?',
      [id]
    );

    // Commandes récentes
    const [orders] = await pool.query(`
      SELECT * FROM ecom_orders
      WHERE customer_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [id]);

    // Statistiques
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(total) as total_spent,
        AVG(total) as avg_order_value
      FROM ecom_orders
      WHERE customer_id = ? AND status NOT IN ('cancelled', 'refunded')
    `, [id]);

    res.json({
      success: true,
      data: {
        ...customer,
        addresses,
        recent_orders: orders,
        stats: stats[0]
      }
    });

  } catch (error) {
    console.error('Erreur admin détail client:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/customers/admin/:id
 * Modifier un client (admin)
 */
router.put('/admin/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      is_active, is_verified, credit_limit, discount_rate,
      payment_terms, customer_type, notes
    } = req.body;

    const updates = [];
    const values = [];

    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (is_verified !== undefined) { updates.push('is_verified = ?'); values.push(is_verified ? 1 : 0); }
    if (credit_limit !== undefined) { updates.push('credit_limit = ?'); values.push(credit_limit); }
    if (discount_rate !== undefined) { updates.push('discount_rate = ?'); values.push(discount_rate); }
    if (payment_terms !== undefined) { updates.push('payment_terms = ?'); values.push(payment_terms); }
    if (customer_type !== undefined) { updates.push('customer_type = ?'); values.push(customer_type); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucune modification' });
    }

    values.push(id);

    await pool.query(
      `UPDATE ecom_customers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: 'Client modifié' });

  } catch (error) {
    console.error('Erreur admin modification client:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// PHOTO DE PROFIL
// ============================================================

/**
 * PUT /api/ecommerce/customers/avatar
 * Sauvegarder la photo de profil (base64) en DB
 */
router.put('/avatar', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { avatar_data } = req.body; // base64 data URL

    if (!avatar_data) {
      // Suppression de la photo
      await pool.query('UPDATE ecom_customers SET avatar_url = NULL WHERE id = ?', [customerId]);
      return res.json({ success: true, message: 'Photo supprim\u00e9e' });
    }

    // Vérifier taille (base64 ~4/3 taille binaire, max 2 Mo → ~2.7 Mo en base64)
    if (avatar_data.length > 3 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Image trop volumineuse (max 2 Mo)' });
    }

    // S'assurer que la colonne existe (migration auto)
    await pool.query(`
      ALTER TABLE ecom_customers ADD COLUMN IF NOT EXISTS avatar_url LONGTEXT DEFAULT NULL
    `).catch(() => { /* colonne déjà présente */ });

    await pool.query('UPDATE ecom_customers SET avatar_url = ? WHERE id = ?', [avatar_data, customerId]);

    res.json({ success: true, message: 'Photo mise \u00e0 jour', avatar_url: avatar_data });

  } catch (error) {
    console.error('Erreur avatar:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// SUPPORT / CONTACT CLIENT
// ============================================================

/**
 * POST /api/ecommerce/customers/support
 * Envoi d'un message de support (authentifié ou non)
 * Sauvegarde en DB + log console (branchement email à faire)
 */
const supportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,
  message: { success: false, error: 'Trop de messages. Attendez 10 minutes.' }
});

router.post('/support', supportLimiter, async (req, res) => {
  try {
    const { subject, message, email, name } = req.body;

    if (!subject || !message || subject.trim().length < 3 || message.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Sujet et message requis (min 10 caract\u00e8res)' });
    }

    // Récupérer infos client si connecté
    let customerId = null;
    let customerEmail = email || null;
    let customerName = name || 'Visiteur';

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, JWT_SECRET);
        customerId = decoded.customer_id;
        const [rows] = await pool.query(
          'SELECT email, first_name, last_name FROM ecom_customers WHERE id = ?',
          [customerId]
        );
        if (rows.length > 0) {
          customerEmail = rows[0].email;
          customerName = `${rows[0].first_name} ${rows[0].last_name}`;
        }
      } catch { /* token optionnel */ }
    }

    // Persister en DB (table créée si absente)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ecom_support_tickets (
        id VARCHAR(36) PRIMARY KEY,
        customer_id VARCHAR(36) DEFAULT NULL,
        customer_email VARCHAR(255),
        customer_name VARCHAR(255),
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('open','in_progress','resolved','closed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const ticketId = require('uuid').v4();
    await pool.query(
      'INSERT INTO ecom_support_tickets (id, customer_id, customer_email, customer_name, subject, message) VALUES (?, ?, ?, ?, ?, ?)',
      [ticketId, customerId, customerEmail, customerName, subject.trim(), message.trim()]
    );

    // Email de notification à l'admin (non bloquant)
    sendNotification('ecom_support_received', {
      ticketId,
      customerName,
      customerEmail,
      subject: subject.trim(),
      message: message.trim()
    }, ADMIN_EMAIL).catch(() => {});

    // Email de confirmation au client (si email disponible)
    if (customerEmail) {
      sendNotification('ecom_support_confirmation', {
        ticketId,
        customerName,
        subject: subject.trim()
      }, customerEmail).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Votre message a \u00e9t\u00e9 envoy\u00e9. Notre \u00e9quipe vous r\u00e9pondra sous 24h.',
      ticket_id: ticketId
    });

  } catch (error) {
    console.error('Erreur support:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/customers/auth/apple
 * Connexion / Inscription via Apple Sign In
 */
router.post('/auth/apple', async (req, res) => {
  try {
    const { id_token, user } = req.body;
    if (!id_token) return res.status(400).json({ success: false, error: 'Token Apple manquant' });

    const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || null;
    if (!APPLE_CLIENT_ID) {
      return res.status(503).json({ success: false, error: 'Apple Sign In non configuré (APPLE_CLIENT_ID manquant)' });
    }

    const appleSignin = require('apple-signin-auth');
    const payload = await appleSignin.verifyIdToken(id_token, {
      audience: APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const { sub: appleId, email: appleEmail } = payload;
    const userEmail = appleEmail || (user && user.email) || null;

    if (!appleId) return res.status(400).json({ success: false, error: 'ID Apple invalide' });

    // Migrations
    await pool.query(`ALTER TABLE ecom_customers
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255) DEFAULT NULL
    `).catch(() => {});

    let customerId;
    // Chercher par provider_id Apple
    const [byApple] = await pool.query(
      "SELECT id, email FROM ecom_customers WHERE auth_provider = 'apple' AND provider_id = ? AND is_active = 1",
      [appleId]
    );
    if (byApple.length > 0) {
      customerId = byApple[0].id;
    } else if (userEmail) {
      // Chercher par email
      const [byEmail] = await pool.query(
        'SELECT id FROM ecom_customers WHERE email = ? AND is_active = 1',
        [userEmail.toLowerCase()]
      );
      if (byEmail.length > 0) {
        customerId = byEmail[0].id;
        await pool.query(
          "UPDATE ecom_customers SET auth_provider='apple', provider_id=?, email_verified_at=COALESCE(email_verified_at, NOW()) WHERE id=?",
          [appleId, customerId]
        );
      }
    }

    if (!customerId) {
      // Nouveau compte
      customerId = require('uuid').v4();
      const firstName = (user && user.name && user.name.firstName) || '';
      const lastName  = (user && user.name && user.name.lastName)  || '';
      await pool.query(`
        INSERT INTO ecom_customers
          (id, email, first_name, last_name, auth_provider, provider_id, email_verified_at, is_verified, customer_type)
        VALUES (?, ?, ?, ?, 'apple', ?, NOW(), 1, 'particulier')
      `, [customerId, userEmail ? userEmail.toLowerCase() : null, firstName, lastName, appleId]);

      if (userEmail) {
        sendNotification('ecom_welcome', {
          firstName: firstName || 'Client',
          email: userEmail,
          shopUrl: FRONTEND_URL
        }, userEmail).catch(() => {});
      }
    }

    const [updated] = await pool.query(
      'SELECT id, email, first_name, last_name, customer_type FROM ecom_customers WHERE id = ?',
      [customerId]
    );
    const token = jwt.sign(
      { customer_id: customerId, email: userEmail || updated[0].email, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ success: true, data: { ...updated[0], email_verified: true, token } });

  } catch (e) {
    console.error('Erreur auth Apple:', e);
    res.status(500).json({ success: false, error: 'Erreur vérification Apple: ' + e.message });
  }
});

/* ─────────────────────────────────────────────────────────────────
   SMS OTP — Vérification téléphone via Twilio
   ───────────────────────────────────────────────────────────────── */

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID   || null;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN     || null;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER   || null;
const twilioClient = (TWILIO_SID && TWILIO_TOKEN) ? require('twilio')(TWILIO_SID, TWILIO_TOKEN) : null;

/**
 * POST /api/ecommerce/customers/send-phone-otp
 * Envoyer un code OTP par SMS pour vérifier le numéro de téléphone
 */
router.post('/send-phone-otp', authenticateCustomer, async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(503).json({ success: false, error: 'SMS non configuré (Twilio credentials manquants)' });
    }

    const customerId = req.user.customer_id;
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ success: false, error: 'Numéro de téléphone requis' });

    // Migrations pour OTP
    await pool.query(`ALTER TABLE ecom_customers
      ADD COLUMN IF NOT EXISTS phone_otp VARCHAR(6) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP DEFAULT NULL
    `).catch(() => {});

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await pool.query(
      'UPDATE ecom_customers SET phone=?, phone_otp=?, phone_otp_expires_at=? WHERE id=?',
      [phone, otp, expiresAt, customerId]
    );

    // Format international sénégalais
    let e164 = phone.replace(/\D/g, '');
    if (e164.length === 9) e164 = '221' + e164;
    if (!e164.startsWith('+')) e164 = '+' + e164;

    await twilioClient.messages.create({
      body: `Votre code de vérification Allo Béton : ${otp} (valable 10 min)`,
      from: TWILIO_FROM,
      to: e164,
    });

    res.json({ success: true, message: 'Code SMS envoyé' });
  } catch (e) {
    console.error('Erreur send-phone-otp:', e);
    res.status(500).json({ success: false, error: 'Erreur envoi SMS: ' + e.message });
  }
});

/**
 * POST /api/ecommerce/customers/verify-phone-otp
 * Vérifier le code OTP reçu par SMS
 */
router.post('/verify-phone-otp', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, error: 'Code OTP requis' });

    const [rows] = await pool.query(
      'SELECT phone_otp, phone_otp_expires_at FROM ecom_customers WHERE id = ?',
      [customerId]
    );

    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Client introuvable' });

    const { phone_otp, phone_otp_expires_at } = rows[0];

    if (!phone_otp) return res.status(400).json({ success: false, error: 'Aucun code OTP en attente' });

    if (new Date() > new Date(phone_otp_expires_at)) {
      return res.status(400).json({ success: false, error: 'Code OTP expiré. Demandez-en un nouveau.' });
    }

    if (otp.trim() !== phone_otp) {
      return res.status(400).json({ success: false, error: 'Code OTP incorrect' });
    }

    await pool.query(
      'UPDATE ecom_customers SET phone_verified_at=NOW(), phone_otp=NULL, phone_otp_expires_at=NULL WHERE id=?',
      [customerId]
    );

    res.json({ success: true, message: 'Téléphone vérifié avec succès' });
  } catch (e) {
    console.error('Erreur verify-phone-otp:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
