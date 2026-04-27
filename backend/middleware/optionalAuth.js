/**
 * Middleware d'authentification optionnelle
 * Permet aux routes d'accepter des utilisateurs authentifiés ou non
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'allo-beton-secret-key-2024';

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Pas de token = utilisateur anonyme
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Token invalide = traiter comme anonyme
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;
