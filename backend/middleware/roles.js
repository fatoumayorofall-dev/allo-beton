/**
 * @deprecated Utilisez `require('./auth')` à la place.
 * Ce fichier est un shim de rétrocompatibilité.
 * Toutes les implémentations sont désormais dans `middleware/auth.js`
 * pour éviter les divergences entre deux sources de vérité.
 */
const { requireRole, requireAdmin, requireCustomer } = require('./auth');

module.exports = { requireRole, requireAdmin, requireCustomer };
