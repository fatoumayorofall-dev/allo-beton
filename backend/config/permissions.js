/**
 * ALLO BÉTON — Matrice unifiée des permissions admin
 *
 * Source de vérité unique pour répondre à la question :
 *   « Quel rôle peut faire quelle action sur quelle ressource ? »
 *
 * Format : MATRIX[resource][action] = [ rôles autorisés ]
 *
 * Rôles supportés :
 *   - admin        : tout (super-utilisateur)
 *   - manager      : pilote opérationnel (gestion + lecture, pas suppression sensible)
 *   - commercial   : lecture commerciale + édition limitée
 *   - comptable    : lecture + écriture comptable
 *   - rh           : lecture + écriture RH
 *
 * Actions standards :
 *   - read    : lister / consulter
 *   - create  : ajouter
 *   - update  : modifier
 *   - delete  : supprimer
 *   - export  : exporter / télécharger
 *   - validate: valider/approuver (paiement, avis, commande…)
 */

const ROLES = ['admin', 'manager', 'commercial', 'comptable', 'rh', 'commercial'];

const MATRIX = {
  /* ─── E-COMMERCE ─── */
  product:    { read: ['admin','manager','commercial'], create: ['admin','manager'], update: ['admin','manager'], delete: ['admin'], export: ['admin','manager','commercial'] },
  category:   { read: ['admin','manager','commercial'], create: ['admin','manager'], update: ['admin','manager'], delete: ['admin'] },
  order:      { read: ['admin','manager','commercial'], update: ['admin','manager'], delete: ['admin'], validate: ['admin','manager'], export: ['admin','manager','comptable'] },
  payment:    { read: ['admin','manager','comptable'], validate: ['admin','manager'], export: ['admin','comptable'] },
  customer:   { read: ['admin','manager','commercial'], update: ['admin','manager'], delete: ['admin'], export: ['admin','manager'] },
  promotion:  { read: ['admin','manager'], create: ['admin','manager'], update: ['admin','manager'], delete: ['admin'] },
  review:     { read: ['admin','manager'], validate: ['admin','manager'], delete: ['admin'] },
  invoice:    { read: ['admin','manager','comptable'], create: ['admin','manager'], export: ['admin','manager','comptable'] },
  pricing:    { read: ['admin','manager','commercial'], create: ['admin','manager'], update: ['admin','manager'], delete: ['admin'] },
  settings:   { read: ['admin','manager'], update: ['admin'] },
  admin_log:  { read: ['admin'] },

  /* ─── ERP ─── */
  user:       { read: ['admin'], create: ['admin'], update: ['admin'], delete: ['admin'] },
  accounting: { read: ['admin','comptable','manager'], create: ['admin','comptable'], update: ['admin','comptable'], delete: ['admin'] },
  hr:         { read: ['admin','rh','manager'], create: ['admin','rh'], update: ['admin','rh'], delete: ['admin'] },
  payroll:    { read: ['admin','rh','comptable'], create: ['admin','rh'], update: ['admin','rh'], validate: ['admin'] },
  analytics:  { read: ['admin','manager','comptable'] },
};

/** Vérifie si un rôle a le droit d'effectuer `action` sur `resource`. */
function can(role, resource, action) {
  if (!role) return false;
  if (role === 'admin') return true; // admin = tout
  const r = MATRIX[resource];
  if (!r) return false;
  const allowed = r[action];
  return Array.isArray(allowed) && allowed.includes(role);
}

/** Middleware Express : exige `can(role, resource, action)`. */
function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentification requise' });
    }
    if (!can(req.user.role, resource, action)) {
      return res.status(403).json({
        success: false,
        error: `Permission refusée : ${action} sur ${resource}`,
      });
    }
    next();
  };
}

module.exports = { MATRIX, ROLES, can, requirePermission };
