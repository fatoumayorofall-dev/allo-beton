/**
 * ALLO BÉTON - Middleware d'authentification E-commerce
 * Dédié aux clients de la boutique en ligne (table ecom_customers)
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Ne jamais utiliser de fallback en dur — fail fast
  throw new Error('JWT_SECRET manquant dans .env — refus de démarrer le module e-commerce');
}

/**
 * Middleware pour authentifier les clients e-commerce
 * Vérifie le token JWT et charge les données depuis ecom_customers
 */
const authenticateCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès requis'
      });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Vérifier que c'est un token client (contient customer_id)
    if (!decoded.customer_id) {
      return res.status(401).json({
        success: false,
        error: 'Token invalide pour client e-commerce'
      });
    }

    // Récupérer le client depuis ecom_customers
    const [customers] = await pool.execute(
      `SELECT id, email, phone, first_name, last_name,
              company_name, company_ninea, customer_type, is_active,
              created_at, updated_at
       FROM ecom_customers
       WHERE id = ?`,
      [decoded.customer_id]
    );

    if (customers.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    const customer = customers[0];

    if (!customer.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Compte client désactivé'
      });
    }

    // Attacher les informations client à la requête
    req.user = {
      customer_id: customer.id,
      email: customer.email,
      phone: customer.phone,
      first_name: customer.first_name,
      last_name: customer.last_name,
      company_name: customer.company_name,
      customer_type: customer.customer_type,
      role: 'customer'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expiré, veuillez vous reconnecter'
      });
    }

    console.error('Erreur authentification client:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'authentification'
    });
  }
};

/**
 * Middleware optionnel pour clients e-commerce
 * Permet l'accès anonyme mais charge le client s'il est connecté
 */
const optionalCustomerAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // Pas de token = client anonyme
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.customer_id) {
      const [customers] = await pool.execute(
        'SELECT id, email, first_name, last_name, customer_type FROM ecom_customers WHERE id = ? AND is_active = 1',
        [decoded.customer_id]
      );

      if (customers.length > 0) {
        req.user = {
          customer_id: customers[0].id,
          email: customers[0].email,
          first_name: customers[0].first_name,
          last_name: customers[0].last_name,
          customer_type: customers[0].customer_type,
          role: 'customer'
        };
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur de token, continuer en anonyme
    req.user = null;
    next();
  }
};

/**
 * Middleware hybride : accepte un token client (customer_id) OU un token admin (userId + role admin/seller)
 * Utilisé pour les routes comme /pdf accessibles aux deux types d'utilisateurs.
 */
const authenticateCustomerOrAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Token d\'accès requis' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // ── Token client e-commerce ──
    if (decoded.customer_id) {
      const [customers] = await pool.execute(
        'SELECT id, email, phone, first_name, last_name, company_name, customer_type, is_active FROM ecom_customers WHERE id = ?',
        [decoded.customer_id]
      );
      if (customers.length === 0 || !customers[0].is_active) {
        return res.status(401).json({ success: false, error: 'Client non trouvé ou désactivé' });
      }
      const c = customers[0];
      req.user = {
        customer_id: c.id,
        email: c.email,
        phone: c.phone,
        first_name: c.first_name,
        last_name: c.last_name,
        company_name: c.company_name,
        customer_type: c.customer_type,
        role: 'customer',
      };
      return next();
    }

    // ── Token admin/seller ERP ──
    if (decoded.userId) {
      const [users] = await pool.execute(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );
      if (users.length === 0 || !users[0].is_active) {
        return res.status(401).json({ success: false, error: 'Utilisateur non trouvé ou désactivé' });
      }
      const u = users[0];
      req.user = {
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
      };
      return next();
    }

    return res.status(401).json({ success: false, error: 'Token invalide' });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expiré' });
    }
    console.error('Erreur authenticateCustomerOrAdmin:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

module.exports = {
  authenticateCustomer,
  optionalCustomerAuth,
  authenticateCustomerOrAdmin,
};
